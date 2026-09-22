# Snake

A browser-based Snake game built with vanilla HTML, CSS, and JavaScript (no libraries or frameworks).

## How to play

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

- **Arrow keys** or **WASD** to move
- **P** to pause/resume
- **Space** or **Enter** to start/restart

## How it works

- `Snake` tracks the body as a list of grid cells and moves by adding a new head each tick; the tail is only removed when no food was eaten, which is what makes the snake grow.
- `Food` picks a random empty cell, re-rolling until it lands somewhere the snake doesn't occupy.
- `Game` runs the tick loop with `setInterval`, checks wall/self collisions, updates score, and speeds up the loop every 50 points to raise the difficulty level.
- The high score is saved in `localStorage` so it persists between visits.
