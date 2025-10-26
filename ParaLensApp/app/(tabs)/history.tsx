import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal as RNModal,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useFullScan } from "@/features/fullscan/fullscan-context";
import { useI18n } from "@/features/settings/i18n";
import { useSettings } from "@/features/settings/settings-context";

const chipColors: Record<string, string> = {
  injection: "bg-success-600",
  holdingPressure: "bg-warning-500",
  dosing: "bg-info-500",
  cylinderHeating: "bg-primary-500",
};

export default function HistoryScreen() {
  const { fullScans } = useFullScan();
  const { theme } = useSettings();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const selected = useMemo(
    () => fullScans.find((fs) => fs.id === selectedId) ?? null,
    [fullScans, selectedId],
  );

  return (
    <Box
      style={{ flex: 1, padding: 16 }}
      className={isDark ? "bg-backgroundDark950" : "bg-backgroundLight0"}
    >
      <Heading size="lg" className={`mb-3 ${isDark ? "text-typography-50" : "text-typography-900"}`}>
        Full Scans
      </Heading>
      <FlatList
        data={fullScans}
        ListEmptyComponent={() => (
          <Text
            className={`mt-6 ${
              isDark ? "text-typography-200" : "text-typography-600"
            }`}
          >
            {t("noFullScans") ?? "Keine Full Scans vorhanden"}
          </Text>
        )}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const status = {
            injection: !!item.injection,
            holdingPressure: !!item.holdingPressure,
            dosing: !!item.dosing,
            cylinderHeating: !!item.cylinderHeating,
          };

          return (
            <Box
              className={`${
                isDark
                  ? "bg-backgroundDark900 border border-backgroundDark800"
                  : "bg-backgroundLight100 border border-backgroundLight200"
              } p-3 rounded mb-2.5`}
            >
              <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <VStack>
                  <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                    {(item.author || t("unknown") || "Unbekannt").toString()}
                  </Text>
                  <Text
                    className={
                      isDark ? "text-typography-300" : "text-typography-600"
                    }
                  >
                    {new Date(item.date).toLocaleString()}
                  </Text>
                </VStack>
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => {
                    setSelectedId(item.id);
                    setIsDetailsOpen(true);
                  }}
                >
                  <Text>{t("details") ?? "Details"}</Text>
                </Button>
              </HStack>

              <HStack className="mt-3 flex-wrap gap-2">
                {Object.entries(status).map(([key, val]) => (
                  <Box
                    key={key}
                    className={`px-2 py-1 rounded ${
                      val
                        ? chipColors[key] ?? "bg-success-500"
                        : isDark
                        ? "bg-backgroundDark800"
                        : "bg-backgroundLight200"
                    }`}
                  >
                    <Text
                      className={
                        val
                          ? "text-typography-0"
                          : isDark
                          ? "text-typography-400"
                          : "text-typography-600"
                      }
                    >
                      {key}
                    </Text>
                  </Box>
                ))}
              </HStack>
            </Box>
          );
        }}
      />

      <RNModal
        transparent
        animationType="fade"
        visible={isDetailsOpen}
        onRequestClose={() => setIsDetailsOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
          onPress={() => setIsDetailsOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              padding: 20,
              borderRadius: 20,
              maxHeight: "80%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Heading
              size="md"
              className={isDark ? "text-typography-50" : "text-typography-900"}
            >
              {t("fullScanDetails") ?? "Full Scan Details"}
            </Heading>

            <ScrollView style={{ marginTop: 16 }}>
              {!selected ? (
                <Text className="text-typography-500">
                  {t("noSelection") ?? "Keine Auswahl"}
                </Text>
              ) : (
                <VStack className="gap-4">
                  <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                    {(t("author") ?? "Autor") + ": "}
                    {selected.author}
                  </Text>
                  <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                    {(t("date") ?? "Datum") + ": "}
                    {new Date(selected.date).toLocaleString()}
                  </Text>
                  <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
                    {t("savedSections") ?? "Gespeicherte Bereiche"}
                  </Heading>

                  {([
                    "injection",
                    "dosing",
                    "holdingPressure",
                    "cylinderHeating",
                  ] as const).map((key) => (
                    <VStack
                      key={key}
                      className="p-3 rounded gap-1"
                      style={{
                        backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                      }}
                    >
                      <Text className={isDark ? "text-typography-0" : "text-typography-900"}>
                        {key}
                      </Text>
                      {!selected[key] ? (
                        <Text className="text-typography-400">
                          {t("notAvailable") ?? "Nicht vorhanden"}
                        </Text>
                      ) : (
                        <SectionDetails
                          sectionKey={key}
                          data={selected[key]}
                          isDark={isDark}
                        />
                      )}
                    </VStack>
                  ))}
                </VStack>
              )}
            </ScrollView>

            <Button
              variant="outline"
              action="secondary"
              className="mt-6"
              onPress={() => setIsDetailsOpen(false)}
            >
              <Text>{t("close") ?? "Schließen"}</Text>
            </Button>
          </Pressable>
        </Pressable>
      </RNModal>
    </Box>
  );
}

