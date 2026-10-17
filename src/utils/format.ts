export function formatDateShort(iso: string): string {
  if (!iso) return 'A definir';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : 'A definir';
}

export function formatMoney(n: number, currency = 'MZN'): string {
  const v = Math.round(n || 0);
  return `${v.toLocaleString('pt-PT').replace(/\s/g, '.').replace(/,/g, '.')} ${currency}`;
}

export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function formatDayLabel(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Hoje';
  if (sameDay(d, y)) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Hora na lista de conversas: "14:22", "Ontem" ou "12/10" */
export function formatListTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  if (sameDay(d, now)) return formatClock(ms);
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

export function formatRelative(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return 'Agora mesmo';
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Há ${d} d`;
  return new Date(ms).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Contagem decrescente até ao dia da revelação (meia-noite local). */
export function countdown(iso: string, now = Date.now()): { days: number; hours: number; minutes: number; seconds: number; past: boolean; today: boolean } | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d, 0, 0, 0).getTime();
  const end = target + 24 * 3600 * 1000;
  if (now >= target && now < end) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: false, today: true };
  if (now >= end) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true, today: false };
  let s = Math.floor((target - now) / 1000);
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { days, hours, minutes, seconds: s - minutes * 60, past: false, today: false };
}

export function countdownLabel(iso: string): string {
  const c = countdown(iso);
  if (!c) return '';
  if (c.today) return 'A revelação é hoje!';
  if (c.past) return 'Revelação concluída';
  if (c.days === 0) return `Faltam ${c.hours} h ${c.minutes} min`;
  return `Faltam ${c.days} ${c.days === 1 ? 'dia' : 'dias'}`;
}

export function inviteLink(code: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?join=${encodeURIComponent(code)}`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Cor da contagem: verde (tempo de sobra), amarelo (está a chegar), vermelho (últimos dias / hoje). */
export type Urgency = 'green' | 'amber' | 'red' | 'done';
export function urgency(iso: string): Urgency {
  const c = countdown(iso);
  if (!c) return 'green';
  if (c.past) return 'done';
  if (c.today || c.days < 4) return 'red';
  if (c.days <= 14) return 'amber';
  return 'green';
}
export const urgencyText: Record<Urgency, string> = {
  green: 'Tempo de sobra para escolher o presente 🎁',
  amber: 'Está a chegar! Já pensou no presente? 🛍️',
  red: 'Últimos dias! Não se esqueça do presente ⏰',
  done: 'Revelação concluída 🎉',
};
