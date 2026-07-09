import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = isRegister ? "/workers/register" : "/workers/login";
      const body = isRegister
        ? { name, email, password, skills: ["general"] }
        : { email, password };
      const data = await api<{ token: string }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(data.token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 min-h-screen flex flex-col justify-center">
      <h1 className="text-2xl font-bold mb-8 text-center">YAAS Worker</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <input
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-red-600 text-lg font-bold">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
        </button>
      </form>
      <button
        className="mt-6 text-lg underline"
        onClick={() => setIsRegister(!isRegister)}
      >
        {isRegister ? "Already have an account? Sign in" : "New worker? Create account"}
      </button>
    </div>
  );
}
