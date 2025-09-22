import React from 'react';
import { Box, Heading, Text, VStack, HStack, Button } from '@gluestack-ui/themed';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../utils/i18n';
import { useGuide } from '../contexts/GuideContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const stepText: Record<string, { titleKey: string; body: (t: (k:string)=>string)=>string; }> = {
  intro: { titleKey: 'guidedTour', body: (t) => t('guide_welcome_body') },
  camera_select_fullscan: { titleKey: 'chooseFullScan', body: () => 'Please choose or create a Full Scan to begin.' },
  camera_select_section: { titleKey: 'whatToScan', body: () => 'If you chose Injection: pick Main Menu, Sub Menu Graphic, or Switch Type.' },
  injection_select_mode: { titleKey: 'whatToScan', body: () => 'Choose one of the three: Main Menu, Sub Menu Graphic, or Switch Type.' },
  camera_continue_to_review: { titleKey: 'continue', body: () => 'Press Continue to go to the review screen.' },
  review_edit_values: { titleKey: 'details', body: () => 'Edit at least one value to learn how changes work.' },
  review_save_section: { titleKey: 'save', body: () => 'Save your changes to store them in this Full Scan.' },
  history_open_details: { titleKey: 'details', body: () => 'Open Details of your scan to review saved sections.' },
  history_upload: { titleKey: 'upload', body: () => 'Upload the scan to the server.' },
  done: { titleKey: 'guide_done_title', body: (t) => t('guide_done_body') },
};

export const GuideOverlay = () => {
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const { t } = useI18n();
  const { isActive, step, next, stop } = useGuide();
  const insets = useSafeAreaInsets();

  if (!isActive) return null;

  const cfg = stepText[step] || stepText.intro;
  const requiresAction = (
    step === 'camera_select_fullscan' ||
    step === 'camera_select_section' ||
    step === 'camera_continue_to_review' ||
    step === 'review_edit_values' ||
    step === 'review_save_section' ||
    step === 'history_open_details' ||
    step === 'history_upload'
  );
  const verticalOffset = (
    step === 'camera_continue_to_review'
  ) ? 300 : 0;
  const isDone = step === 'done';

  return (
    <Box position="absolute" left={0} right={0} bottom={verticalOffset} px={16} pt={12} pb={Math.max(16, insets.bottom + 12)} pointerEvents="box-none"
      bg={isDark ? '$backgroundDark900' : '$backgroundLight100'}
      borderTopWidth={1}
      borderColor={isDark ? '$backgroundDark800' : '$backgroundLight200'}
    >
      <VStack space="md">
        <Heading size="md" color={isDark ? '$textLight50' : '$textDark900'}>
          {t(cfg.titleKey) || cfg.titleKey}
        </Heading>
        <Text size="md" color={isDark ? '$textLight200' : '$textDark700'}>
          {cfg.body(t)}
        </Text>
        <HStack justifyContent="space-between" alignItems="center">
          <Button variant="outline" action="secondary" onPress={stop}>
            <Text color={isDark ? '$textLight50' : '$textDark900'}>{t('skip') || 'Skip'}</Text>
          </Button>
          <Button action="primary" onPress={isDone ? stop : (requiresAction ? undefined : next)} disabled={!isDone && requiresAction} variant={!isDone && requiresAction ? 'outline' : 'solid'}>
            <Text color={!isDone && requiresAction ? (isDark ? '$textLight50' : '$textDark900') : '$textLight50'}>{isDone ? (t('finish') || 'Finish') : (t('next') || 'Next')}</Text>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default GuideOverlay;


