import React from 'react';
import { Box as GSBox, Pressable as GSPressable } from '@gluestack-ui/themed';
import { useTemplateLayout, type TemplateLayout } from '../hooks/useTemplateLayout';

interface Props {
  layout: TemplateLayout | null;
  isActive?: boolean;
  color?: string;
  onBoxPress?: (boxId: string) => void;
}

const TemplateOverlay: React.FC<Props> = ({ layout, isActive = true, color, onBoxPress }) => {
  const boxes = useTemplateLayout({ layout, color });
  if (!isActive || !layout) return null;

  return (
    <GSBox position="absolute" top={0} left={0} right={0} bottom={0}>
      {boxes.map(box => (
        <GSPressable key={box.id} onPress={() => onBoxPress?.(box.id)}>
          <GSBox
            position="absolute"
            left={box.x}
            top={box.y}
            width={box.width}
            height={box.height}
            borderStyle="dashed"
            borderColor={box.color}
            borderWidth={2}
          />
        </GSPressable>
      ))}
    </GSBox>
  );
};

export default TemplateOverlay;

 
