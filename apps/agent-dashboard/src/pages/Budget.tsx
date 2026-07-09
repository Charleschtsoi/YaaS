import { useEffect, useState } from "react";
import { api, type Agent } from "../api";

export default function Budget() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Agent>("/agents/me").then((a) => {
      setAgent(a);
      setDaily(String((a.dailyBudgetCents ?? 0) / 100));
      setMonthly(String((a.monthlyBudgetCents ?? 0) / 100));
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api("/agents/me/budget", {
        method: "PATCH",
        body: JSON.stringify({
          dailyBudgetCents: Math.round(parseFloat(daily) * 100),
          monthlyBudgetCents: Math.round(parseFloat(monthly) * 100),
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-2xl font-bold mb-6">Budget Caps</h2>
      <p className="text-gray-600 mb-6">
        Set daily and monthly spending limits. Task creation returns HTTP 402 when
        exceeded.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Daily Budget (USD)</label>
          <input
            className="input"
            type="number"
            min="1"
            step="0.01"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Monthly Budget (USD)</label>
          <input
            className="input"
            type="number"
            min="1"
            step="0.01"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        {saved && <p className="text-green-600">Budget caps saved.</p>}
        <button type="submit" className="btn-primary">
          Save Budget Caps
        </button>
      </form>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
        <h3 className="font-semibold mb-2">Fund Wallet</h3>
        <p className="text-sm text-gray-600 mb-2">
          In production, use Stripe Elements to add a payment method. For local dev,
          set <code className="bg-white px-1 rounded">SKIP_STRIPE=true</code> to
          bypass payment escrow.
        </p>
        {agent?.id && (
          <p className="text-xs text-gray-500">Agent ID: {agent.id}</p>
        )}
      </div>
    </div>
  );
}
