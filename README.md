# GeoCam

A lightweight React Native (Expo SDK 58) Android camera that stamps every photo with:

- a satellite mini map with a pin (Esri World Imagery tiles, no API key)
- city / region / country + flag, the street address and Plus Code (Android's built-in geocoder, no API key)
- latitude / longitude
- the weekday, date and time
- a QR code that links to the spot on Google Maps

The live camera preview shows the stamp. Tap the shutter and the stamped photo (16:9) is saved to the gallery as one JPEG automatically.

## Run on a phone (dev build)

```bash
npm install
npx expo run:android          # builds and installs a debug build on a connected device
```

> Expo Go can't run this app because it uses `react-native-view-shot`. Use a dev build as shown above.

## Release APK

```bash
npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease   # needs a full JDK 17+ (with javac); set JAVA_HOME if the default Java is a JRE
# -> android/app/build/outputs/apk/release/app-release.apk
```

To publish, set up your own signing key. The generated project signs release builds with the debug key. You can also use `npx eas-cli@latest build -p android`.

## Why it's small

| Choice | Effect |
|---|---|
| `plugins/withLeanCamera.js` + `buildFromSource: ["expo-camera"]` in package.json | drops the ML Kit barcode and document-scanner libraries. expo-camera ships prebuilt, so it must build from source for these flags to apply. |
| QR drawn with plain `View`s (`qrcode-generator`, pure JS) | no `react-native-svg` native module |
| Map = 4 static tiles via `<Image>` | no Google Maps SDK / react-native-maps |
| Built-in Android `Geocoder` | no Google Places / API key / extra SDK |
| GIF/WebP image decoders off (same plugin) | about 0.8 MB of native code removed (map tiles are PNG) |
| `useLegacyPackaging: true` | native libraries are compressed inside the APK (21.9 MB down to 10.8 MB). Remove it if you only ship an AAB to Play, which compresses downloads itself. |
| R8 minify + resource shrink + PNG crunch | smaller dex and resources |
| `buildArchs: ["arm64-v8a"]` | one ABI instead of four (add `armeabi-v7a` for very old phones) |
| No navigation library, no state library | fewer JS deps |

## Files

- `App.tsx`: permissions, camera screen, preview and save
- `src/GeoStamp.tsx`: the info card overlay
- `src/MiniMap.tsx`: tile-based static map
- `src/QrCode.tsx`: QR renderer built from Views
- `src/useGeoInfo.ts`: GPS watch and reverse geocoding (re-geocodes only after moving 30 m)
- `src/geo.ts`: pure helpers (Plus Code encoder, tile math, date format)

## Notes

- The satellite tiles come from Esri World Imagery. Before a commercial release, check Esri's terms (an ArcGIS account may be needed) or change `TILE_URL` in `src/MiniMap.tsx` to another provider. Keep the attribution.
- The address line needs internet. GPS coordinates, time and the Plus Code work offline.
