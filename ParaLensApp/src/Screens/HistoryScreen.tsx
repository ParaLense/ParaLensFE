import React, { useMemo, useState } from 'react';
import { FlatList, Alert } from 'react-native';
import { Box, Heading, VStack, HStack, Text as GluestackText, Button, Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner } from '@gluestack-ui/themed';
import { useFullScan } from '../contexts/FullScanContext';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../utils/i18n';
import ConnectivityTest from '../Services/connectivityTest';

const HistoryScreen = () => {
  const { fullScans, uploadScan, updateScan, getUploadStatus } = useFullScan();
  const { theme } = useSettings();
  const { t } = useI18n();
  const isDark = theme === 'dark';
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const selected = useMemo(() => fullScans.find(f => f.id === selectedId) || null, [fullScans, selectedId]);

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'uploaded': return '🟢';
      case 'needs_update': return '🟠';
      case 'uploading': return '🔄';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded': return 'Uploaded';
      case 'needs_update': return 'Needs Update';
      case 'uploading': return 'Uploading...';
      case 'error': return 'Upload Failed';
      default: return 'Not Uploaded';
    }
  };

  const handleUpload = async (scanId: number) => {
    try {
      const result = await uploadScan(scanId);
      if (!result.success) {
        Alert.alert('Upload Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'An unexpected error occurred');
    }
  };

  const handleUpdate = async (scanId: number) => {
    try {
      const result = await updateScan(scanId);
      if (!result.success) {
        Alert.alert('Update Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Update Failed', 'An unexpected error occurred');
    }
  };

  const testConnectivity = async () => {
    try {
      const result = await ConnectivityTest.testConnection();
      if (result.success) {
        Alert.alert('Connection Test', '✅ Backend connection successful!');
      } else {
        Alert.alert('Connection Test Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Connection Test Failed', 'An unexpected error occurred');
    }
  };

  return (
    <Box flex={1} bg={isDark ? "$backgroundDark950" : "$backgroundLight0"} px={16} pt={16}>
      <HStack justifyContent="space-between" alignItems="center" mb={12}>
        <Heading size="lg" color={isDark ? "$textLight50" : "$textDark900"}>Full Scans</Heading>
        <Button variant="outline" action="secondary" onPress={testConnectivity} size="sm">
          <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>Test Connection</GluestackText>
        </Button>
      </HStack>
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
          const uploadStatus = getUploadStatus(item.id);
          const isUploading = uploadStatus === 'uploading';
          
          return (
            <Box bg={isDark ? "$backgroundDark900" : "$backgroundLight100"} p={12} rounded="$md" mb={10} borderWidth={1} borderColor={isDark ? "$backgroundDark800" : "$backgroundLight200"}>
              <HStack alignItems="center" justifyContent="space-between">
                <VStack flex={1}>
                  <HStack alignItems="center" space="sm">
                    <GluestackText color={isDark ? "$textLight50" : "$textDark900"} fontWeight="$bold">{item.author || 'Unbekannt'}</GluestackText>
                    <GluestackText fontSize="$sm">{getStatusEmoji(uploadStatus)}</GluestackText>
                    <GluestackText fontSize="$xs" color={isDark ? "$textLight400" : "$textDark500"}>
                      {getStatusText(uploadStatus)}
                    </GluestackText>
                  </HStack>
                  <GluestackText color={isDark ? "$textLight400" : "$textDark500"}>{new Date(item.date).toLocaleString()}</GluestackText>
                  {item.serverId && (
                    <GluestackText fontSize="$xs" color={isDark ? "$textLight500" : "$textDark400"}>
                      Server ID: {item.serverId}
                    </GluestackText>
                  )}
                </VStack>
                <HStack space="sm">
                  <Button 
                    variant="outline" 
                    action="secondary" 
                    onPress={() => { setSelectedId(item.id); setIsDetailsOpen(true); }}
                    size="sm"
                  >
                    <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>{t('details') || 'Details'}</GluestackText>
                  </Button>
                </HStack>
              </HStack>
              
              <HStack mt={10} space="sm" flexWrap="wrap">
                {Object.entries(present).map(([key, val]) => (
                  <Box key={key} px={8} py={4} rounded="$sm" bg={val ? '$green600' : (isDark ? '$backgroundDark800' : '$backgroundLight200')}>
                    <GluestackText color={val ? '$textLight50' : (isDark ? '$textLight400' : '$textDark500')}>{key}</GluestackText>
                  </Box>
                ))}
              </HStack>

              {/* Upload/Update buttons */}
              <HStack mt={10} space="sm" justifyContent="flex-end">
                {uploadStatus === 'not_uploaded' || uploadStatus === 'error' ? (
                  <Button 
                    variant="solid" 
                    action="primary" 
                    onPress={() => handleUpload(item.id)}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? (
                      <HStack alignItems="center" space="xs">
                        <Spinner size="small" color="$white" />
                        <GluestackText color="$white">Uploading...</GluestackText>
                      </HStack>
                    ) : (
                      <GluestackText color="$white">Upload</GluestackText>
                    )}
                  </Button>
                ) : uploadStatus === 'needs_update' ? (
                  <Button 
                    variant="solid" 
                    action="secondary" 
                    onPress={() => handleUpdate(item.id)}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? (
                      <HStack alignItems="center" space="xs">
                        <Spinner size="small" color="$white" />
                        <GluestackText color="$white">Updating...</GluestackText>
                      </HStack>
                    ) : (
                      <GluestackText color="$white">Update</GluestackText>
                    )}
                  </Button>
                ) : uploadStatus === 'uploaded' ? (
                  <Button 
                    variant="outline" 
                    action="secondary" 
                    onPress={() => handleUpdate(item.id)}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? (
                      <HStack alignItems="center" space="xs">
                        <Spinner size="small" color={isDark ? "$textLight50" : "$textDark900"} />
                        <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>Updating...</GluestackText>
                      </HStack>
                    ) : (
                      <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>Re-upload</GluestackText>
                    )}
                  </Button>
                ) : null}
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