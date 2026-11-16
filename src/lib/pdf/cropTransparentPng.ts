import { inflateSync, deflateSync } from "zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimateLeft = Math.abs(up - upLeft);
  const estimateUp = Math.abs(left - upLeft);
  const estimateDiagonal = Math.abs(left + up - 2 * upLeft);
  if (estimateLeft <= estimateUp && estimateLeft <= estimateDiagonal) return left;
  if (estimateUp <= estimateDiagonal) return up;
  return upLeft;
}

function decodeRgba(png: Buffer): { width: number; height: number; rows: Buffer[] } {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Logo file is not a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat: Buffer[] = [];
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || colorType !== 6 || width < 1 || height < 1) {
    throw new Error("Logo PNG must be 8-bit RGBA");
  }

  const inflated = inflateSync(Buffer.concat(idat));
  const channels = 4;
  const stride = width * channels;
  const rows: Buffer[] = [];
  let previous = Buffer.alloc(stride);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[cursor];
    cursor += 1;
    const row = Buffer.from(inflated.subarray(cursor, cursor + stride));
    cursor += stride;
    if (filter === 1 || filter === 3 || filter === 4) {
      for (let index = 0; index < stride; index += 1) {
        const left = index >= channels ? row[index - channels] : 0;
        const up = previous[index];
        const upLeft = index >= channels ? previous[index - channels] : 0;
        const predictor =
          filter === 1 ? left : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upLeft);
        row[index] = (row[index] + predictor) & 255;
      }
    } else if (filter === 2) {
      for (let index = 0; index < stride; index += 1) {
        row[index] = (row[index] + previous[index]) & 255;
      }
    }
    rows.push(row);
    previous = row;
  }
  return { width, height, rows };
}

function encodeRgba(width: number, height: number, rows: Buffer[]): Buffer {
  const raw: Buffer[] = [];
  for (const row of rows) {
    raw.push(Buffer.from([0]), row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(raw))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Crop away the transparent margin so the mark can sit in a letterhead. */
export function cropTransparentPng(png: Buffer, padding = 8): Buffer {
  const { width, height, rows } = decodeRgba(png);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    const row = rows[y];
    for (let x = 0; x < width; x += 1) {
      const index = x * 4;
      const alpha = row[index + 3];
      const red = row[index];
      const green = row[index + 1];
      const blue = row[index + 2];
      const visible = alpha > 16 && (red > 28 || green > 28 || blue > 28);
      if (!visible) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return png;

  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width - 1, maxX + padding);
  const bottom = Math.min(height - 1, maxY + padding);
  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const cropped = rows.slice(top, bottom + 1).map((row) => row.subarray(left * 4, (right + 1) * 4));
  return encodeRgba(cropWidth, cropHeight, cropped);
}
