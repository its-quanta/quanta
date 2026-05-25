"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";

import { getProfileForUser } from "@/src/lib/auth/get-profile";
import { hasOrganisation } from "@/src/lib/auth/profile-schema";
import {
  DOCUMENT_CLASSIFICATIONS,
  PROJECT_DOCUMENTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/src/lib/documents/constants";
import { createClient } from "@/src/lib/supabase/server";
import {
  insertDocumentWithFallback,
  queryDocumentById,
} from "@/src/lib/documents/document-schema";
import type {
  DocumentClassification,
  OrganisationProfile,
} from "@/src/types/database";

export type DocumentActionResult = {
  error?: string;
  signedUrl?: string;
};

export type DocumentUploadContextResult = {
  error?: string;
  organisationId?: string;
};

export type CreateDocumentRecordInput = {
  projectId: string;
  fileName: string;
  storagePath: string;
  fileType: string;
  documentType: DocumentClassification;
};

export type CreateDocumentRecordResult = {
  error?: string;
  documentId?: string;
};

function isValidClassification(
  value: string
): value is DocumentClassification {
  return DOCUMENT_CLASSIFICATIONS.some((item) => item.value === value);
}

async function assertProjectAccess(
  projectId: string,
  organisationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Project not found." };
  }

  return {};
}

async function requireDocumentUploadSession(projectId: string): Promise<
  | { error: string }
  | { user: { id: string }; profile: OrganisationProfile }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to upload documents." };
  }

  const profile = await getProfileForUser(user.id);

  if (!profile) {
    return { error: "Profile not found. Sign in again." };
  }

  if (!hasOrganisation(profile)) {
    return {
      error: "Complete onboarding before uploading documents.",
    };
  }

  const access = await assertProjectAccess(
    projectId,
    profile.organisation_id
  );

  if (access.error) {
    return { error: access.error };
  }

  return {
    user,
    profile: profile as OrganisationProfile,
  };
}

function isValidStoragePath(
  storagePath: string,
  organisationId: string,
  projectId: string
): boolean {
  const expectedPrefix = `${organisationId}/${projectId}/`;

  return (
    storagePath.startsWith(expectedPrefix) &&
    !storagePath.includes("..") &&
    storagePath.length > expectedPrefix.length
  );
}

async function fetchDocumentForOrganisation(
  documentId: string,
  organisationId: string
) {
  const supabase = await createClient();
  return queryDocumentById(supabase, documentId, organisationId);
}

export async function getDocumentUploadContextAction(
  projectId: string
): Promise<DocumentUploadContextResult> {
  if (!projectId) {
    return { error: "Project not found." };
  }

  const session = await requireDocumentUploadSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  return { organisationId: session.profile.organisation_id };
}

export async function createDocumentRecordAction(
  input: CreateDocumentRecordInput
): Promise<CreateDocumentRecordResult> {
  const { projectId, fileName, storagePath, fileType, documentType } = input;

  if (!projectId || !fileName || !storagePath || !fileType) {
    return { error: "Document metadata is incomplete." };
  }

  if (!isValidClassification(documentType)) {
    return { error: "Select a document type." };
  }

  const session = await requireDocumentUploadSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const { user, profile } = session;

  if (
    !isValidStoragePath(storagePath, profile.organisation_id, projectId)
  ) {
    return { error: "Invalid storage path for this project." };
  }

  const supabase = await createClient();
  const documentId = randomUUID();

  const { error: insertError, documentId: savedDocumentId } =
    await insertDocumentWithFallback(supabase, projectId, {
      id: documentId,
      organisation_id: profile.organisation_id,
      project_id: projectId,
      file_name: fileName,
      storage_path: storagePath,
      file_type: fileType,
      document_type: documentType,
      processing_status: "ready",
      uploaded_by: user.id,
    });

  if (insertError) {
    return { error: insertError };
  }

  revalidatePath(`/projects/${projectId}`);

  return { documentId: savedDocumentId ?? documentId };
}

export async function deleteDocumentAction(
  documentId: string,
  projectId: string
): Promise<DocumentActionResult> {
  if (!documentId || !projectId) {
    return { error: "Document not found." };
  }

  const session = await requireDocumentUploadSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const { profile } = session;

  const document = await fetchDocumentForOrganisation(
    documentId,
    profile.organisation_id
  );

  if (!document || document.project_id !== projectId) {
    return { error: "Document not found." };
  }

  const supabase = await createClient();

  const { error: storageError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("organisation_id", profile.organisation_id)
    .eq("project_id", projectId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath(`/projects/${projectId}`);

  return {};
}

export async function getDocumentSignedUrlAction(
  documentId: string,
  projectId: string
): Promise<DocumentActionResult> {
  if (!documentId || !projectId) {
    return { error: "Document not found." };
  }

  const session = await requireDocumentUploadSession(projectId);

  if ("error" in session) {
    return { error: session.error };
  }

  const { profile } = session;

  const document = await fetchDocumentForOrganisation(
    documentId,
    profile.organisation_id
  );

  if (!document || document.project_id !== projectId) {
    return { error: "Document not found." };
  }

  if (document.processing_status !== "ready") {
    return { error: "Document is not ready to view yet." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not generate download link." };
  }

  return { signedUrl: data.signedUrl };
}
