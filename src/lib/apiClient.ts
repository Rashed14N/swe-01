/**
 * Safe API response parsing utility to protect against non-JSON HTTP errors (500, 502, 503)
 * from Vercel serverless gateways and proxies.
 */

export async function safeParseJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    let rawText = '';
    try {
      rawText = await response.text();
    } catch {
      // ignore
    }
    // Clean HTML tags if any (e.g. Vercel error pages)
    const preview = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    const errorMsg = `Server returned HTTP ${response.status} ${response.statusText || 'Error'} (non-JSON response)${preview ? `: ${preview}` : ''}`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.isNonJson = true;
    throw err;
  }

  try {
    const json = await response.json();
    return json as T;
  } catch (parseErr: any) {
    throw new Error(`Failed to parse JSON response (HTTP ${response.status}): ${parseErr?.message || 'Invalid format'}`);
  }
}

/**
 * Parses response JSON safely; if response is not ok or not JSON, returns fallback.
 */
export async function safeParseJsonOrFallback<T>(response: Response, fallback: T): Promise<T> {
  if (!response.ok) return fallback;
  try {
    return await safeParseJson<T>(response);
  } catch {
    return fallback;
  }
}

/**
 * Fetch wrapper that safely parses JSON responses and surfaces informative errors.
 */
export async function safeFetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  return safeParseJson<T>(res);
}

