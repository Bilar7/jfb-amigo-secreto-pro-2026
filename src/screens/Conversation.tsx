import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, CheckCheck, Clock, Copy, FileText, Image as ImageIcon, Loader2, Lock, Mic, MoreVertical, Paperclip, Pause, Play, Plus, SendHorizontal, Smile, Trash2, X } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import { VOICE_MAX_SECONDS, VoiceRecorder, blobToDataUrl, prepareFile } from '../services/media';
import type { Message, ThreadRef } from '../types';
import { useApp } from '../state';
import { Avatar, Sheet, confirmDialog, cx, toast } from '../ui/kit';
import { formatBytes, formatClock, formatDayLabel, formatDuration } from '../utils/format';
import { groupPhoto } from '../utils/occasions';
import { sound } from '../utils/sound';
import { MaskAvatar } from './common';
import { GroupMissing, MemberSheet, useGroup } from './GroupDetail';

const NAME_COLORS = ['#0f766e', '#b45309', '#be123c', '#4338ca', '#0369a1', '#15803d', '#a21caf', '#c2410c'];
const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
};
const EMOJIS = '😀 😂 🥰 😍 😘 😊 😉 😎 🤩 🥳 😅 🤗 🤔 🤫 😮 😢 😭 😡 👍 👏 🙏 💪 👌 🤝 ❤️ 💚 💛 🔥 ✨ 🎉 🎁 🎂 🎈 🎊 🌟 💐 🍰 ☕ 📦 🛍️ 💸 😜 🙈 👀 💯 ✅ 🎭 🥂'.split(' ');

/* ------------------------------ Anexos ------------------------------ */
function useMedia(ref: ThreadRef, mediaId?: string, eager = true) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const load = React.useCallback(async () => {
    if (!mediaId || src) return src;
    try {
      const d = await backend.getMedia(ref, mediaId);
      if (!d) setFailed(true);
      setSrc(d);
      return d;
    } catch {
      setFailed(true);
      return null;
    }
  }, [ref, mediaId, src]);
  useEffect(() => {
    if (eager) load();
  }, [eager, mediaId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { src, failed, load };
}

function ImageBubble({ threadRef, m, onOpen }: { threadRef: ThreadRef; m: Message; onOpen: (src: string) => void }) {
  const { src, failed } = useMedia(threadRef, m.attachment?.mediaId);
  const a = m.attachment!;
  const ratio = a.width && a.height ? a.height / a.width : 0.75;
  return src ? (
    <img src={src} alt="Foto" onClick={() => onOpen(src)} style={{ aspectRatio: `${1 / Math.min(1.4, Math.max(0.5, ratio))}` }} />
  ) : (
    <div style={{ width: 220, height: 220 * Math.min(1.3, ratio), borderRadius: 10, background: '#eef2ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#74847b', fontSize: 12 }}>
      {failed ? 'Foto indisponível' : <Loader2 size={20} className="spin" />}
    </div>
  );
}

let playing: HTMLAudioElement | null = null;
function VoiceBubble({ threadRef, m }: { threadRef: ThreadRef; m: Message }) {
  const a = m.attachment!;
  const { load } = useMedia(threadRef, a.mediaId, false);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [pos, setPos] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = async () => {
    if (state === 'playing') {
      audio.current?.pause();
      return;
    }
    if (!audio.current) {
      setState('loading');
      const src = await load();
      if (!src) {
        setState('idle');
        return toast('Não foi possível abrir a nota de voz.', 'error');
      }
      const el = new Audio(src);
      el.ontimeupdate = () => setPos(el.duration && Number.isFinite(el.duration) ? el.currentTime / el.duration : el.currentTime / (a.duration || 1));
      el.onpause = () => setState('idle');
      el.onended = () => {
        setState('idle');
        setPos(0);
      };
      el.onplay = () => setState('playing');
      audio.current = el;
    }
    if (playing && playing !== audio.current) playing.pause();
    playing = audio.current;
    audio.current.play().catch(() => setState('idle'));
  };
  const bars = a.waveform && a.waveform.length ? a.waveform : Array.from({ length: 36 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));
  return (
    <div className="voice">
      <button className="play" onClick={toggle} aria-label={state === 'playing' ? 'Pausar' : 'Ouvir'}>
        {state === 'loading' ? <Loader2 size={18} className="spin" /> : state === 'playing' ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: 2 }} />}
      </button>
      <div className="wave" aria-hidden="true">
        {bars.map((v, i) => (
          <i key={i} className={cx(i / bars.length < pos && 'on')} style={{ height: `${Math.max(14, v * 100)}%` }} />
        ))}
      </div>
      <span className="t-small" style={{ fontSize: 11 }}>{formatDuration(a.duration || 0)}</span>
    </div>
  );
}

