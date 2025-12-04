const BASE = ""; // base path, can be configured

type RequestInitEx = RequestInit & { timeout?: number };

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt_token");
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function request<T = any>(method: string, url: string, options: RequestInitEx = {}): Promise<T> {
  const headers: Record<string, string> = options.headers ? { ...options.headers as any } : {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const controller = new AbortController();
  const timeout = options.timeout || 10000;
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(BASE + url, {
      method,
      ...options,
      headers,
      credentials: options.credentials || "include",
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.status === 401) {
      // Clear token and notify app
      try { localStorage.removeItem("jwt_token"); } catch {}
      try { window.dispatchEvent(new CustomEvent('auth:logout')); } catch {}
      const payload = await parseJsonResponse(res);
      const err: any = new Error(payload?.detail || 'Unauthorized');
      err.status = 401;
      err.payload = payload;
      throw err;
    }

    if (!res.ok) {
      const payload = await parseJsonResponse(res);
      const err: any = new Error(payload?.detail || `HTTP ${res.status}`);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    return await parseJsonResponse(res) as T;
  } finally {
    clearTimeout(id);
  }
}

export default {
  get: <T = any>(url: string, opts?: RequestInitEx) => request<T>('GET', url, opts),
  post: <T = any>(url: string, body?: any, opts?: RequestInitEx) => request<T>('POST', url, { body: body && !(body instanceof FormData) ? JSON.stringify(body) : body, ...opts }),
  put: <T = any>(url: string, body?: any, opts?: RequestInitEx) => request<T>('PUT', url, { body: body && !(body instanceof FormData) ? JSON.stringify(body) : body, ...opts }),
  patch: <T = any>(url: string, body?: any, opts?: RequestInitEx) => request<T>('PATCH', url, { body: body && !(body instanceof FormData) ? JSON.stringify(body) : body, ...opts }),
  delete: <T = any>(url: string, opts?: RequestInitEx) => request<T>('DELETE', url, opts),
};
