import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalCommandProvider } from "@/components/command-palette/global-command-provider";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <GlobalCommandProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </GlobalCommandProvider>
  );
}
