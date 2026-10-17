import React, { useEffect, useRef, useState } from 'react';
import { Bell, Volume2, VolumeX, Camera, ChevronRight, CircleHelp, Gift, Loader2, Lock, LogOut, Mail, Moon, Phone, ShieldCheck, Sun, User as UserIcon, Users } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import { avatarFromFile } from '../services/media';
import { makeAvatar } from '../utils/avatar';
import { useApp } from '../state';
import { Avatar, Empty, Field, bg, confirmDialog, cx, photo, toast } from '../ui/kit';
import { formatRelative } from '../utils/format';
import { pwa } from '../utils/pwa';
import { sound } from '../utils/sound';
import { TopBar } from './common';

export function ProfileScreen() {
  const { user, go, notifications, darkMode, setDarkMode } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const [, force] = useState(0);
  useEffect(() => {
    const off = pwa.subscribe(() => force((n) => n + 1));
    return () => {
      off();
    };
  }, []);
  const logout = async () => {
    const ok = await confirmDialog({ title: 'Terminar sessão?', message: 'Pode voltar a entrar quando quiser.', confirm: 'Sair' });
    if (ok) backend.signOut();
  };
  const items: [React.ElementType, string, string, () => void, number?][] = [
    [UserIcon, 'Minha Conta', 'Dados pessoais e segurança', () => go({ name: 'account' })],
    [Bell, 'Notificações', 'Avisos de sorteios e grupos', () => go({ name: 'notifications' }), unread],
    [Lock, 'Privacidade', 'Grupos e permissões', () => go({ name: 'privacy' })],
    [CircleHelp, 'Ajuda e Suporte', 'Perguntas frequentes', () => go({ name: 'help' })],
  ];
  return (
    <>
      <div className="profile-head">
        <div className="bgimg" style={bg(photo('hero'))} />
        <Avatar src={user.avatar} size={64} />
        <div className="grow">
          <h1 style={{ fontSize: 20, fontWeight: 700 }} className="truncate">{user.name}</h1>
          <p style={{ fontSize: 13, opacity: 0.85 }} className="truncate">{user.email || user.phone}</p>
        </div>
      </div>
      <div className="scroll" style={{ marginTop: -14, background: '#fff', borderRadius: '20px 20px 0 0', position: 'relative', zIndex: 1, paddingTop: 6 }}>
        {items.map(([Icon, title, sub, onClick, badge]) => (
          <button key={title} className="menu-item" onClick={onClick}>
            <Icon size={22} className="lead" />
            <div className="grow">
              <h3>{title}</h3>
              <p className="t-small">{sub}</p>
            </div>
            {!!badge && <span className="badge">{badge}</span>}
            <ChevronRight size={20} color="#33443b" />
          </button>
        ))}
        <button className="menu-item" onClick={() => setDarkMode(!darkMode)} aria-pressed={darkMode}>
          {darkMode ? <Sun size={22} className="lead" /> : <Moon size={22} className="lead" />}
          <div className="grow">
            <h3>Modo escuro</h3>
            <p className="t-small">{darkMode ? 'Ativado neste aparelho' : 'Desativado neste aparelho'}</p>
          </div>
          <span className={cx('theme-toggle', darkMode && 'on')} aria-hidden="true"><i /></span>
        </button>
        <button className="menu-item" onClick={() => { sound.setMuted(!sound.isMuted()); if (!sound.isMuted()) sound.message(); force((n) => n + 1); }}>
          {sound.isMuted() ? <VolumeX size={22} className="lead" /> : <Volume2 size={22} className="lead" />}
          <div className="grow">
            <h3>Sons da aplicação</h3>
            <p className="t-small">{sound.isMuted() ? 'Desligados' : 'Ligados'} · toque para {sound.isMuted() ? 'ligar' : 'desligar'}</p>
          </div>
        </button>
        <div className="pad" style={{ padding: '26px 20px 30px' }}>
          <button className="btn danger" onClick={logout}><LogOut size={18} /> Sair</button>
          <p className="t-small center mt16">Bilar Amigo Secreto · Bilar DigitalTech Solutions</p>
        </div>
      </div>
    </>
  );
}

export function AccountScreen() {
  const { user, groups, back } = useApp();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setAvatar(await avatarFromFile(f));
      setRemoveAvatar(false);
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };
  const save = async () => {
    if (name.trim().length < 2) return toast('Escreva o seu nome.', 'error');
    setBusy(true);
    try {
      const patch: { name?: string; avatar?: string; phone?: string } = { name: name.trim(), phone: phone.trim() };
      if (avatar) patch.avatar = avatar;
      else if (removeAvatar) patch.avatar = '';
      await backend.updateProfile(user.id, patch);
      const merged = { ...user, name: name.trim(), avatar: avatar || (removeAvatar ? makeAvatar(name.trim()) : user.avatar), hasPhoto: removeAvatar ? false : !!avatar || user.hasPhoto };
      await Promise.all(groups.map((g) => backend.syncMemberProfile(g.id, merged).catch(() => {})));
      toast('Perfil atualizado.');
      back();
    } catch (e) {
      toast(friendlyError(e), 'error');
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Minha Conta" />
      <div className="scroll pad" style={{ paddingBottom: 28 }}>
        <div className="center" style={{ margin: '10px 0 22px' }}>
          <button onClick={() => file.current?.click()} style={{ position: 'relative', display: 'inline-block' }} aria-label="Mudar fotografia">
            <Avatar src={avatar || (removeAvatar ? makeAvatar(name.trim()) : user.avatar)} size={96} />
            <span style={{ position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: '50%', background: '#0f5a3b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff' }}>
              <Camera size={15} />
            </span>
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
          <p className="t-small mt8">Toque para mudar a fotografia</p>
          {(user.hasPhoto || avatar) && !removeAvatar && <button className="t-link mt8" onClick={() => { setAvatar(null); setRemoveAvatar(true); }}>Remover foto e usar avatar automático</button>}
        </div>
        <label className="label">Nome</label>
        <Field icon={UserIcon} value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        <label className="label mt16">Telefone</label>
        <Field icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 …" inputMode="tel" />
        {user.email && (
          <>
            <label className="label mt16">Email</label>
            <Field icon={Mail} value={user.email} readOnly disabled />
          </>
        )}
        <button className="btn mt24" onClick={save} disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : 'Guardar alterações'}</button>
        {user.email && (
          <button className="btn outline mt12" onClick={() => backend.resetPassword(user.email).then(() => toast('Enviámos um email para mudar a palavra-passe.')).catch((e) => toast(friendlyError(e), 'error'))}>
            <Lock size={17} /> Mudar palavra-passe
          </button>
        )}
      </div>
    </>
  );
}

