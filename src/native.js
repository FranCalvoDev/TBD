// Integración con Android (Capacitor). En el navegador no hace nada.
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

export async function initNative(){
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("native");
  const { App } = await import("@capacitor/app");

  // Botón «atrás» de Android: cierra el diálogo abierto; si no hay ninguno, manda la app al fondo.
  App.addListener("backButton", () => {
    const open = [...document.querySelectorAll("dialog[open]")].pop();
    if (!open) return App.minimizeApp();
    // Igual que la tecla Escape: los diálogos que esperan respuesta (confirmar) la reciben como «cancelar».
    open.dispatchEvent(new Event("cancel"));
    if (open.open) open.close();
  });

  // Íconos de la barra de estado oscuros sobre el tema claro y claros sobre el oscuro.
  const syncBars = () => SystemBars.setStyle({
    style: document.documentElement.getAttribute("data-theme") === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light
  }).catch(() => {});
  syncBars();
  new MutationObserver(syncBars).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});
}
