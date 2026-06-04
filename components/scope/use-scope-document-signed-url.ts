"use client";

import { useEffect, useState } from "react";

import {
  getCachedSignedUrl,
  setCachedSignedUrl,
} from "@/components/scope/scope-signed-url-cache";
import { getDocumentSignedUrlAction } from "@/src/lib/documents/actions";

type UseScopeDocumentSignedUrlResult = {
  signedUrl: string | null;
  error: string | null;
  loading: boolean;
};

export function useScopeDocumentSignedUrl(
  documentId: string | null,
  projectId: string
): UseScopeDocumentSignedUrlResult {
  const [signedUrl, setSignedUrl] = useState<string | null>(() =>
    documentId ? getCachedSignedUrl(projectId, documentId) : null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!documentId) {
      setSignedUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    const cached = getCachedSignedUrl(projectId, documentId);
    if (cached) {
      setSignedUrl(cached);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getDocumentSignedUrlAction(documentId, projectId).then((result) => {
      if (cancelled) {
        return;
      }

      setLoading(false);

      if (result.error || !result.signedUrl) {
        setSignedUrl(null);
        setError(result.error ?? "Could not load document.");
        return;
      }

      setCachedSignedUrl(projectId, documentId, result.signedUrl);
      setSignedUrl(result.signedUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId, projectId]);

  return { signedUrl, error, loading };
}
