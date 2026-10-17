import React, { useState } from 'react';
import { ArrowLeft, Camera, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import type { AccountType } from '../types';
import { Avatar, Field, Logo, Sheet, bg, cx, photo, toast } from '../ui/kit';
import { avatarFromFile } from '../services/media';
import { makeAvatar } from '../utils/avatar';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const Eye2 = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
  <button type="button" onClick={toggle} aria-label={show ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'} style={{ color: '#33443b' }}>
    {show ? <EyeOff size={19} /> : <Eye size={19} />}
  </button>
);

export function Login({ onRegister }: { onRegister: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<'' | 'mail' | 'google'>('');
  const [resetOpen, setResetOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !pw) return toast('Preencha o email/número e a palavra-passe.', 'error');
    setBusy('mail');
    try {
      await backend.signIn(id, pw, remember);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy('');
    }
  };
  const google = async () => {
    setBusy('google');
    try {
      await backend.signInGoogle();
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy('');
    }
  };

  return (
    <div className="screen">
      <div className="scroll">
        <div className="safe-top" style={{ padding: '34px 20px 22px' }}>
          <Logo size="lg" center />
        </div>
        <div className="auth-hero" style={bg(photo('hero'))}>
          <svg className="wave" viewBox="0 0 400 46" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0h400v14c-60 26-130 30-200 14S60 8 0 30z" fill="#fff" />
          </svg>
          <div className="dots"><i className="on" /><i /><i /><i /></div>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <Field icon={Mail} placeholder="Email ou número de telefone" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" inputMode="email" aria-label="Email ou número de telefone" />
          <Field className="mt12" icon={Lock} placeholder="Palavra-passe" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" aria-label="Palavra-passe" right={<Eye2 show={show} toggle={() => setShow((s) => !s)} />} />
          <div className="row between mt16">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Lembrar-me
            </label>
            <button type="button" className="t-link" onClick={() => setResetOpen(true)}>Esqueceu a palavra-passe?</button>
          </div>
          <button className="btn mt20" disabled={!!busy}>{busy === 'mail' ? <Loader2 size={20} className="spin" /> : 'Entrar'}</button>
          <div className="divider">ou</div>
          <button type="button" className="btn outline" onClick={google} disabled={!!busy}>
            {busy === 'google' ? <Loader2 size={20} className="spin" /> : <GoogleIcon />} Entrar com o Google
          </button>
          <p className="center mt24" style={{ fontSize: 13, color: '#33443b' }}>
            Não tem uma conta?{' '}
            <button type="button" className="t-link" onClick={onRegister}>Registar</button>
          </p>
        </form>
      </div>
      <ResetSheet open={resetOpen} initial={id} onClose={() => setResetOpen(false)} />
    </div>
  );
}

function ResetSheet({ open, initial, onClose }: { open: boolean; initial: string; onClose: () => void }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => setV(initial), [initial, open]);
  const send = async () => {
    setBusy(true);
    try {
      await backend.resetPassword(v);
      toast('Enviámos um link para repor a palavra-passe. Veja o seu email (e o spam).');
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setBusy(false);
  };
  return (
    <Sheet open={open} onClose={onClose} label="Recuperar palavra-passe">
      <h3 className="t-title">Recuperar palavra-passe</h3>
      <p className="t-sub mt4">Indique o email da sua conta e enviamos um link para criar uma nova.</p>
      <Field className="mt16" icon={Mail} placeholder="Email" value={v} onChange={(e) => setV(e.target.value)} inputMode="email" />
      <button className="btn mt16" onClick={send} disabled={busy || !v.trim()}>{busy ? <Loader2 size={20} className="spin" /> : 'Enviar link'}</button>
    </Sheet>
  );
}

const TYPES: { key: AccountType; label: string; name: string }[] = [
  { key: 'pessoal', label: 'Pessoal', name: 'Nome completo' },
  { key: 'empresa', label: 'Empresa', name: 'Nome da empresa' },
  { key: 'grupo', label: 'Grupo', name: 'Nome do grupo ou organização' },
];

export function Register({ onLogin }: { onLogin: () => void }) {
  const [type, setType] = useState<AccountType>('pessoal');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [avatar, setAvatar] = useState('');
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [terms, setTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const avatarFile = React.useRef<HTMLInputElement>(null);

  const chooseAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setAvatar(await avatarFromFile(file));
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast('Escreva o nome.', 'error');
    if (!id.trim()) return toast('Escreva o email ou número de telefone.', 'error');
    if (pw.length < 6) return toast('A palavra-passe precisa de pelo menos 6 caracteres.', 'error');
    if (pw !== pw2) return toast('As palavras-passe não coincidem.', 'error');
    if (!terms) return toast('Aceite os Termos e a Política de Privacidade para continuar.', 'error');
    setBusy(true);
    try {
      await backend.signUp({ name, identifier: id, password: pw, accountType: type, avatar: avatar || undefined });
      toast(`Bem-vindo(a), ${name.trim().split(' ')[0]}! 🎁`);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="scroll">
        <div className="safe-top" style={{ padding: '10px 10px 0' }}>
          <button className="icon-btn" onClick={onLogin} aria-label="Voltar"><ArrowLeft size={22} /></button>
        </div>
        <form className="pad" onSubmit={submit} style={{ paddingBottom: 28 }}>
          <div className="center" style={{ margin: '6px 0 22px' }}>
            <h1 className="t-title" style={{ fontSize: 24 }}>Criar Conta</h1>
            <p className="t-sub mt4">Junta-te ao Bilar Amigo Secreto</p>
          </div>
          <div className="seg" role="tablist">
            {TYPES.map((t) => (
              <button type="button" key={t.key} className={cx(type === t.key && 'on')} onClick={() => setType(t.key)} role="tab" aria-selected={type === t.key}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="profile-photo-register">
            <Avatar src={avatar || makeAvatar(name.trim() || 'Bilar')} size={72} alt="Prévia da foto de perfil" />
            <div className="grow">
              <p className="label">Foto de perfil <span className="t-small">(opcional)</span></p>
              <p className="t-small">Podes adicionar agora ou depois em Minha Conta.</p>
              <input ref={avatarFile} type="file" accept="image/*" hidden onChange={chooseAvatar} />
              <button type="button" className="btn outline sm mt8" onClick={() => avatarFile.current?.click()}><Camera size={16} /> {avatar ? 'Trocar foto' : 'Adicionar foto'}</button>
            </div>
          </div>
          <Field className="mt20" icon={UserIcon} placeholder={TYPES.find((t) => t.key === type)!.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <Field className="mt12" icon={Mail} placeholder="Email ou número de telefone" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" />
          <Field className="mt12" icon={Lock} placeholder="Palavra-passe" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" right={<Eye2 show={show} toggle={() => setShow((s) => !s)} />} />
          <Field className="mt12" icon={Lock} placeholder="Confirmar palavra-passe" type={show2 ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" right={<Eye2 show={show2} toggle={() => setShow2((s) => !s)} />} />
          <label className="check mt16">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              Li e aceito os{' '}
              <button type="button" className="t-link" onClick={() => setTermsOpen(true)}>Termos e Condições</button> e a{' '}
              <button type="button" className="t-link" onClick={() => setTermsOpen(true)}>Política de Privacidade</button>
            </span>
          </label>
          <button className="btn mt24" disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : 'Criar Conta'}</button>
          <div className="divider">ou</div>
          <button type="button" className="btn outline" disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              await backend.signInGoogle();
            } catch (err) {
              toast(friendlyError(err), 'error');
              setBusy(false);
            }
          }}>
            <GoogleIcon /> Continuar com o Google
          </button>
          <p className="center mt20" style={{ fontSize: 13, color: '#74847b' }}>
            Já tem uma conta? <button type="button" className="t-link" onClick={onLogin}>Entrar</button>
          </p>
        </form>
      </div>
      <Sheet open={termsOpen} onClose={() => setTermsOpen(false)} label="Termos e Privacidade">
        <h3 className="t-title">Termos e Privacidade</h3>
        <div className="t-sub mt12" style={{ lineHeight: 1.6, color: '#33443b' }}>
          <p>O Bilar Amigo Secreto serve para organizar trocas de presentes entre amigos, famílias, colegas e qualquer grupo, em qualquer ocasião.</p>
          <p className="mt8">• Só os membros de um grupo veem esse grupo, o seu chat e os seus membros.</p>
          <p className="mt8">• O resultado do sorteio só é mostrado à própria pessoa.</p>
          <p className="mt8">• Conversas privadas só são vistas pelas duas pessoas; no chat secreto, o nome de quem oferece fica escondido.</p>
          <p className="mt8">• Seja respeitoso. Não partilhe conteúdo ofensivo ou ilegal.</p>
          <p className="mt8">• Pode sair dos grupos a qualquer momento e pedir a eliminação da conta.</p>
        </div>
        <button className="btn mt20" onClick={() => { setTerms(true); setTermsOpen(false); }}>Aceito</button>
      </Sheet>
    </div>
  );
}
