import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MiniMap from './MiniMap';
import QrCode from './QrCode';
import { formatStamp } from './geo';
import type { GeoInfo } from './useGeoInfo';

type Props = {
  info: GeoInfo | null;
  date: Date;
  /** Width of the area the stamp sits on; everything scales from it. */
  width: number;
};

/** The info card burned into photos: mini map, address, coordinates, time, QR. */
function GeoStamp({ info, date, width }: Props) {
  const u = width / 360; // design unit: layout was drawn for a 360dp-wide frame
  const mapSize = 76 * u;
  const qrBox = 76 * u;

  return (
    <View style={{ paddingHorizontal: 8 * u, paddingBottom: 10 * u }}>
      <View style={[styles.badge, { marginBottom: 4 * u, paddingHorizontal: 8 * u, paddingVertical: 3 * u, borderRadius: 6 * u }]}>
        <Text allowFontScaling={false} style={[styles.badgeText, { fontSize: 11 * u }]}>📍 GeoCam</Text>
      </View>

      <View style={[styles.card, { padding: 7 * u, borderRadius: 10 * u, gap: 8 * u }]}>
        {info ? (
          <MiniMap lat={info.lat} lng={info.lng} size={mapSize} />
        ) : (
          <View style={[styles.mapPlaceholder, { width: mapSize, height: mapSize, borderRadius: 6 * u }]} />
        )}

        <View style={styles.textCol}>
          <Text allowFontScaling={false} style={[styles.title, { fontSize: 14 * u, lineHeight: 17 * u }]} numberOfLines={2}>
            {info?.title ?? 'Waiting for GPS…'}
          </Text>
          {info && (
            <>
              <Text allowFontScaling={false} style={[styles.body, { fontSize: 9 * u, lineHeight: 12.5 * u, marginTop: 2 * u }]} numberOfLines={2}>
                {info.address}
              </Text>
              <Text allowFontScaling={false} style={[styles.body, { fontSize: 9 * u, lineHeight: 12.5 * u }]}>
                Lat {info.lat.toFixed(6)}° Long {info.lng.toFixed(6)}°
              </Text>
            </>
          )}
          <Text allowFontScaling={false} style={[styles.body, { fontSize: 9 * u, lineHeight: 12.5 * u }]}>{formatStamp(date)}</Text>
        </View>

        <View style={[styles.qrBox, { width: qrBox, height: qrBox, borderRadius: 6 * u, padding: 5 * u }]}>
          {info && <QrCode value={`https://maps.google.com/?q=${info.lat.toFixed(6)},${info.lng.toFixed(6)}`} size={qrBox - 10 * u} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  badgeText: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  mapPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)' },
  textCol: { flex: 1, justifyContent: 'center' },
  title: { color: '#fff', fontWeight: '600' },
  body: { color: '#fff' },
  qrBox: { backgroundColor: '#fff' },
});

export default memo(GeoStamp);
