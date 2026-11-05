# Assis Care widget source

Human-readable Vue 3 source for the storefront chat bundled in the WordPress plugin [Assis Care](https://wordpress.org/plugins/assis-care/) as `assets/assis-care.js` and `assets/assis-care.css`.

This repository exists so the minified plugin assets stay reviewable under the WordPress.org Plugin Directory guidelines (Guideline 4 — code must be mostly human readable).

## License

GPLv2 or later (same as the WordPress plugin).

## Build

Requires Node.js 18+.

```bash
npm install
npm run build
```

Vite writes hashed files under `dist/assets/`. Copy the built `.js` and `.css` into the WordPress plugin as:

- `assis-care/assets/assis-care.js`
- `assis-care/assets/assis-care.css`

The WordPress plugin pack step may strip a few remote asset URL strings that WordPress.org does not allow in distributed plugins.

## Main files

- `App.vue` — chat UI and storefront behavior
- `main.js` — plugin entry
- `woocommerceCart.js` / `shopifyCart.js` — cart bridges
- `vite.config.js` — build to a single IIFE JS + CSS pair
