import { Routes, Route, Navigate } from "react-router-dom";
import { getToken } from "./api";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import ActiveTask from "./pages/ActiveTask";
import Earnings from "./pages/Earnings";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Feed />} />
        <Route path="task/:id" element={<ActiveTask />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
