# Agents and Website Plan for Frisches

## Project Overview

We are building a dynamic website for the rock band **Frisches** using Vue.js. The design and mood will be inspired by images and video snippets from the band's animated clip for the song "Witch Hunting." The color palette and atmosphere will be derived from these resources to create a mysterious and engaging experience.

## Home Screen Concept

- The initial screen will feature the mysterious card dealer from `Intro_Voyante_00020.jpg` (also seen in the video clips).
- The dealer will present a set of cards, each representing a menu option:
  - Music
  - About
  - Galery
  - (Other typical band site sections)
- The cards will be interactive and visually styled to match the mood of the media resources.

## Character Selection Behavior

- **One character at a time:** The About/character view displays a single 3D character next to an information card (name, influences, favorite song).
- **Selection UI:** Users pick characters via circular initial buttons (one per character) in the button row below the scene; the active button is highlighted.
- **Badges:** Instead of an instrument text list, each character shows small SVG “badge medals” (stored in `src/assets/badges`) rendered in a compact grid beside the portrait.
- **Preloading & rendering:** All GLTF models are preloaded (instantiated) but only the selected model is visible; this makes swaps instantaneous and avoids loading delays during selection.
- **Synchronized swap animation:** GSAP timelines animate the card and model out and in synchronously for smooth transitions between characters.
- **Model framing & orientation:** Camera position / FOV and per-character `rotationY` and `scale` properties are used to ensure each character fits the same visual height as the card and faces forward; OrbitControls rotation is disabled to keep a consistent viewing angle.
- **Shadow & lighting:** Models use three.js shadows and a small skylight setup to integrate visually with the card backdrop.
- **Animations & playback:** The loader logs available animation clips; future enhancement is to automatically play a character’s idle animation via an AnimationMixer when present.
- **Testing & reliability:** Unit tests were updated to mock GSAP timelines (run synchronously in tests) and to assert badges and info sections; all unit tests pass locally (`56/56`).

## Testing (Non-Interactive)

- Run unit tests once and exit (no watch / no prompt): `npm run test:unit -- --run`

## Visual Effects

### Luminescent Dust Particles (MouseParticles Component)

The website features an ambient particle system that creates a luminescent dust effect inspired by the floating particles from Stranger Things, adding a mystical atmosphere to the entire experience.

**Core Behavior:**

- **Ambient Floating**: 100 particles continuously float across the screen with physics-based motion
  - Gravity pulls particles down subtly (0.01)
  - Buoyancy pushes them up (0.015), creating a natural floating effect
  - Air resistance (0.99) and turbulence (0.02) simulate realistic air currents
  - Particles wrap around screen edges for seamless, infinite floating

**Visual Characteristics:**

- **Size**: Random sizes between 0.4px and 2.0px for depth variation
- **Shape**: Slightly irregular shapes (not perfect circles) with 6-sided polygons and 0.35 irregularity factor
- **Color**: Red theme matching band aesthetic (RGB: 220, 40, 40) with ±10 variance for subtle variation
- **Glow**: Pulsing glow effect with:
  - Alpha oscillating between 0.1 and 0.5
  - Blur oscillating between 4px and 12px
  - Independent phase for each particle creating organic, random pulsing

**Mouse Interaction:**

- **Speed-Based Attraction**: Particles near the cursor (within 180px radius) are attracted when the mouse moves
  - Attraction strength is proportional to cursor speed (faster movement = stronger pull)
  - Only particles close to the mouse path are affected
  - Spawning rate proportional to cursor speed
- **Dust Trace Effect**: Fast cursor movements create a visible trail of accumulated particles
  - New particles spawn at cursor position during movement
  - Attracted particles follow the cursor path
  - Creates a dynamic, responsive dust cloud effect

- **Dispersion**: When cursor stops moving, attracted particles gradually disperse
  - Particles slow down with dispersion rate of 0.96
  - Return to natural floating behavior after attraction time expires
  - Ensures most particles remain freely floating in the background

**Logo Button Interaction:**

