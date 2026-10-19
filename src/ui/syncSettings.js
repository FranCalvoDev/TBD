// «Sincronizar con tu servidor»: conectar este dispositivo al servidor TBD del grupo.
import { checkServer } from "../storage/remote.js";
import { normalizeServerUrl } from "../storage/serverConfig.js";
import { $ } from "./dom.js";

export function initSyncSettings(ctx){
  const {sync} = ctx, msg = $("syncMsg");
  const say = (text, kind = "") => { msg.textContent = text; msg.className = "data-msg " + kind; };

  function render(){
    const cfg = sync.config(), on = sync.enabled && !!cfg;
    $("syncForm").hidden = on;
    $("syncOn").hidden = !on;
    if (on) { $("srvShown").textContent = cfg.url.replace(/^https?:\/\//, ""); $("srvUser").textContent = cfg.name || "—"; }
    $("dataSub").textContent = on
      ? "Tus datos se guardan en este dispositivo y en el servidor de tu grupo. Nadie más tiene acceso. También puedes exportar una copia para guardarla donde quieras."
      : "Todo se guarda solo en este dispositivo: nadie más tiene acceso. Exporta una copia para guardarla donde quieras (Drive, correo, tu computadora) o para pasar tus datos a otro teléfono.";
    ctx.invalidate(["stats"]);
  }

  $("srvConnect").addEventListener("click", async () => {
    const url = normalizeServerUrl($("srvUrl").value), token = $("srvKey").value.trim();
    if (!url || !token) return say("Completa la dirección del servidor y tu clave de acceso.", "error");
    const btn = $("srvConnect");
    btn.disabled = true; say("Probando la conexión…");
    try {
      const me = await checkServer({baseUrl:url, token});
      sync.connect({url, token, name:me.name});
      $("srvKey").value = "";
      say(`Conectado como ${me.name}. Lo que tienes en este dispositivo se combina con lo del servidor.`, "ok");
      render();
    } catch (e) { say(e.message, "error"); }
    finally { btn.disabled = false; }
  });

  $("srvNow").addEventListener("click", async () => { say("Sincronizando…"); await sync.now(); say(""); });

  $("srvOff").addEventListener("click", async () => {
    const ok = await ctx.confirm("Desconectar", "Este dispositivo deja de sincronizar. Tus datos quedan acá y en el servidor; puedes volver a conectarte cuando quieras.", "Desconectar");
    if (!ok) return;
    sync.disconnect(); say("Desconectado. Los datos siguen en este dispositivo.");
    render();
  });

  const cfg = sync.config();
  if (cfg) $("srvUrl").value = cfg.url;
  render();
}
