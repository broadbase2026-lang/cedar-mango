export const HOME_FEATURE_CARD_GRADIENTS = [
  'linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)',
  'linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)',
  'linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)',
] as const;

/** Nav gold → journalist hover → brand coral; matches --bb-top-nav and primary tokens. */
export const SIGNUP_HERO_GRADIENT =
  'linear-gradient(137deg, #ffb81a 0%, #ffd875 45%, #ff9e96 100%)';

/** Gradient stops at scroll top (matches SIGNUP_HERO_GRADIENT). */
export const NAV_GRADIENT_STOPS_START = ['#ffb81a', '#ffd875', '#ff9e96'] as const;

/** Gradient stops at scroll bottom (gold → coral scroll end). */
export const NAV_GRADIENT_STOPS_END = ['#EF5301', '#f76a1a', '#e84a00'] as const;

function interpolateHexColor(from: string, to: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  };
  const start = parse(from);
  const end = parse(to);
  const clamped = Math.min(1, Math.max(0, t));
  const r = Math.round(start.r + (end.r - start.r) * clamped);
  const g = Math.round(start.g + (end.g - start.g) * clamped);
  const b = Math.round(start.b + (end.b - start.b) * clamped);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Scroll-linked nav gradient: signup gradient at top → coral gradient at bottom. */
export function buildNavScrollGradient(progress: number): string {
  const t = Math.min(1, Math.max(0, progress));
  const stops = NAV_GRADIENT_STOPS_START.map((from, i) =>
    interpolateHexColor(from, NAV_GRADIENT_STOPS_END[i], t),
  );
  return `linear-gradient(137deg, ${stops[0]} 0%, ${stops[1]} 45%, ${stops[2]} 100%)`;
}
