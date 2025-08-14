import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { AppState, Box } from '@/types';
import { PRESET_BOXES } from '@/constants';

interface UseAppStateReturn {
  appState: AppState;
  updateBoxes: (boxes: Box[]) => void;
  selectBox: (boxId: string | null) => void;
  resetBoxes: () => void;
  toggleCameraActive: () => void;
  updateCameraPermission: (permission: AppState['cameraPermission']) => void;
}

export const useAppState = (): UseAppStateReturn => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [appState, setAppState] = useState<AppState>({
    isDarkMode,
    cameraPermission: 'not-determined',
    isCameraActive: false,
    boxes: [],
    selectedBoxId: null,
  });

  // Update dark mode when system theme changes
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      isDarkMode,
    }));
  }, [isDarkMode]);

  const updateBoxes = useCallback((boxes: Box[]) => {
    setAppState(prev => ({
      ...prev,
      boxes,
    }));
  }, []);

  const selectBox = useCallback((boxId: string | null) => {
    setAppState(prev => ({
      ...prev,
      selectedBoxId: boxId,
    }));
  }, []);

  const resetBoxes = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      boxes: [...PRESET_BOXES],
      selectedBoxId: null,
    }));
  }, []);

  const toggleCameraActive = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      isCameraActive: !prev.isCameraActive,
    }));
  }, []);

  // Update camera permission when it changes
  const updateCameraPermission = useCallback((permission: AppState['cameraPermission']) => {
    setAppState(prev => ({
      ...prev,
      cameraPermission: permission,
    }));
  }, []);

  return {
    appState,
    updateBoxes,
    selectBox,
    resetBoxes,
    toggleCameraActive,
    updateCameraPermission,
  };
}; 