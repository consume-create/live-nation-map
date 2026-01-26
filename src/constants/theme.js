// Global theme constants for Live Nation Map

// Colors
export const COLORS = {
  BACKGROUND_DARK: '#000000',
  BACKGROUND_ALT: '#000000',
  TEXT_WHITE: '#fff',
  TEXT_WHITE_70: 'rgba(255, 255, 255, 0.7)',
  TEXT_WHITE_85: 'rgba(255, 255, 255, 0.85)',
  ACCENT_RED: '#ff2b2b',
  ACCENT_RED_LIGHT: '#ff6b6b',
  GRID_RED: 'rgba(200, 0, 0, 0.12)',
  BORDER_WHITE_30: 'rgba(255, 255, 255, 0.3)',
  BORDER_WHITE_15: 'rgba(255, 255, 255, 0.15)',
  BORDER_WHITE_08: 'rgba(255, 255, 255, 0.08)',
  OVERLAY_DARK_65: 'rgba(0, 0, 0, 0.65)',
  OVERLAY_DARK_45: 'rgba(0, 0, 0, 0.45)',
}

// Breakpoints (in pixels)
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 900,
  DESKTOP: 1024,
  DEFAULT_WIDTH: 1440,
}

// Z-Index layers
export const Z_INDEX = {
  CURSOR: 90,
  LINE_DRAWING: 110,
  LINE_ENDPOINT: 111,
  SHADER_BUTTON: 120,
  SELECTION_OVERLAY: 130,
  BACK_BUTTON: 195,
  HEADER: 200,
  SHADER_PANEL: 210,
  VENUE_LOADER: 250,
  SPLASH: 9999,
}

// Animation durations
export const ANIMATIONS = {
  QUICK: '0.2s',
  STANDARD: '0.3s',
  SLOW: '0.4s',
  LOADER_FADE: '0.45s',
  MS_500: 500,
  MS_1000: 1000,
  MS_2000: 2000,
  SPLASH_DURATION: 2000,
  SPLASH_REMOVAL: 2600,
  SPLASH_FADE_IN_MS: 50,
  HERO_LOADER_MIN_MS: 1500,
  HERO_REVEAL_FADE_MS: 500,
}

// Common spacing values (in pixels)
export const SPACING = {
  XS: 16,
  SM: 20,
  MD: 32,
  LG: 48,
  XL: 80,
  HEADER_HEIGHT: 180,
}

// Grid background pattern helper
export const GRID_BACKGROUND = {
  image: `
    linear-gradient(${COLORS.GRID_RED} 1px, transparent 1px),
    linear-gradient(90deg, ${COLORS.GRID_RED} 1px, transparent 1px)
  `,
  size: '40px 40px',
}

// 3D Map point marker dimensions
export const MAP_POINT = {
  OUTER_RADIUS: 13,
  MIDDLE_RADIUS: 8.5,
  INNER_RADIUS: 4.5,
  HIT_AREA_RADIUS: 14.5,
  SCALE_IDLE: 0.8,
  SCALE_ACTIVE: 0.95,
  Z_OFFSET: 12.5,
}

// Camera and flashlight settings
export const CAMERA = {
  ZOOM_FACTOR: 0.3,
  FLASHLIGHT_BASE_HEIGHT: 120,
  FLASHLIGHT_SCALE_BASE: 1.1,
  FLASHLIGHT_FOV: 30,
  FLASHLIGHT_DISTANCE: 450,
}

// Gallery layout constants
export const GALLERY = {
  BLOCK_GAP: 100,
  BLOCK_GAP_MOBILE: 48,
  GRID_GAP: 24,
  GRID_GAP_MOBILE: 16,
  HERO_WIDTH: '58%',
  LARGE_WIDTH: '55%',
  MEDIUM_WIDTH: '45%',
  SMALL_WIDTH: '35%',
  FULL_WIDTH: '85%',
  FEATURE_WIDTH_MOBILE: '90%',
  PAIR_LEFT_WIDTH: '42%',
  PAIR_RIGHT_WIDTH: '52%',
}
