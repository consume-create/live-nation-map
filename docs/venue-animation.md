# Venue Hero Line Animation

This page documents how the hero SVG artwork and the animated line overlay load on each venue page along with a few debugging tips.

## Asset requirements
- **Hero art + line overlay must be SVGs.** Files are fetched in `src/pages/VenuePage.jsx` and rejected if the MIME type is not `image/svg+xml`.
- **Matching dimensions.** Upload hero artwork and the optional line overlay with the same artboard so the overlay aligns with the static hero art.
- **Simple strokes.** The animator only targets `path`, `line`, `polyline`, and `polygon` nodes that have a stroke or a `stroke-width`. Remove embedded rasters, `<mask>`, or complex filters when possible.

## Local verification
1. Run `npm run dev` and open `/venue/<slug>`.
2. The loader stays visible for at least 3 seconds. Once the hero art finishes downloading, it schedules a hide even if the overlay SVG is still loading.
3. When the overlay is ready, the `<svg>` rendered by `HeroSVGAnimator` receives `data-hero-line-state="animating"`. Inspect the DOM to confirm `stroke-dashoffset` transitions toward `0`.
4. Toggle "Reduce Motion" in the OS accessibility settings to verify the overlay renders statically (`data-hero-line-state="static"`).

## Troubleshooting checklist
- If no lines animate, look for `data-hero-line-state="empty"`. That means the SVG lacked stroked geometry—often caused by outlines being flattened to fills.
- If the loader never hides, check the console for `[VenuePage] Hero asset load failed`. The hero art fetch controls loader dismissal; the overlay cannot block it.
- The animated overlay sanitizes the SVG with `DOMParser`, stripping width/height attributes. If the art scales incorrectly, make sure the source SVG already includes a correct `viewBox`.
