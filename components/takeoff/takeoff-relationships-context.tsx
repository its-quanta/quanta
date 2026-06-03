"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { useGlobalCommandOptional } from "@/components/command-palette/global-command-provider";
import { TakeoffItemRelationshipsDrawer } from "@/components/takeoff/takeoff-item-relationships-drawer";
import { TakeoffSourceDialog } from "@/components/takeoff/takeoff-source-dialog";
import {
  buildDrawingReferenceContext,
  formatSourceDocumentFileName,
} from "@/src/lib/takeoff/drawing-reference";
import { buildTakeoffItemRelationships } from "@/src/lib/takeoff/item-relationships";
import type {
  ScopeGapSummary,
  WorkspaceTabValue,
} from "@/src/lib/scope-gaps/types";
import type {
  AssemblyPackage,
  Document,
  DocumentPage,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  StandardLinkWithStandard,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

type TakeoffRelationshipsContextValue = {
  openRelationships: (takeoffItem: TakeoffItem) => void;
};

const TakeoffRelationshipsContext =
  createContext<TakeoffRelationshipsContextValue | null>(null);

export function useTakeoffRelationships(): TakeoffRelationshipsContextValue {
  const context = useContext(TakeoffRelationshipsContext);
  if (!context) {
    throw new Error(
      "useTakeoffRelationships must be used within TakeoffRelationshipsProvider"
    );
  }
  return context;
}

export function useTakeoffRelationshipsOptional():
  | TakeoffRelationshipsContextValue
  | null {
  return useContext(TakeoffRelationshipsContext);
}

type TakeoffRelationshipsProviderProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  assemblyPackages: AssemblyPackage[];
  pricingItems: PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  projectStandardLinks: StandardLinkWithStandard[];
  clarifications: TenderClarification[];
  scopeGapSummary: ScopeGapSummary;
  onNavigateTab: (
    tab: WorkspaceTabValue,
    options?: { priceTakeoff?: string }
  ) => void;
  children: ReactNode;
};

export function TakeoffRelationshipsProvider({
  projectId,
  documents,
  documentPages,
  takeoffItems,
  takeoffAssemblies,
  assemblyPackages,
  pricingItems,
  materialItems,
  labourItems,
  projectStandardLinks,
  clarifications,
  scopeGapSummary,
  onNavigateTab,
  children,
}: TakeoffRelationshipsProviderProps) {
  const router = useRouter();
  const globalCommand = useGlobalCommandOptional();
  const [activeItem, setActiveItem] = useState<TakeoffItem | null>(null);
  const [sourceItem, setSourceItem] = useState<TakeoffItem | null>(null);

  const drawingContext = useMemo(
    () => buildDrawingReferenceContext(documents, documentPages),
    [documents, documentPages]
  );

  const assemblyByTakeoffId = useMemo(
    () =>
      new Map(
        takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [takeoffAssemblies]
  );

  const pricingByTakeoffId = useMemo(
    () =>
      new Map(
        pricingItems.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [pricingItems]
  );

  const packageById = useMemo(
    () => new Map(assemblyPackages.map((pkg) => [pkg.id, pkg] as const)),
    [assemblyPackages]
  );

  const relationshipsView = useMemo(() => {
    if (!activeItem) {
      return null;
    }

    const assembly = assemblyByTakeoffId.get(activeItem.id) ?? null;
    const assemblyPackage = assembly
      ? (packageById.get(assembly.assembly_package_id) ?? null)
      : null;

    return buildTakeoffItemRelationships({
      takeoffItem: activeItem,
      takeoffAssembly: assembly,
      assemblyPackage,
      pricingItem: pricingByTakeoffId.get(activeItem.id) ?? null,
      materialItems,
      labourItems,
      standardLinks: projectStandardLinks,
      clarifications,
      scopeGaps: scopeGapSummary.gaps,
      sourceDocumentName: formatSourceDocumentFileName(
        activeItem,
        drawingContext
      ),
    });
  }, [
    activeItem,
    assemblyByTakeoffId,
    packageById,
    pricingByTakeoffId,
    materialItems,
    labourItems,
    projectStandardLinks,
    clarifications,
    scopeGapSummary.gaps,
    drawingContext,
  ]);

  const openRelationships = useCallback((takeoffItem: TakeoffItem) => {
    setActiveItem(takeoffItem);
    globalCommand?.setFocusedTakeoffItem({
      id: takeoffItem.id,
      itemName: takeoffItem.item_name,
      trade: takeoffItem.trade,
    });
  }, [globalCommand]);

  useEffect(() => {
    function handleOpenRelationships(event: Event) {
      const detail = (event as CustomEvent<{ takeoffItemId?: string }>).detail;
      const itemId = detail?.takeoffItemId;
      if (!itemId) {
        return;
      }
      const item = takeoffItems.find((row) => row.id === itemId);
      if (item) {
        openRelationships(item);
      }
    }

    window.addEventListener("quanta:open-relationships", handleOpenRelationships);
    return () =>
      window.removeEventListener(
        "quanta:open-relationships",
        handleOpenRelationships
      );
  }, [openRelationships, takeoffItems]);

  useEffect(() => {
    if (!activeItem) {
      globalCommand?.setFocusedTakeoffItem(null);
      return;
    }
    globalCommand?.setFocusedTakeoffItem({
      id: activeItem.id,
      itemName: activeItem.item_name,
      trade: activeItem.trade,
    });
  }, [activeItem, globalCommand]);

  return (
    <TakeoffRelationshipsContext.Provider value={{ openRelationships }}>
      {children}

      <TakeoffItemRelationshipsDrawer
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveItem(null);
          }
        }}
        view={relationshipsView}
        onOpenPackage={(packageId) => {
          setActiveItem(null);
          router.push(`/templates/${packageId}`);
        }}
        onOpenPricing={(takeoffItemId) => {
          setActiveItem(null);
          onNavigateTab("commercial", { priceTakeoff: takeoffItemId });
        }}
        onOpenMaterials={() => {
          setActiveItem(null);
          onNavigateTab("estimate");
        }}
        onOpenLabour={() => {
          setActiveItem(null);
          onNavigateTab("estimate");
        }}
        onOpenStandards={() => {
          setActiveItem(null);
          router.push("/standards");
        }}
        onOpenSubmission={() => {
          setActiveItem(null);
          onNavigateTab("submission");
        }}
        onOpenSource={() => {
          if (activeItem) {
            setSourceItem(activeItem);
          }
        }}
      />

      <TakeoffSourceDialog
        item={sourceItem}
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
        assembly={
          sourceItem
            ? (assemblyByTakeoffId.get(sourceItem.id) ?? null)
            : null
        }
        open={Boolean(sourceItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSourceItem(null);
          }
        }}
      />
    </TakeoffRelationshipsContext.Provider>
  );
}
