# Frisches - Official Website

[![CI](https://github.com/edwillys/frisches-website/actions/workflows/ci.yml/badge.svg)](https://github.com/edwillys/frisches-website/actions/workflows/ci.yml)
[![Deploy to Netlify](https://github.com/edwillys/frisches-website/actions/workflows/deploy-netlify.yml/badge.svg)](https://github.com/edwillys/frisches-website/actions/workflows/deploy-netlify.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Official website for the rock band **Frisches**, featuring an immersive card dealer-themed home screen inspired by the animated clip from the song "Witch Hunting."

## ✨ Features

- 🎴 Interactive card dealer interface with GSAP animations
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🎨 Custom design system inspired by the band's visual identity
- ⚡ Built with Vue 3 + TypeScript + Vite
- ✅ Comprehensive test coverage with Vitest
- 🚀 CI/CD with GitHub Actions

## 🚀 Quick Start

### Installation

```sh
npm install
```

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
