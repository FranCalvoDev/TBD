// Convierte formatos anteriores al formato de registros (schema 3).
import { LEGACY } from "./keys.js";

const MIGRATED = {updatedAt:2, deviceId:"migrado"};

/**
 * Versión 2 (el artefacto original): {config:{blocks, goals}, weeks:{[semana]: {...}}, tasks:{items}}.
 * Las semanas pasan a tener id = clave de semana ("2026-S42").
 */
export function fromV2(v2){
  const out = {blocks:[], goals:[], tasks:[], weeks:[]};
  (v2?.config?.blocks || []).forEach(b => out.blocks.push({...b, ...MIGRATED}));
  (v2?.config?.goals || []).forEach((g, i) => out.goals.push({...g, order:i, ...MIGRATED}));
  Object.values(v2?.weeks || {}).forEach(w => {
    if (!w?.week) return;
    const {type, week, ...rest} = w;
    out.weeks.push({id:week, done:{}, off:{}, goals:{}, ...rest, ...MIGRATED});
  });
  (v2?.tasks?.items || []).forEach(t => out.tasks.push({...t, ...MIGRATED}));
  return out;
}

// Categorías fijas de las versiones anteriores, para quien ya tenía datos.
const LEGACY_CATEGORIES = [
  ["trabajo","Trabajo","c1"], ["proyectos","Proyectos","c2"], ["estudio","Estudio","c3"], ["gym","Ejercicio","c4"],
  ["contenido","Contenido","c5"], ["social","Social","c6"], ["personal","Personal","c7"], ["rutina","Rutina","c8"]
];

/** Si los datos no tienen categorías (versiones anteriores), crea las que usan sus bloques, tareas y metas. */
export function ensureCategories(records){
  if (!records || records.categories?.length) return records;
  const used = new Set([...(records.blocks || []), ...(records.tasks || []), ...(records.goals || [])].map(x => x.cat).filter(Boolean));
  const categories = LEGACY_CATEGORIES.filter(([id]) => used.has(id))
    .map(([id, name, color], order) => ({id, name, color, order, ...MIGRATED}));
  return {...records, categories};
}

/** Busca datos de versiones anteriores en este navegador. */
export function migrateLegacy(storage){
  const v3 = storage.get(LEGACY.data);
  if (v3?.schema === 3) return ensureCategories(v3.records);
  const v2 = storage.get(LEGACY.v2);
  return v2 ? ensureCategories(fromV2(v2)) : null;
}
