import { SCREEN_W, TILE, TIME_UNIT_SECONDS } from './config';
import { sound, type SongName } from './engine/audio';
import { Camera } from './engine/camera';
import { AUTO_WALK, NO_INPUT, type Controls } from './engine/input';
import { Enemy, Goomba, Koopa, type EnemyHost } from './entities/enemies';
import { Item, LooseHeart, Mushroom, overlaps, PopHeart, type Rect } from './entities/items';
import { brickDebris, FloatHeart, ScoreText, type Effect } from './entities/particles';
import { Player } from './entities/player';
import { Princess } from './entities/princess';
import { PAL } from './graphics/palette';
import { drawScenery, drawSky } from './graphics/background';
import type { WorldRenderer } from './graphics/renderer';
import type { JoseFrame, SpriteSheet } from './graphics/sprites';
import { parseLevel, type Level, type LevelData, type Spawn } from './world/level';
import { Tile, TILE_DEFS } from './world/tiles';

/** Lo que Jose conserva entre niveles y vidas. */
export interface RunStats {
  score: number;
  hearts: number;
  lives: number;
  big: boolean;
}

export const POINTS = {
  heart: 200,
  mushroom: 1000,
  brick: 50,
  bumpKill: 100,
} as const;

/** Puntos por pisotones seguidos sin tocar el suelo; después de la lista, vida extra. */
const STOMP_CHAIN = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
/** Puntos por enemigos derrotados con un mismo caparazón. */
const SHELL_CHAIN = [500, 800, 1000, 2000, 4000, 5000, 8000];

/** Puntos al agarrar el asta según la altura (px sobre la base), de mayor a menor. */
const FLAG_POINTS: readonly [number, number][] = [
  [144, 5000],
  [112, 2000],
  [80, 800],
  [40, 400],
  [0, 100],
];
const FLAG_SLIDE_SPEED = 150;
/** Unidades de tiempo convertidas en puntos por tick al final del nivel, y cuánto vale cada una. */
const TALLY_PER_TICK = 3;
const TALLY_POINTS = 50;

/**
 * Fases de un nivel: jugar normalmente, bajar por el asta, caminar al castillo,
 * contar el tiempo restante, o la escena del rescate de Yazmín.
 */
type Phase = 'play' | 'flag' | 'toCastle' | 'tally' | 'rescue';

/** Con este tiempo restante suena el aviso y la música se acelera. */
const HURRY_TIME = 100;

/** Cuántos corazones dan una vida extra. */
const HEARTS_PER_LIFE = 100;
const BUMP_TIME = 0.16;
const BUMP_HEIGHT = 6;
/** Los enemigos despiertan un poco antes de entrar en pantalla. */
const ACTIVATE_MARGIN = 16;
/** Un pisotón cuenta si los pies de Jose venían por encima de este margen sobre la cabeza del enemigo. */
const STOMP_TOLERANCE = 8;

interface Bump {
  tx: number;
  ty: number;
  t: number;
}

/** Una partida en curso dentro de un nivel. */
export class Game implements EnemyHost {
  readonly level: Level;
  readonly camera = new Camera();
  player: Player;
  items: Item[] = [];
  enemies: Enemy[] = [];
  effects: Effect[] = [];
  time: number;
  princess: Princess | null = null;
  /**
   * Cuando termina el nivel, `main` decide qué sigue: repetir (dead), pasar al
   * siguiente (clear) o mostrar el final (rescued; la escena sigue animándose).
   */
  outcome: 'dead' | 'clear' | 'rescued' | null = null;
  phase: Phase = 'play';

  private bumps: Bump[] = [];
  private timeAcc = 0;
  private deathT = 0;
  private deathHop = true;
  private deathLaunched = false;
  private phaseT = 0;
  /** Posición (y de mundo) de la bandera del asta mientras baja. */
  private flagY: number | undefined;
  private flagDone = false;
  private playerHidden = false;
  private tallyTicks = 0;

  constructor(
    data: LevelData,
    readonly stats: RunStats,
  ) {
    this.level = parseLevel(data);
    this.time = this.level.time;
    const { start } = this.level;
    this.player = new Player(start.tx * TILE + 2, start.ty * TILE);
    this.player.setBig(stats.big);
    this.player.onGround = true;

    for (const s of this.level.spawns) {
      if (s.kind === 'heart') this.items.push(new LooseHeart(s.tx, s.ty));
      if (s.kind === 'princess') this.princess = new Princess(s.tx, s.ty);
      const enemy = spawnEnemy(s);
      if (enemy) this.enemies.push(enemy);
    }
  }

