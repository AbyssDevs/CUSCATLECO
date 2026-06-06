export async function apiFetch(url, options = {}) {
  const baseUrl = "/api";
  const fullUrl = url.startsWith("/") ? `${baseUrl}${url}` : `${baseUrl}/${url}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(fullUrl, config);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || `Error HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }

  return res.json();
}
