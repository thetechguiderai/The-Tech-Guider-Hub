/* ============================================================================
   Entertainment Zone — quiz banks
   Har sawal ka jawab aur explanation manually verify kiya gaya hai. Yahan koi
   auto-generated ya "maybe true" content nahi hai.
   ========================================================================== */

const TECH = [
  {
    id: 'tech-1',
    q: 'HTTP status code 404 ka matlab kya hai?',
    options: ['Server error', 'Not Found', 'Unauthorized', 'Moved permanently'],
    answer: 1,
    explain: '404 ka matlab hai ke requested resource server par maujood nahi. 500 server error hai, 401 unauthorized aur 301 permanent redirect.',
  },
  {
    id: 'tech-2',
    q: 'CSS mein text ka rang badalne ke liye kaunsi property use hoti hai?',
    options: ['font-color', 'text-color', 'color', 'foreground'],
    answer: 2,
    explain: 'CSS mein text color ke liye "color" property use hoti hai. "background-color" background ke liye hoti hai.',
  },
  {
    id: 'tech-3',
    q: 'In mein se kaunsi JavaScript ki primitive type NAHI hai?',
    options: ['string', 'boolean', 'symbol', 'object'],
    answer: 3,
    explain: 'Object JavaScript mein primitive type nahi balki reference type hai. Primitives: string, number, bigint, boolean, undefined, symbol aur null.',
  },
  {
    id: 'tech-4',
    q: 'Binary number 1010 ka decimal value kya hai?',
    options: ['8', '10', '12', '14'],
    answer: 1,
    explain: '1010₂ = 1×8 + 0×4 + 1×2 + 0×1 = 10.',
  },
  {
    id: 'tech-5',
    q: 'HTML ka full form kya hai?',
    options: ['HyperText Markup Language', 'High Tech Modern Language', 'Hyperlink Text Management Language', 'Home Tool Markup Language'],
    answer: 0,
    explain: 'HTML ka matlab HyperText Markup Language hai. Ye web pages ka structure banata hai.',
  },
  {
    id: 'tech-6',
    q: 'React library ko kaunsi company maintain karti hai?',
    options: ['Google', 'Microsoft', 'Meta', 'Amazon'],
    answer: 2,
    explain: 'React ko Meta (pehle Facebook) ne banaya aur abhi bhi maintain karti hai.',
  },
  {
    id: 'tech-7',
    q: 'SQL mein data retrieve karne ke liye kaunsa command use hota hai?',
    options: ['GET', 'SELECT', 'FETCH', 'READ'],
    answer: 1,
    explain: 'SELECT rows/columns ko read karne ke liye use hota hai. GET HTTP method hai, SQL command nahi.',
  },
  {
    id: 'tech-8',
    q: 'Git kis qism ka tool hai?',
    options: ['Database', 'Version control system', 'Text editor', 'Web server'],
    answer: 1,
    explain: 'Git distributed version control system hai jo code ki history track karta hai.',
  },
  {
    id: 'tech-9',
    q: 'IPv4 address kitne bits ka hota hai?',
    options: ['16 bits', '32 bits', '64 bits', '128 bits'],
    answer: 1,
    explain: 'IPv4 32-bit address hota hai (4 octets). IPv6 128-bit hota hai.',
  },
  {
    id: 'tech-10',
    q: 'JavaScript mein "===" operator kya check karta hai?',
    options: ['Sirf value', 'Sirf type', 'Value aur type dono', 'Memory address'],
    answer: 2,
    explain: '"===" strict equality hai: value aur type dono compare hoti hain. "==" type coercion kar sakta hai.',
  },
  {
    id: 'tech-11',
    q: 'In mein se kaunsa NoSQL database hai?',
    options: ['PostgreSQL', 'MySQL', 'MongoDB', 'Oracle Database'],
    answer: 2,
    explain: 'MongoDB document-based NoSQL database hai. Baqi teen relational SQL databases hain.',
  },
  {
    id: 'tech-12',
    q: 'CSS Flexbox mein default flex-direction kya hota hai?',
    options: ['row', 'column', 'row-reverse', 'column-reverse'],
    answer: 0,
    explain: 'Default "row" hota hai, yani items horizontally arrange hote hain.',
  },
  {
    id: 'tech-13',
    q: 'DNS ka bunyadi kaam kya hai?',
    options: ['Passwords encrypt karna', 'Domain name ko IP address par map karna', 'Files compress karna', 'Video stream karna'],
    answer: 1,
    explain: 'DNS (Domain Name System) internet ka phonebook hai: domain names ko IP addresses mein badalta hai.',
  },
  {
    id: 'tech-14',
    q: 'In mein se kaunsa frontend build tool hai?',
    options: ['Vite', 'Express', 'MongoDB', 'Nginx'],
    answer: 0,
    explain: 'Vite frontend build/dev tool hai. Express backend framework hai, MongoDB database aur Nginx web server.',
  },
  {
    id: 'tech-15',
    q: 'SHA-256 hash ka output kitne bits ka hota hai?',
    options: ['128 bits', '192 bits', '256 bits', '512 bits'],
    answer: 2,
    explain: 'SHA-256 ka output 256 bits (32 bytes) hota hai. Isi liye naam mein 256 hai.',
  },
  {
    id: 'tech-16',
    q: 'HTTP mein kisi resource ko update ya replace karne ke liye aam tor par kaunsa method use hota hai?',
    options: ['GET', 'PUT', 'HEAD', 'TRACE'],
    answer: 1,
    explain: 'PUT resource ko create/replace karta hai. PATCH partial update ke liye hota hai.',
  },
  {
    id: 'tech-17',
    q: 'Binary search ki time complexity kya hoti hai?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    answer: 1,
    explain: 'Binary search har step par search space aadha karta hai, is liye O(log n) hoti hai (sorted data par).',
  },
  {
    id: 'tech-18',
    q: 'Node.js kya hai?',
    options: ['Programming language', 'JavaScript runtime', 'CSS framework', 'Database engine'],
    answer: 1,
    explain: 'Node.js ek JavaScript runtime hai jo V8 engine par browser ke bahar JS chalata hai.',
  },
  {
    id: 'tech-19',
    q: 'HTTPS aam tor par kis port par chalta hai?',
    options: ['21', '80', '443', '8080'],
    answer: 2,
    explain: 'HTTPS ka default port 443 hai. HTTP ka default port 80 hai.',
  },
  {
    id: 'tech-20',
    q: 'JavaScript mein array ke aakhir mein item add karne ke liye kaunsa method use hota hai?',
    options: ['push()', 'pop()', 'shift()', 'slice()'],
    answer: 0,
    explain: 'push() end mein add karta hai, pop() end se remove karta hai, shift() start se remove karta hai.',
  },
];

