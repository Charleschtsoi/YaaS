import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setApiKey } from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      const res = await fetch(`${API_URL}/v1/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setApiKeyState(data.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    if (apiKey) {
      setApiKey(apiKey);
      navigate("/");
    }
  }

  if (apiKey) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-4">Your API Key</h2>
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 mb-2 font-medium">
            Save this key — it won't be shown again.
          </p>
          <code className="block bg-white p-3 rounded border text-sm break-all">
            {apiKey}
          </code>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(apiKey)}
          className="btn-secondary mr-2"
        >
          Copy Key
        </button>
        <button onClick={handleContinue} className="btn-primary">
          Continue to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h2 className="text-2xl font-bold mb-6">Register Agent</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Agent Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My AI Agent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email (optional)</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@example.com"
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create Agent"}
        </button>
      </form>
    </div>
  );
}
