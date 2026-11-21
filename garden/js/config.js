/* config.js
   Everything personal lives here: names, the seven flower messages, the secret
   question, the hidden whispers and the final letter. Change the words and the
   whole garden changes with them. */
window.GARDEN = {
  to: 'Lola',
  from: 'Mohamed',

  welcome: {
    eyebrow: 'A Garden Full of Reasons I Love You',
    hey: 'Hey, beautiful',
    name: 'Lola',
    emoji: '🌷',
    sub: 'Someone has something special to show you…',
    button: 'Enter My Garden 💗',
    footer: 'Made with love by Mohamed.'
  },

  /* The seven flowers. `id` picks the artwork and the bloom effect in art.js / fx.js. */
  flowers: [
    { id: 'rose',      name: 'The Rose',            emoji: '🌹',
      message: 'If beauty had a name, it would be yours. I swear the stars get jealous when you smile.' },
    { id: 'tulip',     name: 'The Tulip',           emoji: '🌷',
      message: 'Your smile is my favourite view, and your eyes are my favourite place to get lost.' },
    { id: 'cherry',    name: 'The Cherry Blossom',  emoji: '🌸',
      message: 'Even the most beautiful spring flowers couldn’t compete with the beauty you bring into my life.' },
    { id: 'sunflower', name: 'The Sunflower',       emoji: '🌻',
      message: 'You are my sunshine on days when everything feels grey.' },
    { id: 'lavender',  name: 'The Lavender',        emoji: '🪻',
      message: 'There is something about you that makes even the quietest moments feel magical.' },
    { id: 'hibiscus',  name: 'The Hibiscus',        emoji: '🌺',
      message: 'If I could give you one thing in life, it would be the ability to see yourself through my eyes.' },
    { id: 'peony',     name: 'The Pink Peony',      emoji: '💐',
      message: 'Every flower in this garden has a reason to bloom. Mine is you, Lola.' }
  ],

  hints: {
    start: 'Tap a flower bud to make it bloom 🌷',
    more: n => (n === 1 ? 'One more flower is waiting for you…' : n + ' more flowers are waiting for you…'),
    secret: 'Something is glowing in the middle of the garden… 💗'
  },

  keepButton: 'Keep this flower 💗',
  closeButton: 'Close 💗',
  firstSecretToast: { emoji: '✧', text: 'Psst… the garden is hiding little secrets too. Look closely.' },
  unlockToast: { emoji: '💗', text: 'A secret flower is blooming in the middle of the garden…' },

  /* Secret love challenge */
  challenge: {
    kicker: 'A secret flower',
    question: 'Do you know how beautiful you are?',
    answers: [
      { label: 'A little?',
        reply: 'A little? Oh, Lola… I have to disagree with you on that one. 💗 You are so much more than “a little”. You deserve to feel beautiful every single day, even on the days it’s hard to see.' },
      { label: 'Very?',
        reply: 'Very! Yes. Hold on to that answer, because it’s true. 🌷 And I hope you feel it every single day, not only when someone reminds you. You deserve to.' },
      { label: 'More beautiful than words can explain?',
        reply: 'That is exactly the answer I was hoping for. 💗 It’s also the only correct one. You deserve to feel this beautiful every single day, Lola, with no doubts and no exceptions.' }
    ],
    replyKicker: 'Just so you know',
    next: 'Show me the surprise ✨'
  },

  /* Hidden whispers scattered around the garden. kind = which little artwork to draw. */
  whispers: [
    { id: 'sun',       kind: 'sun',       text: 'The sun is glowing today, but I promise it’s only trying to keep up with your smile.' },
    { id: 'cloud',     kind: 'cloud',     text: 'Even the clouds drift slower when you’re near. They don’t want to miss a second of you.' },
    { id: 'star',      kind: 'star',      x: 15, y: 23, text: 'Make a wish, Lola. You deserve every single one of them to come true.' },
    { id: 'butterfly', kind: 'butterfly', x: 70, y: 38, text: 'Every butterfly in this garden is jealous of how easily you make hearts flutter.' },
    { id: 'firefly',   kind: 'firefly',   x: 27, y: 47, text: 'Some people light up a room. You light up my whole day.' },
    { id: 'ladybug',   kind: 'ladybug',   x: 57, y: 79, text: 'They say a ladybug brings good luck. So does knowing you.' },
    { id: 'heart',     kind: 'heart',     x: 36, y: 90, text: 'You found a tiny piece of my heart hiding in the grass. Keep it, it’s yours.' },
    { id: 'letter',    kind: 'envelope',  x: 67, y: 91, text: 'Psst… you’re doing better than you think. And you look lovely doing it.' }
  ],
  allWhispers: 'You found every single secret whisper. Of course you did, you notice everything. 💗',

  /* The final letter */
  letter: {
    open: 'A letter, just for you 💌',
    greeting: 'My dearest Lola,',
    paragraphs: [
      'If I could gather every flower in the world, I would still feel like I hadn’t found anything as beautiful as you.',
      'There is a kind of beauty that photographs cannot capture, that mirrors cannot explain, and that words will always struggle to describe.',
      'It’s in your smile, your eyes, your laugh, the little things you do without even noticing.',
      'I hope you never look at yourself and forget how special you are.',
      'And if one day you ever doubt your beauty, come back to this little garden and remember that somewhere, there is a boy named Mohamed who sees you as the most beautiful flower in the entire world.',
      'You are my favourite hello, my favourite thought, and one of the sweetest parts of my life.'
    ],
    closing: 'With all my love,',
    signature: 'Mohamed ❤️',
    skip: 'Show everything',
    next: 'Continue 🌷',
    back: 'Back to the garden 🌷'
  },

  finale: {
    line1: 'THE GARDEN WILL ALWAYS',
    line2: 'BLOOM FOR YOU, LOLA 🌷',
    reread: 'Read the letter again 💌',
    replay: 'Replay the garden 🌷'
  }
};
