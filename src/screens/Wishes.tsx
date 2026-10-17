import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, ExternalLink, Gift, Heart, ImagePlus, Link2, Loader2, Plus, Tag, Trash2, Wallet } from 'lucide-react';
import { backend } from '../services/backend';
import { friendlyError } from '../services/errors';
import { wishlistImageFromFile } from '../services/media';
import type { WishCategory, WishItem } from '../types';
import { useApp } from '../state';
import { Empty, Field, Sheet, bg, confirmDialog, cx, toast } from '../ui/kit';
import { formatMoney } from '../utils/format';
import { STORES, storeName } from '../utils/stores';

const CATS: WishCategory[] = ['Tecnologia', 'Moda', 'Casa', 'Beleza', 'Escola', 'Outros'];
const STORE_CATS: WishCategory[] = ['Tecnologia', 'Moda', 'Casa', 'Beleza', 'Escola'];

export function WishesScreen({ ownerId, ownerName }: { ownerId?: string; ownerName?: string }) {
  const { user, myWishes, depth, back } = useApp();
  const mine = !ownerId || ownerId === user.id;
  const [theirs, setTheirs] = useState<WishItem[] | null>(null);
  const [cat, setCat] = useState<'Todos' | WishCategory>('Todos');
  const [edit, setEdit] = useState<WishItem | 'new' | { storeUrl: string; category: WishCategory; title: string; imageUrl: string } | null>(null);
  const [mode, setMode] = useState<'lista' | 'lojas'>('lista');
  const [view, setView] = useState<WishItem | null>(null);

  useEffect(() => {
    if (mine || !ownerId) return;
    return backend.watchWishlist(ownerId, setTheirs);
  }, [mine, ownerId]);

  const items = mine ? myWishes : theirs || [];
  const shown = cat === 'Todos' ? items : items.filter((i) => i.category === cat);

  const toggleFav = (w: WishItem) => {
    if (!mine) return;
    backend.saveWish({ ...w, favorite: !w.favorite }).catch((e) => toast(friendlyError(e), 'error'));
  };

  return (
    <>
      <header className="topbar" style={{ paddingLeft: depth > 1 ? 12 : 20 }}>
        {depth > 1 && <button className="icon-btn" onClick={back} aria-label="Voltar"><ArrowLeft size={22} /></button>}
        <h1 className="grow truncate">{mine ? 'Lista de Desejos' : `Desejos de ${ownerName?.split(' ')[0] || 'amigo'}`}</h1>
        {mine && <button className="btn sm" onClick={() => setEdit('new')}><Plus size={17} /> Adicionar</button>}
      </header>
      <div className="pad mb12">
        <div className="seg">
          <button className={cx(mode === 'lista' && 'on')} onClick={() => setMode('lista')}>{mine ? 'Os meus desejos' : 'Desejos'}</button>
          <button className={cx(mode === 'lojas' && 'on')} onClick={() => setMode('lojas')}>Lojas</button>
        </div>
      </div>
      <div className="chips mb8" role="tablist">
        {(['Todos', ...(mode === 'lojas' ? STORE_CATS : CATS)] as const).map((c) => (
          <button key={c} className={cx('chip', cat === c && 'on')} onClick={() => setCat(c)} role="tab" aria-selected={cat === c}>{c}</button>
        ))}
      </div>
      <div className="scroll">
        {mode === 'lojas' ? (
          <div style={{ padding: '4px 16px 24px' }}>
            <p className="t-sub mb12" style={{ padding: '0 4px' }}>Produtos publicados nas lojas. Preço e disponibilidade são confirmados no site de cada vendedor.</p>
            <div className="store-grid">
              {STORES.filter((s) => cat === 'Todos' || s.cats.includes(cat)).map((s) => (
                <div key={s.url} className="store-card">
                  <a className="store-image-link" href={s.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${s.productName} na ${s.name}`}>
                    <img className="store-product-image" src={s.imageUrl} alt={s.productName} loading="lazy" onError={(e) => e.currentTarget.remove()} />
                  </a>
                  <div className="store-content">
                    <p className="store-name">{s.name}</p>
                    <h4>{s.productName}</h4>
                    <p className="store-desc">Preço e estoque no site oficial.</p>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{s.cats.map((c) => <span key={c} className="tag">{c}</span>)}</div>
                    <div className="row store-actions" style={{ gap: 8 }}>
                      <a className="btn sm" style={{ flex: 1, textDecoration: 'none' }} href={s.productUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> {s.productAction}</a>
                      <a className="btn sm outline" style={{ flex: 1, textDecoration: 'none' }} href={s.url} target="_blank" rel="noopener noreferrer">Visitar loja</a>
                      {mine && <button className="btn sm outline" style={{ flex: 1 }} onClick={() => setEdit({ storeUrl: s.productUrl, category: cat !== 'Todos' && s.cats.includes(cat) ? cat : s.cats[0], title: s.productName, imageUrl: s.imageUrl })}><Plus size={15} /> Desejo</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !mine && theirs === null ? (
          <div className="center" style={{ padding: 40 }}><Loader2 className="spin" color="#157a4f" /></div>
        ) : shown.length === 0 ? (
          <Empty
            icon={Gift}
            title={items.length === 0 ? (mine ? 'A sua lista está vazia' : 'Ainda sem desejos') : 'Nada nesta categoria'}
            text={items.length === 0 ? (mine ? 'Adicione o que gostaria de receber: assim o seu amigo secreto acerta no presente.' : 'Esta pessoa ainda não adicionou desejos. Pode perguntar-lhe no chat anónimo!') : undefined}
          >
            {mine && items.length === 0 && <button className="btn sm" onClick={() => setEdit('new')}><Plus size={17} /> Adicionar desejo</button>}
          </Empty>
        ) : (
          <div className="wish-grid">
            {shown.map((w) => (
              <div key={w.id} className="wish">
                <div className={cx('img', w.imageUrl && w.imageUrl.startsWith('data:image/jpeg') && 'cover')} style={w.imageUrl ? bg(w.imageUrl) : undefined}>
                  <button style={{ position: 'absolute', inset: 0 }} onClick={() => (mine ? setEdit(w) : setView(w))} aria-label={w.title} />
                  {!w.imageUrl && <Gift size={38} />}
                  <button className="heart" style={{ background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.08)' }} onClick={() => toggleFav(w)} aria-label={w.favorite ? 'Favorito' : 'Marcar como favorito'} disabled={!mine}>
                    <Heart size={15} fill={w.favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="body">
                  <h4 className="truncate">{w.title}</h4>
                  <span className="price">{w.price ? formatMoney(w.price, w.currency) : 'Preço livre'}</span>
                  {w.storeUrl ? (
                    <a className="store" href={w.storeUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> Ver na {storeName(w.storeUrl) || 'loja'}</a>
                  ) : (
                    <span className="store" style={{ color: '#9aa8a0' }}>{w.category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {edit && (
        <WishEditor
          item={edit === 'new' || !('id' in edit) ? null : edit}
          defaultCat={edit !== 'new' && !('id' in edit) ? edit.category : cat === 'Todos' ? 'Tecnologia' : cat}
          defaultStore={edit !== 'new' && !('id' in edit) ? edit.storeUrl : ''}
          defaultTitle={edit !== 'new' && !('id' in edit) ? edit.title : ''}
          defaultImage={edit !== 'new' && !('id' in edit) ? edit.imageUrl : ''}
          onClose={() => { if (edit !== 'new' && !('id' in edit)) setMode('lista'); setEdit(null); }}
        />
      )}
      <Sheet open={!!view} onClose={() => setView(null)} label={view?.title}>
        {view && (
          <div>
            {view.imageUrl && <div style={{ ...bg(view.imageUrl), height: 220, borderRadius: 14, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: '#f6f8f7' }} />}
            <h3 className="t-h2 mt12">{view.title}</h3>
            <p className="price" style={{ color: '#0f5a3b', fontWeight: 700, marginTop: 4 }}>{view.price ? formatMoney(view.price, view.currency) : 'Preço livre'}</p>
            <p className="t-small mt4">{view.category}{view.favorite ? ' · ❤️ Favorito' : ''}</p>
            {view.storeUrl && <a className="btn mt16" href={view.storeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><ExternalLink size={17} /> Ver na {storeName(view.storeUrl) || 'loja'}</a>}
          </div>
        )}
      </Sheet>
    </>
  );
}

function WishEditor({ item, defaultCat, defaultStore = '', defaultTitle = '', defaultImage = '', onClose }: { item: WishItem | null; defaultCat: WishCategory; defaultStore?: string; defaultTitle?: string; defaultImage?: string; onClose: () => void }) {
  const { user } = useApp();
  const [title, setTitle] = useState(item?.title || defaultTitle);
  const [price, setPrice] = useState(item?.price ? String(item.price) : '');
  const [category, setCategory] = useState<WishCategory>(item?.category || defaultCat);
  const [storeUrl, setStoreUrl] = useState(item?.storeUrl || defaultStore);
  const [img, setImg] = useState(item?.imageUrl || defaultImage);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setImg(await wishlistImageFromFile(f));
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };

  const save = async () => {
    if (title.trim().length < 2) return toast('Escreva o nome do presente.', 'error');
    let url = storeUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    setBusy(true);
    try {
      await backend.saveWish({
        id: item?.id || `${user.id}_${Date.now().toString(36)}`,
        userId: user.id,
        title: title.trim(),
        price: Number(price) || 0,
        currency: 'MZN',
        category,
        imageUrl: img,
        storeUrl: url,
        favorite: item?.favorite || false,
        createdAt: item?.createdAt || Date.now(),
      });
      toast(item ? 'Desejo atualizado.' : 'Desejo adicionado. 🎁');
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!item) return;
    const ok = await confirmDialog({ title: 'Apagar este desejo?', confirm: 'Apagar', danger: true });
    if (!ok) return;
    await backend.deleteWish(item.id).catch((e) => toast(friendlyError(e), 'error'));
    onClose();
  };

  return (
    <Sheet open onClose={onClose} label="Desejo">
      <h3 className="t-title">{item ? 'Editar desejo' : 'Novo desejo'}</h3>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt12"
        style={{ width: '100%', height: 150, borderRadius: 14, border: '1.5px dashed #cfe8d9', background: img ? `#f6f8f7 center / contain no-repeat url("${img}")` : '#f2f9f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f5a3b', gap: 8, fontSize: 13, fontWeight: 500 }}
      >
        {!img && (<><ImagePlus size={22} /> Adicionar foto</>)}
        {img && <span style={{ background: 'rgba(255,255,255,.9)', padding: '6px 10px', borderRadius: 10, display: 'flex', gap: 6, alignItems: 'center', alignSelf: 'flex-end', marginBottom: 8 }}><Camera size={15} /> Trocar foto</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      <Field className="mt12" icon={Tag} placeholder="O que gostaria de receber?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} />
      <Field className="mt12" icon={Wallet} placeholder="Preço aproximado (MZN)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
      <Field className="mt12" icon={Link2} placeholder="Link do produto na loja (opcional)" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} inputMode="url" />
      <p className="t-small mt8">Escolha uma loja ou cole o link do produto que viu no site:</p>
      <div className="chips" style={{ padding: '6px 0 2px' }}>
        {STORES.map((st) => (
          <button key={st.url} type="button" className={cx('chip', storeUrl.startsWith(st.url.replace(/\/$/, '')) && 'on')} onClick={() => setStoreUrl(st.url)}>
            {st.name}
          </button>
        ))}
      </div>
      <div className="chips mt12" style={{ padding: '2px 0 4px', flexWrap: 'wrap' }}>
        {CATS.map((c) => (
          <button key={c} type="button" className={cx('chip', category === c && 'on')} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      <div className="row mt20">
        {item && <button className="btn danger" style={{ width: 56, flexShrink: 0 }} onClick={remove} aria-label="Apagar"><Trash2 size={18} /></button>}
        <button className="btn" onClick={save} disabled={busy}>{busy ? <Loader2 size={20} className="spin" /> : 'Guardar'}</button>
      </div>
    </Sheet>
  );
}
