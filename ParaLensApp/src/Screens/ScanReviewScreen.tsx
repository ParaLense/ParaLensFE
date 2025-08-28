import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Box, Button, Heading, VStack, HStack, Text as GluestackText, Input, InputField } from '@gluestack-ui/themed';
import type { ScanMenu } from '../types/common';
import DynamicValueList, { IndexValuePair } from '../Components/DynamicValueList';
import { useApiContext } from '../contexts/ApiContext';

type InjectionMode = 'mainMenu' | 'subMenuGraphic' | 'switchType' | null;
type HoldingPressureMode = 'mainMenu' | 'subMenuGraphic' | null;
type DosingMode = 'mainMenu' | 'subMenuGraphic' | null;

interface Props {
  selectedMenu: ScanMenu | null;
  injectionMode: InjectionMode;
  holdingMode: HoldingPressureMode;
  dosingMode: DosingMode;
  scanId: number | null;
  payload?: any;
  onBack: () => void;
  onSave: () => void;
}

const ScanReviewScreen: React.FC<Props> = ({ selectedMenu, injectionMode, holdingMode, dosingMode, scanId, onBack, onSave }) => {
  const { injectionService, holdingPressureService, dosingService, cylinderHeatingService } = useApiContext();
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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

  const toNumber = (v: string) => Number(String(v).replace(',', '.'));

  const handleSave = async () => {
    if (!scanId) { setError('Kein FullScan ausgewählt'); return; }
    setError(null);
    setSaving(true);
    try {
      if (selectedMenu === 'injection') {
        if (injectionMode === 'mainMenu') {
          await injectionService.createMainMenu(scanId, {
            sprayPressureLimit: toNumber(injMainForm.sprayPressureLimit),
            increasedSpecificPointPrinter: toNumber(injMainForm.increasedSpecificPointPrinter),
          });
        } else if (injectionMode === 'subMenuGraphic') {
          await injectionService.createSubMenuScroll(scanId, {
            values: injGraphicValues.filter(r => r.index).map(r => ({
              index: toNumber(r.index),
              v: toNumber(r.v || '0'),
              v2: toNumber(r.v2 || '0'),
            })),
          });
        } else if (injectionMode === 'switchType') {
          await injectionService.createSwitchType(scanId, {
            transshipmentPosition: toNumber(injSwitchForm.transshipmentPosition),
            switchOverTime: toNumber(injSwitchForm.switchOverTime),
            switchingPressure: toNumber(injSwitchForm.switchingPressure),
          });
        }
      } else if (selectedMenu === 'holdingPressure') {
        if (holdingMode === 'mainMenu') {
          await holdingPressureService.createMainMenu(scanId, {
            holdingTime: toNumber(holdMainForm.holdingTime),
            coolTime: toNumber(holdMainForm.coolTime),
            screwDiameter: toNumber(holdMainForm.screwDiameter),
          });
        } else if (holdingMode === 'subMenuGraphic') {
          await holdingPressureService.createSubMenu(scanId, {
            values: holdGraphicValues.filter(r => r.index).map(r => ({
              index: toNumber(r.index),
              t: toNumber(r.t || '0'),
              p: toNumber(r.p || '0'),
            })),
          });
        }
      } else if (selectedMenu === 'dosing') {
        if (dosingMode === 'mainMenu') {
          await dosingService.createMainMenu(scanId, {
            dosingStroke: toNumber(doseMainForm.dosingStroke),
            dosingDelayTime: toNumber(doseMainForm.dosingDelayTime),
            relieveDosing: toNumber(doseMainForm.relieveDosing),
            relieveAfterDosing: toNumber(doseMainForm.relieveAfterDosing),
            dischargeSpeedBeforeDosing: toNumber(doseMainForm.dischargeSpeedBeforeDosing),
            dischargeSpeedAfterDosing: toNumber(doseMainForm.dischargeSpeedAfterDosing),
          });
        } else if (dosingMode === 'subMenuGraphic') {
          if (doseSpeedValues.length) {
            await dosingService.createDosingSpeed(scanId, {
              values: doseSpeedValues.filter(r => r.index).map(r => ({
                index: toNumber(r.index),
                v: toNumber(r.v || '0'),
                v2: toNumber(r.v2 || '0'),
              })),
            });
          }
          if (dosePressureValues.length) {
            await dosingService.createDosingPressure(scanId, {
              values: dosePressureValues.filter(r => r.index).map(r => ({
                index: toNumber(r.index),
                v: toNumber(r.v || '0'),
                v2: toNumber(r.v2 || '0'),
              })),
            });
          }
        }
      } else if (selectedMenu === 'cylinderHeating') {
        await cylinderHeatingService.createMainMenu(scanId, {
          setpoint1: toNumber(cylinderForm.setpoint1),
          setpoint2: toNumber(cylinderForm.setpoint2),
          setpoint3: toNumber(cylinderForm.setpoint3),
          setpoint4: toNumber(cylinderForm.setpoint4),
          setpoint5: toNumber(cylinderForm.setpoint5),
        });
      }
      onSave();
    } catch (e) {
      setError('Speichern fehlgeschlagen. Bitte überprüfen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: '#000' }} contentContainerStyle={{ padding: 20 }}>
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
          <DynamicValueList rows={injGraphicValues} setRows={setInjGraphicValues} labels={{ v: 'v', v2: 'v2' }} />
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
          <DynamicValueList rows={holdGraphicValues} setRows={setHoldGraphicValues} labels={{ t: 't', p: 'p' }} />
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
            <DynamicValueList rows={doseSpeedValues} setRows={setDoseSpeedValues} labels={{ v: 'v', v2: 'v2' }} />
          </VStack>
          <VStack space="md">
            <Heading size="sm" color="$textLight50">Dosing Pressure (Index, v, v2)</Heading>
            <DynamicValueList rows={dosePressureValues} setRows={setDosePressureValues} labels={{ v: 'v', v2: 'v2' }} />
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
        {error && (
          <GluestackText color="$red600">{error}</GluestackText>
        )}
        <Button action="primary" variant="solid" onPress={handleSave} isDisabled={saving || !scanId}>
          <GluestackText color="$textLight50">{saving ? 'Speichere…' : 'Speichern'}</GluestackText>
        </Button>
      </HStack>
    </ScrollView>
  );
};

export default ScanReviewScreen;


