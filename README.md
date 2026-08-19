# Bike Stats Dashboard v2

A static React and TypeScript rebuild of Bike Stats Dashboard for GitHub Pages. MotoGP data is collected at build time, normalized into public JSON, and never requested from a visitor's browser.

## Requirements

- Node.js 24 LTS
- npm 11+

## Local development

```bash
npm install
npm run dev
```

The repository includes a small demo dataset so the interface works immediately. Refresh public data with `npm run data:refresh -- --years=2020-2026`.

Run all checks with `npm run check`.

Historical and current snapshots live in `public/data`. GitHub Actions refreshes the current season daily and deploys the Vite `dist` directory. The deployed application calls only its own static assets.

This is an unofficial fan project and is not associated with MotoGP or Dorna Sports.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
# BikestatsWeb-v2
