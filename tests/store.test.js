import { describe, it, expect } from "vitest";
import { createStore, isNewer } from "../src/state/store.js";

describe("store", () => {
  it("marca versión y dispositivo en cada escritura", () => {
    const s = createStore({deviceId:"a"});
    s.put("tasks", {id:"t1", title:"x"});
    const r = s.get("tasks", "t1");
    expect(r.deviceId).toBe("a");
    expect(r.updatedAt).toBeGreaterThan(0);
    s.put("tasks", {...r, title:"y"});
    expect(s.get("tasks", "t1").updatedAt).toBeGreaterThan(r.updatedAt);
  });
  it("borrar deja una lápida que viaja como cambio", () => {
    const s = createStore({deviceId:"a"}), seen = [];
    s.subscribe(e => seen.push(e));
    s.put("tasks", {id:"t1"}); s.remove("tasks", "t1");
    expect(s.get("tasks", "t1")).toBeUndefined();
    expect(s.list("tasks")).toHaveLength(0);
    expect(seen[1].changes[0].rec).toMatchObject({id:"t1", deleted:true});
  });
  it("al mezclar gana el registro más nuevo", () => {
    const s = createStore({deviceId:"a"});
    s.merge([{col:"tasks", rec:{id:"t1", title:"vieja", updatedAt:10, deviceId:"b"}}]);
    s.merge([{col:"tasks", rec:{id:"t1", title:"más vieja", updatedAt:5, deviceId:"b"}}]);
    expect(s.get("tasks", "t1").title).toBe("vieja");
    s.merge([{col:"tasks", rec:{id:"t1", title:"nueva", updatedAt:20, deviceId:"c"}}]);
    expect(s.get("tasks", "t1").title).toBe("nueva");
  });
  it("una edición local siempre supera a la versión que tenía, aunque el reloj vaya atrasado", () => {
    const s = createStore({deviceId:"a"}), future = Date.now() + 1e9;
    s.merge([{col:"tasks", rec:{id:"t1", updatedAt:future, deviceId:"b"}}]);
    s.put("tasks", {...s.get("tasks", "t1"), title:"local"});
    expect(s.get("tasks", "t1").updatedAt).toBe(future + 1);
  });
  it("desempata por dispositivo", () => {
    expect(isNewer({updatedAt:1, deviceId:"b"}, {updatedAt:1, deviceId:"a"})).toBe(true);
    expect(isNewer({updatedAt:1, deviceId:"a"}, {updatedAt:1, deviceId:"b"})).toBe(false);
  });
});
