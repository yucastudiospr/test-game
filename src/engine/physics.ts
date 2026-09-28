import { TILE } from '../config';
import type { TileMap } from '../world/tilemap';

/** Cuerpo físico: caja AABB (x,y = esquina superior izquierda) con velocidad en px/s. */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export interface CollisionResult {
  left: boolean;
  right: boolean;
  ceiling: boolean;
  ground: boolean;
  /** Tile golpeado con la cabeza (para romper bloques / sacar corazones en la fase 4). */
  ceilingTile: { tx: number; ty: number } | null;
}

const EPS = 0.001;
/** Si la cabeza roza una esquina por ≤ este margen, se desliza a un lado en vez de chocar. */
const CORNER_SLIDE = 5;

/**
 * Mueve el cuerpo resolviendo colisiones contra el tilemap, primero en X y luego en Y.
 * Las velocidades máximas son < 1 tile por tick, así que basta revisar la fila/columna vecina.
 */
export function moveAndCollide(b: Body, map: TileMap, dt: number, cornerSlide = false): CollisionResult {
  const res: CollisionResult = { left: false, right: false, ceiling: false, ground: false, ceilingTile: null };

  // ---- Eje X ----
  b.x += b.vx * dt;
  const ty0 = Math.floor(b.y / TILE);
  const ty1 = Math.floor((b.y + b.h - EPS) / TILE);
  if (b.vx > 0) {
    const tx = Math.floor((b.x + b.w - EPS) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (map.isSolid(tx, ty)) {
        b.x = tx * TILE - b.w;
        b.vx = 0;
        res.right = true;
        break;
      }
    }
  } else if (b.vx < 0) {
    const tx = Math.floor(b.x / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (map.isSolid(tx, ty)) {
        b.x = (tx + 1) * TILE;
        b.vx = 0;
        res.left = true;
        break;
      }
    }
  }

  // ---- Eje Y ----
  b.y += b.vy * dt;
  const tx0 = Math.floor(b.x / TILE);
  const tx1 = Math.floor((b.x + b.w - EPS) / TILE);
  if (b.vy > 0) {
    const ty = Math.floor((b.y + b.h - EPS) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (map.isSolid(tx, ty)) {
        b.y = ty * TILE - b.h;
        b.vy = 0;
        res.ground = true;
        break;
      }
    }
  } else if (b.vy < 0) {
    const ty = Math.floor(b.y / TILE);
    const hitL = map.isSolid(tx0, ty);
    const hitR = tx1 !== tx0 && map.isSolid(tx1, ty);
    if (hitL || hitR) {
      // Corrección de esquina: si solo roza un tile por poquito, lo empujamos a un lado.
      if (cornerSlide && hitL && !hitR) {
        const overlap = (tx0 + 1) * TILE - b.x;
        if (overlap <= CORNER_SLIDE && !map.isSolid(tx0 + 1, ty)) {
          b.x += overlap;
          return res;
        }
      } else if (cornerSlide && hitR && !hitL) {
        const overlap = b.x + b.w - tx1 * TILE;
        if (overlap <= CORNER_SLIDE && !map.isSolid(tx1 - 1, ty)) {
          b.x -= overlap;
          return res;
        }
      }
      b.y = (ty + 1) * TILE;
      b.vy = 0;
      res.ceiling = true;
      // El tile "golpeado" es el que queda más centrado sobre la cabeza.
      const cx = Math.floor((b.x + b.w / 2) / TILE);
      const hitTx = map.isSolid(cx, ty) ? cx : hitL ? tx0 : tx1;
      res.ceilingTile = { tx: hitTx, ty };
    }
  }

  return res;
}

/** Acerca `v` a `target` como máximo `step`. */
export function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}
