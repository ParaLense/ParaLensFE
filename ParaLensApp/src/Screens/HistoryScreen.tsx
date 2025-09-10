import React, { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Box, Heading, VStack, HStack, Text as GluestackText, Button, Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@gluestack-ui/themed';
import { useFullScan } from '../contexts/FullScanContext';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../utils/i18n';

const HistoryScreen = () => {
  const { fullScans } = useFullScan();
  const { theme } = useSettings();
  const { t } = useI18n();
  const isDark = theme === 'dark';
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const selected = useMemo(() => fullScans.find(f => f.id === selectedId) || null, [fullScans, selectedId]);

  return (
    <Box flex={1} bg={isDark ? "$backgroundDark950" : "$backgroundLight0"} px={16} pt={16}>
      <Heading size="lg" color={isDark ? "$textLight50" : "$textDark900"} mb={12}>Full Scans</Heading>
      <FlatList
        data={fullScans}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const present = {
            injection: !!item.injection,
            holdingPressure: !!item.holdingPressure,
            dosing: !!item.dosing,
            cylinderHeating: !!item.cylinderHeating,
          };
          return (
            <Box bg={isDark ? "$backgroundDark900" : "$backgroundLight100"} p={12} rounded="$md" mb={10} borderWidth={1} borderColor={isDark ? "$backgroundDark800" : "$backgroundLight200"}>
              <HStack alignItems="center" justifyContent="space-between">
                <VStack>
                  <GluestackText color={isDark ? "$textLight50" : "$textDark900"} fontWeight="$bold">{item.author || 'Unbekannt'}</GluestackText>
                  <GluestackText color={isDark ? "$textLight400" : "$textDark500"}>{new Date(item.date).toLocaleString()}</GluestackText>
                </VStack>
                <Button variant="outline" action="secondary" onPress={() => { setSelectedId(item.id); setIsDetailsOpen(true); }}>
                  <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>{t('details') || 'Details'}</GluestackText>
                </Button>
              </HStack>
              <HStack mt={10} space="sm" flexWrap="wrap">
                {Object.entries(present).map(([key, val]) => (
                  <Box key={key} px={8} py={4} rounded="$sm" bg={val ? '$green600' : (isDark ? '$backgroundDark800' : '$backgroundLight200')}>
                    <GluestackText color={val ? '$textLight50' : (isDark ? '$textLight400' : '$textDark500')}>{key}</GluestackText>
                  </Box>
                ))}
              </HStack>
            </Box>
          );
        }}
      />

      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">{t('fullScanDetails') || 'Full Scan Details'}</Heading>
          </ModalHeader>
          <ModalBody>
            {!selected ? (
              <GluestackText>{t('noSelection') || 'Keine Auswahl'}</GluestackText>
            ) : (
              <VStack space="md">
                <GluestackText>{(t('author') || 'Autor') + ': '} {selected.author}</GluestackText>
                <GluestackText>{(t('date') || 'Datum') + ': '} {new Date(selected.date).toLocaleString()}</GluestackText>
                <Heading size="sm">{t('savedSections') || 'Gespeicherte Bereiche'}</Heading>
                {(['injection','dosing','holdingPressure','cylinderHeating'] as const).map(key => (
                  <VStack key={key} space="xs" bg="$backgroundDark900" p={10} rounded="$sm">
                    <GluestackText fontWeight="$bold" textTransform="capitalize">{key}</GluestackText>
                    {!selected[key] ? (
                      <GluestackText color="$textLight500">{t('notAvailable') || 'Nicht vorhanden'}</GluestackText>
                    ) : (
                      <VStack space="sm">
                        {/* Injection */}
                        {key === 'injection' && (
                          <VStack space="sm">
                            {/* Main Menu */}
                            {(selected as any).injection?.mainMenu && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Main Menu</GluestackText>
                                {Object.entries((selected as any).injection.mainMenu).map(([label, value]: any) => (
                                  <HStack key={label} justifyContent="space-between">
                                    <GluestackText color="$textLight400">{label}</GluestackText>
                                    <GluestackText color="$textLight50">{String(value)}</GluestackText>
                                  </HStack>
                                ))}
                              </VStack>
                            )}
                            {/* Sub Menu Graphic */}
                            {Array.isArray((selected as any).injection?.subMenuValues?.values) && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Sub Menu · Werte</GluestackText>
                                <VStack space="xs">
                                  <HStack justifyContent="space-between">
                                    <GluestackText color="$textLight500">Index</GluestackText>
                                    <GluestackText color="$textLight500">v</GluestackText>
                                    <GluestackText color="$textLight500">v2</GluestackText>
                                  </HStack>
                                  {((selected as any).injection.subMenuValues.values as any[]).map((row: any, idx: number) => (
                                    <HStack key={idx} justifyContent="space-between">
                                      <GluestackText color="$textLight50">{row.index ?? idx + 1}</GluestackText>
                                      <GluestackText color="$textLight50">{row.v ?? '-'}</GluestackText>
                                      <GluestackText color="$textLight50">{row.v2 ?? '-'}</GluestackText>
                                    </HStack>
                                  ))}
                                </VStack>
                              </VStack>
                            )}
                            {/* Switch Type */}
                            {(selected as any).injection?.switchType && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Switch Type</GluestackText>
                                {Object.entries((selected as any).injection.switchType).map(([label, value]: any) => (
                                  <HStack key={label} justifyContent="space-between">
                                    <GluestackText color="$textLight400">{label}</GluestackText>
                                    <GluestackText color="$textLight50">{String(value)}</GluestackText>
                                  </HStack>
                                ))}
                              </VStack>
                            )}
                          </VStack>
                        )}

                        {/* Holding Pressure */}
                        {key === 'holdingPressure' && (
                          <VStack space="sm">
                            {(selected as any).holdingPressure?.mainMenu && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Main Menu</GluestackText>
                                {Object.entries((selected as any).holdingPressure.mainMenu).map(([label, value]: any) => (
                                  <HStack key={label} justifyContent="space-between">
                                    <GluestackText color="$textLight400">{label}</GluestackText>
                                    <GluestackText color="$textLight50">{String(value)}</GluestackText>
                                  </HStack>
                                ))}
                              </VStack>
                            )}
                            {Array.isArray((selected as any).holdingPressure?.subMenusValues?.values) && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Sub Menu · Werte</GluestackText>
                                <VStack space="xs">
                                  <HStack justifyContent="space-between">
                                    <GluestackText color="$textLight500">Index</GluestackText>
                                    <GluestackText color="$textLight500">t</GluestackText>
                                    <GluestackText color="$textLight500">p</GluestackText>
                                  </HStack>
                                  {((selected as any).holdingPressure.subMenusValues.values as any[]).map((row: any, idx: number) => (
                                    <HStack key={idx} justifyContent="space-between">
                                      <GluestackText color="$textLight50">{row.index ?? idx + 1}</GluestackText>
                                      <GluestackText color="$textLight50">{row.t ?? '-'}</GluestackText>
                                      <GluestackText color="$textLight50">{row.p ?? '-'}</GluestackText>
                                    </HStack>
                                  ))}
                                </VStack>
                              </VStack>
                            )}
                          </VStack>
                        )}

                        {/* Dosing */}
                        {key === 'dosing' && (
                          <VStack space="sm">
                            {(selected as any).dosing?.mainMenu && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Main Menu</GluestackText>
                                {Object.entries((selected as any).dosing.mainMenu).map(([label, value]: any) => (
                                  <HStack key={label} justifyContent="space-between">
                                    <GluestackText color="$textLight400">{label}</GluestackText>
                                    <GluestackText color="$textLight50">{String(value)}</GluestackText>
                                  </HStack>
                                ))}
                              </VStack>
                            )}
                            {Array.isArray((selected as any).dosing?.dosingSpeedsValues?.values) && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Speeds</GluestackText>
                                <VStack space="xs">
                                  <HStack justifyContent="space-between">
                                    <GluestackText color="$textLight500">Index</GluestackText>
                                    <GluestackText color="$textLight500">v</GluestackText>
                                    <GluestackText color="$textLight500">v2</GluestackText>
                                  </HStack>
                                  {((selected as any).dosing.dosingSpeedsValues.values as any[]).map((row: any, idx: number) => (
                                    <HStack key={idx} justifyContent="space-between">
                                      <GluestackText color="$textLight50">{row.index ?? idx + 1}</GluestackText>
                                      <GluestackText color="$textLight50">{row.v ?? '-'}</GluestackText>
                                      <GluestackText color="$textLight50">{row.v2 ?? '-'}</GluestackText>
                                    </HStack>
                                  ))}
                                </VStack>
                              </VStack>
                            )}
                            {Array.isArray((selected as any).dosing?.dosingPressuresValues?.values) && (
                              <VStack>
                                <GluestackText color="$textLight400" mb={4}>Pressures</GluestackText>
                                <VStack space="xs">
                                  <HStack justifyContent="space-between">
                                    <GluestackText color="$textLight500">Index</GluestackText>
                                    <GluestackText color="$textLight500">v</GluestackText>
                                    <GluestackText color="$textLight500">v2</GluestackText>
                                  </HStack>
                                  {((selected as any).dosing.dosingPressuresValues.values as any[]).map((row: any, idx: number) => (
                                    <HStack key={idx} justifyContent="space-between">
                                      <GluestackText color="$textLight50">{row.index ?? idx + 1}</GluestackText>
                                      <GluestackText color="$textLight50">{row.v ?? '-'}</GluestackText>
                                      <GluestackText color="$textLight50">{row.v2 ?? '-'}</GluestackText>
                                    </HStack>
                                  ))}
                                </VStack>
                              </VStack>
                            )}
                          </VStack>
                        )}

                        {/* Cylinder Heating */}
                        {key === 'cylinderHeating' && (
                          <VStack space="xs">
                            {Object.entries((selected as any).cylinderHeating).map(([label, value]: any) => (
                              <HStack key={label} justifyContent="space-between">
                                <GluestackText color="$textLight400">{label}</GluestackText>
                                <GluestackText color="$textLight50">{String(value)}</GluestackText>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </VStack>
                    )}
                  </VStack>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" action="secondary" onPress={() => setIsDetailsOpen(false)}>
              <GluestackText color="$textLight50">Schließen</GluestackText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
  </Box>
);
};

export default HistoryScreen; 