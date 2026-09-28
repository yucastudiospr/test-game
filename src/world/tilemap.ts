import { TILE } from '../config';
import { Tile, TILE_DEFS } from './tiles';

/** Grid de tiles del nivel. Coordenadas en tiles; (0,0) arriba a la izquierda. */
export class TileMap {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height);
  }

  get pixelWidth(): number {
    return this.width * TILE;
  }

  get pixelHeight(): number {
    return this.height * TILE;
  }

  get(tx: number, ty: number): Tile {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return Tile.Empty;
    return this.data[ty * this.width + tx] as Tile;
  }

  set(tx: number, ty: number, tile: Tile): void {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return;
    this.data[ty * this.width + tx] = tile;
  }

  /** Rellena un rectángulo de tiles (inclusive). */
  fill(tx0: number, ty0: number, tx1: number, ty1: number, tile: Tile): void {
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) this.set(x, y, tile);
  }

  /**
   * ¿Es sólido? Los bordes izquierdo y derecho del nivel son paredes;
   * arriba y abajo son aire (caer por abajo = hueco mortal).
   */
  isSolid(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.width) return true;
    if (ty < 0 || ty >= this.height) return false;
    return TILE_DEFS[this.get(tx, ty)].solid;
  }
}
