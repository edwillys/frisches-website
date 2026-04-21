# Frisches - Official Website

[![CI](https://github.com/edwillys/frisches-website/actions/workflows/ci.yml/badge.svg)](https://github.com/edwillys/frisches-website/actions/workflows/ci.yml)
[![Deploy to Cloudflare Pages](https://github.com/edwillys/frisches-website/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/edwillys/frisches-website/actions/workflows/deploy-cloudflare.yml)
[![Deploy to Netlify](https://github.com/edwillys/frisches-website/actions/workflows/deploy-netlify.yml/badge.svg)](https://github.com/edwillys/frisches-website/actions/workflows/deploy-netlify.yml)
[![CodeQL](https://github.com/edwillys/frisches-website/actions/workflows/codeql.yml/badge.svg)](https://github.com/edwillys/frisches-website/actions/workflows/codeql.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)

Official website for the rock band **Frisches**, featuring an immersive card dealer-themed home screen inspired by the animated clip from the song "Witch Hunting."

![Frisches – Banner](src/assets/banner.png)

## 🚀 Quick Start

### Installation

```sh
git clone https://github.com/edwillys/frisches-website.git
cd frisches-website
git submodule update --init --recursive
npm install
```

**Note:** This project uses a private git submodule for media assets (`src/assets/private/`). Make sure to clone with submodule support or run `git submodule update --init --recursive` after cloning. Of course you need access to this private repo.

### Development

```sh
npm run dev
```

### Testing

```sh
npm run test:unit
```

## 📚 Documentation

- [Deployment Guide](.github/DEPLOYMENT.md) - CI/CD and deployment setup
- [Git Workflow](.github/prompts/git-workflow.prompt.md) - Git commands and conventions
- [Project Plan](.github/prompts/plan-frischesBandWebsite.prompt.md) - Implementation plan

## 🛠️ Development Setup

### Recommended IDE

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

### Recommended Browser Extensions

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

See [Testing Guide](.github/agents.md#testing-guide) for detailed instructions including VS Code setup.

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
npx playwright install  # First time only
npm run test:e2e
npm run test:e2e -- --debug  # Debug mode
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## 🖼️ Photo Gallery

The project includes a photo gallery component that uses DigiKam for metadata management and `vite-imagetools` for responsive image optimization.

To view it in the app UI, open the **Gallery** section in the CardDealer header.

### Gallery Setup

1. **DigiKam Database**: The gallery reads metadata from a DigiKam SQLite database. By default, it expects the database at `src/assets/private/images/gallery/digikam4.db`.

2. **Custom Database Path**: Set the `DIGIKAM_DB` environment variable to use a different database location:

```sh
# Windows (PowerShell)
$env:DIGIKAM_DB="C:\path\to\your\digikam4.db"; npm run dev

# Linux/macOS
DIGIKAM_DB=/path/to/your/digikam4.db npm run dev
```

3. **Generate Gallery Metadata**: The gallery metadata is automatically generated before dev/build. To manually generate:

```sh
npm run generate:gallery
```

This creates `src/assets/gallery_data.json` from your DigiKam database.

### Gallery Features

- **Modes**: Toggle between Photos (all images) and Albums (organized by folder)
- **Filters**: Filter by People, Location, and Tags (persists across modes)
- **Lightbox**: Double-click any image to open in fullscreen with keyboard navigation
- **Responsive Images**: Automatically generates optimized sizes using `vite-imagetools`
- **Metadata Classification**:
  - Tags under "People" root → People filters
  - Tags under "Places" root → Location filters
  - Other tags → General tags

### DigiKam Tag Structure

For proper filter classification, organize your DigiKam tags as:

```
📁 People
  └── Alice
  └── Bob
📁 Places (or Locations)
  └── Spain
  └── France
📁 Other tags
  └── beach
  └── concert
```

## Credits

### Web & Development

- **Web Design**: Edgar Lubicz

### Visual Identity

- **Art Design**: Laurent Carcelle

### Photography

- Filippos Ineglis
- Tobias Tschepe

### Open Source Libraries

- **[GSAP](https://gsap.com/)** (GreenSock Animation Platform) – Animation library used under the [GSAP Standard License](https://gsap.com/licensing/)
- **[Draco](https://google.github.io/draco/)** – 3D mesh compression by Google, licensed under [Apache 2.0](https://github.com/google/draco/blob/master/LICENSE)
- **[Vue 3](https://vuejs.org/)** + **[Vite](https://vite.dev/)** + **[PrimeVue](https://primevue.org/)** – UI framework, build tool, and component library
