import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Group } from '../types';
import { useApp } from '../state';
import { groupPhoto } from '../utils/occasions';
import { countdownLabel, plural, urgency } from '../utils/format';

export function TopBar({ title, right, onBack }: { title: React.ReactNode; right?: React.ReactNode; onBack?: () => void }) {
  const { back } = useApp();
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack || back} aria-label="Voltar"><ArrowLeft size={22} /></button>
      <h1 className="grow truncate">{title}</h1>
      {right}
    </header>
  );
}

export function StatusPill({ g }: { g: Group }) {
  if (g.status === 'drawn') return <span className="pill"><CheckCircle2 size={11} /> Sorteado</span>;
  return <span className="pill"><CheckCircle2 size={11} /> Ativo</span>;
}

export function GroupCard({ g }: { g: Group }) {
  const { go } = useApp();
  const cd = countdownLabel(g.revealDate);
  return (
    <button className="group-row card shadow" onClick={() => go({ name: 'group', id: g.id })}>
      <img className="thumb" src={groupPhoto(g)} alt="" />
      <div className="grow">
        <h3 className="truncate">{g.name}</h3>
        <p className="t-small mt4">{plural(g.members.length || g.memberIds.length, 'membro', 'membros')}</p>
        <div className="row mt4" style={{ gap: 6 }}>
          <StatusPill g={g} />
          {cd && <span className={`cd-pill u-${urgency(g.revealDate)}`}>{cd}</span>}
        </div>
      </div>
      <ChevronRight size={20} color="#33443b" />
    </button>
  );
}

/** Ícone "máscara" para o amigo secreto anónimo */
export function MaskAvatar({ size = 48 }: { size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg,#0e4d33,#0a3b27)', fontSize: size * 0.48 }} aria-hidden="true">
      🎭
    </span>
  );
}
