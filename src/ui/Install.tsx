import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';
import { pwa } from '../utils/pwa';
import { GiftMark, toast } from './kit';

const KEY = 'bilar_install_later';
const later = () => {
  try {
    return Number(sessionStorage.getItem(KEY) || 0) > 0;
  } catch {
    return false;
  }
};

/**
 * Aviso automático "Instalar no ecrã principal": aparece sozinho em baixo assim que o
 * navegador permite instalar (Android, Chrome/Edge no PC). Um toque em "Instalar" e pronto.
 * No iPhone (Safari não tem botão de instalar) mostra uma única linha com o gesto.
 */
export function InstallPrompt() {
  const [, force] = useState(0);
  const [closed, setClosed] = useState(later);
  const [iosReady, setIosReady] = useState(false);
  useEffect(() => {
    const off = pwa.subscribe(() => force((n) => n + 1));
    const t = setTimeout(() => setIosReady(true), 4000);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  if (closed || pwa.isStandalone()) return null;
  const ios = pwa.isIOS() && !pwa.canPrompt();
  if (!pwa.canPrompt() && !(ios && iosReady)) return null;

  const close = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* */
    }
  };
  const install = async () => {
    const ok = await pwa.install();
    if (ok) toast('Bilar instalado no ecrã principal! 🎁');
    close();
  };

  return (
    <div className="install-pop" role="dialog" aria-label="Instalar a app">
      <span className="ip-icon"><GiftMark size={34} /></span>
      <div className="grow" style={{ minWidth: 0 }}>
        <b>Instalar Bilar no ecrã principal</b>
        {ios ? (
          <p>Toque em <Share size={12} style={{ verticalAlign: -1 }} /> e depois em "Adicionar ao ecrã principal".</p>
        ) : (
          <p>Abre num toque, como uma app.</p>
        )}
      </div>
      {!ios && <button className="btn sm" onClick={install}>Instalar</button>}
      <button className="ip-x" onClick={close} aria-label="Agora não"><X size={16} /></button>
    </div>
  );
}
