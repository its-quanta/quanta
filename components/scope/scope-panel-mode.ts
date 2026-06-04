export type ScopePanelMode = "suggestions" | "takeoff";

export const SCOPE_PANEL_MODES: {
  id: ScopePanelMode;
  label: string;
}[] = [
  { id: "suggestions", label: "Review suggestions" },
  { id: "takeoff", label: "Takeoff items" },
];
