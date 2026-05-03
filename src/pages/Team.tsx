import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { TEAMS_BY_ID } from '../data/teams';
import type { Player, PlayerGameStats } from '../types';

export default function Team() {
  const { teamId } = useParams<{ teamId: string }>();
  const team = teamId ? TEAMS_BY_ID[teamId] : undefined;
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);

  useEffect(() => {
    if (!teamId) return;
    const q1 = query(collection(db, 'players'), where('teamId', '==', teamId));
    const u1 = onSnapshot(q1, (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })));
    });
    const q2 = query(collection(db, 'playerGameStats'), where('teamId', '==', teamId));
    const u2 = onSnapshot(q2, (snap) => {
      setStats(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PlayerGameStats, 'id'>) })));
    });
    return () => { u1(); u2(); };
  }, [teamId]);

  if (!team) return <div>Equipo no encontrado. <Link to="/equipos" className="text-blue-600">Volver</Link></div>;

  // Aggregate stats per player
  const totals = players.map(p => {
    const playerStats = stats.filter(s => s.playerId === p.id);
    return {
      ...p,
      games: playerStats.length,
      points: playerStats.reduce((a, s) => a + (s.points || 0), 0),
      assists: playerStats.reduce((a, s) => a + (s.assists || 0), 0),
      rebounds: playerStats.reduce((a, s) => a + (s.rebounds || 0), 0),
      blocks: playerStats.reduce((a, s) => a + (s.blocks || 0), 0),
      steals: playerStats.reduce((a, s) => a + (s.steals || 0), 0),
      minutes: playerStats.reduce((a, s) => a + (s.minutesPlayed || 0), 0),
    };
  }).sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl p-6 flex items-center gap-4"
        style={{ backgroundColor: team.color, color: team.textColor }}
      >
        <img src={team.logo} alt={team.name} className="w-24 h-24 rounded-lg object-cover" />
        <div>
          <h1 className="text-3xl font-bold">{team.emoji} {team.name}</h1>
          <p className="opacity-80 text-sm">{players.length} jugadores</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mt-6">Roster y stats</h2>
      {players.length === 0 ? (
        <p className="text-gray-500">Aún no hay jugadores. Los árbitros pueden añadirlos desde el admin.</p>
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2"></th>
                <th className="p-2">#</th>
                <th className="p-2">Jugador</th>
                <th className="p-2">PJ</th>
                <th className="p-2">PTS</th>
                <th className="p-2">AST</th>
                <th className="p-2">REB</th>
                <th className="p-2">BLK</th>
                <th className="p-2">STL</th>
                <th className="p-2">MIN</th>
              </tr>
            </thead>
            <tbody>
              {totals.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">{p.number}</div>
                    )}
                  </td>
                  <td className="p-2 font-bold">{p.number}</td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.games}</td>
                  <td className="p-2 font-semibold">{p.points}</td>
                  <td className="p-2">{p.assists}</td>
                  <td className="p-2">{p.rebounds}</td>
                  <td className="p-2">{p.blocks}</td>
                  <td className="p-2">{p.steals}</td>
                  <td className="p-2">{p.minutes.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
