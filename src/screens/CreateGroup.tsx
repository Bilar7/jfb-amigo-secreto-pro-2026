import React, { useState } from 'react';
import { Shuffle, Briefcase, Cake, CalendarDays, Coins, Gift, Loader2, MapPin, PartyPopper, PencilLine, Tag, Users } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import type { OccasionKey } from '../types';
import { useApp } from '../state';
import { Field, cx, toast } from '../ui/kit';
import { OCCASIONS } from '../utils/occasions';
import { TopBar } from './common';

const ICONS: Record<OccasionKey, React.ElementType> = {
  amigos: Users,
  empresa: Briefcase,
  aniversario: Cake,
  fim_ano: PartyPopper,
  festas: Gift,
  outra: PencilLine,
};

export function CreateGroupScreen() {
  const { user, replace, openShare } = useApp();
  const [name, setName] = useState('');
  const [occ, setOcc] = useState<OccasionKey>('amigos');
  const [occLabel, setOccLabel] = useState('');
  const [place, setPlace] = useState('');
  const [rules, setRules] = useState('');
  const [date, setDate] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [autoDraw, setAutoDraw] = useState(true);
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast('Dê um nome ao grupo.', 'error');
    if (occ === 'outra' && !occLabel.trim()) return toast('Escreva qual é a ocasião.', 'error');
    if (!date) return toast('Escolha a data da revelação.', 'error');
    if (drawDate && drawDate > date) return toast('O sorteio tem de ser antes (ou no dia) da revelação.', 'error');
    setBusy(true);
    try {
      const g = await backend.createGroup(user, {
        name,
        occasion: occ,
        occasionLabel: occ === 'outra' ? occLabel : '',
        place,
        rules,
        revealDate: date,
        drawDate,
        autoDraw: !!drawDate && autoDraw,
        budget: Math.max(0, Number(budget.replace(/\D/g, '')) || 0),
      });
      toast(`Grupo "${g.name}" criado! Partilhe o código. 🎁`);
      replace({ name: 'group', id: g.id });
      openShare(g);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Criar Novo Grupo" />
      <form className="scroll pad" onSubmit={submit} style={{ paddingBottom: 28 }}>
        <p className="t-sub" style={{ margin: '0 0 18px' }}>Personalize o seu grupo para qualquer ocasião</p>

        <label className="label">Nome do Grupo <span className="req">*</span></label>
        <Field icon={Tag} placeholder="Ex.: Família Silva" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />

        <label className="label mt20">Ocasião do Sorteio</label>
        <div className="occ-grid">
          {OCCASIONS.map((o) => {
            const Icon = ICONS[o.key];
            return (
              <button type="button" key={o.key} className={cx('occ', occ === o.key && 'on')} onClick={() => setOcc(o.key)} aria-pressed={occ === o.key}>
                <Icon size={22} strokeWidth={1.7} />
                {o.short}
              </button>
            );
          })}
        </div>
        {occ === 'outra' && (
          <Field className="mt12" icon={PencilLine} placeholder="Ex.: Dia dos Namorados, Despedida, Páscoa…" value={occLabel} onChange={(e) => setOccLabel(e.target.value)} maxLength={40} autoFocus />
        )}

        <label className="label mt20">Local do encontro <span className="t-small">(opcional)</span></label>
        <Field icon={MapPin} placeholder="Ex.: Casa da avó, escritório, restaurante…" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />

        <label className="label mt20">Regras e Orientações do Grupo</label>
        <label className="field area">
          <textarea placeholder="Ex.: Defina aqui as regras do sorteio…" value={rules} onChange={(e) => setRules(e.target.value)} maxLength={600} />
        </label>

        <label className="label mt20">Data da Revelação <span className="req">*</span></label>
        <Field icon={CalendarDays} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data da revelação" />

        <label className="label mt20">Data do Sorteio <span className="t-small">(opcional)</span></label>
        <Field icon={Shuffle} type="date" min={today} max={date || undefined} value={drawDate} onChange={(e) => setDrawDate(e.target.value)} aria-label="Data do sorteio" />
        {drawDate && (
          <label className="check mt12">
            <input type="checkbox" checked={autoDraw} onChange={(e) => setAutoDraw(e.target.checked)} />
            <span>Sortear automaticamente nesse dia (se houver pelo menos 3 participantes). Todos recebem um aviso.</span>
          </label>
        )}

        <label className="label mt20">Orçamento Sugerido (MZN)</label>
        <Field icon={Coins} placeholder="Ex.: 1000" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))} />

        <button className="btn mt24" disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : 'Criar Grupo e Gerar Código'}</button>
      </form>
    </>
  );
}
