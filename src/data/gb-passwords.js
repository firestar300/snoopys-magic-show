/** Characters available when cycling with D-pad (empty slot + GB password charset) */
export const PASSWORD_CHAR_CYCLE = ['', ...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

/**
 * @param {string} current
 * @param {number} delta -1 = previous, +1 = next
 * @returns {string}
 */
export const cyclePasswordChar = (current, delta) => {
  const list = PASSWORD_CHAR_CYCLE;
  let i = list.indexOf(current);
  if (i < 0) i = 0;
  i = (i + delta + list.length * 10) % list.length;
  return list[i];
};

/**
 * Original Game Boy "Snoopy's Magic Show" level passwords (4 characters).
 * Source: same listing as https://gamefaqs.gamespot.com/gameboy/585900-snoopys-magic-show/cheats
 */

const PASSWORD_LEVEL_PAIRS = [
  ['1N1O', 10],
  ['BHNA', 100],
  ['HEO4', 101],
  ['VEY2', 102],
  ['OH1H', 103],
  ['CH1D', 104],
  ['7ENC', 105],
  ['7EBO', 106],
  ['CH17', 107],
  ['OH1I', 108],
  ['HEOV', 109],
  ['H0O7', 11],
  ['CEIB', 110],
  ['VHNX', 111],
  ['1H11', 112],
  ['B6N0', 113],
  ['U6KQ', 114],
  ['CD1T', 115],
  ['CD1A', 116],
  ['1614', 117],
  ['I6Y2', 118],
  ['CDXH', 119],
  ['10E1', 12],
  ['CD1D', 120],
  ['ONBV', 13],
  ['1N1B', 14],
  ['C01X', 15],
  ['10I1', 16],
  ['CZ10', 17],
  ['XZ2Q', 18],
  ['1QET', 19],
  ['1NWQ', 2],
  ['XQ1A', 20],
  ['VZY4', 21],
  ['XZ12', 22],
  ['1QEH', 23],
  ['XQ1D', 24],
  ['2ZVC', 25],
  ['ZX10', 26],
  ['ZQJ7', 27],
  ['XQSI', 28],
  ['XZ1V', 29],
  ['70BT', 3],
  ['XZUB', 30],
  ['2QOX', 31],
  ['XQ11', 32],
  ['ZYU0', 33],
  ['BYBQ', 34],
  ['TTOT', 35],
  ['BTBA', 36],
  ['BY14', 37],
  ['BY12', 38],
  ['VTNH', 39],
  ['104A', 4],
  ['BTND', 40],
  ['HYOC', 41],
  ['BYYO', 42],
  ['OT17', 43],
  ['BT1I', 44],
  ['7YNV', 45],
  ['BYBB', 46],
  ['CT1X', 47],
  ['BT11', 48],
  ['H5O0', 49],
  ['4N44', 5],
  ['V5IQ', 50],
  ['VANT', 51],
  ['VAIA', 52],
  ['B5N4', 53],
  ['V5K2', 54],
  ['CA1H', 55],
  ['VA1D', 56],
  ['151C', 57],
  ['V5YO', 58],
  ['CAX7', 59],
  ['1NX2', 6],
  ['VA1I', 60],
  ['454V', 61],
  ['E5WB', 62],
  ['7ABX', 63],
  ['4A41', 64],
  ['4S40', 65],
  ['CSXQ', 66],
  ['145T', 67],
  ['C4XA', 68],
  ['1S14', 69],
  ['105H', 7],
  ['CS12', 70],
  ['H4OH', 71],
  ['I4ED', 72],
  ['OSBC', 73],
  ['VS1O', 74],
  ['C417', 75],
  ['D4II', 76],
  ['CS1V', 77],
  ['2S2B', 78],
  ['14EX', 79],
  ['10XD', 8],
  ['C411', 80],
  ['VUY0', 81],
  ['CU1Q', 82],
  ['12ET', 83],
  ['C21A', 84],
  ['2UV4', 85],
  ['VU12', 86],
  ['Z2JH', 87],
  ['N2SD', 88],
  ['XU1C', 89],
  ['1N1C', 9],
  ['ZUUO', 90],
  ['22O7', 91],
  ['C21I', 92],
  ['ZUUV', 93],
  ['7UBB', 94],
  ['T2OX', 95],
  ['H2B1', 96],
  ['BE10', 97],
  ['CE1Q', 98],
  ['VHNT', 99],
];

/** @type {ReadonlyMap<string, number>} */
export const PASSWORD_TO_LEVEL = new Map(
  PASSWORD_LEVEL_PAIRS.map(([pwd, level]) => [pwd.toUpperCase(), level])
);

/**
 * Normalize user input: uppercase ASCII, trim length to 4.
 * @param {string} raw
 * @returns {string}
 */
export const normalizePassword = (raw) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);

/**
 * @param {string} rawPassword
 * @returns {number | null} Level index (1–120) or null if unknown
 */
export const getLevelFromPassword = (rawPassword) => {
  const key = normalizePassword(rawPassword);
  if (key.length !== 4) return null;
  return PASSWORD_TO_LEVEL.has(key) ? PASSWORD_TO_LEVEL.get(key) : null;
};
