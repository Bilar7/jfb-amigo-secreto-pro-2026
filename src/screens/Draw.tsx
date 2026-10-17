import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Gift, Heart, Loader2, MessageCircle, RefreshCw, ScrollText, UserPlus } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import { MIN_MEMBERS } from '../types';
import { useApp } from '../state';
import { Avatar, GiftMark, bg, confirmDialog, cx, photo, toast } from '../ui/kit';
import { countdown, formatDateShort, formatMoney } from '../utils/format';
import { GroupMissing, refs, useGroup } from './GroupDetail';
import { sound } from '../utils/sound';
import { CountdownBoxes } from './CountdownBanner';

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* modo privado */
  }
};

export function DrawScreen({ id }: { id: string }) {
  const { user, assignments, back, go, openShare } = useApp();
  const { g, missing } = useGroup(id);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const revealKey = g ? `bilar_rev_${g.id}_${g.drawRound}` : '';
  useEffect(() => setRevealed(!!revealKey && lsGet(revealKey) === '1'), [revealKey]);

  if (!g) return <GroupMissing missing={missing} />;

  const isAdmin = g.adminId === user.id;
  const admin = g.members.find((m) => m.id === g.adminId);
  const assignedId = assignments[g.id];
  const friend = assignedId ? g.members.find((m) => m.id === assignedId) : null;
  const cd = countdown(g.revealDate);

  const run = async () => {
    if (g.members.length < MIN_MEMBERS) return toast(`São precisos pelo menos ${MIN_MEMBERS} participantes.`, 'error');
    if (g.status === 'drawn') {
      const ok = await confirmDialog({ title: 'Refazer o sorteio?', message: 'Todos recebem um novo amigo secreto. As conversas secretas anteriores deixam de aparecer.', confirm: 'Refazer', danger: true });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await backend.runDraw(g);
      toast('Sorteio feito! Cada pessoa já pode ver o seu amigo secreto. 🎉');
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setBusy(false);
  };

  const reveal = () => {
    sound.reveal();
    setRevealed(true);
    lsSet(revealKey, '1');
  };

  let content;
  if (g.status === 'pending') {
    if (g.members.length < MIN_MEMBERS) {
      content = (
        <>
          <GiftMark size={64} />
          <h2 className="t-title mt12" style={{ fontSize: 18 }}>Faltam participantes</h2>
          <p className="t-sub mt8">São precisos pelo menos {MIN_MEMBERS} participantes. O grupo tem {g.members.length}.</p>
          <button className="btn mt20" onClick={() => openShare(g)}><UserPlus size={18} /> Convidar amigos</button>
        </>
      );
    } else if (isAdmin) {
      content = (
        <>
          <GiftMark size={64} />
          <h2 className="t-title mt12" style={{ fontSize: 18 }}>O sorteio está pronto!</h2>
          <p className="t-sub mt8">Cada participante verá apenas o seu resultado.</p>
          <button className="btn mt20" onClick={run} disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : 'Sortear Agora'}</button>
        </>
      );
    } else {
      content = (
        <>
          <GiftMark size={64} />
          <h2 className="t-title mt12" style={{ fontSize: 18 }}>A aguardar o sorteio</h2>
          <p className="t-sub mt8">{admin ? `${admin.name} (organizador)` : 'O organizador'} fará o sorteio quando todos tiverem entrado.</p>
        </>
      );
    }
  } else if (!friend) {
    content = (
      <>
        <Loader2 className="spin" color="#157a4f" />
        <p className="t-sub mt12">A carregar o seu resultado…</p>
      </>
    );
  } else {
    content = (
      <>
        <div className={cx('reveal', !revealed && 'hidden-name')} onClick={!revealed ? reveal : undefined} role={!revealed ? 'button' : undefined}>
          <div className="bgimg" style={bg(photo('draw'))} />
          {!revealed ? (
            <div style={{ padding: '18px 0' }}>
              <GiftMark size={60} light />
              <p style={{ fontWeight: 700, fontSize: 17, marginTop: 10 }}>Toque para revelar</p>
              <p style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Veja sozinho(a): é segredo! 🤫</p>
            </div>
          ) : (
            <div className="flip">
              <p style={{ fontSize: 12, opacity: 0.9 }}>O seu amigo secreto é</p>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
                <Avatar src={friend.avatar} size={76} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 700 }}>{friend.name}</p>
              {g.budget > 0 && <p style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>Orçamento sugerido: {formatMoney(g.budget, g.currency)}</p>}
            </div>
          )}
        </div>
        {revealed && (
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <button className="btn" onClick={() => go({ name: 'wishes', ownerId: friend.id, ownerName: friend.name })}><Heart size={18} /> Ver lista de desejos</button>
            <button className="btn outline" onClick={() => go({ name: 'conv', ref: refs.secretGiver(g, user.id, friend.id) })}><MessageCircle size={18} /> Enviar mensagem anónima</button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="scroll">
      <div className="photo-head" style={{ ...bg(photo('draw')), height: 150 }}>
        <div className="bar">
          <button className="icon-btn light" onClick={back} aria-label="Voltar"><ArrowLeft size={22} /></button>
          <h1>Sorteio</h1>
        </div>
      </div>
      <div className="sheet-up" style={{ padding: '18px 16px 24px' }}>
        <p className="t-small center mb12">{g.name}</p>
        <div className="card shadow draw-card">{content}</div>

        {cd && !cd.past && (
          <div className="card mt16" style={{ padding: 14 }}>
            <p className="t-small mb8">{cd.today ? 'Dia da revelação' : `Revelação em ${formatDateShort(g.revealDate)}`}</p>
            {cd.today ? (
              <p style={{ fontWeight: 600, color: '#0e4d33' }}>🎉 É hoje! Bom encontro.</p>
            ) : (
              <CountdownBoxes iso={g.revealDate} />
            )}
          </div>
        )}

        <div className="card mt16">
          <button className="info-line" style={{ width: '100%', textAlign: 'left' }} onClick={() => setRulesOpen((o) => !o)} aria-expanded={rulesOpen}>
            <ScrollText size={20} color="#0f5a3b" />
            <span className="grow" style={{ fontSize: 14, fontWeight: 500 }}>Regras do Sorteio</span>
            {rulesOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {rulesOpen && (
            <div style={{ padding: '0 16px 16px', fontSize: 13, color: '#33443b', lineHeight: 1.6 }}>
              {g.rules && <p style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>{g.rules}</p>}
              <p>• Ninguém tira a si próprio e cada pessoa vê só o seu resultado.</p>
              <p>• Mantenha o segredo até ao dia da revelação.</p>
              {g.budget > 0 && <p>• Orçamento sugerido: {formatMoney(g.budget, g.currency)}.</p>}
              <p>• Use a lista de desejos e o chat anónimo para acertar no presente.</p>
              {g.place && <p>• Local do encontro: {g.place}.</p>}
            </div>
          )}
        </div>

        {isAdmin && g.status === 'drawn' && (
          <button className="btn outline mt16" onClick={run} disabled={busy}><RefreshCw size={17} /> Refazer sorteio</button>
        )}
        {g.status === 'pending' && !isAdmin && g.members.length >= MIN_MEMBERS && (
          <p className="t-small center mt16"><Gift size={13} style={{ verticalAlign: -2 }} /> Receberá uma notificação quando o sorteio for feito.</p>
        )}
      </div>
    </div>
  );
}
