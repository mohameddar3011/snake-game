/* =====================================================================
   config.js — make it yours. Everything personal lives in this file.
   (You can also set your name from the link:  index.html?from=YourName)
   ===================================================================== */
const CONFIG = {
  her: 'Lara',
  from: 'Your Boyfriend',
  callsign: 'SORRY-1',

  // How Lara looks in the game (any CSS colour).
  hair: '#2b1810',
  skin: '#efc4a0',
  dress: '#c2255c',

  // The letter shown at the very end, one paragraph at a time.
  letter: [
    "Lara, I messed up, and I know it.",
    "I let excuses talk when I should have listened. I went quiet when I should have shown up. And I let my pride get the last word when you deserved better.",
    "You are the best thing that ever happened to me, and I'm so, so sorry.",
    "I fought through every excuse, every ghost, and my own ego just to stand here and say it to your face."
  ],
  question: 'Will you forgive me?',
  yes: 'Yes, I forgive you',
  no: 'No',
  // Big line on the final screen once she says yes. Make it yours.
  signoff: 'Sorry, my love. I love you. Always yours.',
  // What she says when she says yes.
  forgiven: "Okay... I forgive you. But you're still doing the dishes.",
  // Shown under the title.
  tagline: 'A very serious military operation to win back one very specific person.'
};

(() => {
  const from = new URLSearchParams(location.search).get('from');
  if (from) CONFIG.from = from.slice(0, 30);
})();
