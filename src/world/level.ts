import { Tile, TILE_CHARS } from './tiles';
import { TileMap } from './tilemap';

export type Theme = 'overworld' | 'underground';

/** Definición de un nivel tal cual se escribe en su archivo. */
export interface LevelData {
  name: string;
  theme: Theme;
  time: number;
  /**
   * Filas del mapa. Tiles: ver TILE_CHARS en tiles.ts. Además:
   *  @ inicio de Jose   g goomba   k koopa   h corazón suelto
   *  C castillo (esquina inferior izquierda)   Y princesa Yazmín
   */
  rows: readonly string[];
}

export type SpawnKind = 'goomba' | 'koopa' | 'heart' | 'princess';

export interface Spawn {
  kind: SpawnKind;
  tx: number;
  ty: number;
}

export interface Level {
  name: string;
  theme: Theme;
  time: number;
  map: TileMap;
  start: { tx: number; ty: number };
  spawns: Spawn[];
  /** Asta de la bandera: columna y filas de la punta y de la base. */
  flag: { tx: number; topTy: number; baseTy: number } | null;
  castle: { tx: number; ty: number } | null;
}

const SPAWN_CHARS: Record<string, SpawnKind> = {
  g: 'goomba',
  k: 'koopa',
  h: 'heart',
  Y: 'princess',
};

export function parseLevel(data: LevelData): Level {
  const height = data.rows.length;
  const width = data.rows[0]?.length ?? 0;
  const map = new TileMap(width, height);
  const level: Level = {
    name: data.name,
    theme: data.theme,
    time: data.time,
    map,
    start: { tx: 2, ty: height - 3 },
    spawns: [],
    flag: null,
    castle: null,
  };

  data.rows.forEach((row, ty) => {
    if (row.length !== width) throw new Error(`Nivel ${data.name}: fila ${ty} mide ${row.length}, se esperaba ${width}`);
    for (let tx = 0; tx < width; tx++) {
      const ch = row[tx]!;
      const tile = TILE_CHARS[ch];
      if (tile !== undefined) {
        map.set(tx, ty, tile);
        if (tile === Tile.PoleTop) level.flag = { tx, topTy: ty, baseTy: ty };
        if (tile === Tile.Pole && level.flag?.tx === tx) level.flag.baseTy = ty;
        continue;
      }
      const kind = SPAWN_CHARS[ch];
      if (kind) level.spawns.push({ kind, tx, ty });
      else if (ch === '@') level.start = { tx, ty };
      else if (ch === 'C') level.castle = { tx, ty };
      else throw new Error(`Nivel ${data.name}: carácter desconocido '${ch}' en (${tx},${ty})`);
    }
  });

  return level;
}
