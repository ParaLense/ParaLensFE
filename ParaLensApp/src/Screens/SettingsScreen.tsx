import React from 'react';
import { Box, Heading, HStack, VStack, Button, Text as GluestackText } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import { useGuide } from '../contexts/GuideContext';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../utils/i18n';

const SettingsScreen = () => {
  const { theme, language, setTheme, setLanguage } = useSettings();
  const { t } = useI18n();
  const isDark = theme === 'dark';
  const navigation = useNavigation();
  const { start } = useGuide();

  return (
    <Box flex={1} bg={isDark ? '$backgroundDark950' : '$backgroundLight0'} px={20} py={24}>
      <Heading size="lg" color={isDark ? '$textLight50' : '$textDark900'} mb={24}>{t('settings')}</Heading>

      <VStack space="lg">
        <Box>
          <Heading size="sm" color={isDark ? '$textLight50' : '$textDark900'} mb={8}>{t('guidedTour')}</Heading>
          <HStack>
            <Button action="primary" onPress={() => { start(); navigation.navigate('Camera' as never); }}>
              <GluestackText color={'$textLight50'}>{t('startTour')}</GluestackText>
            </Button>
          </HStack>
        </Box>

        <Box>
          <Heading size="sm" color={isDark ? '$textLight50' : '$textDark900'} mb={8}>{t('theme')}</Heading>
          <HStack space="sm">
            <Button variant={theme === 'light' ? 'solid' : 'outline'} action="primary" onPress={() => setTheme('light')}>
              <GluestackText color={theme === 'light' ? '$textLight50' : isDark ? '$textLight50' : '$textDark900'}>{t('light')}</GluestackText>
            </Button>
            <Button variant={theme === 'dark' ? 'solid' : 'outline'} action="primary" onPress={() => setTheme('dark')}>
              <GluestackText color={theme === 'dark' ? '$textLight50' : isDark ? '$textLight50' : '$textDark900'}>{t('dark')}</GluestackText>
            </Button>
          </HStack>
        </Box>

        <Box>
          <Heading size="sm" color={isDark ? '$textLight50' : '$textDark900'} mb={8}>{t('language')}</Heading>
          <HStack space="sm">
            <Button variant={language === 'de' ? 'solid' : 'outline'} action="primary" onPress={() => setLanguage('de')}>
              <GluestackText color={language === 'de' ? '$textLight50' : isDark ? '$textLight50' : '$textDark900'}>{t('german')}</GluestackText>
            </Button>
            <Button variant={language === 'en' ? 'solid' : 'outline'} action="primary" onPress={() => setLanguage('en')}>
              <GluestackText color={language === 'en' ? '$textLight50' : isDark ? '$textLight50' : '$textDark900'}>{t('english')}</GluestackText>
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default SettingsScreen; 