/**
 * Bilar Amigo Secreto — Bilar DigitalTech Solutions
 * App mobile-first: grupos privados, sorteio, chat em tempo real e listas de desejos.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Shuffle, KeyRound, Gift, Home, Lock, MessageCircle, Plus, User as UserIcon, Users, Loader2 } from 'lucide-react';
import { backend } from './services/backend';
import { sound } from './utils/sound';
import { InstallPrompt } from './ui/Install';
import { Field, Sheet } from './ui/kit';
import { normalizeCode } from './services/backend';
import { todayIso } from './utils/format';
import { friendlyError } from './services/errors';
import type { AppNotification, Group, Thread, User, WishItem } from './types';
import { MIN_MEMBERS } from './types';
import { AppCtx, TABS, unreadOf, type AppState, type Route } from './state';
import { Avatar, Feedback, Logo, bg, cx, photo, toast } from './ui/kit';
import { Login, Register } from './screens/Auth';
import { HomeScreen } from './screens/Home';
import { GroupsScreen } from './screens/Groups';
import { DrawsScreen } from './screens/Draws';
import { CreateGroupScreen } from './screens/CreateGroup';
import { GroupScreen, MembersScreen } from './screens/GroupDetail';
import { DrawScreen } from './screens/Draw';
import { WishesScreen } from './screens/Wishes';
import { ChatListScreen } from './screens/ChatList';
import { ConversationScreen } from './screens/Conversation';
import { AccountScreen, HelpScreen, NotificationsScreen, PrivacyScreen, ProfileScreen } from './screens/Profile';
import { JoinSheet, ShareSheet } from './screens/Sheets';

const SPLASH_MS = 1700;

/** Computador: menu lateral e chat em duas colunas */
function useDesktop() {
  const q = '(min-width: 1024px)';
  const [d, setD] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setD(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return d;
}

const NAV = [
  ['home', 'Início', Home],
  ['groups', 'Grupos', Users],
  ['draws', 'Sorteio', Shuffle],
  ['wishes', 'Desejos', Gift],
  ['chats', 'Chat', MessageCircle],
  ['profile', 'Perfil', UserIcon],
] as const;

export default function App() {
  const desktop = useDesktop();
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('bilar_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [deviceNotificationsEnabled, setDeviceNotificationsEnabled] = useState(() => {
    try {
      return localStorage.getItem('bilar_device_notifications') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    try {
      localStorage.setItem('bilar_theme', darkMode ? 'dark' : 'light');
    } catch {
      /* preferência apenas neste aparelho */
    }
  }, [darkMode]);
  const [splash, setSplash] = useState<'show' | 'fading' | 'gone'>('show');
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsReady, setGroupsReady] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [chatError, setChatError] = useState('');
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [myWishes, setMyWishes] = useState<WishItem[]>([]);

  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [joinOpen, setJoinOpen] = useState<{ code: string } | null>(null);
  const [sharing, setSharing] = useState<Group | null>(null);
  const pendingJoin = useRef<string>('');
  const pendingOpenGroup = useRef<string>('');
  const seenDrawNotifications = useRef<Set<string>>(new Set());
  const seenThreadMessages = useRef(new Map<string, { count: number; lastAt: number }>());
  const [codeAsk, setCodeAsk] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  /* Splash */
  const [minShown, setMinShown] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setMinShown(true), SPLASH_MS);
    return () => clearTimeout(a);
  }, []);
  const closeSplash = useCallback(() => {
    setSplash((s) => (s === 'show' ? 'fading' : s));
    setTimeout(() => setSplash('gone'), 450);
  }, []);
  /* A app abre SEMPRE nas boas-vindas; a pessoa toca para entrar (ou criar conta). */
  const welcomeGo = (view: 'login' | 'register') => {
    sound.welcome();
    setAuthView(view);
    closeSplash();
  };

  /* Fundo no computador */
  useEffect(() => {
    document.body.style.backgroundImage = window.matchMedia('(min-width: 640px)').matches ? `url("${photo('splash')}")` : '';
  }, []);

  /* Link de convite ?join=CODIGO */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      pendingJoin.current = code.toUpperCase();
    }
    pendingOpenGroup.current = params.get('openGroup') || '';
    if (code || pendingOpenGroup.current) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  /* Sessão */
  useEffect(
    () =>
      backend.onAuth((id) => {
        setUid(id);
        setAuthReady(true);
        if (!id) {
          setUser(null);
          setGroups([]);
          setGroupsReady(false);
          setThreads([]);
          setNotifications([]);
          setMyWishes([]);
          setAssignments({});
          setStack([{ name: 'home' }]);
        }
      }),
    [],
  );
  useEffect(() => (uid ? backend.watchUser(uid, setUser) : undefined), [uid]);

  useEffect(() => {
    if (!uid) return;
    return backend.watchGroups(
      uid,
      (list) => {
        setGroups(list);
        setGroupsReady(true);
      },
      (e) => {
        setGroupsReady(true);
        toast(friendlyError(e), 'error');
      },
    );
  }, [uid]);

  const groupKey = groups.map((g) => g.id).join(',');
  useEffect(() => {
    if (!uid) return;
    setChatError('');
    return backend.watchThreads(
      uid,
      groups.map((g) => g.id),
      setThreads,
      (e) => setChatError(friendlyError(e)),
    );
  }, [uid, groupKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Quem tirei em cada grupo sorteado */
  const drawnKey = groups.filter((g) => g.status === 'drawn').map((g) => `${g.id}:${g.drawRound}`).join(',');
  useEffect(() => {
    if (!uid) return;
    const unsubs = groups
      .filter((g) => g.status === 'drawn')
      .map((g) => backend.watchAssignment(g.id, uid, (to, round) => setAssignments((a) => ({ ...a, [g.id]: round === g.drawRound ? to : null }))));
    return () => unsubs.forEach((u) => u());
  }, [uid, drawnKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    seenDrawNotifications.current.clear();
    seenThreadMessages.current.clear();
    if (!uid) return;
    let initialSnapshot = true;
    return backend.watchNotifications(uid, (list) => {
      if (!initialSnapshot && list.some((n) => n.type === 'draw' && !seenDrawNotifications.current.has(n.id))) {
        toast('🎁 Sorteio realizado! Abra Notificações para ver quem é o seu amigo secreto.');
      }
      list.forEach((n) => seenDrawNotifications.current.add(n.id));
      initialSnapshot = false;
      setNotifications(list);
    });
  }, [uid]);
  useEffect(() => (uid ? backend.watchWishlist(uid, setMyWishes) : undefined), [uid]);

  /* Convite pendente depois de entrar */
  useEffect(() => {
    if (user && pendingJoin.current) {
      setJoinOpen({ code: pendingJoin.current });
      pendingJoin.current = '';
    }
  }, [user]);
  /* ------------------------------- Navegação ------------------------------- */
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((r: Route) => {
    window.history.pushState({ d: Date.now() }, '');
    setStack((s) => [...s, r]);
  }, []);
  useEffect(() => {
    if (!user || !groupsReady || !pendingOpenGroup.current) return;
    const target = groups.find((g) => g.id === pendingOpenGroup.current);
    pendingOpenGroup.current = '';
    if (target) go({ name: 'group', id: target.id });
  }, [user, groups, groupsReady, go]);
  const back = useCallback(() => {
    setStack((s) => {
      if (s.length > 1) {
        window.history.back();
        return s;
      }
      return s;
    });
  }, []);
  const tab = useCallback((r: Route) => {
    setStack((s) => {
      // volta o histórico do navegador ao início antes de trocar de separador
      const extra = s.length - 1;
      if (extra > 0) window.history.go(-extra);
      return [r];
    });
  }, []);

  const replace = useCallback((r: Route) => setStack((s) => [...s.slice(0, -1), r]), []);
  const route = stack[stack.length - 1];

  const state: AppState | null = useMemo(
    () =>
      user
        ? {
            user,
            groups,
            groupsReady,
            threads,
            assignments,
            notifications,
            myWishes,
            chatError,
            darkMode,
            setDarkMode,
            deviceNotificationsEnabled,
            setDeviceNotificationsEnabled,
            route,
            depth: stack.length,
            go,
            tab,
            back,
            replace,
            openJoin: (code = '') => setJoinOpen({ code }),
            openShare: setSharing,
          }
        : null,
    [user, groups, groupsReady, threads, assignments, notifications, myWishes, chatError, darkMode, deviceNotificationsEnabled, route, stack.length, go, tab, back, replace],
  );

  const totalUnread = useMemo(() => {
    if (!uid) return 0;
    const gids = new Set(groups.map((g) => g.id));
    return threads.filter((t) => gids.has(t.groupId)).reduce((n, t) => n + unreadOf(t, uid), 0);
  }, [threads, groups, uid]);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread > 99 ? '99+' : totalUnread}) Bilar Amigo Secreto` : 'Bilar Amigo Secreto';
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const updateBadge = totalUnread > 0
      ? badgeNavigator.setAppBadge?.(totalUnread)
      : badgeNavigator.clearAppBadge?.();
    updateBadge?.catch(() => {});
  }, [totalUnread]);

  useEffect(() => {
    if (!uid) {
      seenThreadMessages.current.clear();
      return;
    }
    threads.forEach((thread) => {
      const key = `${thread.groupId}/${thread.id}`;
      const previous = seenThreadMessages.current.get(key);
      seenThreadMessages.current.set(key, { count: thread.count, lastAt: thread.lastAt });
      if (!previous || thread.count <= previous.count || thread.lastSenderId === uid) return;
      if (!deviceNotificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

      const group = groups.find((item) => item.id === thread.groupId);
      const groupName = group?.name || 'Amigo Secreto';
      const sender = thread.kind === 'secret' ? 'Amigo Secreto 🎭' : thread.lastSenderName || 'Nova mensagem';
      const body = thread.lastText ? `${sender}: ${thread.lastText}` : `${sender} enviou uma mensagem.`;
      const url = new URL(window.location.pathname, window.location.origin);
      url.searchParams.set('openGroup', thread.groupId);
      const options: NotificationOptions = {
        body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { url: url.toString() },
      };

      if (document.visibilityState === 'visible') return;
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.ready
          .then((registration) => registration.showNotification(`Mensagem nova · ${groupName}`, options))
          .catch(() => {
            try {
              const notification = new Notification(`Mensagem nova · ${groupName}`, options);
              notification.onclick = () => {
                window.focus();
                go({ name: 'group', id: thread.groupId });
                notification.close();
              };
            } catch {
              toast('Não foi possível mostrar a notificação no dispositivo.', 'error');
            }
          });
      } else {
        try {
          const notification = new Notification(`Mensagem nova · ${groupName}`, options);
          notification.onclick = () => {
            window.focus();
            go({ name: 'group', id: thread.groupId });
            notification.close();
          };
        } catch {
          toast('Não foi possível mostrar a notificação no dispositivo.', 'error');
        }
      }
    });
  }, [uid, threads, groups, deviceNotificationsEnabled, go]);

  const [schedulerNow, setSchedulerNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSchedulerNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  /* A agenda usa a hora local guardada; o app do organizador precisa estar aberto. */
  const autoDone = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const today = todayIso();
    for (const g of groups) {
      if (g.status !== 'pending' || !g.drawDate || autoDone.current.has(g.id)) continue;
      const scheduledAt = g.drawAt || new Date(`${g.drawDate}T${g.drawTime || '00:00'}:00`).getTime();
      if (!Number.isFinite(scheduledAt) || schedulerNow < scheduledAt) continue;
      if (g.adminId === user.id) {
        if (g.autoDraw && g.members.length >= MIN_MEMBERS && g.members.length >= g.maxParticipants) {
          autoDone.current.add(g.id);
          backend
            .runDraw(g)
            .then(() => toast(`Sorteio automático feito em "${g.name}"! 🎉`))
            .catch((e) => {
              autoDone.current.delete(g.id);
              toast(friendlyError(e), 'error');
            });
        }
      } else {
        autoDone.current.add(g.id);
        const key = `bilar_remind_${g.id}_${today}`;
        let sent = false;
        try {
          sent = localStorage.getItem(key) === '1';
          localStorage.setItem(key, '1');
        } catch {
          /* */
        }
        if (!sent) {
          backend
            .notify(g.adminId, user.id, { title: 'Chegou o dia do sorteio! 🎁', message: `O grupo "${g.name}" está à espera do sorteio. Abra o Sorteio e toque em "Sortear Agora".`, type: 'draw', groupId: g.id })
            .catch(() => {});
        }
      }
    }
  }, [groups, user, schedulerNow]);

  /* Som quando chega uma mensagem nova */
  const prevUnread = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnread.current !== null && totalUnread > prevUnread.current) sound.message();
    prevUnread.current = totalUnread;
  }, [totalUnread]);

  /* ------------------------------ Apresentação ------------------------------ */
  let body: React.ReactNode;
  if (!authReady || (uid && !user)) {
    body = (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Logo size="lg" />
        <Loader2 className="spin" color="#157a4f" />
      </div>
    );
  } else if (!uid || !state) {
    body = authView === 'login' ? <Login onRegister={() => setAuthView('register')} /> : <Register onLogin={() => setAuthView('login')} />;
  } else {
    const showNav = !desktop && stack.length === 1 && TABS.includes(route.name);
    const activeTab = (TABS.includes(route.name) ? route.name : route.name === 'conv' ? 'chats' : route.name === 'draw' ? 'draws' : route.name === 'createGroup' || route.name === 'group' || route.name === 'members' ? 'groups' : 'profile') as Route['name'];
    const chatSplit = desktop && (route.name === 'chats' || route.name === 'conv');
    const screen = (
      <>
        {route.name === 'home' && <HomeScreen />}
        {route.name === 'groups' && <GroupsScreen />}
        {route.name === 'draws' && <DrawsScreen />}
        {route.name === 'wishes' && <WishesScreen ownerId={route.ownerId} ownerName={route.ownerName} />}
        {route.name === 'chats' && !chatSplit && <ChatListScreen />}
        {route.name === 'profile' && <ProfileScreen />}
        {route.name === 'createGroup' && <CreateGroupScreen />}
        {route.name === 'group' && <GroupScreen id={route.id} />}
        {route.name === 'members' && <MembersScreen id={route.id} />}
        {route.name === 'draw' && <DrawScreen id={route.id} />}
        {route.name === 'conv' && <ConversationScreen key={route.ref.groupId + route.ref.id} threadRef={route.ref} />}
        {route.name === 'notifications' && <NotificationsScreen />}
        {route.name === 'account' && <AccountScreen />}
        {route.name === 'privacy' && <PrivacyScreen />}
        {route.name === 'help' && <HelpScreen />}
      </>
    );
    body = (
      <AppCtx.Provider value={state}>
        {desktop && (
          <aside className="sidebar" aria-label="Menu">
            <div style={{ padding: '22px 18px 18px' }}><Logo size="md" /></div>
            <nav>
              {NAV.map(([name, label, Icon]) => (
                <button key={name} className={cx('side-item', activeTab === name && 'on')} onClick={() => tab({ name } as Route)}>
                  <Icon size={20} />
                  <span className="grow">{label}</span>
                  {name === 'chats' && totalUnread > 0 && <span className="badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
                </button>
              ))}
            </nav>
            <div style={{ padding: '16px 14px 0' }}>
              <button className="btn" onClick={() => go({ name: 'createGroup' })}><Plus size={18} /> Criar Novo Grupo</button>
            </div>
            <span className="grow" />
            <button className="side-user" onClick={() => tab({ name: 'profile' })}>
              <Avatar src={state.user.avatar} size={38} />
              <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                <b className="truncate" style={{ display: 'block', fontSize: 13 }}>{state.user.name}</b>
                <small className="truncate" style={{ display: 'block', color: '#74847b', fontSize: 11 }}>{state.user.email || state.user.phone}</small>
              </span>
            </button>
          </aside>
        )}
        {chatSplit ? (
          <div className="split">
            <div className="split-list screen"><ChatListScreen /></div>
            <div className="split-main screen" key={route.name === 'conv' ? route.ref.groupId + route.ref.id : 'none'}>
              {route.name === 'conv' ? (
                <ConversationScreen threadRef={route.ref} />
              ) : (
                <div className="center" style={{ margin: 'auto', padding: 30 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.9 }}><Logo size="lg" /></div>
                  <p className="t-sub mt16">Escolha uma conversa à esquerda.<br />Grupo, privadas e amigo secreto — tudo em tempo real.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={cx('screen', desktop && 'desk-main')} key={stack.length + route.name}>
            {screen}
          </div>
        )}
        {showNav && (
          <nav className="bottom-nav" aria-label="Navegação principal">
            {NAV.map(([name, label, Icon]) => (
              <button key={name} className={cx(route.name === name && 'on')} onClick={() => tab({ name } as Route)} aria-current={route.name === name ? 'page' : undefined}>
                <Icon size={22} strokeWidth={route.name === name ? 2.4 : 1.8} fill={route.name === name && name !== 'chats' ? 'currentColor' : 'none'} fillOpacity={0.15} />
                <span>{label}</span>
                {name === 'chats' && totalUnread > 0 && <span className="nb">{totalUnread > 99 ? '99+' : totalUnread}</span>}
              </button>
            ))}
          </nav>
        )}
        <JoinSheet open={!!joinOpen} initialCode={joinOpen?.code || ''} onClose={() => setJoinOpen(null)} onJoined={(gid) => { setJoinOpen(null); go({ name: 'group', id: gid }); }} />
        <ShareSheet group={sharing} onClose={() => setSharing(null)} />
      </AppCtx.Provider>
    );
  }

  return (
    <div className="stage">
      <div className={cx('app', desktop && uid && user && 'desk')} data-theme={darkMode ? 'dark' : 'light'}>
        {body}
        {splash !== 'gone' && (
          <div className={cx('splash', splash === 'fading' && 'fade-out')} style={bg(photo('splash'))}>
            <div className="logo-wrap">
              <Logo size="xl" light />
            </div>
            <p className="slogan">Mais do que presentes,<br />são conexões especiais.</p>
            <p className="slogan-sub">Amizade • Sigilo • Partilha</p>
            {minShown && authReady && uid && user && (
              <div className="welcome-actions">
                <ul className="welcome-feats">
                  <li><span><Users size={16} /></span>Organize o seu grupo em minutos</li>
                  <li><span><Lock size={16} /></span>Sorteio privado: só você vê quem tirou</li>
                  <li><span><Gift size={16} /></span>Uma surpresa especial para quem importa</li>
                </ul>
                <button className="btn gold" onClick={() => { sound.welcome(); closeSplash(); }}>
                  <Avatar src={user.avatar} size={28} /> Continuar como {user.name.split(' ')[0]}
                </button>
                <button className="btn glass-btn" onClick={async () => { await backend.signOut().catch(() => {}); setAuthView('login'); closeSplash(); }}>Usar outra conta</button>
                <button className="install-link" onClick={() => setCodeAsk(true)}><KeyRound size={15} /> Tenho um código de convite</button>
                <p className="welcome-foot">Amigos · Família · Empresa · Aniversários · qualquer ocasião</p>
              </div>
            )}
            {minShown && authReady && !uid && (
              <div className="welcome-actions">
                <ul className="welcome-feats">
                  <li><span><Users size={16} /></span>Organize o seu grupo em minutos</li>
                  <li><span><Lock size={16} /></span>Sorteio privado: só você vê quem tirou</li>
                  <li><span><Gift size={16} /></span>Uma surpresa especial para quem importa</li>
                </ul>
                <button className="btn gold" onClick={() => welcomeGo('login')}>Começar agora</button>
                <button className="btn glass-btn" onClick={() => welcomeGo('register')}>Criar conta</button>
                <button className="install-link" onClick={() => setCodeAsk(true)}><KeyRound size={15} /> Tenho um código de convite</button>
                <p className="welcome-foot">Amigos · Família · Empresa · Aniversários · qualquer ocasião</p>
              </div>
            )}
            <div className="homebar" />
          </div>
        )}
        <InstallPrompt />
        <Feedback />
        <Sheet open={codeAsk} onClose={() => setCodeAsk(false)} label="Código de convite">
          <h3 className="t-title">Tenho um código</h3>
          <p className="t-sub mt4">Escreva o código que recebeu. Depois crie a sua conta (ou entre) e fica logo no grupo.</p>
          <Field className="mt16" icon={KeyRound} placeholder="Ex.: K7M2QX" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={12} style={{ letterSpacing: 3, fontWeight: 600 }} />
          <button className="btn mt16" disabled={normalizeCode(codeInput).length < 4} onClick={() => {
              const c = normalizeCode(codeInput);
              setCodeAsk(false);
              if (uid && user) {
                closeSplash();
                setJoinOpen({ code: c });
              } else {
                pendingJoin.current = c;
                welcomeGo('register');
              }
            }}>Continuar</button>
        </Sheet>
      </div>
    </div>
  );
}
