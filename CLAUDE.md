# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # Production build to /dist
npm run preview   # Preview production build
npm run studio    # Run Sanity Studio CMS (runs in /sanity subdirectory)
```

## Architecture Overview

This is an interactive 3D venue map for Live Nation built with React 19, Three.js (via React Three Fiber), and Sanity CMS.

### Tech Stack
- **React 19** with React Router DOM for client-side routing
- **Three.js / @react-three/fiber** for 3D graphics
- **Vite** as build tool
- **Sanity** headless CMS (studio lives in `/sanity/` subdirectory)

### Application Structure

**Entry Flow**: `src/main.jsx` → `src/App.jsx`

**Routes**:
- `/` - MapPage: 3D interactive US map with venue points (desktop) or accordion list (mobile)
- `/venue/:slug` - VenuePage: Detailed venue information with hero, gallery, about modules

**Data Flow**:
1. App.jsx fetches all venues from Sanity on mount via `src/services/mapPoints.js`
2. GROQ queries return mapPoint documents with location, media, gallery, aboutModule
3. Data passed down to pages as props
4. Lat/lng coordinates transformed to 3D space in the service layer

### Key Directories

```
src/
├── pages/           # Route pages (MapPage, VenuePage)
├── components/      # Reusable UI (MobileMapView, RegionAccordion)
├── modules/         # Feature modules (SiteHeader, VenueAboutModule, VenueGalleryModule)
├── hooks/           # Custom hooks (useViewportWidth, useScrollDirection)
├── services/        # Data fetching (mapPoints.js)
├── lib/             # Utilities (sanityClient.js)
├── constants/       # Theme values (theme.js)
└── assets/          # Static SVGs
```

### 3D Components (in src/)
- `USMap.jsx` - Renders US map from GeoJSON with Three.js geometries
- `MapPoint.jsx` - 3D venue markers with hover/selection states
- `CameraController.jsx` - Animated camera transitions to venues
- `FlashlightPlane.jsx` - Custom shader for logo reveal effect

## Sanity CMS Integration

**Environment Variables** (in `.env`):
- `VITE_SANITY_PROJECT_ID` - Project ID
- `VITE_SANITY_DATASET` - Dataset name (production)
- `VITE_SANITY_API_VERSION` - API version
- `VITE_SANITY_READ_TOKEN` - Read token

**Schema**: Single `mapPoint` document type defined in `sanity/schemas/mapPoint.ts` containing:
- Basic info (title, slug, city, state, region, location coordinates)
- Media (heroImage, heroLineAnimation SVG, logoTexture)
- Gallery array with images and positioning metadata
- aboutModule with video, description, services, partners, crew

## Key Patterns

### Responsive Design
- Mobile breakpoint: 768px (defined in `src/constants/theme.js`)
- Desktop: Full 3D canvas map with point selection
- Mobile: MobileMapView with RegionAccordion component
- `useViewportWidth` hook tracks viewport for conditional rendering

### 3D Rendering
- React Three Fiber for declarative Three.js
- Custom fragment/vertex shaders for effects (flashlight sweep)
- Geometry/material disposal on unmount to prevent memory leaks
- Point spacing algorithm prevents overlapping markers

### Styling
- Inline styles (React style objects) - no CSS-in-JS library
- Global CSS in `src/global.css` with CSS custom properties
- Theme constants in `src/constants/theme.js` (colors, breakpoints, z-index, animations)
- Typekit fonts: Poppins for display and body text

### Animation
- CSS transitions for UI elements
- `useFrame` hook for Three.js animation loops
- Easing functions for camera movement (easeInOutCubic)
- SVG stroke-dasharray animations for line drawing effects
