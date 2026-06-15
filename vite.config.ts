import { defineConfig } from "vite";

// Relative base so the production build works when served from a subpath —
// GitHub Pages serves a project site at https://<user>.github.io/exostation/.
// All asset URLs (the entry bundle, code-split chunks, sprites, and the
// import.meta.glob audio) are emitted relative to the page, so the same build
// also works under `vite preview` and from a plain file server. `vite dev` is
// unaffected (it always serves from "/").
export default defineConfig({
  base: "./",
});
