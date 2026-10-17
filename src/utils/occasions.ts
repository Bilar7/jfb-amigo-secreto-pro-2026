import type { Group, OccasionKey } from '../types';

export const OCCASIONS: { key: OccasionKey; label: string; short: string }[] = [
  { key: 'amigos', label: 'Amigos & Família', short: 'Amigos & Família' },
  { key: 'empresa', label: 'Empresa & Trabalho', short: 'Empresa & Trabalho' },
  { key: 'aniversario', label: 'Aniversário', short: 'Aniversário' },
  { key: 'fim_ano', label: 'Fim de Ano & Réveillon', short: 'Fim de Ano & Réveillon' },
  { key: 'festas', label: 'Natal & Festas', short: 'Natal & Festas' },
  { key: 'outra', label: 'Outra ocasião', short: 'Outra (escrever)' },
];

export function occasionText(g: Pick<Group, 'occasion' | 'occasionLabel'>): string {
  if (g.occasion === 'outra') return g.occasionLabel || 'Encontro';
  return OCCASIONS.find((o) => o.key === g.occasion)?.label || 'Amigo Secreto';
}

const PHOTO: Record<OccasionKey, string> = {
  amigos: 'photos/t1.jpg',
  empresa: 'photos/t2.jpg',
  aniversario: 'photos/t3.jpg',
  fim_ano: 'photos/t3.jpg',
  festas: 'photos/t3.jpg',
  outra: 'photos/t1.jpg',
};

export const groupPhoto = (g: Pick<Group, 'occasion'> & Partial<Pick<Group, 'coverImage'>>) => g.coverImage || PHOTO[g.occasion] || PHOTO.amigos;
