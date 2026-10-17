import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Group, Thread, ThreadRef } from '../types';
import { unreadOf, useApp } from '../state';
import { Avatar, Empty } from '../ui/kit';
import { formatListTime } from '../utils/format';
import { groupPhoto } from '../utils/occasions';
import { MaskAvatar } from './common';
import { refs } from './GroupDetail';

export interface ChatRow {
  key: string;
  ref: ThreadRef;
  group: Group;
  thread?: Thread;
  title: string;
  subtitle: string;
  avatar?: string;
  mask?: boolean;
  tag?: string;
}

/** Monta as conversas visíveis: chat de cada grupo + privadas + secretas da ronda atual. */
export function useChatRows(): ChatRow[] {
  const { user, groups, threads, assignments } = useApp();
  return useMemo(() => {
    const rows: ChatRow[] = [];
    for (const g of groups) {
      const mine = threads.filter((t) => t.groupId === g.id);
      const geral = mine.find((t) => t.id === 'geral');
      rows.push({ key: `${g.id}/geral`, ref: refs.group(g), group: g, thread: geral, title: g.name, subtitle: `${g.members.length} membros`, avatar: groupPhoto(g) });
      for (const t of mine) {
        if (t.id === 'geral' || t.count === 0) continue;
        if (t.kind === 'direct') {
          const other = t.participants.find((p) => p !== user.id) || '';
          const m = g.members.find((x) => x.id === other);
          if (!m) continue;
          rows.push({ key: `${g.id}/${t.id}`, ref: { groupId: g.id, id: t.id, kind: 'direct', participants: t.participants, round: 0 }, group: g, thread: t, title: m.name, subtitle: g.name, avatar: m.avatar, tag: 'Privado' });
        } else if (t.kind === 'secret' && t.round === g.drawRound && g.status === 'drawn') {
          const receiver = t.id.slice(t.id.indexOf('_') + 1);
          const ref: ThreadRef = { groupId: g.id, id: t.id, kind: 'secret', participants: t.participants, round: t.round };
          if (receiver === user.id) {
            rows.push({ key: `${g.id}/${t.id}`, ref, group: g, thread: t, title: 'Amigo Secreto', subtitle: g.name, mask: true, tag: 'Anónimo' });
          } else if (assignments[g.id] === receiver) {
            const m = g.members.find((x) => x.id === receiver);
            rows.push({ key: `${g.id}/${t.id}`, ref, group: g, thread: t, title: m?.name || 'O meu amigo secreto', subtitle: g.name, avatar: m?.avatar, tag: 'Secreto 🎭' });
          }
        }
      }
    }
    return rows.sort((a, b) => (b.thread?.lastAt || b.group.createdAt / 1e3) - (a.thread?.lastAt || a.group.createdAt / 1e3));
  }, [groups, threads, assignments, user.id]);
}

export function ChatListScreen() {
  const { user, go, replace, route, groups, chatError } = useApp();
  const openRef = route.name === 'conv' ? route.ref : null;
  const rows = useChatRows();
  return (
    <>
      <header className="topbar" style={{ paddingLeft: 20 }}>
        <MessageCircle size={24} color="#0f5a3b" fill="#0f5a3b" fillOpacity={0.12} />
        <h1 className="grow">Chat</h1>
      </header>
      {chatError && <div className="banner">{chatError}</div>}
      <div className="scroll">
        {groups.length === 0 ? (
          <Empty icon={MessageCircle} title="Sem conversas" text="Entre num grupo para conversar com os outros participantes." />
        ) : (
          rows.map((r) => {
            const unread = unreadOf(r.thread, user.id);
            const t = r.thread;
            let prev = r.subtitle;
            if (t && t.count > 0) {
              const who = t.lastSenderId === user.id ? 'Você' : r.ref.kind === 'group' ? t.lastSenderName.split(' ')[0] : '';
              prev = who ? `${who}: ${t.lastText}` : t.lastText;
            } else if (r.ref.kind === 'group') {
              prev = 'Diga olá ao grupo 👋';
            }
            return (
              <button key={r.key} className={openRef && openRef.groupId === r.ref.groupId && openRef.id === r.ref.id ? 'chat-row active' : 'chat-row'} onClick={() => (openRef ? replace({ name: 'conv', ref: r.ref }) : go({ name: 'conv', ref: r.ref }))}>
                {r.mask ? <MaskAvatar size={48} /> : <Avatar src={r.avatar || ''} size={48} />}
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <h3 className="truncate">{r.title}</h3>
                    {r.tag && <span className={r.ref.kind === 'secret' ? 'tag gold' : 'tag'}>{r.tag}</span>}
                  </div>
                  <p className="prev truncate mt4">{prev}</p>
                  {r.ref.kind !== 'group' && <p className="t-small truncate" style={{ fontSize: 11 }}>{r.subtitle}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, alignSelf: 'flex-start', paddingTop: 2 }}>
                  <span className={unread ? 'time new' : 'time'}>{t?.count ? formatListTime(t.lastAt) : ''}</span>
                  {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
