const GRID_SIZE = 20;
const CELL_COUNT = 20;

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

class Snake {
  constructor() {
    this.body = [{ x: 10, y: 10 }];
    this.direction = { x: 0, y: 0 };
    this.nextDirection = { x: 0, y: 0 };
  }

  setDirection(dir) {
    const isReversal =
      dir.x === -this.direction.x && dir.y === -this.direction.y;
    if (!isReversal) this.nextDirection = dir;
  }

  move() {
    this.direction = this.nextDirection;
    const head = this.body[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };
    this.body.unshift(newHead);
  }

  grow() {
    // no-op: growth happens by simply not popping the tail on this move
  }

  shrink() {
    this.body.pop();
  }

  get head() {
    return this.body[0];
  }

  hitsWall() {
    const head = this.head;
    return (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= CELL_COUNT ||
      head.y >= CELL_COUNT
    );
  }

  hitsSelf() {
    const [head, ...rest] = this.body;
    return rest.some((seg) => seg.x === head.x && seg.y === head.y);
  }

  occupies(cell) {
    return this.body.some((seg) => seg.x === cell.x && seg.y === cell.y);
  }
}

class Food {
  constructor(snake) {
    this.position = this.randomPosition(snake);
  }

  randomPosition(snake) {
    let cell;
    do {
      cell = {
        x: Math.floor(Math.random() * CELL_COUNT),
        y: Math.floor(Math.random() * CELL_COUNT),
      };
    } while (snake.occupies(cell));
    return cell;
  }

  respawn(snake) {
    this.position = this.randomPosition(snake);
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.scoreEl = document.getElementById("score");
    this.highScoreEl = document.getElementById("highScore");
    this.levelEl = document.getElementById("level");
    this.messageEl = document.getElementById("message");
    this.aiToggleBtn = document.getElementById("aiToggle");

    this.highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
    this.highScoreEl.textContent = this.highScore;

    this.reducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.reset();
    this.bindInput();
    this.loop = this.loop.bind(this);
    this.frame = this.frame.bind(this);
  }

  reset() {
    this.snake = new Snake();
    this.food = new Food(this.snake);
    this.score = 0;
    this.level = 1;
    this.baseSpeed = 140;
    this.running = false;
    this.paused = false;
    this.timer = null;
    this.aiEnabled = false;

    // Animation state. The game logic still ticks on setInterval; a separate
    // requestAnimationFrame loop renders in-between positions.
    this.over = false;
    this.prevBody = null;
    this.lastTick = 0;
    this.tickMs = this.baseSpeed;
    this.foodSpawnTime = performance.now();
    this.deathTime = 0;
    this.lastFrame = 0;
    this.particles = [];
    this.floaters = [];

    this.updateHud();
    this.updateAiButton();
  }

