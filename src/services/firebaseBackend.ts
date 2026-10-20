import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  drawCycle,
  generateCode,
  identifierToEmail,
  isPhoneEmail,
  normalizeCode,
  previewOf,
  type Backend,
} from './backend';
import type { Group, Member, Message, Thread, ThreadRef, User, WishItem, AppNotification } from '../types';
import { makeAvatar } from '../utils/avatar';

const tsToMs = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number };
  return t.toMillis ? t.toMillis() : 0;
};

function clean<T extends Record<string, unknown>>(o: T): T {
  Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
  return o;
}

function mapGroup(id: string, d: DocumentData, members: Member[]): Group {
  return {
    id,
    name: d.name || 'Grupo',
    coverImage: d.coverImage || '',
    occasion: d.occasion || 'amigos',
    occasionLabel: d.occasionLabel || '',
    place: d.place || '',
    rules: d.rules || '',
    revealDate: d.revealDate || '',
    deliveryDate: d.deliveryDate || '',
    drawDate: d.drawDate || '',
    drawTime: d.drawTime || '',
    drawAt: d.drawAt || 0,
    timeZone: d.timeZone || '',
    autoDraw: !!d.autoDraw,
    maxParticipants: d.maxParticipants || 100,
    budget: d.budget ?? 0,
    currency: d.currency || 'MZN',
    code: d.code || '',
    adminId: d.adminId || '',
    memberIds: d.memberIds || [],
    members,
    status: d.status === 'drawn' ? 'drawn' : 'pending',
    drawRound: d.drawRound || 0,
    createdAt: d.createdAt || 0,
  };
}

function mapThread(groupId: string, snap: DocumentSnapshot): Thread {
  const d = snap.data({ serverTimestamps: 'estimate' }) || {};
  const readAt: Record<string, number> = {};
  Object.entries((d.readAt || {}) as Record<string, unknown>).forEach(([k, v]) => (readAt[k] = tsToMs(v)));
  return {
    id: snap.id,
    groupId,
    kind: snap.id === 'geral' ? 'group' : d.kind,
    participants: d.participants || [],
    round: d.round || 0,
    count: d.count || 0,
    lastText: d.lastText || '',
    lastSenderId: d.lastSenderId || '',
    lastSenderName: d.lastSenderName || '',
    lastAt: tsToMs(d.lastAt),
    reads: d.reads || {},
    readAt,
  };
}

const tRef = (r: { groupId: string; id: string }) => doc(db, 'groups', r.groupId, 'threads', r.id);
const mediaCache = new Map<string, string>();

