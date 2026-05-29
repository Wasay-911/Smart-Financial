// js/utils.js – Shared math and canvas utility functions

export const lerp  = (a, b, t)         => a + (b - a) * t;
export const clamp = (v, lo, hi)        => Math.max(lo, Math.min(hi, v));
export const dist  = (ax, ay, bx, by)   => Math.hypot(bx - ax, by - ay);
export const rand  = (lo, hi)           => lo + Math.random() * (hi - lo);
export const randInt = (lo, hi)         => lo + Math.floor(Math.random() * (hi - lo + 1));

/** World → screen coordinate given camera object {x, y, zoom} */
export const w2s = (wx, wy, cam, W, H) => ({
  x: (wx - cam.x) * cam.zoom + W * 0.5,
  y: (wy - cam.y) * cam.zoom + H * 0.5,
});

/** Is screen point within canvas bounds? */
export const onScreen = (sx, sy, pad, W, H) =>
  sx >= -pad && sx <= W + pad && sy >= -pad && sy <= H + pad;

/** Draw rounded rectangle */
export function rrect(ctx, x, y, w, h, r, fill = null, stroke = null, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
  ctx.closePath();
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill();              }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

/** Draw interactive button; returns true if clicked this frame */
export function uiBtn(ctx, label, x, y, w, h, opts = {}, mouse) {
  const hov = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  const clicked = hov && mouse.clicked;
  rrect(ctx, x, y, w, h, 8,
    hov ? (opts.hov  || '#FFD700') : (opts.bg  || '#2C3E50'),
    hov ? null       : (opts.brd || '#444'));
  ctx.fillStyle = hov ? (opts.htxt || '#000') : (opts.txt || '#FFF');
  ctx.font = opts.font || 'bold 17px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w * 0.5, y + h * 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return clicked;
}

/** Shade a hex colour by ±amount */
export function shadeHex(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 0xFF) + amt, 0, 255);
  const b = clamp((n & 0xFF) + amt, 0, 255);
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

/** Wrap angle to [-π, π] */
export const wrapAngle = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