export function NotificationsScreen() {
  const { user, notifications, go } = useApp();
  useEffect(() => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length) {
      const t = setTimeout(() => backend.markNotificationsRead(user.id, ids).catch(() => {}), 1500);
      return () => clearTimeout(t);
    }
  }, [notifications.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <TopBar title="Notificações" />
      <div className="scroll">
        {notifications.length === 0 ? (
          <Empty icon={Bell} title="Sem notificações" text="Aqui aparecem os avisos de sorteios e de novas pessoas nos seus grupos." />
        ) : (
          notifications.map((n) => (
            <button key={n.id} className="chat-row" onClick={() => n.groupId && go(n.type === 'draw' ? { name: 'draw', id: n.groupId } : { name: 'group', id: n.groupId })} style={{ background: n.read ? undefined : '#f2f9f4' }}>
              <span className="info-ico" style={{ borderRadius: '50%' }}>{n.type === 'draw' ? <Gift size={19} /> : <Users size={19} />}</span>
              <div className="grow">
                <h3>{n.title}</h3>
                <p className="prev" style={{ whiteSpace: 'normal' }}>{n.message}</p>
                <p className="t-small mt4" style={{ fontSize: 11 }}>{formatRelative(n.createdAt)}</p>
              </div>
              {!n.read && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#157a4f', flexShrink: 0 }} />}
            </button>
          ))
        )}
      </div>
    </>
  );
}

export function PrivacyScreen() {
  const { user, groups, go } = useApp();
  return (
    <>
      <TopBar title="Privacidade" />
      <div className="scroll pad" style={{ paddingBottom: 24 }}>
        <div className="card" style={{ padding: 16, fontSize: 13, lineHeight: 1.6, color: '#33443b' }}>
          <p className="row" style={{ fontWeight: 600, color: '#0e4d33', marginBottom: 6 }}><ShieldCheck size={18} /> Quem vê o quê</p>
          <p>• Cada grupo só é visível para quem o criou ou foi convidado.</p>
          <p>• O chat do grupo é visto por todos os membros desse grupo.</p>
          <p>• Conversas privadas: só as duas pessoas.</p>
          <p>• Conversa secreta: o seu amigo secreto não vê o seu nome.</p>
          <p>• O resultado do sorteio só aparece à própria pessoa.</p>
          <p>• A sua lista de desejos pode ser vista pelos membros dos seus grupos.</p>
        </div>
        <h2 className="t-h2 mt20 mb8" style={{ fontSize: 14 }}>Os meus grupos ({groups.length})</h2>
        {groups.map((g) => (
          <button key={g.id} className="menu-item" style={{ padding: '12px 4px' }} onClick={() => go({ name: 'group', id: g.id })}>
            <Users size={20} className="lead" />
            <div className="grow">
              <h3 className="truncate">{g.name}</h3>
              <p className="t-small">{g.adminId === user.id ? 'Organizador' : 'Participante'} · {g.members.length} membros</p>
            </div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </>
  );
}

const FAQ: [string, string][] = [
  ['Como convido pessoas?', 'Abra o grupo e toque em "Convidar". Pode partilhar o link pelo WhatsApp ou enviar o código BAS com quatro números e B no final. Quem receber entra com "Entrar com código de convite".'],
  ['Quem faz o sorteio?', 'O organizador (quem criou o grupo), quando já houver pelo menos 3 participantes. Todos recebem uma notificação e cada um vê apenas o seu amigo secreto.'],
  ['Como falo com o meu amigo secreto sem ele saber quem sou?', 'Depois do sorteio, abra "Ver Sorteio" e toque em "Enviar mensagem anónima". O seu nome aparece como "Amigo Secreto 🎭".'],
  ['As mensagens do grupo chegam a todos?', 'Sim. O chat do grupo funciona em tempo real como o WhatsApp: todos os membros veem as mensagens, fotos e notas de voz. As conversas privadas só as duas pessoas veem.'],
  ['Serve só para o Natal?', 'Não. Pode criar grupos para amigos, família, empresa, aniversários, fim de ano ou escrever a sua própria ocasião e local.'],
  ['Como instalo no telemóvel?', 'Android: no Chrome, menu ⋮ → "Instalar aplicação". iPhone: no Safari, Partilhar → "Adicionar ao ecrã principal".'],
];

export function HelpScreen() {
  return (
    <>
      <TopBar title="Ajuda e Suporte" />
      <div className="scroll pad faq" style={{ paddingBottom: 24 }}>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}<ChevronRight size={18} /></summary>
            <p>{a}</p>
          </details>
        ))}
        <p className={cx('t-small', 'center', 'mt20')}>Bilar DigitalTech Solutions</p>
      </div>
    </>
  );
}
