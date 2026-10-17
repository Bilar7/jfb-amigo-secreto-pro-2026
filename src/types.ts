/** Ocasiões pré-definidas. "outra" permite ao organizador escrever a sua própria. */
export type OccasionKey = 'amigos' | 'empresa' | 'aniversario' | 'fim_ano' | 'festas' | 'outra';

/** Mínimo de participantes para sortear (com 2 o resultado seria óbvio). */
export const MIN_MEMBERS = 3;

export type AccountType = 'pessoal' | 'empresa' | 'grupo';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: AccountType;
  /** Fotografia (data-URL) ou avatar gerado com as iniciais */
  avatar: string;
  hasPhoto: boolean;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
}

export interface Group {
  id: string;
  name: string;
  occasion: OccasionKey;
  /** Texto da ocasião quando é "outra" (ex.: "Despedida da Ana") */
  occasionLabel: string;
  place: string;
  rules: string;
  /** AAAA-MM-DD */
  revealDate: string;
  /** Dia do sorteio (AAAA-MM-DD, opcional) */
  drawDate: string;
  /** Sortear sozinho quando chegar o dia do sorteio */
  autoDraw: boolean;
  budget: number;
  currency: string;
  code: string;
  adminId: string;
  memberIds: string[];
  members: Member[];
  status: 'pending' | 'drawn';
  drawRound: number;
  createdAt: number;
}

export interface Attachment {
  type: 'image' | 'audio' | 'file' | 'video';
  name: string;
  size: number;
  mime: string;
  width?: number;
  height?: number;
  duration?: number;
  waveform?: number[];
  mediaId?: string;
}

export type ThreadKind = 'group' | 'direct' | 'secret';

/** Uma conversa: "geral" do grupo, privada (2 pessoas) ou secreta (amigo secreto anónimo). */
export interface Thread {
  id: string;
  groupId: string;
  kind: ThreadKind;
  participants: string[];
  round: number;
  count: number;
  lastText: string;
  lastSenderId: string;
  lastSenderName: string;
  lastAt: number;
  reads: Record<string, number>;
  readAt: Record<string, number>;
}

export interface ThreadRef {
  groupId: string;
  id: string;
  kind: ThreadKind;
  participants: string[];
  round: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  attachment?: Attachment;
  deleted: boolean;
  pending: boolean;
}

export type WishCategory = 'Tecnologia' | 'Moda' | 'Casa' | 'Beleza' | 'Escola' | 'Outros';

export interface WishItem {
  id: string;
  userId: string;
  title: string;
  price: number;
  currency: string;
  category: WishCategory;
  imageUrl: string;
  storeUrl: string;
  favorite: boolean;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'draw' | 'group' | 'chat';
  groupId?: string;
  read: boolean;
  createdAt: number;
}
