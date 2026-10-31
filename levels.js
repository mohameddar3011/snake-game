/* =====================================================================
   levels.js — mission settings and Lara's radio chatter.
   She starts cold and slowly softens as you prove yourself.
   Moods: angry | cold | worried | soft | smile
   ===================================================================== */
'use strict';

const LEVELS = [
  {
    map: 0, title: 'MISSION 1', name: 'THE APARTMENT', time: 'DAY 1  //  18:42', place: 'Lara\'s apartment',
    intro: ['Operation: I\'m Sorry', 'Objective: eliminate every excuse. Reach the heart.'],
    objective: 'ELIMINATE ALL BAD HABITS', exitText: 'GATE OPEN - REACH THE HEART',
    floor: 'wood', ceil: 'plaster', fog: [34, 22, 20], fogDist: 15, music: 'tense',
    ang: 0, forgive: [0, 30],
    radio: {
      start: ['cold', 'You really think a video game is going to fix this? ...Fine. Impress me.'],
      kills: {
        1: ['cold', 'Oh, NOW you can aim.'],
        4: ['cold', 'Those excuses sound a lot like last week.'],
        8: ['cold', 'Left on read. How does THAT feel?']
      },
      clear: ['cold', 'One down. I\'m still mad. Keep going.']
    }
  },
  {
    map: 1, title: 'MISSION 2', name: 'THE RESTAURANT', time: 'DAY 1  //  20:15', place: 'Dinner for two',
    intro: ['Table for one, plus a lot of problems', 'Objective: clear the dining room. Reach the heart.'],
    objective: 'CLEAR THE RESTAURANT', exitText: 'KITCHEN GATE OPEN - REACH THE HEART',
    floor: 'check', ceil: 'plaster', fog: [36, 14, 26], fogDist: 16, music: 'tense',
    ang: -Math.PI / 2, forgive: [30, 60],
    radio: {
      start: ['cold', 'Dinner for two. And you brought... all of THEM.'],
      kills: {
        1: ['cold', 'At least you showed up this time.'],
        6: ['worried', 'I\'m starting to remember why I liked you.'],
        12: ['worried', '...you\'re doing better than I thought.']
      },
      clear: ['worried', 'Pride is next. It\'s the one you can\'t dodge. Be careful.']
    }
  },
  {
    map: 2, title: 'FINAL MISSION', name: 'PRIDE\'S ARENA', time: 'DAY 1  //  23:59', place: 'The last thing in the way',
    intro: ['The hardest one to beat', 'Objective: defeat your pride.'],
    objective: 'DEFEAT PRIDE', exitText: 'THE GATE IS OPEN - GO TO HER',
    floor: 'metal', ceil: 'metal', fog: [10, 12, 24], fogDist: 17, music: 'boss',
    ang: -Math.PI / 2, forgive: [60, 90], boss: true,
    ghostSpawns: [[3, 6], [22, 6], [3, 25], [22, 25]],
    radio: {
      start: ['worried', 'That\'s your pride. It\'s always the last one standing.'],
      clear: ['soft', 'You did it... Come find me.']
    },
    bossLines: {
      0.66: ['worried', 'Keep going! It hates it when you admit you\'re wrong.'],
      0.33: ['soft', 'You\'re so close. I believe in you.']
    }
  },
  {
    map: 3, title: 'EPILOGUE', name: 'HER', time: 'DAY 2  //  00:01', place: 'Where she\'s waiting',
    intro: ['No more enemies', 'Objective: walk to ' + CONFIG.her + ' and say it.'],
    objective: 'WALK TO ' + CONFIG.her.toUpperCase(), exitText: '',
    floor: 'carpet', ceil: 'warm', fog: [52, 22, 38], fogDist: 22, music: 'love',
    ang: 0, forgive: [90, 100], lara: true,
    walk: [
      [6, 'soft', 'I watched the whole thing. All of it. For me?'],
      [12, 'soft', 'You didn\'t have to do all that, you know.'],
      [16, 'smile', '...Hi.']
    ],
    radio: {}
  }
];

const DIFFICULTY = [
  { name: 'RECRUIT', note: 'Gentle. She\'s watching.', dmg: 0.55, hp: 0.8, regen: 2.5, aim: 1.6 },
  { name: 'REGULAR', note: 'Fair fight.', dmg: 1.0, hp: 1.0, regen: 4, aim: 1.0 },
  { name: 'VETERAN', note: 'Excuses hit hard.', dmg: 1.5, hp: 1.3, regen: 6, aim: 0.6 }
];

const FAIL_LINES = [
  'Seriously? Get up.',
  'I didn\'t say you could quit.',
  'The excuses are winning. Don\'t let them.',
  'You gave up on me once. Don\'t do it twice.',
  'Get back in there. I\'m watching.'
];

const LOW_HP_LINES = [
  'Hey. Don\'t you dare quit on me.',
  'Careful!! I\'m not done being mad at you.',
  'Take the chocolates. Please.'
];
