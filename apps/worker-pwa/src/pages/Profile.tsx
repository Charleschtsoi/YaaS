import { useEffect, useState } from "react";
import { api } from "../api";

interface WorkerProfile {
  name: string;
  email: string;
  skills: string[];
  completedTasks: number;
  rating: number;
  stripeConnectId: string | null;
}

export default function Profile() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);

  useEffect(() => {
    api<WorkerProfile>("/workers/me").then(setProfile).catch(console.error);
  }, []);

  async function setupPayouts() {
    try {
      const data = await api<{ url: string }>("/workers/me/connect-onboarding", {
        method: "POST",
      });
      setConnectUrl(data.url);
      window.open(data.url, "_blank");
    } catch (err) {
      console.error(err);
    }
  }

  if (!profile) return <p className="text-xl">Loading...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Your Profile</h2>
      <div className="card">
        <p className="text-2xl font-bold mb-2">{profile.name}</p>
        <p className="text-lg mb-2">{profile.email}</p>
        <p className="text-lg">Rating: {profile.rating?.toFixed(1) ?? "5.0"} ⭐</p>
        <p className="text-lg">Tasks completed: {profile.completedTasks ?? 0}</p>
        <p className="text-lg mt-2">
          Skills: {profile.skills?.join(", ") || "general"}
        </p>
      </div>

      <button className="btn-primary mt-4" onClick={setupPayouts}>
        {profile.stripeConnectId ? "Update Payout Settings" : "Set Up Payouts"}
      </button>

      {connectUrl && (
        <p className="text-lg mt-4">
          Complete setup in the new window, then return here.
        </p>
      )}
    </div>
  );
}
