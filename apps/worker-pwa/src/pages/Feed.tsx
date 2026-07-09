import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Task } from "../api";

export default function Feed() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadTasks() {
    try {
      const data = await api<Task[]>("/workers/feed");
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function claimTask(taskId: string) {
    try {
      await api(`/tasks/${taskId}/claim`, { method: "POST" });
      navigate(`/task/${taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    }
  }

  if (loading) return <p className="text-xl">Loading tasks...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Available Tasks</h2>
      {error && <p className="text-red-600 font-bold mb-4">{error}</p>}
      {tasks.length === 0 ? (
        <p className="text-lg">No tasks available right now. Check back soon.</p>
      ) : (
        tasks.slice(0, 10).map((task) => (
          <div key={task.id} className="card">
            <p className="text-2xl font-bold mb-2">
              ${(task.budgetCents / 100).toFixed(2)}
            </p>
            <p className="text-lg mb-2">{task.description}</p>
            <p className="text-sm mb-4 text-gray-700">
              Type: {task.type} · Proof: {task.proofType ?? "photo"}
            </p>
            <button className="btn-primary" onClick={() => claimTask(task.id)}>
              Claim Task
            </button>
          </div>
        ))
      )}
    </div>
  );
}
