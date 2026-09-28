import { sound } from '../engine/audio';
import type { Controls } from '../engine/input';
import { approach, moveAndCollide, type CollisionResult } from '../engine/physics';
import type { TileMap } from '../world/tilemap';
import { Entity } from './entity';

/**
 * Constantes de movimiento en px/s y px/s², derivadas de los valores del NES
 * (sub-píxeles por frame × 60). Ajustadas a mano para que se sienta igual.
 */
export const PHYS = {
  walkMax: 94, // 1.5625 px/frame
  runMax: 154, // 2.5625 px/frame
  minWalk: 8, // arranque inmediato al presionar
  walkAccel: 134,
  runAccel: 200,
  releaseDecel: 183, // soltar la dirección en el suelo
  skidDecel: 366, // cambiar de dirección corriendo
  airAccel: 134,
  jumpSpeed: 250, // salto parado (~4.4 tiles)
  jumpSpeedRunBonus: 25, // extra a velocidad máxima de carrera (~5.4 tiles)
  gravityHold: 440, // subiendo con el botón presionado
  gravity: 1500, // cayendo o soltando el botón
  maxFall: 270,
  coyoteTime: 0.08, // se puede saltar un instante después de salir del borde
  jumpBuffer: 0.1, // un salto presionado justo antes de tocar el suelo cuenta
} as const;

export type JoseAnim = 'idle' | 'walk' | 'skid' | 'jump';

export class Player extends Entity {
  facing: 1 | -1 = 1;
  anim: JoseAnim = 'idle';
  /** Frame del ciclo de caminar (0..2). */
  walkFrame = 0;
  /** Jose grande (después de comer el hongo). */
  big = false;
  /** Tiempo restante de la animación de crecer o encogerse; mientras dura, el mundo se congela. */
  changeTimer = 0;
  /** Tiempo restante de invencibilidad después de recibir un golpe (Jose parpadea). */
  invincible = 0;
  /** Pisotones seguidos sin tocar el suelo (cada uno vale más puntos). */
  stompChain = 0;
  /** Jose fue derrotado: el juego reproduce la animación de muerte. */
  dying = false;
  /** Agachado (solo Jose grande): hitbox más baja, no acelera. */
  crouching = false;

  private jumping = false;
  private skidding = false;
  private coyote = 0;
  private buffer = 0;
  private walkDist = 0;

  static readonly SMALL_H = 16;
  static readonly BIG_H = 30;
  static readonly CROUCH_H = 20;
  static readonly CHANGE_TIME = 0.9;
  static readonly INVINCIBLE_TIME = 2;

  constructor(x: number, y: number) {
    // Hitbox más angosta que el sprite (16px) para que los saltos entre bloques perdonen un poco.
    super(x, y, 12, Player.SMALL_H);
  }

  /** Cambia de tamaño manteniendo los pies en el mismo lugar. */
  setBig(big: boolean): void {
    if (this.big === big) return;
    this.big = big;
    this.crouching = false;
    this.setHeight(big ? Player.BIG_H : Player.SMALL_H);
  }

  /** Cambia la altura de la hitbox dejando los pies donde están. */
  private setHeight(h: number): void {
    const feet = this.y + this.h;
    this.h = h;
    this.y = this.prevY = feet - h;
  }

  /** Agacharse con ABAJO en el suelo; al soltar se levanta si hay espacio arriba. */
  private updateCrouch(input: Controls, map: TileMap): void {
    if (!this.big) return;
    const wants = input.isDown('down');
    if (!this.crouching && wants && this.onGround) {
      this.crouching = true;
      this.setHeight(Player.CROUCH_H);
    } else if (this.crouching && !wants && this.onGround) {
      const top = this.y + this.h - Player.BIG_H;
      const ty = Math.floor(top / 16);
      const blocked =
        map.isSolid(Math.floor(this.x / 16), ty) || map.isSolid(Math.floor((this.x + this.w - 0.001) / 16), ty);
      if (!blocked) {
        this.crouching = false;
        this.setHeight(Player.BIG_H);
      }
    }
  }

  /** Come el hongo: crece con parpadeo (el juego se congela mientras tanto). */
  grow(): void {
    if (this.big) return;
    this.setBig(true);
    this.changeTimer = Player.CHANGE_TIME;
  }

  /**
   * Recibe un golpe. Grande: se encoge y queda invencible un rato.
   * Chico: pierde. Devuelve true si Jose muere.
   */
  hurt(): boolean {
    if (this.invincible > 0 || this.changeTimer > 0 || this.dying) return false;
    if (!this.big) return true;
    this.setBig(false);
    this.changeTimer = Player.CHANGE_TIME * 0.7;
    this.invincible = Player.INVINCIBLE_TIME;
    return false;
  }

