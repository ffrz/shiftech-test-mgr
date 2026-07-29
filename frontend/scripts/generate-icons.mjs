import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const pngSrc = join(root, '..', 'testify-logo.png');

mkdirSync(publicDir, { recursive: true });

// Flatten transparency to white FIRST, then resize — resizing a still-transparent
// PNG with fit:'contain' before flattening produces black fringing artifacts on
// the padded edges (libvips alpha/RGB compositing quirk on this source image).
const flatBuf = await sharp(readFileSync(pngSrc)).flatten({ background: '#ffffff' }).png().toBuffer();

// ── 1. PWA icons ──
const sizes = [48, 96, 144, 192, 256, 384, 512];
for (const size of sizes) {
  await sharp(flatBuf)
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile(join(publicDir, `pwa-icon-${size}.png`));
}
console.log('Generated PWA icons');

// ── 2. Maskable icon (logo on white square) ──
// Maskable icons get cropped to a circle/rounded-square by the OS launcher, so the
// artwork must fill most of the "safe zone" (inner ~80% of the canvas) or it looks
// like a tiny logo floating in a mostly-empty square once cropped.
const maskableLogoSize = 420; // ~82% of 512 canvas
const maskableOffset = Math.round((512 - maskableLogoSize) / 2);
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .composite([{
    input: await sharp(flatBuf).resize(maskableLogoSize, maskableLogoSize, { fit: 'contain', background: '#ffffff' }).png().toBuffer(),
    top: maskableOffset,
    left: maskableOffset,
  }])
  .png()
  .toFile(join(publicDir, 'pwa-icon-512-maskable.png'));
console.log('Generated maskable icon');

// ── 3. Apple touch icon ──
await sharp(flatBuf)
  .resize(180, 180, { fit: 'contain', background: '#ffffff' })
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('Generated apple touch icon');

// ── 4. favicon.ico (multi-res PNG-in-ICO, from the real logo, kept transparent) ──
const buf = readFileSync(pngSrc);
const icoSizes = [16, 32, 48];
const pngBuffers = [];
for (const size of icoSizes) {
  const png = await sharp(buf)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  pngBuffers.push({ size, png });
}

const headerSize = 6;
const dirEntrySize = 16;
let offset = headerSize + dirEntrySize * pngBuffers.length;

const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngBuffers.length, 4);

const dirEntries = [];
const imageBuffers = [];
for (const { size, png } of pngBuffers) {
  const entry = Buffer.alloc(dirEntrySize);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // size of image data
  entry.writeUInt32LE(offset, 12); // offset of image data
  dirEntries.push(entry);
  imageBuffers.push(png);
  offset += png.length;
}

writeFileSync(join(publicDir, 'favicon.ico'), Buffer.concat([header, ...dirEntries, ...imageBuffers]));
console.log('Generated favicon.ico');

console.log('All assets generated.');
