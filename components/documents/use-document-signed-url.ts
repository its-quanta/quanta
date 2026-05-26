"use client";

import { useEffect, useState } from "react";

import { getDocumentSignedUrlAction } from "@/src/lib/documents/actions";

type UseDocumentSignedUrlResult = {
  signedUrl: string | null;
  error: string | null;
  loading: boolean;
};

export function useDocumentSignedUrl(
  documentId: string | null,
  projectId: string,
  enabled: boolean
): UseDocumentSignedUrlResult {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !documentId) {
      setSignedUrl(null);
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

      setSignedUrl(result.signedUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId, projectId, enabled]);

  return { signedUrl, error, loading };
}
