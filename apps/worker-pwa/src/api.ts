const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function getToken(): string | null {
  return localStorage.getItem("yaas_worker_token");
}

export function setToken(token: string) {
  localStorage.setItem("yaas_worker_token", token);
}

export function clearToken() {
  localStorage.removeItem("yaas_worker_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
  ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  budgetCents: number;
  status: string;
  proofType: string | null;
  location: { lat: number; lng: number; radius_km: number } | null;
  skillsRequired: string[];
}
