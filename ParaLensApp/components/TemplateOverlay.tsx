import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { useTemplateLayout, type TemplateLayout } from '@/features/templates/use-template-layout';

interface TemplateOverlayProps {
  layout: TemplateLayout | null;
  isActive?: boolean;
  color?: string;
  onBoxPress?: (boxId: string) => void;
  boxes?: Array<{ id: string; x: number; y: number; width: number; height: number; color?: string; isInner?: boolean }>;
  viewportWidth?: number;
  viewportHeight?: number;
  widthPercent?: number;
  aspectRatio?: number;
  containerWidth?: number;
  containerHeight?: number;
  offsetX?: number;
  offsetY?: number;
}

const TemplateOverlay: React.FC<TemplateOverlayProps> = ({
  layout,
  isActive = true,
  color,
  onBoxPress,
  boxes,
  viewportHeight,
  viewportWidth,
  widthPercent,
  aspectRatio,
  containerHeight,
  containerWidth,
  offsetX,
  offsetY,
}) => {
  const templateBoxes = useTemplateLayout({
    layout,
    color,
    viewportHeight,
    viewportWidth,
    widthPercent,
    aspectRatio,
    containerHeight,
    containerWidth,
    offsetX,
    offsetY,
  });

  if (!isActive) return null;

  const renderBox = (box: { id: string; x: number; y: number; width: number; height: number; color?: string; isInner?: boolean }) => {
    const boxStyle = box.isInner ? styles.innerBox : styles.outerBox;
    const boxColor = box.color || '#FFFFFF';

    return (
      <Pressable key={box.id} onPress={() => onBoxPress?.(box.id)}>
        <Box
          style={[
            styles.baseBox,
            boxStyle,
            {
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              borderColor: boxColor,
            },
          ]}
        />
      </Pressable>
    );
  };

  return (
    <Box style={styles.fullScreen}>
      {(boxes ?? templateBoxes).map(renderBox)}
    </Box>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  baseBox: {
    position: 'absolute',
    borderRadius: 15,
  },
  outerBox: {
    borderWidth: 4,
    borderStyle: 'solid',
  },
  innerBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});

export default TemplateOverlay;
