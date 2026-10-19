// Servidor de sincronización configurado en este dispositivo (dirección, clave y nombre).
// Es una preferencia local: no se sincroniza ni entra en las copias de seguridad.
import { KEYS } from "./keys.js";

/** Completa y limpia la dirección: sin barra final y con http(s):// si falta. */
export function normalizeServerUrl(input){
  let url = String(input || "").trim().replace(/\/+$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    // En la red de casa (IP, localhost, .local) lo normal es http; con dominio, https.
    const host = url.split(/[/:]/)[0];
    const local = /^(localhost|\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:]+\])$/i.test(host) || /\.(local|lan|home|internal)$/i.test(host) || /^100\.\d+\.\d+\.\d+$/.test(host);
    url = (local ? "http://" : "https://") + url;
  }
  return url;
}

export const loadServerConfig = storage => {
  const c = storage.get(KEYS.server);
  return c?.url && c?.token ? c : null;
};
export const saveServerConfig = (storage, config) => storage.set(KEYS.server, config);
export const clearServerConfig = storage => storage.remove(KEYS.server);
