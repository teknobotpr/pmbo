import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { TEAMS, TEAMS_BY_ID } from '../data/teams';
import type { Game, PlayerGameStats, TeamId } from '../types';

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

interface IntegrityIssue {
  gameId: string;
  teamId: TeamId;
  side: 'home' | 'away';
  gameScore: number;     // game.homeScore / awayScore
  playerSum: number;     // sum of playerGameStats.points for that team in that game
  diff: number;          // playerSum - gameScore
}

type StandingMode = 'regular' | 'playoffs';

export default function Standings() {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [mode, setMode] = useState<StandingMode>('regular');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'games'), snap =>
      setGames(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) })))
    );
    const u2 = onSnapshot(collection(db, 'playerGameStats'), snap =>
      setStats(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PlayerGameStats, 'id'>) })))
    );
    return () => { u1(); u2(); };
  }, []);

  const playoffGameCount = useMemo(
    () => games.filter(g => g.phase && g.phase !== 'regular').length,
    [games]
  );

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

    // Only count finished games filtered by mode (regular vs playoffs)
    for (const g of games) {
      if (g.status !== 'finished') continue;
      const isPlayoff = g.phase && g.phase !== 'regular';
      if (mode === 'playoffs' && !isPlayoff) continue;
      if (mode === 'regular' && isPlayoff) continue;
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
  }, [games, mode]);

  const anyPlayed = rows.some(r => r.played > 0);

  // Integrity check: for every finished game, the team score on the game doc
  // should equal the sum of player points (playerGameStats.points) for that
  // team in that game. If they drift, something was logged inconsistently
  // (e.g. manual override, partial failure before batching was added).
  const integrityIssues: IntegrityIssue[] = useMemo(() => {
    const issues: IntegrityIssue[] = [];
    for (const g of games) {
      if (g.status !== 'finished') continue;
      const isPlayoff = g.phase && g.phase !== 'regular';
      if (mode === 'playoffs' && !isPlayoff) continue;
      if (mode === 'regular' && isPlayoff) continue;
      const gameStats = stats.filter(s => s.gameId === g.id);
      const homeSum = gameStats
        .filter(s => s.teamId === g.homeTeamId)
        .reduce((a, s) => a + (s.points || 0), 0);
      const awaySum = gameStats
        .filter(s => s.teamId === g.awayTeamId)
        .reduce((a, s) => a + (s.points || 0), 0);
      if (homeSum !== g.homeScore) {
        issues.push({
          gameId: g.id,
          teamId: g.homeTeamId,
          side: 'home',
          gameScore: g.homeScore,
          playerSum: homeSum,
          diff: homeSum - g.homeScore,
        });
      }
      if (awaySum !== g.awayScore) {
        issues.push({
          gameId: g.id,
          teamId: g.awayTeamId,
          side: 'away',
          gameScore: g.awayScore,
          playerSum: awaySum,
          diff: awaySum - g.awayScore,
        });
      }
    }
    return issues;
  }, [games, stats, mode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          🏆 Standing {mode === 'playoffs' ? 'Playoffs' : 'Temporada Regular'}
        </h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setMode('regular')}
            className={`px-3 py-1 rounded font-medium ${
              mode === 'regular' ? 'bg-pmbo-primary text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            🏀 Regular
          </button>
          <button
            onClick={() => setMode('playoffs')}
            disabled={playoffGameCount === 0}
            className={`px-3 py-1 rounded font-medium ${
              mode === 'playoffs' ? 'bg-pmbo-primary text-white' :
              playoffGameCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
              'bg-gray-200 text-gray-700'
            }`}
          >
            🏆 Playoffs
          </button>
        </div>
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

      {/* Integrity check — only visible when drift is detected */}
      {integrityIssues.length > 0 && (
        <details className="card bg-amber-50 border border-amber-200">
          <summary className="cursor-pointer font-semibold text-amber-800">
            ⚠️ Auditoría: {integrityIssues.length} discrepancia(s) detectada(s)
          </summary>
          <p className="text-xs text-amber-700 mt-2">
            El score del equipo en el partido no coincide con la suma de puntos
            registrados por jugador. Esto suele pasar cuando se editó un score
            manualmente o si hubo una conexión inestable antes del fix de
            consistencia. Revisa cada partido:
          </p>
          <ul className="text-xs mt-2 space-y-1">
            {integrityIssues.map((iss, i) => {
              const t = TEAMS_BY_ID[iss.teamId];
              return (
                <li key={i} className="font-mono">
                  Partido <Link to={`/partido/${iss.gameId}`} className="underline">{iss.gameId.slice(0, 8)}…</Link>{' '}
                  · {t.emoji} {t.name} ({iss.side}) —
                  score del juego: <strong>{iss.gameScore}</strong>,
                  suma por jugador: <strong>{iss.playerSum}</strong>
                  {' '}(diff {iss.diff > 0 ? `+${iss.diff}` : iss.diff})
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
