// Pure helpers: no React, no native modules (unit-testable in plain Node).

const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

/**
 * Open Location Code ("Plus Code") encoder.
 * Returns the 11-character code, e.g. "8J3F5476+C9V".
 */
export function encodePlusCode(lat: number, lng: number): string {
  lat = Math.min(90, Math.max(-90, lat));
  if (lat === 90) lat -= 0.000125 / 5; // keep inside the last cell
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;

  // Work in integers to avoid floating-point drift.
  // 10 pair digits -> 1/8000 deg; 1 grid digit -> lat /5, lng /4.
  // Round at 1e-6 first (as the reference implementation does) so values like
  // 3704639.9999999995 land in the right cell.
  let latVal = Math.floor(Math.round((lat + 90) * 8000 * 5 * 1e6) / 1e6);
  let lngVal = Math.floor(Math.round((lng + 180) * 8000 * 4 * 1e6) / 1e6);

  const grid = OLC_ALPHABET[(latVal % 5) * 4 + (lngVal % 4)];
  latVal = Math.floor(latVal / 5);
  lngVal = Math.floor(lngVal / 4);

  let pairs = '';
  for (let i = 0; i < 5; i++) {
    pairs = OLC_ALPHABET[latVal % 20] + OLC_ALPHABET[lngVal % 20] + pairs;
    latVal = Math.floor(latVal / 20);
    lngVal = Math.floor(lngVal / 20);
  }
  return `${pairs.slice(0, 8)}+${pairs.slice(8)}${grid}`;
}

/** Short (locality-relative) form, e.g. "5476+C9V". */
export function shortPlusCode(lat: number, lng: number): string {
  return encodePlusCode(lat, lng).slice(4);
}

/** Fractional slippy-map tile coordinates (Web Mercator). */
export function tileXY(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  };
}

/** Great-circle distance in metres. */
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000;
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "Wednesday, 25/11/2026 07:41 PM" */
export function formatStamp(d: Date): string {
  const h = d.getHours();
  const h12 = h % 12 || 12;
  return (
    `${DAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(h12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`
  );
}

/** Regional-indicator flag emoji from an ISO country code ("PK" -> 🇵🇰). */
export function flagEmoji(isoCountryCode: string | null | undefined): string {
  if (!isoCountryCode || !/^[a-z]{2}$/i.test(isoCountryCode)) return '';
  return String.fromCodePoint(
    ...isoCountryCode.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
