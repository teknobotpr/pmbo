import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { TEAMS, TEAMS_BY_ID } from '../data/teams';
import type { Game, TeamId } from '../types';

interface StandingRow {
  teamId: TeamId;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;       // PF — anotados
  pointsAgainst: number;   // PC — recibidos
  diff: number;            // PF - PC
  pct: number;             // wins / played
}

export default function Standings() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const u = onSnapshot(collection(db, 'games'), snap =>
      setGames(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) })))
    );
    return () => u();
  }, []);

  const rows: StandingRow[] = useMemo(() => {
    // Init one row per team
    const map: Record<string, StandingRow> = {};
    for (const t of TEAMS) {
      map[t.id] = {
        teamId: t.id,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        pct: 0,
      };
    }

    // Only count finished games
    for (const g of games) {
      if (g.status !== 'finished') continue;
      const home = map[g.homeTeamId];
      const away = map[g.awayTeamId];
      if (!home || !away) continue;

      home.played += 1;
      away.played += 1;
      home.pointsFor += g.homeScore;
      home.pointsAgainst += g.awayScore;
      away.pointsFor += g.awayScore;
      away.pointsAgainst += g.homeScore;

      if (g.homeScore > g.awayScore) {
        home.wins += 1;
        away.losses += 1;
      } else if (g.awayScore > g.homeScore) {
        away.wins += 1;
        home.losses += 1;
      }
      // tie: rare in basketball; not counted as W/L
    }

    // Compute derived
    for (const r of Object.values(map)) {
      r.diff = r.pointsFor - r.pointsAgainst;
      r.pct = r.played > 0 ? r.wins / r.played : 0;
    }

    // Sort: wins desc, then diff desc, then PF desc, then name asc
    return Object.values(map).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return TEAMS_BY_ID[a.teamId].name.localeCompare(TEAMS_BY_ID[b.teamId].name);
    });
  }, [games]);

  const anyPlayed = rows.some(r => r.played > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏆 Standing</h1>
        <span className="text-xs text-gray-500">
          {games.filter(g => g.status === 'finished').length} partido(s) jugado(s)
        </span>
      </div>

      {!anyPlayed && (
        <p className="text-gray-500 text-sm">
          Aún no hay partidos finalizados. El standing se actualiza automáticamente
          cuando termina un partido.
        </p>
      )}

      {/* Desktop / sm+ : tabla completa */}
      <div className="hidden sm:block card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">Equipo</th>
              <th className="px-2 py-2 text-center" title="Partidos jugados">PJ</th>
              <th className="px-2 py-2 text-center" title="Ganados">G</th>
              <th className="px-2 py-2 text-center" title="Perdidos">P</th>
              <th className="px-2 py-2 text-center" title="Porcentaje de victorias">%</th>
              <th className="px-2 py-2 text-center" title="Puntos a favor">PF</th>
              <th className="px-2 py-2 text-center" title="Puntos en contra">PC</th>
              <th className="px-2 py-2 text-center" title="Diferencial">DIF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const t = TEAMS_BY_ID[r.teamId];
              return (
                <tr
                  key={r.teamId}
                  className={`border-t border-gray-100 hover:bg-gray-50 ${
                    i === 0 && r.played > 0 ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-bold text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/equipos/${t.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <div
                        className="w-2 h-6 rounded"
                        style={{ backgroundColor: t.color }}
                      />
                      <img
                        src={t.logo}
                        alt={t.name}
                        className="w-7 h-7 object-cover rounded"
                      />
                      <span className="font-medium">
                        {t.emoji} {t.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center">{r.played}</td>
                  <td className="px-2 py-2 text-center font-bold text-green-700">{r.wins}</td>
                  <td className="px-2 py-2 text-center text-red-700">{r.losses}</td>
                  <td className="px-2 py-2 text-center">
                    {r.played > 0 ? r.pct.toFixed(3).replace(/^0/, '') : '—'}
                  </td>
                  <td className="px-2 py-2 text-center">{r.pointsFor}</td>
                  <td className="px-2 py-2 text-center">{r.pointsAgainst}</td>
                  <td
                    className={`px-2 py-2 text-center font-semibold ${
                      r.diff > 0
                        ? 'text-green-700'
                        : r.diff < 0
                        ? 'text-red-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards compactas */}
      <div className="sm:hidden space-y-2">
        {rows.map((r, i) => {
          const t = TEAMS_BY_ID[r.teamId];
          return (
            <Link
              key={r.teamId}
              to={`/equipos/${t.id}`}
              className={`card flex items-center gap-3 ${
                i === 0 && r.played > 0 ? 'bg-yellow-50' : ''
              }`}
              style={{ borderLeft: `6px solid ${t.color}` }}
            >
              <div className="text-lg font-bold text-gray-500 w-6 text-center">
                {i + 1}
              </div>
              <img
                src={t.logo}
                alt={t.name}
                className="w-10 h-10 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">
                  {t.emoji} {t.name}
                </div>
                <div className="text-xs text-gray-500">
                  PJ {r.played} · PF {r.pointsFor} · PC {r.pointsAgainst}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  <span className="font-bold text-green-700">{r.wins}</span>
                  <span className="text-gray-400 mx-0.5">-</span>
                  <span className="text-red-700">{r.losses}</span>
                </div>
                <div
                  className={`text-xs font-semibold ${
                    r.diff > 0
                      ? 'text-green-700'
                      : r.diff < 0
                      ? 'text-red-700'
                      : 'text-gray-500'
                  }`}
                >
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 pt-2">
        Ordenado por: ganados → diferencial → puntos a favor.
      </p>
    </div>
  );
}
