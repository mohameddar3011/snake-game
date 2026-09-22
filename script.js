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

    this.highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
    this.highScoreEl.textContent = this.highScore;

    this.reset();
    this.bindInput();
    this.loop = this.loop.bind(this);
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
    this.updateHud();
  }

  bindInput() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "p" || e.key === "P") {
        this.togglePause();
        return;
      }
      if (!this.running && (e.key === " " || e.key === "Enter")) {
        this.start();
        return;
      }
      const dir = DIRECTIONS[e.key];
      if (dir) {
        if (!this.running) this.start();
        this.snake.setDirection(dir);
      }
    });
  }

  start() {
    if (this.running) return;
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

    this.snake.move();

    if (this.snake.hitsWall() || this.snake.hitsSelf()) {
      this.gameOver();
      return;
    }

    const ateFood =
      this.snake.head.x === this.food.position.x &&
      this.snake.head.y === this.food.position.y;

    if (ateFood) {
      this.score += 10;
      this.food.respawn(this.snake);
      const newLevel = Math.floor(this.score / 50) + 1;
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.restartTimer();
      }
    } else {
      this.snake.shrink();
    }

    this.updateHud();
    this.draw();
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
    this.draw();
    this.snake = new Snake();
    this.food = new Food(this.snake);
  }

  updateHud() {
    this.scoreEl.textContent = this.score;
    this.levelEl.textContent = this.level;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "#f85149";
    ctx.fillRect(
      this.food.position.x * GRID_SIZE,
      this.food.position.y * GRID_SIZE,
      GRID_SIZE,
      GRID_SIZE
    );

    this.snake.body.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#56d364" : "#3fb950";
      ctx.fillRect(
        seg.x * GRID_SIZE + 1,
        seg.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      );
    });
  }
}

const canvas = document.getElementById("board");
const game = new Game(canvas);
game.draw();