- **Hover Attraction**: When the user hovers over the logo button, 30% of particles are attracted to orbit around it
  - Particles smoothly transition to circular orbit paths around the button
  - Orbit radius: 100px ± 20px variance for natural, layered effect
  - Fast transition duration (10 frames) creates immediate, responsive feel
  - Each particle maintains its own orbital angle and speed (0.005-0.008 radians/frame)
  - Particles closest to the button are selected first for attraction
- **Automatic Dispersion**: When the logo button is clicked or becomes invisible
  - `hideLogoButton()` method is called via CardDealer → App → MouseParticles
  - All attracted particles immediately begin dispersing
  - Particles transition back to natural floating physics with gradual deceleration
  - Creates a magical effect where particles scatter as the logo disappears
- **State Management**:
  - Tracks `logoButtonVisible` and `logoButtonHovered` states independently
  - Only attracts particles when button is both visible AND hovered
  - Ensures particles disperse when either condition becomes false

**Implementation Details:**

- Canvas-based rendering with device pixel ratio optimization (max 2x)
- Fixed position overlay with `pointer-events: none` for non-intrusive interaction
- `mix-blend-mode: screen` for additive glow effect
- Z-index 9999 to overlay card dealer area while remaining subtle
- Public API methods exposed via `defineExpose`:
  - `setLogoButtonState(hovered, x, y)` - Updates hover state and button position
  - `hideLogoButton()` - Triggers particle dispersion when button disappears
- All parameters exposed as tweakable constants at the top of the component:
  - `PARTICLE_COUNT`, `PARTICLE_SIZE_MIN/MAX`, `PARTICLE_SPEED_MIN/MAX`
  - `GRAVITY`, `BUOYANCY`, `AIR_RESISTANCE`, `TURBULENCE`
  - `MOUSE_ATTRACTION_STRENGTH`, `MOUSE_ATTRACTION_RADIUS`, `DISPERSION_RATE`
  - `LOGO_ATTRACTION_PERCENTAGE`, `LOGO_ATTRACTION_STRENGTH`, `LOGO_ORBIT_RADIUS`, `LOGO_ORBIT_VARIANCE`, `LOGO_TRANSITION_DURATION`
  - `GLOW_FREQUENCY`, `GLOW_MIN/MAX_ALPHA`, `GLOW_BLUR_MIN/MAX`
  - `SHAPE_SEGMENTS`, `SHAPE_IRREGULARITY`
  - `COLOR` (RGB), `COLOR_VARIANCE`

**Testing:**

- Comprehensive unit tests in `src/components/__tests__/MouseParticles.test.ts`
- Tests cover:
  - Component rendering and canvas element presence
  - Exposed public API methods (`setLogoButtonState`, `hideLogoButton`)
  - Logo button hover state management
  - Particle attraction and dispersion behavior
  - Position updates and state transitions
  - Accessibility attributes (aria-hidden)

**Design Philosophy:**
The effect maintains a balance between ambient atmosphere and interactive feedback:

- Particles freely float to create consistent ambient atmosphere
- Responsive to both mouse movement and logo button interactions
- Logo hover creates a focused, magical gathering effect
- Automatic dispersion when logo disappears reinforces the mystical theme
- Subtle enough not to distract from main content but noticeable enough to enhance the mysterious, magical atmosphere

## Website User Flow

### Initial State (Logo View)

1. **User lands on the website**
   - Dark, mysterious background with gradient overlay
   - Background artwork gently pulses/zooms to create a breathing effect
   - White circle outline with animated Frisches logo in center (bottom-middle area)
   - Logo emits a continuous heartbeat glow that matches the background pulse for a unified breathing effect
   - Logo serves as the only interactive element on home screen
   - Logo fades in sync with the background pulse so both elements feel like the same reveal
   - Minimal, clean, mysterious aesthetic matching "Witch Hunting" theme

### Logo Click → Cards Reveal (Logo to Cards Transition)

