"use client";

import { useCallback, useEffect, useState } from "react";

import { ESTIMATE_UPDATED_EVENT } from "@/components/estimate/estimate-events";
import { fetchEstimateWorkspaceDataAction } from "@/src/lib/estimate/actions";
import type {
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export function useEstimateData(
  projectId: string,
  initialAssemblies: TakeoffItemAssemblyWithPackage[],
  initialPricingItems: PricingItem[],
  initialMaterialItems: ProjectMaterialItem[],
  initialLabourItems: ProjectLabourItem[]
) {
  const [takeoffAssemblies, setTakeoffAssemblies] = useState(initialAssemblies);
  const [pricingItems, setPricingItems] = useState(initialPricingItems);
  const [materialItems, setMaterialItems] = useState(initialMaterialItems);
  const [labourItems, setLabourItems] = useState(initialLabourItems);

  useEffect(() => {
    setTakeoffAssemblies(initialAssemblies);
  }, [initialAssemblies]);

  useEffect(() => {
    setPricingItems(initialPricingItems);
  }, [initialPricingItems]);

  useEffect(() => {
    setMaterialItems(initialMaterialItems);
  }, [initialMaterialItems]);

  useEffect(() => {
    setLabourItems(initialLabourItems);
  }, [initialLabourItems]);

  const refresh = useCallback(async () => {
    const result = await fetchEstimateWorkspaceDataAction(projectId);
    if (!result.error) {
      setTakeoffAssemblies(result.takeoffAssemblies);
      setPricingItems(result.pricingItems);
      setMaterialItems(result.materialItems);
      setLabourItems(result.labourItems);
    }
    return result;
  }, [projectId]);

  const optimisticRemoveMaterial = useCallback((itemId: string) => {
    setMaterialItems((current) => current.filter((row) => row.id !== itemId));
  }, []);

  const optimisticRemoveLabour = useCallback((itemId: string) => {
    setLabourItems((current) => current.filter((row) => row.id !== itemId));
  }, []);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (detail?.projectId && detail.projectId !== projectId) {
        return;
      }
      void refresh();
    };

    window.addEventListener(ESTIMATE_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(ESTIMATE_UPDATED_EVENT, handleUpdated);
    };
  }, [projectId, refresh]);

  return {
    takeoffAssemblies,
    pricingItems,
    materialItems,
    labourItems,
    refresh,
    optimisticRemoveMaterial,
    optimisticRemoveLabour,
  };
}
