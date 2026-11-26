import { memo, useMemo } from 'react';
import { View } from 'react-native';
import qrcode from 'qrcode-generator';

type Props = { value: string; size: number };

/**
 * QR code drawn with plain Views (no react-native-svg dependency).
 * Each row is run-length encoded, so a typical code is ~300 views, not ~1000.
 */
function QrCode({ value, size }: Props) {
  const rows = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const out: { start: number; len: number }[][] = [];
    for (let r = 0; r < n; r++) {
      const runs: { start: number; len: number }[] = [];
      let c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) { c++; continue; }
        const start = c;
        while (c < n && qr.isDark(r, c)) c++;
        runs.push({ start, len: c - start });
      }
      out.push(runs);
    }
    return out;
  }, [value]);

  const cell = size / rows.length;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff' }}>
      {rows.map((runs, r) =>
        runs.map(({ start, len }) => (
          <View
            key={`${r}-${start}`}
            style={{
              position: 'absolute',
              top: r * cell,
              left: start * cell,
              width: len * cell + 0.5, // overlap a hair to hide seams
              height: cell + 0.5,
              backgroundColor: '#000',
            }}
          />
        )),
      )}
    </View>
  );
}

export default memo(QrCode);
