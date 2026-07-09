import { Routes, Route, Navigate } from "react-router-dom";
import { getApiKey } from "./api";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import McpSetup from "./pages/McpSetup";
import Layout from "./components/Layout";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return getApiKey() ? <>{children}</> : <Navigate to="/register" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="budget" element={<Budget />} />
        <Route path="mcp" element={<McpSetup />} />
      </Route>
    </Routes>
  );
}
