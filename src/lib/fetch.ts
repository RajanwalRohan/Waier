/**
 * Authenticated fetch wrapper that includes CSRF and content-type headers.
 *
 * Use this for all client-side API calls to ensure the X-Requested-With
 * CSRF defense header is always present on mutation requests.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  // Always include CSRF header on mutations
  if (MUTATION_METHODS.has(method)) {
    headers.set("X-Requested-With", "XMLHttpRequest");
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  return fetch(path, { ...options, headers });
}
