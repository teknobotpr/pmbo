import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { TEAMS_BY_ID } from '../data/teams';
import type { Game, Player, PlayerGameStats } from '../types';

export default function GameLive() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);

  useEffect(() => {
    if (!gameId) return;
    const u1 = onSnapshot(doc(db, 'games', gameId), snap => {
      if (snap.exists()) setGame({ id: snap.id, ...(snap.data() as Omit<Game, 'id'>) });
    });
    const u2 = onSnapshot(query(collection(db, 'playerGameStats'), where('gameId', '==', gameId)), snap =>
      setStats(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PlayerGameStats, 'id'>) })))
    );
    const u3 = onSnapshot(collection(db, 'players'), snap =>
      setPlayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })))
    );
    return () => { u1(); u2(); u3(); };
  }, [gameId]);

  if (!game) return <div>Cargando partido...</div>;

  const home = TEAMS_BY_ID[game.homeTeamId];
  const away = TEAMS_BY_ID[game.awayTeamId];

  return (
    <div className="space-y-6">
      <div className="card text-center">
        <div className="text-xs text-gray-500 mb-2">
          {new Date(game.scheduledAt).toLocaleString('es-PR')}
        </div>
        <div className="flex items-center justify-around">
          <div className="text-center" style={{ color: home.color }}>
            <img src={home.logo} alt={home.name} className="w-16 h-16 mx-auto rounded" />
            <div className="font-bold mt-1">{home.name}</div>
            <div className="text-5xl font-bold text-gray-900">{game.homeScore}</div>
          </div>
          <div className="text-gray-400">
            {game.status === 'live' && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">EN VIVO</span>
            )}
            {game.status === 'finished' && <span className="text-sm">FINAL</span>}
            {game.status === 'scheduled' && <span className="text-sm">Próximamente</span>}
          </div>
          <div className="text-center" style={{ color: away.color }}>
            <img src={away.logo} alt={away.name} className="w-16 h-16 mx-auto rounded" />
            <div className="font-bold mt-1">{away.name}</div>
            <div className="text-5xl font-bold text-gray-900">{game.awayScore}</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TeamStatsTable team={home} players={players} stats={stats} />
        <TeamStatsTable team={away} players={players} stats={stats} />
      </div>
    </div>
  );
}

function TeamStatsTable({ team, players, stats }: { team: any; players: Player[]; stats: PlayerGameStats[] }) {
  const teamPlayers = players.filter(p => p.teamId === team.id);
  const rows = teamPlayers.map(p => {
    const s = stats.find(x => x.playerId === p.id);
    return {
      player: p,
      points: s?.points || 0,
      assists: s?.assists || 0,
      rebounds: s?.rebounds || 0,
      blocks: s?.blocks || 0,
      steals: s?.steals || 0,
      minutes: s?.minutesPlayed || 0,
    };
  }).sort((a, b) => b.points - a.points);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-3 py-2 font-bold" style={{ backgroundColor: team.color, color: team.textColor }}>
        {team.emoji} {team.name}
      </div>
      <table className="w-full text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-1 text-left">#</th>
            <th className="p-1 text-left">Jugador</th>
            <th className="p-1">PTS</th>
            <th className="p-1">AST</th>
            <th className="p-1">REB</th>
            <th className="p-1">BLK</th>
            <th className="p-1">STL</th>
            <th className="p-1">MIN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.player.id} className="border-t">
              <td className="p-1 font-bold">{r.player.number}</td>
              <td className="p-1">{r.player.name}</td>
              <td className="p-1 text-center font-semibold">{r.points}</td>
              <td className="p-1 text-center">{r.assists}</td>
              <td className="p-1 text-center">{r.rebounds}</td>
              <td className="p-1 text-center">{r.blocks}</td>
              <td className="p-1 text-center">{r.steals}</td>
              <td className="p-1 text-center">{r.minutes.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
