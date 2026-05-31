import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_LINKS: { to: string; label: string; icon: string }[] = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/equipos', label: 'Equipos', icon: '🏀' },
  { to: '/standing', label: 'Standing', icon: '📊' },
  { to: '/lideres', label: 'Líderes', icon: '⭐' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
];

export default function Layout() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-pmbo-dark text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">🏀</span>
            <span className="font-bold text-lg leading-tight truncate">
              PMBO
              <span className="hidden sm:inline ml-2 text-sm font-normal text-gray-300">
                Peñuelas Master Basketball
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 text-sm">
            {NAV_LINKS.map((l) => (
              <NavTab key={l.to} to={l.to} label={l.label} />
            ))}
            {profile?.role && <NavTab to="/admin" label="Admin" />}
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

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer: backdrop + sliding panel */}
      <div
        className={`md:hidden fixed inset-0 z-20 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <aside
        className={`md:hidden fixed top-0 right-0 z-30 h-full w-72 max-w-[85vw] bg-pmbo-dark text-white shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          <span className="font-bold tracking-wide">Menú</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="w-9 h-9 inline-flex items-center justify-center rounded hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="p-3 space-y-1 text-sm">
          {NAV_LINKS.map((l) => (
            <DrawerLink key={l.to} to={l.to} label={l.label} icon={l.icon} />
          ))}
          {profile?.role && <DrawerLink to="/admin" label="Admin" icon="⚙️" />}
          <div className="pt-3 mt-3 border-t border-white/10">
            {user ? (
              <button
                onClick={logout}
                className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-sm font-medium text-left"
              >
                🚪 Salir
              </button>
            ) : (
              <Link
                to="/login"
                className="block px-4 py-2 rounded bg-pmbo-primary hover:bg-orange-600 text-sm font-semibold text-center"
              >
                🦓 Árbitros
              </Link>
            )}
          </div>
        </nav>
      </aside>

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

function DrawerLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded transition-colors ${
          isActive
            ? 'bg-pmbo-primary text-white font-semibold'
            : 'hover:bg-white/10 text-gray-100'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
