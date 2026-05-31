import { openMapsUrl } from '../utils/maps';

interface Props {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  /** Approximate zoom level — controls the bbox width around the marker. */
  zoom?: number;
  className?: string;
  label?: string;
}

/**
 * Interactive embedded OSM map with a marker on (lat,lng).
 * Uses the official openstreetmap.org embed (no API key required).
 * Includes a small "Abrir en Maps" overlay link that opens Google Maps
 * (iOS will redirect to Apple Maps).
 */
export default function VenueMapThumb({
  lat,
  lng,
  width = 320,
  height = 200,
  zoom = 16,
  className,
  label = 'Abrir en Maps',
}: Props) {
  // Convert zoom to a degree delta for the bbox. Roughly: 1 unit of zoom ≈
  // doubles the area shown. At zoom 16 we want ~0.005 degrees of span.
  const span = 0.005 * Math.pow(2, 16 - zoom);
  const left = lng - span;
  const right = lng + span;
  const top = lat + span / 2;
  const bottom = lat - span / 2;

  const bbox = `${left},${bottom},${right},${top}`;
  const embedSrc =
    `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}` +
    `&layer=mapnik&marker=${lat},${lng}`;
  const openUrl = openMapsUrl(lat, lng);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 border-pmbo-primary bg-gray-100 ${className ?? ''}`}
      style={{ width, maxWidth: '100%' }}
    >
      <iframe
        title={label}
        src={embedSrc}
        width={width}
        height={height}
        loading="lazy"
        style={{ border: 0, display: 'block', width: '100%', height }}
        // sandbox left default; OSM embed needs scripts to be interactive
        // referrerPolicy keeps things tidy
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-1 right-1 bg-black/75 hover:bg-black text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded shadow"
        title={label}
      >
        ABRIR EN MAPS ↗
      </a>
    </div>
  );
}
