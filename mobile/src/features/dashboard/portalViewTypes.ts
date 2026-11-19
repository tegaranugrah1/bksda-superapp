import type { ViewStyle } from "react-native";
import type { ThemeColors, ResponsivePortalMetrics } from "@/theme/ThemeContext";
import type { createPortalStyles } from "./portalStyles";

export interface PortalViewProps {
  styles: ReturnType<typeof createPortalStyles>;
  colors: ThemeColors;
  r: ResponsivePortalMetrics;
  shadowXs: ViewStyle;
}

export type PortalServiceScreen = "menu" | "bmn" | "cuti";

export interface PortalModalViewProps extends Omit<PortalViewProps, "shadowXs"> {
  shadowLg: ViewStyle;
}

export interface PortalLeaveScanState {
  visible: boolean;
  title: string;
  fileName?: string | null;
  mimeType?: string;
  dataUrl?: string | null;
  blobUrl?: string | null;
  loading: boolean;
  error?: string | null;
}
