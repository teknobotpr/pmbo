import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { TEAMS_BY_ID } from '../data/teams';
import type { Player, PlayerGameStats } from '../types';

interface LeaderRow {
  player: Player;
  total: number;
  perGame: number;
}

export default function Leaders() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'players'), snap =>
      setPlayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })))
    );
    const u2 = onSnapshot(collection(db, 'playerGameStats'), snap =>
      setStats(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PlayerGameStats, 'id'>) })))
    );
    return () => { u1(); u2(); };
  }, []);

  const buildLeaders = (key: keyof PlayerGameStats): LeaderRow[] => {
    return players
      .map(p => {
        const playerStats = stats.filter(s => s.playerId === p.id);
        const total = playerStats.reduce((a, s) => a + ((s[key] as number) || 0), 0);
        const games = playerStats.length || 1;
        return { player: p, total, perGame: total / games };
      })
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const categories: { key: keyof PlayerGameStats; label: string; emoji: string }[] = [
    { key: 'points', label: 'Puntos', emoji: '🎯' },
    { key: 'threesMade', label: 'Triples (3PT)', emoji: '🔥' },
    { key: 'assists', label: 'Asistencias', emoji: '🤝' },
    { key: 'rebounds', label: 'Rebotes', emoji: '🏀' },
    { key: 'blocks', label: 'Bloqueos', emoji: '🛡️' },
    { key: 'steals', label: 'Robos', emoji: '⚡' },
    { key: 'minutesPlayed', label: 'Minutos', emoji: '⏱️' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏆 Líderes del torneo</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {categories.map(cat => (
          <div key={cat.key} className="card">
            <h2 className="font-bold mb-2">{cat.emoji} {cat.label}</h2>
            <ol className="space-y-1 text-sm">
              {buildLeaders(cat.key).map((row, i) => {
                const team = TEAMS_BY_ID[row.player.teamId];
                return (
                  <li key={row.player.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400 w-5">{i + 1}.</span>
                      <span
                        className="inline-block w-2 h-4 rounded"
                        style={{ backgroundColor: team?.color }}
                      />
                      <span className="font-medium">{row.player.name}</span>
                      <span className="text-gray-400 text-xs">
                        {team?.name}
                      </span>
                    </span>
                    <span className="font-bold">
                      {cat.key === 'minutesPlayed' ? row.total.toFixed(1) : row.total}
                    </span>
                  </li>
                );
              })}
              {buildLeaders(cat.key).length === 0 && (
                <li className="text-gray-400 text-xs">Sin datos aún</li>
              )}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
