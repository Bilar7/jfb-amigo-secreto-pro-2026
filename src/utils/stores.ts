import type { WishCategory } from '../types';

/** Lojas reais em Moçambique (sites verificados em outubro de 2026). */
export interface Store {
  name: string;
  url: string;
  desc: string;
  cats: WishCategory[];
  emoji: string;
  color: string;
}

export const STORES: Store[] = [
  { name: 'Shopping Mz', url: 'https://shoppingmz.co.mz/', desc: 'Telemóveis, portáteis, TVs, áudio e perfumes. Maputo.', cats: ['Tecnologia', 'Beleza'], emoji: '📱', color: '#1f4fbf' },
  { name: 'Perfect Price', url: 'https://perfectprice.co.mz/', desc: 'Electrónicos, consolas, informática e electrodomésticos.', cats: ['Tecnologia', 'Casa'], emoji: '🎧', color: '#0f766e' },
  { name: 'Lojas Smile', url: 'https://lojassmile.com/', desc: 'Mobília (sala, quarto, cozinha, escritório) e electrodomésticos. Maputo e Matola.', cats: ['Casa'], emoji: '🛋️', color: '#b45309' },
  { name: 'Académica', url: 'https://www.academica.co.mz/', desc: 'Material escolar e de escritório, livros e livraria.', cats: ['Escola'], emoji: '📚', color: '#7c3aed' },
  { name: 'Bazara', url: 'https://bazara.co.mz/', desc: 'Marketplace da Vodacom: papelaria, livros, roupa, casa, bebé, electrónicos. Paga com M-Pesa.', cats: ['Escola', 'Moda', 'Casa', 'Tecnologia'], emoji: '🛍️', color: '#e11d48' },
  { name: 'Perfumes Market', url: 'https://www.perfumesmarket.co.mz/', desc: 'Perfumes originais para homem e mulher e coffrets de oferta.', cats: ['Beleza'], emoji: '🌸', color: '#be185d' },
  { name: 'Krolyc', url: 'https://krolyc.co.mz/', desc: 'Moda, beleza, casa e electrónicos. Entrega grátis em Maputo e Matola.', cats: ['Moda', 'Beleza', 'Casa'], emoji: '👗', color: '#0369a1' },
  { name: 'LojaRápida', url: 'https://lojarapidamz.com/', desc: 'Marketplace moçambicano: moda, acessórios, beleza, móveis e livros.', cats: ['Moda', 'Beleza', 'Casa', 'Escola'], emoji: '⚡', color: '#15803d' },
];

export const storeName = (url: string): string => {
  const s = STORES.find((x) => url && url.startsWith(x.url.replace(/\/$/, '')));
  if (s) return s.name;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
