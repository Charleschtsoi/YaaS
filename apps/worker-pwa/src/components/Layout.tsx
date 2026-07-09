import { Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      <header className="p-4 border-b-2 border-black">
        <h1 className="text-2xl font-bold">YAAS Worker</h1>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <nav className="border-t-2 border-black p-2 grid grid-cols-3 gap-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `text-center py-4 rounded-xl font-bold text-lg min-h-tap flex items-center justify-center ${
              isActive ? "bg-black text-white" : "bg-gray-100"
            }`
          }
        >
          Tasks
        </NavLink>
        <NavLink
          to="/earnings"
          className={({ isActive }) =>
            `text-center py-4 rounded-xl font-bold text-lg min-h-tap flex items-center justify-center ${
              isActive ? "bg-black text-white" : "bg-gray-100"
            }`
          }
        >
          Earnings
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `text-center py-4 rounded-xl font-bold text-lg min-h-tap flex items-center justify-center ${
              isActive ? "bg-black text-white" : "bg-gray-100"
            }`
          }
        >
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
