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
- Use Vitest for unit tests: `npm run test`
- Run with coverage: `npm run test:coverage`
- Ensure tests pass before committing: tests verify functionality, props, events, and responsive behavior

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