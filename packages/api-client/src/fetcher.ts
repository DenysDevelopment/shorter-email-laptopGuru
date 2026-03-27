const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const customFetch = async <T>({
  url,
  method,
  params,
  data,
  headers,
}: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string>;
  data?: unknown;
  headers?: Record<string, string>;
}): Promise<T> => {
  const fullUrl = new URL(`${API_URL}${url}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fullUrl.searchParams.set(key, value);
      }
    });
  }

  const token =
    typeof window !== 'undefined'
      ? window.__AUTH_TOKEN__
      : undefined;

  const response = await fetch(fullUrl.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
};

declare global {
  interface Window {
    __AUTH_TOKEN__?: string;
  }
}
