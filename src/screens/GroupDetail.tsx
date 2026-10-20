import { useEffect, useRef, useState } from 'react';
import { Shuffle, ArrowLeft, ArrowRightLeft, CalendarDays, Camera, CheckCircle2, Clock, Coins, Copy, Gift, Heart, ImagePlus, Loader2, LogOut, Mail, MapPin, MessageCircle, MoreVertical, PencilLine, Share2, Star, Tag, Trash2, UserMinus, UserPlus, Users, Wallet, X } from 'lucide-react';
import { backend, threadIds } from '../services/backend';
import { friendlyError } from '../services/errors';
import { groupImageFromFile } from '../services/media';
import type { NewGroupInput } from '../services/backend';
import type { Group, Member, ThreadRef } from '../types';
import { useApp } from '../state';
import { Avatar, Field, Sheet, bg, confirmDialog, toast } from '../ui/kit';
import { countdown, formatDateShort, formatMoney, plural } from '../utils/format';
import { groupPhoto, OCCASIONS, occasionText } from '../utils/occasions';
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
  const [busy, setBusy] = useState(false);
  if (!m) return null;
  const me = m.id === user.id;
  const remove = async () => {
    const ok = await confirmDialog({
      title: `Remover ${m.name}?`,
      message: g.status === 'drawn'
        ? 'A pessoa deixará de ver o grupo e o sorteio atual será invalidado. O organizador terá de sortear novamente.'
        : 'A pessoa deixará de ver este grupo.',
      confirm: 'Remover',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await backend.removeGroupMember(g.id, m.id);
      toast(`${m.name} foi removido(a).`);
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setBusy(false);
  };
  const transfer = async () => {
    const ok = await confirmDialog({
      title: `Transferir organização para ${m.name}?`,
      message: 'A pessoa passará a organizar o grupo. Você continuará como participante e poderá sair depois.',
      confirm: 'Transferir organização',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await backend.transferGroupAdmin(g.id, m.id);
      toast(`Agora ${m.name} é o organizador do grupo.`);
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setBusy(false);
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
        {g.adminId === user.id && !me && m.id !== g.adminId && (
          <>
            <button className="btn outline" onClick={transfer} disabled={busy}><ArrowRightLeft size={18} /> Transferir organização</button>
            <button className="btn danger" onClick={remove} disabled={busy}><UserMinus size={18} /> Remover do grupo</button>
          </>
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
  const [editForm, setEditForm] = useState<NewGroupInput | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const coverFile = useRef<HTMLInputElement>(null);
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
    const ok = await confirmDialog({
      title: 'Sair do grupo?',
      message: g.status === 'drawn'
        ? 'Deixará de ver o grupo e o sorteio atual será invalidado. O organizador terá de sortear novamente.'
        : 'Deixará de ver este grupo e o respetivo chat. Poderá voltar a entrar com o código se houver vagas.',
      confirm: 'Sair',
      danger: true,
    });
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
  const openEditor = () => {
    setEditForm({
      name: g.name,
      coverImage: g.coverImage,
      occasion: g.occasion,
      occasionLabel: g.occasionLabel,
      place: g.place,
      rules: g.rules,
      revealDate: g.revealDate,
      deliveryDate: g.deliveryDate,
      drawDate: g.drawDate,
      drawTime: g.drawTime || '19:00',
      drawAt: g.drawAt,
      timeZone: g.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
      autoDraw: g.autoDraw,
      maxParticipants: g.maxParticipants,
      budget: g.budget,
    });
    setMenu(false);
  };
  const updateEditForm = <K extends keyof NewGroupInput>(key: K, value: NewGroupInput[K]) => {
    setEditForm((current) => current ? { ...current, [key]: value } : current);
  };
  const chooseCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editForm) return;
    setImageBusy(true);
    try {
      updateEditForm('coverImage', await groupImageFromFile(file));
    } catch (error) {
      toast(friendlyError(error), 'error');
    }
    setImageBusy(false);
  };
  const saveGroup = async () => {
    if (!editForm) return;
    if (editForm.name.trim().length < 2) return toast('Dê um nome ao grupo.', 'error');
    if (editForm.occasion === 'outra' && !editForm.occasionLabel.trim()) return toast('Escreva qual é a ocasião.', 'error');
    if (!editForm.revealDate) return toast('Escolha a data da revelação.', 'error');
    if (editForm.drawDate && editForm.drawDate > editForm.revealDate) return toast('O sorteio tem de ser antes (ou no dia) da revelação.', 'error');
    if (!Number.isInteger(editForm.maxParticipants) || editForm.maxParticipants < Math.max(3, g.members.length) || editForm.maxParticipants > 100) {
      return toast(`Escolha um limite entre ${Math.max(3, g.members.length)} e 100 participantes.`, 'error');
    }
    setSavingEdit(true);
    try {
      const drawAt = editForm.drawDate ? new Date(`${editForm.drawDate}T${editForm.drawTime || '00:00'}:00`).getTime() : 0;
      await backend.updateGroup(g.id, { ...editForm, drawAt, autoDraw: !!editForm.drawDate && editForm.autoDraw });
      setEditForm(null);
      toast('Grupo atualizado. As alterações já estão disponíveis para todos os participantes.');
    } catch (error) {
      toast(friendlyError(error), 'error');
    }
    setSavingEdit(false);
  };

  return (
    <>
      <div className="scroll">
        <div className="photo-head" style={bg(groupPhoto(g))}>
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
            {g.deliveryDate && (
              <div className="info-line" style={{ borderTop: '1px solid #eef2ef' }}>
                <span className="info-ico"><Gift size={19} /></span>
                <div className="grow">
                  <p className="t-small">Data de entrega do presente</p>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{formatDateShort(g.deliveryDate)}</p>
                </div>
              </div>
            )}
            {g.drawDate && g.status === 'pending' && (
              <div className="info-line" style={{ borderTop: '1px solid #eef2ef' }}>
                <span className="info-ico"><Shuffle size={19} /></span>
                <div className="grow">
                  <p className="t-small">Dia do sorteio{g.autoDraw ? ' (automático)' : ''}</p>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{formatDateShort(g.drawDate)} às {g.drawTime || '00:00'}</p>
                  {g.timeZone && <p className="t-small mt4">Fuso do organizador: {g.timeZone}</p>}
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

          <div className="row between mt20" style={{ flexWrap: 'wrap' }}>
            <h2 className="t-h2" style={{ fontSize: 14 }}>Membros ({g.members.length}/{g.maxParticipants})</h2>
            {isAdmin && <button className="t-link" onClick={openEditor}>Editar grupo</button>}
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
          {g.status === 'drawn' && <p className="t-small mt8">Quem entrar depois do sorteio só recebe um resultado quando o organizador o refizer.</p>}
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
      <Sheet open={!!editForm} onClose={() => setEditForm(null)} label="Editar grupo">
        {editForm && (
          <div className="scroll" style={{ maxHeight: '78vh', padding: '0 2px 12px' }}>
            <h2 className="t-title">Editar grupo</h2>
            <p className="t-sub mt4">As alterações são sincronizadas com todos os participantes.</p>

            <label className="label mt16">Nome do grupo</label>
            <Field icon={Tag} value={editForm.name} onChange={(e) => updateEditForm('name', e.target.value)} maxLength={50} />

            <label className="label mt16">Cartaz / foto do grupo</label>
            <input ref={coverFile} type="file" accept="image/*" hidden onChange={chooseCover} />
            <button type="button" className="group-cover" onClick={() => coverFile.current?.click()} disabled={imageBusy}>
              {editForm.coverImage ? <img src={editForm.coverImage} alt="Pré-visualização da foto do grupo" /> : <><ImagePlus size={24} /><span>{imageBusy ? 'A preparar foto…' : 'Adicionar foto do grupo'}</span></>}
              {editForm.coverImage && <span className="group-cover-action"><Camera size={15} /> Trocar foto</span>}
            </button>
            {editForm.coverImage && <button className="t-link mt8" onClick={() => updateEditForm('coverImage', '')}><X size={14} /> Remover foto</button>}

            <label className="label mt16">Ocasião</label>
            <label className="field">
              <Gift size={19} />
              <select value={editForm.occasion} onChange={(e) => updateEditForm('occasion', e.target.value as NewGroupInput['occasion'])}>
                {OCCASIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            {editForm.occasion === 'outra' && <Field className="mt8" icon={PencilLine} placeholder="Escreva a ocasião" value={editForm.occasionLabel} onChange={(e) => updateEditForm('occasionLabel', e.target.value)} maxLength={40} />}

            <label className="label mt16">Local do encontro</label>
            <Field icon={MapPin} value={editForm.place} onChange={(e) => updateEditForm('place', e.target.value)} maxLength={80} />

            <label className="label mt16">Regras e orientações</label>
            <label className="field area"><textarea value={editForm.rules} onChange={(e) => updateEditForm('rules', e.target.value)} maxLength={600} /></label>

            <label className="label mt16">Data da revelação</label>
            <Field icon={CalendarDays} type="date" value={editForm.revealDate} onChange={(e) => updateEditForm('revealDate', e.target.value)} />
            <label className="label mt16">Data de entrega do presente</label>
            <Field icon={Gift} type="date" value={editForm.deliveryDate} onChange={(e) => updateEditForm('deliveryDate', e.target.value)} />

            <label className="label mt16">Data do sorteio (opcional)</label>
            <Field icon={Shuffle} type="date" max={editForm.revealDate || undefined} value={editForm.drawDate} onChange={(e) => updateEditForm('drawDate', e.target.value)} />
            {!!editForm.drawDate && (
              <>
                <label className="label mt8">Hora local do sorteio</label>
                <Field icon={Clock} type="time" value={editForm.drawTime} onChange={(e) => updateEditForm('drawTime', e.target.value)} />
                <label className="check mt8">
                  <input type="checkbox" checked={editForm.autoDraw} onChange={(e) => updateEditForm('autoDraw', e.target.checked)} />
                  <span>Sortear automaticamente só quando o grupo atingir o limite e o app do organizador estiver aberto.</span>
                </label>
              </>
            )}

            <label className="label mt16">Limite de participantes</label>
            <Field icon={Users} type="number" min={Math.max(3, g.members.length)} max={100} value={editForm.maxParticipants} onChange={(e) => updateEditForm('maxParticipants', Number(e.target.value))} />
            <label className="label mt16">Orçamento sugerido (MZN)</label>
            <Field icon={Coins} type="number" min={0} value={editForm.budget} onChange={(e) => updateEditForm('budget', Math.max(0, Number(e.target.value) || 0))} />
            <button className="btn mt20" onClick={saveGroup} disabled={savingEdit || imageBusy}>{savingEdit ? <Loader2 size={20} className="spin" /> : 'Guardar alterações'}</button>
          </div>
        )}
      </Sheet>
      <MemberSheet g={g} m={member} onClose={() => setMember(null)} />
    </>
  );
}

export function MembersScreen({ id }: { id: string }) {
  const { user, openShare } = useApp();
  const { g, missing } = useGroup(id);
  const [member, setMember] = useState<Member | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  if (!g) return <GroupMissing missing={missing} />;
  const addByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await backend.addGroupMember(g.id, email);
      toast('Participante adicionado. Ele receberá uma notificação no app.');
      setEmail('');
      setAddOpen(false);
    } catch (error) {
      toast(friendlyError(error), 'error');
    }
    setAdding(false);
  };
  return (
    <>
      <TopBar title={`Membros (${g.members.length})`} right={
        <div className="row" style={{ gap: 6 }}>
          {g.adminId === user.id && <button className="btn sm ghost" onClick={() => setAddOpen(true)}><UserPlus size={16} /> Adicionar</button>}
          <button className="btn sm ghost" onClick={() => openShare(g)}><Share2 size={16} /> Convidar</button>
        </div>
      } />
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
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} label="Adicionar participante por email">
        <form onSubmit={addByEmail}>
          <h2 className="t-title">Adicionar participante</h2>
          <p className="t-sub mt4">Introduza o email associado à conta da pessoa. Não precisa de ter número de telefone.</p>
          <Field className="mt16" icon={Mail} type="email" autoComplete="email" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <p className="t-small mt8">A pessoa deve ter criado uma conta com email para poder receber a notificação e ver o resultado.</p>
          <button className="btn mt16" disabled={adding || g.members.length >= g.maxParticipants}>
            {adding ? <Loader2 size={20} className="spin" /> : <><UserPlus size={18} /> Adicionar ao grupo</>}
          </button>
          {g.members.length >= g.maxParticipants && <p className="t-small mt8">O grupo atingiu o limite de {g.maxParticipants} participantes.</p>}
        </form>
      </Sheet>
    </>
  );
}
