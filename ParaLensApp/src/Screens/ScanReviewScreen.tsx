import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native';
import { Box, Button, Heading, VStack, HStack, Text as GluestackText, Input, InputField } from '@gluestack-ui/themed';
import type { ScanMenu } from '../types/common';
import DynamicValueList, { IndexValuePair } from '../Components/DynamicValueList';
import { useFullScan } from '../contexts/FullScanContext';
import { useGuide } from '../contexts/GuideContext';
import { useNavigation } from '@react-navigation/native';

type InjectionMode = 'mainMenu' | 'subMenuGraphic' | 'switchType' | null;
type HoldingPressureMode = 'mainMenu' | 'subMenuGraphic' | null;
type DosingMode = 'mainMenu' | 'subMenuGraphic' | null;

interface Props {
  selectedMenu: ScanMenu | null;
  injectionMode: InjectionMode;
  holdingMode: HoldingPressureMode;
  dosingMode: DosingMode;
  payload?: any;
  onBack: () => void;
  onSave: () => void;
}

const ScanReviewScreen: React.FC<Props> = ({ selectedMenu, injectionMode, holdingMode, dosingMode, onBack, onSave }) => {
  const { selectedFullScanId, upsertSection } = useFullScan();
  const guide = useGuide();
  const navigation = useNavigation();
  const shouldHL = guide.shouldHighlight;
  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(' · ');
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  const [injMainForm, setInjMainForm] = useState({ sprayPressureLimit: '', increasedSpecificPointPrinter: '' });
  const [injSwitchForm, setInjSwitchForm] = useState({ transshipmentPosition: '', switchOverTime: '', switchingPressure: '' });
  const [injGraphicValues, setInjGraphicValues] = useState<IndexValuePair[]>([{ index: '1', v: '', v2: '' }]);

  const [doseMainForm, setDoseMainForm] = useState({ dosingStroke: '', dosingDelayTime: '', relieveDosing: '', relieveAfterDosing: '', dischargeSpeedBeforeDosing: '', dischargeSpeedAfterDosing: '' });
  const [doseSpeedValues, setDoseSpeedValues] = useState<IndexValuePair[]>([{ index: '1', v: '', v2: '' }]);
  const [dosePressureValues, setDosePressureValues] = useState<IndexValuePair[]>([{ index: '1', v: '', v2: '' }]);

  const [holdMainForm, setHoldMainForm] = useState({ holdingTime: '', coolTime: '', screwDiameter: '' });
  const [holdGraphicValues, setHoldGraphicValues] = useState<IndexValuePair[]>([{ index: '1', t: '', p: '' }]);

  const [cylinderForm, setCylinderForm] = useState({ setpoint1: '', setpoint2: '', setpoint3: '', setpoint4: '', setpoint5: '' });

  return (
    <ScrollView style={{ backgroundColor: '#000' }} contentContainerStyle={{ padding: 20 }}>
      <Heading size="lg" color="$textLight50" mb={16}>Review · {headerLabel}</Heading>

      {selectedMenu === 'injection' && injectionMode === 'mainMenu' && (
        <VStack space="md">
          <Box style={shouldHL('review-input-1') ? stylesHL.border : undefined}><Input><InputField keyboardType="numeric" placeholder="Spray Pressure Limit" value={injMainForm.sprayPressureLimit} onChangeText={(t)=>{ setInjMainForm({...injMainForm, sprayPressureLimit: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input></Box>
          <Box style={shouldHL('review-input-2') ? stylesHL.border : undefined}><Input><InputField keyboardType="numeric" placeholder="Increased Specific Point Printer" value={injMainForm.increasedSpecificPointPrinter} onChangeText={(t)=>{ setInjMainForm({...injMainForm, increasedSpecificPointPrinter: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input></Box>
        </VStack>
      )}

      {selectedMenu === 'injection' && injectionMode === 'subMenuGraphic' && (
        <VStack space="md">
          <Heading size="sm" color="$textLight50">Werte (Index, v, v2)</Heading>
          <DynamicValueList rows={injGraphicValues} setRows={(rows)=>{ setInjGraphicValues(rows); if (guide.isActive) guide.signalEditedValues(); }} labels={{ v: 'v', v2: 'v2' }} />
        </VStack>
      )}

      {selectedMenu === 'injection' && injectionMode === 'switchType' && (
        <VStack space="md">
          <Box style={shouldHL('review-input-1') ? stylesHL.border : undefined}><Input><InputField keyboardType="numeric" placeholder="Transshipment Position" value={injSwitchForm.transshipmentPosition} onChangeText={(t)=>{ setInjSwitchForm({...injSwitchForm, transshipmentPosition: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input></Box>
          <Input><InputField keyboardType="numeric" placeholder="Switch Over Time" value={injSwitchForm.switchOverTime} onChangeText={(t)=>{ setInjSwitchForm({...injSwitchForm, switchOverTime: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Switching Pressure" value={injSwitchForm.switchingPressure} onChangeText={(t)=>{ setInjSwitchForm({...injSwitchForm, switchingPressure: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
        </VStack>
      )}

      {selectedMenu === 'holdingPressure' && holdingMode === 'mainMenu' && (
        <VStack space="md">
          <Input><InputField keyboardType="numeric" placeholder="Holding Time" value={holdMainForm.holdingTime} onChangeText={(t)=>{ setHoldMainForm({...holdMainForm, holdingTime: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Cool Time" value={holdMainForm.coolTime} onChangeText={(t)=>{ setHoldMainForm({...holdMainForm, coolTime: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Screw Diameter" value={holdMainForm.screwDiameter} onChangeText={(t)=>{ setHoldMainForm({...holdMainForm, screwDiameter: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
        </VStack>
      )}

      {selectedMenu === 'holdingPressure' && holdingMode === 'subMenuGraphic' && (
        <VStack space="md">
          <Heading size="sm" color="$textLight50">Werte (Index, t, p)</Heading>
          <DynamicValueList rows={holdGraphicValues} setRows={(rows)=>{ setHoldGraphicValues(rows); if (guide.isActive) guide.signalEditedValues(); }} labels={{ t: 't', p: 'p' }} />
        </VStack>
      )}

      {selectedMenu === 'dosing' && dosingMode === 'mainMenu' && (
        <VStack space="md">
          <Input><InputField keyboardType="numeric" placeholder="Dosing Stroke" value={doseMainForm.dosingStroke} onChangeText={(t)=>{ setDoseMainForm({...doseMainForm, dosingStroke: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Dosing Delay Time" value={doseMainForm.dosingDelayTime} onChangeText={(t)=>{ setDoseMainForm({...doseMainForm, dosingDelayTime: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Relieve Dosing" value={doseMainForm.relieveDosing} onChangeText={(t)=>{ setDoseMainForm({...doseMainForm, relieveDosing: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Relieve After Dosing" value={doseMainForm.relieveAfterDosing} onChangeText={(t)=>{ setDoseMainForm({...doseMainForm, relieveAfterDosing: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Discharge Speed Before" value={doseMainForm.dischargeSpeedBeforeDosing} onChangeText={(t)=>{ setDoseMainForm({...doseMainForm, dischargeSpeedBeforeDosing: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
          <Input><InputField keyboardType="numeric" placeholder="Discharge Speed After" value={doseMainForm.dischargeSpeedAfterDosing} onChangeText={(t)=>{ setDoseMainForm({...doseMainForm, dischargeSpeedAfterDosing: t}); if (guide.isActive) guide.signalEditedValues(); }} /></Input>
        </VStack>
      )}

      {selectedMenu === 'dosing' && dosingMode === 'subMenuGraphic' && (
        <VStack space="lg">
          <VStack space="md">
            <Heading size="sm" color="$textLight50">Dosing Speed (Index, v, v2)</Heading>
            <DynamicValueList rows={doseSpeedValues} setRows={(rows)=>{ setDoseSpeedValues(rows); if (guide.isActive) guide.signalEditedValues(); }} labels={{ v: 'v', v2: 'v2' }} />
          </VStack>
          <VStack space="md">
            <Heading size="sm" color="$textLight50">Dosing Pressure (Index, v, v2)</Heading>
            <DynamicValueList rows={dosePressureValues} setRows={(rows)=>{ setDosePressureValues(rows); if (guide.isActive) guide.signalEditedValues(); }} labels={{ v: 'v', v2: 'v2' }} />
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
        <Button variant="outline" action="secondary" onPress={onBack}>
          <GluestackText color="$textLight50">Zurück</GluestackText>
        </Button>
        <Button action="primary" variant="solid" onPress={() => {
          if (!selectedMenu || !selectedFullScanId) { onSave(); return; }
          let payload: any = {};
          if (selectedMenu === 'injection') {
            if (injectionMode === 'mainMenu') payload = { mainMenu: { ...injMainForm } };
            if (injectionMode === 'subMenuGraphic') payload = { subMenuValues: { values: injGraphicValues } };
            if (injectionMode === 'switchType') payload = { switchType: { ...injSwitchForm } };
          } else if (selectedMenu === 'holdingPressure') {
            if (holdingMode === 'mainMenu') payload = { mainMenu: { ...holdMainForm } };
            if (holdingMode === 'subMenuGraphic') payload = { subMenusValues: { values: holdGraphicValues } };
          } else if (selectedMenu === 'dosing') {
            if (dosingMode === 'mainMenu') payload = { mainMenu: { ...doseMainForm } };
            if (dosingMode === 'subMenuGraphic') payload = { dosingSpeedsValues: { values: doseSpeedValues }, dosingPressuresValues: { values: dosePressureValues } };
          } else if (selectedMenu === 'cylinderHeating') {
            payload = { ...cylinderForm };
          }
          upsertSection(selectedFullScanId, selectedMenu, payload);
          onSave();
          if (guide.isActive) {
            guide.signalSavedSection();
            guide.setGuideSelectedScanId(selectedFullScanId);
            // Auto navigate to History tab to proceed with guided steps
            // @ts-ignore
            navigation.navigate('History');
          }
        }}
          style={shouldHL('review-save') ? stylesHL.border : undefined}
        >
          <GluestackText color="$textLight50">Speichern</GluestackText>
        </Button>
      </HStack>
    </ScrollView>
  );
};

export default ScanReviewScreen;


const stylesHL = StyleSheet.create({
  border: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 8,
  }
});
