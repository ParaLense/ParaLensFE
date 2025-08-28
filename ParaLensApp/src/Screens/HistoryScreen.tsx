import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Box, Heading, VStack, Text as GluestackText, HStack, Button } from '@gluestack-ui/themed';
import { useApiContext } from '../contexts/ApiContext';
import { ScanDto } from '../types/common';
import { formatDateForDisplay } from '../utils/dateUtils';
import { useIsFocused } from '@react-navigation/native';

const HistoryScreen = () => {
  const { scanService } = useApiContext();
  const [scans, setScans] = useState<ScanDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [itemLoading, setItemLoading] = useState<Record<number, boolean>>({});
  const isFocused = useIsFocused();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const all = await scanService.getAllScans();
      setScans(all);
    } catch (e) {
      setError('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [scanService]);

  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused, load]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 16 }}>
      <HStack alignItems="center" justifyContent="space-between" mb={12}>
        <Heading size="lg" color="$textLight50">Verlauf</Heading>
        <Button size="sm" variant="outline" action="secondary" onPress={load} isDisabled={loading}>
          <GluestackText color="$textLight50">{loading ? 'Lade…' : 'Aktualisieren'}</GluestackText>
        </Button>
      </HStack>
      {loading && (
        <GluestackText color="$textLight50">Lade…</GluestackText>
      )}
      {error && (
        <GluestackText color="$red600">{error}</GluestackText>
      )}
      <VStack space="sm">
        {scans.map(s => {
          const isExpanded = expandedId === s.id;
          return (
            <Box key={s.id} bg="$backgroundDark900" px={12} py={12} borderRadius="$md">
              <TouchableOpacity
                onPress={async () => {
                  if (isExpanded) { setExpandedId(null); return; }
                  setExpandedId(s.id);
                  setItemLoading(prev => ({ ...prev, [s.id]: true }));
                  try {
                    const full = await scanService.getFullScan(s.id);
                    setScans(prev => prev.map(item => item.id === s.id ? full : item));
                  } catch {}
                  finally {
                    setItemLoading(prev => ({ ...prev, [s.id]: false }));
                  }
                }}
                activeOpacity={0.7}
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack>
                    <GluestackText color="$textLight50" fontWeight="$bold">FullScan #{s.id}</GluestackText>
                    <GluestackText color="$textLight400">{s.author} · {formatDateForDisplay(s.date)}</GluestackText>
                  </VStack>
                  <GluestackText color="$textLight400">{isExpanded ? '▲' : '▼'}</GluestackText>
                </HStack>
              </TouchableOpacity>

              <VStack space="xs" mt={8}>
                {s.injection && <GluestackText color="$textLight300">Injection ✓</GluestackText>}
                {s.holdingPressure && <GluestackText color="$textLight300">Nachdruck ✓</GluestackText>}
                {s.dosing && <GluestackText color="$textLight300">Dosing ✓</GluestackText>}
                {s.cylinderHeating && <GluestackText color="$textLight300">Zylinderheizung ✓</GluestackText>}
              </VStack>

              {isExpanded && (
                <Box mt={12}>
                  {itemLoading[s.id] && (
                    <GluestackText color="$textLight400">Lade Details…</GluestackText>
                  )}
                  {!itemLoading[s.id] && (
                    <VStack space="md">
                      {s.injection && (
                        <Box>
                          <Heading size="sm" color="$textLight50">Injection</Heading>
                          {s.injection.mainMenu && (
                            <VStack mt={6}>
                              <GluestackText color="$textLight300">Spray Pressure Limit: {s.injection.mainMenu.sprayPressureLimit}</GluestackText>
                              <GluestackText color="$textLight300">Increased Specific Point Printer: {s.injection.mainMenu.increasedSpecificPointPrinter}</GluestackText>
                            </VStack>
                          )}
                          {s.injection.subMenuValues && (
                            <Box mt={6}>
                              <GluestackText color="$textLight400">SubMenu Values:</GluestackText>
                              <VStack mt={4} space="xs">
                                {s.injection.subMenuValues.values?.map(v => (
                                  <GluestackText key={v.id} color="$textLight300">Index {v.index}: v={v.v}, v2={v.v2}</GluestackText>
                                ))}
                              </VStack>
                            </Box>
                          )}
                          {s.injection.switchType && (
                            <VStack mt={6}>
                              <GluestackText color="$textLight300">Transshipment Position: {s.injection.switchType.transshipmentPosition}</GluestackText>
                              <GluestackText color="$textLight300">Switch Over Time: {s.injection.switchType.switchOverTime}</GluestackText>
                              <GluestackText color="$textLight300">Switching Pressure: {s.injection.switchType.switchingPressure}</GluestackText>
                            </VStack>
                          )}
                        </Box>
                      )}

                      {s.holdingPressure && (
                        <Box>
                          <Heading size="sm" color="$textLight50">Nachdruck</Heading>
                          {s.holdingPressure.mainMenu && (
                            <VStack mt={6}>
                              <GluestackText color="$textLight300">Holding Time: {s.holdingPressure.mainMenu.holdingTime}</GluestackText>
                              <GluestackText color="$textLight300">Cool Time: {s.holdingPressure.mainMenu.coolTime}</GluestackText>
                              <GluestackText color="$textLight300">Screw Diameter: {s.holdingPressure.mainMenu.screwDiameter}</GluestackText>
                            </VStack>
                          )}
                          {s.holdingPressure.subMenusValues && (
                            <Box mt={6}>
                              <GluestackText color="$textLight400">SubMenu Values:</GluestackText>
                              <VStack mt={4} space="xs">
                                {s.holdingPressure.subMenusValues.values?.map(v => (
                                  <GluestackText key={v.id} color="$textLight300">Index {v.index}: t={v.t}, p={v.p}</GluestackText>
                                ))}
                              </VStack>
                            </Box>
                          )}
                        </Box>
                      )}

                      {s.dosing && (
                        <Box>
                          <Heading size="sm" color="$textLight50">Dosing</Heading>
                          {s.dosing.mainMenu && (
                            <VStack mt={6}>
                              <GluestackText color="$textLight300">Dosing Stroke: {s.dosing.mainMenu.dosingStroke}</GluestackText>
                              <GluestackText color="$textLight300">Dosing Delay Time: {s.dosing.mainMenu.dosingDelayTime}</GluestackText>
                              <GluestackText color="$textLight300">Relieve Dosing: {s.dosing.mainMenu.relieveDosing}</GluestackText>
                              <GluestackText color="$textLight300">Relieve After Dosing: {s.dosing.mainMenu.relieveAfterDosing}</GluestackText>
                              <GluestackText color="$textLight300">Discharge Speed Before: {s.dosing.mainMenu.dischargeSpeedBeforeDosing}</GluestackText>
                              <GluestackText color="$textLight300">Discharge Speed After: {s.dosing.mainMenu.dischargeSpeedAfterDosing}</GluestackText>
                            </VStack>
                          )}
                          {s.dosing.dosingSpeedsValues && (
                            <Box mt={6}>
                              <GluestackText color="$textLight400">Dosing Speed Values:</GluestackText>
                              <VStack mt={4} space="xs">
                                {s.dosing.dosingSpeedsValues.values?.map(v => (
                                  <GluestackText key={v.id} color="$textLight300">Index {v.index}: v={v.v}, v2={v.v2}</GluestackText>
                                ))}
                              </VStack>
                            </Box>
                          )}
                          {s.dosing.dosingPressuresValues && (
                            <Box mt={6}>
                              <GluestackText color="$textLight400">Dosing Pressure Values:</GluestackText>
                              <VStack mt={4} space="xs">
                                {s.dosing.dosingPressuresValues.values?.map(v => (
                                  <GluestackText key={v.id} color="$textLight300">Index {v.index}: v={v.v}, v2={v.v2}</GluestackText>
                                ))}
                              </VStack>
                            </Box>
                          )}
                        </Box>
                      )}

                      {s.cylinderHeating && (
                        <Box>
                          <Heading size="sm" color="$textLight50">Zylinderheizung</Heading>
                          {s.cylinderHeating.mainMenu && (
                            <VStack mt={6}>
                              <GluestackText color="$textLight300">Setpoint 1: {s.cylinderHeating.mainMenu.setpoint1}</GluestackText>
                              <GluestackText color="$textLight300">Setpoint 2: {s.cylinderHeating.mainMenu.setpoint2}</GluestackText>
                              <GluestackText color="$textLight300">Setpoint 3: {s.cylinderHeating.mainMenu.setpoint3}</GluestackText>
                              <GluestackText color="$textLight300">Setpoint 4: {s.cylinderHeating.mainMenu.setpoint4}</GluestackText>
                              <GluestackText color="$textLight300">Setpoint 5: {s.cylinderHeating.mainMenu.setpoint5}</GluestackText>
                            </VStack>
                          )}
                        </Box>
                      )}
                    </VStack>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </VStack>
    </ScrollView>
  );
};

export default HistoryScreen; 