function FileBubble({ threadRef, m }: { threadRef: ThreadRef; m: Message }) {
  const a = m.attachment!;
  const { load } = useMedia(threadRef, a.mediaId, false);
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    const src = await load();
    setBusy(false);
    if (!src) return toast('Ficheiro indisponível.', 'error');
    const link = document.createElement('a');
    link.href = src;
    link.download = a.name;
    link.click();
  };
  if (a.type === 'video') {
    return <VideoBubble threadRef={threadRef} m={m} />;
  }
  return (
    <button className="filebox" onClick={open}>
      <span className="fi">{busy ? <Loader2 size={18} className="spin" /> : <FileText size={20} />}</span>
      <span style={{ textAlign: 'left', minWidth: 0 }}>
        <span className="truncate" style={{ display: 'block', fontSize: 13, fontWeight: 500, maxWidth: 180 }}>{a.name}</span>
        <span className="t-small" style={{ fontSize: 11 }}>{formatBytes(a.size)} · toque para abrir</span>
      </span>
    </button>
  );
}

function VideoBubble({ threadRef, m }: { threadRef: ThreadRef; m: Message }) {
  const { src } = useMedia(threadRef, m.attachment?.mediaId);
  return src ? <video src={src} controls playsInline style={{ maxWidth: 240, borderRadius: 10 }} /> : <Loader2 size={20} className="spin" />;
}

