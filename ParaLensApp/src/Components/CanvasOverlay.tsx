import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface CanvasOverlayProps {
  onBoxesChange?: (boxes: Box[]) => void;
  isActive?: boolean;
}

const PRESET_BOXES: Box[] = [
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

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  onBoxesChange,
  isActive = false,
}) => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      setBoxes(PRESET_BOXES);
      onBoxesChange?.(PRESET_BOXES);
    } else {
      setBoxes([]);
      onBoxesChange?.([]);
    }
  }, [isActive, onBoxesChange]);

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
export type { Box }; 