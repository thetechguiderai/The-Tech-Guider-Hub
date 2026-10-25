// Fun Zone — Tech Quiz question bank (sirf true/general knowledge sawal).
// Har round mein isme se 5 random questions shuffle ho kar aate hain.
const QUIZ_QUESTIONS = [
  {
    q: 'YouTube ka pehla video kis naam se upload hua tha?',
    options: ['Me at the zoo', 'First Ever Video', 'Hello World', 'My Day'],
    answer: 0,
    explain: 'April 2005 mein "Me at the zoo" (19 seconds) upload hua tha.',
  },
  {
    q: 'Google ka original (pehla) naam kya tha?',
    options: ['BackRub', 'Googol', 'WebSearch', 'PageRank'],
    answer: 0,
    explain: '1996 mein Stanford pe iska naam "BackRub" tha.',
  },
  {
    q: 'Computer mouse pehle kisi cheez se bana tha?',
    options: ['Lakdi (wood)', 'Plastic', 'Metal', 'Rubber'],
    answer: 0,
    explain: '1964 mein Douglas Engelbart ne lakde ka mouse banaya.',
  },
  {
    q: 'Bluetooth ka naam kis ke naam pe rakha gaya?',
    options: ['King Harald Bluetooth', 'Ek scientist', 'Ek company', 'Ek city'],
    answer: 0,
    explain: 'Danish king Harald "Bluetooth" — jinhone tribes jore, waise hi devices jor ta hai.',
  },
  {
    q: 'Pehla mobile phone call kis year hua?',
    options: ['1973', '1985', '1990', '1965'],
    answer: 0,
    explain: '1973 mein Motorola ke Martin Cooper ne pehla mobile call kiya.',
  },
  {
    q: 'Dunia ki pehli website kaun si thi?',
    options: ['info.cern.ch', 'google.com', 'amazon.com', 'ibm.com'],
    answer: 0,
    explain: 'CERN ki info.cern.ch (1991) — aaj bhi live hai.',
  },
  {
    q: 'TikTok ka purana naam kya tha (merge hone se pehle)?',
    options: ['Music.ly', 'Vine', 'Snap', 'Reel'],
    answer: 0,
    explain: '2018 mein Music.ly aur TikTok merge hue.',
  },
  {
    q: 'Firefox browser ka pehla naam kya tha?',
    options: ['Phoenix', 'Zebra', 'Owl', 'Dragon'],
    answer: 0,
    explain: 'Phoenix → Firebird → Firefox (2004).',
  },
  {
    q: 'Email mein "@" symbol sab se pehle kisne use kiya?',
    options: ['Ray Tomlinson', 'Bill Gates', 'Steve Jobs', 'Tim Berners-Lee'],
    answer: 0,
    explain: 'Ray Tomlinson ne 1971 mein pehli email bhejte waqt "@" chuna.',
  },
  {
    q: 'Dunia ke smartphones takreeban kitne percent Android pe chalte hain?',
    options: ['~70%', '~30%', '~50%', '~95%'],
    answer: 0,
    explain: 'Takreeban 70% smartphones Android OS pe chalte hain.',
  },
  {
    q: 'Emoji ka inventor kaun hai?',
    options: ['Shigetaka Kurita', 'Jack Dorsey', 'Mark Zuckerberg', 'Elon Musk'],
    answer: 0,
    explain: 'Japan ke Shigetaka Kurita ne 1999 mein pehle emoji banaye.',
  },
  {
    q: 'Minecraft ko kisne banaya tha?',
    options: ['Markus "Notch" Persson', 'Gabe Newell', 'Jens Bergensten', 'Bill Gates'],
    answer: 0,
    explain: 'Notch ne 2009 mein pehli version banai; baad mein Microsoft ne buy kiya (Jens lead dev bane).',
  },
  {
    q: 'QWERTY keyboard ka layout kis liye design hua tha?',
    options: ['Typewriter jamming rokne ke liye', 'Speed ke liye', 'Games ke liye', 'Design ke liye'],
    answer: 0,
    explain: 'Fast typists typewriter keys ko jam na kar dein, is liye ajeeb layout banaya gaya.',
  },
  {
    q: 'Pehla video game kaun sa tha?',
    options: ['Tennis for Two', 'Pong', 'Pac-Man', 'Tetris'],
    answer: 0,
    explain: '1958 mein "Tennis for Two" oscilloscope pe chalta tha.',
  },
  {
    q: 'Instagram ka pehla version kaun si app thi?',
    options: ['Burbn', 'Photogram', 'PicShare', 'Pixr'],
    answer: 0,
    explain: 'Burbn location check-in app thi — baad mein photo app bani (Instagram).',
  },
  {
    q: 'PDF format sab se pehle kis company ne banaya?',
    options: ['Adobe', 'Microsoft', 'IBM', 'Google'],
    answer: 0,
    explain: 'Adobe ne 1990s mein PDF banaya — aaj universal document format hai.',
  },
];

export default QUIZ_QUESTIONS;
export const QUIZ_ROUND_SIZE = 5;
