// Helpers for handling venue location: parse coords from various map URL
// formats and build OSM static-map thumbnails.

export interface LatLng {
  lat: number;
  lng: number;
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Try to extract a (lat, lng) pair from arbitrary user input.
 * Supports:
 *   - Raw "18.0716, -66.9624" or "18.0716 -66.9624"
 *   - Google Maps URLs:
 *       https://www.google.com/maps/@18.0716,-66.9624,17z
 *       https://www.google.com/maps/place/Foo/@18.07,-66.96,17z
 *       https://www.google.com/maps?q=18.0716,-66.9624
 *       https://maps.google.com/?ll=18.07,-66.96
 *   - Apple Maps URLs:
 *       https://maps.apple.com/?ll=18.0716,-66.9624
 *       https://maps.apple.com/?q=18.0716,-66.9624
 *       https://maps.apple.com/?sll=18.07,-66.96
 *
 * Short links (maps.app.goo.gl, maps.apple.com/p/xxxx) cannot be expanded
 * client-side; this returns null for those.
 */
export function parseLatLng(input: string | undefined | null): LatLng | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  // 1) Raw "lat,lng" or "lat lng"
  const raw = s.match(new RegExp(`^\\s*${NUM}\\s*[,\\s]\\s*${NUM}\\s*$`));
  if (raw) {
    return validate(parseFloat(raw[1]), parseFloat(raw[2]));
  }

  // 2) Google Maps "@lat,lng" inside the path
  const gAt = s.match(new RegExp(`/maps[^@]*@${NUM},${NUM}`));
  if (gAt) return validate(parseFloat(gAt[1]), parseFloat(gAt[2]));

  // 3) ?q=lat,lng (Google or Apple)
  const qLat = s.match(new RegExp(`[?&]q=${NUM},${NUM}`));
  if (qLat) return validate(parseFloat(qLat[1]), parseFloat(qLat[2]));

  // 4) ?ll=lat,lng or ?sll=lat,lng (Apple/Google)
  const llLat = s.match(new RegExp(`[?&]s?ll=${NUM},${NUM}`));
  if (llLat) return validate(parseFloat(llLat[1]), parseFloat(llLat[2]));

  // 5) ?center=lat,lng (static map style)
  const cLat = s.match(new RegExp(`[?&]center=${NUM},${NUM}`));
  if (cLat) return validate(parseFloat(cLat[1]), parseFloat(cLat[2]));

  return null;
}

function validate(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Build a free OSM static-map URL with a red pin centered on (lat,lng).
 * staticmap.openstreetmap.de does not require an API key.
 */
export function osmStaticMapUrl(
  lat: number,
  lng: number,
  opts: { width?: number; height?: number; zoom?: number } = {},
): string {
  const w = opts.width ?? 320;
  const h = opts.height ?? 160;
  const z = opts.zoom ?? 16;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(z),
    size: `${w}x${h}`,
    markers: `${lat},${lng},red-pushpin`,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}

/**
 * Open-in-maps URL. Uses a universal `?q=lat,lng` that works on iOS, Android
 * and desktop (mobile OS picks the native maps app).
 */
export function openMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
