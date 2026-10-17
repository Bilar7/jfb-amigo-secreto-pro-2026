import type {
  AccountType,
  AppNotification,
  Attachment,
  Group,
  Message,
  OccasionKey,
  Thread,
  ThreadRef,
  User,
  WishItem,
} from '../types';

export type Unsub = () => void;

export interface NewGroupInput {
  name: string;
  occasion: OccasionKey;
  occasionLabel: string;
  place: string;
  rules: string;
  revealDate: string;
  drawDate: string;
  autoDraw: boolean;
  budget: number;
}

export interface SignUpInput {
  name: string;
  identifier: string;
  password: string;
  accountType: AccountType;
}

export interface OutgoingPayload {
  text: string;
  attachment?: Omit<Attachment, 'mediaId'>;
  /** Conteúdo do anexo (data-URL), guardado à parte para a conversa abrir rápido */
  inlineData?: string;
}

export interface Backend {
  onAuth(cb: (uid: string | null) => void): Unsub;
  watchUser(uid: string, cb: (u: User | null) => void): Unsub;
  signUp(input: SignUpInput): Promise<void>;
  signIn(identifier: string, password: string, remember: boolean): Promise<void>;
  signInGoogle(): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(identifier: string): Promise<void>;
  updateProfile(uid: string, patch: { name?: string; avatar?: string; phone?: string }): Promise<void>;

  watchGroups(uid: string, cb: (groups: Group[]) => void, onError?: (e: unknown) => void): Unsub;
  createGroup(user: User, input: NewGroupInput): Promise<Group>;
  joinByCode(user: User, code: string): Promise<{ groupId: string; groupName: string }>;
  leaveGroup(group: Group, uid: string): Promise<void>;
  deleteGroup(group: Group): Promise<void>;
  syncMemberProfile(groupId: string, user: User): Promise<void>;
  runDraw(group: Group): Promise<void>;
  watchAssignment(groupId: string, uid: string, cb: (assignedTo: string | null, round: number) => void): Unsub;

  watchThreads(uid: string, groupIds: string[], cb: (threads: Thread[]) => void, onError?: (e: unknown) => void): Unsub;
  watchMessages(ref: ThreadRef, cb: (msgs: Message[]) => void, onError?: (e: unknown) => void): Unsub;
  sendMessage(user: User, ref: ThreadRef, senderName: string, p: OutgoingPayload): Promise<void>;
  markThreadRead(ref: ThreadRef, uid: string, count: number): Promise<void>;
  deleteMessage(ref: ThreadRef, msg: Message): Promise<void>;
  getMedia(ref: ThreadRef, mediaId: string): Promise<string | null>;

  watchWishlist(uid: string, cb: (items: WishItem[]) => void): Unsub;
  saveWish(item: WishItem): Promise<void>;
  deleteWish(id: string): Promise<void>;

  watchNotifications(uid: string, cb: (n: AppNotification[]) => void): Unsub;
  markNotificationsRead(uid: string, ids: string[]): Promise<void>;
  notify(toUid: string, fromUid: string, n: Pick<AppNotification, 'title' | 'message' | 'type' | 'groupId'>): Promise<void>;
}

/** Definido no arranque (main.tsx usa o Firebase; o modo de teste usa um backend local). */
export let backend: Backend;
export function setBackend(b: Backend) {
  backend = b;
}

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateCode(): string {
  const number = crypto.getRandomValues(new Uint32Array(1))[0] % 10_000;
  return `BAS${String(number).padStart(4, '0')}B`;
}
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Permite entrar com email OU número de telefone (o número vira um email interno). */
export function identifierToEmail(raw: string): { email: string; phone: string } {
  const v = raw.trim();
  if (v.includes('@')) return { email: v.toLowerCase(), phone: '' };
  let digits = v.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('8')) digits = '258' + digits; // Moçambique
  if (digits.length < 8) throw Object.assign(new Error('Introduza um email ou número de telefone válido.'), { code: 'app/invalid-id' });
  return { email: `${digits}@tel.bilar.app`, phone: '+' + digits };
}
export const isPhoneEmail = (email: string) => email.endsWith('@tel.bilar.app');

/** Ciclo fechado: cada pessoa oferece à seguinte, ninguém tira a si próprio. */
export function drawCycle(ids: string[]): Record<string, string> {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out: Record<string, string> = {};
  a.forEach((giver, i) => (out[giver] = a[(i + 1) % a.length]));
  return out;
}

/** Ids das conversas */
export const threadIds = {
  group: () => 'geral',
  direct: (a: string, b: string) => `d_${[a, b].sort().join('_')}`,
  secret: (round: number, receiverId: string) => `s${round}_${receiverId}`,
};

export function previewOf(p: { text: string; attachment?: { type: string; name: string; waveform?: number[] } }): string {
  const a = p.attachment;
  if (a) {
    const label = a.type === 'image' ? '📷 Foto' : a.type === 'audio' ? '🎤 Nota de voz' : a.type === 'video' ? '🎬 Vídeo' : `📎 ${a.name}`;
    return p.text ? `${label} · ${p.text}` : label;
  }
  return p.text;
}
