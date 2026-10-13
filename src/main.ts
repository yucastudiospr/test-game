import { SCREEN_H, SCREEN_W, TILE } from './config';
import { sound } from './engine/audio';
import { GameLoop } from './engine/loop';
import { Input, type Action } from './engine/input';
import { setupScreen } from './engine/screen';
import { Game, type RunStats } from './game';
import { WorldRenderer } from './graphics/renderer';
import { buildSprites } from './graphics/sprites';
import { Hud, loadBest, saveBest } from './ui/hud';
import { loadProgress, markCleared, saveProgress } from './ui/progress';
import { WorldMap } from './ui/worldmap';
import { LEVELS } from './world/levels';

type State = 'title' | 'crawl' | 'map' | 'intro' | 'playing' | 'paused' | 'gameover' | 'ending';
const GAME_OVER_SECONDS = 3.5;
/** Cuánto dura la pantalla "MUNDO 1-1 × vidas" antes de cada intento. */
const INTRO_SECONDS = 2.5;
/** Tras el mensaje de Yazmín, cuánto esperar antes de aceptar ENTER. */
const ENDING_MIN_SECONDS = 3;
/** Intro: segundos del "Hace mucho tiempo..." y velocidad del texto (px lógicos por segundo). */
const CRAWL_PRETITLE_SECONDS = 3.5;
const CRAWL_SPEED = 20;

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
const crawlScreen = $('screen-crawl');
const crawlPretitle = $('crawl-pretitle');
const crawlStage = $('crawl-stage');
const crawlText = $('crawl-text');
const mapScreen = $('screen-map');
const mapName = $('map-name');
const mapBest = $('map-best');
const endingScreen = $('screen-ending');
const endingScore = $('ending-score');
const endingPress = $('ending-press');
const titleBest = $('title-best');

const screen = setupScreen(canvas, $('game'));
const ctx = screen.ctx;
const input = new Input();
const hud = new Hud();
const sprites = buildSprites();
const world = new WorldRenderer(ctx, sprites);
introJose.getContext('2d')?.drawImage(sprites.jose.idle.r, 0, 0);

const newStats = (): RunStats => ({ score: 0, hearts: 0, lives: 3, big: false });

const progress = loadProgress();
const worldMap = new WorldMap(LEVELS);
worldMap.select(progress.selected, true);
/** Nodo tocado en el mapa (pantalla táctil o ratón), pendiente de procesar en el próximo tick. */
let mapTap: number | null = null;

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
  crawlScreen.classList.toggle('hidden', next !== 'crawl');
  mapScreen.classList.toggle('hidden', next !== 'map');
  crawlPretitle.classList.remove('show');
  crawlStage.classList.remove('show');
  endingPress.classList.add('hidden');
  hud.show(next !== 'title' && next !== 'crawl' && next !== 'map');
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

/** Partida nueva: la historia (solo la primera vez) y luego el mapa para elegir nivel. */
function startRun(): void {
  stats = newStats();
  levelIndex = 0;
  game = new Game(LEVELS[0]!, stats);
  if (progress.introSeen) {
    enterMap();
    return;
  }
  setState('crawl');
  sound.music('crawl');
}

function finishCrawl(): void {
  progress.introSeen = true;
  saveProgress(progress);
  enterMap();
}

/** Mapa de niveles. Las vidas y los puntos de la partida se conservan. */
function enterMap(): void {
  mapTap = null;
  setState('map');
  refreshMapText();
  if (sound.playing !== 'overworld') sound.music('overworld');
}

function refreshMapText(): void {
  const level = LEVELS[worldMap.selected]!;
  mapName.textContent = `MUNDO ${level.name}`;
  const best = progress.cleared[level.name];
  mapBest.textContent = best === undefined ? 'SIN COMPLETAR' : `MEJOR ${String(best).padStart(6, '0')}`;
}

function updateMap(dt: number): void {
  worldMap.update(dt);
  let play = false;
  if (mapTap !== null) {
    if (mapTap === worldMap.selected) play = true;
    else worldMap.select(mapTap);
    mapTap = null;
  }
  if (input.wasPressed('left') || input.wasPressed('up')) worldMap.move(-1);
  if (input.wasPressed('right') || input.wasPressed('down')) worldMap.move(1);
  if (input.wasPressed('start') || input.wasPressed('jump')) play = true;
  refreshMapText();
  if (play) {
    progress.selected = worldMap.selected;
    saveProgress(progress);
    loadLevel(worldMap.selected);
  }
}

