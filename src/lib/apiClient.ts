/**
 * Safe API response parsing utility to protect against non-JSON HTTP errors (500, 502, 503)
 * and handle transient "Starting Server..." proxy landing pages during server startup.
 */

export async function safeParseJson<T = any>(response: Response, retriesLeft: number = 3): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    let rawText = '';
    try {
      rawText = await response.text();
    } catch {
      // ignore
    }

    const isStartingServer =
      rawText.includes('Starting Server') ||
      rawText.includes('starting the dev server') ||
      rawText.includes(':root { color-scheme: light dark; }');

    // If server is currently booting up behind reverse proxy, retry automatically
    if (isStartingServer && retriesLeft > 0 && response.url) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        const retryRes = await fetch(response.url);
        return await safeParseJson<T>(retryRes, retriesLeft - 1);
      } catch {
        // Fall through to standard error handling if retry fails
      }
    }

    // Clean HTML tags if any (e.g. Vercel error pages or proxy startup pages)
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
 * Fetch wrapper that safely parses JSON responses and surfaces informative errors,
 * with automatic retries for server startup states.
 */
export async function safeFetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit, retries: number = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && attempt < retries) {
        const text = await res.clone().text().catch(() => '');
        if (text.includes('Starting Server') || text.includes(':root { color-scheme')) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
      }
      return await safeParseJson<T>(res, 0);
    } catch (err: any) {
      if (attempt < retries && (err?.message?.includes('Starting Server') || err?.isNonJson)) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to fetch JSON response after retries');
}


