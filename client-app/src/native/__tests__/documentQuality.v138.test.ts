import { describe, expect, it } from 'vitest';
import {
  assessGray,
  assessRgba,
  BRIGHTNESS_FLOOR,
  coverageScore,
  type Gray,
  meanBrightness,
  MIN_EDGE_PX,
  SHARPNESS_FLOOR,
  sharpnessScore,
  toGrayscale,
  worstOf,
} from '../documentQuality';

function sharpPage(w = 800, h = 800, level = 255): Gray {
  const data = new Uint8ClampedArray(w * h).fill(level);
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 1800; i += 1) {
    const x = Math.floor(random() * (w - 12));
    const y = Math.floor(random() * (h - 8));
    const width = 2 + Math.floor(random() * 9);
    const height = 2 + Math.floor(random() * 5);
    for (let yy = y; yy < y + height; yy += 1) {
      for (let xx = x; xx < x + width; xx += 1) data[yy * w + xx] = 0;
    }
  }
  return { data, width: w, height: h };
}

function blurred(src: Gray): Gray {
  const { width: w, height: h } = src;
  const data = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
            sum += Number(src.data[ny * w + nx] ?? 0);
            count += 1;
          }
        }
      }
      data[y * w + x] = sum / count;
    }
  }
  return { data, width: w, height: h };
}

function pageInFrame(w = 800, h = 800, fraction = 0.25): Gray {
  const data = new Uint8ClampedArray(w * h);
  const pw = Math.round(w * Math.sqrt(fraction));
  const ph = Math.round(h * Math.sqrt(fraction));
  const x0 = Math.round((w - pw) / 2);
  const y0 = Math.round((h - ph) / 2);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) data[y * w + x] = x >= x0 && x < x0 + pw && y >= y0 && y < y0 + ph ? 240 : 8;
  }
  return { data, width: w, height: h };
}

describe('BF_CLIENT_DOC_QUALITY_v138', () => {
  it('passes a clean, sharp, well-lit page', () => {
    const report = assessGray(sharpPage());
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.message).toContain('clear');
  });

  it('scores a sharp page far above a blurred one independent of exposure', () => {
    const sharp = sharpnessScore(sharpPage());
    expect(sharp).toBeGreaterThan(sharpnessScore(blurred(sharpPage())) * 5);
    expect(sharpnessScore(sharpPage(800, 800, 60))).toBeCloseTo(sharp, 5);
  });

  it('flags a blurred page', () => {
    const report = assessGray(blurred(sharpPage()));
    expect(report.issues).toContain('blurry');
    expect(report.sharpness).toBeLessThan(SHARPNESS_FLOOR);
  });

  it('flags an underexposed page as dark, not blurry', () => {
    const report = assessGray(sharpPage(800, 800, 40));
    expect(report.issues).toContain('dark');
    expect(report.issues).not.toContain('blurry');
    expect(report.brightness).toBeLessThan(BRIGHTNESS_FLOOR);
  });

  it('flags low resolution', () => {
    const report = assessGray(sharpPage(300, 300));
    expect(report.issues).toContain('low_resolution');
    expect(Math.min(report.width, report.height)).toBeLessThan(MIN_EDGE_PX);
  });

  it('flags a page that does not fill the frame', () => {
    const report = assessGray(pageInFrame());
    expect(report.issues).toContain('small_in_frame');
    expect(report.coverage).toBeLessThan(0.35);
  });

  it('reports full coverage for a full-bleed page', () => {
    expect(coverageScore(sharpPage())).toBeGreaterThan(0.5);
  });

  it('keeps warnings advisory and names faults', () => {
    const report = assessGray(blurred(sharpPage(300, 300, 40)));
    expect(report.issues.length).toBeGreaterThan(1);
    expect(report.message).toContain('We can still send this');
    expect(report.message).toContain('blurry');
    expect(report.message).toContain('dark');
  });

  it('converts rgba to luma before scoring', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    expect(meanBrightness(toGrayscale(rgba, 4, 4))).toBeGreaterThan(250);
  });

  it('assessRgba agrees with assessGray', () => {
    const gray = sharpPage();
    const rgba = new Uint8ClampedArray(gray.width * gray.height * 4);
    for (let i = 0; i < gray.width * gray.height; i += 1) {
      rgba.set([Number(gray.data[i]), Number(gray.data[i]), Number(gray.data[i]), 255], i * 4);
    }
    expect(assessRgba(rgba, gray.width, gray.height).ok).toBe(assessGray(gray).ok);
  });

  it('handles a degenerate image without throwing', () => {
    const empty: Gray = { data: new Uint8ClampedArray(0), width: 0, height: 0 };
    expect(() => assessGray(empty)).not.toThrow();
    expect(assessGray(empty).ok).toBe(false);
  });

  it('worstOf picks the page with the most faults', () => {
    const good = assessGray(sharpPage());
    const bad = assessGray(blurred(sharpPage(300, 300, 40)));
    expect(worstOf([good, bad])).toBe(bad);
    expect(worstOf([])).toBeNull();
  });
});

describe('BF_CLIENT_DOC_QUALITY_v143 mounting contract', () => {
  it('withTrueDimensions judges resolution on the original, not the downsample', async () => {
    const { withTrueDimensions, assessGray } = await import('../documentQuality');
    // Scored on a 900px downsample, but the page was really 400px wide.
    const scored = assessGray(sharpPage(900, 900));
    expect(scored.issues).not.toContain('low_resolution');
    const restated = withTrueDimensions(scored, 400, 400);
    expect(restated.issues).toContain('low_resolution');
    expect(restated.width).toBe(400);
    expect(restated.ok).toBe(false);
  });

  it('withTrueDimensions clears the flag when the original was large enough', async () => {
    const { withTrueDimensions, assessGray } = await import('../documentQuality');
    const scored = assessGray(sharpPage(300, 300));
    expect(scored.issues).toContain('low_resolution');
    const restated = withTrueDimensions(scored, 2400, 3200);
    expect(restated.issues).not.toContain('low_resolution');
    expect(restated.ok).toBe(true);
  });

  it('measureBlob returns null rather than throwing where it cannot run', async () => {
    const { measureBlob } = await import('../documentQuality');
    expect(await measureBlob(new Blob(['not an image']))).toBeNull();
  });
});
