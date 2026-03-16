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
    nearest.withinGeofence = nearest.distance <= nearest.radiusFt;
  }

  return nearest;
}

// Get all locations within geofence range
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
      return { ...loc, distance: Math.round(dist), withinGeofence: dist <= loc.radiusFt };
    })
    .filter((loc) => loc.withinGeofence)
    .sort((a, b) => a.distance - b.distance);
}
