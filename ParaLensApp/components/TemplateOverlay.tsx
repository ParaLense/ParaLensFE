import React from 'react';
import { Pressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { useTemplateLayout, type TemplateLayout } from '@/features/templates/use-template-layout';

interface TemplateOverlayProps {
  layout: TemplateLayout | null;
  isActive?: boolean;
  color?: string;
  onBoxPress?: (boxId: string) => void;
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
  viewportHeight,
  viewportWidth,
  widthPercent,
  aspectRatio,
  containerHeight,
  containerWidth,
  offsetX,
  offsetY,
}) => {
  const boxes = useTemplateLayout({
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
  if (!isActive || !layout) return null;

  return (
    <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {boxes.map(box => (
        <Pressable key={box.id} onPress={() => onBoxPress?.(box.id)}>
          <Box
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              borderStyle: 'dashed',
              borderColor: box.color,
              borderWidth: 2,
            }}
          />
        </Pressable>
      ))}
    </Box>
  );
};

export default TemplateOverlay;


