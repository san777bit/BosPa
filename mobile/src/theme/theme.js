// Необрутализм: плоские плашки, толстая обводка и жёсткая тень без размытия
// (тень рисует BrutalBox, см. components/Brutal.js).
//
// Иерархия цветов — у каждого цвета одно значение:
//   status   — загруженность: свободно / плотно / битком. Только данные о салоне.
//   action   — главное действие и выбранный элемент: инверсия (чёрное в светлой теме, белое в тёмной).
//   reward   — баллы, монета, магазин, «+10 B».
//   live     — живые данные: карта, борта на линии.
//   transit  — тип транспорта на номере маршрута.
//   остальное — нейтральные поверхности: bg → surface → surfaceAlt.
// Иерархия глубины: обводка outline и тень — только у плашек верхнего уровня и кнопок;
// вложенные панели — тонкая рамка line без тени (BrutalBox flat).

// Шрифты подключаются в App.js через useFonts; имена — экспорт @expo-google-fonts/*
export const fonts = {
  display: 'Unbounded_900Black',   // крупные заголовки, цифры ETA
  displayBold: 'Unbounded_700Bold', // номера маршрутов, мелкие заголовки
  body: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
  bodyBold: 'Onest_700Bold',
  bodyHeavy: 'Onest_800ExtraBold',
};

const light = {
  isDark: false,
  // нейтральные поверхности
  bg: '#BFE3FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF5FA',
  outline: '#111111',
  line: '#C9D6E0',
  borderWidth: 2.5,
  text: '#111111',
  textSecondary: '#3D4451',
  textMuted: '#6B7280',
  onColor: '#111111',      // текст на любой цветной плашке
  // роли
  action: '#111111',
  onAction: '#FFFFFF',
  reward: '#FFD12A',
  live: '#C4B5FD',
  status: ['#4ADE80', '#FFB547', '#FF6B6B'],
  statusNone: '#E5E7EB',
  transit: { trolleybus: '#7CC8FF', bus: '#F9A8D4' },
  // нижнее меню
  navBg: '#111111',
  navActive: '#FFFFFF',
  navIcon: '#9CA3AF',
  navIconActive: '#111111',
  statusBarStyle: 'dark-content',
  mapFilter: 'none',
};

// Тёмная тема: обводка остаётся чёрной, а фон светлее чёрного, чтобы тени читались.
// Пастель приглушена, чтобы цветные плашки не «светились» на тёмном.
const dark = {
  isDark: true,
  bg: '#262A31',
  surface: '#343944',
  surfaceAlt: '#3E4451',
  outline: '#0B0C0F',
  line: '#4C5361',
  borderWidth: 2.5,
  text: '#F3F4F6',
  textSecondary: '#C3C8D2',
  textMuted: '#8F96A3',
  onColor: '#111111',
  action: '#F3F4F6',
  onAction: '#111111',
  reward: '#EBC43A',
  live: '#AE9FF0',
  status: ['#43C878', '#EDA544', '#EA6363'],
  statusNone: '#9AA1AD',
  transit: { trolleybus: '#6CB6EA', bus: '#E595BE' },
  navBg: '#0B0C0F',
  navActive: '#F3F4F6',
  navIcon: '#8F96A3',
  navIconActive: '#111111',
  statusBarStyle: 'light-content',
  mapFilter: 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)',
};

export const themes = { light, dark };

export const statusColor = (theme, level) =>
  level === 0 || level === 1 || level === 2 ? theme.status[level] : theme.statusNone;

export const routeColor = (theme, kind) => theme.transit[kind === 'trolleybus' ? 'trolleybus' : 'bus'];

// Для HTML карты (Leaflet внутри WebView/iframe) — цвета светлой темы
export const levelColors = light.status;
export const levelNoneColor = light.statusNone;
export const transitColors = light.transit;
