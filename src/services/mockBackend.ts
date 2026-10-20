/**
 * Backend local SÓ para testes visuais (npm run dev:mock). Não entra na versão publicada.
 * Os dados ficam no localStorage e são partilhados entre separadores (para testar 2 pessoas a conversar).
 */
import type { Backend } from './backend';
import { drawCycle, generateCode, identifierToEmail, normalizeCode, previewOf } from './backend';
import type { AppNotification, Group, Message, Thread, User, WishItem } from '../types';
import { makeAvatar } from '../utils/avatar';

type Db = {
  users: Record<string, { name: string; email: string; phone: string; password: string; accountType: User['accountType']; avatar: string }>;
  groups: Record<string, Omit<Group, 'members' | 'id'> & { members: Record<string, { name: string; avatar: string; joinedAt: number }> }>;
  assignments: Record<string, string>;
  threads: Record<string, Omit<Thread, 'id' | 'groupId'> & { id: string; groupId: string }>;
  messages: Record<string, (Message & { media?: string })[]>;
  wishes: Record<string, WishItem>;
  notes: Record<string, AppNotification[]>;
};
const KEY = 'bilar_mock_db';
const load = (): Db => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* */
  }
  return { users: {}, groups: {}, assignments: {}, threads: {}, messages: {}, wishes: {}, notes: {} };
};
let db = load();
const subs = new Set<() => void>();
const save = () => {
  localStorage.setItem(KEY, JSON.stringify(db));
  setTimeout(() => subs.forEach((s) => s()), 30);
};
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    db = load();
    subs.forEach((s) => s());
  }
});
const watch = (fn: () => void) => {
  subs.add(fn);
  setTimeout(fn, 20);
  return () => subs.delete(fn);
};
let uid: string | null = sessionStorage.getItem('mock_uid');
const authSubs = new Set<(u: string | null) => void>();
const setUid = (u: string | null) => {
  uid = u;
  if (u) sessionStorage.setItem('mock_uid', u);
  else sessionStorage.removeItem('mock_uid');
  authSubs.forEach((s) => s(u));
};
const toGroup = (id: string): Group => {
  const g = db.groups[id];
  return {
    ...g,
    id,
    coverImage: g.coverImage || '',
    deliveryDate: g.deliveryDate || '',
    drawTime: g.drawTime || '',
    drawAt: g.drawAt || 0,
    timeZone: g.timeZone || '',
    maxParticipants: g.maxParticipants || 100,
    members: Object.entries(g.members)
      .map(([mid, m]) => ({ id: mid, name: m.name, avatar: m.avatar || makeAvatar(m.name), joinedAt: m.joinedAt }))
      .sort((a, b) => a.joinedAt - b.joinedAt),
  };
};
const tkey = (gid: string, tid: string) => `${gid}/${tid}`;

