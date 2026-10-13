/**
 * Prueba automática de los niveles: un bot con la física real del juego camina a
 * la derecha, salta ante muros, huecos y enemigos, y reporta dónde se atasca o cae.
 * Uso: node scripts/playtest.mjs [nombre-de-nivel ...]   (sin argumentos: todos)
 * Opciones: --no-invincible (los enemigos también cuentan), --run (corre siempre)
 */
import { createServer } from 'vite';

// Lo mínimo del navegador que el motor toca al cargarse
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ getContext: () => null }) };
globalThis.requestAnimationFrame = () => 0;

const args = process.argv.slice(2);
const invincible = !args.includes('--no-invincible');
const run = args.includes('--run');
const names = args.filter((a) => !a.startsWith('--'));
const trace = args.includes('--trace');
const diag = args.includes('--diag');

const vite = await createServer({ server: { middlewareMode: true }, logLevel: 'error', appType: 'custom' });
const { LEVELS } = await vite.ssrLoadModule('/src/world/levels.ts');
const { Game } = await vite.ssrLoadModule('/src/game.ts');
const TILE = 16;

function play(level, opts) {
  const game = new Game(level, { score: 0, hearts: 0, lives: 3, big: !!opts.big });
  const map = game.level.map;
  let pressedJump = false;
  let holdJump = false;
  let holdTicks = 0;
  let t = 0;
  let lastX = 0;
  let lastProgress = 0;
  let jumps = 0;
  const controls = {
    isDown: (a) => a === 'right' || (a === 'run' && opts.run) || (a === 'jump' && holdJump),
    wasPressed: (a) => a === 'jump' && pressedJump,
    axisX: () => 1,
  };
  const dt = 1 / 60;
  const ring = [];
  while (t < 300) {
    const p = game.player;
    if (opts.invincible) p.invincible = 10;
    pressedJump = false;
    const footRow = Math.floor((p.y + p.h - 1) / TILE);
    // Columna por delante del borde derecho de Jose: medio tile si va a buen paso; si va lento
    // (acaba de chocar con un escalón), espera hasta el borde para tomar velocidad antes de saltar
    const look = Math.abs(p.vx) >= 85 ? 8 : 1;
    const nextCol = Math.floor((p.x + p.w + look) / TILE);
    // Altura del muro de adelante (tiles sólidos desde los pies hacia arriba)
    let wallH = 0;
    while (wallH < 6 && map.isSolid(nextCol, footRow - wallH)) wallH++;
    const wall = wallH > 0;
    // Pozo real: nada sólido en toda la columna de adelante por debajo de los pies
    let gapAhead = p.onGround;
    for (let ty = footRow + 1; ty < map.height && gapAhead; ty++) if (map.isSolid(nextCol, ty)) gapAhead = false;
    // Ancho del hueco y altura de donde se aterriza (para dosificar el salto)
    let pitW = 0;
    let rise = 0;
    if (gapAhead) {
      for (let c = nextCol; c < nextCol + 8; c++) {
        let top = -1;
        for (let ty = Math.max(0, footRow - 4); ty < map.height; ty++) if (map.isSolid(c, ty)) { top = ty; break; }
        if (top === -1) { pitW++; continue; }
        rise = footRow + 1 - top;
        break;
      }
    }
    // Invencible: los enemigos no importan (se prueba solo la geometría); si no, salta sobre ellos
    let enemyNear = false;
    for (const e of opts.invincible ? [] : game.enemies) {
      if (!e.active || !e.alive || e.removed) continue;
      const dx = e.x - (p.x + p.w);
      if (dx > -4 && dx < 30 && Math.abs(e.y - p.y) < 28) enemyNear = true;
    }
    if (p.onGround && (wall || gapAhead || enemyNear)) {
      pressedJump = true;
      holdJump = true;
      // Escalón de 1: toque corto; de 2: medio; huecos, enemigos y muros altos: salto completo
      // Un escalón bajo delante manda (hay que subirlo, no sobrevolarlo); huecos y muros altos, salto completo
      holdTicks = wallH === 1 ? 0 : wallH === 2 ? 8 : wallH >= 3 ? 99 : gapAhead ? (rise >= 2 || pitW >= 3 ? 99 : pitW === 2 ? 16 : 4) : 0;
      jumps++;
    }
    game.update(dt, controls);
    // Suelta el salto al cumplir los ticks del obstáculo o al empezar a caer
    if (holdJump && !pressedJump) {
      holdTicks--;
      if (holdTicks <= 0 || p.vy >= 0) holdJump = false;
    }
    t += dt;
    if (pressedJump || Math.round(t * 60) % 6 === 0) {
      const line = `  t=${t.toFixed(2)} x=${p.x.toFixed(0)} tx=${(p.x / TILE).toFixed(1)} y=${p.y.toFixed(0)} ty=${(p.y / TILE).toFixed(1)} vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(0)} ground=${p.onGround ? 1 : 0}${pressedJump ? ` JUMP(${holdTicks})` : ''}${wall ? ` wall${wallH}` : ''}${gapAhead ? ` gap${pitW}r${rise}` : ''}${enemyNear ? ' enemy' : ''}`;
      if (opts.trace) console.log(line);
      ring.push(line);
      if (ring.length > 16) ring.shift();
    }
    if (p.y > map.pixelHeight && opts.diag) {
      const tx = Math.floor(p.x / TILE);
      console.log(`--- ${level.name}: cae en la columna ${tx}; tramo ${tx - 16}..${tx + 8} (filas 3-14)`);
      for (let ty = 3; ty < map.height; ty++) {
        let row = '';
        for (let cx = tx - 16; cx <= tx + 8; cx++) row += cx < 0 || cx >= map.width ? ' ' : level.rows[ty][cx];
        console.log(`  ${String(ty).padStart(2)} ${row}`);
      }
      console.log(ring.join('\n'));
      opts.diag = false;
    }
    if (p.x > lastX + 4) {
      lastX = p.x;
      lastProgress = t;
    }
    if (game.outcome || game.phase !== 'play') break;
    if (t - lastProgress > 4) return { result: 'ATASCADO', tx: Math.floor(p.x / TILE), t };
  }
  const p = game.player;
  if (game.outcome === 'dead' || p.dying) {
    const cause = p.y > map.pixelHeight ? 'hueco' : game.time === 0 ? 'tiempo' : 'enemigo';
    return { result: 'MUERE', cause, tx: Math.floor(p.x / TILE), t };
  }
  if (game.phase !== 'play' || game.outcome) return { result: 'ok', t, jumps };
  return { result: 'TIEMPO', tx: Math.floor(p.x / TILE), t };
}

let failed = 0;
for (const level of LEVELS) {
  if (names.length && !names.includes(level.name)) continue;
  const r = play(level, { invincible, run, trace, diag });
  if (r.result !== 'ok') failed++;
  const where = r.tx !== undefined ? ` en la columna ${r.tx}` : '';
  console.log(`${level.name.padEnd(4)} ${r.result.padEnd(8)} ${r.cause ?? ''}${where}  (${r.t.toFixed(1)} s${r.jumps ? `, ${r.jumps} saltos` : ''})`);
}
await vite.close();
process.exit(failed ? 1 : 0);
