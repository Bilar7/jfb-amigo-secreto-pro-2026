import type { WishCategory } from '../types';

/** Lojas reais em Moçambique (sites verificados em outubro de 2026). */
export interface Store {
  name: string;
  url: string;
  productName: string;
  productUrl: string;
  productAction: string;
  imageUrl: string;
  cats: WishCategory[];
}

export const STORES: Store[] = [
  { name: 'Shopping Mz', url: 'https://shoppingmz.co.mz/', productName: 'Perfume Gabriel Angel Galã', productUrl: 'https://shoppingmz.co.mz/product_page?category=Perfumes', productAction: 'Ver perfumes', imageUrl: 'https://shoppingmz.co.mz/images/products/optimized/IMG_2034_JPG__1__1788161146_89d5c2c0.jpg', cats: ['Beleza'] },
  { name: 'Perfect Price', url: 'https://perfectprice.co.mz/', productName: 'Samsung Galaxy Watch Ultra | 44mm', productUrl: 'https://perfectprice.co.mz/producto-2296', productAction: 'Ver produto', imageUrl: 'https://perfectprice.co.mz/assets/uploads/product-featured-2296.png', cats: ['Tecnologia'] },
  { name: 'Lojas Smile', url: 'https://lojassmile.com/', productName: 'Bengaleiro DAJLIEN Branco 139', productUrl: 'https://lojassmile.com/produto/bengaleiro-dajlien-branco-139/', productAction: 'Ver produto', imageUrl: 'https://lojassmile.com/wp-content/uploads/2025/01/WhatsApp-Image-2025-01-17-at-12.40.00.jpeg', cats: ['Casa'] },
  { name: 'Académica', url: 'https://www.academica.co.mz/', productName: 'Caderno Pautado Counter Book A4', productUrl: 'https://www.academica.co.mz/produto/caderno-pautado-counter-book-capa-dura-a4-192-paginas/', productAction: 'Ver produto', imageUrl: 'https://www.academica.co.mz/wp-content/uploads/2025/04/a4s.jpg', cats: ['Escola'] },
  { name: 'Bazara', url: 'https://bazara.co.mz/', productName: 'Adaptador Haysenser USB-C 8 em 1', productUrl: 'https://bazara.co.mz/iac0026-adaptador-8-in-1-haysenser-usb-c-multi-portas-hub', productAction: 'Ver produto', imageUrl: 'https://bazara.co.mz/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/8/p/8ports.jpg', cats: ['Tecnologia'] },
  { name: 'Perfumes Market', url: 'https://www.perfumesmarket.co.mz/', productName: 'Armaf Miss Voce Viva EDP Feminino', productUrl: 'https://www.perfumesmarket.co.mz/products/armaf-miss-voce-viva-edp-femenino', productAction: 'Ver produto', imageUrl: 'https://cdn.shopify.com/s/files/1/1246/5441/files/ArmafMissVoceVivaEDPFemenino.webp?v=1775838731', cats: ['Beleza'] },
  { name: 'Krolyc', url: 'https://krolyc.co.mz/', productName: 'Yardley Roll-On Gorgeous In Cashmere 50ml', productUrl: 'https://krolyc.co.mz/loja/beleza-e-cuidados-pessoais/fragrancias-desodorizantes/femininos/yardley-roll-on-gorgeous-in-cashmere-50ml/', productAction: 'Ver produto', imageUrl: 'https://krolyc.co.mz/wp-content/uploads/2024/10/YAR7018.jpg', cats: ['Beleza'] },
  { name: 'LojaRápida', url: 'https://lojarapidamz.com/', productName: 'Brincos dourados com borboleta e correntes', productUrl: 'https://lojarapidamz.com/produto/6ee74960-f1f6-42da-b7d1-9bff48872f90', productAction: 'Ver produto', imageUrl: 'https://bpzqdwpkwlwflrcwcrqp.supabase.co/storage/v1/object/public/product-images/products/19d83c6d-3077-47db-9bf3-f6f7f6e98c21_1791808939872.png', cats: ['Moda'] },
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
