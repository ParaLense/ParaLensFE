import React, { useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Box, Heading, Text, VStack, HStack, Button } from '@gluestack-ui/themed';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../utils/i18n';
import { useNavigation } from '@react-navigation/native';

const GuideScreen = () => {
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const navigation = useNavigation();

  const steps = useMemo(() => ([
    { title: t('guide_welcome_title'), body: t('guide_welcome_body') },
    { title: t('guide_tabs_title'), body: t('guide_tabs_body') },
    { title: t('guide_camera_title'), body: t('guide_camera_body') },
    { title: t('guide_history_title'), body: t('guide_history_body') },
    { title: t('guide_settings_title'), body: t('guide_settings_body') },
    { title: t('guide_done_title'), body: t('guide_done_body') },
  ]), [t]);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const goNext = () => {
    if (!isLast) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      setTimeout(() => AccessibilityInfo.announceForAccessibility(steps[nextIndex].title), 100);
    }
  };
  const goBack = () => {
    if (!isFirst) {
      const prevIndex = stepIndex - 1;
      setStepIndex(prevIndex);
      setTimeout(() => AccessibilityInfo.announceForAccessibility(steps[prevIndex].title), 100);
    }
  };

  return (
    <Box flex={1} bg={isDark ? '$backgroundDark950' : '$backgroundLight0'} px={20} py={24}>
      <VStack flex={1} justifyContent="space-between">
        <VStack space="lg">
          <Heading accessibilityRole="header" size="xl" color={isDark ? '$textLight50' : '$textDark900'}>
            {steps[stepIndex].title}
          </Heading>
          <Text size="lg" color={isDark ? '$textLight200' : '$textDark700'}>
            {steps[stepIndex].body}
          </Text>
        </VStack>

        <HStack space="md" justifyContent="space-between">
          <Button accessibilityLabel={t('back')} disabled={isFirst} variant={isFirst ? 'outline' : 'solid'} action="secondary" onPress={goBack}>
            <Text color={isFirst ? (isDark ? '$textLight400' : '$textDark400') : '$textLight50'}>{t('back')}</Text>
          </Button>
          {!isLast ? (
            <Button accessibilityLabel={t('next')} action="primary" onPress={goNext}>
              <Text color="$textLight50">{t('next')}</Text>
            </Button>
          ) : (
            <Button accessibilityLabel={t('finish')} action="primary" onPress={() => navigation.goBack()}>
              <Text color="$textLight50">{t('finish')}</Text>
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
};

export default GuideScreen;


