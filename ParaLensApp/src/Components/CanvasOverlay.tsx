import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Box, CanvasOverlayProps } from '@/types';
import { COLORS, SPACING, SIZES } from '@/constants';

const CanvasOverlay: React.FC<CanvasOverlayProps> = memo(({
  onBoxesChange,
  isActive = false,
  selectedBoxId,
  onBoxSelect,
}) => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (isActive) {
        // Import preset boxes dynamically to avoid circular dependencies
        const { PRESET_BOXES } = require('@constants/index');
        setBoxes(PRESET_BOXES);
        onBoxesChange?.(PRESET_BOXES);
      } else {
        setBoxes([]);
        onBoxesChange?.([]);
      }
    } catch (err) {
      console.error('Error setting up canvas overlay:', err);
      setError('Failed to initialize canvas overlay');
    }
  }, [isActive, onBoxesChange]);

  const handleBoxPress = useCallback((boxId: string) => {
    try {
      const newSelectedBoxId = selectedBoxId === boxId ? null : boxId;
      onBoxSelect?.(newSelectedBoxId);
    } catch (err) {
      console.error('Error handling box press:', err);
      setError('Failed to select box');
    }
  }, [selectedBoxId, onBoxSelect]);

  const handleDeleteBox = useCallback((boxId: string) => {
    try {
      const updatedBoxes = boxes.filter(box => box.id !== boxId);
      setBoxes(updatedBoxes);
      onBoxesChange?.(updatedBoxes);
      onBoxSelect?.(null);
    } catch (err) {
      console.error('Error deleting box:', err);
      setError('Failed to delete box');
    }
  }, [boxes, onBoxesChange, onBoxSelect]);

  if (!isActive) {
    return null;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {boxes.map((box) => (
        <TouchableOpacity
          key={box.id}
          style={[
            styles.box,
            {
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              borderColor: selectedBoxId === box.id ? '#FFFFFF' : box.color,
              borderWidth: selectedBoxId === box.id ? 3 : 2,
            },
          ]}
          onPress={() => handleBoxPress(box.id)}
          activeOpacity={0.8}
          accessibilityLabel={`Box ${box.id}`}
          accessibilityHint="Double tap to select or deselect this box"
        >
          {selectedBoxId === box.id && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteBox(box.id)}
              accessibilityLabel="Delete box"
              accessibilityHint="Tap to delete this box"
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  errorContainer: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: SIZES.text.small,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
  },
  retryButtonText: {
    color: COLORS.error,
    fontSize: SIZES.text.small,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: COLORS.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

CanvasOverlay.displayName = 'CanvasOverlay';

export default CanvasOverlay; 