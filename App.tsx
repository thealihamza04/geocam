import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, ToastAndroid, View,
  type ViewInstance,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import * as Location from 'expo-location';
import { Asset, requestPermissionsAsync as requestMediaPermissions } from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import GeoStamp from './src/GeoStamp';
import { useGeoInfo, useNow, type GeoInfo } from './src/useGeoInfo';

type Shot = { uri: string; width: number; height: number; info: GeoInfo | null; date: Date };

const FLASH_ORDER: FlashMode[] = ['off', 'auto', 'on'];
const FLASH_ICON: Record<string, string> = { off: 'OFF', auto: 'AUTO', on: 'ON' };

export default function App() {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [locPerm, requestLocPerm] = Location.useForegroundPermissions();

  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) requestCamPerm();
  }, [camPerm?.status]);
  useEffect(() => {
    if (camPerm?.granted && locPerm && !locPerm.granted && locPerm.canAskAgain) requestLocPerm();
  }, [camPerm?.granted, locPerm?.status]);

  if (!camPerm || !locPerm) return <View style={styles.root} />;

  if (!camPerm.granted || !locPerm.granted) {
    const blocked = !camPerm.canAskAgain || !locPerm.canAskAgain;
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.permText}>GeoCam needs Camera and Location access to stamp your photos.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => {
            if (blocked) Linking.openSettings();
            else if (!camPerm.granted) requestCamPerm();
            else requestLocPerm();
          }}
        >
          <Text style={styles.btnText}>{blocked ? 'Open Settings' : 'Grant access'}</Text>
        </Pressable>
      </View>
    );
  }

  return <CameraScreen />;
}

function CameraScreen() {
  const { width } = useWindowDimensions();
  const camRef = useRef<CameraView>(null);
  const shotRef = useRef<ViewInstance>(null);
  const { info, error } = useGeoInfo(true);
  const now = useNow();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);

  const frameH = (width * 16) / 9; // camera captures 16:9 (tall), so preview matches the photo

  // Ask for gallery access up front so the first shot saves without a prompt.
  useEffect(() => {
    requestMediaPermissions(true, ['photo']).catch(() => {});
  }, []);

  // Shutter: take the photo, then show it with the stamp frozen at this moment.
  // Once that image has drawn, saveShot() runs on its own; no confirm step.
  const takePhoto = async () => {
    if (!camRef.current || busy) return;
    setBusy(true);
    try {
      const p = await camRef.current.takePictureAsync({ quality: 0.85, shutterSound: true });
      setShot({ uri: p.uri, width: p.width, height: p.height, info, date: new Date() });
    } catch (e) {
      Alert.alert('Capture failed', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const savedUri = useRef<string | null>(null);
  const saveShot = async (s: Shot) => {
    if (savedUri.current === s.uri) return; // onLoadEnd can fire more than once
    savedUri.current = s.uri;
    try {
      const perm = await requestMediaPermissions(true, ['photo']);
      if (!perm.granted) throw new Error('Gallery permission denied');
      // Render photo + stamp into one JPEG at the photo's full resolution.
      const uri = await captureRef(shotRef, {
        format: 'jpg',
        quality: 0.9,
        width: s.width,
        height: s.height,
      });
      await Asset.create(uri);
      ToastAndroid.show('Saved to gallery', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : String(e));
    } finally {
      setShot(null);
      setBusy(false);
    }
  };

  // ---- Live camera (the stamped shot sits on top of it while saving) ----
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.frameWrap}>
        <View style={{ width, height: frameH }}>
          <CameraView
            ref={camRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={flash}
            ratio="16:9"
            animateShutter
            onCameraReady={() => setReady(true)}
          />
          <View style={styles.stampPos} pointerEvents="none">
            <GeoStamp info={info} date={now} width={width} />
          </View>
          {error && <Text style={styles.gpsError}>GPS: {error}</Text>}
          {shot && (
            <View
              ref={shotRef}
              collapsable={false}
              style={{ position: 'absolute', top: 0, left: 0, width, height: width * (shot.height / shot.width) }}
            >
              <Image
                source={{ uri: shot.uri }}
                style={StyleSheet.absoluteFill}
                // Android fades images in over 300 ms by default; capturing mid-fade
                // saved a dark, half-transparent photo. Draw it at full opacity at once.
                fadeDuration={0}
                // Wait one frame after load so the photo is actually drawn before capture.
                onLoadEnd={() => requestAnimationFrame(() => saveShot(shot))}
              />
              <View style={styles.stampPos}>
                <GeoStamp info={shot.info} date={shot.date} width={width} />
              </View>
            </View>
          )}
          {shot && (
            // Outside shotRef so it is not burned into the saved photo.
            <View style={styles.savingBadge} pointerEvents="none">
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.savingText}>Saving…</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setFlash(FLASH_ORDER[(FLASH_ORDER.indexOf(flash) + 1) % FLASH_ORDER.length])}
        >
          <Text style={styles.flashText}>⚡{'\n'}{FLASH_ICON[flash]}</Text>
        </Pressable>
        <Pressable
          style={[styles.shutter, (!ready || busy) && { opacity: 0.5 }]}
          onPress={takePhoto}
          disabled={!ready || busy}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}>
          <Text style={styles.iconText}>⟲</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  frameWrap: { flex: 1, justifyContent: 'center' },
  stampPos: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  gpsError: {
    position: 'absolute', top: 48, alignSelf: 'center', color: '#fff',
    backgroundColor: 'rgba(200,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    paddingTop: 16, paddingBottom: 40, backgroundColor: '#000',
  },
  shutter: {
    width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  iconBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { color: '#fff', fontSize: 20 },
  flashText: { color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  btn: {
    minWidth: 120, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    backgroundColor: '#1e88e5', alignItems: 'center',
  },
  savingBadge: {
    position: 'absolute', top: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  savingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
