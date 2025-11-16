import React from 'react';
import Icon from '@expo/vector-icons/Feather';
import {VStack} from "@/components/ui/vstack";
import {HStack} from "@/components/ui/hstack";
import { Box } from './ui/box';
import {Input, InputField} from "@/components/ui/input";
import {Pressable} from "@/components/ui/pressable";
import {Text} from "@/components/ui/text";

export interface IndexValuePair { index: string; v?: string; v2?: string; t?: string; p?: string; }

interface Props {
  rows: IndexValuePair[];
  setRows: (rows: IndexValuePair[]) => void;
  labels: { v?: string; v2?: string; t?: string; p?: string };
  isDark?: boolean;
}

const hydrateRow = (row: IndexValuePair): IndexValuePair => ({ index: row.index, v: row.v, v2: row.v2, t: row.t, p: row.p });

const DynamicValueList: React.FC<Props> = ({ rows, setRows, labels, isDark = false }) => {
  const normalized = rows.map(hydrateRow);

  const updateRow = (idx: number, key: keyof IndexValuePair, value: string) => {
    const copy = normalized.map((row, i) => (i === idx ? { ...row, [key]: value } : row)).map((row, i) => ({ ...row, index: String(i + 1) }));
    setRows(copy);
  };

  const removeRow = (idx: number) => {
    const filtered = normalized.filter((_, i) => i !== idx);
    const next = (filtered.length ? filtered : [{ index: '1' }]).map((row, i) => ({ ...row, index: String(i + 1) }));
    setRows(next);
  };

  const addRow = () => {
    const nextIndex = normalized.length + 1;
    setRows([...normalized, { index: String(nextIndex) } as IndexValuePair]);
  };

  const iconColor = isDark ? "#ffffff" : "#000000";
  const boxBgClass = isDark ? "bg-background-800" : "bg-background-200";

  return (
    <VStack className="gap-2">
      {normalized.map((row, i) => (
        <HStack key={i} className="gap-2 items-center justify-between">
          <HStack className="gap-2 items-center flex-1">
            <Box className={`px-2.5 py-2.5 ${boxBgClass} rounded-sm`}>
              <Text className={isDark ? "text-typography-50" : "text-typography-900"}>{i + 1}</Text>
            </Box>
            {labels.v !== undefined && (
              <Input className="flex-1"><InputField keyboardType="numeric" placeholder={labels.v} value={row.v || ''} onChangeText={(txt) => updateRow(i, 'v', txt)} style={{ color: isDark ? '#ffffff' : '#000000' }} /></Input>
            )}
            {labels.v2 !== undefined && (
              <Input className="flex-1"><InputField keyboardType="numeric" placeholder={labels.v2} value={row.v2 || ''} onChangeText={(txt) => updateRow(i, 'v2', txt)} style={{ color: isDark ? '#ffffff' : '#000000' }} /></Input>
            )}
            {labels.t !== undefined && (
              <Input className="flex-1"><InputField keyboardType="numeric" placeholder={labels.t} value={row.t || ''} onChangeText={(txt) => updateRow(i, 't', txt)} style={{ color: isDark ? '#ffffff' : '#000000' }} /></Input>
            )}
            {labels.p !== undefined && (
              <Input className="flex-1"><InputField keyboardType="numeric" placeholder={labels.p} value={row.p || ''} onChangeText={(txt) => updateRow(i, 'p', txt)} style={{ color: isDark ? '#ffffff' : '#000000' }} /></Input>
            )}
          </HStack>
          <Pressable
            className={rows.length <= 1 ? 'opacity-40' : 'opacity-100'}
            accessibilityLabel="Zeile löschen"
            onPress={() => {
              const filtered = rows.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, index: String(idx + 1) }));
              setRows(filtered.length ? filtered : [{ index: '1' } as IndexValuePair]);
            }}
            disabled={rows.length <= 1}
            
          >
            <Icon name="trash-2" size={20} color={iconColor} />
          </Pressable>
        </HStack>
      ))}
      <HStack className="mt-4 items-center justify-start">
        <Pressable accessibilityLabel="Zeile hinzufügen" onPress={addRow}>
          <HStack className="gap-2 items-center">
            <Icon name="plus" size={20} color={iconColor} />
            <Text className={isDark ? "text-typography-50" : "text-typography-900"}>Zeile hinzufügen</Text>
          </HStack>
        </Pressable>
      </HStack>
    </VStack>
  );
};

export default DynamicValueList;


