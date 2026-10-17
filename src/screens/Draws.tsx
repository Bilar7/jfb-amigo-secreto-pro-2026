import { ChevronRight, Gift, Shuffle, Sparkles, Users } from 'lucide-react';
import { MIN_MEMBERS } from '../types';
import { useApp } from '../state';
import { Empty, GiftMark } from '../ui/kit';
import { formatDateShort, urgency } from '../utils/format';
import { groupPhoto } from '../utils/occasions';
import { countdownLabel, plural } from '../utils/format';

/** Separador "Sorteio": todos os meus sorteios e o botão para revelar o meu amigo secreto. */
export function DrawsScreen() {
  const { user, groups, go, tab } = useApp();
  const drawn = groups.filter((g) => g.status === 'drawn');
  const pending = groups.filter((g) => g.status !== 'drawn');
  return (
    <>
      <header className="topbar" style={{ paddingLeft: 20 }}>
        <Shuffle size={22} color="#0f5a3b" />
        <h1 className="grow">Sorteio</h1>
      </header>
      <div className="scroll" style={{ padding: '4px 16px 24px' }}>
        {groups.length === 0 ? (
          <Empty icon={Gift} title="Ainda não tem sorteios" text="Crie um grupo ou entre com um código. Depois do sorteio, o seu amigo secreto aparece aqui.">
            <button className="btn sm" onClick={() => tab({ name: 'home' })}>Ir para o início</button>
          </Empty>
        ) : (
          <>
            {drawn.length > 0 && <h2 className="t-h2 mb12" style={{ fontSize: 14 }}>O meu amigo secreto</h2>}
            <div style={{ display: 'grid', gap: 12 }}>
              {drawn.map((g) => {
                return (
                  <button key={g.id} className="draw-row" onClick={() => go({ name: 'draw', id: g.id })}>
                    <div className="row" style={{ gap: 12 }}>
                      <img src={groupPhoto(g)} alt="" className="cd-thumb" />
                      <div className="grow" style={{ textAlign: 'left', minWidth: 0 }}>
                        <b className="truncate" style={{ display: 'block' }}>{g.name}</b>
                        <small>Revelação {formatDateShort(g.revealDate)}</small>
                      </div>
                      <span style={{ fontSize: 26 }}>🎭</span>
                    </div>
                    <span className="reveal-btn"><Sparkles size={17} /> Revelar o meu amigo secreto</span>
                  </button>
                );
              })}
            </div>
            {pending.length > 0 && <h2 className="t-h2 mt20 mb12" style={{ fontSize: 14 }}>À espera do sorteio</h2>}
            <div style={{ display: 'grid', gap: 10 }}>
              {pending.map((g) => {
                const admin = g.adminId === user.id;
                const ready = g.members.length >= MIN_MEMBERS;
                const cd = countdownLabel(g.revealDate);
                return (
                  <button key={g.id} className="group-row card shadow" onClick={() => go({ name: 'draw', id: g.id })}>
                    <img className="thumb" src={groupPhoto(g)} alt="" />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <h3 className="truncate">{g.name}</h3>
                      <p className="t-small mt4"><Users size={12} style={{ verticalAlign: -1 }} /> {plural(g.members.length, 'membro', 'membros')}{g.drawDate ? ` · sorteio ${formatDateShort(g.drawDate)}` : ''}</p>
                      <div className="row mt4" style={{ gap: 6 }}>
                        <span className={admin && ready ? 'pill' : 'pill gray'}>{admin ? (ready ? 'Pronto para sortear' : `Faltam ${MIN_MEMBERS - g.members.length} pessoa(s)`) : 'Aguarde o organizador'}</span>
                        {cd && <span className={`cd-pill u-${urgency(g.revealDate)}`}>{cd}</span>}
                      </div>
                    </div>
                    <ChevronRight size={20} color="#33443b" />
                  </button>
                );
              })}
            </div>
            <div className="center mt24" style={{ opacity: 0.85 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}><GiftMark size={34} /></div>
              <p className="t-small mt8">Só você vê quem tirou. Guarde segredo até à revelação! 🤫</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
