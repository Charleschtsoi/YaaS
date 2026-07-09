import { useEffect, useState } from "react";
import { api } from "../api";

interface EarningsData {
  totalEarnedCents: number;
  payments: Array<{
    id: string;
    taskId: string;
    amountCents: number;
    status: string;
    createdAt: string;
  }>;
}

export default function Earnings() {
  const [data, setData] = useState<EarningsData | null>(null);

  useEffect(() => {
    api<EarningsData>("/workers/me/earnings").then(setData).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Your Earnings</h2>
      <div className="card text-center mb-6">
        <p className="text-lg">Total Earned</p>
        <p className="text-3xl font-bold">
          ${((data?.totalEarnedCents ?? 0) / 100).toFixed(2)}
        </p>
      </div>

      <h3 className="text-lg font-bold mb-2">Payment History</h3>
      {!data?.payments.length ? (
        <p className="text-lg">No payments yet. Complete tasks to earn!</p>
      ) : (
        data.payments.map((p) => (
          <div key={p.id} className="card">
            <p className="text-xl font-bold">${(p.amountCents / 100).toFixed(2)}</p>
            <p className="text-lg capitalize">{p.status}</p>
            <p className="text-sm text-gray-600">
              {new Date(p.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
