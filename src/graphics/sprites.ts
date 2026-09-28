import { TILE } from '../config';
import { PAL } from './palette';

export type Sprite = HTMLCanvasElement;

function newCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  return [c, ctx];
}

/**
 * Convierte un dibujo en texto a un sprite. Cada carácter es un píxel;
 * `.` es transparente y el resto se busca en `colors`.
 */
export function makeSprite(rows: readonly string[], colors: Record<string, string>): Sprite {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const [c, ctx] = newCanvas(w, h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Sprite: fila ${y} mide ${row.length}, se esperaba ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const color = colors[ch];
      if (!color) throw new Error(`Sprite: color '${ch}' sin definir`);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

/** Devuelve una copia del sprite volteada horizontalmente. */
export function flipX(src: Sprite): Sprite {
  const [c, ctx] = newCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Devuelve una copia del sprite volteada verticalmente (enemigos derrotados). */
export function flipY(src: Sprite): Sprite {
  const [c, ctx] = newCanvas(src.width, src.height);
  ctx.translate(0, src.height);
  ctx.scale(1, -1);
  ctx.drawImage(src, 0, 0);
  return c;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Figura "blob" pixelada (nubes, colinas, arbustos): unión de círculos
 * con contorno de 1 px y una sombra en la parte inferior.
 */
export function makeBlob(
  w: number,
  h: number,
  circles: readonly Circle[],
  fill: string,
  shade: string,
  outline: string,
  shadeFrom = 0.65,
): Sprite {
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && circles.some((c) => (x + 0.5 - c.x) ** 2 + (y + 0.5 - c.y) ** 2 <= c.r * c.r);
  const [c, ctx] = newCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      ctx.fillStyle = edge ? outline : y > h * shadeFrom ? shade : fill;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Bloque de suelo coral con biselado claro/oscuro y grietas. */
interface GroundColors {
  base: string;
  light: string;
  dark: string;
}

interface BrickColors {
  base: string;
  light: string;
  mortar: string;
}

function makeGroundTile(c: GroundColors): Sprite {
  const [out, ctx] = newCanvas(TILE, TILE);
  ctx.fillStyle = c.base;
  ctx.fillRect(0, 0, TILE, TILE);
  // Biselado
  ctx.fillStyle = c.light;
  ctx.fillRect(0, 0, TILE, 1);
  ctx.fillRect(0, 0, 1, TILE);
  ctx.fillStyle = c.dark;
  ctx.fillRect(0, TILE - 1, TILE, 1);
  ctx.fillRect(TILE - 1, 0, 1, TILE);
  // Grietas en forma de piedra
  ctx.fillRect(9, 1, 1, 6);
  ctx.fillRect(1, 7, 8, 1);
  ctx.fillRect(9, 7, 6, 1);
  ctx.fillRect(4, 8, 1, 7);
  ctx.fillRect(11, 11, 4, 1);
  ctx.fillStyle = c.light;
  ctx.fillRect(10, 1, 1, 5);
  ctx.fillRect(1, 8, 3, 1);
  ctx.fillRect(5, 8, 1, 6);
  return out;
}

/** Ladrillo coral (se podrá romper en la fase 4). */
function makeBrickTile(c: BrickColors): Sprite {
  const [out, ctx] = newCanvas(TILE, TILE);
  ctx.fillStyle = c.base;
  ctx.fillRect(0, 0, TILE, TILE);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    // brillo en la parte superior de cada hilera
    ctx.fillStyle = c.light;
    ctx.fillRect(0, y, TILE, 1);
    // mortero horizontal
    ctx.fillStyle = c.mortar;
    ctx.fillRect(0, y + 3, TILE, 1);
    // juntas verticales alternadas
    const offs = row % 2 === 0 ? [7, 15] : [3, 11];
    for (const x of offs) ctx.fillRect(x, y, 1, 3);
  }
  return out;
}

/** Bloque duro rosado biselado (escaleras y paredes). */
function makeHardTile(): Sprite {
  const [c, ctx] = newCanvas(TILE, TILE);
  ctx.fillStyle = PAL.hard;
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = PAL.hardLight;
  ctx.fillRect(0, 0, TILE - 1, 1);
  ctx.fillRect(0, 0, 1, TILE - 1);
  ctx.fillRect(1, 1, TILE - 3, 1);
  ctx.fillRect(1, 1, 1, TILE - 3);
  ctx.fillStyle = PAL.hardDark;
  ctx.fillRect(1, TILE - 1, TILE - 1, 1);
  ctx.fillRect(TILE - 1, 1, 1, TILE - 1);
  ctx.fillRect(2, TILE - 2, TILE - 3, 1);
  ctx.fillRect(TILE - 2, 2, 1, TILE - 3);
  return c;
}

/** Bloque "?" en uno de sus 3 tonos de brillo. */
const Q_BLOCK = [
  'LLLLLLLLLLLLLLLD',
  'LPPPPPPPPPPPPPPD',
  'LPdPPPPPPPPPPdPD',
  'LPPPPQQQQQPPPPPD',
  'LPPPQQKKKQQKPPPD',
  'LPPPQQKPPQQKPPPD',
  'LPPPPKKPQQQKPPPD',
  'LPPPPPPQQKKKPPPD',
  'LPPPPPPQQKPPPPPD',
  'LPPPPPPPKKPPPPPD',
  'LPPPPPPQQPPPPPPD',
  'LPPPPPPQQKPPPPPD',
  'LPPPPPPPKKPPPPPD',
  'LPdPPPPPPPPPPdPD',
  'LPPPPPPPPPPPPPPD',
  'DDDDDDDDDDDDDDDD',
];

function makeQBlock(base: string): Sprite {
  return makeSprite(Q_BLOCK, { L: PAL.qLight, P: base, D: PAL.qDark, d: PAL.qDark, Q: PAL.qGlyph, K: PAL.qDark });
}

/** Bloque ya golpeado: liso con remaches. */
function makeUsedBlock(): Sprite {
  const rows = Q_BLOCK.map((r) => r.replace(/[QK]/g, 'P'));
  return makeSprite(rows, { L: PAL.usedLight, P: PAL.used, D: PAL.usedDark, d: PAL.usedDark });
}

/** Color de una columna del tubo según su posición (luz a la izquierda, sombra a la derecha). */
function pipeShade(x: number, w: number): string {
  if (x === 0 || x === w - 1) return PAL.pipeOutline;
  const t = x / w;
  if (t < 0.12) return PAL.pipe;
  if (t < 0.2) return PAL.pipeShine;
  if (t < 0.3) return PAL.pipeLight;
  if (t < 0.62) return PAL.pipe;
  if (t < 0.7) return PAL.pipeLight;
  return PAL.pipeDark;
}

/** Tubo en 4 piezas de 16×16: boca izquierda/derecha y cuerpo izquierdo/derecho. */
function makePipeParts(): { topL: Sprite; topR: Sprite; bodyL: Sprite; bodyR: Sprite } {
  const [top, tctx] = newCanvas(32, 16);
  for (let x = 0; x < 32; x++) {
    tctx.fillStyle = pipeShade(x, 32);
    tctx.fillRect(x, 1, 1, 14);
  }
  tctx.fillStyle = PAL.pipeOutline;
  tctx.fillRect(0, 0, 32, 1);
  tctx.fillRect(0, 15, 32, 1);

  const [body, bctx] = newCanvas(32, 16);
  for (let x = 2; x < 30; x++) {
    bctx.fillStyle = pipeShade(x - 2, 28);
    bctx.fillRect(x, 0, 1, 16);
  }

  const half = (src: Sprite, sx: number): Sprite => {
    const [c, ctx] = newCanvas(16, 16);
    ctx.drawImage(src, sx, 0, 16, 16, 0, 0, 16, 16);
    return c;
  };
  return { topL: half(top, 0), topR: half(top, 16), bodyL: half(body, 0), bodyR: half(body, 16) };
}

function makePole(): Sprite {
  const [c, ctx] = newCanvas(TILE, TILE);
  ctx.fillStyle = PAL.poleEdge;
  ctx.fillRect(6, 0, 4, TILE);
  ctx.fillStyle = PAL.pole;
  ctx.fillRect(7, 0, 2, TILE);
  return c;
}

function makePoleTop(): Sprite {
  const [c, ctx] = newCanvas(TILE, TILE);
  ctx.drawImage(makePole(), 0, 8);
  const ball = makeBlob(8, 8, [{ x: 4, y: 4, r: 4 }], PAL.poleBall, PAL.poleBall, PAL.poleEdge);
  ctx.drawImage(ball, 4, 4);
  ctx.fillStyle = PAL.pinkLight;
  ctx.fillRect(6, 5, 1, 1);
  return c;
}

/** Bandera triangular blanca con un corazón, cuelga a la izquierda del asta. */
const FLAG = [
  'OOOOOOOOOOOOOOOO',
  '.OWWWWWWWWWWWWWO',
  '..OWWHHWHHWWWWWO',
  '...OWHHHHHWWWWWO',
  '....OWHHHWWWWWWO',
  '.....OWHWWWWWWWO',
  '......OWWWWWWWWO',
  '.......OWWWWWWWO',
  '........OWWWWWWO',
  '.........OWWWWWO',
  '..........OWWWWO',
  '...........OWWWO',
  '............OWWO',
  '.............OWO',
  '..............OO',
  '...............O',
];

/** Castillo rosado de 80×80 px (5×5 tiles). */
function makeCastle(): Sprite {
  const W = 80;
  const [c, ctx] = newCanvas(W, 80);

  const bricks = (x0: number, y0: number, w: number, h: number) => {
    ctx.fillStyle = PAL.castle;
    ctx.fillRect(x0, y0, w, h);
    for (let y = y0; y < y0 + h; y += 4) {
      ctx.fillStyle = PAL.castleLight;
      ctx.fillRect(x0, y, w, 1);
      ctx.fillStyle = PAL.castleMortar;
      ctx.fillRect(x0, y + 3, w, 1);
      const off = ((y - y0) / 4) % 2 === 0 ? 0 : 4;
      for (let x = x0 + off + 7; x < x0 + w; x += 8) ctx.fillRect(x, y, 1, 3);
    }
  };
  const merlons = (x0: number, y0: number, w: number) => {
    for (let x = x0; x < x0 + w; x += 16) bricks(x, y0, 8, 8);
  };
  const dark = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = PAL.castleDark;
    ctx.fillRect(x, y, w, h);
  };

  // Torre superior
  merlons(16, 0, 48);
  bricks(16, 8, 48, 32);
  dark(24, 16, 6, 12);
  dark(50, 16, 6, 12);
  // Cuerpo inferior
  merlons(0, 32, W);
  bricks(0, 40, W, 40);
  // Puerta con arco
  dark(32, 56, 16, 24);
  dark(34, 54, 12, 2);
  dark(36, 52, 8, 2);
  return c;
}

/** Jose chico derrotado: de frente, sorprendido. */
const JOSE_DEAD = [
  '....RRRRRRRR....',
  '...RRRRWWRRRR...',
  '..RRRRRRRRRRRR..',
  '..HHSSSSSSSSHH..',
  'S.HSSKSSSSKSSH.S',
  'SSHSSKSSSSKSSHSS',
  'SS.SSSSSSSSSS.SS',
  '.S.SSSSKKSSSS.S.',
  '.RR.SSSKKSSS.RR.',
  '..RRRSSSSSSRRR..',
  '...RRBBBBBBRR...',
  '...RBYBBBBYBR...',
  '...BBBBBBBBBB...',
  '...BBBB..BBBB...',
  '..OOOO....OOOO..',
  '..OOO......OOO..',
];

/** Goomba: el cuerpo es simétrico y solo las patas cambian al voltearlo (así camina, como en el NES). */
const GOOMBA = [
  '......NNNN......',
  '....NNNNNNNN....',
  '...NNNNNNNNNN...',
  '..NNKKNNNNKKNN..',
  '.NNNNKKNNKKNNNN.',
  '.NNNWKWNNWKWNNN.',
  'NNNNWKWNNWKWNNNN',
  'NNNNWWWNNWWWNNNN',
  'NNNNNNNNNNNNNNNN',
  '.NNNNCCCCCCNNNN.',
  '....CCCCCCCC....',
  '....CCCCCCCC....',
  '..FFFCCCCCC.....',
  '.FFFFFCCCCFFF...',
  '.FFFFFF..FFFFF..',
  '..FFFF....FFF...',
];

const GOOMBA_FLAT = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....NNNNNNNN....',
  '..NNKKNNNNKKNN..',
  '.NNNWWKNNKWWNNN.',
  'NNNNNNNNNNNNNNNN',
  '.NNNNCCCCCCNNNN.',
  '...CCCCCCCCCC...',
  '.FFFFF....FFFFF.',
  'FFFFFF....FFFFFF',
];

/** Koopa mirando a la izquierda (24 px de alto). */
const KOOPA_TOP = [
  '................',
  '................',
  '..YYY...........',
  '.YYYYY..........',
  '.YKYYY..........',
  '.YKYYY..........',
  'YYYYYY..........',
  'YYYYYY..........',
  '.YYYYY..........',
  '..YYYY..........',
  '...YYY.DDDD.....',
  '...YYYDGGGGD....',
  '...YYDGGWGGGD...',
  '....DGGWGWGGGD..',
  '....DGWGGGWGGD..',
  '...YDGGWGWGGGDD.',
  '..YYDGGGWGGGGDD.',
  '..YYDWGGGGGGWD..',
  '...YDWWWWWWWWD..',
  '....WWWWWWWWW...',
];

const KOOPA_LEGS = [
  [
    '.....YYY.YYY....',
    '....YYYY.YYYY...',
    '....OOO...OOO...',
    '...OOOO..OOOO...',
  ],
  [
    '......YYYYY.....',
    '.....YYYYYY.....',
    '.....OOOOOO.....',
    '....OOOO.OOO....',
  ],
];

const SHELL = [
  '................',
  '................',
  '................',
  '................',
  '.....DDDDDD.....',
  '...DDGGGGGGDD...',
  '..DGGGWGGWGGGD..',
  '.DGGGWGGGGWGGGD.',
  '.DGGWGGGGGGWGGD.',
  'DGGGWGGGGGGWGGGD',
  'DGGGGWGGGGWGGGGD',
  'DWGGGGWWWWGGGGWD',
  'DWWGGGGGGGGGGWWD',
  '.DWWWWWWWWWWWWD.',
  '..DWWWWWWWWWWD..',
  '...DDDDDDDDDD...',
];

/** Princesa Yazmín (16×24) mirando a la izquierda: corona dorada, pelo largo rojo, piel blanca y vestido rosado. */
const YAZMIN = [
  '.....Y.Y.Y......',
  '.....YJYJY......',
  '.....YYYYY......',
  '....HHHHHHH.....',
  '...HHHHHHHHH....',
  '...SSSSHHHHHH...',
  '..SKSSSSHHHHH...',
  '..SKSSSSSHHHHH..',
  '..SSSSSSSHHHHH..',
  '...MSSSSSHHHHH..',
  '....SSSSHHHHHH..',
  '....LPPPLHHHHH..',
  '...LPPPPPLHHH...',
  '..SSPPLPPPSS....',
  '..SSPPPPPPSS....',
  '....PPPPPPP.....',
  '...PPLPPPPPP....',
  '...PPPPPLPPP....',
  '..PPLPPPPPPPP...',
  '..PPPPPPLPPPP...',
  '.PPPPLPPPPPPPP..',
  '.PDDDDDDDDDDDP..',
  '..DDDDDDDDDDD...',
  '...OO....OO.....',
];

const MINI_HEART = ['.HH.HH.', 'HWHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];

const JOSE_COLORS = {
  R: PAL.joseRed,
  B: PAL.joseBlue,
  S: PAL.joseSkin,
  H: PAL.joseHair,
  O: PAL.joseShoes,
  K: PAL.black,
  W: PAL.white,
  Y: '#ffd23f',
};

/**
 * Jose chico (16×16) mirando a la derecha. Diseño original: gorra con insignia,
 * cabeza grande y overol. La cabeza es común a todos los frames; cambia el cuerpo.
 */
const JOSE_HEAD = [
  '....RRRRRR......',
  '...RRRRRRRRR....',
  '..RRRWWRRRRRRR..',
  '..RRRRRRRRRRRRR.',
  '..HHSSSSSSS.....',
  '.HHSSSSSKSS.....',
  '.HSSSSSSKSSS....',
  '.HHSSSSSSSSS....',
  '..HSSSSSKKK.....',
  '...SSSSSSSS.....',
];

const JOSE_BODIES = {
  idle: [
    '..RRBBBBBBRR....',
    '.SRRBYBBYBRRS...',
    '.SSRBBBBBBRSS...',
    '...BBBBBBBB.....',
    '...BBB..BBB.....',
    '..OOOO..OOOO....',
  ],
  walk0: [
    '..RRBBBBBBRR....',
    '.SRRBYBBYBRRS...',
    '..SRBBBBBBRS....',
    '..BBBBBBBBBB....',
    '.BBB......BBB...',
    'OOOO......OOOO..',
  ],
  walk1: [
    '...RBBBBBBR.....',
    '..SRBYBBYBRS....',
    '..SSBBBBBBSS....',
    '...BBBBBBBB.....',
    '....BBBBBB......',
    '....OOOOOOO.....',
  ],
  walk2: [
    '..RRBBBBBBRR....',
    '.SRRBYBBYBRRS...',
    '.SSRBBBBBBRSS...',
    '...BBBBBBBBB....',
    '..BBB...BBBB....',
    '.OOOO....OOOO...',
  ],
  skid: [
    '...RRBBBBBBRR...',
    '..SRRBYBBYBRS...',
    '..SSBBBBBBBSS...',
    '....BBBBBBBB....',
    '.....BBB.BBB....',
    '...OOOO.OOOO....',
  ],
  jump: [
    '..RRBBBBBBRRSS..',
    '.SRRBYBBYBRRSS..',
    '.SS.BBBBBBR.....',
    '...BBBBBBBBB....',
    '..BBB....BBBOO..',
    '.OOO......OOO...',
  ],
} as const;

export type JoseFrame = keyof typeof JOSE_BODIES;

const HEART = [
  '................',
  '..OOOO....OOOO..',
  '.OHHHHO..OHHHHO.',
  'OHWWHHHOOHHHHHHO',
  'OHWHHHHHHHHHHHHO',
  'OHHHHHHHHHHHHHHO',
  'OHHHHHHHHHHHHHHO',
  '.OHHHHHHHHHHHHO.',
  '..OHHHHHHHHHHO..',
  '...OHHHHHHHHO...',
  '....OHHHHHHO....',
  '.....OHHHHO.....',
  '......OHHO......',
  '.......OO.......',
  '................',
  '................',
];

const MUSHROOM = [
  '................',
  '.....OOOOOO.....',
  '...OOPPWWPPOO...',
  '..OPPPWWWWPPPO..',
  '.OPPPPPWWPPPPPO.',
  '.OWWPPPPPPPPWWO.',
  'OWWWWPPPPPPWWWWO',
  'OWWWWPPPPPPWWWWO',
  'OPWWPPPPPPPPWWPO',
  'OPPPPPPPPPPPPPPO',
  'OOOCCCCCCCCCCOOO',
  '..OCCKCCCCKCCO..',
  '..OCCKCCCCKCCO..',
  '..OCCCCCCCCCCO..',
  '...OCCCCCCCCO...',
  '....OOOOOOOO....',
];

const DEBRIS = [
  '..OOOO..',
  '.OLLLLO.',
  'OLPPPPDO',
  'OLPPPPDO',
  'OLPPPPDO',
  'OLPPPPDO',
  '.ODDDDO.',
  '..OOOO..',
];

/** Jose grande (16×32): cabeza + torso + piernas, combinados por frame. */
const JOSE_BIG_HEAD = [
  '.....RRRRRR.....',
  '...RRRRRRRRRR...',
  '..RRRRWWRRRRRR..',
  '..RRRWWWWRRRRRRR',
  '..RRRRWWRRRRRRRR',
  '..RRRRRRRRRRRRR.',
  '..HHHSSSSSSS....',
  '.HHHSSSSSKSSS...',
  '.HHSSSSSSKSSSS..',
  '.HHSSSSSSKSSSS..',
  '.HHHSSSSSSSSSS..',
  '..HHSSSSSKKKK...',
  '...HSSSSSSSSS...',
  '....SSSSSSSS....',
];

const JOSE_BIG_TORSO = [
  '....RRBBRRR.....',
  '..RRRRBBRRRRR...',
  '.RRRRRBBBRRRRR..',
  '.RRRRBBBBBRRRR..',
  'SSRRBYBBBYBRRSS.',
  'SSSRBBBBBBBRSSS.',
  'SSSBBBBBBBBBSSS.',
  '.SBBBBBBBBBBBS..',
  '..BBBBBBBBBBB...',
  '..BBBBBBBBBBB...',
];

/** Torso del salto: brazo delantero en alto. */
const JOSE_BIG_TORSO_JUMP = [
  '....RRBBRRR.SSS.',
  '..RRRRBBRRRRSSS.',
  '.RRRRRBBBRRRRS..',
  '.RRRRBBBBBRRRR..',
  'SSRRBYBBBYBRR...',
  'SSSRBBBBBBBR....',
  'SSSBBBBBBBBB....',
  '.SBBBBBBBBBBB...',
  '..BBBBBBBBBBB...',
  '..BBBBBBBBBBB...',
];

/** Cuerpo de Jose grande agachado (debajo de la cabeza, 22 px en total). */
const JOSE_BIG_CROUCH = [
  '...RRRBBRRRR....',
  '.SRRRBBBBBRRRS..',
  'SSRRBYBBBYBRRSS.',
  'SSBBBBBBBBBBBSS.',
  '.BBBBBBBBBBBBB..',
  'OOOOBBBBBBBOOOO.',
  'OOOOO.....OOOOO.',
  '.OOO.......OOO..',
];

const JOSE_BIG_LEGS: Record<JoseFrame, readonly string[]> = {
  idle: [
    '..BBBBB.BBBBB...',
    '..BBBB...BBBB...',
    '..BBBB...BBBB...',
    '..BBB.....BBB...',
    '..BBB.....BBB...',
    '.OOOO.....OOOO..',
    'OOOOO.....OOOOO.',
    'OOOOO.....OOOOO.',
  ],
  walk0: [
    '..BBBBBBBBBBB...',
    '.BBBBB...BBBBB..',
    'BBBBB.....BBBBB.',
    'BBBB.......BBBB.',
    'BBB.........BBB.',
    'OOOO.......OOOO.',
    'OOOO........OOOO',
    '.OOO........OOO.',
  ],
  walk1: [
    '...BBBBBBBBB....',
    '....BBBBBBB.....',
    '....BBBBBBB.....',
    '....BBB.BBB.....',
    '....BBB.BBB.....',
    '...OOOO.OOOO....',
    '...OOOO.OOOOO...',
    '....OOO..OOOO...',
  ],
  walk2: [
    '..BBBBBBBBBB....',
    '..BBBBB.BBBBB...',
    '.BBBBB...BBBB...',
    '.BBBB.....BBB...',
    '.BBB......BBB...',
    'OOOO......OOOO..',
    'OOOO......OOOOO.',
    '.OO........OOO..',
  ],
  skid: [
    '...BBBBBBBBBB...',
    '....BBBB.BBBBB..',
    '....BBB...BBBB..',
    '...BBB.....BBB..',
    '..BBB......BBB..',
    '.OOOO.....OOOO..',
    'OOOOO.....OOOOO.',
    '.OOO.......OOO..',
  ],
  jump: [
    '..BBBBBBBBBBB...',
    '..BBBBB..BBBBOO.',
    '.BBBBB....BBBOOO',
    'BBBBB......BOOO.',
    'BBBB............',
    'OOOO............',
    'OOOOO...........',
    '.OOO............',
  ],
};

/** Par de sprites: mirando a la derecha y a la izquierda. */
export interface Facing {
  r: Sprite;
  l: Sprite;
}

function facing(sprite: Sprite): Facing {
  return { r: sprite, l: flipX(sprite) };
}

/** Tiles que cambian según el tema del nivel. */
export interface ThemeTiles {
  ground: Sprite;
  brick: Sprite;
}

export interface SpriteSheet {
  ground: Sprite;
  brick: Sprite;
  underground: ThemeTiles;
  /** Yazmín: normal y parpadeando. */
  yazmin: [Sprite, Sprite];
  miniHeart: Sprite;
  hard: Sprite;
  qBlock: Sprite[];
  used: Sprite;
  pipeTopL: Sprite;
  pipeTopR: Sprite;
  pipeL: Sprite;
  pipeR: Sprite;
  pole: Sprite;
  poleTop: Sprite;
  flag: Sprite;
  castle: Sprite;
  jose: Record<JoseFrame, Facing>;
  joseBig: Record<JoseFrame, Facing>;
  joseBigCrouch: Facing;
  joseDead: Sprite;
  heart: Sprite[];
  mushroom: Sprite;
  debris: Sprite;
  /** Dos frames de caminar. */
  goomba: [Sprite, Sprite];
  goombaFlat: Sprite;
  goombaDead: Sprite;
  /** Dos frames de caminar por dirección. */
  koopa: { l: [Sprite, Sprite]; r: [Sprite, Sprite] };
  shell: Sprite;
  shellDead: Sprite;
  cloudSmall: Sprite;
  cloudBig: Sprite;
  hillBig: Sprite;
  hillSmall: Sprite;
  bush: Sprite;
}

/** Genera todos los sprites una sola vez al arrancar. */
export function buildSprites(): SpriteSheet {
  const jose = {} as Record<JoseFrame, Facing>;
  for (const [frame, body] of Object.entries(JOSE_BODIES) as [JoseFrame, readonly string[]][]) {
    jose[frame] = facing(makeSprite([...JOSE_HEAD, ...body], JOSE_COLORS));
  }
  const joseBig = {} as Record<JoseFrame, Facing>;
  for (const [frame, legs] of Object.entries(JOSE_BIG_LEGS) as [JoseFrame, readonly string[]][]) {
    const torso = frame === 'jump' ? JOSE_BIG_TORSO_JUMP : JOSE_BIG_TORSO;
    joseBig[frame] = facing(makeSprite([...JOSE_BIG_HEAD, ...torso, ...legs], JOSE_COLORS));
  }
  const pipe = makePipeParts();
  const yazColors = {
    Y: PAL.yazCrown,
    J: PAL.yazJewel,
    H: PAL.yazHair,
    S: PAL.yazSkin,
    K: PAL.black,
    M: PAL.yazDressDark,
    P: PAL.yazDress,
    L: PAL.yazDressLight,
    D: PAL.yazDressDark,
    O: PAL.yazDressDark,
  };
  const goombaColors = { N: PAL.goomba, K: PAL.goombaDark, W: PAL.white, C: PAL.goombaFace, F: PAL.goombaDark };
  const goomba = makeSprite(GOOMBA, goombaColors);
  const koopaColors = {
    Y: PAL.koopaSkin,
    K: PAL.black,
    D: PAL.koopaShellDark,
    G: PAL.koopaShell,
    W: PAL.white,
    O: PAL.koopaFeet,
  };
  const koopaL = KOOPA_LEGS.map((legs) => makeSprite([...KOOPA_TOP, ...legs], koopaColors)) as [Sprite, Sprite];
  const shell = makeSprite(SHELL, koopaColors);
  return {
    ground: makeGroundTile({ base: PAL.ground, light: PAL.groundLight, dark: PAL.groundDark }),
    brick: makeBrickTile({ base: PAL.brick, light: PAL.brickLight, mortar: PAL.mortar }),
    underground: {
      ground: makeGroundTile({ base: PAL.underGround, light: PAL.underGroundLight, dark: PAL.underGroundDark }),
      brick: makeBrickTile({ base: PAL.underBrick, light: PAL.underBrickLight, mortar: PAL.underMortar }),
    },
    yazmin: [makeSprite(YAZMIN, yazColors), makeSprite(YAZMIN.map((r) => r.replace(/K/g, 'S')), yazColors)],
    miniHeart: makeSprite(MINI_HEART, { H: PAL.flagHeart, W: PAL.heartShine }),
    hard: makeHardTile(),
    qBlock: PAL.qShimmer.map(makeQBlock),
    used: makeUsedBlock(),
    pipeTopL: pipe.topL,
    pipeTopR: pipe.topR,
    pipeL: pipe.bodyL,
    pipeR: pipe.bodyR,
    pole: makePole(),
    poleTop: makePoleTop(),
    flag: makeSprite(FLAG, { O: PAL.poleEdge, W: PAL.flag, H: PAL.flagHeart }),
    castle: makeCastle(),
    jose,
    joseBig,
    joseBigCrouch: facing(makeSprite([...JOSE_BIG_HEAD, ...JOSE_BIG_CROUCH], JOSE_COLORS)),
    heart: PAL.heart.map((h) => makeSprite(HEART, { O: PAL.heartOutline, H: h, W: PAL.heartShine })),
    mushroom: makeSprite(MUSHROOM, {
      O: PAL.mushroomOutline,
      P: PAL.mushroomCap,
      W: PAL.mushroomSpot,
      C: PAL.mushroomStem,
      K: PAL.black,
    }),
    joseDead: makeSprite(JOSE_DEAD, JOSE_COLORS),
    goomba: [goomba, flipX(goomba)],
    goombaFlat: makeSprite(GOOMBA_FLAT, goombaColors),
    goombaDead: flipY(goomba),
    koopa: { l: koopaL, r: [flipX(koopaL[0]), flipX(koopaL[1])] },
    shell,
    shellDead: flipY(shell),
    debris: makeSprite(DEBRIS, { O: PAL.mortar, L: PAL.brickLight, P: PAL.brick, D: PAL.groundDark }),
    cloudSmall: makeBlob(
      32,
      20,
      [
        { x: 10, y: 12, r: 7 },
        { x: 17, y: 8, r: 8 },
        { x: 24, y: 12, r: 7 },
      ],
      PAL.cloud,
      PAL.cloudShade,
      PAL.cloudOutline,
    ),
    cloudBig: makeBlob(
      56,
      22,
      [
        { x: 10, y: 14, r: 7 },
        { x: 20, y: 9, r: 9 },
        { x: 32, y: 8, r: 9 },
        { x: 44, y: 13, r: 8 },
      ],
      PAL.cloud,
      PAL.cloudShade,
      PAL.cloudOutline,
    ),
    hillBig: makeBlob(80, 36, [{ x: 40, y: 40, r: 38 }], PAL.hill, PAL.hill, PAL.hillOutline),
    hillSmall: makeBlob(48, 20, [{ x: 24, y: 26, r: 23 }], PAL.hill, PAL.hill, PAL.hillOutline),
    bush: makeBlob(
      48,
      16,
      [
        { x: 10, y: 14, r: 8 },
        { x: 24, y: 11, r: 10 },
        { x: 38, y: 14, r: 8 },
      ],
      PAL.bush,
      PAL.hillDark,
      PAL.hillOutline,
      0.75,
    ),
  };
}
