import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';

import { OverlayBox, ScanMenu } from '../types/common';

interface CanvasOverlayProps {
  menu: ScanMenu | null;
  onBoxesChange?: (boxes: OverlayBox[]) => void;
  isActive?: boolean;
}

const PRESET_BOXES: OverlayBox[] = [
  {
    id: 'preset_1',
    x: 50,
    y: 100,
    width: 120,
    height: 80,
    color: '#FF0000',
  },
  {
    id: 'preset_2',
    x: 200,
    y: 150,
    width: 100,
    height: 60,
    color: '#00FF00',
  },
  {
    id: 'preset_3',
    x: 100,
    y: 300,
    width: 150,
    height: 90,
    color: '#0000FF',
  },
  {
    id: 'preset_4',
    x: 250,
    y: 400,
    width: 80,
    height: 120,
    color: '#FFFF00',
  },
];

const MENU_PRESETS: Record<ScanMenu, OverlayBox[]> = {
  injection: [
    { id: 'inj_1', x: 40, y: 120, width: 140, height: 90, color: '#FF6B6B' },
    { id: 'inj_2', x: 210, y: 220, width: 110, height: 70, color: '#FF6B6B' },
  ],
  dosing: [
    { id: 'dos_1', x: 60, y: 80, width: 100, height: 60, color: '#4ECDC4' },
    { id: 'dos_2', x: 180, y: 160, width: 150, height: 100, color: '#4ECDC4' },
  ],
  holdingPressure: [
    { id: 'hp_1', x: 100, y: 140, width: 160, height: 100, color: '#FFE66D' },
  ],
  cylinderHeating: [
    { id: 'ch_1', x: 80, y: 260, width: 120, height: 80, color: '#5DA3FA' },
    { id: 'ch_2', x: 240, y: 360, width: 100, height: 120, color: '#5DA3FA' },
  ],
};

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  menu,
  onBoxesChange,
  isActive = false,
}) => {
  const [boxes, setBoxes] = useState<OverlayBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && menu) {
      const preset = MENU_PRESETS[menu] ?? PRESET_BOXES;
      setBoxes(preset);
      onBoxesChange?.(preset);
    } else {
      setBoxes([]);
      onBoxesChange?.([]);
    }
  }, [isActive, menu, onBoxesChange]);

  const handleBoxPress = (boxId: string) => {
    setSelectedBox(selectedBox === boxId ? null : boxId);
  };

  if (!isActive) {
    return null;
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
              borderColor: selectedBox === box.id ? '#FFFFFF' : box.color,
              borderWidth: selectedBox === box.id ? 3 : 2,
            },
          ]}
          onPress={() => handleBoxPress(box.id)}
          activeOpacity={0.8}
        >
          {selectedBox === box.id && (
            <View style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>×</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    flexDirection: 'column',
    gap: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF0000',
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

export default CanvasOverlay;
export type { OverlayBox as Box };