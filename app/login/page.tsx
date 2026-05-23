import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
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
    <AuthShell
      title="Sign in to Quanta"
      description="Estimating and tender workspace for subcontractors."
      cardTitle="Account access"
      cardDescription="Use your email and password to access your organisation workspace."
      footerLink={{
        label: "No account yet?",
        href: "/signup",
        linkText: "Create account",
      }}
    >
      <SignInForm />
    </AuthShell>
  );
}
