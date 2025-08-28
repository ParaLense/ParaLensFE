import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Box, Button, Heading, VStack, HStack, Text as GluestackText, Input, InputField, Pressable } from '@gluestack-ui/themed';
import Icon from 'react-native-vector-icons/Feather';
import { Camera, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CanvasOverlay, { type Box as OverlayBoxType } from '../Components/CanvasOverlay';
import { ScanMenu } from '../types/common';

// Types for modes
type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

type InjectionMode = 'mainMenu' | 'subMenuGraphic' | 'switchType' | null;
type HoldingPressureMode = 'mainMenu' | 'subMenuGraphic' | null;
type DosingMode = 'mainMenu' | 'subMenuGraphic' | null;

// Form models (only the fields needed for Create* requests)
interface InjectionMainMenuForm { sprayPressureLimit: string; increasedSpecificPointPrinter: string; }
interface InjectionSwitchTypeForm { transshipmentPosition: string; switchOverTime: string; switchingPressure: string; }
interface IndexValuePair { index: string; v?: string; v2?: string; t?: string; p?: string; }

interface DosingMainMenuForm {
  dosingStroke: string;
  dosingDelayTime: string;
  relieveDosing: string;
  relieveAfterDosing: string;
  dischargeSpeedBeforeDosing: string;
  dischargeSpeedAfterDosing: string;
}

interface HoldingMainMenuForm { holdingTime: string; coolTime: string; screwDiameter: string; }
interface CylinderHeatingMainMenuForm { setpoint1: string; setpoint2: string; setpoint3: string; setpoint4: string; setpoint5: string; }

const CameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [boxes, setBoxes] = useState<OverlayBoxType[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<ScanMenu | null>(null);
  const [injectionMode, setInjectionMode] = useState<InjectionMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingPressureMode>(null);
  const [dosingMode, setDosingMode] = useState<DosingMode>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  // Forms state
  const [injMainForm, setInjMainForm] = useState<InjectionMainMenuForm>({ sprayPressureLimit: '', increasedSpecificPointPrinter: '' });
  const [injSwitchForm, setInjSwitchForm] = useState<InjectionSwitchTypeForm>({ transshipmentPosition: '', switchOverTime: '', switchingPressure: '' });
  const [injGraphicValues, setInjGraphicValues] = useState<IndexValuePair[]>([{ index: '1', v: '', v2: '' }]);

  const [doseMainForm, setDoseMainForm] = useState<DosingMainMenuForm>({ dosingStroke: '', dosingDelayTime: '', relieveDosing: '', relieveAfterDosing: '', dischargeSpeedBeforeDosing: '', dischargeSpeedAfterDosing: '' });
  const [doseSpeedValues, setDoseSpeedValues] = useState<IndexValuePair[]>([{ index: '1', v: '', v2: '' }]);
  const [dosePressureValues, setDosePressureValues] = useState<IndexValuePair[]>([{ index: '1', v: '', v2: '' }]);

  const [holdMainForm, setHoldMainForm] = useState<HoldingMainMenuForm>({ holdingTime: '', coolTime: '', screwDiameter: '' });
  const [holdGraphicValues, setHoldGraphicValues] = useState<IndexValuePair[]>([{ index: '1', t: '', p: '' }]);
  const [cylinderForm, setCylinderForm] = useState<CylinderHeatingMainMenuForm>({ setpoint1: '', setpoint2: '', setpoint3: '', setpoint4: '', setpoint5: '' });

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

  const resetReviewForms = () => {
    setInjMainForm({ sprayPressureLimit: '', increasedSpecificPointPrinter: '' });
    setInjSwitchForm({ transshipmentPosition: '', switchOverTime: '', switchingPressure: '' });
    setInjGraphicValues([{ index: '1', v: '', v2: '' }]);

    setDoseMainForm({ dosingStroke: '', dosingDelayTime: '', relieveDosing: '', relieveAfterDosing: '', dischargeSpeedBeforeDosing: '', dischargeSpeedAfterDosing: '' });
    setDoseSpeedValues([{ index: '1', v: '', v2: '' }]);
    setDosePressureValues([{ index: '1', v: '', v2: '' }]);

    setHoldMainForm({ holdingTime: '', coolTime: '', screwDiameter: '' });
    setHoldGraphicValues([{ index: '1', t: '', p: '' }]);
    setCylinderForm({ setpoint1: '', setpoint2: '', setpoint3: '', setpoint4: '', setpoint5: '' });
  };

  const resetToRootMenu = () => {
    setSelectedMenu(null);
    setInjectionMode(null);
    setHoldingMode(null);
    setDosingMode(null);
    setIsReviewOpen(false);
    resetReviewForms();
  };

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(' · ');
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  // Helpers to render dynamic list editors
  const renderIndexValueRows = (rows: IndexValuePair[], setRows: (r: IndexValuePair[]) => void, labels: { v?: string; v2?: string; t?: string; p?: string }) => (
    <VStack space="sm">
      {rows.map((row, i) => (
        <HStack key={i} space="sm" alignItems="center" justifyContent="space-between">
          <HStack space="sm" alignItems="center" flex={1}>
            <Box px={10} py={10} bg="$backgroundDark800" borderRadius="$sm">
              <GluestackText color="$textLight50">{i + 1}</GluestackText>
            </Box>
            {labels.v !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.v} value={row.v || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), v: txt }; setRows(copy);
              }} /></Input>
            )}
            {labels.v2 !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.v2} value={row.v2 || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), v2: txt }; setRows(copy);
              }} /></Input>
            )}
            {labels.t !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.t} value={row.t || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), t: txt }; setRows(copy);
              }} /></Input>
            )}
            {labels.p !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.p} value={row.p || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), p: txt }; setRows(copy);
              }} /></Input>
            )}
          </HStack>
          <Pressable
            accessibilityLabel="Zeile löschen"
            onPress={() => {
              const filtered = rows.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, index: String(idx + 1) }));
              setRows(filtered.length ? filtered : [{ index: '1' } as IndexValuePair]);
            }}
            disabled={rows.length <= 1}
            opacity={rows.length <= 1 ? 0.4 : 1}
          >
            <Icon name="trash-2" size={20} color="#fff" />
          </Pressable>
        </HStack>
      ))}
      <HStack mt={4} alignItems="center" justifyContent="flex-start">
        <Pressable
          accessibilityLabel="Zeile hinzufügen"
          onPress={() => {
            const nextIndex = rows.length + 1;
            setRows([...rows, { index: String(nextIndex) } as IndexValuePair]);
          }}
        >
          <HStack space="sm" alignItems="center">
            <Icon name="plus" size={20} color="#fff" />
            <GluestackText color="$textLight50">Zeile hinzufügen</GluestackText>
          </HStack>
        </Pressable>
      </HStack>
    </VStack>
  );

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

  // When review is open, show the dynamic form for the chosen type/mode
  if (isReviewOpen) {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }} style={{ backgroundColor: '#000' }}>
        <Box px={20}>
          <Heading size="lg" color="$textLight50" mb={16}>Review · {headerLabel}</Heading>

          {selectedMenu === 'injection' && injectionMode === 'mainMenu' && (
            <VStack space="md">
              <Input><InputField keyboardType="numeric" placeholder="Spray Pressure Limit" value={injMainForm.sprayPressureLimit} onChangeText={(t)=>setInjMainForm({...injMainForm, sprayPressureLimit: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Increased Specific Point Printer" value={injMainForm.increasedSpecificPointPrinter} onChangeText={(t)=>setInjMainForm({...injMainForm, increasedSpecificPointPrinter: t})} /></Input>
            </VStack>
          )}

          {selectedMenu === 'injection' && injectionMode === 'subMenuGraphic' && (
            <VStack space="md">
              <Heading size="sm" color="$textLight50">Werte (Index, v, v2)</Heading>
              {renderIndexValueRows(injGraphicValues, setInjGraphicValues, { v: 'v', v2: 'v2' })}
            </VStack>
          )}

          {selectedMenu === 'injection' && injectionMode === 'switchType' && (
            <VStack space="md">
              <Input><InputField keyboardType="numeric" placeholder="Transshipment Position" value={injSwitchForm.transshipmentPosition} onChangeText={(t)=>setInjSwitchForm({...injSwitchForm, transshipmentPosition: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Switch Over Time" value={injSwitchForm.switchOverTime} onChangeText={(t)=>setInjSwitchForm({...injSwitchForm, switchOverTime: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Switching Pressure" value={injSwitchForm.switchingPressure} onChangeText={(t)=>setInjSwitchForm({...injSwitchForm, switchingPressure: t})} /></Input>
            </VStack>
          )}

          {selectedMenu === 'holdingPressure' && holdingMode === 'mainMenu' && (
            <VStack space="md">
              <Input><InputField keyboardType="numeric" placeholder="Holding Time" value={holdMainForm.holdingTime} onChangeText={(t)=>setHoldMainForm({...holdMainForm, holdingTime: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Cool Time" value={holdMainForm.coolTime} onChangeText={(t)=>setHoldMainForm({...holdMainForm, coolTime: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Screw Diameter" value={holdMainForm.screwDiameter} onChangeText={(t)=>setHoldMainForm({...holdMainForm, screwDiameter: t})} /></Input>
            </VStack>
          )}

          {selectedMenu === 'holdingPressure' && holdingMode === 'subMenuGraphic' && (
            <VStack space="md">
              <Heading size="sm" color="$textLight50">Werte (Index, t, p)</Heading>
              {renderIndexValueRows(holdGraphicValues, setHoldGraphicValues, { t: 't', p: 'p' })}
            </VStack>
          )}

          {selectedMenu === 'dosing' && dosingMode === 'mainMenu' && (
            <VStack space="md">
              <Input><InputField keyboardType="numeric" placeholder="Dosing Stroke" value={doseMainForm.dosingStroke} onChangeText={(t)=>setDoseMainForm({...doseMainForm, dosingStroke: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Dosing Delay Time" value={doseMainForm.dosingDelayTime} onChangeText={(t)=>setDoseMainForm({...doseMainForm, dosingDelayTime: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Relieve Dosing" value={doseMainForm.relieveDosing} onChangeText={(t)=>setDoseMainForm({...doseMainForm, relieveDosing: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Relieve After Dosing" value={doseMainForm.relieveAfterDosing} onChangeText={(t)=>setDoseMainForm({...doseMainForm, relieveAfterDosing: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Discharge Speed Before" value={doseMainForm.dischargeSpeedBeforeDosing} onChangeText={(t)=>setDoseMainForm({...doseMainForm, dischargeSpeedBeforeDosing: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Discharge Speed After" value={doseMainForm.dischargeSpeedAfterDosing} onChangeText={(t)=>setDoseMainForm({...doseMainForm, dischargeSpeedAfterDosing: t})} /></Input>
            </VStack>
          )}

          {selectedMenu === 'dosing' && dosingMode === 'subMenuGraphic' && (
            <VStack space="lg">
              <VStack space="md">
                <Heading size="sm" color="$textLight50">Dosing Speed (Index, v, v2)</Heading>
                {renderIndexValueRows(doseSpeedValues, setDoseSpeedValues, { v: 'v', v2: 'v2' })}
              </VStack>
              <VStack space="md">
                <Heading size="sm" color="$textLight50">Dosing Pressure (Index, v, v2)</Heading>
                {renderIndexValueRows(dosePressureValues, setDosePressureValues, { v: 'v', v2: 'v2' })}
              </VStack>
            </VStack>
          )}

          {selectedMenu === 'cylinderHeating' && (
            <VStack space="md">
              <Input><InputField keyboardType="numeric" placeholder="Setpoint 1" value={cylinderForm.setpoint1} onChangeText={(t)=>setCylinderForm({...cylinderForm, setpoint1: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Setpoint 2" value={cylinderForm.setpoint2} onChangeText={(t)=>setCylinderForm({...cylinderForm, setpoint2: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Setpoint 3" value={cylinderForm.setpoint3} onChangeText={(t)=>setCylinderForm({...cylinderForm, setpoint3: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Setpoint 4" value={cylinderForm.setpoint4} onChangeText={(t)=>setCylinderForm({...cylinderForm, setpoint4: t})} /></Input>
              <Input><InputField keyboardType="numeric" placeholder="Setpoint 5" value={cylinderForm.setpoint5} onChangeText={(t)=>setCylinderForm({...cylinderForm, setpoint5: t})} /></Input>
            </VStack>
          )}

          <HStack space="md" mt={24} alignItems="center" justifyContent="space-between">
            <Button variant="outline" action="secondary" onPress={() => setIsReviewOpen(false)}>
              <GluestackText color="$textLight50">Zurück</GluestackText>
            </Button>
            <Button action="primary" variant="solid" onPress={() => { /* integrate save later */ resetReviewForms(); resetToRootMenu(); }}>
              <GluestackText color="$textLight50">Speichern</GluestackText>
            </Button>
          </HStack>
        </Box>
      </ScrollView>
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