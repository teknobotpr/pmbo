import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, profile, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-pmbo-dark text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="font-bold text-lg leading-tight">
              PMBO
              <span className="hidden sm:inline ml-2 text-sm font-normal text-gray-300">
                Peñuelas Master Basketball
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <NavTab to="/" label="Inicio" />
            <NavTab to="/equipos" label="Equipos" />
            <NavTab to="/standing" label="Standing" />
            <NavTab to="/lideres" label="Líderes" />
            <NavTab to="/calendario" label="Calendario" />
            {profile?.role && (
              <NavTab to="/admin" label="Admin" />
            )}
            {user ? (
              <button
                onClick={logout}
                className="ml-2 px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-xs"
              >
                Salir
              </button>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-3 py-1 rounded bg-pmbo-primary hover:bg-orange-600 text-xs font-semibold"
              >
                Árbitros
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-gray-100 text-gray-500 text-xs text-center py-3 mt-8">
        © {new Date().getFullYear()} Peñuelas Master Basketball Organization
      </footer>
    </div>
  );
}

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-2 sm:px-3 py-1 rounded transition-colors ${
          isActive ? 'bg-pmbo-primary text-white' : 'hover:bg-gray-700'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
