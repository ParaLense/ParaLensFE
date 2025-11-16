import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text as GluestackText } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogBackdrop, 
  AlertDialogBody, 
  AlertDialogContent, 
  AlertDialogFooter, 
  AlertDialogHeader 
} from '@/components/ui/alert-dialog';
import { CameraPermissionStatus } from './useCameraPermission';

interface CameraPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
  hasPermission: CameraPermissionStatus;
  debugStatus?: string;
}

export const CameraPermissionModal: React.FC<CameraPermissionModalProps> = ({
  isOpen,
  onClose,
  onRequestPermission,
  hasPermission,
  debugStatus,
}) => {
  const isDenied = hasPermission === 'denied';

  return (
    <>
      {/* Fallback UI when permission is not granted */}
      {!['authorized', 'granted'].includes(hasPermission) && (
        <Box className="flex-1 items-center justify-center bg-background-950 px-6">
          <Heading size="md" className="text-typography-50">
            Kamera-Berechtigung erforderlich
          </Heading>
          <Heading size="sm" className="text-typography-50 mt-2">
            Um die Kamera zu verwenden, benötigen wir Ihre Erlaubnis.
          </Heading>
        </Box>
      )}
      
      <AlertDialog isOpen={isOpen} onClose={onClose}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading size="lg">Kamera-Berechtigung</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <GluestackText>
              {isDenied 
                ? 'Die Kamera-Berechtigung wurde verweigert. Um die App zu verwenden, müssen Sie die Berechtigung in den Einstellungen aktivieren.'
                : 'Diese App benötigt Zugriff auf Ihre Kamera, um Bilder zu scannen und zu analysieren. Bitte erteilen Sie die Berechtigung, um fortzufahren.'
              }
            </GluestackText>
            {debugStatus && (
              <GluestackText className="text-typography-400 mt-2 text-sm">
                Status: {debugStatus}
              </GluestackText>
            )}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={onClose}
            >
              <ButtonText>Abbrechen</ButtonText>
            </Button>
            <Button
              action="primary"
              onPress={onRequestPermission}
            >
              <ButtonText>
                {isDenied ? 'Erneut versuchen' : 'Berechtigung erteilen'}
              </ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
