import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Box, Button, Heading, HStack, Input, InputField, Text as GluestackText, VStack, Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@gluestack-ui/themed';
import { Camera, useCameraDevice, useCameraDevices } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TemplateLayout } from '../hooks/useTemplateLayout';
import { ScanMenu } from '../types/common';
import ScanReviewScreen from './ScanReviewScreen';

import UiScannerCamera from '../Components/UiScannerCamera.tsx';
import { useFullScan } from '../contexts/FullScanContext';


// Types for modes


type InjectionMode = 'mainMenu' | 'subMenuGraphic' | 'switchType' | null;
type HoldingPressureMode = 'mainMenu' | 'subMenuGraphic' | null;
type DosingMode = 'mainMenu' | 'subMenuGraphic' | null;

const CameraScreen = () => {
'worklet';

  const [selectedMenu, setSelectedMenu] = useState<ScanMenu | null>(null);
  const [injectionMode, setInjectionMode] = useState<InjectionMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingPressureMode>(null);
  const [dosingMode, setDosingMode] = useState<DosingMode>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  const devices = useCameraDevices();
  const device = useCameraDevice('back');
  const insets = useSafeAreaInsets();




  const { fullScans, selectedFullScanId, selectFullScan, createFullScan } = useFullScan();
  const [authorInput, setAuthorInput] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!selectedFullScanId) return fullScans.length ? 'Full Scan auswählen' : 'Kein Full Scan vorhanden';
    const fs = fullScans.find(f => f.id === selectedFullScanId);
    return fs ? `${fs.author || 'Unbekannt'} · ${new Date(fs.date).toLocaleString()}` : 'Full Scan auswählen';
  }, [selectedFullScanId, fullScans]);

  const resetToRootMenu = () => {
    setSelectedMenu(null);
    setInjectionMode(null);
    setHoldingMode(null);
    setDosingMode(null);
    setIsReviewOpen(false);
  };

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(' · ');
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  const currentLayout: TemplateLayout | null = useMemo(() => {
    if (!selectedMenu) return null;
    if (selectedMenu === 'injection') {
      if (injectionMode === 'subMenuGraphic') return TemplateLayout.InjectionSpeed_ScrollBar;
      if (injectionMode === 'switchType') return TemplateLayout.Injection_SwitchType;
      return TemplateLayout.Injection;
    }
    if (selectedMenu === 'holdingPressure') {
      if (holdingMode === 'subMenuGraphic') return TemplateLayout.HoldingPressure_ScrollBar;
      return TemplateLayout.HoldingPressure;
    }
    if (selectedMenu === 'dosing') {
      if (dosingMode === 'subMenuGraphic') return TemplateLayout.Dosing_ScrollBar;
      return TemplateLayout.Dosing;
    }
    if (selectedMenu === 'cylinderHeating') {
      return TemplateLayout.CylinderHeating;
    }
    return null;
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

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
        <VStack w="$5/6" mb={20} space="sm">
          <Heading size="sm" color="$textLight50">Full Scan wählen</Heading>
          <HStack space="sm" alignItems="center">
            <Button flex={1} variant="outline" action="secondary" onPress={() => setIsPickerOpen(true)}>
              <GluestackText color="$textLight50" numberOfLines={1}>{selectedLabel}</GluestackText>
            </Button>
            <Button variant="solid" action="primary" px={12} onPress={() => setIsAddOpen(true)}>
              <GluestackText color="$textLight50" fontWeight="$bold">+</GluestackText>
            </Button>
          </HStack>
        </VStack>

        {/* FullScan Picker Modal */}
        <Modal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)}>
          <ModalBackdrop />
          <ModalContent>
            <ModalHeader>
              <Heading size="md">Full Scan auswählen</Heading>
            </ModalHeader>
            <ModalBody>
              <VStack space="sm">
                {fullScans.length === 0 && (
                  <GluestackText color="$textLight500">Keine Full Scans vorhanden</GluestackText>
                )}
                {fullScans.map((fs) => {
                  const isSelected = selectedFullScanId === fs.id;
                  return (
                    <Button key={fs.id} variant={isSelected ? 'solid' : 'outline'} action={isSelected ? 'primary' : 'secondary'} onPress={() => { selectFullScan(fs.id); setIsPickerOpen(false); }}>
                      <GluestackText color={isSelected ? '$textLight50' : '$textDark900'}>{fs.author || 'Unbekannt'} · {new Date(fs.date).toLocaleString()}</GluestackText>
                    </Button>
                  );
                })}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" action="secondary" onPress={() => setIsPickerOpen(false)}>
                <GluestackText color="$textLight50">Schließen</GluestackText>
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
          <ModalBackdrop />
          <ModalContent>
            <ModalHeader>
              <Heading size="md">Neuen Full Scan erstellen</Heading>
            </ModalHeader>
            <ModalBody>
              <Input>
                <InputField value={authorInput} onChangeText={setAuthorInput} placeholder="Autor" />
              </Input>
            </ModalBody>
            <ModalFooter>
              <HStack space="sm">
                <Button variant="outline" action="secondary" onPress={() => { setIsAddOpen(false); setAuthorInput(''); }}>
                  <GluestackText color="$textLight50">Abbrechen</GluestackText>
                </Button>
                <Button onPress={() => { const name = authorInput.trim() || 'Unbekannt'; createFullScan(name); setAuthorInput(''); setIsAddOpen(false); }}>
                  <GluestackText color="$textLight50">Erstellen</GluestackText>
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
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
        onBack={() => setIsReviewOpen(false)}
        onSave={() => { resetToRootMenu(); }}
      />
    );
  }

  // Camera experience (default and after selection)
  return (
    <Box flex={1} bg="$backgroundDark950">

      <UiScannerCamera
        currentLayout={currentLayout ?? TemplateLayout.ScreenDetection }

        //Camera props
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        enableFpsGraph={true}
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
    </Box>
  );
};

export default CameraScreen;