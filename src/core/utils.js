export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const clone = o => structuredClone(o);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

export function debounce(fn, ms){
  let t = null;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); };
  d.flush = (...a) => { if (t) { clearTimeout(t); t = null; fn(...a); } };
  return d;
}

/** localStorage que nunca lanza (modo privado, almacenamiento bloqueado, tests). */
export function safeStorage(store = globalThis.localStorage){
  return {
    get(k){ try { const v = store?.getItem(k); return v == null ? null : JSON.parse(v); } catch { return null; } },
    set(k,v){ try { store?.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    remove(k){ try { store?.removeItem(k); } catch {} },
    keys(){ try { return store ? Object.keys(store) : []; } catch { return []; } }
  };
}