  /** Rebote al pisar a un enemigo. Manteniendo el salto se sube más alto. */
  bounce(): void {
    this.vy = -260;
    this.jumping = true;
    this.onGround = false;
  }

  /** Durante un cambio de tamaño, ¿se ve grande o chico en este instante? (parpadeo) */
  get showBig(): boolean {
    if (this.changeTimer <= 0) return this.big;
    return Math.floor(this.changeTimer / 0.09) % 2 === 0;
  }

  /** Parpadeo de invencibilidad: ¿se dibuja en este frame? */
  visible(time: number): boolean {
    return this.invincible <= 0 || Math.floor(time / 0.05) % 2 === 0;
  }

  update(dt: number, input: Controls, map: TileMap): CollisionResult {
    this.savePrev();
    this.invincible = Math.max(0, this.invincible - dt);
    this.updateCrouch(input, map);
    this.horizontal(dt, input);
    this.vertical(dt, input);

    const hit = moveAndCollide(this, map, dt, true);

    // La gravedad se aplica siempre, así que estar parado produce un choque con el suelo cada tick.
    this.onGround = hit.ground;
    if (hit.ground) {
      this.jumping = false;
      this.stompChain = 0;
    }
    if (hit.ceiling) this.vy = 30; // pequeño rebote hacia abajo al golpear un bloque

    this.animate(dt);
    return hit;
  }

  private horizontal(dt: number, input: Controls): void {
    // Agachado en el suelo no camina: solo se desliza hasta frenar
    const dir = this.crouching && this.onGround ? 0 : input.axisX();
    const running = input.isDown('run');
    const max = running ? PHYS.runMax : PHYS.walkMax;
    const speed = Math.abs(this.vx);
    const moving = Math.sign(this.vx);
    this.skidding = false;

    if (dir !== 0) {
      if (moving !== 0 && moving !== dir) {
        // Cambio de dirección: derrape en el suelo, control limitado en el aire
        this.vx += dir * (this.onGround ? PHYS.skidDecel : PHYS.airAccel) * dt;
        this.skidding = this.onGround;
      } else if (speed < max) {
        const accel = this.onGround ? (running ? PHYS.runAccel : PHYS.walkAccel) : PHYS.airAccel;
        this.vx = dir * Math.min(max, Math.max(speed + accel * dt, PHYS.minWalk));
      } else if (this.onGround) {
        // Soltó "correr" yendo rápido: baja suave hasta la velocidad de caminar
        this.vx = dir * approach(speed, max, PHYS.releaseDecel * dt);
      }
      if (this.onGround) this.facing = dir as 1 | -1;
    } else if (this.onGround) {
      this.vx = approach(this.vx, 0, PHYS.releaseDecel * dt);
    }
    // En el aire sin dirección se conserva el impulso, como en el original.
  }

  private vertical(dt: number, input: Controls): void {
    this.coyote = this.onGround ? PHYS.coyoteTime : Math.max(0, this.coyote - dt);
    this.buffer = input.wasPressed('jump') ? PHYS.jumpBuffer : Math.max(0, this.buffer - dt);

    if (this.buffer > 0 && this.coyote > 0) {
      const runFactor = Math.min(1, Math.abs(this.vx) / PHYS.runMax);
      this.vy = -(PHYS.jumpSpeed + PHYS.jumpSpeedRunBonus * runFactor);
      this.jumping = true;
      this.onGround = false;
      this.coyote = 0;
      this.buffer = 0;
      sound.sfx(this.big ? 'jumpBig' : 'jump');
    }

    // Salto variable: mientras sube con el botón presionado la gravedad es suave.
    const holding = this.jumping && this.vy < 0 && input.isDown('jump');
    this.vy = Math.min(this.vy + (holding ? PHYS.gravityHold : PHYS.gravity) * dt, PHYS.maxFall);
  }

  private animate(dt: number): void {
    if (!this.onGround) {
      // Si cayó de un borde sin saltar, se queda congelado en el frame de caminar.
      if (this.jumping) this.anim = 'jump';
      return;
    }
    if (this.skidding) {
      this.anim = 'skid';
    } else if (Math.abs(this.vx) > 1) {
      this.anim = 'walk';
      this.walkDist += Math.abs(this.vx) * dt;
      // A más velocidad, las piernas se mueven más rápido (cada ~6px avanza un frame).
      if (this.walkDist >= 6) {
        this.walkDist -= 6;
        this.walkFrame = (this.walkFrame + 1) % 3;
      }
    } else {
      this.anim = 'idle';
      this.walkDist = 0;
    }
  }
}
