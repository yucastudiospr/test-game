import { SCREEN_W, TILE } from './config';
import { sound } from './engine/audio';
import { GameLoop } from './engine/loop';
import { Input, type Action } from './engine/input';
import { setupScreen } from './engine/screen';
import { Game, type RunStats } from './game';
import { WorldRenderer } from './graphics/renderer';
import { buildSprites } from './graphics/sprites';
import { Hud, loadBest, saveBest } from './ui/hud';
import type { LevelData } from './world/level';
import { LEVEL_1_1 } from './world/level1-1';
import { LEVEL_1_2 } from './world/level1-2';

type State = 'title' | 'intro' | 'playing' | 'paused' | 'gameover' | 'ending';

const LEVELS: readonly LevelData[] = [LEVEL_1_1, LEVEL_1_2];
const GAME_OVER_SECONDS = 3.5;
/** Cuánto dura la pantalla "MUNDO 1-1 × vidas" antes de cada intento. */
const INTRO_SECONDS = 2.5;
/** Tras el mensaje de Yazmín, cuánto esperar antes de aceptar ENTER. */
const ENDING_MIN_SECONDS = 3;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id} en index.html`);
  return el;
}

const canvas = $('screen') as HTMLCanvasElement;
const titleScreen = $('screen-title');
const pauseScreen = $('screen-pause');
const gameOverScreen = $('screen-gameover');
const introScreen = $('screen-intro');
const introWorld = $('intro-world');
const introLives = $('intro-lives');
const introJose = $('intro-jose') as HTMLCanvasElement;
const endingScreen = $('screen-ending');
const endingScore = $('ending-score');
const endingPress = $('ending-press');
const titleBest = $('title-best');

const ctx = setupScreen(canvas, $('game'));
const input = new Input();
const hud = new Hud();
const sprites = buildSprites();
const world = new WorldRenderer(ctx, sprites);
introJose.getContext('2d')?.drawImage(sprites.jose.idle.r, 0, 0);

const newStats = (): RunStats => ({ score: 0, hearts: 0, lives: 3, big: false });

let stats = newStats();
let levelIndex = 0;
let game = new Game(LEVELS[0]!, stats);
let state: State = 'title';
/** Reloj de animaciones (brillo de bloques y corazones). */
let animTime = 0;
let stateTime = 0;
let debug = false;

function setState(next: State): void {
  state = next;
  stateTime = 0;
  titleScreen.classList.toggle('hidden', next !== 'title');
  pauseScreen.classList.toggle('hidden', next !== 'paused');
  gameOverScreen.classList.toggle('hidden', next !== 'gameover');
  introScreen.classList.toggle('hidden', next !== 'intro');
  endingScreen.classList.toggle('hidden', next !== 'ending');
  endingPress.classList.add('hidden');
  hud.show(next !== 'title');
}

/** Prepara el nivel y muestra la pantalla "MUNDO × vidas" antes de jugar. */
function loadLevel(index: number): void {
  levelIndex = index;
  game = new Game(LEVELS[index]!, stats);
  introWorld.textContent = game.level.name;
  introLives.textContent = String(stats.lives);
  sound.music(null);
  setState('intro');
}

function startRun(): void {
  stats = newStats();
  loadLevel(0);
}

function recordBest(): void {
  if (stats.score > loadBest()) saveBest(stats.score);
  titleBest.textContent = String(loadBest()).padStart(6, '0');
}

function backToTitle(): void {
  stats = newStats();
  levelIndex = 0;
  game = new Game(LEVELS[0]!, stats);
  sound.music(null);
  setState('title');
}

/** Jose perdió una vida: repetir el nivel o terminar la partida. */
function onDeath(): void {
  stats.lives--;
  stats.big = false;
  if (stats.lives > 0) {
    loadLevel(levelIndex);
    return;
  }
  recordBest();
  setState('gameover');
  sound.music('gameover');
}

function update(dt: number): void {
  if (state !== 'paused') animTime += dt;
  stateTime += dt;
  switch (state) {
    case 'title': {
      // El nivel se desliza lento detrás del título y vuelve a empezar al llegar al final
      const cam = game.camera;
      cam.prevX = cam.x;
      cam.x += 24 * dt;
      if (cam.x >= game.level.map.pixelWidth - SCREEN_W) cam.reset();
      if (input.wasPressed('start') || input.wasPressed('jump')) startRun();
      break;
    }
    case 'intro':
      if (stateTime > INTRO_SECONDS) {
        setState('playing');
        sound.music(game.themeSong);
      }
      break;
    case 'playing':
      if (input.wasPressed('start') && game.phase === 'play' && !game.player.dying) {
        setState('paused');
        sound.setPaused(true);
        sound.sfx('pause');
        break;
      }
      game.update(dt, input);
      if (game.outcome === 'dead') onDeath();
      else if (game.outcome === 'clear') loadLevel(Math.min(levelIndex + 1, LEVELS.length - 1));
      else if (game.outcome === 'rescued') {
        recordBest();
        endingScore.textContent = String(stats.score).padStart(6, '0');
        setState('ending');
      }
      break;
    case 'ending':
      // La escena sigue: los corazones continúan subiendo detrás del mensaje
      game.update(dt, input);
      if (stateTime > ENDING_MIN_SECONDS) {
        endingPress.classList.remove('hidden');
        if (input.wasPressed('start') || input.wasPressed('jump')) backToTitle();
      }
      break;
    case 'gameover':
      if (stateTime > GAME_OVER_SECONDS) backToTitle();
      break;
    case 'paused':
      if (input.wasPressed('start')) {
        setState('playing');
        sound.setPaused(false);
      }
      break;
  }
  input.endTick();
}

function render(alpha: number): void {
  // Pausado no hay tick nuevo: dibujar en la posición actual
  const a = state === 'paused' ? 1 : alpha;
  game.render(ctx, sprites, world, a, animTime, state !== 'title');

  if (debug) {
    const p = game.player;
    const camX = Math.round(game.camera.lerp(a));
    ctx.strokeStyle = '#00ff88';
    ctx.strokeRect(Math.round(p.lerpX(a)) - camX + 0.5, Math.round(p.lerpY(a)) + 0.5, p.w - 1, p.h - 1);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText(`x ${p.x.toFixed(0)} tx ${Math.floor(p.x / 16)} vx ${p.vx.toFixed(0)} vy ${p.vy.toFixed(0)}`, 4, 232);
    ctx.fillText(`vidas ${stats.lives} fase ${game.phase}`, 4, 222);
  }

  if (state !== 'title') hud.update({ score: stats.score, hearts: stats.hearts, world: game.level.name, time: game.time });
}

// El audio solo puede empezar después de un gesto del usuario
for (const ev of ['keydown', 'pointerdown'] as const) window.addEventListener(ev, () => sound.unlock());
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') sound.toggleMute();
});

// Controles táctiles: cada botón mantiene su acción mientras esté presionado
for (const btn of document.querySelectorAll<HTMLButtonElement>('#touch button[data-action]')) {
  const action = btn.dataset.action as Action;
  const source = `touch-${action}`;
  const release = () => {
    btn.classList.remove('pressed');
    input.release(action, source);
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* algunos navegadores no permiten capturar este puntero: el botón igual funciona */
    }
    btn.classList.add('pressed');
    input.press(action, source);
  });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
}

// Tocar la pantalla del juego sirve para empezar y para salir del final
$('game').addEventListener('pointerdown', () => {
  if (state === 'title' || state === 'ending') input.press('start', 'tap');
});
window.addEventListener('pointerup', () => input.release('start', 'tap'));

if (import.meta.env.DEV) {
  window.addEventListener('keydown', (e) => {
    // H: hitbox y datos de Jose
    if (e.code === 'KeyH') debug = !debug;
    // N: saltar cerca del final del nivel (bandera o Yazmín) para probar las transiciones
    if (e.code === 'KeyN' && state === 'playing' && game.phase === 'play') {
      const goal = game.level.flag?.tx ?? (game.princess ? game.princess.x / TILE : game.level.map.width - 8);
      const p = game.player;
      const tx = Math.floor(goal - 10);
      // Aparecer sobre el primer bloque sólido debajo del techo (fila 3 en adelante)
      let ty = 3;
      while (ty < game.level.map.height - 1 && !game.level.map.isSolid(tx, ty + 1)) ty++;
      p.x = p.prevX = tx * TILE + 2;
      p.y = p.prevY = (ty + 1) * TILE - p.h;
      p.vx = p.vy = 0;
      game.camera.reset(Math.max(0, p.x - 100));
      game.enemies.forEach((en) => (en.removed = en.x < p.x + 200));
    }
  });
  // Acceso desde la consola para pruebas
  Object.defineProperty(window, '__game', {
    get: () => ({ game, stats, state, levelIndex, sound, jose: game.player, camera: game.camera }),
  });
}

titleBest.textContent = String(loadBest()).padStart(6, '0');
setState('title');
new GameLoop({ update, render }).start();
