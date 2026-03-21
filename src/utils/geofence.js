// Haversine distance in feet
export function distanceFt(lat1, lng1, lat2, lng2) {
  const R = 20902231; // Earth radius in feet
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find nearest project/location within geofence
// If a project has a perimeter polygon, use point-in-polygon for geofence check
export function findNearestGeofence(lat, lng, projects, companyLocations) {
  const allLocations = [
    ...projects
      .filter((p) => p.lat && p.lng)
      .map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        radiusFt: p.radiusFt || 1000,
        perimeter: p.perimeter || null,
        type: "project",
      })),
    ...(companyLocations || []).map((loc) => ({
      ...loc,
      type: loc.type || "company",
    })),
  ];

  let nearest = null;
  let nearestDist = Infinity;

  for (const loc of allLocations) {
    const dist = distanceFt(lat, lng, loc.lat, loc.lng);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = { ...loc, distance: Math.round(dist) };
    }
  }

  if (nearest) {
    // Use polygon perimeter if available, otherwise fall back to radius
    if (nearest.perimeter && nearest.perimeter.length >= 3) {
      nearest.withinGeofence = pointInPolygon(lat, lng, nearest.perimeter);
    } else {
      nearest.withinGeofence = nearest.distance <= nearest.radiusFt;
    }
  }

  return nearest;
}

// Point-in-polygon test using ray casting algorithm
// polygon is an array of [lat, lng] pairs
export function pointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calculate polygon area in square feet using the Shoelace formula
// with lat/lng converted to approximate feet
export function polygonAreaSqFt(polygon) {
  if (!polygon || polygon.length < 3) return 0;
  // Convert lat/lng to approximate feet from first point
  const refLat = polygon[0][0];
  const latToFt = 364567.2; // ~feet per degree latitude
  const lngToFt = Math.cos(refLat * Math.PI / 180) * 364567.2;
  const pts = polygon.map(([lat, lng]) => [
    (lat - polygon[0][0]) * latToFt,
    (lng - polygon[0][1]) * lngToFt,
  ]);
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  }
  return Math.abs(area / 2);
}

// Get all locations within geofence range
// Uses polygon perimeter when available, otherwise radius
export function getLocationsInRange(lat, lng, projects, companyLocations) {
  const allLocations = [
    ...projects
      .filter((p) => p.lat && p.lng)
      .map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        radiusFt: p.radiusFt || 1000,
        perimeter: p.perimeter || null,
        type: "project",
      })),
    ...(companyLocations || []).map((loc) => ({
      ...loc,
      type: loc.type || "company",
    })),
  ];

  return allLocations
    .map((loc) => {
      const dist = distanceFt(lat, lng, loc.lat, loc.lng);
      const inPerimeter = loc.perimeter && loc.perimeter.length >= 3
        ? pointInPolygon(lat, lng, loc.perimeter)
        : false;
      const withinGeofence = inPerimeter || dist <= loc.radiusFt;
      return { ...loc, distance: Math.round(dist), withinGeofence };
    })
    .filter((loc) => loc.withinGeofence)
    .sort((a, b) => a.distance - b.distance);
}
