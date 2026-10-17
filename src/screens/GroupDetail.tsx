import { useEffect, useState } from 'react';
import { Shuffle, ArrowLeft, CalendarDays, CheckCircle2, Copy, Gift, Heart, Loader2, LogOut, MapPin, MessageCircle, MoreVertical, Share2, Star, Trash2, UserMinus, Wallet } from 'lucide-react';
import { backend, threadIds } from '../services/backend';
import { friendlyError } from '../services/errors';
import type { Group, Member, ThreadRef } from '../types';
import { useApp } from '../state';
import { Avatar, Sheet, bg, confirmDialog, photo, toast } from '../ui/kit';
import { countdown, formatDateShort, formatMoney, plural } from '../utils/format';
import { groupPhoto, occasionText } from '../utils/occasions';
import { TopBar } from './common';
import { CountdownBoxes } from './CountdownBanner';

export function useGroup(id: string) {
  const { groups, groupsReady } = useApp();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const g = groups.find((x) => x.id === id) || null;
  return { g, missing: !g && groupsReady && waited };
}

export function GroupMissing({ missing }: { missing: boolean }) {
  const { back } = useApp();
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14 }}>
      {missing ? (
        <>
          <p className="t-h2">Este grupo já não está disponível</p>
          <p className="t-sub">Pode ter sido apagado ou já não faz parte dele.</p>
          <button className="btn sm" onClick={back}>Voltar</button>
        </>
      ) : (
        <Loader2 className="spin" color="#157a4f" />
      )}
    </div>
  );
}

export const refs = {
  group: (g: Group): ThreadRef => ({ groupId: g.id, id: threadIds.group(), kind: 'group', participants: [], round: 0 }),
  direct: (g: Group, me: string, other: string): ThreadRef => ({ groupId: g.id, id: threadIds.direct(me, other), kind: 'direct', participants: [me, other].sort(), round: 0 }),
  secretGiver: (g: Group, me: string, receiver: string): ThreadRef => ({ groupId: g.id, id: threadIds.secret(g.drawRound, receiver), kind: 'secret', participants: [me, receiver], round: g.drawRound }),
};

