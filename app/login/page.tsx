import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/src/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
            Q
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in to Quanta
          </h1>
          <p className="text-sm text-muted-foreground">
            Estimating and tender workspace for subcontractors.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account access</CardTitle>
            <CardDescription>
              Use your email and password to access your organisation workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
