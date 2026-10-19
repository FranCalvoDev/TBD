import { describe, it, expect } from "vitest";
import { normalizeServerUrl, loadServerConfig, saveServerConfig, clearServerConfig } from "../src/storage/serverConfig.js";
import { checkServer } from "../src/storage/remote.js";
import { memoryStorage } from "./helpers.js";

describe("dirección del servidor", () => {
  it("completa http en la red de casa y https con dominio", () => {
    expect(normalizeServerUrl(" 192.168.1.10:8787/ ")).toBe("http://192.168.1.10:8787");
    expect(normalizeServerUrl("localhost:8787")).toBe("http://localhost:8787");
    expect(normalizeServerUrl("nas.local:8787")).toBe("http://nas.local:8787");
    expect(normalizeServerUrl("100.101.102.103:8787")).toBe("http://100.101.102.103:8787"); // Tailscale
    expect(normalizeServerUrl("tbd.midominio.com")).toBe("https://tbd.midominio.com");
    expect(normalizeServerUrl("http://tbd.midominio.com//")).toBe("http://tbd.midominio.com");
    expect(normalizeServerUrl("")).toBe("");
  });
  it("guarda la configuración solo en el dispositivo", () => {
    const s = memoryStorage();
    expect(loadServerConfig(s)).toBeNull();
    saveServerConfig(s, {url:"http://x:8787", token:"tbd_abc", name:"Ana"});
    expect(loadServerConfig(s)).toEqual({url:"http://x:8787", token:"tbd_abc", name:"Ana"});
    clearServerConfig(s);
    expect(loadServerConfig(s)).toBeNull();
  });
});

describe("probar la conexión", () => {
  const res = (status, body) => ({status, ok:status < 300, json:async () => body});
  it("devuelve el nombre de la persona y manda la clave", async () => {
    let seen;
    const me = await checkServer({baseUrl:"http://x:8787/", token:"tbd_abc", fetchImpl:async (url, init) => { seen = [url, init.headers.Authorization]; return res(200, {name:"Ana"}); }});
    expect(me.name).toBe("Ana");
    expect(seen).toEqual(["http://x:8787/me", "Bearer tbd_abc"]);
  });
  it("explica cada error", async () => {
    await expect(checkServer({baseUrl:"http://x", token:"t", fetchImpl:async () => res(401)})).rejects.toThrow("clave de acceso no es válida");
    await expect(checkServer({baseUrl:"http://x", token:"t", fetchImpl:async () => { throw new TypeError("Failed to fetch"); }})).rejects.toThrow("No se pudo conectar");
    await expect(checkServer({baseUrl:"http://x", token:"t", fetchImpl:async () => res(404)})).rejects.toThrow("¿Es un servidor TBD?");
    await expect(checkServer({baseUrl:"http://x", token:"t", fetchImpl:async () => res(200, {otra:"cosa"})})).rejects.toThrow("no parece un servidor TBD");
  });
});
