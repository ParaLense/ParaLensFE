import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import CanvasOverlay, { Box } from '../Components/CanvasOverlay';
import { ScanMenu } from '../types/common';

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

const CameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ScanMenu | null>(null);
  const devices = useCameraDevices();
  const device = useCameraDevice('back');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status);
      setDebugStatus(`Camera.requestCameraPermission() returned: ${status}`);
    })();
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    console.log('Frame:', frame.width, frame.height);
  }, []);

  const sixtyFpsFormat = device?.formats?.find(f => f?.maxFps >= 60);

  if (!['authorized', 'granted'].includes(hasPermission)) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera permission ({hasPermission})</Text>
        <Text style={styles.text}>{debugStatus}</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={styles.text}>Loading camera...</Text>
        <Text style={styles.text}>Gefundene Kameras:</Text>
        {Object.values(devices).length === 0 ? (
          <Text style={styles.text}>Keine Kameras gefunden.</Text>
        ) : (
          Object.entries(devices).map(([key, dev]) => (
            <Text style={styles.text} key={key}>
              {key}: {dev?.name || 'Unbekannt'} ({dev?.position || 'unknown'})
            </Text>
          ))
        )}
      </ScrollView>
    );
  }

  if (!selectedMenu) {
    return (
      <View style={[styles.center, { backgroundColor: '#111' }]}> 
        <Text style={[styles.text, { marginBottom: 24 }]}>Was möchten Sie scannen?</Text>
        <View style={styles.menuGrid}>
          {(['injection','dosing','holdingPressure','cylinderHeating'] as ScanMenu[]).map((menu) => (
            <TouchableOpacity key={menu} style={styles.menuButton} onPress={() => setSelectedMenu(menu)}>
              <Text style={styles.menuButtonText}>{menu}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        {...(sixtyFpsFormat ? { format: sixtyFpsFormat, fps: 60 } : {})}
      />

      <CanvasOverlay
        menu={selectedMenu}
        onBoxesChange={setBoxes}
        isActive={true}
      />

      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>{selectedMenu}</Text>
        <TouchableOpacity style={styles.changeButton} onPress={() => setSelectedMenu(null)}>
          <Text style={styles.changeButtonText}>Ändern</Text>
        </TouchableOpacity>
      </View>

      {!sixtyFpsFormat && (
        <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', backgroundColor: '#222a', padding: 8, borderRadius: 8 }}>
            60fps not supported, using default format
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  menuGrid: {
    width: '90%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  menuButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    width: '100%',
  },
  menuButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  controls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerPill: {
    position: 'absolute',
    top: 24,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00000088',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ffffff55',
    gap: 10,
  },
  headerPillText: {
    color: '#fff',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  changeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CameraScreen; 