import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { tileXY } from './geo';

type Props = { lat: number; lng: number; size: number; zoom?: number };

// Esri World Imagery satellite tiles: no API key, attribution required.
// Note the {z}/{y}/{x} order. For a commercial release, check Esri's terms
// (an ArcGIS account may be needed) or swap in another satellite provider.
const TILE_URL = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const ATTRIBUTION = '© Esri';
const HEADERS = { 'User-Agent': 'GeoCam/1.0 (Android)' };

/** Static mini map built from a 2x2 block of tiles, centred on the point. */
function MiniMap({ lat, lng, size, zoom = 17 }: Props) {
  const t = size * 1.25; // rendered tile size; must be >= size to cover the box
  const { x, y } = tileXY(lat, lng, zoom);
  const tx = Math.floor(x - 0.5);
  const ty = Math.floor(y - 0.5);
  // Offset that puts the GPS point at the centre of the box.
  const left = size / 2 - (x - tx) * t;
  const top = size / 2 - (y - ty) * t;

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {[0, 1].map((dx) =>
        [0, 1].map((dy) => (
          <Image
            key={`${dx}${dy}`}
            source={{ uri: TILE_URL(zoom, tx + dx, ty + dy), headers: HEADERS }}
            style={{ position: 'absolute', width: t, height: t, left: left + dx * t, top: top + dy * t }}
          />
        )),
      )}
      <View style={[styles.pin, { left: size / 2 - 7, top: size / 2 - 18 }]}>
        <View style={styles.pinHead}>
          <View style={styles.pinDot} />
        </View>
        <View style={styles.pinTip} />
      </View>
      <Text allowFontScaling={false} style={styles.attr}>{ATTRIBUTION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', borderRadius: 6, backgroundColor: '#cfd8dc' },
  pin: { position: 'absolute', width: 14, alignItems: 'center' },
  pinHead: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#e53935',
    alignItems: 'center', justifyContent: 'center',
  },
  pinDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7f0000' },
  pinTip: {
    width: 0, height: 0, marginTop: -3,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#e53935',
  },
  attr: {
    position: 'absolute', right: 2, bottom: 1, fontSize: 6, color: '#333',
    backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 2,
  },
});

export default memo(MiniMap);