/** Nivel superado: se guarda y se vuelve al mapa con el siguiente elegido. */
function onClear(): void {
  markCleared(progress, game.level.name, stats.score);
  worldMap.select(Math.min(levelIndex + 1, LEVELS.length - 1));
  progress.selected = worldMap.selected;
  saveProgress(progress);
  enterMap();
}

/** Intro: "Hace mucho tiempo..." y después el texto subiendo en perspectiva. */
function updateCrawl(): void {
  const t = stateTime;
  if (t < CRAWL_PRETITLE_SECONDS) {
    crawlPretitle.classList.toggle('show', t > 0.3 && t < CRAWL_PRETITLE_SECONDS - 0.6);
    return;
  }
  crawlStage.classList.add('show');
  // La escala actual: alto del escenario entre los 240 px lógicos
  const stageH = crawlStage.clientHeight;
  const scale = stageH / SCREEN_H;
  // El texto empieza justo debajo del plano y sube hasta perderse en la distancia
  const y = -(t - CRAWL_PRETITLE_SECONDS) * CRAWL_SPEED * scale;
  crawlText.style.setProperty('--y', `${y}px`);
  if (y < -(crawlText.offsetHeight + stageH * 0.9)) finishCrawl();
}

/** Cielo nocturno del intro: estrellas rosadas que titilan (posiciones fijas). */
const STARS = Array.from({ length: 70 }, (_, i) => {
  // Generador determinista para que las estrellas no cambien entre frames
  const r = (n: number) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return { x: Math.floor(r(1) * SCREEN_W), y: Math.floor(r(2) * SCREEN_H), phase: r(3) * 6.28, big: r(4) > 0.8 };
});

function renderStars(): void {
  ctx.fillStyle = '#2a0f24';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (const s of STARS) {
    const twinkle = Math.sin(animTime * 2 + s.phase);
    if (twinkle < -0.6) continue;
    ctx.fillStyle = twinkle > 0.4 ? '#fff7fb' : '#ffb6d9';
    if (s.big) {
      ctx.fillRect(s.x - 1, s.y, 3, 1);
      ctx.fillRect(s.x, s.y - 1, 1, 3);
    } else {
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }
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
    case 'crawl':
      if (input.wasPressed('start') || input.wasPressed('jump')) {
        finishCrawl();
        break;
      }
      updateCrawl();
      break;
    case 'map':
      updateMap(dt);
      break;
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
      else if (game.outcome === 'clear') onClear();
      else if (game.outcome === 'rescued') {
        markCleared(progress, game.level.name, stats.score);
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
  if (state === 'crawl') {
    renderStars();
    return;
  }
  if (state === 'map') {
    worldMap.draw(ctx, sprites, progress, animTime);
    return;
  }
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
  if (e.code === 'KeyC') screen.toggleControls();
  if (e.code === 'KeyR') resetGame();
});

/** Reiniciar: vuelve al título desde cualquier estado (también con la tecla R). */
function resetGame(): void {
  if (state === 'title') return;
  if (state === 'playing' || state === 'ending') recordBest();
  sound.setPaused(false);
  input.reset();
  backToTitle();
}

const resetBtn = $('reset-btn');
resetBtn.addEventListener('click', () => {
  resetGame();
  resetBtn.blur();
});
resetBtn.addEventListener('keydown', (e) => e.preventDefault());

// Botón CONTROLES: muestra u oculta los botones en pantalla (también con la tecla C)
const controlsToggle = $('controls-toggle');
controlsToggle.addEventListener('click', () => {
  screen.toggleControls();
  controlsToggle.blur();
});
// Que el botón no robe las teclas del juego (Espacio/Enter lo activarían de nuevo)
controlsToggle.addEventListener('keydown', (e) => e.preventDefault());

// Si se ocultan los controles con un botón presionado, soltarlo
new MutationObserver(() => {
  if (!screen.controlsVisible()) {
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#touch button[data-action]')) {
      btn.classList.remove('pressed');
      input.release(btn.dataset.action as Action, `touch-${btn.dataset.action}`);
    }
  }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

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

// Tocar la pantalla del juego sirve para empezar, salir del final y elegir nivel en el mapa
$('game').addEventListener('pointerdown', (e) => {
  if (state === 'map') {
    const r = canvas.getBoundingClientRect();
    mapTap = worldMap.nodeAt(((e.clientX - r.left) / r.width) * SCREEN_W, ((e.clientY - r.top) / r.height) * SCREEN_H);
    return;
  }
  if (state === 'title' || state === 'crawl' || state === 'ending' || state === 'paused') input.press('start', 'tap');
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
