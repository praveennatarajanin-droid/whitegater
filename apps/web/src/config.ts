export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://llm.testinggator.online/api/'
).replace(/\/+$/, '');

export function getApiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4);
  }
  return `${API_BASE_URL}${cleanPath}`;
}

