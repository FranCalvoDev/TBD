import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas: el build funciona en cualquier carpeta (por ejemplo GitHub Pages).
  base: "./",
  test: { environment: "node" }
});
