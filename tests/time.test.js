import { describe, it, expect } from "vitest";
import { toMin, minToStr, fmt, durTxt, weekKey, nowInfo, nextWeekKey } from "../src/core/time.js";

describe("tiempo", () => {
  it("convierte horas y minutos", () => {
    expect(toMin("08:30")).toBe(510);
    expect(minToStr(1470)).toBe("24:30");
    expect(fmt("24:30")).toBe("00:30");
    expect(durTxt(75)).toBe("1 h 15 min");
    expect(durTxt(0)).toBe("0 min");
  });
  it("calcula la semana ISO", () => {
    expect(weekKey(new Date(2026, 9, 13))).toBe("2026-S42");
    expect(weekKey(new Date(2026, 0, 1))).toBe("2026-S01");
    expect(nextWeekKey(nowInfo(new Date(2026, 9, 13, 10)))).toBe("2026-S43");
  });
  it("antes de las 00:30 sigue siendo el día anterior", () => {
    const i = nowInfo(new Date(2026, 9, 14, 0, 15)); // miércoles 00:15
    expect(i.day).toBe(1);                             // martes
    expect(i.min).toBe(1455);
  });
});
