/** Arranque de TESTE com dados locais (sem Firebase). Não é usado na versão publicada. */
import { createRoot } from 'react-dom/client';
import { setBackend } from './services/backend';
import { mockBackend } from './services/mockBackend';
import App from './App';
import './styles.css';

setBackend(mockBackend);
createRoot(document.getElementById('root')!).render(<App />);
