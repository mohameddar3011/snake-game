# A Garden Full of Reasons I Love You 🌷

A romantic little flower game, made for Lola by Mohamed. Pure HTML, CSS and JavaScript:
no libraries, no images and no audio files. Every flower, butterfly and sound is drawn or
synthesised by code, so the whole thing fits in one shareable file.

## The experience

1. **Welcome**: a dreamy garden, "Hey, beautiful Lola 🌷", and a button to enter.
2. **The garden**: seven flower buds. Tap one and it lifts into the spotlight, blooms with its own
   animation and effect, and reveals its message. Keep it and it flies into the counter (0/7).
   The sky slowly turns from pastel morning to lavender dusk as flowers are collected.
3. **Hidden whispers**: eight small secrets are scattered around (the sun, a cloud, a star, a
   butterfly, a firefly, a ladybug, a heart in the grass, a tiny love letter). Tap them.
4. **The secret love challenge**: after seven flowers a heart-shaped flower grows in the middle of
   the garden and asks the question. All three answers get a loving reply.
5. **The final surprise**: all the flowers fly together and burst into a heart-shaped bouquet.
   An envelope appears, the letter writes itself word by word, and the garden blooms again for
   the closing line. A replay button starts it all over.

| Flower | Bloom | Effect |
| --- | --- | --- |
| Rose | petals unfurl in a spiral | rose petals swirl and drift down |
| Tulip | cup springs open | ripples and a column of sparkles |
| Cherry blossom | petals pop one by one | a petal storm across the whole garden |
| Sunflower | petals spin open like a fan | golden sun rays across the sky |
| Lavender | florets light up bottom to top | violet fireflies rise |
| Hibiscus | trumpet unrolls, stamen unfurls | a burst of hearts |
| Pink peony | layers puff open | confetti pop |

Music is a gentle generative music-box lullaby (Web Audio). It only starts after the first tap,
and the speaker button in the corner mutes and unmutes it. On iPhones it also plays with the
silent switch on.

## Run it

Open `garden/index.html` in a browser, or serve the folder:

```bash
cd garden && python3 -m http.server 8000
```

It is built for phones first (iPhone Safari included) and scales up to desktop.

## Share it as a link

```bash
node garden/build.js
```

This writes two copies of the whole site as a single file:

- `garden/dist/lola-garden.html`: send it as an attachment, or upload it to any static host.
- `docs/lola/index.html`: the same file laid out for GitHub Pages. In the repo go to
  **Settings > Pages**, choose **Deploy from a branch**, pick the branch and the **/docs** folder.
  After a minute it is live at `https://<user>.github.io/<repo>/lola/`.

Only the Google Fonts (Great Vibes, Cormorant Garamond, Quicksand) are loaded from the internet.
Offline, the page falls back to the system script and serif fonts.

## Make it yours

Every word lives in **`js/config.js`**: names, the seven messages, the question and answers, the
hidden whispers, the letter and the closing line. Colours, fonts and spacing are CSS variables at
the top of `css/style.css`.

## Files

| File | What it does |
| --- | --- |
| `index.html` | page skeleton: sky, hills, HUD, cards, letter |
| `css/style.css` | design tokens, layout, and every animation |
| `js/config.js` | all the personal text |
| `js/art.js` | draws every flower, leaf, bow and little creature as SVG |
| `js/fx.js` | canvas particles: hearts, petals, butterflies, fireflies, bloom effects |
| `js/audio.js` | the lullaby and the sound effects |
| `js/game.js` | the story: screens, spotlight, collecting, finale, letter, replay |
| `build.js` | bundles everything into one HTML file |
