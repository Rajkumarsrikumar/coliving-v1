#!/usr/bin/env node
/**
 * Converts logo.png to WebP format and creates a smaller version for responsive delivery.
 * Run: node scripts/optimize-logo.mjs
 */
import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const logoPath = join(publicDir, 'logo.png');

if (!existsSync(logoPath)) {
  console.log('logo.png not found in public folder, skipping.');
  process.exit(0);
}

async function optimize() {
  const input = sharp(logoPath);
  const meta = await input.metadata();
  const { width } = meta;

  // Display size is ~253px, create 1x and 2x for retina
  const sizes = [256, 512];
  const displayWidth = Math.min(256, width);

  for (const size of sizes) {
    const outPath = join(publicDir, `logo-${size}.webp`);
    await input
      .clone()
      .resize(size)
      .webp({ quality: 85 })
      .toFile(outPath);
    console.log(`Created ${outPath}`);
  }

  // Full-size WebP for fallback
  await input
    .webp({ quality: 85 })
    .toFile(join(publicDir, 'logo.webp'));
  console.log('Created logo.webp');
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
