import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView } from 'react-native';
import { Camera, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

const CameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
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

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        {...(sixtyFpsFormat ? { format: sixtyFpsFormat, fps: 60 } : {})}
      />
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
});

export default CameraScreen; 