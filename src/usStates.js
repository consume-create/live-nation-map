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
