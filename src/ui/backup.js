// Sección «Tus datos»: exportar e importar una copia de seguridad.
// En Android la copia se comparte (Drive, correo, Archivos…); en el navegador se descarga.
import { Capacitor } from "@capacitor/core";
import { buildBackup, parseBackup, restoreBackup, applyPackage, backupFileName, countRecords, PACKAGE_KIND } from "../storage/backup.js";
import { $ } from "./dom.js";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const summary = n => `${plural(n.blocks, "bloque", "bloques")}, ${plural(n.tasks, "tarea", "tareas")} y ${plural(n.goals, "meta", "metas")}`;
/** Lo que trae un paquete, solo lo que no está vacío: «1 rutina y 12 notas». */
const packageSummary = n => {
  const parts = [[n.routines, "rutina", "rutinas"], [n.notes, "nota", "notas"], [n.blocks, "bloque", "bloques"], [n.goals, "meta", "metas"],
    [n.tasks, "tarea", "tareas"], [n.categories, "categoría", "categorías"], [n.workouts, "sesión", "sesiones"]].filter(([c]) => c).map(([c, a, b]) => plural(c, a, b));
  return parts.length > 1 ? parts.slice(0, -1).join(", ") + " y " + parts.at(-1) : parts[0] || "nada";
};

async function saveFile(name, text){
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const {uri} = await Filesystem.writeFile({path:name, data:text, directory:Directory.Cache, encoding:Encoding.UTF8});
    await Share.share({title:"Copia de TBD", files:[uri]});
    return;
  }
  const url = URL.createObjectURL(new Blob([text], {type:"application/json"}));
  const a = Object.assign(document.createElement("a"), {href:url, download:name});
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initBackup(ctx, theme){
  const msg = $("dataMsg"), file = $("importFile");
  const say = (text, kind = "") => { msg.textContent = text; msg.className = "data-msg " + kind; };

  $("exportBtn").addEventListener("click", async () => {
    try {
      const now = new Date(), backup = buildBackup(ctx.store, {theme:theme.get()}, now);
      await saveFile(backupFileName(now), JSON.stringify(backup, null, 2));
      const n = countRecords(backup.records);
      say(`Copia lista: ${summary(n)}.`, "ok");
    } catch (e) {
      // Cerrar el menú de compartir sin elegir nada no es un error.
      if (/cancel/i.test(String(e?.message || e))) return say("");
      say("No se pudo exportar la copia.", "error");
    }
  });

  $("importBtn").addEventListener("click", () => file.click());
  // Otras secciones (por ejemplo Entrenamiento) abren el mismo selector de archivos.
  ctx.open.importFile = () => file.click();
  file.addEventListener("change", async () => {
    const f = file.files[0]; file.value = "";
    if (!f) return;
    let backup;
    try { backup = parseBackup(await f.text()); }
    catch (e) { return say(e.message, "error"); }
    const n = countRecords(backup.records);
    if (backup.kind === PACKAGE_KIND) {
      const title = backup.title ? `«${backup.title}»` : "El paquete";
      if (!await ctx.confirm("Importar paquete", `${title} suma ${packageSummary(n)}. No borra nada de lo que ya tienes.`, "Importar")) return;
      applyPackage(ctx.store, backup.records);
      // Una rutina importada como activa pasa a ser la que está en uso.
      const active = backup.records.routines.find(r => r.active);
      if (active) ctx.act.activateRoutine(active.id);
      return say(`Importado: ${packageSummary(n)}.`, "ok");
    }
    const when = backup.exportedAt ? ` del ${new Date(backup.exportedAt).toLocaleDateString("es")}` : "";
    const ok = await ctx.confirm("Importar copia",
      `La copia${when} tiene ${summary(n)}, con ${plural(n.categories, "categoría", "categorías")}. Reemplaza todo lo que hay ahora en esta app.`, "Importar");
    if (!ok) return;
    restoreBackup(ctx.store, backup.records);
    if (backup.prefs.theme) theme.set(backup.prefs.theme);
    say("Copia importada.", "ok");
  });
}
