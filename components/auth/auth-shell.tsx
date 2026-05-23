import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
  children: React.ReactNode;
  footerLink?: {
    label: string;
    href: string;
    linkText: string;
  };
};

export function AuthShell({
  title,
  description,
  cardTitle,
  cardDescription,
  children,
  footerLink,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
            Q
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>

        {footerLink ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {footerLink.label}{" "}
            <Link
              href={footerLink.href}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {footerLink.linkText}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
