import { useEffect, useState } from 'react';
import { Copy, ImageDown, KeyRound, Loader2, Share2 } from 'lucide-react';
import { backend, normalizeCode } from '../services/backend';
import { friendlyError } from '../services/errors';
import type { Group } from '../types';
import { useApp } from '../state';
import { Field, GiftMark, Sheet, toast } from '../ui/kit';
import { formatDateShort, formatMoney, inviteLink } from '../utils/format';
import { occasionText } from '../utils/occasions';

export function JoinSheet({ open, initialCode, onClose, onJoined }: { open: boolean; initialCode: string; onClose: () => void; onJoined: (gid: string) => void }) {
  const { user, groups } = useApp();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  useEffect(() => setCode(initialCode), [initialCode, open]);
  const join = async () => {
    const c = normalizeCode(code);
    const already = groups.find((g) => g.code === c);
    if (already) {
      toast(`Já faz parte de "${already.name}".`);
      return onJoined(already.id);
    }
    setBusy(true);
    try {
      const { groupId, groupName } = await backend.joinByCode(user, c);
      toast(`Bem-vindo(a) ao grupo "${groupName}"! 🎉`);
      onJoined(groupId);
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setBusy(false);
  };
  return (
    <Sheet open={open} onClose={onClose} label="Entrar num grupo">
      <div className="center">
        <div style={{ display: 'flex', justifyContent: 'center' }}><GiftMark size={54} /></div>
        <h3 className="t-title mt8">Entrar num grupo</h3>
        <p className="t-sub mt4">Escreva o código de 6 letras que recebeu do organizador.</p>
      </div>
      <Field className="mt16" icon={KeyRound} placeholder="Ex.: K7M2QX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" style={{ letterSpacing: 3, fontWeight: 600 }} />
      <button className="btn mt16" onClick={join} disabled={busy || normalizeCode(code).length < 4}>{busy ? <Loader2 size={20} className="spin" /> : 'Entrar no grupo'}</button>
    </Sheet>
  );
}

/** Mensagem de convite bonita e personalizada */
export function inviteMessage(g: Group, inviter: string): string {
  const lines = [
    '🎁 *Convite para Amigo Secreto!*',
    '',
    `Olá! ${inviter ? inviter.split(' ')[0] + ' convidou-te' : 'Foste convidado(a)'} para o grupo *${g.name}* no Bilar Amigo Secreto. 💚`,
    '',
    `🎉 Ocasião: ${occasionText(g)}`,
    `📅 Revelação: ${formatDateShort(g.revealDate)}`,
  ];
  if (g.place) lines.push(`📍 Local: ${g.place}`);
  if (g.budget) lines.push(`💰 Orçamento: ${formatMoney(g.budget, g.currency)}`);
  lines.push('', `👉 Entra pelo link: ${inviteLink(g.code)}`, `🔑 Ou usa o código: *${g.code}*`, '', '_Mais do que presentes, são conexões especiais._ ✨');
  return lines.join('\n');
}

/** Gera a imagem do convite (1080×1350) com a foto, o nome do grupo e o código. */
async function inviteImage(g: Group, inviter: string): Promise<Blob | null> {
  try {
    await document.fonts?.ready;
    const W = 1080;
    const H = 1350;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d')!;
    const img = new Image();
    img.src = 'photos/splash.jpg';
    await img.decode();
    const s = Math.max(W / img.width, H / img.height);
    x.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    const gr = x.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(4,22,14,.88)');
    gr.addColorStop(0.45, 'rgba(4,22,14,.35)');
    gr.addColorStop(0.7, 'rgba(4,22,14,.55)');
    gr.addColorStop(1, 'rgba(4,22,14,.95)');
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    const F = '"Poppins", system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillStyle = '#e9c46a';
    x.font = `600 34px ${F}`;
    x.fillText('BILAR · AMIGO SECRETO', W / 2, 110);
    x.fillStyle = '#fff';
    x.font = `500 40px ${F}`;
    x.fillText(inviter ? `${inviter.split(' ')[0]} convida-te para` : 'Estás convidado(a) para', W / 2, 200);
    x.font = `700 84px ${F}`;
    const name = g.name.length > 22 ? g.name.slice(0, 21) + '…' : g.name;
    x.fillText(name, W / 2, 300);
    x.font = `500 38px ${F}`;
    x.fillStyle = '#bfe9cf';
    x.fillText(occasionText(g), W / 2, 365);
    const y = 780;
    const cardHeight = 490;
    x.fillStyle = 'rgba(255,255,255,.12)';
    x.strokeStyle = 'rgba(255,255,255,.3)';
    x.lineWidth = 2;
    x.beginPath();
    x.roundRect(90, y, W - 180, cardHeight, 36);
    x.fill();
    x.stroke();
    x.fillStyle = '#fff';
    const wrapText = (text: string, maxWidth: number) => {
      const lines: string[] = [];
      let line = '';
      for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && x.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      return lines;
    };
    x.font = `500 32px ${F}`;
    const info = [`📅 Revelação: ${formatDateShort(g.revealDate)}`];
    if (g.place) info.push(`📍 Local: ${g.place}`);
    if (g.budget) info.push(`💰 Orçamento: ${formatMoney(g.budget, g.currency)}`);
    let infoY = y + 58;
    for (const text of info) {
      for (const line of wrapText(text, W - 240)) {
        x.fillText(line, W / 2, infoY);
        infoY += 40;
      }
    }
    const codeLabelY = Math.max(y + 250, infoY + 20);
    x.fillStyle = '#e9c46a';
    x.font = `600 30px ${F}`;
    x.fillText('CÓDIGO DO GRUPO', W / 2, codeLabelY);
    x.font = `700 76px ${F}`;
    const codeY = codeLabelY + 78;
    x.fillText(g.code.split('').join(' '), W / 2, codeY);
    x.fillStyle = '#fff';
    x.font = `500 24px ${F}`;
    let linkY = codeY + 48;
    for (const line of wrapText(inviteLink(g.code), W - 220)) {
      x.fillText(line, W / 2, linkY);
      linkY += 30;
    }
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.font = `italic 400 32px ${F}`;
    x.fillText('Mais do que presentes, são conexões especiais.', W / 2, H - 40);
    return await new Promise((r) => c.toBlob((b) => r(b), 'image/jpeg', 0.9));
  } catch {
    return null;
  }
}

export function ShareSheet({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const { user } = useApp();
  const [busy, setBusy] = useState(false);
  if (!group) return null;
  const inviter = group.members.find((m) => m.id === user.id)?.name || user.name;
  const msg = inviteMessage(group, inviter);
  const link = inviteLink(group.code);

  const shareAll = async () => {
    setBusy(true);
    try {
      const blob = await inviteImage(group, inviter);
      const file = blob ? new File([blob], `convite-${group.code}.jpg`, { type: 'image/jpeg' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: msg, title: 'Convite Bilar Amigo Secreto' });
      } else if (navigator.share) {
        await navigator.share({ text: msg, title: 'Convite Bilar Amigo Secreto' });
      } else {
        await navigator.clipboard?.writeText(msg);
        toast('Convite copiado! Cole no WhatsApp, Instagram, TikTok…');
      }
    } catch {
      /* partilha cancelada */
    }
    setBusy(false);
  };
  const downloadImage = async () => {
    const blob = await inviteImage(group, inviter);
    if (!blob) return toast('Não foi possível criar a imagem.', 'error');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `convite-${group.code}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  return (
    <Sheet open onClose={onClose} label="Convidar">
      <div className="center">
        <h3 className="t-title">Convide os participantes</h3>
        <p className="t-sub mt4">Partilhe pelo WhatsApp, Instagram, TikTok, SMS… quem receber entra em "{group.name}".</p>
      </div>
      <div className="invite-preview mt16">
        <div className="ip-top">
          <GiftMark size={26} light />
          <span>Convite · <b>{group.code}</b></span>
        </div>
        <pre>{msg}</pre>
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <button className="btn" onClick={shareAll} disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : <><Share2 size={18} /> Partilhar convite</>}</button>
        <div className="row" style={{ gap: 10 }}>
          <a className="btn outline" style={{ textDecoration: 'none', color: '#128c4b' }} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <button className="btn outline" onClick={downloadImage}><ImageDown size={17} /> Imagem</button>
          <button className="btn outline" onClick={() => { navigator.clipboard?.writeText(msg); toast('Mensagem copiada.'); }}><Copy size={17} /> Copiar</button>
        </div>
        <button className="t-link center" onClick={() => { navigator.clipboard?.writeText(link); toast('Link copiado.'); }}>Copiar só o link</button>
      </div>
    </Sheet>
  );
}
