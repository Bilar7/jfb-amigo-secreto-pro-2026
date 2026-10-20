import React, { useRef, useState } from 'react';
import { Shuffle, Briefcase, Cake, CalendarDays, Camera, Clock, Coins, Gift, ImagePlus, Loader2, MapPin, PartyPopper, PencilLine, Tag, Users, X } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import { groupImageFromFile } from '../services/media';
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
  const [coverImage, setCoverImage] = useState('');
  const [occ, setOcc] = useState<OccasionKey>('amigos');
  const [occLabel, setOccLabel] = useState('');
  const [place, setPlace] = useState('');
  const [rules, setRules] = useState('');
  const [date, setDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [drawTime, setDrawTime] = useState('19:00');
  const [autoDraw, setAutoDraw] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const coverFile = useRef<HTMLInputElement>(null);
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast('Dê um nome ao grupo.', 'error');
    if (occ === 'outra' && !occLabel.trim()) return toast('Escreva qual é a ocasião.', 'error');
    if (!date) return toast('Escolha a data da revelação.', 'error');
    if (drawDate && drawDate > date) return toast('O sorteio tem de ser antes (ou no dia) da revelação.', 'error');
    const participantLimit = Number(maxParticipants);
    if (!Number.isInteger(participantLimit) || participantLimit < 3 || participantLimit > 100) return toast('O grupo pode ter entre 3 e 100 participantes.', 'error');
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
    const drawAt = drawDate ? new Date(`${drawDate}T${drawTime || '00:00'}:00`).getTime() : 0;
    setBusy(true);
    try {
      const g = await backend.createGroup(user, {
        name,
        coverImage,
        occasion: occ,
        occasionLabel: occ === 'outra' ? occLabel : '',
        place,
        rules,
        revealDate: date,
        deliveryDate,
        drawDate,
        drawTime,
        drawAt,
        timeZone,
        autoDraw: !!drawDate && autoDraw,
        maxParticipants: participantLimit,
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

  const chooseCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageBusy(true);
    try {
      setCoverImage(await groupImageFromFile(file));
    } catch (error) {
      toast(friendlyError(error), 'error');
    }
    setImageBusy(false);
  };

  return (
    <>
      <TopBar title="Criar Novo Grupo" />
      <form className="scroll pad" onSubmit={submit} style={{ paddingBottom: 28 }}>
        <p className="t-sub" style={{ margin: '0 0 18px' }}>Personalize o seu grupo para qualquer ocasião</p>

        <label className="label">Nome do Grupo <span className="req">*</span></label>
        <Field icon={Tag} placeholder="Ex.: Família Silva" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />

        <label className="label mt20">Foto do grupo <span className="t-small">(opcional)</span></label>
        <input ref={coverFile} type="file" accept="image/*" hidden onChange={chooseCover} />
        <button type="button" className="group-cover" onClick={() => coverFile.current?.click()} disabled={imageBusy} aria-label={coverImage ? 'Trocar foto do grupo' : 'Adicionar foto do grupo'}>
          {coverImage ? <img src={coverImage} alt="Pré-visualização da foto do grupo" /> : <><ImagePlus size={25} /><span>{imageBusy ? 'A preparar foto…' : 'Escolher foto do grupo'}</span></>}
          {coverImage && <span className="group-cover-action"><Camera size={15} /> Trocar foto</span>}
        </button>
        <div className="row between mt8">
          <p className="t-small">Sem foto, usamos uma imagem automática da ocasião.</p>
          {coverImage && <button type="button" className="icon-btn" onClick={() => setCoverImage('')} aria-label="Remover foto do grupo"><X size={18} /></button>}
        </div>

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

        <label className="label mt20">Data de Entrega do Presente <span className="t-small">(opcional)</span></label>
        <Field icon={Gift} type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} aria-label="Data de entrega do presente" />

        <label className="label mt20">Data do Sorteio <span className="t-small">(opcional)</span></label>
        <Field icon={Shuffle} type="date" min={today} max={date || undefined} value={drawDate} onChange={(e) => setDrawDate(e.target.value)} aria-label="Data do sorteio" />
        {drawDate && (
          <>
            <label className="label mt12">Hora local do sorteio</label>
            <Field icon={Clock} type="time" value={drawTime} onChange={(e) => setDrawTime(e.target.value)} aria-label="Hora local do sorteio" />
            <p className="t-small mt8">Fuso do organizador: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'hora local do aparelho'}.</p>
            <label className="check mt12">
              <input type="checkbox" checked={autoDraw} onChange={(e) => setAutoDraw(e.target.checked)} />
              <span>Sortear automaticamente nesse horário só quando o grupo atingir o limite de participantes e o app do organizador estiver aberto.</span>
            </label>
          </>
        )}

        <label className="label mt20">Limite de participantes</label>
        <Field icon={Users} type="number" inputMode="numeric" min={3} max={100} value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value.replace(/\D/g, ''))} aria-label="Limite de participantes" />
        <p className="t-small mt8">Pode alterar esse limite depois. O grupo aceita de 3 a 100 pessoas.</p>

        <label className="label mt20">Orçamento Sugerido (MZN)</label>
        <Field icon={Coins} placeholder="Ex.: 1000" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))} />

        <button className="btn mt24" disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : 'Criar Grupo e Gerar Código'}</button>
      </form>
    </>
  );
}
