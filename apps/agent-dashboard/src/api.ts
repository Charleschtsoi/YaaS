const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function getApiKey(): string | null {
  return localStorage.getItem("yaas_api_key");
}

export function setApiKey(key: string) {
  localStorage.setItem("yaas_api_key", key);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  status: string;
  budgetCents: number;
  proofUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface Agent {
  id: string;
  name: string;
  dailyBudgetCents: number;
  monthlyBudgetCents: number;
}
