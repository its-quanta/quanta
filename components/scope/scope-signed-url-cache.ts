type CachedSignedUrl = {
  signedUrl: string;
  fetchedAt: number;
};

const CACHE_TTL_MS = 55 * 60 * 1000;
const cache = new Map<string, CachedSignedUrl>();

export function signedUrlCacheKey(projectId: string, documentId: string): string {
  return `${projectId}:${documentId}`;
}

export function getCachedSignedUrl(
  projectId: string,
  documentId: string
): string | null {
  const entry = cache.get(signedUrlCacheKey(projectId, documentId));
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(signedUrlCacheKey(projectId, documentId));
    return null;
  }
  return entry.signedUrl;
}

export function setCachedSignedUrl(
  projectId: string,
  documentId: string,
  signedUrl: string
): void {
  cache.set(signedUrlCacheKey(projectId, documentId), {
    signedUrl,
    fetchedAt: Date.now(),
  });
}
