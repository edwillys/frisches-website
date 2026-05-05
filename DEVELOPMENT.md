# Development

## Stack

- Vue 3 + TypeScript + Vite
- Pinia for player state
- Vue Router for legal routes
- vue-i18n for UI localization
- GSAP for animation
- Vitest for unit tests
- Playwright for end-to-end tests

## Requirements

- Node 24.14.1
- npm
- Access to the private media assets used in `src/assets/private/`

## Installation

```sh
git clone https://github.com/edwillys/frisches-website.git
cd frisches-website
git submodule update --init --recursive
npm install
```

If the private asset submodule is unavailable, the app can still boot, but media-heavy views and tests may not reflect production assets.

## Core Commands

```sh
npm run dev
npm run host
npm run build
npm run preview
npm run lint
npm run type-check
```

## Testing

Unit tests:

```sh
npm run test:unit -- --run
npx vitest src/components/__tests__/CardDealer.test.ts
npx vitest src/i18n/__tests__/locale.test.ts
```

Coverage:

```sh
npm run test:coverage
```

Playwright setup:

```sh
npx playwright install
```

Run the full e2e suite only when necessary. Prefer targeted specs for the affected slice:

```sh
npx playwright test e2e/lyrics-display.spec.ts
npx playwright test e2e/critical-user-flows.spec.ts
npx playwright test e2e/user-flow.spec.ts --project=chromium
```

## Localization

- Locale messages live in `src/locales/`
- Supported locales: `en`, `de`, `fr`, `br`, 'it', 'ru'
- Locale state lives in `src/i18n/locale.ts`
- Preference persistence uses both the `frisches_locale` cookie and `frisches:locale` in `localStorage`
- Browser language is used when no stored preference exists; fallback is English

## Project Structure

```text
src/
  assets/        Static images, icons, styles, generated gallery manifest, private synced media
  components/    Vue UI components and component tests
  composables/   Reusable composition logic
  constants/     Shared constant values
  data/          Structured content for band members, story, albums, tracks, stems
  i18n/          Locale state and compatibility wrappers
  locales/       JSON translation sources
  router/        Legal route definitions and guards
  stores/        Pinia state
  test/          Shared Vitest setup and mocks
e2e/             Playwright specs and helpers
scripts/         Gallery generation, SVG normalization, R2 sync helpers
```

## Gallery And Assets

Gallery metadata is generated from DigiKam data before `dev` and `build`:

```sh
npm run generate:gallery
```

To point to a different DigiKam database:

```powershell
$env:DIGIKAM_DB="C:\path\to\digikam4.db"; npm run dev
```

Private assets can be synced through Cloudflare R2 helpers:

```sh
npm run sync:r2:down
npm run sync:r2:up
npm run sync:r2:bisync
```

## Notes

- `npm run dev` and `npm run build` both regenerate gallery data first.
- Legal pages are route-driven; the home experience remains card-dealer driven.
- For behavior changes, update the nearest unit test first and use targeted Playwright coverage only where the interaction crosses component boundaries.
