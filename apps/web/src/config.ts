export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://llm.testinggator.online/api/'
).replace(/\/+$/, '');

export function getApiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

