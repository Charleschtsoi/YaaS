import { useEffect, useState } from "react";
import { api, type Task, type Agent } from "../api";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  claimed: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-orange-100 text-orange-800",
  verification: "bg-purple-100 text-purple-800",
  complete: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-800",
};

export default function Dashboard() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [agentData, tasksData] = await Promise.all([
        api<Agent>("/agents/me"),
        api<Task[]>("/agents/me/tasks"),
      ]);
      setAgent(agentData);
      setTasks(tasksData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome, {agent?.name}</h2>
        <p className="text-gray-600">
          Daily budget: ${((agent?.dailyBudgetCents ?? 0) / 100).toFixed(2)} ·
          Monthly: ${((agent?.monthlyBudgetCents ?? 0) / 100).toFixed(2)}
        </p>
      </div>

      <h3 className="text-lg font-semibold mb-4">Tasks</h3>
      {tasks.length === 0 ? (
        <p className="text-gray-600">
          No tasks yet. Use the MCP tool or POST /v1/tasks to create one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-sm text-gray-600">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Budget</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b">
                  <td className="py-3 pr-4 max-w-xs truncate">{task.description}</td>
                  <td className="py-3 pr-4 capitalize">{task.type}</td>
                  <td className="py-3 pr-4">${(task.budgetCents / 100).toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[task.status] ?? "bg-gray-100"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {task.proofUrl ? (
                      <a
                        href={task.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View proof
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
