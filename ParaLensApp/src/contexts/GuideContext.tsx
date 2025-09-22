import type { ScanMenu } from '../types/common';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type GuideStep =
  | 'idle'
  | 'intro'
  | 'camera_select_fullscan'
  | 'camera_select_section'
  | 'injection_select_mode'
  | 'camera_continue_to_review'
  | 'review_edit_values'
  | 'review_save_section'
  | 'history_open_details'
  | 'history_upload'
  | 'done';

interface GuideContextValue {
  isActive: boolean;
  step: GuideStep;
  start: () => void;
  stop: () => void;
  next: () => void;
  // For highlighting specific UI by step name
  shouldHighlight: (id: string) => boolean;
  // Signals from screens
  signalSelectedFullScan: () => void;
  signalSelectedSection: (menu: ScanMenu | null) => void;
  signalSelectedInjectionMode: () => void;
  signalOpenedReview: () => void;
  signalEditedValues: () => void;
  signalSavedSection: () => void;
  signalOpenedDetails: () => void;
  signalUploaded: () => void;
  setGuideSelectedScanId: (id: number | null) => void;
}

const GuideContext = createContext<GuideContextValue | undefined>(undefined);

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState<GuideStep>('idle');
  const [guideSelectedScanId, setGuideSelectedScanId] = useState<number | null>(null);

  const start = useCallback(() => {
    setIsActive(true);
    setStep('intro');
  }, []);
  const stop = useCallback(() => {
    setIsActive(false);
    setStep('idle');
  }, []);
  const next = useCallback(() => {
    setStep((prev) => {
      switch (prev) {
        case 'intro': return 'camera_select_fullscan';
        case 'camera_select_fullscan': return 'camera_select_section';
        case 'camera_select_section': return 'camera_continue_to_review';
        case 'camera_continue_to_review': return 'review_edit_values';
        case 'review_edit_values': return 'review_save_section';
        case 'review_save_section': return 'history_open_details';
        case 'history_open_details': return 'history_upload';
        case 'history_upload': return 'done';
        default: return prev;
      }
    });
  }, []);

  // Screen signals move to expected next step automatically when criteria met
  const signalSelectedFullScan = useCallback(() => {
    setStep((prev) => (prev === 'camera_select_fullscan' ? 'camera_select_section' : prev));
  }, []);
  const signalSelectedSection = useCallback((menu: ScanMenu | null) => {
    setStep((prev) => {
      if (prev !== 'camera_select_section') return prev;
      if (menu === 'injection') return 'injection_select_mode';
      return 'camera_continue_to_review';
    });
  }, []);
  const signalSelectedInjectionMode = useCallback(() => {
    setStep((prev) => (prev === 'injection_select_mode' ? 'camera_continue_to_review' : prev));
  }, []);
  const signalOpenedReview = useCallback(() => {
    setStep((prev) => (prev === 'camera_continue_to_review' ? 'review_edit_values' : prev));
  }, []);
  const signalEditedValues = useCallback(() => {
    setStep((prev) => (prev === 'review_edit_values' ? 'review_save_section' : prev));
  }, []);
  const signalSavedSection = useCallback(() => {
    setStep((prev) => (prev === 'review_save_section' ? 'history_open_details' : prev));
  }, []);
  const signalOpenedDetails = useCallback(() => {
    setStep((prev) => (prev === 'history_open_details' ? 'history_upload' : prev));
  }, []);
  const signalUploaded = useCallback(() => {
    setStep((prev) => (prev === 'history_upload' ? 'done' : prev));
  }, []);

  const value = useMemo<GuideContextValue>(() => ({
    isActive,
    step,
    start,
    stop,
    next,
    shouldHighlight: (id: string) => {
      if (!isActive) return false;
      switch (step) {
        case 'camera_select_fullscan': return id === 'fullscan-picker' || id === 'fullscan-create';
        case 'camera_select_section': return id.startsWith('menu-');
        case 'injection_select_mode':
          return id === 'menu-injection-mainMenu' || id === 'menu-injection-subMenuGraphic' || id === 'menu-injection-switchType';
        case 'camera_continue_to_review': return id === 'continue-button';
        case 'review_edit_values': return id.startsWith('review-input');
        case 'review_save_section': return id === 'review-save';
        case 'history_open_details': return id === `history-item-${guideSelectedScanId}` || id === `history-details-${guideSelectedScanId}`;
        case 'history_upload': return id === `history-upload-${guideSelectedScanId}` || id === `history-update-${guideSelectedScanId}`;
        default: return false;
      }
    },
    signalSelectedFullScan,
    signalSelectedSection,
    signalSelectedInjectionMode,
    signalOpenedReview,
    signalEditedValues,
    signalSavedSection,
    signalOpenedDetails,
    signalUploaded,
    setGuideSelectedScanId,
  }), [isActive, step, start, stop, next, signalSelectedFullScan, signalSelectedSection, signalSelectedInjectionMode, signalOpenedReview, signalEditedValues, signalSavedSection, signalOpenedDetails, signalUploaded, guideSelectedScanId]);

  return (
    <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
  );
};

export const useGuide = () => {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide must be used within GuideProvider');
  return ctx;
};


