import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Caminho relativo das fotos (funciona em qualquer endereço do GitHub Pages). */
export const photo = (name: 'splash' | 'hero' | 'group' | 'draw' | 't1' | 't2' | 't3') => `photos/${name}.jpg`;
export const bg = (src: string): React.CSSProperties => ({ backgroundImage: `url("${src}")` });

/* --------------------------------- Logótipo -------------------------------- */
export function GiftMark({ size = 44, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="bx" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a7a50" />
          <stop offset="1" stopColor="#0b4a31" />
        </linearGradient>
        <linearGradient id="gd" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3d27a" />
          <stop offset=".55" stopColor="#d4a63c" />
          <stop offset="1" stopColor="#a87b1c" />
        </linearGradient>
      </defs>
      <path d="M24 15c-2.5-5.5-9.5-8-11-4.2-1.3 3.4 4.4 4.6 11 4.2Z" fill="none" stroke="url(#gd)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M24 15c2.5-5.5 9.5-8 11-4.2 1.3 3.4-4.4 4.6-11 4.2Z" fill="none" stroke="url(#gd)" strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="6.5" y="15.5" width="35" height="8" rx="2" fill="url(#bx)" stroke={light ? 'rgba(255,255,255,.55)' : 'none'} strokeWidth="1" />
      <rect x="9" y="23.5" width="30" height="19" rx="2" fill="url(#bx)" stroke={light ? 'rgba(255,255,255,.55)' : 'none'} strokeWidth="1" />
      <rect x="21.5" y="15.5" width="5" height="27" fill="url(#gd)" />
    </svg>
  );
}

export function Logo({ size = 'md', light = false, center = false }: { size?: 'sm' | 'md' | 'lg' | 'xl'; light?: boolean; center?: boolean }) {
  const s = { sm: [32, 20, 10], md: [42, 26, 12], lg: [52, 32, 14], xl: [64, 42, 17] }[size];
  return (
    <div className="row" style={{ gap: size === 'sm' ? 6 : 10, justifyContent: center ? 'center' : undefined }}>
      <GiftMark size={s[0]} light={light} />
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontSize: s[1], fontWeight: 700, color: light ? '#fff' : '#0b3b27', letterSpacing: -0.5 }}>Bilar</div>
        <div style={{ fontSize: s[2], fontWeight: 500, color: light ? '#6fe0a6' : '#13804f', marginTop: 3 }}>Amigo Secreto</div>
      </div>
    </div>
  );
}

/* ---------------------------------- Campos --------------------------------- */
export function Field({
  icon: Icon,
  right,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ElementType; right?: React.ReactNode }) {
  return (
    <label className={cx('field', className)}>
      {Icon && <Icon size={19} />}
      <input {...rest} />
      {right}
    </label>
  );
}

export function Avatar({ src, size = 40, alt = '' }: { src: string; size?: number; alt?: string }) {
  return <img className="avatar" src={src} alt={alt} width={size} height={size} style={{ width: size, height: size }} />;
}

/* ------------------------------ Folha (modal) ------------------------------ */
export function Sheet({ open, onClose, children, mid = false, label }: { open: boolean; onClose: () => void; children: React.ReactNode; mid?: boolean; label?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  const host = document.querySelector('.app') || document.body;
  return createPortal(
    <div className={cx('backdrop', mid && 'mid')} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {!mid && <div className="grab" />}
        {children}
      </div>
    </div>,
    host,
  );
}

/* ---------------------------- Avisos e confirmação ---------------------------- */
type Toast = { id: number; text: string; kind: 'ok' | 'error' };
let pushToast: (t: Toast) => void = () => {};
let askFn: (o: ConfirmOpts) => Promise<boolean> = async () => false;
type ConfirmOpts = { title: string; message?: string; confirm?: string; danger?: boolean };

export const toast = (text: string, kind: 'ok' | 'error' = 'ok') => pushToast({ id: Date.now() + Math.random(), text, kind });
export const confirmDialog = (o: ConfirmOpts) => askFn(o);

export function Feedback() {
  const [list, setList] = useState<Toast[]>([]);
  const [ask, setAsk] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  useEffect(() => {
    pushToast = (t) => {
      setList((l) => [...l.slice(-2), t]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), t.kind === 'error' ? 6000 : 2400);
    };
    askFn = (o) => new Promise((resolve) => setAsk({ ...o, resolve }));
  }, []);
  const close = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };
  return (
    <>
      <div className="toasts" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={cx('toast', t.kind === 'error' && 'error')}>
            {t.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="grow">{t.text}</span>
            <button onClick={() => setList((l) => l.filter((x) => x.id !== t.id))} aria-label="Fechar"><X size={16} /></button>
          </div>
        ))}
      </div>
      <Sheet open={!!ask} onClose={() => close(false)} mid label={ask?.title}>
        {ask && (
          <div>
            <h3 className="t-h2">{ask.title}</h3>
            {ask.message && <p className="t-sub mt8" style={{ lineHeight: 1.5 }}>{ask.message}</p>}
            <div className="row mt20">
              <button className="btn outline" onClick={() => close(false)}>Cancelar</button>
              <button className={cx('btn', ask.danger && 'danger')} onClick={() => close(true)}>{ask.confirm || 'Confirmar'}</button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

export function Empty({ icon: Icon, title, text, children }: { icon: React.ElementType; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="ico"><Icon size={30} /></div>
      <h3 className="t-h2">{title}</h3>
      {text && <p className="t-sub mt8" style={{ lineHeight: 1.5 }}>{text}</p>}
      {children && <div className="mt16">{children}</div>}
    </div>
  );
}