2. **User clicks the logo circle**
   - Logo animates: Moves to the center of the screen.
   - Logo animates: 360° rotation with scale shrink (fan closing effect)
   - Logo fades out over 1.5s while the background pulse eases down
   - Upon logo completion, cards appear as a single deck at the center point (where the logo disappeared).
   - **Phase 1 (Deck Appearance):** The deck grows from a small point (scale 0) to full size (scale 1) with a smooth, spline-like easing (`power2.inOut`). The movement is lean and natural, without bouncing. All cards appear together as a single unit (no stagger).
   - **Phase 2 (Distribution):** Once the deck is fully formed, the cards distribute symmetrically to their final left and right positions, sliding away from the center and appearing from behind the deck.
   - Duration: Phase 1 (0.8s), Phase 2 (1.0s).

- Cards appear side-by-side (Music, About, Galery) in horizontal layout
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
   - Selected card animates: glides to a fixed position on the left (aligned with where the middle card would be), regardless of which card was clicked.
   - Other cards smoothly close their gaps and stack behind the active card with progressively smaller offsets (opacity 0.4–0.6)
   - Content view fades/slides in from the right in sync with the card stack motion
   - Duration: 1s smooth transition with `power2.inOut` easing
   - Now in "content" view showing information about selected section

### Content View (Information)

5. **User views content in content view**
   - Content placeholder shows selected card's title and information
   - Background remains visible with overlay
   - Selected card stack stays on the left so the user keeps context of their selection
   - Full-screen overlay listens for outside clicks (while the content panel itself blocks propagation)
   - Two ways to exit:
     - Click outside content panel (on overlay/background) → returns cards to original grid
   - Navigate to different section → replaces content

### Return to Cards (Content Close)

6. **User clicks outside the content area**
   - Content view fades/closes while the left-hand stack eases back toward center
   - Cards glide back to horizontal grid layout with reversing offsets
   - Animations reverse: cards scale back to 1.0, move to original positions
   - Duration: 1s with stagger effect (0.05s delay)
   - Back in "cards" view

### Return to Logo (Cards Close)

7. **User clicks outside cards area (on background)**
   - **Phase 1 (Gather):** Cards animate back into a single deck at the center (Inverse of Distribution).
   - **Phase 2 (Disappear):** Once gathered, the deck shrinks and fades away as a single unit (Inverse of Appearance).
   - Duration: Phase 1 (1.0s), Phase 2 (0.8s) with `power2.inOut` easing.
   - Once cards disappear, logo reappears at the center.
   - Logo animates: reverse fan-opening effect (scale 0→1, rotation 360°→0) at the center.
   - Logo moves back to its initial position at the bottom.
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
5. Expand the site with additional sections (music, about, galery, etc) after the home screen is approved.

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

### Linting & Type Checking Requirement (CI parity)

- Before merging, run linting and type checks locally and fix any issues to match CI expectations.
- Commands to run locally:
  - `npm run lint` (runs ESLint and applies `--fix` where safe)
  - `npm run type-check` (runs `vue-tsc` to validate TypeScript across `.vue` files)
- CI will run the same checks; ensure your branch is free of lint/type errors to avoid CI failures.
- When adding new components or modifying existing ones, include a local run of these checks as part of your pre-commit routine.

### Pre-commit hooks (Husky + lint-staged)

We recommend using `husky` + `lint-staged` to automatically run linters and formatters on staged files.

1. Install the tools locally (one-time):

```powershell
npm install --save-dev husky lint-staged
npx husky init
```

The `.husky/pre-commit` hook is already included in the repository and configured to run `npx lint-staged`.

2. What the hook does:

- Runs `eslint --fix` and `prettier --write` on staged JS/TS/Vue files.
- Runs `prettier --write` on staged CSS/SCSS/Markdown/JSON files.

3. Test the hook:

```powershell
git add src/somefile.ts
git commit -m "test"
```

The pre-commit hook should run automatically and auto-fix any lint/format issues.

4. Note about editor settings:

- Do not enable `formatOnSave` in your editor for this project (we prefer hooking formatting via `pre-commit`), but you may enable ESLint auto-fix on save if desired. The repo already includes `prettier` and ESLint rules to maintain consistent style.

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
