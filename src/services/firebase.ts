/**
 * Bilar DigitalTech Solutions — ligação ao Firebase (projeto jfb-amigo-secreto-pro-2026).
 * Estas chaves são a configuração PÚBLICA da app web: a segurança vem do ficheiro firestore.rules.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const app = initializeApp({
  apiKey: 'AIzaSyAIQPvGPnD5jVZ3Vn74BRfay53GfU39OII',
  authDomain: 'jfb-amigo-secreto-pro-2026.firebaseapp.com',
  projectId: 'jfb-amigo-secreto-pro-2026',
  storageBucket: 'jfb-amigo-secreto-pro-2026.firebasestorage.app',
  messagingSenderId: '383975348496',
  appId: '1:383975348496:web:27bdd9bd098480c8c5ad95',
});

export const auth = getAuth(app);

/** Cache offline + deteção de redes que bloqueiam WebSockets (comum em dados móveis). */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
});
