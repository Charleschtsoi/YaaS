import { Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">YAAS Agent Dashboard</h1>
          <nav className="flex gap-4">
            <NavLink to="/" className="hover:underline" end>
              Tasks
            </NavLink>
            <NavLink to="/budget" className="hover:underline">
              Budget
            </NavLink>
            <NavLink to="/mcp" className="hover:underline">
              MCP Setup
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        <Outlet />
      </main>
    </div>
  );
}
