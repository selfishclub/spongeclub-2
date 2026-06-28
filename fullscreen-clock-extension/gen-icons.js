// 의존성 없이 PNG 아이콘 생성 (zlib만 사용) — 스폰지 노란 테마
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makePNG(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  draw(px, size);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function setPx(px, size, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4, af = a / 255;
  px[i]     = Math.round(px[i]     * (1 - af) + r * af);
  px[i + 1] = Math.round(px[i + 1] * (1 - af) + g * af);
  px[i + 2] = Math.round(px[i + 2] * (1 - af) + b * af);
  px[i + 3] = Math.max(px[i + 3], a);
}
function draw(px, size) {
  const c = (size - 1) / 2;
  const radius = size * 0.46;
  const corner = size * 0.24;
  // 둥근 사각형 배경 (스폰지 노랑)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.min(x, size - 1 - x), dy = Math.min(y, size - 1 - y);
      let inside = true;
      if (dx < corner && dy < corner) {
        const ddx = corner - dx, ddy = corner - dy;
        inside = ddx * ddx + ddy * ddy <= corner * corner;
      }
      if (inside) setPx(px, size, x, y, 255, 200, 0, 255); // #FFC800
    }
  }
  // 시계 테두리 원 (잉크)
  const ring = radius * 0.62, thick = Math.max(1, size * 0.05);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (Math.abs(d - ring) <= thick) setPx(px, size, x, y, 58, 46, 0, 255);
    }
  }
  // 시계 바늘
  const hand = (angle, len, w) => {
    for (let tt = 0; tt <= len; tt += 0.5) {
      const hx = c + Math.cos(angle) * tt, hy = c + Math.sin(angle) * tt;
      for (let oy = -w; oy <= w; oy++)
        for (let ox = -w; ox <= w; ox++)
          setPx(px, size, Math.round(hx + ox), Math.round(hy + oy), 58, 46, 0, 255);
    }
  };
  hand(-Math.PI / 2, ring * 0.55, Math.max(0, size * 0.02));
  hand(Math.PI / 6, ring * 0.4, Math.max(0, size * 0.02));
}

const outDir = path.join(__dirname, "icons");
fs.mkdirSync(outDir, { recursive: true });
[16, 48, 128].forEach((s) => {
  fs.writeFileSync(path.join(outDir, `icon${s}.png`), makePNG(s, draw));
  console.log(`icons/icon${s}.png 생성됨`);
});
