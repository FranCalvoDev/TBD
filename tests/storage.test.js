import { describe, it, expect, vi, afterEach } from "vitest";
import { createLocalAdapter } from "../src/storage/localAdapter.js";
import { createSyncEngine } from "../src/storage/syncEngine.js";
import { createMemoryRemote } from "../src/storage/memoryRemote.js";
import { createHttpRemote } from "../src/storage/remote.js";
import { KEYS } from "../src/storage/keys.js";
import { memoryStorage, makeApp } from "./helpers.js";

describe("guardado local y migración", () => {
  it("migra los datos del artefacto original (v2)", () => {
    const storage = memoryStorage();
    storage.set(KEYS.legacyV2, {
      config:{v:1, blocks:[{id:"d0b0", day:0, s:"08:30", e:"09:00", cat:"rutina", title:"Mañana", p:"", l:[]}], goals:[{id:"gym", label:"Gym", cat:"gym", target:4}]},
      weeks:{"2026-S41":{type:"week", week:"2026-S41", label:"5/10", done:{d0b0:{cat:"rutina", min:30, day:0}}, goals:{gym:3}, planned:{count:1}}},
      tasks:{type:"tasks", items:[{id:"t1", title:"Trámite", est:30, cat:"personal", done:false}]}
    });
    const recs = createLocalAdapter(storage).load();
    expect(recs.weeks[0]).toMatchObject({id:"2026-S41", goals:{gym:3}, off:{}});
    expect(recs.weeks[0].type).toBeUndefined();
    expect(recs.goals[0]).toMatchObject({id:"gym", order:0});
    expect(recs.tasks[0].title).toBe("Trámite");
  });
  it("guarda y vuelve a leer, y conserva el id del dispositivo", () => {
    const storage = memoryStorage(), local = createLocalAdapter(storage);
    const id = local.deviceId();
    expect(createLocalAdapter(storage).deviceId()).toBe(id);
    const {store} = makeApp(id);
    local.save(store.snapshot());
    expect(local.load().blocks).toHaveLength(49);
  });
});

describe("sincronización entre dispositivos", () => {
  const engines = [];
  afterEach(() => engines.splice(0).forEach(e => e.stop()));
  function device(name, remote){
    const app = makeApp(name), storage = memoryStorage(), statuses = [];
    const sync = createSyncEngine({store:app.store, remote, storage, pushDelayMs:1e9, onStatus:s => statuses.push(s)});
    engines.push(sync);
    return {...app, sync, storage, statuses};
  }

  it("lo que se crea en un dispositivo aparece en el otro", async () => {
    const remote = createMemoryRemote(), a = device("a", remote), b = device("b", remote);
    await a.sync.sync(); await b.sync.sync();
    const id = a.act.saveTask({title:"Llamar al banco", est:15, cat:"personal", due:""});
    a.act.bumpGoal("gym", 1);
    await a.sync.sync(); await b.sync.sync();
    expect(b.sel.task(id).title).toBe("Llamar al banco");
    expect(b.sel.curWeek().goals.gym).toBe(1);
    expect(a.sync.pending()).toBe(0);
  });

  it("los borrados se propagan", async () => {
    const remote = createMemoryRemote(), a = device("a", remote), b = device("b", remote);
    const id = a.act.saveTask({title:"x", est:15, cat:"personal", due:""});
    await a.sync.sync(); await b.sync.sync();
    b.act.deleteTask(id);
    await b.sync.sync(); await a.sync.sync();
    expect(a.sel.task(id)).toBeUndefined();
  });

  it("si dos dispositivos editan lo mismo, queda la última edición", async () => {
    const remote = createMemoryRemote(), a = device("a", remote), b = device("b", remote);
    const id = a.act.saveTask({title:"original", est:15, cat:"personal", due:""});
    await a.sync.sync(); await b.sync.sync();
    a.act.saveTask({title:"desde A", est:15, cat:"personal", due:""}, id);
    await new Promise(r => setTimeout(r, 5));
    b.act.saveTask({title:"desde B", est:15, cat:"personal", due:""}, id);
    await a.sync.sync(); await b.sync.sync(); await a.sync.sync();
    expect(a.sel.task(id).title).toBe("desde B");
    expect(b.sel.task(id).title).toBe("desde B");
  });

  it("un dispositivo nuevo recibe los datos reales en vez de la semana tipo por defecto", async () => {
    const remote = createMemoryRemote(), a = device("a", remote);
    a.act.saveBlock({day:0, cat:"rutina", title:"Mañana distinta", s:"08:30", e:"09:00", p:"", l:[]}, "d0b0");
    await a.sync.sync();
    const b = device("b", remote);
    await b.sync.sync();
    expect(b.sel.block("d0b0").title).toBe("Mañana distinta");
  });

  it("sin conexión guarda la cola y la sube al volver", async () => {
    vi.useFakeTimers();
    try {
      const remote = createMemoryRemote(), realPush = remote.push;
      remote.push = vi.fn().mockRejectedValue(new Error("sin red"));
      const a = device("a", remote);
      a.act.saveTask({title:"offline", est:15, cat:"personal", due:""});
      await a.sync.sync();
      expect(a.statuses.at(-1)).toBe("error");
      expect(a.sync.pending()).toBeGreaterThan(0);
      remote.push = realPush;
      await vi.advanceTimersByTimeAsync(2100); // primer reintento a los 2 s
      expect(a.statuses.at(-1)).toBe("synced");
      expect(a.sync.pending()).toBe(0);
      expect([...remote.rows.values()].some(r => r.rec.title === "offline")).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});

describe("remoto HTTP", () => {
  it("usa GET/POST /changes con token", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => { calls.push([url, init]); return {ok:true, status:200, json:async () => ({changes:[], cursor:7})}; };
    const r = createHttpRemote({baseUrl:"https://api.ejemplo.com/v1/", getToken:async () => "abc", fetchImpl});
    expect(await r.pull(3)).toEqual({changes:[], cursor:7});
    await r.push([{col:"tasks", rec:{id:"t1"}}]);
    expect(calls[0][0]).toBe("https://api.ejemplo.com/v1/changes?since=3");
    expect(calls[0][1].headers.Authorization).toBe("Bearer abc");
    expect(calls[1][1].method).toBe("POST");
    expect(JSON.parse(calls[1][1].body).changes[0].rec.id).toBe("t1");
  });
});
