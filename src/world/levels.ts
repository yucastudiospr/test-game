import type { LevelData } from './level';
import { LEVEL_1_1 } from './level1-1';
import { LEVEL_1_2 } from './level1-2';
import { LEVEL_1_3 } from './level1-3';
import { LEVEL_1_4 } from './level1-4';
import { LEVEL_1_5 } from './level1-5';
import { LEVEL_1_6 } from './level1-6';
import { LEVEL_1_7 } from './level1-7';
import { LEVEL_2_1 } from './level2-1';
import { LEVEL_2_2 } from './level2-2';
import { LEVEL_2_3 } from './level2-3';
import { LEVEL_2_4 } from './level2-4';
import { LEVEL_2_5 } from './level2-5';
import { LEVEL_2_6 } from './level2-6';
import { LEVEL_2_7 } from './level2-7';
import { LEVEL_3_1 } from './level3-1';
import { LEVEL_3_2 } from './level3-2';
import { LEVEL_3_3 } from './level3-3';
import { LEVEL_3_4 } from './level3-4';
import { LEVEL_3_5 } from './level3-5';
import { LEVEL_3_6 } from './level3-6';
import { LEVEL_3_7 } from './level3-7';

export const WORLDS = 3;
export const LEVELS_PER_WORLD = 7;

/** Todos los niveles en orden (3 mundos de 7). El último termina con el rescate de Yazmín. */
export const LEVELS: readonly LevelData[] = [LEVEL_1_1, LEVEL_1_2, LEVEL_1_3, LEVEL_1_4, LEVEL_1_5, LEVEL_1_6, LEVEL_1_7, LEVEL_2_1, LEVEL_2_2, LEVEL_2_3, LEVEL_2_4, LEVEL_2_5, LEVEL_2_6, LEVEL_2_7, LEVEL_3_1, LEVEL_3_2, LEVEL_3_3, LEVEL_3_4, LEVEL_3_5, LEVEL_3_6, LEVEL_3_7];
