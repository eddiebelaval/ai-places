/**
 * Canvas Export Service
 * Handles exporting canvas state to PNG and uploading to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BITS_PER_PIXEL } from '@x-place/shared';
import { COLOR_PALETTE_RGBA } from '@x-place/shared';

// Use service role for server-side storage operations
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Unpack 4-bit packed canvas data to 1-byte per pixel
 */
function unpackCanvasData(packedData: Uint8Array): Uint8Array {
  const unpacked = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
  for (let i = 0; i < packedData.length; i++) {
    const byte = packedData[i];
    unpacked[i * 2] = (byte >> 4) & 0x0f;
    unpacked[i * 2 + 1] = byte & 0x0f;
  }
  return unpacked;
}

/**
 * Convert color indices to RGBA pixel data
 */
function colorIndicesToRGBA(colorIndices: Uint8Array): Uint8Array {
  const rgba = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
  for (let i = 0; i < colorIndices.length; i++) {
    const colorIndex = colorIndices[i];
    const color = COLOR_PALETTE_RGBA[colorIndex] ?? COLOR_PALETTE_RGBA[0];
    const offset = i * 4;
    rgba[offset] = color.r;
    rgba[offset + 1] = color.g;
    rgba[offset + 2] = color.b;
    rgba[offset + 3] = 255; // Full opacity
  }
  return rgba;
}

/**
 * Create PNG from RGBA data using pure JavaScript (no native dependencies)
 * Uses a simple uncompressed PNG format
 */
function createPNG(width: number, height: number, rgbaData: Uint8Array): Uint8Array {
  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk - raw image data with filter bytes
  const rawData = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const dstOffset = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstOffset] = rgbaData[srcOffset];
      rawData[dstOffset + 1] = rgbaData[srcOffset + 1];
      rawData[dstOffset + 2] = rgbaData[srcOffset + 2];
      rawData[dstOffset + 3] = rgbaData[srcOffset + 3];
    }
  }

  // Compress with deflate (using zlib format)
  const compressed = deflateRaw(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', new Uint8Array(0));

  // Combine all chunks
  const png = new Uint8Array(
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length
  );
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);

  return png;
}

/**
 * Create a PNG chunk with CRC
 */
function createChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);

  // Length
  view.setUint32(0, data.length, false);

  // Type
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }

  // Data
  chunk.set(data, 8);

  // CRC32
  const crc = crc32(chunk.slice(4, 8 + data.length));
  view.setUint32(8 + data.length, crc, false);

  return chunk;
}

/**
 * CRC32 calculation for PNG chunks
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  const table = getCRC32Table();

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

let crc32Table: Uint32Array | null = null;
function getCRC32Table(): Uint32Array {
  if (crc32Table) return crc32Table;

  crc32Table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crc32Table[n] = c;
  }
  return crc32Table;
}

/**
 * Simple deflate compression (zlib format)
 * For production, consider using pako or similar library
 */
function deflateRaw(data: Uint8Array): Uint8Array {
  // Zlib header: CM=8, CINFO=7, FCHECK, no dict, max compression
  const zlibHeader = new Uint8Array([0x78, 0x9c]);

  // Store uncompressed using non-final blocks
  const blocks: Uint8Array[] = [];
  const maxBlockSize = 65535;

  for (let i = 0; i < data.length; i += maxBlockSize) {
    const isLast = i + maxBlockSize >= data.length;
    const blockData = data.slice(i, Math.min(i + maxBlockSize, data.length));
    const block = new Uint8Array(5 + blockData.length);

    // Block header: BFINAL=isLast, BTYPE=00 (stored)
    block[0] = isLast ? 1 : 0;

    // LEN and NLEN
    const len = blockData.length;
    block[1] = len & 0xff;
    block[2] = (len >> 8) & 0xff;
    block[3] = ~len & 0xff;
    block[4] = (~len >> 8) & 0xff;

    block.set(blockData, 5);
    blocks.push(block);
  }

  // Adler-32 checksum
  const adler = adler32(data);
  const adlerBytes = new Uint8Array(4);
  adlerBytes[0] = (adler >> 24) & 0xff;
  adlerBytes[1] = (adler >> 16) & 0xff;
  adlerBytes[2] = (adler >> 8) & 0xff;
  adlerBytes[3] = adler & 0xff;

  // Combine
  const totalLength =
    zlibHeader.length +
    blocks.reduce((sum, b) => sum + b.length, 0) +
    adlerBytes.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;

  result.set(zlibHeader, offset);
  offset += zlibHeader.length;

  for (const block of blocks) {
    result.set(block, offset);
    offset += block.length;
  }

  result.set(adlerBytes, offset);

  return result;
}

/**
 * Adler-32 checksum
 */
function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  const MOD = 65521;

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD;
    b = (b + a) % MOD;
  }

  return ((b << 16) | a) >>> 0;
}

/**
 * Export canvas data to PNG buffer
 */
export function exportCanvasAsPng(canvasData: Uint8Array): Uint8Array {
  const colorIndices = unpackCanvasData(canvasData);
  const rgbaData = colorIndicesToRGBA(colorIndices);
  return createPNG(CANVAS_WIDTH, CANVAS_HEIGHT, rgbaData);
}

/**
 * Generate a smaller thumbnail
 */
export function generateThumbnail(
  canvasData: Uint8Array,
  size: number = 200
): Uint8Array {
  const colorIndices = unpackCanvasData(canvasData);

  // Simple nearest-neighbor downscale
  const scale = CANVAS_WIDTH / size;
  const thumbnailRGBA = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcX = Math.floor(x * scale);
      const srcY = Math.floor(y * scale);
      const srcIndex = srcY * CANVAS_WIDTH + srcX;
      const colorIndex = colorIndices[srcIndex];
      const color = COLOR_PALETTE_RGBA[colorIndex] ?? COLOR_PALETTE_RGBA[0];

      const dstOffset = (y * size + x) * 4;
      thumbnailRGBA[dstOffset] = color.r;
      thumbnailRGBA[dstOffset + 1] = color.g;
      thumbnailRGBA[dstOffset + 2] = color.b;
      thumbnailRGBA[dstOffset + 3] = 255;
    }
  }

  return createPNG(size, size, thumbnailRGBA);
}

/**
 * Upload buffer to Supabase Storage
 */
export async function uploadToStorage(
  buffer: Uint8Array,
  path: string,
  contentType: string = 'image/png'
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from('canvas-archives')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('canvas-archives')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Full export pipeline: canvas data -> PNG -> upload -> URL
 */
export async function exportAndUploadCanvas(
  canvasData: Uint8Array,
  weekNumber: number,
  year: number
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const timestamp = Date.now();
  const basePath = `${year}/week-${weekNumber}`;

  // Export full size
  const fullPng = exportCanvasAsPng(canvasData);
  const imageUrl = await uploadToStorage(
    fullPng,
    `${basePath}/canvas-${timestamp}.png`
  );

  // Export thumbnail
  const thumbPng = generateThumbnail(canvasData, 200);
  const thumbnailUrl = await uploadToStorage(
    thumbPng,
    `${basePath}/thumb-${timestamp}.png`
  );

  return { imageUrl, thumbnailUrl };
}
