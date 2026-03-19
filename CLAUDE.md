# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173) - serves at /map/ base path
npm run build     # Production build to /dist
npm run preview   # Preview production build locally
npm run studio    # Run Sanity Studio CMS (cd sanity && sanity dev)
```

## Architecture Overview

Interactive 3D venue map for Live Nation built with React 19, Three.js (via React Three Fiber), and Sanity CMS. Deployed to Netlify.

### Tech Stack
- **React 19.2.0** with React Router DOM 7.9.4
- **Three.js 0.180.0** / **@react-three/fiber 9.3.0** / **@react-three/drei 10.7.6**
- **Vite 7.1.9** as build tool (base path: `/map/`)
- **Sanity** headless CMS (studio in `/sanity/`, dataset: `production`)
- **Netlify** for deployment with SPA routing

### Application Structure

**Entry Flow**: `src/main.jsx` → `src/App.jsx` (BrowserRouter with `basename="/map"`)

**Routes**:
- `/` → MapPage: 3D interactive US map (desktop) or accordion list (mobile)
- `/venue/:slug` → VenuePage (lazy-loaded): Hero with SVG animation, gallery, about module

**Data Flow**:
1. App.jsx fetches all venues on mount via `fetchMapPoints()` in `src/services/mapPoints.js`
2. GROQ query returns mapPoint documents with resolved image assets and metadata
3. `mapToRenderable()` transforms lat/lng to 3D coordinates via `latLonTo3D()`
4. Data passed to pages as props: `mapPoints`, `pointsLoading`, `pointsError`
5. Both `fetchMapPoints()` and `fetchSiteSettings()` use module-level caching to avoid redundant requests

---

## Sanity CMS Integration

### Environment Variables (`.env`)
```
VITE_SANITY_PROJECT_ID=<your-project-id>
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2024-05-01
VITE_SANITY_READ_TOKEN=<your-read-token>
VITE_SANITY_USE_CDN=true
```

### Schema: `mapPoint` Document Type

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Venue name (required) |
| `slug` | slug | URL identifier, auto-generated from title |
| `state` | string | US state (dropdown, 50 options) |
| `city` | string | City name |
| `region` | string | 'west', 'central', or 'east' (required) |
| `location` | geopoint | Lat/lng coordinates (required) |
| `heroImage` | image | Main hero image with hotspot (required) |
| `heroLineAnimation` | image | SVG for line drawing animation |
| `logoTexture` | image | Logo for flashlight reveal effect |
| `gallery` | array | Up to 12 gallery items with position metadata |
| `aboutModule` | object | Video, videoPoster, description, services, partners, crew |
| `description` | text | Short text description at document level |

### `siteSettings` Singleton

Global settings including SEO metadata, mobile map image, and `audioPlaylist[]` (array of audio files for background music).

### Dev Proxy

In dev mode, `src/lib/sanityClient.js` rewrites Sanity API URLs (`*.sanity.io`) to same-origin so Vite can proxy them (avoids CORS). This only applies to API calls through the Sanity client, not direct asset fetches.

---

## 3D Rendering Architecture

### Coordinate System
- **Projection**: Normalized Mercator-like (lat/lng → 3D world coordinates)
- **US Bounds**: Lon [-125, -66] → X [-300, 300], Lat [24, 49] → Y [-200, 200]
- **Function**: `latLonTo3D(lon, lat)` returns `[x, y]` for 2D plane at Z=0
- **MapPoint Z-offset**: Markers positioned at `z=12.5` above map surface

### Key 3D Components

**USMap.jsx** - Extruded US map from GeoJSON with ExtrudeGeometry (depth: 4, bevel: 0.2)

**MapPoint.jsx** - 3-ring venue markers with staggered entrance animation (`easeOutQuart`), idle pulse, hover/select states, and screen-space projection via `useFrame`

**CameraController.jsx** - Animated camera transitions (~3s, `easeInOutCubic`). Reuses `Vector3` instances via refs to avoid GC pressure in `useFrame`.

**MapCursorTilt.jsx** - Subtle parallax tilt of the map group based on cursor position (max ~1.4°)

**FlashlightPlane.jsx** - Custom GLSL shader for logo sweep effect on venue pages

### Point Spacing Algorithm (MapPage.jsx)
`resolveSpacedPoints()` prevents marker overlap with 8 iterations of force-directed positioning, clamped to US_BOUNDS.

### Memory Management
All 3D components dispose geometries/materials in `useEffect` cleanup.

---

## Page Transition & Animation Architecture

### Navigation Pattern
`src/utils/navigateWithFade.js` provides `navigateWithFade(navigate, path)` — fades `document.body` opacity to 0, navigates after 350ms, restores opacity. Self-cancelling: each call clears pending timers from previous invocations. Used by BackButton, NextUpModule, SiteHeader, RegionAccordion.

### VenuePage Hero Animation State Machine
The hero SVG line-drawing animation uses a multi-stage reveal chain. **Critical pattern**: `allowLineAnimation` is derived from `lineAnimationSlug === slug` (not a boolean) so it's synchronously `false` when the slug changes during venue-to-venue navigation. This prevents stale-state issues where effects from the previous venue would fire the animation prematurely.

**State chain**: `showHeroLoader` → `heroLoaderRendered` (450ms fade) → `heroVisible` (`HERO_REVEAL_FADE_MS` delay) → `lineAnimationSlug` set (`HERO_REVEAL_SLIDE_MS` delay) → `shouldAnimate` becomes true → `HeroSVGAnimator` runs CSS stroke-dashoffset animation.

**Opacity layers**: The hero art stage has a single opacity wrapper (`heroArtStageStyle`). Do NOT duplicate this opacity inside `HeroArtLayers` — compound opacity makes the animation invisible during fade-in.

### MapPage Selection Overlay
Connector line between venue card and 3D pin uses an SVG `<path>` with rAF-driven draw animation. Uses `drawCancelledRef` guard to prevent orphaned animation frames when switching pins rapidly.

### Audio Player
`src/hooks/useAudioPlayer.js` uses a module-level `Audio` singleton that persists across route changes. Fetches playlist from Sanity (`siteSettings.audioPlaylist`) with local manifest fallback. Volume stored in `localStorage`.

---

## Styling System

### Design Tokens (`src/constants/theme.js`)
- **Colors**: `BACKGROUND_DARK` (#000), `TEXT_WHITE` (#fff), `ACCENT_RED` (#ff2b2b)
- **Breakpoints**: `MOBILE` (768px), `TABLET` (900px), `DESKTOP` (1024px)
- **Z-Index**: `CURSOR` (90) → `SELECTION_OVERLAY` (130) → `HEADER` (200) → `SPLASH` (9999)
- **Animations**: Duration strings (`QUICK`/`STANDARD`/`SLOW`) and millisecond values (`HERO_LOADER_MIN_MS`: 1500, `HERO_REVEAL_FADE_MS`: 500)

### CSS Architecture
- **Inline styles** (React style objects) — no CSS-in-JS library
- **Global CSS** (`src/global.css`): CSS custom properties (`--color-accent`, `--color-text`), Poppins font via Typekit, hover effects for BackButton and NextUpModule
- **Responsive**: `clamp()` for fluid spacing, conditional rendering at breakpoints via `useViewportWidth()`
- **LQIP loading**: 20px blur placeholder → fade to full image (ResponsiveImage component)

---

## Build & Deployment

### Vite Configuration (`vite.config.js`)
- Base path: `/map/`
- GLSL files included as assets
- Manual chunks: `three-vendor`, `lottie`, `gsap`
- VenuePage is lazy-loaded (`React.lazy`) with `preloadVenuePage()` called on pin click

### Netlify Routing (`public/_redirects`)
```
/map/assets/*  /assets/:splat  200
/              /map/           301
/map/*         /index.html    200
```

---

## Key Patterns

### Responsive Design
- Mobile detection: `useViewportWidth()` < 768px
- Desktop: Full 3D canvas with MapPoint selection + SelectionOverlay
- Mobile: MobileMapView with static map image + RegionAccordion components

### Hooks
| Hook | Returns | Purpose |
|------|---------|---------|
| `useViewportWidth` | number | Current viewport width (SSR-safe, default 1440) |
| `useScrollDirection` | 'up' \| 'down' | Scroll direction with threshold (40px default) |
| `useAudioPlayer` | `{ isPlaying, volume, togglePlayPause, startPlayback, setVolume, hasInteracted }` | Background music singleton |

---

## Environment Setup

1. Clone repository
2. Copy `.env.example` to `.env` (or create with Sanity credentials)
3. `npm install`
4. `npm run dev` → http://localhost:5173/map/

For Sanity Studio:
1. `cd sanity && npm install`
2. `npm run dev` → http://localhost:3333/
