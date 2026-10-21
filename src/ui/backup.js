// Sección «Tus datos»: exportar e importar una copia de seguridad.
// En Android la copia se comparte (Drive, correo, Archivos…); en el navegador se descarga.
import { Capacitor } from "@capacitor/core";
import { buildBackup, parseBackup, restoreBackup, backupFileName, countRecords } from "../storage/backup.js";
import { $ } from "./dom.js";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const summary = n => `${plural(n.blocks, "bloque", "bloques")}, ${plural(n.tasks, "tarea", "tareas")} y ${plural(n.goals, "meta", "metas")}`;

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
  const msg = $("dataMsg"), file = $("importFile"), sw = $("dataSwitch");
  const say = (text, kind = "") => { msg.textContent = text; msg.className = "data-msg " + kind; };

  // «Tus datos» queda oculto (OFF) hasta activarlo.
  sw.addEventListener("click", () => {
    const on = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", String(on));
    sw.querySelector(".switch-text").textContent = on ? "ON" : "OFF";
    $("dataBody").hidden = !on;
  });

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
  file.addEventListener("change", async () => {
    const f = file.files[0]; file.value = "";
    if (!f) return;
    let backup;
    try { backup = parseBackup(await f.text()); }
    catch (e) { return say(e.message, "error"); }
    const n = countRecords(backup.records);
    const when = backup.exportedAt ? ` del ${new Date(backup.exportedAt).toLocaleDateString("es")}` : "";
    const ok = await ctx.confirm("Importar copia",
      `La copia${when} tiene ${summary(n)}, con ${plural(n.categories, "categoría", "categorías")}. Reemplaza todo lo que hay ahora en esta app.`, "Importar");
    if (!ok) return;
    restoreBackup(ctx.store, backup.records);
    if (backup.prefs.theme) theme.set(backup.prefs.theme);
    say("Copia importada.", "ok");
  });
}
