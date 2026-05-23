import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { resolvePostAuthRedirect } from "@/src/lib/auth/redirect";
import { createClient } from "@/src/lib/supabase/server";

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await resolvePostAuthRedirect(user.id));
  }

  return (
    <AuthShell
      title="Create your Quanta account"
      description="Estimating and tender workspace for subcontractors."
      cardTitle="New account"
      cardDescription="Create your account, then set up or join an organisation."
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
