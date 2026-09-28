/** Tipos de tile. 0 siempre es vacío. */
export const Tile = {
  Empty: 0,
  Ground: 1,
  Brick: 2,
  Hard: 3,
  /** Bloque "?" que suelta un corazón. */
  QHeart: 4,
  /** Bloque "?" que suelta el hongo rosado. */
  QMushroom: 5,
  /** Bloque ya golpeado. */
  Used: 6,
  PipeTopL: 7,
  PipeTopR: 8,
  PipeL: 9,
  PipeR: 10,
  Pole: 11,
  PoleTop: 12,
} as const;

export type Tile = (typeof Tile)[keyof typeof Tile];

interface TileDef {
  solid: boolean;
  /** Se puede golpear desde abajo (fase 4). */
  bumpable?: boolean;
}

export const TILE_DEFS: Record<Tile, TileDef> = {
  [Tile.Empty]: { solid: false },
  [Tile.Ground]: { solid: true },
  [Tile.Brick]: { solid: true, bumpable: true },
  [Tile.Hard]: { solid: true },
  [Tile.QHeart]: { solid: true, bumpable: true },
  [Tile.QMushroom]: { solid: true, bumpable: true },
  [Tile.Used]: { solid: true },
  [Tile.PipeTopL]: { solid: true },
  [Tile.PipeTopR]: { solid: true },
  [Tile.PipeL]: { solid: true },
  [Tile.PipeR]: { solid: true },
  [Tile.Pole]: { solid: false },
  [Tile.PoleTop]: { solid: false },
};

/** Leyenda de los niveles en texto. */
export const TILE_CHARS: Record<string, Tile> = {
  '.': Tile.Empty,
  '#': Tile.Ground,
  B: Tile.Brick,
  S: Tile.Hard,
  '?': Tile.QHeart,
  M: Tile.QMushroom,
  U: Tile.Used,
  '(': Tile.PipeTopL,
  ')': Tile.PipeTopR,
  '[': Tile.PipeL,
  ']': Tile.PipeR,
  '|': Tile.Pole,
  F: Tile.PoleTop,
};