export function MemberSheet({ g, m, onClose }: { g: Group; m: Member | null; onClose: () => void }) {
  const { user, go } = useApp();
  if (!m) return null;
  const me = m.id === user.id;
  const remove = async () => {
    const ok = await confirmDialog({ title: `Remover ${m.name}?`, message: 'A pessoa deixa de ver este grupo.', confirm: 'Remover', danger: true });
    if (!ok) return;
    try {
      await backend.leaveGroup(g, m.id);
      toast(`${m.name} foi removido(a).`);
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  };
  return (
    <Sheet open onClose={onClose} label={m.name}>
      <div className="row" style={{ gap: 14 }}>
        <Avatar src={m.avatar} size={56} />
        <div className="grow">
          <h3 className="t-h2">{m.name}{me && ' (você)'}</h3>
          <p className="t-small mt4">{m.id === g.adminId ? 'Organizador do grupo' : 'Participante'}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {!me && (
          <button className="btn" onClick={() => { onClose(); go({ name: 'conv', ref: refs.direct(g, user.id, m.id) }); }}>
            <MessageCircle size={18} /> Enviar mensagem privada
          </button>
        )}
        <button className="btn outline" onClick={() => { onClose(); go({ name: 'wishes', ownerId: m.id, ownerName: me ? undefined : m.name }); }}>
          <Heart size={18} /> Ver lista de desejos
        </button>
        {g.adminId === user.id && !me && g.status === 'pending' && (
          <button className="btn danger" onClick={remove}><UserMinus size={18} /> Remover do grupo</button>
        )}
      </div>
    </Sheet>
  );
}

export function GroupScreen({ id }: { id: string }) {
  const { user, go, back, openShare } = useApp();
  const { g, missing } = useGroup(id);
  const [menu, setMenu] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!g) return <GroupMissing missing={missing} />;

  const isAdmin = g.adminId === user.id;
  const cd = countdown(g.revealDate);
  const admin = g.members.find((m) => m.id === g.adminId);

  const leave = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: 'Sair do grupo?', message: 'Deixa de ver o grupo e o seu chat. Pode voltar a entrar com o código, antes do sorteio.', confirm: 'Sair', danger: true });
    if (!ok) return;
    try {
      await backend.leaveGroup(g, user.id);
      toast('Saiu do grupo.');
      back();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  };
  const remove = async () => {
    setMenu(false);
    const ok = await confirmDialog({ title: `Apagar "${g.name}"?`, message: 'O grupo, o sorteio e o chat deixam de estar disponíveis para todos. Não é possível desfazer.', confirm: 'Apagar grupo', danger: true });
    if (!ok) return;
    try {
      await backend.deleteGroup(g);
      toast('Grupo apagado.');
      back();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  };

  return (
    <>
      <div className="scroll">
        <div className="photo-head" style={bg(photo('group'))}>
          <div className="bar">
            <button className="icon-btn light" onClick={back} aria-label="Voltar"><ArrowLeft size={22} /></button>
            <span className="grow" />
            <button className="icon-btn light" onClick={() => setMenu(true)} aria-label="Mais opções"><MoreVertical size={22} /></button>
          </div>
        </div>
        <div className="sheet-up" style={{ padding: '0 16px 24px' }}>
          <div className="row" style={{ gap: 12, paddingTop: 14 }}>
            <img src={groupPhoto(g)} alt="" style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'cover', marginTop: -34, border: '3px solid #fff', boxShadow: '0 4px 14px rgba(0,0,0,.15)' }} />
            <div className="grow">
              <h1 className="t-h2 truncate" style={{ fontSize: 17 }}>{g.name}</h1>
              <p className="t-small">{plural(g.members.length, 'membro', 'membros')} · {occasionText(g)}</p>
            </div>
            <span className="pill"><CheckCircle2 size={11} /> {g.status === 'drawn' ? 'Sorteado' : 'Ativo'}</span>
          </div>

          <div className="card mt16">
            <div className="info-line">
              <span className="info-ico"><CalendarDays size={19} /></span>
              <div className="grow">
                <p className="t-small">Data da revelação</p>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{formatDateShort(g.revealDate)}</p>
              </div>
            </div>
            <div className="info-line" style={{ borderTop: '1px solid #eef2ef' }}>
              <span className="info-ico"><Wallet size={19} /></span>
              <div className="grow">
                <p className="t-small">Orçamento sugerido</p>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{g.budget ? formatMoney(g.budget, g.currency) : 'Livre'}</p>
              </div>
            </div>
            {g.drawDate && g.status === 'pending' && (
              <div className="info-line" style={{ borderTop: '1px solid #eef2ef' }}>
                <span className="info-ico"><Shuffle size={19} /></span>
                <div className="grow">
                  <p className="t-small">Dia do sorteio{g.autoDraw ? ' (automático)' : ''}</p>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{formatDateShort(g.drawDate)}</p>
                </div>
              </div>
            )}
            {g.place && (
              <div className="info-line" style={{ borderTop: '1px solid #eef2ef' }}>
                <span className="info-ico"><MapPin size={19} /></span>
                <div className="grow">
                  <p className="t-small">Local</p>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{g.place}</p>
                </div>
              </div>
            )}
            {cd && (
              <div style={{ padding: '4px 14px 14px' }}>
                {cd.today ? (
                  <p className="center" style={{ fontWeight: 600, color: '#0e4d33', padding: 10 }}>🎉 A revelação é hoje!</p>
                ) : cd.past ? (
                  <p className="center t-sub" style={{ padding: 8 }}>A revelação já aconteceu.</p>
                ) : (
                  <CountdownBoxes iso={g.revealDate} />
                )}
              </div>
            )}
          </div>

          <div className="tiles mt16">
            <button className="tile" onClick={() => go({ name: 'wishes' })}><Gift size={24} />Lista de Desejos</button>
            <button className="tile" onClick={() => go({ name: 'draw', id: g.id })}><Star size={24} />Ver Sorteio</button>
            <button className="tile" onClick={() => go({ name: 'conv', ref: refs.group(g) })}><MessageCircle size={24} />Chat do Grupo</button>
          </div>

          <div className="row between mt20">
            <h2 className="t-h2" style={{ fontSize: 14 }}>Membros do Grupo</h2>
            <button className="t-link" onClick={() => go({ name: 'members', id: g.id })}>Ver todos</button>
          </div>
          <div className="avatars mt12" style={{ flexWrap: 'wrap', rowGap: 6 }}>
            {g.members.slice(0, 9).map((m) => (
              <button key={m.id} onClick={() => setMember(m)} aria-label={m.name} style={{ marginLeft: 0, marginRight: -4 }}>
                <img src={m.avatar} alt={m.name} />
              </button>
            ))}
            {g.members.length > 9 && <span>+{g.members.length - 9}</span>}
          </div>

          <div className="code-box mt20">
            <div className="grow">
              <p className="t-small">Código de convite</p>
              <b>{g.code}</b>
            </div>
            <button className="icon-btn" onClick={() => { navigator.clipboard?.writeText(g.code); toast('Código copiado.'); }} aria-label="Copiar código"><Copy size={19} /></button>
            <button className="btn sm" onClick={() => openShare(g)}><Share2 size={16} /> Convidar</button>
          </div>
          {g.status === 'drawn' && <p className="t-small mt8">O sorteio já foi feito: novas pessoas só entram se o organizador refizer o sorteio.</p>}
          {admin && !isAdmin && <p className="t-small mt12">Organizador: {admin.name}</p>}
        </div>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} label="Opções do grupo">
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn outline" onClick={() => { setMenu(false); openShare(g); }}><Share2 size={18} /> Partilhar convite</button>
          {!isAdmin && <button className="btn danger" onClick={leave}><LogOut size={18} /> Sair do grupo</button>}
          {isAdmin && <button className="btn danger" onClick={remove}><Trash2 size={18} /> Apagar grupo</button>}
        </div>
      </Sheet>
      <MemberSheet g={g} m={member} onClose={() => setMember(null)} />
    </>
  );
}

export function MembersScreen({ id }: { id: string }) {
  const { user, openShare } = useApp();
  const { g, missing } = useGroup(id);
  const [member, setMember] = useState<Member | null>(null);
  if (!g) return <GroupMissing missing={missing} />;
  return (
    <>
      <TopBar title={`Membros (${g.members.length})`} right={<button className="btn sm ghost" onClick={() => openShare(g)}><Share2 size={16} /> Convidar</button>} />
      <div className="scroll">
        {g.members.map((m) => (
          <button key={m.id} className="chat-row" onClick={() => setMember(m)}>
            <Avatar src={m.avatar} size={46} />
            <div className="grow">
              <h3 className="truncate">{m.name}{m.id === user.id && ' (você)'}</h3>
              <p className="prev">{m.id === g.adminId ? 'Organizador' : 'Participante'}</p>
            </div>
            {m.id === g.adminId && <span className="tag gold">Organizador</span>}
          </button>
        ))}
      </div>
      <MemberSheet g={g} m={member} onClose={() => setMember(null)} />
    </>
  );
}
