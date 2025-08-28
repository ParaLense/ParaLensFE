import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Box, Button, Heading, VStack, HStack, Text as GluestackText } from '@gluestack-ui/themed';
import { Camera, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CanvasOverlay, { type Box as OverlayBoxType } from '../Components/CanvasOverlay';
import { ScanMenu } from '../types/common';

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

type InjectionMode = 'mainMenu' | 'subMenuGraphic' | 'switchType' | null;
type HoldingPressureMode = 'mainMenu' | 'subMenuGraphic' | null;
type DosingMode = 'mainMenu' | 'subMenuGraphic' | null;

const CameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [boxes, setBoxes] = useState<OverlayBoxType[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ScanMenu | null>(null);
  const [injectionMode, setInjectionMode] = useState<InjectionMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingPressureMode>(null);
  const [dosingMode, setDosingMode] = useState<DosingMode>(null);
  const devices = useCameraDevices();
  const device = useCameraDevice('back');
  const insets = useSafeAreaInsets();

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

  const resetToRootMenu = () => {
    setSelectedMenu(null);
    setInjectionMode(null);
    setHoldingMode(null);
    setDosingMode(null);
  };

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
      <ScrollView contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 24 }}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <GluestackText color="$textLight50" fontSize="$lg" mt={16}>Loading camera...</GluestackText>
        <GluestackText color="$textLight50" fontSize="$lg" mt={16}>Gefundene Kameras:</GluestackText>
        {Object.values(devices).length === 0 ? (
          <GluestackText color="$textLight50" fontSize="$lg" mt={16}>Keine Kameras gefunden.</GluestackText>
        ) : (
          Object.entries(devices).map(([key, dev]) => (
            <GluestackText color="$textLight50" fontSize="$lg" mt={16} key={key}>
              {key}: {dev?.name || 'Unbekannt'} ({dev?.position || 'unknown'})
            </GluestackText>
          ))
        )}
      </ScrollView>
    );
  }

  // Root selection screen
  if (!selectedMenu) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}> 
        <Heading size="lg" color="$textLight50" mb={24}>Was möchten Sie scannen?</Heading>
        <VStack space="md" w="$5/6">
          {(['injection','dosing','holdingPressure','cylinderHeating'] as ScanMenu[]).map((menu) => (
            <Button 
              key={menu} 
              onPress={() => {
                if (menu === 'injection') {
                  setSelectedMenu('injection');
                  setInjectionMode(null); // show injection mode selection next
                } else if (menu === 'holdingPressure') {
                  setSelectedMenu('holdingPressure');
                  setHoldingMode(null); // show holding pressure selection next
                } else if (menu === 'dosing') {
                  setSelectedMenu('dosing');
                  setDosingMode(null); // show dosing selection next
                } else {
                  setSelectedMenu(menu);
                }
              }} 
              action="primary" 
              variant="solid"
            >
              <GluestackText color="$textLight50" textTransform="capitalize">{menu}</GluestackText>
            </Button>
          ))}
        </VStack>
      </Box>
    );
  }

  if (selectedMenu === 'injection' && injectionMode === null) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}>
        <Heading size="lg" color="$textLight50" mb={24}>Injection · Auswahl</Heading>
        <VStack space="md" w="$5/6">
          <Button action="primary" variant="solid" onPress={() => setInjectionMode('mainMenu')}>
            <GluestackText color="$textLight50">Main Menu</GluestackText>
          </Button>
          <Button action="primary" variant="solid" onPress={() => setInjectionMode('subMenuGraphic')}>
            <GluestackText color="$textLight50">Sub Menu Graphic</GluestackText>
          </Button>
          <Button action="primary" variant="solid" onPress={() => setInjectionMode('switchType')}>
            <GluestackText color="$textLight50">Switch Type</GluestackText>
          </Button>
        </VStack>
        <Button mt={24} variant="outline" action="secondary" onPress={resetToRootMenu}>
          <GluestackText color="$textLight50">Zurück</GluestackText>
        </Button>
      </Box>
    );
  }

  // Holding Pressure (Nachdruck) single-step mode selection
  if (selectedMenu === 'holdingPressure' && holdingMode === null) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}>
        <Heading size="lg" color="$textLight50" mb={24}>Nachdruck · Auswahl</Heading>
        <VStack space="md" w="$5/6">
          <Button action="primary" variant="solid" onPress={() => setHoldingMode('mainMenu')}>
            <GluestackText color="$textLight50">Main Menu</GluestackText>
          </Button>
          <Button action="primary" variant="solid" onPress={() => setHoldingMode('subMenuGraphic')}>
            <GluestackText color="$textLight50">Sub Menu Graphic</GluestackText>
          </Button>
        </VStack>
        <Button mt={24} variant="outline" action="secondary" onPress={resetToRootMenu}>
          <GluestackText color="$textLight50">Zurück</GluestackText>
        </Button>
      </Box>
    );
  }

  if (selectedMenu === 'dosing' && dosingMode === null) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}>
        <Heading size="lg" color="$textLight50" mb={24}>Dosing · Auswahl</Heading>
        <VStack space="md" w="$5/6">
          <Button action="primary" variant="solid" onPress={() => setDosingMode('mainMenu')}>
            <GluestackText color="$textLight50">Main Menu</GluestackText>
          </Button>
          <Button action="primary" variant="solid" onPress={() => setDosingMode('subMenuGraphic')}>
            <GluestackText color="$textLight50">Sub Menu Graphic</GluestackText>
          </Button>
        </VStack>
        <Button mt={24} variant="outline" action="secondary" onPress={resetToRootMenu}>
          <GluestackText color="$textLight50">Zurück</GluestackText>
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundDark950">
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

      <Box position="absolute" top={24 + insets.top} left={20}>
        <Button size="sm" variant="solid" action="secondary" onPress={resetToRootMenu}>
          <GluestackText color="$textLight50" textTransform="capitalize">
            {selectedMenu}
            {injectionMode ? ` · ${injectionMode}` : ''}
            {!injectionMode && holdingMode ? ` · ${holdingMode}` : ''}
            {!injectionMode && !holdingMode && dosingMode ? ` · ${dosingMode}` : ''}
             · Ändern
          </GluestackText>
        </Button>
      </Box>

      {!sixtyFpsFormat && (
        <Box position="absolute" bottom={32} left={0} right={0} alignItems="center">
          <Box bg="$backgroundDark800" px={8} py={8} borderRadius="$md">
            <GluestackText color="$textLight50">
              60fps not supported, using default format
            </GluestackText>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CameraScreen;