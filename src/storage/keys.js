// Claves de localStorage. Cambiar el prefijo separa los datos de otra instalación.
export const KEYS = {
  data: "tbd:data",
  device: "tbd:device",
  outbox: "tbd:outbox",
  cursor: "tbd:cursor",
  server: "tbd:servidor",
  theme: "tbd:tema",
  notes: "tbd:notas",
  folded: "tbd:plegadas"
};

// Claves de versiones anteriores: se leen una sola vez para migrar.
export const LEGACY = {
  data: "semana-francisco:v3",
  device: "semana-francisco:device",
  theme: "semana-francisco-tema",
  v2: "francisco-app-v2"
};
