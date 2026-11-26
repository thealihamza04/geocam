import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { distanceM, flagEmoji, shortPlusCode } from './geo';

export type GeoInfo = {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** "Kot Radha Kishan, Punjab, Pakistan 🇵🇰" */
  title: string;
  /** "5476+C9V, Mir Sahib Rd, Kot Radha Kishan, Punjab, Pakistan" */
  address: string;
};

// Re-geocode only after moving this far, to save battery/data.
const GEOCODE_EVERY_M = 30;

/** Watches GPS and reverse-geocodes with Android's built-in Geocoder (no API key). */
export function useGeoInfo(enabled: boolean) {
  const [info, setInfo] = useState<GeoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastGeocoded = useRef<{ lat: number; lng: number } | null>(null);
  const place = useRef<{ title: string; tail: string }>({ title: '', tail: '' });

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    const onFix = async ({ coords }: Location.LocationObject) => {
      const { latitude: lat, longitude: lng, accuracy } = coords;
      const prev = lastGeocoded.current;
      if (!prev || distanceM(prev.lat, prev.lng, lat, lng) > GEOCODE_EVERY_M) {
        lastGeocoded.current = { lat, lng };
        try {
          const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (a) {
            const city = a.city ?? a.subregion ?? a.district;
            place.current = {
              title: [city, a.region, a.country].filter(Boolean).join(', ') +
                (a.isoCountryCode ? ` ${flagEmoji(a.isoCountryCode)}` : ''),
              tail: [a.street ?? a.name, city, a.region, a.country].filter(Boolean).join(', '),
            };
          }
        } catch {
          // Offline / geocoder unavailable: fall back to coordinates only.
          lastGeocoded.current = null;
        }
      }
      if (cancelled) return;
      const code = shortPlusCode(lat, lng);
      setInfo({
        lat,
        lng,
        accuracy: accuracy ?? null,
        title: place.current.title || 'Locating address…',
        address: place.current.tail ? `${code}, ${place.current.tail}` : code,
      });
    };

    (async () => {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) onFix(last);
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
          onFix,
          (reason) => setError(reason),
        );
        if (cancelled) sub.remove();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { info, error };
}

/** Current time, refreshed every few seconds (stamp shows minutes). */
export function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
