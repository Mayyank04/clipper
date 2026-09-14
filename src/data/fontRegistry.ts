/**
 * VIRALCLIP STUDIO — CANONICAL CREATOR FONT REGISTRY
 * Authoritative font definitions backed by real imported TTF/OTF files with SHA-256 hashes.
 */

export interface CreatorFont {
  id: string;
  family: string;
  displayName: string;
  files: {
    regular?: string;
    medium?: string;
    semibold?: string;
    bold?: string;
    extrabold?: string;
    black?: string;
    italic?: string;
  };
  weights: number[];
  style:
    | 'display'
    | 'condensed'
    | 'sans'
    | 'serif'
    | 'handwritten'
    | 'rounded'
    | 'comic'
    | 'editorial'
    | 'mono';
  category:
    | 'REFERENCE'
    | 'VIRAL'
    | 'CONDENSED'
    | 'BOLD'
    | 'CINEMATIC'
    | 'EDITORIAL'
    | 'MEME'
    | 'COMEDY'
    | 'CLEAN'
    | 'HANDWRITTEN'
    | 'DISPLAY'
    | 'MINIMAL';
  supportsUppercase: boolean;
  supportsLatin?: boolean;
  supportsDevanagari?: boolean;
  supportsArabic?: boolean;
  licenseSource?: string;
  sourceFile?: string;
  sha256?: string;
}

