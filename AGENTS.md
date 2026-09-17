# Repository Guidelines

## Project Structure & Module Organization

This Expo/React Native application checks website accessibility and monitors whitelist restrictions.

- `app/`: Expo Router screens and layouts; `app/index.tsx` is the main screen.
- `components/`, `hooks/`, `constants/`: reusable UI, React hooks, and theme values.
- `services/`: background monitoring and native task handlers.
- `utils/`: site probing, monitoring policy, and custom-site storage.
- `assets/images/`: application icons and images.
- `tests/`: automated tests and the TypeScript loading helper.
- `patches/`: native Expo dependency fixes; `docs/`: device-testing notes.

## Build, Test, and Development Commands

Run from the repository root:

- `npm ci`: install locked dependencies and apply required patches through `postinstall`.
- `npm start`: start the Expo development server.
- `npm run android` / `npm run ios`: build and run locally with the respective native toolchain; iOS requires macOS.
- `npm run web`: start web development.
- `npm run lint`: run ESLint with Expo's flat configuration.
- `npm run typecheck`: check strict TypeScript without emitting files.
- `npm test`: run `tests/*.test.cjs` using Node's built-in test runner.
- `npm run build:preview` / `npm run build:development` / `npm run build`: create Android preview, development, or production APKs; requires EAS CLI and account access.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, semicolons, and the surrounding file's quote style. Use PascalCase for components and types, camelCase for functions and variables, and `use` prefixes for hooks. Preserve existing filenames when editing; components include both PascalCase and kebab-case names. Prefer `@/` imports for shared modules. Keep network and persistence logic in services or utilities.

## Testing Guidelines

Use `node:test` and `node:assert/strict`; name files `<module>.test.cjs` with descriptive behavioral test names. Reuse `tests/loadTypescript.cjs` and mock network, storage, timers, and native modules. Add regression tests for logic changes; no coverage threshold is configured. Run tests, lint, and typecheck before review. Verify background behavior in an installed native build using `README.md` and `docs/background-monitor-device-test.md`.

## Commit & Pull Request Guidelines

History uses short Russian or English summaries, such as `fix no internet` and `Update package.json`. Keep commits focused. PRs should explain behavior changes, link relevant issues, report validation, and include screenshots for UI changes. Highlight dependency, patch, and app-configuration changes.

## Background Tasks & Configuration

Keep task imports in root `index.js` before `expo-router/entry`. Preserve `patch-package` installation and Android `buildFromSource` settings; native patch changes require rebuilding the app. Do not commit credentials, signing keys, or generated `android/`, `ios/`, `.expo/`, and `node_modules/` directories.
