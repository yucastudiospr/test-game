# Super Jose & Yazmín

Plataformero estilo NES inspirado en el Super Mario Bros original, con toques rosados.
Jose recorre siete niveles (mundos 1-1 a 1-4 y 2-1 a 2-3) para rescatar a la Princesa Yazmín,
que espera en el castillo del Rey Koopón al final del 2-3.

Hecho con **TypeScript + Canvas 2D + HTML/CSS** (sin motor ni dependencias de runtime) y **Vite**.
Todo el arte (pixel art) y la música (chiptune con Web Audio) son originales.

## Correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ (se puede subir a cualquier hosting estático)
```

## Controles

| Acción      | Teclado              | Táctil |
| ----------- | -------------------- | ------ |
| Moverse     | ← → (o A / D)        | ◀ ▶    |
| Agacharse   | ↓ (Jose grande)      | ▼      |
| Saltar      | Z / Espacio / K      | A      |
| Correr      | X / Shift / J        | B      |
| Pausa       | Enter / P            | II     |
| Sonido      | M                    | —      |
| Botones     | C                    | botón CONTROLES |

Los botones en pantalla se muestran por defecto en dispositivos táctiles; el botón **CONTROLES**
(arriba a la derecha) o la tecla **C** los muestran u ocultan en cualquier dispositivo y la
preferencia se guarda en el navegador. El juego se escala para llenar la pantalla y acomoda los
botones debajo o a los lados, según lo que lo deje más grande.

La primera vez, la historia sube por la pantalla al estilo de las películas del espacio (Enter,
Z o un toque la saltan). Después aparece el **mapa**: se puede jugar cualquier nivel, en el orden
que se quiera (flechas o un toque para elegir, Enter o un segundo toque para jugar). Los niveles
completados se marcan con un corazón y guardan su mejor puntuación; el progreso, el récord y la
historia vista quedan en el navegador (`localStorage`).

Solo en desarrollo: **H** muestra la hitbox, **N** salta cerca del final del nivel.

## Estructura

```
src/
├── main.ts          máquina de estados: título, historia, mapa, intro, juego, pausa, game over, final
├── game.ts          una partida dentro de un nivel: colisiones, puntos, bandera, rescate
├── config.ts        resolución (256×240), tamaño de tile, tiempos
├── engine/          loop de paso fijo, input, cámara, física AABB, audio, escalado
├── entities/        Jose, goomba, koopa, corazones, hongo, partículas, Yazmín
├── graphics/        paleta, sprites en texto → canvas, fondo, renderer de tiles
├── ui/              hud.ts (HUD y récord), worldmap.ts (mapa de niveles), progress.ts (progreso guardado)
└── world/           tiles, parser de niveles, levels.ts (la lista) y los siete niveles
```

Los niveles son texto: cada carácter es un tile (ver la leyenda en `src/world/tiles.ts` y `src/world/level.ts`).