  /** Música del nivel según su tema. */
  get themeSong(): SongName {
    return this.level.theme === 'underground' ? 'underground' : 'overworld';
  }

  update(dt: number, input: Controls): void {
    const p = this.player;
    this.camera.prevX = this.camera.x;
    if (this.outcome === 'dead' || this.outcome === 'clear') return;

    if (p.dying) {
      this.updateDeath(dt);
      return;
    }

    // Mientras Jose crece o se encoge, todo se congela (como en el original)
    if (p.changeTimer > 0) {
      p.changeTimer = Math.max(0, p.changeTimer - dt);
      p.savePrev();
      return;
    }

    if (this.phase !== 'play') {
      this.phaseT += dt;
      this.updateEndSequence(dt);
      this.updateEffects(dt);
      return;
    }

    const hit = p.update(dt, input, this.level.map);
    if (hit.ceilingTile) this.bumpBlock(hit.ceilingTile.tx, hit.ceilingTile.ty);

    // Jose no puede volver más atrás del borde izquierdo de la cámara
    if (p.x < this.camera.x) {
      p.x = this.camera.x;
      if (p.vx < 0) p.vx = 0;
    }
    this.camera.follow(p.x + p.w / 2, this.level.map.pixelWidth);

    this.updateItems(dt);
    this.updateEnemies(dt);
    this.updateEffects(dt);

    this.timeAcc += dt;
    while (this.timeAcc >= TIME_UNIT_SECONDS) {
      this.timeAcc -= TIME_UNIT_SECONDS;
      if (this.time > 0) this.time--;
      if (this.time === HURRY_TIME) {
        // Aviso de poco tiempo; después la música vuelve más rápida
        sound.music('hurry', () => {
          if (this.phase === 'play' && !this.player.dying) {
            sound.music(this.themeSong);
            sound.setTempo(1.3);
          }
        });
      }
    }

    this.stats.big = p.big;
    if (p.y > this.level.map.pixelHeight + 16) this.killPlayer(false);
    else if (this.time === 0) this.killPlayer(true);
    else this.checkGoal();
  }

