/** Paleta inspirada en el NES, con el cielo y los bloques en tonos rosados. */
export const PAL = {
  // Cielo de atardecer rosado (en bandas, como las paletas limitadas de la época)
  sky: ['#ffb6d9', '#ffc2df', '#ffcce5', '#ffd6e8'],
  // Cielo de noche (Mundo 3): morados con el horizonte rosado
  nightSky: ['#2a1442', '#3b1d58', '#55286e', '#7a3a84'],
  cloud: '#fff4fa',
  cloudShade: '#e6d5ff',
  cloudOutline: '#b99be8',
  hill: '#f58fb8',
  hillDark: '#d9639a',
  hillOutline: '#8a2a5a',
  bush: '#ff8cc6',

  // Bloques de suelo en coral
  ground: '#e8735a',
  groundLight: '#ffb199',
  groundDark: '#a8402e',
  outline: '#3a0d1c',

  // Ladrillos y bloques duros
  brick: '#f08a78',
  brickLight: '#ffc0b0',
  mortar: '#7a2a2a',
  hard: '#e0609a',
  hardLight: '#ffa6cc',
  hardDark: '#8a2a5a',

  // Bloque "?" (3 tonos para el brillo) y bloque usado
  qShimmer: ['#ff8fc4', '#ff6fb0', '#e8559e'],
  qLight: '#ffd1e6',
  qDark: '#8a2a5a',
  qGlyph: '#fff7fb',
  used: '#b5657f',
  usedLight: '#d98aa3',
  usedDark: '#5a1f35',

  // Tubos magenta
  pipeOutline: '#4a0f30',
  pipeDark: '#a52a6a',
  pipe: '#e0509a',
  pipeLight: '#ff9ccd',
  pipeShine: '#ffe0ef',

  // Asta y bandera
  pole: '#ffe0ef',
  poleEdge: '#c2185b',
  poleBall: '#ff5fa2',
  flag: '#fff7fb',
  flagHeart: '#ff4f9a',

  // Corazones coleccionables (3 tonos para el brillo)
  heart: ['#ff4f9a', '#ff7ab6', '#e0327f'],
  heartOutline: '#6e0f3c',
  heartShine: '#fff0f7',

  // Hongo rosado
  mushroomCap: '#ff5fa2',
  mushroomSpot: '#fff7fb',
  mushroomStem: '#ffe9cf',
  mushroomOutline: '#5a0f30',

  // Goomba (castaña gruñona)
  goomba: '#9b4a3a',
  goombaFace: '#ffd8b0',
  goombaDark: '#2a0f0a',

  // Koopa con caparazón menta (contrasta con el fondo rosado)
  koopaSkin: '#ffcf6b',
  koopaShell: '#3fbf9f',
  koopaShellDark: '#1f7a63',
  koopaFeet: '#b5652a',

  // Tema subterráneo (1-2)
  underBg: '#1d0b22',
  underGround: '#8a5fbf',
  underGroundLight: '#c7a6ff',
  underGroundDark: '#4a2a6e',
  underBrick: '#b56fd0',
  underBrickLight: '#e5b8ff',
  underMortar: '#3b1650',

  // Princesa Yazmín
  yazCrown: '#ffd23f',
  yazJewel: '#ff4f9a',
  yazHair: '#d8401e', // pelirroja
  yazSkin: '#ffe0cc', // piel blanca
  yazDress: '#ff5fa2',
  yazDressLight: '#ffb6d9',
  yazDressDark: '#c2185b',

  // Castillo
  castle: '#f7a1c4',
  castleLight: '#ffd1e6',
  castleMortar: '#9c3d6a',
  castleDark: '#2a0f24',

  // Jose: rojo y azul clásicos para contrastar con el fondo rosado
  joseRed: '#d82800',
  joseBlue: '#2038ec',
  joseSkin: '#a8663e', // moreno
  joseSkinShade: '#7d4526',
  joseHair: '#1a0c06',
  joseShoes: '#5a2a10',

  pink: '#ff5fa2',
  pinkLight: '#ffd1e6',
  white: '#fff7fb',
  black: '#000000',
} as const;
