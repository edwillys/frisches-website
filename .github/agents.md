# Agents and Website Plan for Frisches

## Project Overview
We are building a dynamic website for the rock band **Frisches** using Vue.js. The design and mood will be inspired by images and video snippets from the band's animated clip for the song "Witch Hunting." The color palette and atmosphere will be derived from these resources to create a mysterious and engaging experience.

## Home Screen Concept
- The initial screen will feature the mysterious card dealer from `Intro_Voyante_00020.jpg` (also seen in the video clips).
- The dealer will present a set of cards, each representing a menu option:
  - Music
  - About
  - Tour
  - (Other typical band site sections)
- The cards will be interactive and visually styled to match the mood of the media resources.

## Website User Flow

### Initial State (Logo View)
1. **User lands on the website**
   - Dark, mysterious background with gradient overlay
   - White circle outline with animated Frisches logo in center (bottom-middle area)
   - Logo serves as the only interactive element on home screen
   - Minimal, clean, mysterious aesthetic matching "Witch Hunting" theme

### Logo Click → Cards Reveal (Logo to Cards Transition)
2. **User clicks the logo circle**
   - Logo animates: 360° rotation with scale shrink (fan closing effect)
   - Logo fades out over 1.5s
   - Upon logo completion, cards immediately appear
   - Cards animate: scale from 0.3 to 1.0 with stagger effect (0.1s between each)
   - Duration: 1.8s per card with `back.out(1.2)` easing
   - Cards appear side-by-side (Music, About, Tour) in horizontal layout
   - All 3 cards are now visible and clickable

### Cards View (Exploration)
3. **User explores the three menu cards**
   - Cards are positioned horizontally in center of screen
   - Each card shows title and background image with gradient overlay
   - Hover state: card scales up 1.05x and lifts (-10px translateY)
   - Cards are clickable to view content
   - Clicking outside cards returns to logo view (click-outside detection)

### Card Click → Content View (Card Selection)
4. **User clicks a specific card (e.g., "Music")**
   - Selected card animates: moves to left side, scale 0.9, opacity 0.8
   - Other cards: fade out (opacity 0) and scale down (0.5)
   - Content view appears in center with selected card details
   - Duration: 1s smooth transition with `power2.inOut` easing
   - Now in "content" view showing information about selected section

### Content View (Information)
5. **User views content in content view**
   - Content placeholder shows selected card's title and information
   - Background remains visible with overlay
   - Selected card still visible on left side (semi-transparent)
   - Two ways to exit:
     - Click outside content area → returns cards to original grid
     - Navigate to different section → replaces content

### Return to Cards (Content Close)
6. **User clicks outside the content area**
   - Content view fades/closes
   - Cards return to horizontal grid layout
   - Animations reverse: cards scale back to 1.0, move to original positions
   - Duration: 1s with stagger effect (0.05s delay)
   - Back in "cards" view

### Return to Logo (Cards Close)
7. **User clicks outside cards area (on background)**
   - Cards animate: scale down to 0.3, fade to 0 (opacity 0)
   - Cards collapse to center with stagger (0.05s delays)
   - Duration: 1.5s with `back.in(1.2)` easing
   - Once cards disappear, logo reappears
   - Logo animates: reverse fan-opening effect (scale 0→1, rotation 360°→0)
   - Duration: 1.5s with `power2.inOut` easing
   - Back in "logo" view - cycle complete

### State Summary
- **Logo View**: Only logo visible, user entry point
- **Cards View**: Three menu cards side-by-side, user can explore or click outside to go back
- **Content View**: Detailed content for selected card, can close to return to cards or click outside
- **Animations**: All transitions are smooth with GSAP, providing visual feedback
- **Click Detection**: Click-outside detection on semi-transparent overlay (z-index: 2) enables seamless navigation

### User Journey Visualization
```
[Logo View]
    ↓ (Click Logo)
[Cards Appear with 360° spread]
    ↓ (Click Card)
[Content View]
    ↓ (Click Outside)
[Cards Return]
    ↓ (Click Outside)
[Logo Reappears]
```

## Next Steps
1. Analyze the colors and mood from the provided images and videos.
2. Design and develop the home screen layout with the card dealer and menu cards as a proof of concept. Only proceed to further steps once the home screen meets expectations.
3. Organize the folder tree structure as a typical Vue project, including configuration for GitHub Actions to enable CI/CD.
4. Plan and implement smooth animations for interactive elements.
5. Expand the site with additional sections (music, about, tour, etc) after the home screen is approved.

