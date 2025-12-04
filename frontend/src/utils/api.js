// API utilities with proper error handling

export const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

// API helper with proper error handling
// - Always includes credentials for cross-origin cookie support
// - Calls onAuthError callback on 401 responses for centralized session expiry handling
export const apiFetch = async (url, options = {}, onAuthError = null) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });
  if (!response.ok) {
    if (response.status === 401 && onAuthError) {
      onAuthError();
    }
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  // Handle 204 No Content or empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {};
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {};
};
