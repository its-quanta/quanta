export const ESTIMATE_UPDATED_EVENT = "quanta:estimate-updated";

export function dispatchEstimateUpdated(projectId: string): void {
  window.dispatchEvent(
    new CustomEvent(ESTIMATE_UPDATED_EVENT, { detail: { projectId } })
  );
}
