import { useCallback, useMemo, useReducer } from "react";
import { TemplateLayout } from "@/features/templates/use-template-layout";
import type { OcrFieldResult, UnitSystem, ValueMode } from "@/features/ocr";
import type { ScanMenu } from "@/features/fullscan/types";

type InjectionMode = "mainMenu" | "subMenuGraphic" | "switchType" | null;
type HoldingPressureMode = "mainMenu" | "subMenuGraphic" | null;
type DosingMode = "mainMenu" | "subMenuGraphic" | null;

type OcrSnapshot = {
  bestFields: OcrFieldResult[];
  ocrMap: Record<string, string>;
  unitConfig?: {
    system?: UnitSystem;
    mode?: ValueMode;
  };
} | null;

type ScanSelectionState = {
  selectedMenu: ScanMenu | null;
  injectionMode: InjectionMode;
  holdingMode: HoldingPressureMode;
  dosingMode: DosingMode;
  ocrSnapshot: OcrSnapshot;
};

type Action =
  | { type: "reset" }
  | { type: "setMenu"; menu: ScanMenu | null }
  | { type: "setInjectionMode"; mode: InjectionMode }
  | { type: "setHoldingMode"; mode: HoldingPressureMode }
  | { type: "setDosingMode"; mode: DosingMode }
  | { type: "setOcrSnapshot"; snapshot: OcrSnapshot };

const initialState: ScanSelectionState = {
  selectedMenu: null,
  injectionMode: null,
  holdingMode: null,
  dosingMode: null,
  ocrSnapshot: null,
};

const reducer = (state: ScanSelectionState, action: Action): ScanSelectionState => {
  switch (action.type) {
    case "reset":
      return initialState;
    case "setMenu":
      return {
        ...state,
        selectedMenu: action.menu,
        injectionMode: action.menu === "injection" ? state.injectionMode : null,
        holdingMode: action.menu === "holdingPressure" ? state.holdingMode : null,
        dosingMode: action.menu === "dosing" ? state.dosingMode : null,
      };
    case "setInjectionMode":
      return { ...state, injectionMode: action.mode };
    case "setHoldingMode":
      return { ...state, holdingMode: action.mode };
    case "setDosingMode":
      return { ...state, dosingMode: action.mode };
    case "setOcrSnapshot":
      return { ...state, ocrSnapshot: action.snapshot };
    default:
      return state;
  }
};

export const useScanSelection = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (state.selectedMenu) parts.push(state.selectedMenu);
    if (state.injectionMode) parts.push(state.injectionMode);
    if (!state.injectionMode && state.holdingMode) parts.push(state.holdingMode);
    if (!state.injectionMode && !state.holdingMode && state.dosingMode)
      parts.push(state.dosingMode);
    return parts.join(" · ");
  }, [state]);

  const currentLayout = useMemo(() => {
    if (!state.selectedMenu) return null;
    if (state.selectedMenu === "injection") {
      if (state.injectionMode === "subMenuGraphic")
        return TemplateLayout.InjectionSpeed_ScrollBar;
      if (state.injectionMode === "switchType")
        return TemplateLayout.Injection_SwitchType;
      return TemplateLayout.Injection;
    }
    if (state.selectedMenu === "holdingPressure") {
      if (state.holdingMode === "subMenuGraphic")
        return TemplateLayout.HoldingPressure_ScrollBar;
      return TemplateLayout.HoldingPressure;
    }
    if (state.selectedMenu === "dosing") {
      if (state.dosingMode === "subMenuGraphic")
        return TemplateLayout.Dosing_ScrollBar;
      return TemplateLayout.Dosing;
    }
    if (state.selectedMenu === "cylinderHeating") {
      return TemplateLayout.CylinderHeating;
    }
    return null;
  }, [state]);

  const setSelectedMenu = useCallback(
    (menu: ScanMenu | null) => dispatch({ type: "setMenu", menu }),
    [],
  );
  const setInjectionMode = useCallback(
    (mode: InjectionMode) => dispatch({ type: "setInjectionMode", mode }),
    [],
  );
  const setHoldingMode = useCallback(
    (mode: HoldingPressureMode) => dispatch({ type: "setHoldingMode", mode }),
    [],
  );
  const setDosingMode = useCallback(
    (mode: DosingMode) => dispatch({ type: "setDosingMode", mode }),
    [],
  );
  const resetToRootMenu = useCallback(() => dispatch({ type: "reset" }), []);
  const setOcrSnapshot = useCallback(
    (snapshot: OcrSnapshot) => dispatch({ type: "setOcrSnapshot", snapshot }),
    [],
  );

  return {
    // expose state slices for convenience
    selectedMenu: state.selectedMenu,
    injectionMode: state.injectionMode,
    holdingMode: state.holdingMode,
    dosingMode: state.dosingMode,
    ocrSnapshot: state.ocrSnapshot,
    headerLabel,
    currentLayout,
    setSelectedMenu,
    setInjectionMode,
    setHoldingMode,
    setDosingMode,
    resetToRootMenu,
    setOcrSnapshot,
  };
};

export type { InjectionMode, HoldingPressureMode, DosingMode, OcrSnapshot };
