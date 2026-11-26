// Replaces the template's launch screen (a placeholder grid image stretched
// full-screen) with plain black, so opening the app goes straight to a black
// screen that matches the camera UI. On Android 12+ it also hides the system
// launch icon. The unused splash logo files are deleted.
const fs = require('fs');
const path = require('path');
const { withAndroidStyles, withAndroidColors, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const BG = '@color/splashscreen_background';
const SPLASH_ITEMS = {
  'android:windowBackground': BG,
  'android:windowSplashScreenBackground': BG,
  'android:windowSplashScreenAnimatedIcon': '@android:color/transparent',
};

const withBlackSplashStyle = (config) =>
  withAndroidStyles(config, (cfg) => {
    const parent = { name: 'Theme.App.SplashScreen', parent: 'AppTheme' };
    for (const [name, value] of Object.entries(SPLASH_ITEMS)) {
      cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
        add: true,
        parent,
        name,
        value,
        // windowSplashScreen* attrs only exist on API 31+; older Android ignores them.
        ...(name.startsWith('android:windowSplashScreen') && { targetApi: '31' }),
      });
    }
    return cfg;
  });

const withBlackSplashColor = (config) =>
  withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'splashscreen_background',
      value: '#000000',
    });
    return cfg;
  });

const withoutSplashLogo = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      for (const dir of fs.readdirSync(res)) {
        if (dir.startsWith('drawable')) fs.rmSync(path.join(res, dir, 'splashscreen_logo.png'), { force: true });
      }
      // Unused template layer-list that only wraps the splash logo.
      fs.rmSync(path.join(res, 'drawable/ic_launcher_background.xml'), { force: true });
      return cfg;
    },
  ]);

module.exports = (config) => withoutSplashLogo(withBlackSplashColor(withBlackSplashStyle(config)));
