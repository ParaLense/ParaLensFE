import React from "react";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface Props {
  isDark: boolean;
  t: (key: string) => string | undefined;
  onPickMain: () => void;
  onPickSubMenu: () => void;
  onPickSwitchType: () => void;
  onBack: () => void;
}

const InjectionSelection: React.FC<Props> = ({
  isDark,
  t,
  onPickMain,
  onPickSubMenu,
  onPickSwitchType,
  onBack,
}) => {
  return (
    <Box style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: isDark ? "#121212" : "#ffffff" }}>
      <Heading size="lg" className="mb-6" style={{ color: isDark ? "#ffffff" : "#000000" }}>
        {t("injectionSelect") ?? "Injection · Auswahl"}
      </Heading>
      <VStack className="w-5/6 gap-4">
        <Button onPress={onPickMain} style={{ backgroundColor: isDark ? "#ffffff" : "#000000" }}>
          <Text style={{ color: isDark ? "#000000" : "#ffffff" }}>{t("mainMenu")}</Text>
        </Button>
        <Button onPress={onPickSubMenu} style={{ backgroundColor: isDark ? "#ffffff" : "#000000" }}>
          <Text style={{ color: isDark ? "#000000" : "#ffffff" }}>{t("subMenuGraphic")}</Text>
        </Button>
        <Button onPress={onPickSwitchType} style={{ backgroundColor: isDark ? "#ffffff" : "#000000" }}>
          <Text style={{ color: isDark ? "#000000" : "#ffffff" }}>{t("switchType")}</Text>
        </Button>
      </VStack>
      <Button variant="outline" action="secondary" className="mt-8" onPress={onBack}>
        <Text>{t("cancel") ?? "Zurück"}</Text>
      </Button>
    </Box>
  );
};

export default InjectionSelection;

