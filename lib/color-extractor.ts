import { GradientColors } from "@/types";

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hNorm = h / 360;

  const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hNorm) * 255);
  const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function adjustHue(hex: string, degrees: number): string {
  const hsl = hexToHSL(hex);
  const newHue = (hsl.h + degrees) % 360;
  return hslToHex(newHue, hsl.s, Math.min(hsl.l, 0.4));
}

export async function extractThumbnailColors(
  videoId: string
): Promise<GradientColors> {
  const fallback: GradientColors = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
  };

  try {
    const { FastAverageColor } = await import("fast-average-color");
    const fac = new FastAverageColor();

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const color = await fac.getColorAsync(thumbnailUrl, {
      algorithm: "dominant",
      mode: "precision",
      crossOrigin: "anonymous",
    });

    const primary = color.hex;
    const secondary = adjustHue(primary, 60);

    fac.destroy();

    return { primary, secondary };
  } catch {
    return fallback;
  }
}
