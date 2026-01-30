## Plan: Frisches Band Website - Vue.js Implementation

Build a Vue.js website for rock band Frisches with a card dealer-themed home screen as proof of concept, using media resources from "Witch Hunting" animated clip. Use GSAP for animations and Vitest for testing. Deploy to DigitalOcean with parallel testing environment. Focus on mobile-responsive, minimalistic design.

### Steps

1. **Initialize Vue 3 + Vite project** - Run `npm create vue@latest` in workspace, select TypeScript, Vue Router, and Pinia options, install GSAP (`npm install gsap`) and Vitest dependencies (`npm install -D vitest @vue/test-utils happy-dom`), configure `vite.config.js` with Vitest globals and happy-dom environment

2. **Organize folder structure and move media files** - Create standard Vue structure with `public/videos/`, `src/assets/images/`, `src/components/`, `src/composables/`, `src/views/`, move `voyante_carte.mp4` and `voyante_carte_zoom.mp4` to `public/videos/`, move all JPG/PNG files to `src/assets/images/`, prepare `public/audio/` directory for future music tracks

3. **Extract design system** - Analyze `Intro_Voyante_00020.jpg` color palette, create `src/assets/styles/variables.css` with CSS custom properties for primary/secondary/accent colors, typography scale, spacing, and brand-consistent design tokens

4. **Build core home screen components** - Create `views/HomeView.vue` as main container, implement `components/CardDealer.vue` with `Intro_Voyante_00020.jpg` background, build `components/MenuCard.vue` for interactive menu items (Music, About, Gallery) using `Voyante_Carte_1/2/3_00000.jpg` images

5. **Implement GSAP animation system** - Create `composables/useGSAP.js` with gsap.context() for cleanup, add card dealing entrance sequence with stagger, hover scale/rotation effects, smooth transitions between states, use gsap.matchMedia() for responsive animation adjustments

6. **Add responsive design and lazy loading** - Implement mobile-first CSS with breakpoints (mobile: <768px, tablet: 768-1024px, desktop: >1024px), add Intersection Observer for lazy video loading with poster images, optimize touch interactions with proper tap targets (min 44x44px), respect prefers-reduced-motion

7. **Write component tests with Vitest** - Create `tests/unit/components/CardDealer.test.js` and `MenuCard.test.js` testing mount behavior, prop handling, user interactions (click, hover), ensure components render correctly on different viewport sizes

8. **Configure CI/CD with GitHub Actions** - Create `.github/workflows/ci.yml` for lint + Vitest on push/PR with coverage reports, create `.github/workflows/deploy.yml` for DigitalOcean deployment (build Vite production bundle, rsync/SCP to droplet, or use DigitalOcean App Platform), optionally add Netlify/Vercel for parallel testing environment

### Further Considerations

1. **Testing environment strategy** - Use Netlify (free tier, automatic PR previews) or Vercel (optimized Vite builds) for parallel testing alongside DigitalOcean production? Both provide instant preview URLs for each commit.

2. **DigitalOcean deployment method** - DigitalOcean App Platform (automated, git-connected, $5/month) or manual Droplet setup (more control, requires nginx config, SSL setup)? App Platform is simpler for CI/CD integration.

3. **Video handling in deployment** - Since videos will be compressed later, should we set up separate object storage (DigitalOcean Spaces CDN) for media files to reduce app bundle size and improve delivery speed?
