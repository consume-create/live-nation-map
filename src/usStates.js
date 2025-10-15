// Simplified US state coordinates for the continental US
// Format: [longitude, latitude] - we'll convert these to 3D positions
export const stateCoordinates = {
  'California': [-119.4179, 36.7783],
  'Texas': [-99.9018, 31.9686],
  'Florida': [-81.5158, 27.6648],
  'New York': [-75.5268, 43.2994],
  'Illinois': [-89.3985, 40.6331],
  'Pennsylvania': [-77.1945, 41.2033],
  'Ohio': [-82.9071, 40.4173],
  'Georgia': [-83.5002, 32.1656],
  'North Carolina': [-79.0193, 35.7596],
  'Michigan': [-84.5361, 44.3148],
  'Washington': [-120.7401, 47.7511],
  'Arizona': [-111.0937, 34.0489],
  'Massachusetts': [-71.3824, 42.4072],
  'Colorado': [-105.5478, 39.5501],
  'Oregon': [-120.5542, 43.8041],
};

// Simplified US outline as SVG path (continental US)
// This is a very simplified version - you can replace with more detailed GeoJSON
export const usOutlinePath = `
M 100 50
L 120 45 L 140 48 L 160 45 L 180 50 L 200 48 L 220 52 L 240 50 L 260 55
L 280 52 L 300 58 L 320 55 L 340 60 L 360 58 L 380 62 L 400 65
L 420 70 L 440 75 L 460 80 L 480 85 L 500 90 L 520 95 L 540 100
L 555 110 L 565 120 L 575 135 L 580 150 L 585 165 L 588 180
L 590 195 L 588 210 L 585 225 L 580 240 L 575 255 L 570 265
L 560 275 L 545 280 L 530 285 L 515 288 L 500 290 L 485 288
L 470 285 L 455 282 L 440 280 L 425 282 L 410 285 L 395 288
L 380 290 L 365 292 L 350 290 L 335 287 L 320 285 L 305 288
L 290 290 L 275 288 L 260 285 L 245 282 L 230 278 L 215 275
L 200 270 L 185 265 L 170 258 L 155 250 L 140 240 L 125 230
L 110 218 L 100 205 L 92 190 L 88 175 L 85 160 L 83 145
L 82 130 L 83 115 L 85 100 L 88 85 L 92 70 L 96 60
Z
`;

// US bounds for coordinate conversion
export const US_BOUNDS = {
  minLon: -125,
  maxLon: -66,
  minLat: 24,
  maxLat: 49,
  width: 600,  // Width in 3D units
  height: 400, // Height in 3D units
};

// Convert lat/lon to 3D coordinates
export function latLonTo3D(lon, lat) {
  const { minLon, maxLon, minLat, maxLat, width, height } = US_BOUNDS;

  const x = ((lon - minLon) / (maxLon - minLon)) * width - width / 2;
  const y = ((lat - minLat) / (maxLat - minLat)) * height - height / 2;

  return [x, y];
}