const GAMING = [
  {
    id: 'gaming-1',
    q: 'Minecraft ka default game mode kaunsa hai?',
    options: ['Creative', 'Survival', 'Adventure', 'Spectator'],
    answer: 1,
    explain: 'Nayi duniya default tor par Survival mode mein banti hai, jahan health aur hunger hoti hai.',
  },
  {
    id: 'gaming-2',
    q: 'Chess board par kul kitne squares hote hain?',
    options: ['36', '49', '64', '81'],
    answer: 2,
    explain: 'Standard chess board 8×8 hai, yani 64 squares.',
  },
  {
    id: 'gaming-3',
    q: 'Free Fire kis genre ka game hai?',
    options: ['Racing', 'Battle royale', 'Puzzle', 'Sports'],
    answer: 1,
    explain: 'Free Fire ek battle royale shooter hai jahan players last survivor banne ki koshish karte hain.',
  },
  {
    id: 'gaming-4',
    q: 'Among Us mein Impostor ka maqsad kya hota hai?',
    options: ['Tasks mukammal karna', 'Crewmates ko eliminate karna', 'Ship repair karna', 'Map banana'],
    answer: 1,
    explain: 'Impostor crewmates ko eliminate karta hai aur sabotage karke shak paida karta hai. Crewmates ka kaam tasks complete karna hai.',
  },
  {
    id: 'gaming-5',
    q: 'Nintendo Switch kis qism ka console hai?',
    options: ['Sirf handheld', 'Sirf home console', 'Hybrid handheld/home console', 'PC add-on'],
    answer: 2,
    explain: 'Switch hybrid hai: TV par dock karke home console ki tarah aur bahar handheld ki tarah khela ja sakta hai.',
  },
  {
    id: 'gaming-6',
    q: 'Tetris ke blocks ko kya kaha jata hai?',
    options: ['Polyominoes', 'Tetrominoes', 'Quadblocks', 'Cubes'],
    answer: 1,
    explain: 'Tetrominoes char squares se bante hain, isi liye "tetra" (four) kehte hain.',
  },
  {
    id: 'gaming-7',
    q: 'Mario ka bhai kaun hai?',
    options: ['Wario', 'Luigi', 'Toad', 'Bowser'],
    answer: 1,
    explain: 'Luigi Mario ka chhota bhai hai aur co-op games mein doosra player hota hai.',
  },
  {
    id: 'gaming-8',
    q: 'PUBG mein jeetne par kaunsa mashhoor phrase dikhaya jata hai?',
    options: ['Game Over', 'Winner Winner Chicken Dinner', 'Level Complete', 'Victory Royale'],
    answer: 1,
    explain: '"Winner Winner Chicken Dinner" PUBG ki iconic jeet ki phrase hai. "Victory Royale" Fortnite ki hai.',
  },
  {
    id: 'gaming-9',
    q: 'PlayStation brand kis company ki hai?',
    options: ['Nintendo', 'Sega', 'Sony', 'Microsoft'],
    answer: 2,
    explain: 'PlayStation Sony ka brand hai. Xbox Microsoft ka aur Switch Nintendo ka hai.',
  },
  {
    id: 'gaming-10',
    q: 'Minecraft mein stone block todne ke liye kaunsa tool behtar hai?',
    options: ['Axe', 'Shovel', 'Pickaxe', 'Hoe'],
    answer: 2,
    explain: 'Stone aur ores ke liye pickaxe use hota hai. Axe wood, shovel dirt/sand aur hoe farming ke liye hai.',
  },
  {
    id: 'gaming-11',
    q: 'Speedrunning mein "RTA" ka matlab kya hai?',
    options: ['Real Time Attack', 'Run Time Average', 'Rapid Tool Assist', 'Ranked Team Arena'],
    answer: 0,
    explain: 'RTA = Real Time Attack, yani game start se end tak asal ghadi ka waqt. TAS tool-assisted speedrun hota hai.',
  },
  {
    id: 'gaming-12',
    q: 'Standard playing card deck mein jokers ke baghair kitne cards hote hain?',
    options: ['48', '50', '52', '54'],
    answer: 2,
    explain: 'Standard deck mein 52 cards hote hain (4 suits × 13). Jokers ke sath 54 ho jate hain.',
  },
  {
    id: 'gaming-13',
    q: 'Gaming mein "GG" ka matlab aam tor par kya hota hai?',
    options: ['Good Game', 'Great Graphics', 'Get Going', 'Game Guide'],
    answer: 0,
    explain: 'GG "Good Game" ka short form hai, jo match ke aakhir mein sportsmanship ke liye likha jata hai.',
  },
  {
    id: 'gaming-14',
    q: 'Kaunsa esport game "smoke", "flash" aur "molotov" utilities ke liye mashhoor hai?',
    options: ['Dota 2', 'Counter-Strike', 'Rocket League', 'Street Fighter'],
    answer: 1,
    explain: 'Counter-Strike series mein smoke, flashbang aur molotov/incendiary grenades tactical utility ke liye use hote hain.',
  },
  {
    id: 'gaming-15',
    q: 'Roblox mein in-game currency ka naam kya hai?',
    options: ['V-Bucks', 'Robux', 'Coins', 'Gems'],
    answer: 1,
    explain: 'Roblox ki currency Robux hai. V-Bucks Fortnite ki currency hai.',
  },
  {
    id: 'gaming-16',
    q: 'Tetris game kis ne banaya?',
    options: ['Shigeru Miyamoto', 'Alexey Pajitnov', 'Hideo Kojima', 'John Carmack'],
    answer: 1,
    explain: 'Alexey Pajitnov ne Tetris 1984 mein Soviet Union mein banaya.',
  },
  {
    id: 'gaming-17',
    q: 'Minecraft mein Creeper ka kya khaas behaviour hai?',
    options: ['Tez bhagta hai', 'Qareeb aakar explode hota hai', 'Pani mein rehta hai', 'Chest loot karta hai'],
    answer: 1,
    explain: 'Creeper khamoshi se qareeb aata hai, phir fuse hokar explode hota hai aur blocks ko nuqsan pahunchata hai.',
  },
  {
    id: 'gaming-18',
    q: 'Gaming mein "NPC" ka matlab kya hai?',
    options: ['New Player Character', 'Non-Player Character', 'Network Packet Control', 'Next Play Card'],
    answer: 1,
    explain: 'NPC = Non-Player Character, yani game ke AI-controlled characters.',
  },
];

