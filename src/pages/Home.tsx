import { Link } from 'react-router-dom';
import { TEAMS } from '../data/teams';

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <div className="text-6xl mb-3">🏀</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-pmbo-dark">
          Peñuelas Master Basketball Organization
        </h1>
        <p className="mt-2 text-gray-600">Torneo en vivo · Stats · Calendario</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Equipos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEAMS.map((t) => (
            <Link
              key={t.id}
              to={`/equipos/${t.id}`}
              className="card hover:shadow-lg transition-all flex items-center gap-3 group"
              style={{ borderLeft: `6px solid ${t.color}` }}
            >
              <img
                src={t.logo}
                alt={t.name}
                className="w-14 h-14 object-cover rounded-lg"
              />
              <div>
                <div className="font-bold group-hover:text-pmbo-primary">
                  {t.emoji} {t.name}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/standing" className="card hover:shadow-lg text-center py-6">
          <div className="text-4xl mb-1">📊</div>
          <div className="font-semibold">Standing</div>
          <p className="text-xs text-gray-500">Posiciones y récord</p>
        </Link>
        <Link to="/calendario" className="card hover:shadow-lg text-center py-6">
          <div className="text-4xl mb-1">📅</div>
          <div className="font-semibold">Calendario</div>
          <p className="text-xs text-gray-500">Próximos partidos</p>
        </Link>
        <Link to="/lideres" className="card hover:shadow-lg text-center py-6">
          <div className="text-4xl mb-1">🏆</div>
          <div className="font-semibold">Líderes</div>
          <p className="text-xs text-gray-500">Top scorers, rebotes, más</p>
        </Link>
        <Link to="/equipos" className="card hover:shadow-lg text-center py-6">
          <div className="text-4xl mb-1">👥</div>
          <div className="font-semibold">Equipos</div>
          <p className="text-xs text-gray-500">Rosters y stats</p>
        </Link>
      </section>

      <section className="text-center pt-6 border-t border-gray-200">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">
          Patrocinadores
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <a
            href="https://facebook.com/teknobotpr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.jpg`}
              alt="Teknobot"
              className="h-24 w-auto"
            />
            <span className="text-xs text-gray-500 mt-1">Teknobot · 787-974-1793</span>
          </a>
          <a
            href="https://www.facebook.com/elfrappeno"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <img
              src={`${import.meta.env.BASE_URL}sponsor-frappeno.jpg`}
              alt="El Frappeño y Algo Más"
              className="h-24 w-24 object-cover rounded-full"
            />
            <span className="text-xs text-gray-500 mt-1">El Frappeño y Algo Más</span>
          </a>
        </div>
      </section>
    </div>
  );
}
