import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Box, Button, Heading, VStack, Text, Spinner } from '@gluestack-ui/themed';
import { Camera, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import CanvasOverlay, { type Box as OverlayBoxType } from '../Components/CanvasOverlay';
import { ScanMenu } from '../types/common';

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

const CameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [boxes, setBoxes] = useState<OverlayBoxType[]>([]);
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
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}>
        <Heading size="md" color="$textLight50">No camera permission ({hasPermission})</Heading>
        <Heading mt={8} size="sm" color="$textLight50">{debugStatus}</Heading>
      </Box>
    );
  }

  if (!device) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}>
        <Spinner size="large" color="$primary600" />
        <Text color="$textLight50" mt={12}>Loading camera...</Text>
        <Text color="$textLight50" mt={8}>Gefundene Kameras:</Text>
        {Object.values(devices).length === 0 ? (
          <Text color="$textLight50" mt={8}>Keine Kameras gefunden.</Text>
        ) : (
          <VStack mt={8} space="xs">
            {Object.entries(devices).map(([key, dev]) => (
              <Text color="$textLight50" key={key}>
                {key}: {dev?.name || 'Unbekannt'} ({dev?.position || 'unknown'})
              </Text>
            ))}
          </VStack>
        )}
      </Box>
    );
  }

  if (!selectedMenu) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}> 
        <Heading size="lg" color="$textLight50" mb={24}>Was möchten Sie scannen?</Heading>
        <VStack space="md" w="$5/6">
          {(['injection','dosing','holdingPressure','cylinderHeating'] as ScanMenu[]).map((menu) => (
            <Button key={menu} onPress={() => setSelectedMenu(menu)} action="primary" variant="solid">
              <Text style={{ color: '#fff', textTransform: 'capitalize' }}>{menu}</Text>
            </Button>
          ))}
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundDark950">
      <Camera
        style={{ width: '100%', height: '100%' }}
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

      <Box position="absolute" top={24} left={20}>
        <Button size="sm" variant="solid" action="secondary" onPress={() => setSelectedMenu(null)}>
          <Text color="$textLight50" textTransform="capitalize">{selectedMenu} · Ändern</Text>
        </Button>
      </Box>

      {!sixtyFpsFormat && (
        <Box position="absolute" bottom={32} left={0} right={0} alignItems="center">
          <Text color="$textLight50" bg="$backgroundDark700" px={8} py={6} borderRadius="$md">
            60fps not supported, using default format
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default CameraScreen; 