"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { useAuthProfile } from "@/components/layout/auth-profile-provider";

type AppTopBarProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function AppTopBar({ title, description, actions }: AppTopBarProps) {
  const profile = useAuthProfile();
  const displayName = profile?.full_name ?? profile?.email;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        {displayName ? (
          <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
            {displayName}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