/* ------------------------------ Ecrã ------------------------------ */
export function ConversationScreen({ threadRef }: { threadRef: ThreadRef }) {
  const { user, threads, back } = useApp();
  const { g, missing } = useGroup(threadRef.groupId);
  const thread = threads.find((t) => t.groupId === threadRef.groupId && t.id === threadRef.id);
  const exists = threadRef.kind === 'group' || !!thread;
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [selected, setSelected] = useState<Message | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberSheet, setMemberSheet] = useState<string | null>(null);
  const [sending, setSending] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  /* Mensagens em tempo real */
  useEffect(() => {
    if (!exists) {
      setMsgs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return backend.watchMessages(
      threadRef,
      (list) => {
        setMsgs(list);
        setLoading(false);
        setLoadErr('');
      },
      (e) => {
        setLoading(false);
        setLoadErr(friendlyError(e));
      },
    );
  }, [threadRef.groupId, threadRef.id, exists]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Marcar como lida */
  const lastMarked = useRef(-1);
  useEffect(() => {
    if (!thread) return;
    const mine = thread.reads[user.id] || 0;
    if (thread.count > mine && lastMarked.current !== thread.count && document.visibilityState === 'visible') {
      lastMarked.current = thread.count;
      backend.markThreadRead(threadRef, user.id, thread.count).catch(() => (lastMarked.current = -1));
    }
  }, [thread?.count, thread?.reads[user.id], msgs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Rolagem */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const last = msgs[msgs.length - 1];
    if (atBottom.current || last?.senderId === user.id) el.scrollTop = el.scrollHeight;
  }, [msgs.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberName = (id: string) => g?.members.find((m) => m.id === id)?.name;

  /* Quem sou eu nesta conversa e como apareço */
  const isSecret = threadRef.kind === 'secret';
  const receiverId = isSecret ? threadRef.id.slice(threadRef.id.indexOf('_') + 1) : '';
  const iAmGiver = isSecret && receiverId !== user.id;
  const myDisplayName = iAmGiver ? 'Amigo Secreto 🎭' : user.name;
  const others = useMemo(() => {
    if (!g) return [];
    if (threadRef.kind === 'group') return g.members.map((m) => m.id).filter((id) => id !== user.id);
    return threadRef.participants.filter((p) => p !== user.id);
  }, [g, threadRef, user.id]);

  if (!g) return <GroupMissing missing={missing} />;

  let title = g.name;
  let subtitle = `${g.members.length} membros`;
  let avatar: React.ReactNode = <Avatar src={groupPhoto(g)} size={40} />;
  if (threadRef.kind === 'direct') {
    const o = g.members.find((m) => m.id === others[0]);
    title = o?.name || 'Conversa privada';
    subtitle = `Privado · ${g.name}`;
    avatar = <Avatar src={o?.avatar || ''} size={40} />;
  } else if (isSecret) {
    if (iAmGiver) {
      const o = g.members.find((m) => m.id === receiverId);
      title = o?.name || 'O meu amigo secreto';
      subtitle = 'O seu nome fica escondido 🎭';
      avatar = <Avatar src={o?.avatar || ''} size={40} />;
    } else {
      title = 'Amigo Secreto';
      subtitle = `Anónimo · ${g.name}`;
      avatar = <MaskAvatar size={40} />;
    }
  }

  const nameOf = (m: Message) => {
    if (m.senderId === user.id) return 'Você';
    if (isSecret) return iAmGiver ? title : 'Amigo Secreto 🎭';
    return memberName(m.senderId) || m.senderName || 'Participante';
  };

  const isRead = (m: Message) => {
    if (!thread || others.length === 0) return false;
    return others.every((o) => (thread.readAt[o] || 0) >= m.createdAt);
  };

  /* Envio */
  const send = async (text: string, attachment?: Parameters<typeof backend.sendMessage>[3]['attachment'], inlineData?: string) => {
    try {
      sound.sent();
      await backend.sendMessage(user, threadRef, myDisplayName, { text, attachment, inlineData });
      atBottom.current = true;
    } catch (e) {
      toast(friendlyError(e), 'error');
      throw e;
    }
  };
  const sendFiles = async (files: File[]) => {
    for (const f of files) {
      setSending(f.name);
      try {
        const p = await prepareFile(f);
        await send('', p.attachment, await blobToDataUrl(p.blob));
      } catch (e) {
        toast(friendlyError(e), 'error');
      }
    }
    setSending('');
  };

  const remove = async (m: Message) => {
    setSelected(null);
    const ok = await confirmDialog({ title: 'Apagar mensagem?', message: 'A mensagem é apagada para todos.', confirm: 'Apagar', danger: true });
    if (ok) backend.deleteMessage(threadRef, m).catch((e) => toast(friendlyError(e), 'error'));
  };

  /* Lista de mensagens com separadores de dia */
  const rows: React.ReactNode[] = [];
  let lastDay = '';
  msgs.forEach((m, i) => {
    const day = formatDayLabel(m.createdAt);
    if (day !== lastDay) {
      lastDay = day;
      rows.push(<div key={'d' + m.id} className="day"><span>{day}</span></div>);
    }
    const mine = m.senderId === user.id;
    const prev = msgs[i - 1];
    const showName = !mine && threadRef.kind === 'group' && (!prev || prev.senderId !== m.senderId || formatDayLabel(prev.createdAt) !== day);
    const a = m.deleted ? undefined : m.attachment;
    const isMedia = a && (a.type === 'image' || a.type === 'video');
    const meta = (
      <span className="meta">
        {formatClock(m.createdAt)}
        {mine && (m.pending ? <Clock size={12} /> : isRead(m) ? <CheckCheck size={14} className="read" /> : <Check size={14} />)}
      </span>
    );
    rows.push(
      <div key={m.id} className={cx('msg', mine ? 'me' : 'them')} style={{ marginTop: prev && prev.senderId !== m.senderId ? 10 : 3 }}>
        <div
          className={cx('bubble', m.deleted && 'deleted', isMedia && 'media')}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!m.deleted) setSelected(m);
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button,img,video,a')) return;
            if (!m.deleted) setSelected(m);
          }}
        >
          {showName && <div className="who" style={{ color: colorFor(m.senderId), padding: isMedia ? '4px 6px 2px' : 0 }}>{nameOf(m)}</div>}
          {m.deleted ? (
            <>🚫 Mensagem apagada{meta}</>
          ) : a?.type === 'image' ? (
            <>
              <ImageBubble threadRef={threadRef} m={m} onOpen={setLightbox} />
              {m.text && <div className="cap">{m.text}</div>}
              {meta}
            </>
          ) : a?.type === 'audio' ? (
            <>
              <VoiceBubble threadRef={threadRef} m={m} />
              {meta}
            </>
          ) : a ? (
            <>
              <FileBubble threadRef={threadRef} m={m} />
              {meta}
            </>
          ) : (
            <>
              {m.text}
              {meta}
            </>
          )}
        </div>
      </div>,
    );
  });

  return (
    <>
      <header className="conv-head">
        <button className="icon-btn" onClick={back} aria-label="Voltar"><ArrowLeft size={22} /></button>
        <button className="row grow" style={{ textAlign: 'left', gap: 10 }} onClick={() => threadRef.kind === 'group' && setMembersOpen(true)}>
          {avatar}
          <span className="grow" style={{ minWidth: 0 }}>
            <h2 className="truncate">{title}</h2>
            <span className="t-small truncate" style={{ display: 'block' }}>{subtitle}</span>
          </span>
        </button>
        {threadRef.kind === 'group' && (
          <button className="icon-btn" onClick={() => setMembersOpen(true)} aria-label="Membros do grupo"><MoreVertical size={20} /></button>
        )}
      </header>

      <div
        className="conv-body"
        ref={bodyRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        {isSecret && (
          <div className="secret-note">
            <Lock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{iAmGiver ? `Conversa secreta: ${title.split(' ')[0]} não vê o seu nome. Pergunte gostos e tamanhos à vontade!` : 'Conversa secreta: quem lhe escreve é o seu amigo secreto. Descubra no dia da revelação!'}</span>
          </div>
        )}
        {threadRef.kind === 'direct' && (
          <div className="secret-note" style={{ background: '#f2f9f4', borderColor: '#cfe8d9', color: '#0e4d33' }}>
            <Lock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Conversa privada: só vocês os dois veem estas mensagens.</span>
          </div>
        )}
        {loadErr && <div className="banner" style={{ margin: '0 0 10px' }}>{loadErr}</div>}
        {loading ? (
          <div className="center" style={{ padding: 40 }}><Loader2 className="spin" color="#157a4f" /></div>
        ) : msgs.length === 0 ? (
          <div className="center t-sub" style={{ padding: '40px 20px' }}>
            {threadRef.kind === 'group' ? 'Ainda não há mensagens. Diga olá ao grupo! 👋' : 'Ainda não há mensagens. Escreva a primeira!'}
          </div>
        ) : (
          rows
        )}
      </div>

      {sending && (
        <div className="row" style={{ padding: '8px 16px', fontSize: 12, color: '#0e4d33', background: '#f2f9f4', borderTop: '1px solid #e5f3ea' }}>
          <Loader2 size={14} className="spin" /> A enviar {sending}…
        </div>
      )}

      <Composer onSend={(t) => send(t)} onFiles={sendFiles} onVoice={async (r) => {
        setSending('nota de voz');
        try {
          await send('', { type: 'audio', name: 'Nota de voz', size: r.blob.size, mime: r.mime, duration: r.duration, waveform: r.waveform }, await blobToDataUrl(r.blob));
        } catch {
          /* aviso já mostrado */
        }
        setSending('');
      }} placeholder={iAmGiver ? 'Escreva como amigo secreto…' : 'Escreve uma mensagem…'} />

      <Sheet open={!!selected} onClose={() => setSelected(null)} label="Mensagem">
        {selected && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p className="t-small">{nameOf(selected)} · {formatClock(selected.createdAt)}</p>
            {selected.text && (
              <button className="btn outline" onClick={() => { navigator.clipboard?.writeText(selected.text); toast('Texto copiado.'); setSelected(null); }}>
                <Copy size={18} /> Copiar texto
              </button>
            )}
            {selected.senderId === user.id && (
              <button className="btn danger" onClick={() => remove(selected)}><Trash2 size={18} /> Apagar para todos</button>
            )}
            {!selected.text && selected.senderId !== user.id && <p className="t-sub">Sem ações para esta mensagem.</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={membersOpen} onClose={() => setMembersOpen(false)} label="Membros">
        <h3 className="t-h2 mb8">{g.name} · {g.members.length} membros</h3>
        <p className="t-small mb12">Toque num membro para lhe escrever em privado.</p>
        {g.members.map((m) => (
          <button key={m.id} className="chat-row" style={{ padding: '10px 0' }} onClick={() => { setMembersOpen(false); setMemberSheet(m.id); }}>
            <Avatar src={m.avatar} size={40} />
            <div className="grow"><h3 className="truncate">{m.name}{m.id === user.id && ' (você)'}</h3></div>
            {m.id === g.adminId && <span className="tag gold">Organizador</span>}
          </button>
        ))}
      </Sheet>
      <MemberSheet g={g} m={g.members.find((m) => m.id === memberSheet) || null} onClose={() => setMemberSheet(null)} />

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto" />
          <button className="icon-btn glass" style={{ position: 'absolute', top: 16, right: 16 }} aria-label="Fechar"><X size={22} /></button>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Caixa de mensagem ------------------------------ */
function Composer({ onSend, onFiles, onVoice, placeholder }: { onSend: (t: string) => Promise<void>; onFiles: (f: File[]) => void; onVoice: (r: Awaited<ReturnType<VoiceRecorder['stop']>>) => void; placeholder: string }) {
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'' | 'attach' | 'emoji'>('');
  const [rec, setRec] = useState<{ sec: number } | null>(null);
  const recorder = useRef<VoiceRecorder | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(120, el.scrollHeight) + 'px';
  }, [text]);
  useEffect(() => () => recorder.current?.cancel(), []);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    setPanel('');
    onSend(t).catch(() => setText(t));
    ta.current?.focus();
  };

  const startRec = async () => {
    if (!VoiceRecorder.supported()) return toast('Este navegador não grava áudio.', 'error');
    const r = new VoiceRecorder();
    r.onTick = (_l, s) => {
      setRec({ sec: s });
      if (s >= VOICE_MAX_SECONDS) stopRec(true);
    };
    try {
      await r.start();
      recorder.current = r;
      setRec({ sec: 0 });
      setPanel('');
    } catch {
      toast('Sem acesso ao microfone. Autorize o microfone nas definições do navegador.', 'error');
    }
  };
  const stopRec = async (sendIt: boolean) => {
    const r = recorder.current;
    recorder.current = null;
    setRec(null);
    if (!r) return;
    if (!sendIt) return r.cancel();
    try {
      const res = await r.stop();
      if (res.duration < 0.8) return toast('Mantenha a gravar um pouco mais.', 'error');
      onVoice(res);
    } catch {
      /* cancelado */
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setPanel('');
    if (files.length) onFiles(files);
  };

  return (
    <div style={{ flexShrink: 0 }}>
      {panel === 'attach' && (
        <div className="attach-grid">
          <button onClick={() => gallery.current?.click()}><span><ImageIcon size={20} /></span>Galeria</button>
          <button onClick={() => camera.current?.click()}><span><Camera size={20} /></span>Câmera</button>
          <button onClick={() => file.current?.click()}><span><Paperclip size={20} /></span>Ficheiro</button>
        </div>
      )}
      {panel === 'emoji' && (
        <div className="emoji-panel">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setText((t) => t + e)}>{e}</button>
          ))}
        </div>
      )}
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={pick} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={file} type="file" hidden onChange={pick} />
      <div className="composer">
        {rec ? (
          <>
            <button className="plus" onClick={() => stopRec(false)} aria-label="Cancelar gravação" style={{ color: '#d63b3b' }}><Trash2 size={20} /></button>
            <div className="rec"><i /> A gravar… {formatDuration(rec.sec)}</div>
            <button className="send" onClick={() => stopRec(true)} aria-label="Enviar nota de voz"><SendHorizontal size={20} /></button>
          </>
        ) : (
          <>
            <button className={cx('plus', panel === 'attach' && 'open')} onClick={() => setPanel((p) => (p === 'attach' ? '' : 'attach'))} aria-label="Anexar"><Plus size={24} /></button>
            <div className="box">
              <textarea
                ref={ta}
                rows={1}
                value={text}
                placeholder={placeholder}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setPanel((p) => (p === 'attach' ? '' : p))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                    e.preventDefault();
                    submit();
                  }
                }}
                aria-label="Mensagem"
              />
              <button className="icon-btn" onClick={() => setPanel((p) => (p === 'emoji' ? '' : 'emoji'))} aria-label="Emojis" style={{ width: 36, height: 44, color: '#74847b' }}><Smile size={21} /></button>
            </div>
            {text.trim() ? (
              <button className="send" onClick={submit} aria-label="Enviar"><SendHorizontal size={20} /></button>
            ) : (
              <button className="send" onClick={startRec} aria-label="Gravar nota de voz"><Mic size={20} /></button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