const GENERAL = [
  {
    id: 'general-1',
    q: 'Pakistan ka darul hukumat kaunsa shehar hai?',
    options: ['Karachi', 'Lahore', 'Islamabad', 'Peshawar'],
    answer: 2,
    explain: 'Islamabad Pakistan ka darul hukumat hai. Karachi sab se bara shehar hai.',
  },
  {
    id: 'general-2',
    q: 'Nizaam-e-shamsi ka sab se bara sayyara kaunsa hai?',
    options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'],
    answer: 1,
    explain: 'Jupiter size aur mass dono mein sab se bara planet hai.',
  },
  {
    id: 'general-3',
    q: 'Gold ka chemical symbol kya hai?',
    options: ['Ag', 'Au', 'Fe', 'Cu'],
    answer: 1,
    explain: 'Gold ka symbol Au hai (Latin "aurum" se). Ag silver hai, Fe iron aur Cu copper.',
  },
  {
    id: 'general-4',
    q: 'Duniya mein kitne continents hain?',
    options: ['5', '6', '7', '8'],
    answer: 2,
    explain: 'Aam tor par 7 continents gine jate hain: Asia, Africa, North America, South America, Antarctica, Europe aur Australia/Oceania.',
  },
  {
    id: 'general-5',
    q: '"The Alchemist" kis ki tasneef hai?',
    options: ['Paulo Coelho', 'Chetan Bhagat', 'Khaled Hosseini', 'J.K. Rowling'],
    answer: 0,
    explain: 'The Alchemist Paulo Coelho ka mashhoor novel hai, jo pehli dafa 1988 mein publish hua.',
  },
  {
    id: 'general-6',
    q: 'Duniya ka sab se bara samundar kaunsa hai?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    answer: 2,
    explain: 'Pacific Ocean area aur depth dono ke lehaz se sab se bara samundar hai.',
  },
  {
    id: 'general-7',
    q: 'Kaunsa sayyara "Red Planet" kehlata hai?',
    options: ['Venus', 'Mars', 'Mercury', 'Jupiter'],
    answer: 1,
    explain: 'Mars ko Red Planet kehte hain kyunke uski satah par iron oxide (rust) hai.',
  },
  {
    id: 'general-8',
    q: 'Leap year mein kitne din hote hain?',
    options: ['364', '365', '366', '367'],
    answer: 2,
    explain: 'Leap year mein 366 din hote hain, February 29 din ki hoti hai.',
  },
  {
    id: 'general-9',
    q: 'Japan ki currency ka naam kya hai?',
    options: ['Won', 'Yuan', 'Yen', 'Ringgit'],
    answer: 2,
    explain: 'Japan ki currency Yen hai. Won South Korea, Yuan China aur Ringgit Malaysia ki currency hai.',
  },
  {
    id: 'general-10',
    q: 'Zameen par sab se tez bhaagne wala janwar kaunsa hai?',
    options: ['Lion', 'Cheetah', 'Horse', 'Gazelle'],
    answer: 1,
    explain: 'Cheetah 100–120 km/h tak bhaag sakta hai, is liye land par sab se tez hai.',
  },
  {
    id: 'general-11',
    q: 'Insani jism ka sab se bara organ kaunsa hai?',
    options: ['Liver', 'Brain', 'Skin', 'Lungs'],
    answer: 2,
    explain: 'Skin insani jism ka sab se bara organ hai (surface area aur weight ke lehaz se).',
  },
  {
    id: 'general-12',
    q: 'Mount Everest kis do mulkon ki border par hai?',
    options: ['India aur China', 'Nepal aur China', 'Nepal aur India', 'Bhutan aur China'],
    answer: 1,
    explain: 'Mount Everest Nepal aur China (Tibet) ki border par hai.',
  },
  {
    id: 'general-13',
    q: 'The Great Wall kis mulk mein hai?',
    options: ['Japan', 'China', 'Mongolia', 'South Korea'],
    answer: 1,
    explain: 'The Great Wall of China China mein hai aur duniya ke sab se mashhoor tareekhi structures mein shumar hoti hai.',
  },
  {
    id: 'general-14',
    q: 'Pablo Picasso kis field se taluq rakhte thay?',
    options: ['Music', 'Painting', 'Architecture', 'Literature'],
    answer: 1,
    explain: 'Pablo Picasso ek mashhoor Spanish painter aur sculptor thay, jo Cubism ke liye jane jate hain.',
  },
  {
    id: 'general-15',
    q: 'Ek kilometer mein kitne meters hote hain?',
    options: ['100', '500', '1000', '10000'],
    answer: 2,
    explain: '1 kilometer = 1000 meters. "Kilo" ka matlab thousand hai.',
  },
  {
    id: 'general-16',
    q: 'Paudhe photosynthesis mein kaunsi gas absorb karte hain?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    answer: 2,
    explain: 'Paudhe carbon dioxide absorb karke oxygen release karte hain, sunlight aur water ki madad se.',
  },
  {
    id: 'general-17',
    q: 'Pakistan ka Youm-e-Azadi kab manaya jata hai?',
    options: ['14 August', '15 August', '23 March', '6 September'],
    answer: 0,
    explain: 'Pakistan 14 August 1947 ko azad hua, is liye 14 August Youm-e-Azadi hai. 23 March Youm-e-Pakistan hai.',
  },
  {
    id: 'general-18',
    q: 'Nile river kis mulk se hokar guzarti hai?',
    options: ['Egypt', 'Turkey', 'Iraq', 'Greece'],
    answer: 0,
    explain: 'Nile river Egypt se hokar guzarti hai aur apne delta se Mediterranean Sea mein girti hai.',
  },
  {
    id: 'general-19',
    q: 'Football ki ek team mein maidan par kitne players hote hain?',
    options: ['9', '10', '11', '12'],
    answer: 2,
    explain: 'Football team mein 11 players hoti hain, jismein 1 goalkeeper shamil hota hai.',
  },
  {
    id: 'general-20',
    q: 'Pakistan ki currency ka naam kya hai?',
    options: ['Rupee', 'Taka', 'Dinar', 'Riyal'],
    answer: 0,
    explain: 'Pakistan ki currency Pakistani Rupee (PKR) hai.',
  },
];

