// PNG-иконки приложения из одного источника — assets/icon.svg.
//
// resvg не входит в зависимости проекта, его ставят во временную папку:
//   npm install --prefix <папка> @resvg/resvg-js
//   NODE_PATH=<папка>/node_modules node scripts/build-icons.cjs      (из папки mobile)
//
// Что получается:
//   icon.png          1024 — iOS и основная иконка: с фоном, без прозрачности
//   adaptive-icon.png 1024 — Android: автобус без фона в безопасной зоне, фон — backgroundColor в app.json
//   splash-icon.png   1024 — экран запуска: автобус без фона, фон — в плагине expo-splash-screen
//   favicon.png         48 — веб-версия

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ASSETS = path.join(__dirname, '..', 'assets');
const BG_RECT = /<rect width="1024" height="1024" fill="#BFE3FA"\/>/;

// Android обрезает передний слой маской: гарантированно виден только круг 66 из 108 dp (~61% холста).
// Автобус с тенью и зеркалами занимает ~730×700, его центр — (527, 515). При 0.7 самая дальняя
// точка ~300 px от центра при радиусе круга 313 px; больше 0.73 начнёт срезать зеркала.
const SAFE_SCALE = 0.7;
const BUS_CENTER = [527, 515];

function render(svg, size, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(ASSETS, file), png);
  console.log(`${file}: ${size}×${size}, ${png.length} байт`);
}

const full = fs.readFileSync(path.join(ASSETS, 'icon.svg'), 'utf8');
if (!BG_RECT.test(full)) {
  throw new Error('в icon.svg не найден прямоугольник фона — обновите BG_RECT');
}
const bus = full.replace(BG_RECT, '');
const adaptive = bus.replace(
  /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
  (_, open, body, close) =>
    `${open}<g transform="translate(512 512) scale(${SAFE_SCALE}) translate(${-BUS_CENTER[0]} ${-BUS_CENTER[1]})">${body}</g>${close}`,
);

render(full, 1024, 'icon.png');
render(adaptive, 1024, 'adaptive-icon.png');
render(bus, 1024, 'splash-icon.png');
render(full, 48, 'favicon.png');
