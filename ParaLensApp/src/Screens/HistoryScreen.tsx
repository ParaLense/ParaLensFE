import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Alert, Platform } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import Share from 'react-native-share';
import { Box, Heading, VStack, HStack, Text as GluestackText, Button, Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner, Progress, ProgressFilledTrack } from '@gluestack-ui/themed';
import { useFullScan } from '../contexts/FullScanContext';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../utils/i18n';
import ConnectivityTest from '../Services/connectivityTest';
import { useApiContext } from '../contexts/ApiContext';
import { useGuide } from '../contexts/GuideContext';
import { StyleSheet } from 'react-native';

const HistoryScreen = () => {
  const { fullScans, uploadScan, updateScan, getUploadStatus } = useFullScan();
  const { theme } = useSettings();
  const { t } = useI18n();
  const { excelService } = useApiContext();
  const guide = useGuide();
  const isDark = theme === 'dark';
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [lastDownloadedPath, setLastDownloadedPath] = useState<string | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
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

  const handleDownloadExcel = async (scanId: number) => {
    if (!selected) return;
    
    // Check if scan is uploaded first
    const uploadStatus = getUploadStatus(scanId);
    if (uploadStatus !== 'uploaded') {
      Alert.alert(
        'Scan Not Uploaded',
        'The scan needs to be uploaded to the server first before you can download the Excel file. Please upload the scan and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Use the original scan name format that was used during upload
      const scanName = `Scan_${scanId}_${selected.author}`;
      
      const result = await excelService.downloadExcel(scanName, (progress) => {
        const now = Date.now();
        const last = lastProgressUpdateRef.current || 0;
        // Throttle to ~4 updates/second or on completion
        if (progress >= 1 || now - last >= 250) {
          lastProgressUpdateRef.current = now;
          if (!Number.isNaN(progress) && progress >= 0 && progress <= 1) {
            setDownloadProgress(progress);
          }
        }
      });
      
      if (result.success) {
        setLastDownloadedPath(result.filePath || null);
        const message = Platform.OS === 'android'
          ? 'Excel file downloaded. Open it or share it now.'
          : 'Excel file downloaded. Open it or share it now.';
        Alert.alert(
          'Download Complete',
          message,
          [
            {
              text: 'Open',
              onPress: async () => {
                if (!result.filePath) return;
                try {
                  await FileViewer.open(result.filePath, { showOpenWithDialog: true });
                } catch (e) {
                  Alert.alert('Open Failed', 'Could not open the file on this device.');
                }
              },
            },
            {
              text: 'Share',
              onPress: async () => {
                if (!result.filePath) return;
                try {
                  await Share.open({
                    url: `file://${result.filePath}`,
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    failOnCancel: false,
                  });
                } catch (e) {
                  // user might cancel or error
                }
              },
            },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('Download Failed', result.error || 'Failed to download Excel file');
      }
    } catch (error) {
      Alert.alert('Download Failed', 'An unexpected error occurred while downloading the file');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      lastProgressUpdateRef.current = 0;
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
          // Check if sections are complete or partial
          const getSectionStatus = (section: any, sectionType: string) => {
            if (!section) return 'not_scanned'; // White - not scanned
            
            switch (sectionType) {
              case 'injection':
                const hasMainMenu = !!section.mainMenu;
                const hasSubMenuValues = !!section.subMenuValues?.values?.length;
                const hasSwitchType = !!section.switchType;
                if (hasMainMenu && hasSubMenuValues && hasSwitchType) return 'complete'; // Green
                if (hasMainMenu || hasSubMenuValues || hasSwitchType) return 'partial'; // Orange
                return 'not_scanned';
                
              case 'dosing':
                const hasDosingMainMenu = !!section.mainMenu;
                const hasDosingSpeeds = !!section.dosingSpeedsValues?.values?.length;
                const hasDosingPressures = !!section.dosingPressuresValues?.values?.length;
                if (hasDosingMainMenu && hasDosingSpeeds && hasDosingPressures) return 'complete'; // Green
                if (hasDosingMainMenu || hasDosingSpeeds || hasDosingPressures) return 'partial'; // Orange
                return 'not_scanned';
                
              case 'holdingPressure':
                const hasHoldingMainMenu = !!section.mainMenu;
                const hasHoldingSubMenus = !!section.subMenusValues?.values?.length;
                if (hasHoldingMainMenu && hasHoldingSubMenus) return 'complete'; // Green
                if (hasHoldingMainMenu || hasHoldingSubMenus) return 'partial'; // Orange
                return 'not_scanned';
                
              case 'cylinderHeating':
                console.log('CylinderHeating section data:', JSON.stringify(section, null, 2));
                // Check for mainMenu or any setpoint values
                const hasCylinderMainMenu = !!section.mainMenu;
                const hasSetpoint1 = !!section.setpoint1;
                const hasSetpoint2 = !!section.setpoint2;
                const hasSetpoint3 = !!section.setpoint3;
                const hasSetpoint4 = !!section.setpoint4;
                const hasSetpoint5 = !!section.setpoint5;
                const hasAnySetpoint = hasSetpoint1 || hasSetpoint2 || hasSetpoint3 || hasSetpoint4 || hasSetpoint5;
                
                console.log('hasCylinderMainMenu:', hasCylinderMainMenu, 'hasAnySetpoint:', hasAnySetpoint);
                
                if (hasCylinderMainMenu || hasAnySetpoint) return 'complete'; // Green
                return 'not_scanned';
                
              default:
                return 'not_scanned';
            }
          };

          const sectionStatuses = {
            injection: getSectionStatus(item.injection, 'injection'),
            holdingPressure: getSectionStatus(item.holdingPressure, 'holdingPressure'),
            dosing: getSectionStatus(item.dosing, 'dosing'),
            cylinderHeating: getSectionStatus(item.cylinderHeating, 'cylinderHeating'),
          };
          
          const uploadStatus = getUploadStatus(item.id);
          const isUploading = uploadStatus === 'uploading';
          
          return (
            <Box bg={isDark ? "$backgroundDark900" : "$backgroundLight100"} p={12} rounded="$md" mb={10} borderWidth={1} borderColor={isDark ? "$backgroundDark800" : "$backgroundLight200"}
              style={guide.shouldHighlight(`history-item-${item.id}`) ? stylesHL.border : undefined}
            >
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
                    onPress={() => { setSelectedId(item.id); setIsDetailsOpen(true); if (guide.isActive) guide.signalOpenedDetails(); }}
                    size="sm"
                    style={guide.shouldHighlight(`history-details-${item.id}`) ? stylesHL.border : undefined}
                  >
                    <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>{t('details') || 'Details'}</GluestackText>
                  </Button>
                </HStack>
              </HStack>
              
              <HStack mt={10} space="sm" flexWrap="wrap">
                {Object.entries(sectionStatuses).map(([key, status]) => {
                  let bgColor, textColor;
                  
                  switch (status) {
                    case 'complete':
                      bgColor = '$green600';
                      textColor = '$textLight50';
                      break;
                    case 'partial':
                      bgColor = '$orange500';
                      textColor = '$textLight50';
                      break;
                    default: // 'not_scanned'
                      bgColor = isDark ? '$backgroundDark800' : '$backgroundLight200';
                      textColor = isDark ? '$textLight400' : '$textDark500';
                  }
                  
                  return (
                    <Box key={key} px={8} py={4} rounded="$sm" bg={bgColor}>
                      <GluestackText color={textColor}>{key}</GluestackText>
                    </Box>
                  );
                })}
              </HStack>

              {/* Upload/Update buttons */}
              <HStack mt={10} space="sm" justifyContent="flex-end">
                {uploadStatus === 'not_uploaded' || uploadStatus === 'error' ? (
                  <Button 
                    variant="solid" 
                    action="primary" 
                    onPress={async () => { await handleUpload(item.id); if (guide.isActive) guide.signalUploaded(); }}
                    disabled={isUploading}
                    size="sm"
                    style={guide.shouldHighlight(`history-upload-${item.id}`) ? stylesHL.border : undefined}
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
                    onPress={async () => { await handleUpdate(item.id); if (guide.isActive) guide.signalUploaded(); }}
                    disabled={isUploading}
                    size="sm"
                    style={guide.shouldHighlight(`history-update-${item.id}`) ? stylesHL.border : undefined}
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
                    onPress={async () => { await handleUpdate(item.id); if (guide.isActive) guide.signalUploaded(); }}
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

      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} size="lg">
        <ModalBackdrop />
        <ModalContent maxHeight="85%" maxWidth="90%" bg={isDark ? "$backgroundDark950" : "$backgroundLight0"}>
          <ModalHeader borderBottomWidth={1} borderBottomColor={isDark ? "$backgroundDark800" : "$backgroundLight200"} pb={16}>
            <Heading size="lg" color={isDark ? "$textLight50" : "$textDark900"}>
              {t('fullScanDetails') || 'Full Scan Details'}
            </Heading>
          </ModalHeader>
          <ModalBody px={16} py={16}>
            {!selected ? (
              <VStack space="md" alignItems="center" py={20}>
                <GluestackText color={isDark ? "$textLight400" : "$textDark500"}>
                  {t('noSelection') || 'Keine Auswahl'}
                </GluestackText>
              </VStack>
            ) : (
              <VStack space="md">
                {/* Header Info */}
                <VStack space="sm" bg={isDark ? "$backgroundDark900" : "$backgroundLight100"} p={12} rounded="$lg" borderWidth={1} borderColor={isDark ? "$backgroundDark800" : "$backgroundLight200"}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <VStack flex={1}>
                      <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                        {t('author') || 'Autor'}
                      </GluestackText>
                      <GluestackText fontSize="$lg" fontWeight="$bold" color={isDark ? "$textLight50" : "$textDark900"}>
                        {selected.author || 'Unbekannt'}
                      </GluestackText>
                    </VStack>
                    <VStack alignItems="flex-end">
                      <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                        {t('date') || 'Datum'}
                      </GluestackText>
                      <GluestackText fontSize="$sm" color={isDark ? "$textLight300" : "$textDark700"}>
                        {new Date(selected.date).toLocaleString()}
                      </GluestackText>
                    </VStack>
                  </HStack>
                  {selected.serverId && (
                    <HStack alignItems="center" mt={8}>
                      <GluestackText fontSize="$xs" color={isDark ? "$textLight500" : "$textDark400"}>
                        Server ID: {selected.serverId}
                      </GluestackText>
                    </HStack>
                  )}
                </VStack>

                {/* Sections */}
                <VStack space="md">
                  <Heading size="md" color={isDark ? "$textLight50" : "$textDark900"}>
                    {t('savedSections') || 'Gespeicherte Bereiche'}
                  </Heading>
                  
                  {(['injection','dosing','holdingPressure','cylinderHeating'] as const).map(key => (
                    <VStack key={key} space="md" bg={isDark ? "$backgroundDark900" : "$backgroundLight100"} p={12} rounded="$lg" borderWidth={1} borderColor={isDark ? "$backgroundDark800" : "$backgroundLight200"}>
                      <HStack alignItems="center" space="sm">
                        <Box w={8} h={8} rounded="$full" bg={selected[key] ? "$green600" : (isDark ? "$backgroundDark700" : "$backgroundLight300")} />
                        <GluestackText fontSize="$lg" fontWeight="$bold" textTransform="capitalize" color={isDark ? "$textLight50" : "$textDark900"}>
                          {key}
                        </GluestackText>
                      </HStack>
                      
                      {!selected[key] ? (
                        <GluestackText color={isDark ? "$textLight500" : "$textDark400"} fontStyle="italic">
                          {t('notAvailable') || 'Nicht vorhanden'}
                        </GluestackText>
                      ) : (
                        <VStack space="md">
                          {/* Injection */}
                          {key === 'injection' && (
                            <VStack space="md">
                              {/* Main Menu */}
                              {(selected as any).injection?.mainMenu && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Main Menu
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    {Object.entries((selected as any).injection.mainMenu).map(([label, value]: any) => (
                                      <HStack key={label} justifyContent="space-between" alignItems="center">
                                        <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                                          {label}
                                        </GluestackText>
                                        <GluestackText fontSize="$sm" fontWeight="$medium" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {String(value)}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                              
                              {/* Sub Menu Values */}
                              {Array.isArray((selected as any).injection?.subMenuValues?.values) && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Sub Menu · Werte
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    <HStack justifyContent="space-between" bg={isDark ? "$backgroundDark700" : "$backgroundLight200"} p={8} rounded="$sm">
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>Index</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>v</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>v2</GluestackText>
                                    </HStack>
                                    {((selected as any).injection.subMenuValues.values as any[]).map((row: any, idx: number) => (
                                      <HStack key={idx} justifyContent="space-between" p={4}>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.index ?? idx + 1}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.v ?? '-'}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.v2 ?? '-'}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                              
                              {/* Switch Type */}
                              {(selected as any).injection?.switchType && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Switch Type
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    {Object.entries((selected as any).injection.switchType).map(([label, value]: any) => (
                                      <HStack key={label} justifyContent="space-between" alignItems="center">
                                        <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                                          {label}
                                        </GluestackText>
                                        <GluestackText fontSize="$sm" fontWeight="$medium" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {String(value)}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                            </VStack>
                          )}

                          {/* Holding Pressure */}
                          {key === 'holdingPressure' && (
                            <VStack space="md">
                              {(selected as any).holdingPressure?.mainMenu && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Main Menu
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    {Object.entries((selected as any).holdingPressure.mainMenu).map(([label, value]: any) => (
                                      <HStack key={label} justifyContent="space-between" alignItems="center">
                                        <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                                          {label}
                                        </GluestackText>
                                        <GluestackText fontSize="$sm" fontWeight="$medium" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {String(value)}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                              
                              {Array.isArray((selected as any).holdingPressure?.subMenusValues?.values) && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Sub Menu · Werte
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    <HStack justifyContent="space-between" bg={isDark ? "$backgroundDark700" : "$backgroundLight200"} p={8} rounded="$sm">
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>Index</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>t</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>p</GluestackText>
                                    </HStack>
                                    {((selected as any).holdingPressure.subMenusValues.values as any[]).map((row: any, idx: number) => (
                                      <HStack key={idx} justifyContent="space-between" p={4}>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.index ?? idx + 1}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.t ?? '-'}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.p ?? '-'}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                            </VStack>
                          )}

                          {/* Dosing */}
                          {key === 'dosing' && (
                            <VStack space="md">
                              {(selected as any).dosing?.mainMenu && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Main Menu
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    {Object.entries((selected as any).dosing.mainMenu).map(([label, value]: any) => (
                                      <HStack key={label} justifyContent="space-between" alignItems="center">
                                        <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                                          {label}
                                        </GluestackText>
                                        <GluestackText fontSize="$sm" fontWeight="$medium" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {String(value)}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                              
                              {Array.isArray((selected as any).dosing?.dosingSpeedsValues?.values) && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Speeds
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    <HStack justifyContent="space-between" bg={isDark ? "$backgroundDark700" : "$backgroundLight200"} p={8} rounded="$sm">
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>Index</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>v</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>v2</GluestackText>
                                    </HStack>
                                    {((selected as any).dosing.dosingSpeedsValues.values as any[]).map((row: any, idx: number) => (
                                      <HStack key={idx} justifyContent="space-between" p={4}>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.index ?? idx + 1}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.v ?? '-'}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.v2 ?? '-'}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                              
                              {Array.isArray((selected as any).dosing?.dosingPressuresValues?.values) && (
                                <VStack space="sm">
                                  <GluestackText fontSize="$sm" fontWeight="$semibold" color={isDark ? "$textLight300" : "$textDark600"}>
                                    Pressures
                                  </GluestackText>
                                  <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                    <HStack justifyContent="space-between" bg={isDark ? "$backgroundDark700" : "$backgroundLight200"} p={8} rounded="$sm">
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>Index</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>v</GluestackText>
                                      <GluestackText fontSize="$xs" fontWeight="$bold" color={isDark ? "$textLight400" : "$textDark500"}>v2</GluestackText>
                                    </HStack>
                                    {((selected as any).dosing.dosingPressuresValues.values as any[]).map((row: any, idx: number) => (
                                      <HStack key={idx} justifyContent="space-between" p={4}>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.index ?? idx + 1}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.v ?? '-'}
                                        </GluestackText>
                                        <GluestackText fontSize="$xs" color={isDark ? "$textLight50" : "$textDark900"}>
                                          {row.v2 ?? '-'}
                                        </GluestackText>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </VStack>
                              )}
                            </VStack>
                          )}

                          {/* Cylinder Heating */}
                          {key === 'cylinderHeating' && (
                            <VStack space="sm">
                              <VStack space="xs" bg={isDark ? "$backgroundDark800" : "$backgroundLight50"} p={12} rounded="$md">
                                {Object.entries((selected as any).cylinderHeating).map(([label, value]: any) => (
                                  <HStack key={label} justifyContent="space-between" alignItems="center">
                                    <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                                      {label}
                                    </GluestackText>
                                    <GluestackText fontSize="$sm" fontWeight="$medium" color={isDark ? "$textLight50" : "$textDark900"}>
                                      {String(value)}
                                    </GluestackText>
                                  </HStack>
                                ))}
                              </VStack>
                            </VStack>
                          )}
                        </VStack>
                      )}
                    </VStack>
                  ))}
                </VStack>
              </VStack>
            )}
          </ModalBody>
          {isDownloading && (
            <VStack px={16} pt={8} pb={0} space="xs" w="100%">
              <HStack justifyContent="space-between" alignItems="center">
                <GluestackText fontSize="$sm" color={isDark ? "$textLight400" : "$textDark500"}>
                  Download Progress
                </GluestackText>
                <GluestackText fontSize="$sm" color={isDark ? "$textLight300" : "$textDark600"}>
                  {Math.round(downloadProgress * 100)}%
                </GluestackText>
              </HStack>
              <Progress value={downloadProgress * 100} size="sm">
                <ProgressFilledTrack />
              </Progress>
            </VStack>
          )}
          <ModalFooter borderTopWidth={1} borderTopColor={isDark ? "$backgroundDark800" : "$backgroundLight200"} pt={16}>
            <HStack space="md" flex={1} justifyContent="space-between">
              <Button 
                variant="solid" 
                action="primary" 
                onPress={() => selected && handleDownloadExcel(selected.id)} 
                disabled={isDownloading || (selected && getUploadStatus(selected.id) !== 'uploaded')}
                size="lg"
                flex={1}
              >
                <Box position="relative" w={220} alignItems="center" justifyContent="center">
                  {isDownloading && (
                    <HStack position="absolute" left={8} alignItems="center" space="xs">
                      <Spinner size="small" color="$white" />
                    </HStack>
                  )}
                  <GluestackText color="$white">📥 Download Excel</GluestackText>
                  {/* Hidden text to reserve width for alternative label */}
                  <GluestackText color="$white" opacity={0} position="absolute">
                    📤 Upload First
                  </GluestackText>
                </Box>
              </Button>
              <Button variant="outline" action="secondary" onPress={() => setIsDetailsOpen(false)} size="lg">
                <GluestackText color={isDark ? "$textLight50" : "$textDark900"}>
                  {t('close') || 'Schließen'}
                </GluestackText>
              </Button>
            </HStack>
            
            
          </ModalFooter>
        </ModalContent>
      </Modal>
  </Box>
);
};

export default HistoryScreen; 

const stylesHL = StyleSheet.create({
  border: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 8,
  }
});