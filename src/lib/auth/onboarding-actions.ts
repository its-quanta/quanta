"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureAuthProfile } from "@/src/lib/auth/ensure-profile";
import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import { createClient } from "@/src/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
};

function isMissingRpcError(message: string): boolean {
  return (
    /function public\.(create_organisation_for_user|accept_organisation_invite)/i.test(
      message
    ) || /could not find the function/i.test(message)
  );
}

function missingRpcMessage(): string {
  return "Database onboarding functions missing. Apply supabase/migrations/20260523150000_ensure_profile_rpc.sql and 20260523140000_onboarding_rls.sql in Supabase SQL Editor.";
}

async function requireOnboardingUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureAuthProfile(user);
  const profile = await getProfileForUser(user.id);

  if (profile && hasOrganisation(profile)) {
    redirect("/dashboard");
  }

  return { user, profile, supabase };
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function createOrganisationAction(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const { supabase } = await requireOnboardingUser();

  if (!companyName) {
    return { error: "Company name is required." };
  }

  if (!fullName) {
    return { error: "Full name is required." };
  }

  const { error } = await supabase.rpc("create_organisation_for_user", {
    p_company_name: companyName,
    p_full_name: fullName,
  });

  if (error) {
    if (isMissingRpcError(error.message)) {
      return { error: missingRpcMessage() };
    }

    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function joinOrganisationAction(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const fullName = optionalString(formData.get("fullName"));
  const { supabase } = await requireOnboardingUser();

  if (!inviteToken) {
    return { error: "Invite token is required." };
  }

  const { error } = await supabase.rpc("accept_organisation_invite", {
    p_token: inviteToken,
    p_full_name: fullName,
  });

  if (error) {
    if (isMissingRpcError(error.message)) {
      return { error: missingRpcMessage() };
    }

    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
