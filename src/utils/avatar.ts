/** Avatar gerado com as iniciais (SVG em data-URL). Funciona offline e nunca é uma foto falsa. */
const PALETTE = [
  ['#0f766e', '#115e59'],
  ['#b45309', '#92400e'],
  ['#be123c', '#9f1239'],
  ['#4338ca', '#3730a3'],
  ['#0369a1', '#075985'],
  ['#15803d', '#166534'],
  ['#a21caf', '#86198f'],
  ['#c2410c', '#9a3412'],
];

export function initialsOf(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function makeAvatar(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [c1, c2] = PALETTE[hash % PALETTE.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="96" height="96" fill="url(#g)"/>` +
    `<text x="48" y="48" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="38" fill="#ffffff">${initialsOf(name).replace(/[<>&]/g, '')}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
