import { SCREEN_W, TILE } from '../config';
import type { Level, Theme } from '../world/level';
import { Tile } from '../world/tiles';
import type { Sprite, SpriteSheet } from './sprites';

/** Secuencia de brillo del bloque "?" (índices de PAL.qShimmer), como el parpadeo del original. */
const SHIMMER = [0, 0, 0, 1, 2, 1];
const SHIMMER_STEP = 0.14;

type TileArt = Partial<Record<Tile, Sprite>>;

export class WorldRenderer {
  private readonly art: Record<Theme, TileArt>;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly s: SpriteSheet,
  ) {
    const common: TileArt = {
      [Tile.Ground]: s.ground,
      [Tile.Brick]: s.brick,
      [Tile.Hard]: s.hard,
      [Tile.Used]: s.used,
      [Tile.PipeTopL]: s.pipeTopL,
      [Tile.PipeTopR]: s.pipeTopR,
      [Tile.PipeL]: s.pipeL,
      [Tile.PipeR]: s.pipeR,
      [Tile.Pole]: s.pole,
      [Tile.PoleTop]: s.poleTop,
    };
    this.art = {
      overworld: common,
      underground: { ...common, [Tile.Ground]: s.underground.ground, [Tile.Brick]: s.underground.brick },
    };
  }

  /**
   * Dibuja solo las columnas de tiles visibles. `time` anima los bloques "?";
   * `bumpOffset` devuelve cuánto sube un bloque que acaba de ser golpeado.
   */
  drawTiles(level: Level, camX: number, time: number, bumpOffset: (tx: number, ty: number) => number): void {
    const { map } = level;
    const art = this.art[level.theme];
    const qFrame = this.s.qBlock[SHIMMER[Math.floor(time / SHIMMER_STEP) % SHIMMER.length]!]!;
    const tx0 = Math.max(0, Math.floor(camX / TILE));
    const tx1 = Math.min(map.width - 1, Math.floor((camX + SCREEN_W) / TILE));
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = map.get(tx, ty);
        const img = t === Tile.QHeart || t === Tile.QMushroom ? qFrame : art[t];
        if (img) this.ctx.drawImage(img, tx * TILE - camX, ty * TILE - bumpOffset(tx, ty));
      }
    }
  }

  /** Bandera colgando a la izquierda del asta. `flagY` (px de mundo) permite bajarla en la fase 6. */
  drawFlag(level: Level, camX: number, flagY?: number): void {
    if (!level.flag) return;
    const x = level.flag.tx * TILE - camX - 8;
    const y = flagY ?? (level.flag.topTy + 1) * TILE;
    if (x > SCREEN_W || x + 16 < 0) return;
    this.ctx.drawImage(this.s.flag, x, y);
  }

  /** El castillo va delante de Jose: así "entra" por la puerta al final del nivel. */
  drawCastle(level: Level, camX: number): void {
    if (!level.castle) return;
    const img = this.s.castle;
    const x = level.castle.tx * TILE - camX;
    const y = (level.castle.ty + 1) * TILE - img.height;
    if (x > SCREEN_W || x + img.width < 0) return;
    this.ctx.drawImage(img, x, y);
  }
}