  bindInput() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "p" || e.key === "P") {
        this.togglePause();
        return;
      }
      if (e.key === "i" || e.key === "I") {
        this.toggleAi();
        return;
      }
      if (!this.running && (e.key === " " || e.key === "Enter")) {
        this.start();
        return;
      }
      const dir = DIRECTIONS[e.key];
      if (dir) {
        if (!this.running) this.start();
        if (this.aiEnabled) this.aiEnabled = false;
        this.updateAiButton();
        this.snake.setDirection(dir);
      }
    });

    if (this.aiToggleBtn) {
      this.aiToggleBtn.addEventListener("click", () => this.toggleAi());
    }
  }

  toggleAi() {
    this.aiEnabled = !this.aiEnabled;
    this.updateAiButton();
    if (!this.running) this.start();
  }

  updateAiButton() {
    if (!this.aiToggleBtn) return;
    this.aiToggleBtn.textContent = this.aiEnabled
      ? "AI Autopilot: ON"
      : "AI Autopilot: OFF";
    this.aiToggleBtn.classList.toggle("on", this.aiEnabled);
  }

  start() {
    if (this.running) return;
    if (this.over) {
      // The dead snake stays on screen (so the death animation can play)
      // until the next game begins.
      this.snake = new Snake();
      this.food = new Food(this.snake);
      this.foodSpawnTime = performance.now();
      this.prevBody = null;
      this.over = false;
      this.canvas.classList.remove("dead", "shake");
    }
    this.running = true;
    this.paused = false;
    this.messageEl.textContent = "Press P to pause.";
    this.timer = setInterval(this.loop, this.currentSpeed());
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    this.messageEl.textContent = this.paused
      ? "Paused. Press P to resume."
      : "Press P to pause.";
  }

  currentSpeed() {
    return Math.max(60, this.baseSpeed - (this.level - 1) * 10);
  }

  restartTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(this.loop, this.currentSpeed());
  }

  loop() {
    if (this.paused) return;

    if (this.aiEnabled) {
      this.snake.setDirection(this.computeAiDirection());
    }

    // Remember where every segment was so the renderer can slide it to its
    // new cell over the course of this tick.
    this.prevBody = this.snake.body.map((seg) => ({ ...seg }));
    this.snake.move();

    if (this.snake.hitsWall() || this.snake.hitsSelf()) {
      this.gameOver();
      return;
    }

    const ateFood =
      this.snake.head.x === this.food.position.x &&
      this.snake.head.y === this.food.position.y;

    if (ateFood) {
      const eaten = { ...this.food.position };
      this.score += 10;
      this.food.respawn(this.snake);
      this.foodSpawnTime = performance.now();
      this.playClass(this.scoreEl, "pop");
      this.spawnBurst(eaten, ["#f85149", "#ffa657", "#ffffff"], 14);
      this.spawnFloater(eaten, "+10", "#f0f0f0");
      const newLevel = Math.floor(this.score / 50) + 1;
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.restartTimer();
        this.playClass(this.levelEl, "pop");
        this.playClass(this.canvas, "levelup");
        this.spawnFloater(
          { x: CELL_COUNT / 2 - 0.5, y: 2 },
          `LEVEL ${this.level}`,
          "#56d364"
        );
      }
    } else {
      this.snake.shrink();
    }

    this.lastTick = performance.now();
    this.tickMs = this.currentSpeed();
    this.updateHud();
  }

  gameOver() {
    this.running = false;
    clearInterval(this.timer);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("snakeHighScore", this.highScore);
      this.highScoreEl.textContent = this.highScore;
    }

    this.messageEl.textContent = `Game over! Score: ${this.score}. Press Space/Enter to restart.`;

    this.over = true;
    this.deathTime = performance.now();
    this.prevBody = null;
    this.canvas.classList.add("dead");
    this.playClass(this.canvas, "shake");
    const head = this.snake.head;
    this.spawnBurst(
      {
        x: Math.min(Math.max(head.x, 0), CELL_COUNT - 1),
        y: Math.min(Math.max(head.y, 0), CELL_COUNT - 1),
      },
      ["#f85149", "#56d364", "#ffa657"],
      24
    );
  }

  // Restarts a CSS animation by toggling its class off and on again.
  playClass(el, cls) {
    el.classList.remove("shake", "levelup", "pop");
    void el.offsetWidth;
    el.classList.add(cls);
  }

  spawnBurst(cell, colors, count) {
    if (this.reducedMotion) return;
    const cx = (cell.x + 0.5) * GRID_SIZE;
    const cy = (cell.y + 0.5) * GRID_SIZE;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 110;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: 0.35 + Math.random() * 0.35,
        size: 1.5 + Math.random() * 2.5,
        color: colors[i % colors.length],
      });
    }
  }

  spawnFloater(cell, text, color) {
    if (this.reducedMotion) return;
    this.floaters.push({
      x: (cell.x + 0.5) * GRID_SIZE,
      y: (cell.y + 0.5) * GRID_SIZE,
      text,
      color,
      age: 0,
      life: 0.8,
    });
  }

  updateHud() {
    this.scoreEl.textContent = this.score;
    this.levelEl.textContent = this.level;
  }

  // Picks the snake's next move: shortest path to the food (BFS) when one
  // exists, otherwise the safest open direction (flood-fill) so it doesn't
  // trap itself in a dead end.
  computeAiDirection() {
    const blocked = this.blockedCells();
    const path = this.bfsPath(this.snake.head, this.food.position, blocked);
    if (path && path.length > 0) return path[0];
    return this.safestDirection(blocked);
  }

  // The tail cell is left out of the obstacle set because it moves away on
  // this same tick (unless the snake is about to eat, which is a rare and
  // harmless overestimate here).
  blockedCells() {
    const cells = this.snake.body.slice(0, -1);
    return new Set(cells.map((c) => `${c.x},${c.y}`));
  }

  bfsPath(start, goal, blocked) {
    const key = (c) => `${c.x},${c.y}`;
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    const visited = new Set([key(start)]);
    const queue = [{ cell: start, path: [] }];

    while (queue.length > 0) {
      const { cell, path } = queue.shift();
      if (cell.x === goal.x && cell.y === goal.y) return path;

      for (const dir of dirs) {
        const next = { x: cell.x + dir.x, y: cell.y + dir.y };
        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= CELL_COUNT ||
          next.y >= CELL_COUNT
        )
          continue;

        const k = key(next);
        if (visited.has(k) || blocked.has(k)) continue;

        visited.add(k);
        queue.push({ cell: next, path: [...path, dir] });
      }
    }

    return null;
  }

  safestDirection(blocked) {
    const current = this.snake.direction;
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ].filter((d) => !(d.x === -current.x && d.y === -current.y));

    let best = current;
    let bestSpace = -1;

    for (const dir of dirs) {
      const next = {
        x: this.snake.head.x + dir.x,
        y: this.snake.head.y + dir.y,
      };
      const outOfBounds =
        next.x < 0 || next.y < 0 || next.x >= CELL_COUNT || next.y >= CELL_COUNT;
      if (outOfBounds || blocked.has(`${next.x},${next.y}`)) continue;

      const space = this.floodFillCount(next, blocked);
      if (space > bestSpace) {
        bestSpace = space;
        best = dir;
      }
    }

    return best;
  }

  floodFillCount(start, blocked) {
    const key = (c) => `${c.x},${c.y}`;
    const visited = new Set([key(start)]);
    const stack = [start];
    let count = 0;

    while (stack.length > 0) {
      const cell = stack.pop();
      count += 1;

      for (const dir of [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ]) {
        const next = { x: cell.x + dir.x, y: cell.y + dir.y };
        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= CELL_COUNT ||
          next.y >= CELL_COUNT
        )
          continue;

        const k = key(next);
        if (visited.has(k) || blocked.has(k)) continue;

        visited.add(k);
        stack.push(next);
      }
    }

    return count;
  }

  run() {
    requestAnimationFrame(this.frame);
  }

  frame(now) {
    const dt = this.lastFrame
      ? Math.min(0.05, (now - this.lastFrame) / 1000)
      : 0;
    this.lastFrame = now;
    this.updateEffects(dt);
    this.draw(now);
    requestAnimationFrame(this.frame);
  }

  updateEffects(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    for (const f of this.floaters) f.age += dt;
    this.floaters = this.floaters.filter((f) => f.age < f.life);
  }

  // Segment centres in grid units, slid part-way from where each segment was
  // before the last tick to where it is now. A segment that was just added
  // (the snake grew) starts out on top of the old tail and stays put.
  snakePoints(now) {
    const body = this.snake.body;
    const prev = this.prevBody;
    if (!prev || this.over || this.reducedMotion) return body;

    const t = Math.min(1, Math.max(0, (now - this.lastTick) / this.tickMs));
    return body.map((seg, i) => {
      const from = prev[Math.min(i, prev.length - 1)];
      return {
        x: from.x + (seg.x - from.x) * t,
        y: from.y + (seg.y - from.y) * t,
      };
    });
  }

  draw(now = performance.now()) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawFood(now);
    this.drawSnake(now);
    this.drawEffects();
  }

  drawFood(now) {
    const ctx = this.ctx;
    const cx = (this.food.position.x + 0.5) * GRID_SIZE;
    const cy = (this.food.position.y + 0.5) * GRID_SIZE;

    // Pop in when spawned (overshoots a little, then settles), then pulse.
    const age = Math.min(1, (now - this.foodSpawnTime) / 300);
    const pop = this.reducedMotion ? 1 : easeOutBack(age);
    const wave = this.reducedMotion ? 0 : Math.sin(now / 200);
    const radius = GRID_SIZE * 0.38 * pop * (1 + 0.1 * wave);

    ctx.save();
    ctx.shadowColor = "#f85149";
    ctx.shadowBlur = this.reducedMotion ? 0 : 10 + 5 * wave;
    ctx.fillStyle = "#f85149";
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.35, cy - radius * 0.35, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSnake(now) {
    const ctx = this.ctx;
    const pts = this.snakePoints(now).map((p) => ({
      x: (p.x + 0.5) * GRID_SIZE,
      y: (p.y + 0.5) * GRID_SIZE,
    }));

    let colors = ["#3fb950", "#2ea043"];
    let headColor = "#56d364";
    let alpha = 1;
    if (this.over) {
      // Flash red/green for a moment, then settle into a dim red.
      const age = now - this.deathTime;
      const flashing = age < 600;
      const red = !flashing || Math.floor(age / 100) % 2 === 0;
      colors = red ? ["#f85149", "#da3633"] : colors;
      headColor = red ? "#ff7b72" : headColor;
      alpha = flashing ? 1 : 0.65;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Body: round-capped links from tail to head, thinning toward the tail.
    // Alternating shades make the motion along the body easy to see.
    const maxWidth = GRID_SIZE - 4;
    for (let i = pts.length - 1; i > 0; i--) {
      const taper = pts.length > 1 ? 1 - 0.4 * (i / (pts.length - 1)) : 1;
      ctx.strokeStyle = colors[i % 2];
      ctx.lineWidth = maxWidth * taper;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
      ctx.stroke();
    }

    const head = pts[0];
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(head.x, head.y, GRID_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    // Eyes look the way the snake is heading (right, before the first move).
    const dir = this.snake.direction;
    const fx = dir.x || dir.y ? dir.x : 1;
    const fy = dir.x || dir.y ? dir.y : 0;
    for (const side of [-1, 1]) {
      const ex = head.x + fx * 3.5 - fy * side * 3.5;
      const ey = head.y + fy * 3.5 + fx * side * 3.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0d1117";
      ctx.beginPath();
      ctx.arc(ex + fx * 0.8, ey + fy * 0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawEffects() {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const life = 1 - p.age / p.life;
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * life), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
    for (const f of this.floaters) {
      const k = f.age / f.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = f.color;
      const x = Math.min(Math.max(f.x, 30), this.canvas.width - 30);
      const y = Math.max(f.y - 28 * k, 12);
      ctx.fillText(f.text, x, y);
    }

    ctx.globalAlpha = 1;
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const canvas = document.getElementById("board");
const game = new Game(canvas);
game.run();
