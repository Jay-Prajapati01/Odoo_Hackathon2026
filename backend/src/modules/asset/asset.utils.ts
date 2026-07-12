import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { IAssetLocation } from './asset.model';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const assetUploadsRoot = path.join(uploadsRoot, 'assets');
const qrCodeDir = path.join(assetUploadsRoot, 'qrcodes');
const barcodeDir = path.join(assetUploadsRoot, 'barcodes');
const imageDir = path.join(assetUploadsRoot, 'images');
const documentDir = path.join(assetUploadsRoot, 'documents');

const ensureDirectory = (dirPath: string): void => {
  fs.mkdirSync(dirPath, { recursive: true });
};

[uploadsRoot, assetUploadsRoot, qrCodeDir, barcodeDir, imageDir, documentDir].forEach(ensureDirectory);

const toPublicUploadPath = (absolutePath: string): string =>
  `/${path.relative(process.cwd(), absolutePath).replace(/\\/g, '/')}`;

const writeFile = (directory: string, fileName: string, content: string): string => {
  ensureDirectory(directory);
  const absolutePath = path.join(directory, fileName);
  fs.writeFileSync(absolutePath, content, 'utf8');
  return toPublicUploadPath(absolutePath);
};

const buildHashBits = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const sanitizeFileName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file';

export const generateAssetTag = (sequenceValue: number): string => `AF-${sequenceValue.toString().padStart(6, '0')}`;

export const generateQrCodeAsset = (assetTag: string): string => {
  const size = 21;
  const cell = 8;
  const padding = 12;
  const bits = buildHashBits(assetTag.repeat(8));
  let bitIndex = 0;
  const cells: string[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);

      let fill = false;
      if (inFinder) {
        const finderRow = row < 7 ? row : row - (size - 7);
        const finderCol = col < 7 ? col : col - (size - 7);
        const border = finderRow === 0 || finderRow === 6 || finderCol === 0 || finderCol === 6;
        const center = finderRow >= 2 && finderRow <= 4 && finderCol >= 2 && finderCol <= 4;
        fill = border || center;
      } else {
        const nibble = parseInt(bits[bitIndex % bits.length], 16);
        fill = (nibble & 1) === 1;
        bitIndex += 1;
      }

      if (fill) {
        const x = padding + col * cell;
        const y = padding + row * cell;
        cells.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#111827" />`);
      }
    }
  }

  const width = size * cell + padding * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width + 28}" viewBox="0 0 ${width} ${
    width + 28
  }"><rect width="100%" height="100%" fill="#ffffff" />${cells.join('')}<text x="${width / 2}" y="${
    width + 18
  }" text-anchor="middle" font-family="monospace" font-size="12" fill="#111827">${assetTag}</text></svg>`;

  return writeFile(qrCodeDir, `${sanitizeFileName(assetTag)}.svg`, svg);
};

export const generateBarcodeAsset = (assetTag: string): string => {
  const bits = assetTag
    .split('')
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');

  const barWidth = 2;
  const height = 90;
  const quietZone = 18;
  const bars: string[] = [];

  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] === '1') {
      const x = quietZone + index * barWidth;
      const width = index % 5 === 0 ? barWidth * 2 : barWidth;
      bars.push(`<rect x="${x}" y="10" width="${width}" height="${height}" fill="#111827" />`);
    }
  }

  const width = bits.length * barWidth + quietZone * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="130" viewBox="0 0 ${width} 130"><rect width="100%" height="100%" fill="#ffffff" />${bars.join(
    ''
  )}<text x="${width / 2}" y="120" text-anchor="middle" font-family="monospace" font-size="14" fill="#111827">${assetTag}</text></svg>`;

  return writeFile(barcodeDir, `${sanitizeFileName(assetTag)}.svg`, svg);
};

export const summarizeLocation = (location?: IAssetLocation): string | undefined => {
  if (!location) return undefined;
  const parts = [location.building, location.floor, location.room, location.shelf, location.section, location.label]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : undefined;
};

export const getAssetImageDirectory = (): string => imageDir;
export const getAssetDocumentDirectory = (): string => documentDir;
