import { levelColors, levelNoneColor } from './theme';

// Устаревшая палитра для компонентов без пропа theme (карта, индикатор, легенда).
// Цвета загруженности — те же, что у роли status в theme.js.
export const Colors = {
  levelFree: levelColors[0],
  levelMedium: levelColors[1],
  levelFull: levelColors[2],
  levelNone: levelNoneColor,

  white: '#FFFFFF',
  black: '#111111',
  ink: '#111111',
};

export const LEVELS = [
  { id: 0, badge: 'Свободно', hint: 'Есть сидячие места', color: Colors.levelFree, bg: Colors.levelFree },
  { id: 1, badge: 'Плотненько', hint: 'Только стоя, но свободно', color: Colors.levelMedium, bg: Colors.levelMedium },
  { id: 2, badge: 'Не влезешь', hint: 'Салон переполнен', color: Colors.levelFull, bg: Colors.levelFull },
];
