const COLLECTIONS = new Set(["categories", "blocks", "goals", "tasks", "weeks", "routines"]);
export const MAX_CHANGES_PER_BATCH = 2000;

export const isNewer = (incoming, current) => !current ||
  incoming.updatedAt > current.updatedAt ||
  (incoming.updatedAt === current.updatedAt && String(incoming.deviceId ?? "") > String(current.deviceId ?? ""));

const isPlainObject = v => v !== null && typeof v === "object" && !Array.isArray(v);

/** Valida un lote y deja, por registro, solo la versión más nueva. Ignora entradas inválidas. */
export function normalizeChanges(payload) {
  const changes = Array.isArray(payload) ? payload : payload?.changes;
  if (!Array.isArray(changes)) return [];

  const latest = new Map();
  for (const change of changes.slice(0, MAX_CHANGES_PER_BATCH)) {
    const {col, rec} = isPlainObject(change) ? change : {};
    if (!COLLECTIONS.has(col) || !isPlainObject(rec) ||
        typeof rec.id !== "string" || !rec.id || rec.id.length > 200 ||
        !Number.isSafeInteger(rec.updatedAt)) continue;
    const deviceId = typeof rec.deviceId === "string" ? rec.deviceId.slice(0, 200) : "";
    const record = {...rec, deviceId};
    const key = `${col}\u0000${record.id}`;
    const current = latest.get(key);
    if (!current || isNewer(record, current.rec)) latest.set(key, {col, rec:record});
  }
  return [...latest.values()];
}
