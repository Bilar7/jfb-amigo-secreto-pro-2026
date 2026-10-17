import { useEffect, useState } from 'react';
import { Bell, KeyRound, Plus, Gift } from 'lucide-react';
import { useApp } from '../state';
import { Avatar, Empty, Logo, bg, cx, photo } from '../ui/kit';
import { GroupCard } from './common';
import { CountdownBanner } from './CountdownBanner';

const SLIDES = [photo('hero'), photo('group'), photo('draw')];

export function HomeScreen() {
  const { user, groups, groupsReady, notifications, go, tab, openJoin } = useApp();
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="home-head">
        <div className="grow"><Logo size="sm" /></div>
        <button className="icon-btn" onClick={() => go({ name: 'notifications' })} aria-label="Notificações">
          <Bell size={22} />
          {unread > 0 && <span className="dot-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button onClick={() => tab({ name: 'profile' })} aria-label="Perfil" style={{ marginLeft: 4 }}>
          <Avatar src={user.avatar} size={36} />
        </button>
      </header>
      <div className="scroll">
        <div className="carousel" onClick={() => setSlide((s) => (s + 1) % SLIDES.length)}>
          {SLIDES.map((s, i) => (
            <div key={s} className={cx('slide', i === slide && 'on')} style={bg(s)} />
          ))}
          <div className="dots">{SLIDES.map((s, i) => <i key={s} className={cx(i === slide && 'on')} />)}</div>
        </div>
        <div className="sheet-up" style={{ padding: '20px 16px 24px' }}>
          <CountdownBanner />
          <div className="row between mb12" style={{ padding: '0 4px' }}>
            <h2 className="t-h2">Os meus grupos</h2>
            {groups.length > 0 && <button className="t-link" onClick={() => tab({ name: 'groups' })}>Ver todos</button>}
          </div>

          {!groupsReady ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {[0, 1].map((i) => <div key={i} className="card" style={{ height: 84, background: '#f6f8f7' }} />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="card">
              <Empty icon={Gift} title="Ainda não tem grupos" text="Crie um grupo para qualquer ocasião ou entre com o código que recebeu de um amigo." />
            </div>
          ) : (
            <div className="group-list">
              {groups.slice(0, 4).map((g) => <GroupCard key={g.id} g={g} />)}
            </div>
          )}

          <button className="btn mt20" onClick={() => go({ name: 'createGroup' })}><Plus size={20} /> Criar Novo Grupo</button>
          <button className="btn outline mt12" onClick={() => openJoin()}><KeyRound size={18} /> Entrar com código de convite</button>
        </div>
      </div>
    </>
  );
}