## Project Structure

```
frisches-website/
├── .github/                    # GitHub configuration and documentation
│
├── public/                     # Static assets served as-is
│   ├── videos/                # Large video files (gitignored until compressed)
│   └── audio/                 # Audio/music files (future)
│
├── src/
│   ├── assets/
│   │   ├── images/            # Optimized images with descriptive names
│   │   └── styles/            # Global CSS (variables, base styles)
│   │
│   ├── components/            # Vue components
│   │   └── __tests__/         # Component unit tests
│   │
│   ├── composables/           # Reusable composition functions
│   │
│   ├── router/                # Vue Router configuration
│   ├── stores/                # Pinia state management
│   ├── App.vue                # Root component
│   └── main.ts                # App entry point
│
├── tests/                     # Additional test files
└── [config files]             # Vite, Vitest, TypeScript, ESLint configs
```

## Development Guidelines

### Testing Requirements
- **All features must have tests implemented before merging**
- Component tests in `src/components/__tests__/`
- Use Vitest for unit tests: `npm run test:unit`
- Run with coverage: `npm run test:coverage`
- Ensure tests pass before committing: tests verify functionality, props, events, and responsive behavior

### Testing Guide

#### Running Unit Tests Locally

**Quick start:**
```powershell
# Windows PowerShell - from project root
cd C:\Users\Edgar\Documents\frischesweb\frisches-website
npm run test:unit
```

**Command-line options:**
```sh
# Run tests once and exit
npm run test:unit -- --run

# Watch mode (re-runs on file changes)
npx vitest

# Run specific test file
npx vitest src/components/__tests__/CardDealer.test.ts

# Run with UI dashboard
npx vitest --ui

# Run with coverage report
npx vitest --coverage
```

#### Using VS Code Testing Interface (Recommended)

**Setup:**
1. Install **Vitest** extension: Search "Vitest" in Extensions sidebar
2. Install **Vitest Explorer** extension for visual test runner
3. Once installed, click the **Testing** icon (beaker/flask) in the left sidebar

**Using the interface:**
- Tests auto-discover from `src/**/__tests__/` and `src/**/*.test.ts`
- Click ▶️ next to a test file or individual test to run
- Watch mode: Click ▶️ with refresh icon at top of Test Explorer
- Failed tests show with ❌ and passing with ✓
- Click on a failed test to jump to the error

**Current test files:**
- `src/components/__tests__/CardDealer.test.ts` - Main component (8 tests)
- `src/components/__tests__/MenuCard.test.ts` - Menu card component (7 tests)
- `src/components/__tests__/LogoEffect.test.ts` - Logo animation (1 test)
- `src/__tests__/App.spec.ts` - App integration (1 test)
- **Total: 17 tests (all passing ✅)**

#### Test Organization

Tests follow Vue Test Utils best practices:
- Use `mount()` to render components
- Mock external dependencies (Router, GSAP)
- Test props, events, DOM structure, and responsive layout
- Use `happy-dom` for fast DOM simulation (configured in `vitest.config.ts`)

#### E2E Testing with Playwright

**Setup (first time):**
```sh
npx playwright install
```

**Running E2E tests:**
```sh
npm run test:e2e                    # Run all tests
npm run test:e2e -- --project=chromium  # Chromium only
npm run test:e2e -- --debug         # Debug mode (opens inspector)
npm run test:e2e -- tests/example.spec.ts  # Specific file
```

**Using VS Code:**
1. Install **Playwright Test for VS Code** extension
2. Open Testing panel (beaker icon)
3. Select "Playwright" from test provider dropdown
4. Click ▶️ to run tests

#### CI/CD Testing

Tests run automatically on:
- **Push to main**: GitHub Actions CI workflow
- **Pull requests**: Validation before merge
- See `.github/workflows/ci.yml` for details

### Code Quality
- Mobile responsiveness is essential; the website must look and function well on all devices
- The design should be creative and minimalistic, maintaining a unique and engaging experience inspired by the band's media resources
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write meaningful component and function names

### Git Workflow
See `.github/prompts/git-workflow.prompt.md` for detailed git commands and workflow guidelines.

### Media Files
- Videos (`.mp4`) are gitignored until compressed
- Images are committed with descriptive names
- Large media files should eventually use CDN (DigitalOcean Spaces)

---
This file will be updated as the project progresses to document agents, features, and design decisions.