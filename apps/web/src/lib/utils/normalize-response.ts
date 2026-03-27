export function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'items' in data) return (data as { items: T[] }).items;
  return [];
}
