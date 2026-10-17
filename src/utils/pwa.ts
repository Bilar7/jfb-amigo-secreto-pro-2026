/** Guarda o evento de instalação do navegador para o botão "Instalar" nas Definições. */
let deferred: any = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    deferred = e;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const pwa = {
  canPrompt: () => !!deferred,
  isStandalone: () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true),
  isIOS: () => /iphone|ipad|ipod/i.test(navigator.userAgent),
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async install(): Promise<boolean> {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    listeners.forEach((l) => l());
    return outcome === 'accepted';
  },
};
