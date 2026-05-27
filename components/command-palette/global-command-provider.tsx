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

import { GlobalCommandBar } from "@/components/command-palette/global-command-bar";
import { useAuthProfile } from "@/components/layout/auth-profile-provider";
import { fetchOrganisationCommandIndexAction } from "@/src/lib/command/actions";
import type {
  CommandIndexEntry,
  CommandWorkspaceContext,
} from "@/src/lib/command/types";

type GlobalCommandContextValue = {
  openCommandBar: () => void;
  setWorkspaceContext: (context: CommandWorkspaceContext | null) => void;
  setFocusedTakeoffItem: (
    item: CommandWorkspaceContext["takeoffItem"] | null
  ) => void;
};

const GlobalCommandContext = createContext<GlobalCommandContextValue | null>(
  null
);

export function useGlobalCommand(): GlobalCommandContextValue {
  const context = useContext(GlobalCommandContext);
  if (!context) {
    throw new Error("useGlobalCommand must be used within GlobalCommandProvider");
  }
  return context;
}

export function useGlobalCommandOptional(): GlobalCommandContextValue | null {
  return useContext(GlobalCommandContext);
}

type GlobalCommandProviderProps = {
  children: ReactNode;
};

export function GlobalCommandProvider({ children }: GlobalCommandProviderProps) {
  const profile = useAuthProfile();
  const organisationId = profile?.organisation_id ?? "";
  const [open, setOpen] = useState(false);
  const [orgEntries, setOrgEntries] = useState<CommandIndexEntry[]>([]);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [workspace, setWorkspace] = useState<CommandWorkspaceContext | null>(
    null
  );
  const [focusedTakeoff, setFocusedTakeoff] = useState<
    CommandWorkspaceContext["takeoffItem"] | null
  >(null);

  const workspaceWithFocus = useMemo((): CommandWorkspaceContext | null => {
    if (!workspace) {
      return null;
    }
    return {
      ...workspace,
      takeoffItem: focusedTakeoff ?? workspace.takeoffItem ?? null,
    };
  }, [workspace, focusedTakeoff]);

  const allEntries = useMemo(() => {
    const projectEntries = workspace?.projectEntries ?? [];
    const merged = new Map<string, CommandIndexEntry>();
    for (const entry of [...orgEntries, ...projectEntries]) {
      merged.set(entry.id, entry);
    }
    return [...merged.values()];
  }, [orgEntries, workspace?.projectEntries]);

  const loadOrgIndex = useCallback(async () => {
    if (indexLoaded) {
      return;
    }
    const result = await fetchOrganisationCommandIndexAction();
    if (result.entries) {
      setOrgEntries(result.entries);
    }
    setIndexLoaded(true);
  }, [indexLoaded]);

  const openCommandBar = useCallback(() => {
    setOpen(true);
    void loadOrgIndex();
  }, [loadOrgIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => {
          if (!current) {
            void loadOrgIndex();
          }
          return !current;
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadOrgIndex]);

  const setWorkspaceContext = useCallback(
    (context: CommandWorkspaceContext | null) => {
      setWorkspace(context);
    },
    []
  );

  const setFocusedTakeoffItem = useCallback(
    (item: CommandWorkspaceContext["takeoffItem"] | null) => {
      setFocusedTakeoff(item);
    },
    []
  );

  return (
    <GlobalCommandContext.Provider
      value={{
        openCommandBar,
        setWorkspaceContext,
        setFocusedTakeoffItem,
      }}
    >
      {children}
      <GlobalCommandBar
        open={open}
        onOpenChange={setOpen}
        organisationId={organisationId}
        entries={allEntries}
        workspace={workspaceWithFocus}
      />
    </GlobalCommandContext.Provider>
  );
}
