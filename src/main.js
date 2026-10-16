// Punto de entrada: arma los datos, la lógica y la interfaz, y las conecta.
import "@fontsource-variable/inter";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/hero.css";
import "./styles/week.css";
import "./styles/tasks.css";
import "./styles/goals.css";
import "./styles/stats.css";
import "./styles/dialogs.css";

import { nowInfo, currentWeekKey } from "./core/time.js";
import { initData } from "./storage/index.js";
import { createSelectors } from "./state/selectors.js";
import { createActions } from "./state/actions.js";
import { createRenderer } from "./ui/renderer.js";
import { askConfirm } from "./ui/confirm.js";
import { createHero } from "./ui/hero.js";
import { createLegend } from "./ui/legend.js";
import { createWeekGrid } from "./ui/weekGrid.js";
import { createMobileDay } from "./ui/mobileDay.js";
import { createBlockDialog } from "./ui/blockDialog.js";
import { createBlockEditor } from "./ui/blockEditor.js";
import { createGoals } from "./ui/goals.js";
import { createTasks } from "./ui/tasks.js";
import { createTaskEditor } from "./ui/taskEditor.js";
import { createStats } from "./ui/stats.js";
import { createCategoryEditor } from "./ui/categoryEditor.js";
import { setCategories } from "./state/categories.js";
import { bindWeekControls } from "./ui/weekControls.js";
import { initTheme } from "./ui/theme.js";
import { initBackup } from "./ui/backup.js";
import { showSyncStatus } from "./ui/syncStatus.js";
import { initNative } from "./native.js";

const {store, sync} = initData({onStatus:showSyncStatus});
const sel = createSelectors(store);
const act = createActions(store, sel);

// Estado de la pantalla (no se guarda): filtros, día elegido en el celular, etc.
const view = {hidden:new Set(), selDay:nowInfo().day, editingGoals:false, openSugg:new Set()};

const sections = {};
const renderer = createRenderer(sections);
const ctx = {store, sel, act, view, sync, confirm:askConfirm, open:{}, invalidate:renderer.invalidate, afterRender:renderer.afterRender};

const grid = createWeekGrid(ctx);
const blockDialog = createBlockDialog(ctx);
const blockEditor = createBlockEditor(ctx);
const tasks = createTasks(ctx);
const taskEditor = createTaskEditor(ctx);
const categoryEditor = createCategoryEditor(ctx);
Object.assign(ctx.open, {block:blockDialog.open, editor:blockEditor.open, taskEditor:taskEditor.open, goToTask:tasks.goTo, categories:categoryEditor.open});
Object.assign(sections, {
  hero: createHero(ctx),
  legend: createLegend(ctx),
  week: grid.render,
  mobile: createMobileDay(ctx),
  blockDialog: blockDialog.render,
  tasks: tasks.render,
  goals: createGoals(ctx),
  stats: createStats(ctx),
  categories: categoryEditor.render
});

bindWeekControls(ctx);
const theme = initTheme();
initBackup(ctx, theme);
initNative();
// El registro de categorías se actualiza antes de redibujar.
setCategories(sel.categories());
store.subscribe(e => {
  if (e.cols.has("categories")) setCategories(sel.categories());
  renderer.onStoreChange(e.cols);
});
renderer.all();

// Cada minuto: mover la línea de «ahora» y actualizar lo que depende de la hora.
// Si cambió el día o la semana, se redibuja todo.
let lastDay = nowInfo().day, lastKey = currentWeekKey();
function tick(){
  const info = nowInfo(), key = currentWeekKey(info);
  if (key !== lastKey || info.day !== lastDay) { lastKey = key; lastDay = info.day; renderer.all(); return; }
  grid.updateNow();
  const names = ["hero"];
  if (view.selDay === info.day) names.push("mobile");
  if (!taskEditor.isOpen()) names.push("tasks");
  renderer.invalidate(names);
}
setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - Date.now() % 60000 + 50);