export const QUIZ_CATEGORIES = [
  {
    id: 'tech',
    title: 'Technology',
    emoji: '💻',
    desc: 'Web, code, internet aur computer basics.',
    questions: TECH,
  },
  {
    id: 'gaming',
    title: 'Gaming',
    emoji: '🎮',
    desc: 'Games, esports aur gaming culture.',
    questions: GAMING,
  },
  {
    id: 'general',
    title: 'General Knowledge',
    emoji: '🌍',
    desc: 'Duniya, science, geography aur everyday GK.',
    questions: GENERAL,
  },
];

export const QUIZ_ROUND_SIZE = 10;
export const DAILY_QUIZ_SIZE = 8;
export const TOTAL_QUESTION_COUNT = QUIZ_CATEGORIES.reduce((sum, c) => sum + c.questions.length, 0);
export const ALL_QUESTIONS = QUIZ_CATEGORIES.flatMap((c) => c.questions.map((q) => ({ ...q, category: c.id })));

/* ------------------------------- helpers --------------------------------- */

export function seededRandom(seedText) {
  let h = 0x811c9dc5;
  const str = String(seedText);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const arr = Array.isArray(list) ? list.slice() : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function buildRound(categoryId, count = QUIZ_ROUND_SIZE, rng = Math.random) {
  const category = QUIZ_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];
  return shuffle(category.questions, rng)
    .slice(0, Math.min(count, category.questions.length))
    .map((q) => ({ ...q, category: category.id }));
}

export function buildDailyRound(dateKey, count = DAILY_QUIZ_SIZE) {
  const rng = seededRandom(`ttg-daily-quiz-${dateKey}`);
  return shuffle(ALL_QUESTIONS, rng)
    .slice(0, Math.min(count, ALL_QUESTIONS.length))
    .map((q) => ({ ...q }));
}