function SectionDetails({
  sectionKey,
  data,
  isDark,
}: {
  sectionKey: string;
  data: any;
  isDark: boolean;
}) {
  if (sectionKey === "injection") {
    return (
      <VStack className="gap-2">
        {data?.mainMenu && (
          <DataBlock
            title="Main Menu"
            entries={Object.entries(data.mainMenu)}
            isDark={isDark}
          />
        )}
        {Array.isArray(data?.subMenuValues?.values) && (
          <ArrayBlock
            title="Sub Menu · Werte"
            entries={data.subMenuValues.values}
            columns={["index", "v", "v2"]}
            isDark={isDark}
          />
        )}
        {data?.switchType && (
          <DataBlock
            title="Switch Type"
            entries={Object.entries(data.switchType)}
            isDark={isDark}
          />
        )}
      </VStack>
    );
  }

  if (sectionKey === "holdingPressure") {
    return (
      <VStack className="gap-2">
        {data?.mainMenu && (
          <DataBlock
            title="Main Menu"
            entries={Object.entries(data.mainMenu)}
            isDark={isDark}
          />
        )}
        {Array.isArray(data?.subMenusValues?.values) && (
          <ArrayBlock
            title="Sub Menu · Werte"
            entries={data.subMenusValues.values}
            columns={["index", "t", "p"]}
            isDark={isDark}
          />
        )}
      </VStack>
    );
  }

  if (sectionKey === "dosing") {
    return (
      <VStack className="gap-2">
        {data?.mainMenu && (
          <DataBlock
            title="Main Menu"
            entries={Object.entries(data.mainMenu)}
            isDark={isDark}
          />
        )}
        {Array.isArray(data?.dosingSpeedsValues?.values) && (
          <ArrayBlock
            title="Speeds"
            entries={data.dosingSpeedsValues.values}
            columns={["index", "v", "v2"]}
            isDark={isDark}
          />
        )}
        {Array.isArray(data?.dosingPressuresValues?.values) && (
          <ArrayBlock
            title="Pressures"
            entries={data.dosingPressuresValues.values}
            columns={["index", "v", "v2"]}
            isDark={isDark}
          />
        )}
      </VStack>
    );
  }

  if (sectionKey === "cylinderHeating") {
    return (
      <VStack className="gap-1">
        {Object.entries(data).map(([label, value]) => (
          <HStack key={label} style={{ justifyContent: 'space-between' }}>
            <Text
              className={
                isDark ? "text-typography-200" : "text-typography-600"
              }
            >
              {label}
            </Text>
            <Text
              className={
                isDark ? "text-typography-50" : "text-typography-900"
              }
            >
              {String(value)}
            </Text>
          </HStack>
        ))}
      </VStack>
    );
  }

  return null;
}

function DataBlock({
  title,
  entries,
  isDark,
}: {
  title: string;
  entries: [string, unknown][];
  isDark: boolean;
}) {
  return (
    <VStack className="gap-1">
      <Text
        className={`mb-1 ${isDark ? "text-typography-200" : "text-typography-600"}`}
      >
        {title}
      </Text>
      {entries.map(([label, value]) => (
        <HStack key={label} style={{ justifyContent: 'space-between' }}>
          <Text
            className={isDark ? "text-typography-200" : "text-typography-600"}
          >
            {label}
          </Text>
          <Text
            className={isDark ? "text-typography-50" : "text-typography-900"}
          >
            {String(value)}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

function ArrayBlock({
  title,
  entries,
  columns,
  isDark,
}: {
  title: string;
  entries: any[];
  columns: string[];
  isDark: boolean;
}) {
  return (
    <VStack className="gap-1">
      <Text
        className={`mb-1 ${isDark ? "text-typography-200" : "text-typography-600"}`}
      >
        {title}
      </Text>
      <VStack className="gap-1">
        <HStack style={{ justifyContent: 'space-between' }}>
          {columns.map((col) => (
            <Text
              key={col}
              className={
                isDark ? "text-typography-200" : "text-typography-600"
              }
            >
              {col}
            </Text>
          ))}
        </HStack>
        {entries.map((row, idx) => (
          <HStack key={idx} style={{ justifyContent: 'space-between' }}>
            {columns.map((col) => (
              <Text
                key={col}
                className={
                  isDark ? "text-typography-50" : "text-typography-900"
                }
              >
                {String(row[col] ?? "-")}
              </Text>
            ))}
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}


