import { describe, expect, it } from "vitest";
import { isNewer, normalizeChanges } from "../selfhost/db.js";

describe("documentos MongoDB de sincronización", () => {
  it("mantiene la regla de conflicto por updatedAt y deviceId", () => {
    expect(isNewer({updatedAt:2, deviceId:"a"}, {updatedAt:1, deviceId:"z"})).toBe(true);
    expect(isNewer({updatedAt:2, deviceId:"b"}, {updatedAt:2, deviceId:"a"})).toBe(true);
    expect(isNewer({updatedAt:2, deviceId:"a"}, {updatedAt:2, deviceId:"a"})).toBe(false);
  });

  it("normaliza lotes, conserva la versión más nueva por registro e ignora datos no válidos", () => {
    const result = normalizeChanges({changes:[
      {col:"tasks", rec:{id:"t1", title:"viejo", updatedAt:1, deviceId:"phone"}},
      {col:"tasks", rec:{id:"t1", title:"nuevo", updatedAt:2, deviceId:"phone"}},
      {col:"unknown", rec:{id:"x", updatedAt:3}},
      {col:"weeks", rec:{id:"w1", updatedAt:"3"}},
      {col:"blocks", rec:{id:"b1", updatedAt:3}}
    ]});
    expect(result).toEqual([
      {col:"tasks", rec:{id:"t1", title:"nuevo", updatedAt:2, deviceId:"phone"}},
      {col:"blocks", rec:{id:"b1", updatedAt:3, deviceId:""}}
    ]);
  });
});
