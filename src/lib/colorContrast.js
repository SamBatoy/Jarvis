// WCAG 2.1 contrast helpers, used to derive an accessible text color for a
// context's badge from its own brand color — ContextBadge renders text in
// the same hue as its 10%-opacity background tint, which looks fine for
// some hues but fails 4.5:1 for most of them (verified: every color in the
// default palette fails in light mode; violet also fails in dark mode).
// Rather than hardcode fixed replacement hexes (contexts can have a
// user-customized color, not just the 8 defaults), this darkens/lightens
// the given color just enough to clear the threshold, preserving its hue.

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]) {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function relativeLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(rgb1)
  const L2 = relativeLuminance(rgb2)
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (lighter + 0.05) / (darker + 0.05)
}

function mixWith(rgb, target, ratio) {
  return rgb.map((c, i) => c * (1 - ratio) + target[i] * ratio)
}

// mode: 'light' darkens toward black (for text on a light-tinted badge),
// 'dark' lightens toward white only if the color doesn't already pass —
// most of the default palette is already bright enough against a dark
// page background, so this leaves them untouched.
export function accessibleBadgeText(hex, mode, backgroundHex = mode === 'light' ? '#fafafa' : '#0a0a0a') {
  const rgb = hexToRgb(hex)
  const pageBg = hexToRgb(backgroundHex)
  const badgeBg = rgb.map((c, i) => Math.round(c * 0.1 + pageBg[i] * 0.9))
  const target = mode === 'light' ? [0, 0, 0] : [255, 255, 255]

  if (contrastRatio(rgb, badgeBg) >= 4.5) return hex

  for (let ratio = 0.05; ratio <= 0.95; ratio += 0.05) {
    const candidate = mixWith(rgb, target, ratio)
    if (contrastRatio(candidate, badgeBg) >= 4.6) return rgbToHex(candidate)
  }
  return mode === 'light' ? '#000000' : '#ffffff'
}