  private updateEffects(dt: number): void {
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => !e.done);
    for (const b of this.bumps) b.t += dt;
    this.bumps = this.bumps.filter((b) => b.t < BUMP_TIME);
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseT = 0;
  }

  // ---------- Final del nivel ----------

  private get poleX(): number {
    return this.level.flag ? this.level.flag.tx * TILE + TILE / 2 : Infinity;
  }

  /** Borde superior del bloque donde se apoya el asta. */
  private get poleBaseY(): number {
    return this.level.flag ? (this.level.flag.baseTy + 1) * TILE : 0;
  }

  private checkGoal(): void {
    const p = this.player;
    const flag = this.level.flag;
    if (flag && p.x + p.w >= this.poleX - 1 && p.y + p.h > flag.topTy * TILE) {
      this.grabPole();
      return;
    }
    if (this.princess && p.x + p.w >= this.princess.x - 40 && p.y + p.h >= this.princess.y) {
      this.setPhase('rescue');
      sound.music('ending');
    }
  }

  private grabPole(): void {
    const p = this.player;
    const height = this.poleBaseY - (p.y + p.h);
    const points = FLAG_POINTS.find(([min]) => height >= min)?.[1] ?? 100;
    this.addScore(points, this.poleX + 12, p.y);
    p.x = p.prevX = this.poleX - 1 - p.w;
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    p.anim = 'jump';
    this.flagY = (this.level.flag!.topTy + 1) * TILE;
    this.flagDone = false;
    this.setPhase('flag');
    sound.music(null);
    sound.sfx('flagpole');
  }

  private updateEndSequence(dt: number): void {
    const p = this.player;
    switch (this.phase) {
      case 'flag': {
        // Jose y la bandera bajan juntos por el asta
        p.savePrev();
        p.y = Math.min(p.y + FLAG_SLIDE_SPEED * dt, this.poleBaseY - p.h);
        const flagBottom = this.poleBaseY - TILE;
        this.flagY = Math.min((this.flagY ?? flagBottom) + FLAG_SLIDE_SPEED * dt, flagBottom);
        const down = p.y >= this.poleBaseY - p.h && this.flagY >= flagBottom;
        if (down && !this.flagDone) {
          this.flagDone = true;
          this.phaseT = 0;
        }
        if (this.flagDone && this.phaseT > 0.4) {
          // Salta al otro lado del asta y camina hacia el castillo
          p.x = p.prevX = this.poleX + 2;
          this.setPhase('toCastle');
          sound.music('clear');
        }
        break;
      }
      case 'toCastle': {
        this.walk(dt, AUTO_WALK);
        const castle = this.level.castle;
        const door = castle ? castle.tx * TILE + 40 : this.level.map.pixelWidth;
        if (p.x + p.w / 2 >= door) {
          this.playerHidden = true;
          this.setPhase('tally');
        }
        break;
      }
      case 'tally':
        // El tiempo que sobró se convierte en puntos
        if (this.time > 0) {
          this.tallyTime();
          this.phaseT = 0;
        } else if (this.phaseT > 1.2) {
          this.outcome = 'clear';
        }
        break;
      case 'rescue': {
        const princess = this.princess!;
        const arrived = p.x + p.w >= princess.x - 4;
        // Al llegar se detiene en seco frente a ella (sin deslizarse encima)
        if (arrived) {
          p.vx = 0;
          p.facing = 1;
        }
        this.walk(dt, arrived ? NO_INPUT : AUTO_WALK);
        // Corazones subiendo alrededor de los dos
        if (arrived && Math.floor(this.phaseT / 0.22) !== Math.floor((this.phaseT - dt) / 0.22)) {
          const cx = (p.x + princess.x + princess.w) / 2;
          const x = cx - 24 + Math.random() * 48;
          this.effects.push(new FloatHeart(x, princess.y + 4, Math.random() * Math.PI * 2));
        }
        if (arrived && this.time > 0) this.tallyTime();
        // El mensaje aparece cuando ya se sumó todo el tiempo restante
        if (arrived && this.time === 0 && this.phaseT > 2 && !this.outcome) this.outcome = 'rescued';
        break;
      }
    }
  }

  /** Convierte un poco del tiempo restante en puntos, con su "tic". */
  private tallyTime(): void {
    const n = Math.min(TALLY_PER_TICK, this.time);
    this.time -= n;
    this.stats.score += n * TALLY_POINTS;
    if (this.tallyTicks++ % 4 === 0) sound.sfx('tick');
  }

  /** Mueve a Jose con controles automáticos durante las escenas. */
  private walk(dt: number, controls: Controls): void {
    this.player.update(dt, controls, this.level.map);
    this.camera.follow(this.player.x + this.player.w / 2, this.level.map.pixelWidth);
  }

  // ---------- Jose ----------

  hurtPlayer(): void {
    const wasBig = this.player.big;
    if (this.player.hurt()) this.killPlayer(true);
    else if (wasBig && !this.player.big) sound.sfx('shrink');
  }

  /** `hop`: el salto de muerte clásico. Al caer en un hueco no hay salto. */
  private killPlayer(hop: boolean): void {
    const p = this.player;
    p.dying = true;
    p.vx = 0;
    p.vy = 0;
    p.invincible = 0;
    p.changeTimer = 0;
    this.deathT = 0;
    this.deathHop = hop;
    this.deathLaunched = false;
    this.stats.big = false;
    sound.music('death');
  }

  private updateDeath(dt: number): void {
    const p = this.player;
    p.savePrev();
    this.deathT += dt;
    if (this.deathHop) {
      // Congelado medio segundo, salta hacia arriba y cae fuera de la pantalla
      if (this.deathT < 0.5) return;
      if (!this.deathLaunched) {
        this.deathLaunched = true;
        p.vy = -340;
      }
      p.vy += 1000 * dt;
      p.y += p.vy * dt;
    }
    if (this.deathT > (this.deathHop ? 3 : 2)) this.outcome = 'dead';
  }

  // ---------- Puntos ----------

  addScore(points: number, x: number, y: number): void {
    this.stats.score += points;
    this.effects.push(new ScoreText(String(points), x, y));
  }

  private extraLife(x: number, y: number): void {
    this.stats.lives++;
    sound.sfx('oneUp');
    this.effects.push(new ScoreText('1UP', x, y));
  }

  /** Puntos de una cadena: si se pasa del final de la tabla, vida extra. */
  private chainScore(table: readonly number[], index: number, x: number, y: number): void {
    const points = table[index];
    if (points === undefined) this.extraLife(x, y);
    else this.addScore(points, x, y);
  }

  stompScore(x: number, y: number): void {
    this.chainScore(STOMP_CHAIN, this.player.stompChain++, x, y);
  }

  private collectHeart(): void {
    sound.sfx('heart');
    this.stats.hearts++;
    this.stats.score += POINTS.heart;
    if (this.stats.hearts >= HEARTS_PER_LIFE) {
      this.stats.hearts -= HEARTS_PER_LIFE;
      this.extraLife(this.player.x + this.player.w / 2, this.player.y - 8);
    }
  }

  // ---------- Ítems ----------

  private updateItems(dt: number): void {
    const p = this.player;
    for (const item of this.items) {
      item.update(dt, this.level.map);
      if (item.removed) continue;
      if (item instanceof LooseHeart && overlaps(p, item)) {
        item.removed = true;
        this.collectHeart();
      } else if (item instanceof Mushroom && !item.emerging && overlaps(p, item)) {
        item.removed = true;
        this.addScore(POINTS.mushroom, item.x + item.w / 2, item.y);
        sound.sfx('powerup');
        p.grow();
      }
    }
    this.items = this.items.filter((i) => !i.removed);
  }

  // ---------- Enemigos ----------

  private updateEnemies(dt: number): void {
    const cam = this.camera.x;
    const map = this.level.map;

    for (const e of this.enemies) {
      if (!e.active) {
        if (e.x < cam + SCREEN_W + ACTIVATE_MARGIN) e.active = true;
        else continue;
      }
      e.update(dt, map);
      // Los que quedan muy atrás, o un caparazón que se fue lejos, desaparecen
      if (e.x + e.w < cam - 64 || (e.killsOthers && e.x > cam + SCREEN_W + 128)) e.removed = true;
    }

    const live = this.enemies.filter((e) => e.active && e.alive && !e.removed);

    // Enemigo contra enemigo
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]!;
        const b = live[j]!;
        if (!a.alive || !b.alive || !overlaps(a, b)) continue;
        if (a.killsOthers || b.killsOthers) {
          if (a.killsOthers) this.shellHit(a, b);
          if (b.killsOthers) this.shellHit(b, a);
        } else {
          a.turnAway(b);
          b.turnAway(a);
        }
      }
    }

    // Jose contra enemigo
    const p = this.player;
    for (const e of live) {
      if (p.dying || !e.alive || !overlaps(p, e)) continue;
      const stomp = p.vy > 0 && p.prevY + p.h <= e.prevY + STOMP_TOLERANCE;
      if (stomp) {
        sound.sfx('stomp');
        e.onStomp(this);
        p.bounce();
      } else if (p.invincible <= 0) {
        e.onTouch(this);
      }
    }

    this.enemies = this.enemies.filter((e) => !e.removed);
  }

  private shellHit(shell: Enemy, victim: Enemy): void {
    victim.flip(shell.x + shell.w / 2);
    sound.sfx('kick');
    const chain = shell instanceof Koopa ? shell.shellChain++ : 0;
    this.chainScore(SHELL_CHAIN, chain, victim.x + victim.w / 2, victim.y);
  }

  // ---------- Bloques ----------

  /** Jose golpeó el bloque (tx, ty) con la cabeza. */
  private bumpBlock(tx: number, ty: number): void {
    const map = this.level.map;
    const tile = map.get(tx, ty);
    if (!TILE_DEFS[tile].bumpable) {
      sound.sfx('bump');
      return;
    }

    switch (tile) {
      case Tile.QHeart:
        map.set(tx, ty, Tile.Used);
        this.bumps.push({ tx, ty, t: 0 });
        this.items.push(new PopHeart(tx, ty));
        this.collectHeart();
        this.effects.push(new ScoreText(String(POINTS.heart), tx * TILE + 8, (ty - 2) * TILE));
        break;
      case Tile.QMushroom:
        map.set(tx, ty, Tile.Used);
        this.bumps.push({ tx, ty, t: 0 });
        this.items.push(new Mushroom(tx, ty));
        sound.sfx('sprout');
        break;
      case Tile.Brick:
        if (this.player.big) {
          map.set(tx, ty, Tile.Empty);
          this.effects.push(...brickDebris(tx, ty));
          this.stats.score += POINTS.brick;
          sound.sfx('break');
        } else {
          this.bumps.push({ tx, ty, t: 0 });
          sound.sfx('bump');
        }
        break;
    }

    // Lo que esté parado encima del bloque también recibe el golpe
    const above: Rect = { x: tx * TILE, y: (ty - 1) * TILE, w: TILE, h: TILE };
    const center = tx * TILE + TILE / 2;
    for (const item of [...this.items]) {
      if (!overlaps(item, above)) continue;
      if (item instanceof LooseHeart) {
        item.removed = true;
        this.collectHeart();
        this.items.push(new PopHeart(tx, ty));
      } else if (item instanceof Mushroom && !item.emerging) {
        item.hop(center);
      }
    }
    for (const e of this.enemies) {
      if (e.active && e.alive && overlaps(e, above)) {
        e.flip(center);
        this.addScore(POINTS.bumpKill, e.x + e.w / 2, e.y);
        sound.sfx('kick');
      }
    }
  }

  private bumpOffset = (tx: number, ty: number): number => {
    for (const b of this.bumps) {
      if (b.tx === tx && b.ty === ty) return Math.round(Math.sin((b.t / BUMP_TIME) * Math.PI) * BUMP_HEIGHT);
    }
    return 0;
  };

  // ---------- Dibujo ----------

  render(
    ctx: CanvasRenderingContext2D,
    s: SpriteSheet,
    world: WorldRenderer,
    alpha: number,
    animTime: number,
    showPlayer: boolean,
  ): void {
    const camX = Math.round(this.camera.lerp(alpha));

    if (this.level.theme === 'underground') {
      ctx.fillStyle = PAL.underBg;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      drawSky(ctx);
      drawScenery(ctx, s, camX, this.level.map);
    }
    for (const i of this.items) if (i.behindTiles) i.draw(ctx, s, camX, alpha, animTime);
    world.drawTiles(this.level, camX, animTime, this.bumpOffset);
    world.drawFlag(this.level, camX, this.flagY);
    this.princess?.draw(ctx, s, camX, animTime);
    for (const i of this.items) if (!i.behindTiles) i.draw(ctx, s, camX, alpha, animTime);
    for (const e of this.enemies) if (e.active) e.draw(ctx, s, camX, alpha, animTime);
    if (showPlayer && !this.player.dying) this.drawPlayer(ctx, s, alpha, camX, animTime);
    world.drawCastle(this.level, camX);
    // Jose derrotado se dibuja encima de todo mientras cae
    if (showPlayer && this.player.dying) this.drawPlayer(ctx, s, alpha, camX, animTime);
    for (const e of this.effects) e.draw(ctx, s, camX);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, s: SpriteSheet, alpha: number, camX: number, time: number): void {
    const p = this.player;
    if (this.playerHidden || !p.visible(time)) return;
    let img: HTMLCanvasElement;
    if (p.dying) {
      img = s.joseDead;
    } else if (p.crouching) {
      img = p.facing === 1 ? s.joseBigCrouch.r : s.joseBigCrouch.l;
    } else {
      const frame = (p.showBig ? s.joseBig : s.jose)[this.joseFrame()];
      img = p.facing === 1 ? frame.r : frame.l;
    }
    // Sprite de 16px de ancho sobre hitbox de 12, apoyado en los pies
    const x = Math.round(p.lerpX(alpha)) - camX - 2;
    const y = Math.round(p.lerpY(alpha) + p.h) - img.height;
    ctx.drawImage(img, x, y);
  }

  private joseFrame(): JoseFrame {
    const p = this.player;
    if (p.changeTimer > 0) return 'idle';
    if (this.phase === 'flag') return 'jump';
    if (p.anim === 'walk' || (!p.onGround && p.anim !== 'jump')) return `walk${p.walkFrame as 0 | 1 | 2}`;
    return p.anim;
  }
}

function spawnEnemy(s: Spawn): Enemy | null {
  switch (s.kind) {
    case 'goomba':
      return new Goomba(s.tx, s.ty);
    case 'koopa':
      return new Koopa(s.tx, s.ty);
    default:
      return null;
  }
}
