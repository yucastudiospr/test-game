import { TILE } from '../config';
import { sound } from '../engine/audio';
import { moveAndCollide } from '../engine/physics';
import type { Sprite, SpriteSheet } from '../graphics/sprites';
import type { TileMap } from '../world/tilemap';
import { Entity } from './entity';
import type { Player } from './player';

/** Lo que un enemigo necesita del juego para dar puntos o lastimar a Jose. */
export interface EnemyHost {
  readonly player: Player;
  /** Puntos por pisotón, crecen con la cadena de pisotones de Jose. */
  stompScore(x: number, y: number): void;
  addScore(points: number, x: number, y: number): void;
  hurtPlayer(): void;
}

const GRAVITY = 1100;
const MAX_FALL = 270;
const FLIP_GRAVITY = 900;

export abstract class Enemy extends Entity {
  dir: 1 | -1 = -1;
  /** Se activa cuando entra en pantalla (antes no se mueve). */
  active = false;
  removed = false;
  /** Derrotado de un golpe desde abajo o con un caparazón: cae de cabeza fuera de la pantalla. */
  flipped = false;

  /** Puede recibir pisotones, golpes y caparazones. */
  get alive(): boolean {
    return !this.flipped;
  }

  /** Mata a otros enemigos al tocarlos (caparazón en movimiento). */
  get killsOthers(): boolean {
    return false;
  }

  flip(fromX: number): void {
    this.flipped = true;
    this.vy = -260;
    this.vx = (this.x + this.w / 2 >= fromX ? 1 : -1) * 50;
  }

  /** Voltea la dirección al chocar con otro enemigo. */
  turnAway(other: Enemy): void {
    this.dir = this.x < other.x ? -1 : 1;
  }

  update(dt: number, map: TileMap): void {
    this.savePrev();
    if (this.flipped) {
      this.vy += FLIP_GRAVITY * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y > map.pixelHeight + 32) this.removed = true;
      return;
    }
    this.think(dt);
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    const hit = moveAndCollide(this, map, dt);
    this.onGround = hit.ground;
    if (hit.left) this.dir = 1;
    if (hit.right) this.dir = -1;
    if (this.y > map.pixelHeight) this.removed = true;
  }

  /** Lógica propia de cada enemigo antes de moverse (fijar vx, temporizadores…). */
  protected abstract think(dt: number): void;
  abstract onStomp(host: EnemyHost): void;
  abstract onTouch(host: EnemyHost): void;
  abstract draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, alpha: number, time: number): void;

  protected drawAt(ctx: CanvasRenderingContext2D, img: Sprite, camX: number, alpha: number, dx = 0): void {
    // Sprites de 16px de ancho centrados sobre la hitbox y apoyados en los pies
    const x = Math.round(this.lerpX(alpha) + this.w / 2 - img.width / 2 - camX) + dx;
    const y = Math.round(this.lerpY(alpha) + this.h) - img.height;
    ctx.drawImage(img, x, y);
  }
}

export class Goomba extends Enemy {
  static readonly SPEED = 32;
  private squash = 0;

  constructor(tx: number, ty: number) {
    super(tx * TILE + 1, ty * TILE + 2, 14, 14);
  }

  override get alive(): boolean {
    return super.alive && this.squash === 0;
  }

  protected think(dt: number): void {
    if (this.squash > 0) {
      this.vx = 0;
      this.squash -= dt;
      if (this.squash <= 0) this.removed = true;
      return;
    }
    this.vx = this.dir * Goomba.SPEED;
  }

  onStomp(host: EnemyHost): void {
    this.squash = 0.5;
    host.stompScore(this.x + this.w / 2, this.y);
  }

  onTouch(host: EnemyHost): void {
    host.hurtPlayer();
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, alpha: number, time: number): void {
    if (this.flipped) return this.drawAt(ctx, s.goombaDead, camX, alpha);
    if (this.squash > 0) return this.drawAt(ctx, s.goombaFlat, camX, alpha);
    this.drawAt(ctx, s.goomba[Math.floor(time / 0.2) % 2]!, camX, alpha);
  }
}

type KoopaMode = 'walk' | 'shell' | 'slide';

export class Koopa extends Enemy {
  static readonly SPEED = 32;
  static readonly SHELL_SPEED = 190;
  /** Segundos que tarda en salir del caparazón si nadie lo toca. */
  static readonly REVIVE_TIME = 7;
  static readonly WALK_H = 22;
  static readonly SHELL_H = 13;

  mode: KoopaMode = 'walk';
  /** Cadena de enemigos derrotados por este caparazón. */
  shellChain = 0;
  private shellTime = 0;
  /** Tras patearlo, un instante en que no lastima a Jose. */
  private kickGrace = 0;

  constructor(tx: number, ty: number) {
    super(tx * TILE + 1, (ty + 1) * TILE - Koopa.WALK_H, 14, Koopa.WALK_H);
  }

  override get killsOthers(): boolean {
    return this.mode === 'slide' && !this.flipped;
  }

  private setMode(mode: KoopaMode): void {
    const feet = this.y + this.h;
    this.mode = mode;
    this.h = mode === 'walk' ? Koopa.WALK_H : Koopa.SHELL_H;
    this.y = this.prevY = feet - this.h;
    this.shellTime = 0;
    if (mode !== 'slide') this.shellChain = 0;
  }

  protected think(dt: number): void {
    this.kickGrace = Math.max(0, this.kickGrace - dt);
    switch (this.mode) {
      case 'walk':
        this.vx = this.dir * Koopa.SPEED;
        break;
      case 'shell':
        this.vx = 0;
        this.shellTime += dt;
        if (this.shellTime >= Koopa.REVIVE_TIME) this.setMode('walk');
        break;
      case 'slide':
        this.vx = this.dir * Koopa.SHELL_SPEED;
        break;
    }
  }

  private kick(host: EnemyHost): void {
    const p = host.player;
    this.dir = p.x + p.w / 2 < this.x + this.w / 2 ? 1 : -1;
    this.setMode('slide');
    this.kickGrace = 0.25;
    host.addScore(400, this.x + this.w / 2, this.y);
    sound.sfx('kick');
  }

  onStomp(host: EnemyHost): void {
    if (this.mode === 'shell') {
      this.kick(host);
    } else {
      this.setMode('shell');
      host.stompScore(this.x + this.w / 2, this.y);
    }
  }

  onTouch(host: EnemyHost): void {
    if (this.mode === 'shell') this.kick(host);
    else if (this.kickGrace <= 0) host.hurtPlayer();
  }

  draw(ctx: CanvasRenderingContext2D, s: SpriteSheet, camX: number, alpha: number, time: number): void {
    if (this.flipped) return this.drawAt(ctx, this.mode === 'walk' ? s.koopa.l[0] : s.shellDead, camX, alpha);
    if (this.mode === 'walk') {
      const frames = this.dir === -1 ? s.koopa.l : s.koopa.r;
      return this.drawAt(ctx, frames[Math.floor(time / 0.25) % 2]!, camX, alpha);
    }
    // En el último segundo y medio antes de salir, el caparazón tiembla
    const shaking = this.mode === 'shell' && this.shellTime > Koopa.REVIVE_TIME - 1.5;
    const dx = shaking ? (Math.floor(time / 0.05) % 2 === 0 ? -1 : 1) : 0;
    this.drawAt(ctx, s.shell, camX, alpha, dx);
  }
}
