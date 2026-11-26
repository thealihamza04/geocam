// Trims native code this app doesn't use.
// - expo-camera ships as a prebuilt AAR on Android; package.json forces it to
//   build from source so the scanner flags apply. They keep the ML Kit barcode
//   and document-scanner libraries out of the APK.
// - GIF/WebP decoders for <Image>: map tiles are PNG and photos are JPEG.
const { withGradleProperties, AndroidConfig } = require('expo/config-plugins');

const PROPS = {
  'expo.camera.barcode-scanner-enabled': 'false',
  'expo.camera.document-scanner-enabled': 'false',
  'expo.gif.enabled': 'false',
  'expo.webp.enabled': 'false',
};

module.exports = (config) =>
  withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPS)) {
      cfg.modResults = AndroidConfig.BuildProperties.updateAndroidBuildProperty(cfg.modResults, key, value);
    }
    return cfg;
  });
