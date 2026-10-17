import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Shuffle } from 'lucide-react';
import type { Group } from '../types';
import { useApp } from '../state';
import { countdown, formatDateShort, todayIso, urgency, urgencyText } from '../utils/format';
import { groupPhoto } from '../utils/occasions';

export function useTick(ms = 1000) {
  const [, t] = useState(0);
  useEffect(() => {
    const i = setInterval(() => t((n) => n + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

/** Caixas dias / horas / min / seg com a cor da urgência */
export function CountdownBoxes({ iso }: { iso: string }) {
  const c = countdown(iso);
  if (!c || c.past) return null;
  if (c.today) return <p className="cd-today">🎉 A revelação é hoje!</p>;
  return (
    <div className={`countdown u-${urgency(iso)}`} aria-label="Contagem decrescente">
      <div><b>{c.days}</b><small>{c.days === 1 ? 'dia' : 'dias'}</small></div>
      <div><b>{c.hours}</b><small>{c.hours === 1 ? 'hora' : 'horas'}</small></div>
      <div><b>{c.minutes}</b><small>min</small></div>
      <div><b>{c.seconds}</b><small>seg</small></div>
    </div>
  );
}

function Card({ g }: { g: Group }) {
  const { go } = useApp();
  const u = urgency(g.revealDate);
  return (
    <button className={`cd-banner u-${u}`} onClick={() => go({ name: 'group', id: g.id })}>
      <div className="row" style={{ gap: 10 }}>
        <img src={groupPhoto(g)} alt="" className="cd-thumb" />
        <div className="grow" style={{ textAlign: 'left', minWidth: 0 }}>
          <b className="truncate" style={{ display: 'block' }}>{g.name}</b>
          <span className="cd-sub"><CalendarDays size={12} /> Revelação em {formatDateShort(g.revealDate)}</span>
        </div>
        <ChevronRight size={18} />
      </div>
      <CountdownBoxes iso={g.revealDate} />
      <p className="cd-msg">{urgencyText[u]}</p>
    </button>
  );
}

/** Banner no topo do Início: contagem de cada grupo (o mais próximo primeiro) e aviso do dia do sorteio. */
export function CountdownBanner() {
  const { user, groups, go } = useApp();
  useTick();
  const today = todayIso();
  const drawToday = groups.filter((g) => g.status === 'pending' && g.drawDate && g.drawDate <= today && g.adminId === user.id);
  const upcoming = groups
    .filter((g) => g.revealDate && !countdown(g.revealDate)?.past)
    .sort((a, b) => a.revealDate.localeCompare(b.revealDate));
  if (!drawToday.length && !upcoming.length) return null;
  return (
    <div className="mb16">
      {drawToday.map((g) => (
        <button key={g.id} className="draw-alert" onClick={() => go({ name: 'draw', id: g.id })}>
          <Shuffle size={20} />
          <span className="grow" style={{ textAlign: 'left' }}>
            <b>Hoje é dia do sorteio!</b>
            <small>{g.name} · {g.members.length < 3 ? 'faltam participantes (mínimo 3)' : 'toque para sortear agora'}</small>
          </span>
          <ChevronRight size={18} />
        </button>
      ))}
      {upcoming.length > 0 && (
        <div className="cd-strip">
          {upcoming.map((g) => <Card key={g.id} g={g} />)}
        </div>
      )}
    </div>
  );
}
