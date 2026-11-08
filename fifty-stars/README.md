# 50 Stars Before the Moon 🌙❤️

A little romantic universe, built for one person.

She opens it and finds a night sky, a huge sleeping crescent moon, and **50 twinkling stars**.
Every star hides one message. The moon stays **locked** until she has found them all. When she taps the 50th star the sky
darkens, every star lights up at once, golden light streams into the moon, and it swells into a massive glowing full
moon. Then she clicks it, and the final message is waiting.

Built with **React + Tailwind CSS + Framer Motion** (Vite). No images and no audio files: the moon, the stars, the
music and every sound are generated in code.

## Run it

```bash
cd fifty-stars
npm install
npm run dev          # http://localhost:5173 (open it on your phone too: it prints a network URL)
npm test             # unit tests (message text, storage rules, star layout)
npm run build        # -> ../docs/fifty-stars/index.html  and  ../dist/fifty-stars-before-the-moon.html
```

The build is **one self-contained HTML file** (JS, CSS and fonts inlined), so it works offline and can be sent as an
attachment. Open it in a browser, or host it.

## Put it online (GitHub Pages)

`docs/fifty-stars/index.html` is committed, so once Pages serves the `/docs` folder the link is:

`https://<your-username>.github.io/<repo-name>/fifty-stars/`

(Settings → Pages → *Deploy from a branch* → pick the branch → folder **/docs**.)

## How the experience flows

| Scene | What happens |
| --- | --- |
| **Intro** | Hundreds of tiny stars, one enormous crescent moon, the three opening lines, then **Enter my universe ❤️**. Tapping anywhere skips ahead. |
| **Sky** | Exactly 50 stars spread over the whole sky. Tap one: it bursts, turns **golden**, and its message opens. Counter: *Your little universe: N/50 stars discovered*. Golden stars can be tapped again to re-read (they never count twice). **Memories** lists everything found; **Hint** pulses a star she hasn't found. Poking the moon early just makes it shiver. |
| **Awakening** | The 50th message opens first. The sky darkens slowly. When she closes it: all 50 stars flare together → light streams from every star into the moon → the crescent becomes a full moon and swells to fill the screen with pink and gold glitter, pulsing → *YOU FOUND ALL 50 STARS…* |
| **Ready** | *Click the moon, my love. 🌙* The moon is now clickable. |
| **Message** | The moon swells over the whole screen and melts into a glowing pink-purple background. The letter arrives one line at a time (it scrolls itself; tap to hurry it along). The biggest lines are enormous. Then the giant beating heart, hundreds of floating hearts, and the two closing lines. |
| **After** | *Back to my universe* returns to the sky with every star golden and the full moon glowing. Tap the moon to read it again. |

The 50 messages are shown **in the order she discovers the stars** (1st star found = message 1, and so on), so the
whole thing reads as a story: missing you → being sorry → hoping for us, ending on message 50. A star always keeps the
message it revealed.

Progress (found stars, whether the moon is unlocked, mute) is saved in `localStorage` under
`fifty-stars-before-the-moon:v1`. Anything read back is validated, so it can't be tampered into skipping the lock.
**Start over** is at the bottom of the Memories sheet.

## Make it yours

| What | Where |
| --- | --- |
| The 50 star messages | `src/data/messages.js` |
| Intro, unlock text, the final message and closing lines (all exact text) | `src/data/copy.js` |
| Colours | `tailwind.config.js` (`night`, `plum`, `blush`, `gold`) |
| Fonts | `src/main.jsx` (bundled locally: Cormorant Garamond, Playfair Display, Great Vibes, Manrope) |
| Timing of the unlock cinematic | `runCinematic` in `src/App.jsx` |
| Music and sound effects | `src/lib/audio.js` (Web Audio synthesis: chords, music-box melody, chimes, cinematic swell) |

## Notes

* **Sound** starts when she taps *Enter my universe* (browsers require a tap). The round button top-right mutes it.
  On iPhone, Web Audio follows the ringer switch: if the phone is on silent she won't hear it.
* Layout is **iPhone-first** (portrait), and also works in landscape, on tablets and on desktop. The star layout is
  generated per screen shape so stars stay a fingertip apart and never sit behind the HUD or the moon.
* Respects *Reduce Motion* (fewer particles, no shooting stars or big pulses).

## Structure

```
src/
  App.jsx                  scene state machine + the unlock cinematic timeline
  components/              Moon, Sky, StarButton, MessageCard, MemoriesDrawer, Intro, UnlockText,
                           FinalMessage, BigHeart, MessageGlow, StarField, Particles, ...
  lib/                     audio (Web Audio), particles (canvas), layout (star placement), storage, moon texture
  data/                    messages.js, copy.js
tests/                     node --test
```
