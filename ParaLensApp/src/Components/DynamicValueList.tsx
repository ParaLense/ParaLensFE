import Feather from '@expo/vector-icons/Feather';
import { Box, Text as GluestackText, HStack, Input, InputField, Pressable, VStack } from '@gluestack-ui/themed';
import React from 'react';

export interface IndexValuePair { index: string; v?: string; v2?: string; t?: string; p?: string; }

interface Props {
  rows: IndexValuePair[];
  setRows: (rows: IndexValuePair[]) => void;
  labels: { v?: string; v2?: string; t?: string; p?: string };
}

const DynamicValueList: React.FC<Props> = ({ rows, setRows, labels }) => {
  return (
    <VStack space="sm">
      {rows.map((row, i) => (
        <HStack key={i} space="sm" alignItems="center" justifyContent="space-between">
          <HStack space="sm" alignItems="center" flex={1}>
            <Box px={10} py={10} bg="$backgroundDark800" borderRadius="$sm">
              <GluestackText color="$textLight50">{i + 1}</GluestackText>
            </Box>
            {labels.v !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.v} value={row.v || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), v: txt }; setRows(copy);
              }} /></Input>
            )}
            {labels.v2 !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.v2} value={row.v2 || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), v2: txt }; setRows(copy);
              }} /></Input>
            )}
            {labels.t !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.t} value={row.t || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), t: txt }; setRows(copy);
              }} /></Input>
            )}
            {labels.p !== undefined && (
              <Input flex={1}><InputField keyboardType="numeric" placeholder={labels.p} value={row.p || ''} onChangeText={(txt) => {
                const copy = [...rows]; copy[i] = { ...copy[i], index: String(i + 1), p: txt }; setRows(copy);
              }} /></Input>
            )}
          </HStack>
          <Pressable
            accessibilityLabel="Zeile löschen"
            onPress={() => {
              const filtered = rows.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, index: String(idx + 1) }));
              setRows(filtered.length ? filtered : [{ index: '1' } as IndexValuePair]);
            }}
            disabled={rows.length <= 1}
            opacity={rows.length <= 1 ? 0.4 : 1}
          >
            <Feather name="trash-2" size={20} color="#fff" />
          </Pressable>
        </HStack>
      ))}
      <HStack mt={4} alignItems="center" justifyContent="flex-start">
        <Pressable
          accessibilityLabel="Zeile hinzufügen"
          onPress={() => {
            const nextIndex = rows.length + 1;
            setRows([...rows, { index: String(nextIndex) } as IndexValuePair]);
          }}
        >
          <HStack space="sm" alignItems="center">
            <Feather name="plus" size={20} color="#fff" />
            <GluestackText color="$textLight50">Zeile hinzufügen</GluestackText>
          </HStack>
        </Pressable>
      </HStack>
    </VStack>
  );
};

export default DynamicValueList;


