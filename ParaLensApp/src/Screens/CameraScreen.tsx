import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Box, Button, Heading, VStack, HStack, Text as GluestackText, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, Input, InputField } from '@gluestack-ui/themed';
import { Camera, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CanvasOverlay, { type Box as OverlayBoxType } from '../Components/CanvasOverlay';
import { ScanDto, ScanMenu } from '../types/common';
import ScanReviewScreen from './ScanReviewScreen';
import { useApiContext } from '../contexts/ApiContext';
import { getCurrentDateFormatted } from '../utils/dateUtils';

// Types for modes
type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

type InjectionMode = 'mainMenu' | 'subMenuGraphic' | 'switchType' | null;
type HoldingPressureMode = 'mainMenu' | 'subMenuGraphic' | null;
type DosingMode = 'mainMenu' | 'subMenuGraphic' | null;

const CameraScreen = () => {
  const { scanService } = useApiContext();
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [boxes, setBoxes] = useState<OverlayBoxType[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ScanMenu | null>(null);
  const [injectionMode, setInjectionMode] = useState<InjectionMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingPressureMode>(null);
  const [dosingMode, setDosingMode] = useState<DosingMode>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [scans, setScans] = useState<ScanDto[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [isLoadingScans, setIsLoadingScans] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newAuthor, setNewAuthor] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(getCurrentDateFormatted());

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

  useEffect(() => {
    const loadScans = async () => {
      try {
        setIsLoadingScans(true);
        const all = await scanService.getAllScans();
        setScans(all);
        if (all.length > 0 && selectedScanId === null) {
          setSelectedScanId(all[0].id);
        }
      } catch (e) {
        // silent for now
      } finally {
        setIsLoadingScans(false);
      }
    };
    loadScans();
  }, [scanService]);

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
    setIsReviewOpen(false);
  };

  const handleCreateNewScan = () => {
    setShowCreateForm(true);
    setNewAuthor('');
    setNewDate(getCurrentDateFormatted());
  };

  const submitCreateNewScan = async () => {
    if (!newAuthor.trim()) return;
    try {
      const created = await scanService.createScan({ author: newAuthor.trim(), date: newDate });
      setScans((prev) => [created, ...prev]);
      setSelectedScanId(created.id);
      setShowCreateForm(false);
    } catch (e) {
      // ignore for now
    }
  };

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(' · ');
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

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
        <Heading size="lg" color="$textLight50" mb={16}>Scan auswählen</Heading>
        <HStack space="md" alignItems="center" mb={24} w="$5/6">
          <Box flex={1}>
            <Select selectedValue={selectedScanId?.toString() ?? ''} onValueChange={(v)=>setSelectedScanId(v ? Number(v) : null)}>
              <SelectTrigger>
                <SelectInput placeholder={isLoadingScans ? 'Lade Scans…' : (scans.length ? 'FullScan wählen' : 'Keine Scans – neu erstellen')} />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  {scans.map((s) => (
                    <SelectItem key={s.id} label={`#${s.id} · ${s.author} · ${s.date}`} value={s.id.toString()} />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </Box>
          <Button size="sm" variant="solid" action="primary" onPress={handleCreateNewScan}>
            <GluestackText color="$textLight50">＋</GluestackText>
          </Button>
        </HStack>

        {showCreateForm && (
          <Box w="$5/6" bg="$backgroundDark900" px={12} py={12} borderRadius="$md" mb={16}>
            <VStack space="md">
              <Input>
                <InputField placeholder="Autor" value={newAuthor} onChangeText={setNewAuthor} color="$textLight50" placeholderTextColor="#9aa0a6" />
              </Input>
              <Input>
                <InputField placeholder="YYYY-MM-DD" value={newDate} onChangeText={setNewDate} color="$textLight50" placeholderTextColor="#9aa0a6" />
              </Input>
              <HStack space="md" justifyContent="flex-end">
                <Button variant="outline" action="secondary" onPress={() => setShowCreateForm(false)}>
                  <GluestackText color="$textLight50">Abbrechen</GluestackText>
                </Button>
                <Button action="primary" variant="solid" onPress={submitCreateNewScan}>
                  <GluestackText color="$textLight50">Erstellen</GluestackText>
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}

        <Heading size="lg" color="$textLight50" mb={16}>Was möchten Sie scannen?</Heading>
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
              disabled={!selectedScanId}
            >
              <GluestackText color="$textLight50" textTransform="capitalize">{menu}</GluestackText>
            </Button>
          ))}
        </VStack>
      </Box>
    );
  }

  // Injection single-step mode selection
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

  // Dosing single-step mode selection
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

  // Externalized review screen
  if (isReviewOpen) {
    return (
      <ScanReviewScreen
        selectedMenu={selectedMenu}
        injectionMode={injectionMode}
        holdingMode={holdingMode}
        dosingMode={dosingMode}
        scanId={selectedScanId}
        onBack={() => setIsReviewOpen(false)}
        onSave={() => { resetToRootMenu(); }}
      />
    );
  }

  // Camera experience (default and after selection)
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
            {headerLabel ? `${headerLabel} · Ändern` : 'Ändern'}
          </GluestackText>
        </Button>
      </Box>

      {(injectionMode || holdingMode || dosingMode || selectedMenu === 'cylinderHeating') && (
        <Box position="absolute" bottom={32} left={0} right={0} alignItems="center">
          <HStack space="md">
            <Button variant="outline" action="secondary" onPress={() => setIsReviewOpen(true)}>
              <GluestackText color="$textLight50">Continue</GluestackText>
            </Button>
          </HStack>
        </Box>
      )}

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