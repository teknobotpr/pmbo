import { Link } from 'react-router-dom';
import { TEAMS } from '../data/teams';

export default function Teams() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Equipos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEAMS.map((t) => (
          <Link
            key={t.id}
            to={`/equipos/${t.id}`}
            className="card hover:shadow-lg flex items-center gap-4"
            style={{ borderLeft: `8px solid ${t.color}` }}
          >
            <img src={t.logo} alt={t.name} className="w-20 h-20 object-cover rounded-lg" />
            <div>
              <div className="text-xl font-bold">{t.emoji} {t.name}</div>
              <div className="text-sm text-gray-500">Ver roster y stats →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
