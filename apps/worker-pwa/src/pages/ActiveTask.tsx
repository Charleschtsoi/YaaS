import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type Task } from "../api";

export default function ActiveTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      api<Task>(`/tasks/${id}/public`).then(setTask).catch(console.error);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setError("Please enable GPS for this task")
    );
  }, [id]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  async function submit() {
    if (!id || !photo) {
      setError("Please take a photo first");
      return;
    }
    setSubmitting(true);
    setError("");

    const form = new FormData();
    form.append("file", photo);
    if (lat) form.append("lat", String(lat));
    if (lng) form.append("lng", String(lng));

    try {
      const token = localStorage.getItem("yaas_worker_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/v1/tasks/${id}/complete`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl font-bold mb-4">Task Submitted!</p>
        <p className="text-lg mb-8">Payment will be released after verification.</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Active Task</h2>
      {task && (
        <div className="card mb-6">
          <p className="text-2xl font-bold mb-2">${(task.budgetCents / 100).toFixed(2)}</p>
          <p className="text-lg">{task.description}</p>
        </div>
      )}

      <p className="text-lg mb-2">
        GPS: {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Getting location..."}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoto}
      />

      {preview ? (
        <img src={preview} alt="Proof" className="w-full rounded-xl mb-4 border-2 border-black" />
      ) : (
        <button className="btn-secondary mb-4" onClick={() => fileRef.current?.click()}>
          Take Photo
        </button>
      )}

      {error && <p className="text-red-600 font-bold mb-4">{error}</p>}

      <button
        className="btn-primary"
        onClick={submit}
        disabled={submitting || !photo}
      >
        {submitting ? "Submitting..." : "Submit Proof"}
      </button>
    </div>
  );
}
