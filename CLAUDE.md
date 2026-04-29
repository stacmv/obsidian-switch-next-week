# Switch Next Week — Obsidian Plugin

Obsidian plugin for weekly task planning. Runs a "week protocol" that finalizes the current week, balances tasks, and creates the next week's note from a template and backlog. Wraps the `switch-next-week` library (local monorepo sibling at `../switch-next-week`).

## Key Technologies

- **TypeScript** (strict), targeting ES2020
- **esbuild** for bundling (CommonJS output, browser platform for mobile compatibility)
- **Vitest** for unit tests
- **ESLint** with `@typescript-eslint`
- **Obsidian API** (v1.5.0+, desktop + mobile)

## Commands

```bash
npm run build        # Production build → main.js
npm run dev          # Watch mode build
npm run lint         # ESLint src/
npm run lint:fix     # ESLint with auto-fix
npm test             # Run tests (vitest run)
npm run test:watch   # Vitest watch mode

make local-install   # Build + copy to local Obsidian vault (requires .env)
make release         # Bump version, commit, tag, create GitHub release
```

## Project Structure

```
src/
  main.ts          # Plugin entry point (SwitchNextWeekPlugin extends Plugin)
  settings.ts      # Settings interface, defaults, validation, settings tab UI
  modal.ts         # Result display modal (normal + year-transition modes)
  vault-fs.ts      # Obsidian vault adapter implementing IFileSystem
  lib.d.ts         # Type stubs for switch-next-week library
  fs-stub.js       # Empty stub for Node.js fs module (unused at runtime)
test/
  vault-fs.test.ts # Unit tests for ObsidianVaultFileSystem
  obsidian-mock.ts # Minimal Obsidian API mock for tests
scripts/
  bump-version.mjs # Version bump utility
styles.css         # Plugin UI styles (uses Obsidian CSS variables)
manifest.json      # Obsidian plugin manifest
esbuild.config.mjs # Build config (aliases path→path-browserify, fs→fs-stub)
vitest.config.mts  # Test config (obsidian → test/obsidian-mock.ts)
```

## Coding Conventions

- **PascalCase** for classes; **camelCase** for functions/properties; **UPPER_SNAKE_CASE** for constants
- **Underscore prefix** for private methods (`_renderNormal`, `_ensureFolder`)
- Async/await throughout; try-catch with `new Notice(...)` for user-facing errors
- Settings validation is a pure function separate from the UI (`validateSettings()`)
- `ObsidianVaultFileSystem implements IFileSystem` — adapter pattern for testability
- UI strings are in **Russian** (modal buttons, status messages)
- No Node.js-only APIs; `path` is polyfilled via `path-browserify`; `fs` is stubbed
- CSS classes prefixed `.snw-` (e.g., `.snw-modal`, `.snw-status-ok`, `.snw-year-banner`)
- Tests use mock-based unit testing against the vault adapter layer

## Browser / Mobile Compatibility

esbuild aliases ensure no Node.js built-ins reach the bundle:
- `path` → `path-browserify`
- `fs` → `src/fs-stub.js` (empty export; `NodeFileSystem` from the library is never instantiated)

External (not bundled): `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`