export const firebaseBackend: Backend = {
  /* ------------------------------ Autenticação ------------------------------ */
  onAuth(cb) {
    return onAuthStateChanged(auth, (u) => cb(u ? u.uid : null));
  },

  watchUser(uid, cb) {
    const ref = doc(db, 'users', uid);
    const fallback = () => {
      const u = auth.currentUser;
      if (!u || u.uid !== uid) return null;
      const name = u.displayName || (u.email && !isPhoneEmail(u.email) ? u.email.split('@')[0] : 'Utilizador');
      return { name, email: u.email && !isPhoneEmail(u.email) ? u.email : '', avatar: u.photoURL || '' };
    };
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          const f = fallback();
          if (f && !snap.metadata.fromCache) {
            setDoc(ref, { ...f, phone: '', accountType: 'pessoal', createdAt: Date.now() }, { merge: true }).catch(() => {});
          }
          if (f) cb({ id: uid, name: f.name, email: f.email, phone: '', accountType: 'pessoal', avatar: f.avatar || makeAvatar(f.name), hasPhoto: !!f.avatar });
          return;
        }
        const d = snap.data();
        const name = d.name || 'Utilizador';
        cb({
          id: uid,
          name,
          email: d.email || '',
          phone: d.phone || '',
          accountType: d.accountType || 'pessoal',
          avatar: d.avatar || makeAvatar(name),
          hasPhoto: !!d.avatar,
        });
      },
      () => {
        const f = fallback();
        if (f) cb({ id: uid, name: f.name, email: f.email, phone: '', accountType: 'pessoal', avatar: makeAvatar(f.name), hasPhoto: false });
      },
    );
  },

  async signUp({ name, identifier, password, accountType, avatar }) {
    const { email, phone } = identifierToEmail(identifier);
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName: name.trim() });
    await setDoc(
      doc(db, 'users', cred.user.uid),
      { name: name.trim(), email: phone ? '' : email, phone, accountType, avatar: avatar || '', createdAt: Date.now() },
      { merge: true },
    );
  },

  async signIn(identifier, password, remember) {
    const { email } = identifierToEmail(identifier);
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  },

  async signInGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    try {
      const cred = await signInWithPopup(auth, provider);
      const ref = doc(db, 'users', cred.user.uid);
      const existing = await getDoc(ref).catch(() => null);
      if (!existing || !existing.exists()) {
        await setDoc(
          ref,
          {
            name: cred.user.displayName || (cred.user.email ? cred.user.email.split('@')[0] : 'Utilizador'),
            email: cred.user.email || '',
            phone: '',
            accountType: 'pessoal',
            avatar: cred.user.photoURL || '',
            createdAt: Date.now(),
          },
          { merge: true },
        );
      }
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  },

  async signOut() {
    await fbSignOut(auth);
  },

  async resetPassword(identifier) {
    const { email, phone } = identifierToEmail(identifier);
    if (phone) {
      throw Object.assign(new Error('Contas criadas com número de telefone não recebem email. Peça ajuda ao suporte para repor a palavra-passe.'), {
        code: 'app/phone-reset',
      });
    }
    await sendPasswordResetEmail(auth, email);
  },

  async updateProfile(uid, patch) {
    await setDoc(doc(db, 'users', uid), clean({ ...patch }), { merge: true });
    if (patch.name && auth.currentUser) await fbUpdateProfile(auth.currentUser, { displayName: patch.name });
  },

  /* --------------------------------- Grupos --------------------------------- */
  watchGroups(uid, cb, onError) {
    const groups = new Map<string, DocumentData>();
    const members = new Map<string, Member[]>();
    const memberUnsubs = new Map<string, () => void>();
    let ready = false;
    const emit = () => {
      if (!ready) return;
      cb(
        [...groups.entries()]
          .map(([id, d]) => mapGroup(id, d, (members.get(id) || []).slice().sort((a, b) => a.joinedAt - b.joinedAt)))
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    };
    const unsub = onSnapshot(
      query(collection(db, 'groups'), where('memberIds', 'array-contains', uid)),
      (snap) => {
        const seen = new Set<string>();
        snap.forEach((g) => {
          seen.add(g.id);
          groups.set(g.id, g.data());
          if (!memberUnsubs.has(g.id)) {
            memberUnsubs.set(
              g.id,
              onSnapshot(
                collection(db, 'groups', g.id, 'members'),
                (ms) => {
                  members.set(
                    g.id,
                    ms.docs.map((m) => {
                      const x = m.data();
                      const name = x.name || 'Participante';
                      return { id: m.id, name, avatar: x.avatar || makeAvatar(name), joinedAt: x.joinedAt || 0 };
                    }),
                  );
                  emit();
                },
                () => {},
              ),
            );
          }
        });
        for (const id of [...groups.keys()]) {
          if (!seen.has(id)) {
            groups.delete(id);
            members.delete(id);
            memberUnsubs.get(id)?.();
            memberUnsubs.delete(id);
          }
        }
        ready = true;
        emit();
      },
      (e) => onError?.(e),
    );
    return () => {
      unsub();
      memberUnsubs.forEach((u) => u());
    };
  },

  async createGroup(user, input) {
    const gref = doc(collection(db, 'groups'));
    let code = '';
    for (let i = 0; i < 10; i++) {
      const candidate = generateCode();
      const taken = (await getDoc(doc(db, 'codes', candidate))).exists();
      if (!taken) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('Não foi possível gerar um código de convite. Tente novamente.');
    const now = Date.now();
    const data = {
      name: input.name.trim(),
      coverImage: input.coverImage,
      occasion: input.occasion,
      occasionLabel: input.occasionLabel.trim(),
      place: input.place.trim(),
      rules: input.rules.trim(),
      revealDate: input.revealDate,
      deliveryDate: input.deliveryDate,
      drawDate: input.drawDate,
      drawTime: input.drawTime,
      drawAt: input.drawAt,
      timeZone: input.timeZone,
      autoDraw: input.autoDraw,
      maxParticipants: input.maxParticipants,
      budget: input.budget,
      currency: 'MZN',
      code,
      adminId: user.id,
      memberIds: [user.id],
      status: 'pending',
      drawRound: 0,
      createdAt: now,
    };
    const batch = writeBatch(db);
    batch.set(gref, data);
    batch.set(doc(db, 'codes', code), {
      groupId: gref.id,
      groupName: data.name,
      adminId: user.id,
      maxParticipants: data.maxParticipants,
      status: data.status,
      createdAt: now,
    });
    batch.set(doc(db, 'groups', gref.id, 'members', user.id), { name: user.name, avatar: user.hasPhoto ? user.avatar : '', joinedAt: now });
    await batch.commit();
    return mapGroup(gref.id, data, [{ id: user.id, name: user.name, avatar: user.avatar, joinedAt: now }]);
  },

  async updateGroup(groupId, input) {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grupo não encontrado.');
    const code = groupSnap.data().code as string | undefined;
    const batch = writeBatch(db);
    batch.update(groupRef, {
      name: input.name.trim(),
      coverImage: input.coverImage,
      occasion: input.occasion,
      occasionLabel: input.occasionLabel.trim(),
      place: input.place.trim(),
      rules: input.rules.trim(),
      revealDate: input.revealDate,
      deliveryDate: input.deliveryDate,
      drawDate: input.drawDate,
      drawTime: input.drawTime,
      drawAt: input.drawAt,
      timeZone: input.timeZone,
      autoDraw: input.autoDraw,
      maxParticipants: input.maxParticipants,
      budget: input.budget,
    });
    if (code) {
      batch.set(doc(db, 'codes', code), {
        groupId,
        groupName: input.name.trim(),
        adminId: auth.currentUser?.uid || '',
        maxParticipants: input.maxParticipants,
        status: groupSnap.data().status,
      }, { merge: true });
    }
    await batch.commit();
  },

  async joinByCode(user, raw) {
    const code = normalizeCode(raw);
    if (code.length < 4) throw new Error('Introduza o código completo do convite.');
    const snap = await getDoc(doc(db, 'codes', code));
    if (!snap.exists()) throw new Error('Código não encontrado. Confirme com o organizador.');
    const { groupId, groupName, adminId, status } = snap.data() as { groupId: string; groupName: string; adminId: string; status?: string };
    const joinedAt = Date.now();
    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', groupId), {
      memberIds: arrayUnion(user.id),
      ...(status === 'drawn' ? { status: 'pending' } : {}),
    });
    batch.set(doc(db, 'groups', groupId, 'members', user.id), { name: user.name, avatar: user.hasPhoto ? user.avatar : '', joinedAt });
    if (adminId && adminId !== user.id) {
      const afterDraw = status === 'drawn';
      batch.set(doc(collection(db, 'users', adminId, 'notifications')), {
        title: afterDraw ? 'Novo participante após o sorteio' : 'Novo participante',
        message: afterDraw
          ? `${user.name} entrou no grupo "${groupName}" depois do sorteio. Refaça o sorteio para incluir esta pessoa.`
          : `${user.name} entrou no grupo "${groupName}".`,
        type: 'group',
        groupId,
        read: false,
        createdAt: joinedAt,
        from: user.id,
      });
    }
    try {
      await batch.commit();
    } catch (e) {
      if ((e as { code?: string }).code === 'permission-denied') {
        throw new Error('Não foi possível entrar: as condições do grupo mudaram. Confirme se ainda há vagas e tente novamente.');
      }
      throw e;
    }
    return { groupId, groupName };
  },

  async leaveGroup(group, uid) {
    if (uid === auth.currentUser?.uid && uid === group.adminId) {
      throw new Error('Transfira a organização para outro participante antes de sair do grupo.');
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', group.id), {
      memberIds: arrayRemove(uid),
      ...(group.status === 'drawn' ? { status: 'pending' } : {}),
    });
    batch.delete(doc(db, 'groups', group.id, 'members', uid));
    await batch.commit();
  },

  async removeGroupMember(groupId, memberId) {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grupo não encontrado.');
    const group = mapGroup(groupId, groupSnap.data(), []);
    if (group.adminId !== auth.currentUser?.uid) throw new Error('Só o organizador pode remover participantes.');
    if (memberId === group.adminId) throw new Error('Transfira a organização antes de sair do grupo.');
    const memberSnap = await getDoc(doc(db, 'groups', groupId, 'members', memberId));
    if (!memberSnap.exists()) throw new Error('Este participante já não está no grupo.');
    const batch = writeBatch(db);
    batch.update(groupRef, {
      memberIds: arrayRemove(memberId),
      ...(group.status === 'drawn' ? { status: 'pending' } : {}),
    });
    batch.delete(doc(db, 'groups', groupId, 'members', memberId));
    batch.set(doc(collection(db, 'users', memberId, 'notifications')), {
      title: 'Removido do grupo',
      message: `O organizador removeu você do grupo "${group.name}".`,
      type: 'group',
      groupId,
      read: false,
      createdAt: Date.now(),
      from: auth.currentUser.uid,
    });
    await batch.commit();
  },

  async addGroupMember(groupId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) throw new Error('Introduza um email válido.');
    const matches = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)));
    const match = matches.docs[0];
    if (!match) throw new Error('Não há uma conta com esse email. Peça à pessoa para criar uma conta com email e tente novamente.');
    const userId = match.id;
    const userData = match.data();
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grupo não encontrado.');
    const group = mapGroup(groupId, groupSnap.data(), []);
    if (group.adminId !== auth.currentUser?.uid) throw new Error('Só o organizador pode adicionar participantes.');
    if (group.memberIds.includes(userId)) throw new Error('Essa pessoa já faz parte do grupo.');
    if (group.memberIds.length >= group.maxParticipants) throw new Error(`O grupo já atingiu o limite de ${group.maxParticipants} participantes.`);
    const memberName = userData.name || 'Participante';
    const batch = writeBatch(db);
    batch.update(groupRef, {
      memberIds: arrayUnion(userId),
      ...(group.status === 'drawn' ? { status: 'pending' } : {}),
    });
    batch.set(doc(db, 'groups', groupId, 'members', userId), {
      name: memberName,
      avatar: userData.avatar || makeAvatar(memberName),
      joinedAt: Date.now(),
    });
    batch.set(doc(collection(db, 'users', userId, 'notifications')), {
      title: 'Você foi adicionado a um grupo 🎁',
      message: `O organizador adicionou você ao grupo "${group.name}". Abra este aviso para ver o grupo.`,
      type: 'group',
      groupId,
      read: false,
      createdAt: Date.now(),
      from: auth.currentUser.uid,
    });
    await batch.commit();
  },

  async transferGroupAdmin(groupId, nextAdminId) {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grupo não encontrado.');
    const group = mapGroup(groupId, groupSnap.data(), []);
    if (group.adminId !== auth.currentUser?.uid) throw new Error('Só o organizador atual pode transferir a organização.');
    if (nextAdminId === group.adminId || !group.memberIds.includes(nextAdminId)) {
      throw new Error('Escolha outro participante atual do grupo.');
    }
    const nextMember = await getDoc(doc(db, 'groups', groupId, 'members', nextAdminId));
    if (!nextMember.exists()) throw new Error('Este participante já não está no grupo.');
    const batch = writeBatch(db);
    batch.update(groupRef, { adminId: nextAdminId });
    if (group.code) {
      batch.set(doc(db, 'codes', group.code), {
        adminId: nextAdminId,
        groupName: group.name,
        maxParticipants: group.maxParticipants,
        status: group.status,
      }, { merge: true });
    }
    batch.set(doc(collection(db, 'users', nextAdminId, 'notifications')), {
      title: 'Você é o novo organizador',
      message: `A organização do grupo "${group.name}" foi transferida para você.`,
      type: 'group',
      groupId,
      read: false,
      createdAt: Date.now(),
      from: auth.currentUser.uid,
    });
    await batch.commit();
  },

  async deleteGroup(group) {
    const batch = writeBatch(db);
    if (group.code) batch.delete(doc(db, 'codes', group.code));
    batch.delete(doc(db, 'groups', group.id));
    await batch.commit();
  },

  async syncMemberProfile(groupId, user) {
    await setDoc(doc(db, 'groups', groupId, 'members', user.id), { name: user.name, avatar: user.hasPhoto ? user.avatar : '' }, { merge: true });
  },

  async runDraw(group) {
    if (group.members.length < 3) throw new Error('São precisos pelo menos 3 participantes para sortear.');
    const pairs = drawCycle(group.members.map((m) => m.id));
    const round = (group.drawRound || 0) + 1;
    const now = Date.now();
    const batch = writeBatch(db);
    batch.update(doc(db, 'groups', group.id), { status: 'drawn', drawRound: round, drawnAt: now });
    if (group.code) {
      batch.set(doc(db, 'codes', group.code), {
        groupId: group.id,
        groupName: group.name,
        adminId: auth.currentUser?.uid || '',
        maxParticipants: group.maxParticipants,
        status: 'drawn',
      }, { merge: true });
    }
    const organizer = group.members.find((m) => m.id === group.adminId);
    Object.entries(pairs).forEach(([giver, receiver]) => {
      batch.set(doc(db, 'groups', group.id, 'assignments', giver), { assignedTo: receiver, round, createdAt: now });
      batch.set(doc(collection(db, 'users', giver, 'notifications')), {
        title: round > 1 ? 'O sorteio foi refeito! 🎁' : 'O sorteio foi realizado! 🎁',
        message: `Olá ${group.members.find((m) => m.id === giver)?.name || 'participante'}! ${organizer?.name || 'O organizador'} já fez o sorteio do grupo "${group.name}". Abra este aviso e toque em "Ver Sorteio" para descobrir quem é o seu amigo secreto.`,
        type: 'draw',
        groupId: group.id,
        read: false,
        createdAt: now,
        from: auth.currentUser?.uid || '',
      });
    });
    await batch.commit();
  },

  watchAssignment(groupId, uid, cb) {
    return onSnapshot(
      doc(db, 'groups', groupId, 'assignments', uid),
      (snap) => (snap.exists() ? cb(snap.data().assignedTo || null, snap.data().round || 0) : cb(null, 0)),
      () => cb(null, 0),
    );
  },

  /* ---------------------------------- Chat ---------------------------------- */
  watchThreads(uid, groupIds, cb, onError) {
    const sources = new Map<string, Thread[]>();
    const unsubs: (() => void)[] = [];
    const emit = () => {
      const all = new Map<string, Thread>();
      sources.forEach((list) => list.forEach((t) => all.set(`${t.groupId}/${t.id}`, t)));
      cb([...all.values()]);
    };
    groupIds.forEach((gid) => {
      unsubs.push(
        onSnapshot(
          doc(db, 'groups', gid, 'threads', 'geral'),
          (snap) => {
            sources.set(`g:${gid}`, snap.exists() ? [mapThread(gid, snap)] : []);
            emit();
          },
          (e) => onError?.(e),
        ),
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'groups', gid, 'threads'), where('participants', 'array-contains', uid)),
          (snap) => {
            sources.set(`p:${gid}`, snap.docs.map((d) => mapThread(gid, d)));
            emit();
          },
          (e) => onError?.(e),
        ),
      );
    });
    if (groupIds.length === 0) cb([]);
    return () => unsubs.forEach((u) => u());
  },

  watchMessages(ref, cb, onError) {
    return onSnapshot(
      query(collection(tRef(ref), 'messages'), orderBy('createdAt', 'desc'), limit(300)),
      { includeMetadataChanges: true },
      (snap) => {
        const list: Message[] = snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            senderId: x.senderId,
            senderName: x.senderName || '',
            text: x.text || '',
            createdAt: tsToMs(x.createdAt) || x.clientAt || Date.now(),
            attachment: x.attachment,
            deleted: !!x.deleted,
            pending: d.metadata.hasPendingWrites,
          };
        });
        cb(list.sort((a, b) => a.createdAt - b.createdAt));
      },
      (e) => onError?.(e),
    );
  },

  async sendMessage(user, ref, senderName, p) {
    const batch = writeBatch(db);
    const thread = tRef(ref);
    const mref = doc(collection(thread, 'messages'));
    let attachment: Record<string, unknown> | undefined;
    if (p.attachment) {
      attachment = clean({ ...p.attachment }) as Record<string, unknown>;
      if (p.inlineData) {
        const media = doc(collection(thread, 'media'));
        batch.set(media, { senderId: user.id, mime: p.attachment.mime, data: p.inlineData, createdAt: Date.now() });
        attachment.mediaId = media.id;
      }
    }
    const threadData: Record<string, unknown> = {
      groupId: ref.groupId,
      kind: ref.kind,
      round: ref.round,
      count: increment(1),
      lastText: previewOf({ text: p.text, attachment: p.attachment }).slice(0, 140),
      lastSenderId: user.id,
      lastSenderName: senderName,
      lastAt: serverTimestamp(),
      reads: { [user.id]: increment(1) },
      readAt: { [user.id]: serverTimestamp() },
    };
    if (ref.kind !== 'group') threadData.participants = ref.participants;
    batch.set(thread, threadData, { merge: true });
    batch.set(
      mref,
      clean({
        senderId: user.id,
        senderName,
        text: p.text,
        attachment,
        createdAt: serverTimestamp(),
        clientAt: Date.now(),
        deleted: false,
      }),
    );
    await batch.commit();
  },

  async markThreadRead(ref, uid, count) {
    await updateDoc(tRef(ref), { [`reads.${uid}`]: count, [`readAt.${uid}`]: serverTimestamp() });
  },

  async deleteMessage(ref, msg) {
    await updateDoc(doc(tRef(ref), 'messages', msg.id), { deleted: true, text: '', attachment: deleteField() });
    if (msg.attachment?.mediaId) await deleteDoc(doc(tRef(ref), 'media', msg.attachment.mediaId)).catch(() => {});
  },

  async getMedia(ref, mediaId) {
    const key = `${ref.groupId}/${ref.id}/${mediaId}`;
    const hit = mediaCache.get(key);
    if (hit) return hit;
    const snap = await getDoc(doc(tRef(ref), 'media', mediaId));
    if (!snap.exists()) return null;
    const data = snap.data().data as string;
    mediaCache.set(key, data);
    return data;
  },

  /* ----------------------------- Lista de desejos ---------------------------- */
  watchWishlist(uid, cb) {
    return onSnapshot(
      query(collection(db, 'wishlists'), where('userId', '==', uid)),
      (snap) =>
        cb(
          snap.docs
            .map((d) => {
              const x = d.data();
              return {
                id: d.id,
                userId: x.userId,
                title: x.title || '',
                price: x.price || 0,
                currency: x.currency || 'MZN',
                category: x.category || 'Outros',
                imageUrl: x.imageUrl || '',
                storeUrl: x.storeUrl || '',
                favorite: !!x.favorite,
                createdAt: x.createdAt || 0,
              } as WishItem;
            })
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      () => cb([]),
    );
  },

  async saveWish(item) {
    const { id, ...rest } = item;
    await setDoc(doc(db, 'wishlists', id), clean({ ...rest }));
  },

  async deleteWish(id) {
    await deleteDoc(doc(db, 'wishlists', id));
  },

  /* ------------------------------- Notificações ------------------------------ */
  watchNotifications(uid, cb) {
    return onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) =>
        cb(
          snap.docs.map((d) => {
            const x = d.data();
            return { id: d.id, title: x.title, message: x.message, type: x.type || 'group', groupId: x.groupId, read: !!x.read, createdAt: x.createdAt || 0 } as AppNotification;
          }),
        ),
      () => cb([]),
    );
  },

  async notify(toUid, fromUid, n) {
    await setDoc(doc(collection(db, 'users', toUid, 'notifications')), clean({ ...n, read: false, createdAt: Date.now(), from: fromUid }));
  },

  async markNotificationsRead(uid, ids) {
    if (!ids.length) return;
    const batch = writeBatch(db);
    ids.forEach((id) => batch.update(doc(db, 'users', uid, 'notifications', id), { read: true }));
    await batch.commit();
  },
};

export type { ThreadRef, User };
