export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}
export function locationNote(value: LocationSnapshot | null) {
  if (!value) return "Location not included. Ask me for a landmark.";
  if (
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    !Number.isFinite(value.accuracy) ||
    value.accuracy < 0 ||
    !Number.isFinite(value.timestamp) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180
  )
    return "Location unavailable.";
  return `Location captured ${new Date(value.timestamp).toLocaleTimeString()}: ${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)} (estimated accuracy ±${Math.max(1, Math.round(value.accuracy))} m).\nhttps://www.google.com/maps?q=${value.latitude.toFixed(6)},${value.longitude.toFixed(6)}\nThis is a snapshot, not live tracking.`;
}
export function emergencyPhoneHref(number: string) {
  const clean = number.replace(/[\s().-]/g, "");
  return /^\+?\d{3,15}$/.test(clean) ? `tel:${clean}` : null;
}
export function emergencyNote(note: string, location: LocationSnapshot | null) {
  return `Please contact me. I need support.\n${note.trim().slice(0, 700)}\n${locationNote(location)}\nCocoon has not dispatched emergency services.`;
}
