import crypto from 'node:crypto';

export type ChartPalace = {
  name: string;
  stars: string[];
};

export type ChartOutput = {
  engineVersion: string;
  seed: string;
  palaces: ChartPalace[];
};

const STAR_POOL = [
  'Tử Vi',
  'Thiên Cơ',
  'Thái Dương',
  'Vũ Khúc',
  'Thiên Đồng',
  'Liêm Trinh',
  'Thiên Phủ',
  'Thái Âm',
  'Tham Lang',
  'Cự Môn',
  'Thiên Tướng',
  'Thiên Lương',
  'Thất Sát',
  'Phá Quân',
];

const PALACE_NAMES = [
  'Mệnh',
  'Phụ Mẫu',
  'Phúc Đức',
  'Điền Trạch',
  'Quan Lộc',
  'Nô Bộc',
  'Thiên Di',
  'Tật Ách',
  'Tài Bạch',
  'Tử Tức',
  'Phu Thê',
  'Huynh Đệ',
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: object): number {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  return parseInt(hash.slice(0, 8), 16);
}

export function generateChart(birthInput: object): ChartOutput {
  const seedNumber = hashSeed(birthInput);
  const rand = mulberry32(seedNumber);

  const palaces = PALACE_NAMES.map((name) => {
    const starCount = 2 + Math.floor(rand() * 4);
    const stars = Array.from({ length: starCount }).map(() => {
      const idx = Math.floor(rand() * STAR_POOL.length);
      return STAR_POOL[idx];
    });
    return { name, stars };
  });

  return {
    engineVersion: 'mock-1',
    seed: seedNumber.toString(),
    palaces,
  };
}
