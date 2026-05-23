import { SignOutButton } from "@/components/auth/sign-out-button";

type AppTopBarProps = {
  title: string;
  description?: string;
  userEmail?: string | null;
  actions?: React.ReactNode;
};

export function AppTopBar({
  title,
  description,
  userEmail,
  actions,
}: AppTopBarProps) {
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
        {userEmail ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {userEmail}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
