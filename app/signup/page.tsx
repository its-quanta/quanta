import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { createClient } from "@/src/lib/supabase/server";

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Create your Quanta account"
      description="Set up your organisation workspace for tender estimating."
      cardTitle="New account"
      cardDescription="Create an owner account for your organisation. You stay in control of every quantity."
      footerLink={{
        label: "Already have an account?",
        href: "/login",
        linkText: "Sign in",
      }}
    >
      <SignUpForm />
    </AuthShell>
  );
}