export const mockBackend: Backend = {
  onAuth(cb) {
    authSubs.add(cb);
    setTimeout(() => cb(uid), 50);
    return () => authSubs.delete(cb);
  },
  watchUser(id, cb) {
    return watch(() => {
      const u = db.users[id];
      cb(u ? { id, name: u.name, email: u.email, phone: u.phone, accountType: u.accountType, avatar: u.avatar || makeAvatar(u.name), hasPhoto: !!u.avatar } : null);
    });
  },
  async signUp({ name, identifier, password, accountType, avatar }) {
    const { email, phone } = identifierToEmail(identifier);
    if (Object.values(db.users).some((u) => u.email === email)) throw { code: 'auth/email-already-in-use' };
    const id = 'u' + Math.random().toString(36).slice(2, 8);
    db.users[id] = { name, email, phone, password, accountType, avatar: avatar || '' };
    save();
    setUid(id);
  },
  async signIn(identifier, password) {
    const { email } = identifierToEmail(identifier);
    const e = Object.entries(db.users).find(([, u]) => u.email === email && u.password === password);
    if (!e) throw { code: 'auth/invalid-credential' };
    setUid(e[0]);
  },
  async signInGoogle() {
    throw new Error('Google não disponível no modo de teste.');
  },
  async signOut() {
    setUid(null);
  },
  async resetPassword() {},
  async updateProfile(id, patch) {
    Object.assign(db.users[id], patch);
    save();
  },
  watchGroups(id, cb) {
    return watch(() => cb(Object.keys(db.groups).filter((g) => db.groups[g].memberIds.includes(id)).map(toGroup).sort((a, b) => b.createdAt - a.createdAt)));
  },
  async createGroup(user, input) {
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    db.groups[id] = {
      ...input,
      currency: 'MZN',
      code: generateCode(),
      adminId: user.id,
      memberIds: [user.id],
      members: { [user.id]: { name: user.name, avatar: user.hasPhoto ? user.avatar : '', joinedAt: Date.now() } },
      status: 'pending',
      drawRound: 0,
      createdAt: Date.now(),
    };
    save();
    return toGroup(id);
  },
  async updateGroup(groupId, input) {
    const group = db.groups[groupId];
    if (!group) throw new Error('Grupo não encontrado.');
    if (uid !== group.adminId) throw new Error('Só o organizador pode editar este grupo.');
    if (!Number.isInteger(input.maxParticipants) || input.maxParticipants < group.memberIds.length || input.maxParticipants > 100) {
      throw new Error('O limite deve cobrir os membros atuais e não pode passar de 100.');
    }
    Object.assign(group, input);
    save();
  },
  async joinByCode(user, raw) {
    const code = normalizeCode(raw);
    const id = Object.keys(db.groups).find((g) => db.groups[g].code === code);
    if (!id) throw new Error('Código não encontrado. Confirme com o organizador.');
    const g = db.groups[id];
    const maxParticipants = g.maxParticipants || 100;
    if (g.memberIds.includes(user.id)) throw new Error('Já faz parte deste grupo.');
    if (!g.memberIds.includes(user.id) && g.memberIds.length >= maxParticipants) throw new Error(`Este grupo já atingiu o limite de ${maxParticipants} participantes.`);
    if (!g.memberIds.includes(user.id)) g.memberIds.push(user.id);
    const afterDraw = g.status === 'drawn';
    if (afterDraw) g.status = 'pending';
    g.members[user.id] = { name: user.name, avatar: user.hasPhoto ? user.avatar : '', joinedAt: Date.now() };
    if (g.adminId !== user.id) {
      (db.notes[g.adminId] ||= []).unshift({
        id: Math.random().toString(36),
        title: afterDraw ? 'Novo participante após o sorteio' : 'Novo participante',
        message: afterDraw
          ? `${user.name} entrou no grupo "${g.name}" depois do sorteio. Refaça o sorteio para incluir esta pessoa.`
          : `${user.name} entrou no grupo "${g.name}".`,
        type: 'group',
        groupId: id,
        read: false,
        createdAt: Date.now(),
      });
    }
    save();
    return { groupId: id, groupName: g.name };
  },
  async leaveGroup(group, id) {
    const g = db.groups[group.id];
    if (!g) throw new Error('Grupo não encontrado.');
    if (id !== uid) throw new Error('Só pode sair do grupo com a sua própria conta.');
    if (id === g.adminId) throw new Error('Transfira a organização para outro participante antes de sair do grupo.');
    g.memberIds = g.memberIds.filter((x) => x !== id);
    delete g.members[id];
    if (g.status === 'drawn') g.status = 'pending';
    save();
  },
  async removeGroupMember(groupId, memberId) {
    const g = db.groups[groupId];
    if (!g || g.adminId !== uid) throw new Error('Só o organizador pode remover participantes.');
    if (memberId === g.adminId || !g.memberIds.includes(memberId)) throw new Error('Este participante já não pode ser removido.');
    g.memberIds = g.memberIds.filter((id) => id !== memberId);
    delete g.members[memberId];
    if (g.status === 'drawn') g.status = 'pending';
    (db.notes[memberId] ||= []).unshift({
      id: Math.random().toString(36),
      title: 'Removido do grupo',
      message: `O organizador removeu você do grupo "${g.name}".`,
      type: 'group',
      groupId,
      read: false,
      createdAt: Date.now(),
    });
    save();
  },
  async addGroupMember(groupId, email) {
    const g = db.groups[groupId];
    if (!g || g.adminId !== uid) throw new Error('Só o organizador pode adicionar participantes.');
    const normalizedEmail = email.trim().toLowerCase();
    const match = Object.entries(db.users).find(([, user]) => user.email.toLowerCase() === normalizedEmail);
    if (!match) throw new Error('Não há uma conta com esse email. Peça à pessoa para criar uma conta com email e tente novamente.');
    const [memberId, member] = match;
    if (g.memberIds.includes(memberId)) throw new Error('Essa pessoa já faz parte do grupo.');
    if (g.memberIds.length >= (g.maxParticipants || 100)) throw new Error(`O grupo já atingiu o limite de ${g.maxParticipants} participantes.`);
    const afterDraw = g.status === 'drawn';
    g.memberIds.push(memberId);
    g.members[memberId] = { name: member.name, avatar: member.avatar || '', joinedAt: Date.now() };
    if (afterDraw) g.status = 'pending';
    (db.notes[memberId] ||= []).unshift({
      id: Math.random().toString(36),
      title: 'Você foi adicionado a um grupo 🎁',
      message: `O organizador adicionou você ao grupo "${g.name}". Abra este aviso para ver o grupo.`,
      type: 'group',
      groupId,
      read: false,
      createdAt: Date.now(),
    });
    save();
  },
  async transferGroupAdmin(groupId, adminId) {
    const g = db.groups[groupId];
    if (!g || g.adminId !== uid) throw new Error('Só o organizador atual pode transferir a organização.');
    if (adminId === uid || !g.memberIds.includes(adminId)) throw new Error('Escolha outro participante atual do grupo.');
    g.adminId = adminId;
    (db.notes[adminId] ||= []).unshift({
      id: Math.random().toString(36),
      title: 'Você é o novo organizador',
      message: `A organização do grupo "${g.name}" foi transferida para você.`,
      type: 'group',
      groupId,
      read: false,
      createdAt: Date.now(),
    });
    save();
  },
  async deleteGroup(group) {
    delete db.groups[group.id];
    save();
  },
  async syncMemberProfile(gid, user) {
    const m = db.groups[gid]?.members[user.id];
    if (m) {
      m.name = user.name;
      m.avatar = user.hasPhoto ? user.avatar : '';
      save();
    }
  },
  async runDraw(group) {
    if (uid !== group.adminId) throw new Error('Só o organizador pode fazer o sorteio.');
    if (group.members.length < 3) throw new Error('São precisos pelo menos 3 participantes para sortear.');
    const pairs = drawCycle(group.members.map((m) => m.id));
    const g = db.groups[group.id];
    g.status = 'drawn';
    g.drawRound += 1;
    Object.entries(pairs).forEach(([a, b]) => {
      db.assignments[`${group.id}/${a}`] = b;
      const name = g.members[a]?.name || 'participante';
      const organizer = g.members[g.adminId]?.name || 'O organizador';
      (db.notes[a] ||= []).unshift({ id: Math.random().toString(36), title: g.drawRound > 1 ? 'O sorteio foi refeito! 🎁' : 'O sorteio foi realizado! 🎁', message: `Olá ${name}! ${organizer} já fez o sorteio do grupo "${g.name}". Abra este aviso e toque em "Ver Sorteio" para descobrir quem é o seu amigo secreto.`, type: 'draw', groupId: group.id, read: false, createdAt: Date.now() });
    });
    save();
  },
  watchAssignment(gid, id, cb) {
    return watch(() => cb(db.assignments[`${gid}/${id}`] || null, db.groups[gid]?.drawRound || 0));
  },
  watchThreads(id, gids, cb) {
    return watch(() =>
      cb(
        Object.values(db.threads)
          .filter((t) => gids.includes(t.groupId) && (t.kind === 'group' || t.participants.includes(id)))
          .map((t) => ({ ...t })),
      ),
    );
  },
  watchMessages(ref, cb) {
    return watch(() => cb((db.messages[tkey(ref.groupId, ref.id)] || []).map((m) => ({ ...m }))));
  },
  async sendMessage(user, ref, senderName, p) {
    const k = tkey(ref.groupId, ref.id);
    const t = (db.threads[k] ||= { id: ref.id, groupId: ref.groupId, kind: ref.kind, participants: ref.participants, round: ref.round, count: 0, lastText: '', lastSenderId: '', lastSenderName: '', lastAt: 0, reads: {}, readAt: {} });
    t.count += 1;
    t.lastText = previewOf({ text: p.text, attachment: p.attachment });
    t.lastSenderId = user.id;
    t.lastSenderName = senderName;
    t.lastAt = Date.now();
    t.reads[user.id] = t.count;
    t.readAt[user.id] = Date.now();
    const mediaId = p.inlineData ? Math.random().toString(36).slice(2) : undefined;
    (db.messages[k] ||= []).push({
      id: Math.random().toString(36).slice(2),
      senderId: user.id,
      senderName,
      text: p.text,
      createdAt: Date.now(),
      attachment: p.attachment ? { ...p.attachment, mediaId } : undefined,
      deleted: false,
      pending: false,
      media: p.inlineData,
    });
    save();
  },
  async markThreadRead(ref, id, count) {
    const t = db.threads[tkey(ref.groupId, ref.id)];
    if (!t) return;
    t.reads[id] = count;
    t.readAt[id] = Date.now();
    save();
  },
  async deleteMessage(ref, msg) {
    const m = db.messages[tkey(ref.groupId, ref.id)]?.find((x) => x.id === msg.id);
    if (m) {
      m.deleted = true;
      m.text = '';
      delete m.attachment;
      save();
    }
  },
  async getMedia(ref, mediaId) {
    return db.messages[tkey(ref.groupId, ref.id)]?.find((m) => m.attachment?.mediaId === mediaId)?.media || null;
  },
  watchWishlist(id, cb) {
    return watch(() => cb(Object.values(db.wishes).filter((w) => w.userId === id).sort((a, b) => b.createdAt - a.createdAt)));
  },
  async saveWish(item) {
    db.wishes[item.id] = item;
    save();
  },
  async deleteWish(id) {
    delete db.wishes[id];
    save();
  },
  watchNotifications(id, cb) {
    return watch(() => cb(db.notes[id] || []));
  },
  async notify(to, _from, n) {
    (db.notes[to] ||= []).unshift({ id: Math.random().toString(36), ...n, read: false, createdAt: Date.now() });
    save();
  },
  async markNotificationsRead(id, ids) {
    (db.notes[id] || []).forEach((n) => ids.includes(n.id) && (n.read = true));
    save();
  },
};