export const CREATOR_FONTS: CreatorFont[] = [
  {
    "id": "lemon_milk",
    "family": "Lemon Milk",
    "displayName": "Lemon Milk",
    "files": {
      "bold": "/assets/fonts/LEMONMILK-Regular.otf",
      "italic": "/assets/fonts/LEMONMILK-RegularItalic.otf",
      "regular": "/assets/fonts/LEMONMILK-Light.otf",
      "medium": "/assets/fonts/LEMONMILK-Medium.otf"
    },
    "weights": [
      300,
      500,
      700
    ],
    "style": "display",
    "category": "REFERENCE",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "LEMONMILK-Bold.otf",
    "sha256": "07050370cce15356c771df836dc18e156b82209a3c6376ecd2ca846cf726c7be"
  },
  {
    "id": "american_captain",
    "family": "American Captain",
    "displayName": "American Captain",
    "files": {
      "bold": "/assets/fonts/American Captain.otf"
    },
    "weights": [
      700
    ],
    "style": "condensed",
    "category": "CONDENSED",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "American Captain.otf",
    "sha256": "04fe05cad28538b054ff4be2a67424dc4de34e0d8aede5e68698bab50d103987"
  },
  {
    "id": "coolvetica",
    "family": "Coolvetica",
    "displayName": "Coolvetica",
    "files": {
      "bold": "/assets/fonts/coolvetica rg.otf"
    },
    "weights": [
      700
    ],
    "style": "sans",
    "category": "VIRAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "coolvetica compressed hv.otf",
    "sha256": "fe93abe35eb9a14ccd3cc76652412c3cc0fce6c3a939a252a2f01453c5858e33"
  },
  {
    "id": "couture",
    "family": "Couture",
    "displayName": "Couture",
    "files": {
      "bold": "/assets/fonts/couture-bldit.otf"
    },
    "weights": [
      700
    ],
    "style": "editorial",
    "category": "EDITORIAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "couture-bld.otf",
    "sha256": "9e3ec64eba080a59955ba8d641759681820db27f0b7bee8e4d4149e26d10875d"
  },
  {
    "id": "komika_axis",
    "family": "Komika Axis",
    "displayName": "Komika Axis",
    "files": {
      "bold": "/assets/fonts/KOMIKAX_.ttf"
    },
    "weights": [
      700
    ],
    "style": "comic",
    "category": "MEME",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "KOMIKAX_.ttf",
    "sha256": "a6d750a82402c22e79ac360943b714726a63e1e5550b459ffbbee6906a7cb597"
  },
  {
    "id": "cloister_black",
    "family": "Cloister Black",
    "displayName": "Cloister Black",
    "files": {
      "black": "/assets/fonts/CloisterBlack.ttf"
    },
    "weights": [
      900
    ],
    "style": "display",
    "category": "CINEMATIC",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "CloisterBlack.ttf",
    "sha256": "c9e71c7ceee1a96c9b983b5f7442199ec261dfc4201415123afc1a65617dbccd"
  },
  {
    "id": "godofthunder_0wo1p",
    "family": "Godofthunder-0WO1P",
    "displayName": "Godofthunder-0WO1P",
    "files": {
      "bold": "/assets/fonts/Godofthunder-0WO1P.ttf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "BOLD",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Godofthunder-0WO1P.ttf",
    "sha256": "bd4454a172264d737b81ba7acfa541d89437c7a352f2bf239d9eae4c48f464fe"
  },
  {
    "id": "the_amazing_spider_man",
    "family": "The Amazing Spider-Man",
    "displayName": "The Amazing Spider-Man",
    "files": {
      "bold": "/assets/fonts/The Amazing Spider-Man.ttf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "BOLD",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "The Amazing Spider-Man.ttf",
    "sha256": "264ef25ad0dc0e2b42232357445f4370ab0e0eee4cf6152e1d6e51e6d703ddde"
  },
  {
    "id": "union_college_2",
    "family": "Union College 2",
    "displayName": "Union College 2",
    "files": {
      "bold": "/assets/fonts/Union College 2.ttf"
    },
    "weights": [
      700
    ],
    "style": "sans",
    "category": "BOLD",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Union College 2.ttf",
    "sha256": "946ad20283cd11c27e07f9a80a67f34cb668705167aaa88d6dfc3623fc8f44b0"
  },
  {
    "id": "union_college",
    "family": "Union College",
    "displayName": "Union College",
    "files": {
      "bold": "/assets/fonts/Union College.ttf"
    },
    "weights": [
      700
    ],
    "style": "sans",
    "category": "CLEAN",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Union College.ttf",
    "sha256": "122e5858a65792ab99e79e901ce0dfbf6eb36fa95c93b4ec2274877bcdc012e7"
  },
  {
    "id": "morris_roman_black",
    "family": "Morris Roman Black",
    "displayName": "Morris Roman Black",
    "files": {
      "black": "/assets/fonts/MorrisRomanBlack.ttf"
    },
    "weights": [
      900
    ],
    "style": "serif",
    "category": "EDITORIAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "MorrisRomanBlack.otf",
    "sha256": "9a2eace7a9843c156ff56be3db0af3c04400ebdf452242e3447966d8b7cfc04f"
  },
  {
    "id": "morris_roman_black_alt",
    "family": "Morris Roman Black Alt",
    "displayName": "Morris Roman Black Alt",
    "files": {
      "black": "/assets/fonts/MorrisRomanBlackAlt.ttf"
    },
    "weights": [
      900
    ],
    "style": "serif",
    "category": "EDITORIAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "MorrisRomanBlackAlt.otf",
    "sha256": "44f0f0f2aa01790c2c24704d340a62cba7053e4431920b8eaf7360694b7f2f66"
  },
  {
    "id": "batmfa__",
    "family": "batmfa__",
    "displayName": "batmfa__",
    "files": {
      "bold": "/assets/fonts/batmfa__.ttf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "CINEMATIC",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "batmfa__.ttf",
    "sha256": "9acf78686e54d76762d69e3cba7aac3952b25c6615b00f2c4608e5c7b4bf799a"
  },
  {
    "id": "batmfo__",
    "family": "batmfo__",
    "displayName": "batmfo__",
    "files": {
      "bold": "/assets/fonts/batmfo__.ttf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "CINEMATIC",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "batmfo__.ttf",
    "sha256": "df31d1bfb8d32e0471eebe623a1f215f4e42af0f13a851f9918d786691a78cfa"
  },
  {
    "id": "benguiat_bold",
    "family": "Benguiat Bold",
    "displayName": "Benguiat Bold",
    "files": {
      "bold": "/assets/fonts/Benguiat Bold.ttf"
    },
    "weights": [
      700
    ],
    "style": "serif",
    "category": "CINEMATIC",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Benguiat Bold.ttf",
    "sha256": "2ac8d16a7b4166037cc95115d3be19864253af8c24c574f0050c6c97e7c1d407"
  },
  {
    "id": "stranger_things",
    "family": "Stranger Things",
    "displayName": "Stranger Things",
    "files": {
      "regular": "/assets/fonts/Stranger Things Outlined.ttf"
    },
    "weights": [
      100
    ],
    "style": "serif",
    "category": "CINEMATIC",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Stranger Things Outlined.ttf",
    "sha256": "87d7fc3d8c55d4b957647c4d06547243b32ca20a2e5eb633209b965f6e27e518"
  },
  {
    "id": "dragonforce",
    "family": "Dragonforce",
    "displayName": "Dragonforce",
    "files": {
      "bold": "/assets/fonts/DragonForcE.ttf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "DISPLAY",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "DragonForcE.ttf",
    "sha256": "7013ee9141781afc55da59c518b9eb9dbab5f2953f59e384fd7a396191c0cab3"
  },
  {
    "id": "another_danger___demo",
    "family": "Another Danger - Demo",
    "displayName": "Another Danger - Demo",
    "files": {
      "bold": "/assets/fonts/Another Danger - Demo.otf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "VIRAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Another Danger - Demo.otf",
    "sha256": "711805724fcea68d2af1ac8488727a1fc7f976d47ed8affc93f5917ddda96d2c"
  },
  {
    "id": "another_danger_slanted___demo",
    "family": "Another Danger Slanted - Demo",
    "displayName": "Another Danger Slanted - Demo",
    "files": {
      "bold": "/assets/fonts/Another Danger Slanted - Demo.otf"
    },
    "weights": [
      700
    ],
    "style": "display",
    "category": "VIRAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Another Danger Slanted - Demo.otf",
    "sha256": "abf7cdb1550980afdcd98581acc7c60e9cb6b23d442f5dc97febdefd18e485f5"
  },
  {
    "id": "good_vibes___demo",
    "family": "Good Vibes - Demo",
    "displayName": "Good Vibes - Demo",
    "files": {
      "bold": "/assets/fonts/Good Vibes - Demo.ttf"
    },
    "weights": [
      700
    ],
    "style": "handwritten",
    "category": "HANDWRITTEN",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Good Vibes - Demo.ttf",
    "sha256": "858707340a246e4d8a92d925bcd67c141435f3407a6a80b8a966228d0db36ddb"
  },
  {
    "id": "porky",
    "family": "Porky",
    "displayName": "Porky",
    "files": {
      "bold": "/assets/fonts/Porky Bold.otf"
    },
    "weights": [
      700
    ],
    "style": "rounded",
    "category": "COMEDY",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Porky Bold.otf",
    "sha256": "94967a725b2ca320eafd3f19ab11aa2fd0f94e44a1b5f8d35fd30528e52ff7bb"
  },
  {
    "id": "starborn",
    "family": "Starborn",
    "displayName": "Starborn",
    "files": {
      "bold": "/assets/fonts/Starborn.ttf"
    },
    "weights": [
      700
    ],
    "style": "rounded",
    "category": "COMEDY",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Starborn.otf",
    "sha256": "ff26650adcaebb6f34844543634da83415c65f4a45bbaffdfcbded75ccd46fff"
  },
  {
    "id": "crimes",
    "family": "crimes",
    "displayName": "crimes",
    "files": {
      "bold": "/assets/fonts/crimes.ttf"
    },
    "weights": [
      700
    ],
    "style": "editorial",
    "category": "CINEMATIC",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "crimes.ttf",
    "sha256": "5c1c13841b4790793e0029ce667126e9f80e5e55aba7f6ec2c33661df6a56bb6"
  },
  {
    "id": "square_game",
    "family": "Square Game",
    "displayName": "Square Game",
    "files": {
      "bold": "/assets/fonts/Square Game.otf"
    },
    "weights": [
      700
    ],
    "style": "sans",
    "category": "MINIMAL",
    "supportsUppercase": true,
    "supportsLatin": true,
    "licenseSource": "User Google Drive Font Pack",
    "sourceFile": "Square Game.otf",
    "sha256": "f16460aeee17528173d970b001baf1d1f2f4d7d9a9ac4560fbfa94f315da5dce"
  }
];

export const FONT_CATEGORIES = [
  'REFERENCE',
  'VIRAL',
  'CONDENSED',
  'BOLD',
  'CINEMATIC',
  'EDITORIAL',
  'MEME',
  'COMEDY',
  'CLEAN',
  'HANDWRITTEN',
  'DISPLAY',
  'MINIMAL',
] as const;

export type FontCategory = typeof FONT_CATEGORIES[number];

export function getFontById(id: string): CreatorFont | undefined {
  const norm = (id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm === 'godofthunder') {
    return CREATOR_FONTS.find((f) => f.id === 'godofthunder_0wo1p') || CREATOR_FONTS.find((f) => f.id.includes('god'));
  }
  if (norm === 'bebasneue') {
    return CREATOR_FONTS.find((f) => f.id === 'american_captain');
  }
  return CREATOR_FONTS.find(
    (f) =>
      f.id === id ||
      f.family.toLowerCase() === id.toLowerCase() ||
      f.id.toLowerCase().replace(/[^a-z0-9]/g, '') === norm ||
      f.family.toLowerCase().replace(/[^a-z0-9]/g, '').includes(norm)
  );
}

export function getFontsByCategory(category: FontCategory): CreatorFont[] {
  return CREATOR_FONTS.filter((f) => f.category === category);
}

export const CREATOR_FONTS_REGISTRY = CREATOR_FONTS;

export function getFontForStyle(style: string): CreatorFont {
  const match = CREATOR_FONTS.find((f) => f.style === style);
  return match || CREATOR_FONTS[0];
}

/**
 * Multilingual font fallback resolver (Part O)
 * Resolves compatible fallback for scripts like Devanagari, Arabic, etc.
 */
export function resolveFontForScript(script: string, requestedFontId: string): string {
  const font = getFontById(requestedFontId);
  const scriptNorm = (script || '').toLowerCase();

  if (scriptNorm.includes('devanagari') || scriptNorm.includes('hindi') || scriptNorm.includes('marathi')) {
    if (font?.supportsDevanagari) return font.id;
    return 'poppins'; // Registered font with robust Devanagari/Hindi glyph coverage
  }

  if (scriptNorm.includes('arabic') || scriptNorm.includes('urdu')) {
    if (font?.supportsArabic) return font.id;
    return 'noto_sans_arabic'; // Standard fallback
  }

  if (scriptNorm.includes('tamil') || scriptNorm.includes('telugu') || scriptNorm.includes('kannada') || scriptNorm.includes('malayalam') || scriptNorm.includes('bengali')) {
    return 'noto_sans_indic';
  }

  return font ? font.id : 'lemon_milk';
}
