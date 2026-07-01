import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { TEAMS_BY_ID } from '../data/teams';
import type { Game, Player, PlayerGameStats } from '../types';

type PlayoffPhase = 'quarterfinal' | 'semifinal' | 'final';

const PHASE_ORDER: PlayoffPhase[] = ['quarterfinal', 'semifinal', 'final'];
const PHASE_LABELS: Record<PlayoffPhase, string> = {
  quarterfinal: 'Cuartos de Final',
  semifinal: 'Semifinales',
  final: 'Gran Final',
};



export default function Playoffs() {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tab, setTab] = useState<'bracket' | 'stats'>('bracket');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'games'), snap =>
      setGames(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) })))
    );
    const u2 = onSnapshot(collection(db, 'playerGameStats'), snap =>
      setStats(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PlayerGameStats, 'id'>) })))
    );
    const u3 = onSnapshot(collection(db, 'players'), snap =>
      setPlayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })))
    );
    return () => { u1(); u2(); u3(); };
  }, []);

  const playoffGames = games.filter(g => g.phase && g.phase !== 'regular');
  const byPhase = useMemo(() => {
    const map: Record<PlayoffPhase, Game[]> = {
      quarterfinal: [],
      semifinal: [],
      final: [],
    };
    for (const g of playoffGames) {
      if (g.phase && g.phase !== 'regular') {
        map[g.phase as PlayoffPhase].push(g);
      }
    }
    // Sort each phase by scheduledAt
    for (const phase of PHASE_ORDER) {
      map[phase].sort((a, b) => a.scheduledAt - b.scheduledAt);
    }
    return map;
  }, [playoffGames]);

  const playerById = useMemo(() => Object.fromEntries(players.map(p => [p.id, p])), [players]);

  const hasPlayoffs = Object.values(byPhase).some(g => g.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏆 Playoffs</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setTab('bracket')}
            className={`px-3 py-1 rounded font-medium ${
              tab === 'bracket' ? 'bg-pmbo-primary text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            🥇 Bracket
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-3 py-1 rounded font-medium ${
              tab === 'stats' ? 'bg-pmbo-primary text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            📊 Stats
          </button>
        </div>
      </div>

      {!hasPlayoffs && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🏀</div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">Aún no hay playoffs</h2>
          <p className="text-sm text-gray-500">
            Los partidos de playoffs se crean desde el panel de árbitros.
            <br />
            <Link to="/login" className="text-blue-600 hover:underline">Inicia sesión como árbitro</Link>{' '}
            para agregar los partidos.
          </p>
        </div>
      )}

      {tab === 'bracket' && hasPlayoffs && (
        <BracketView byPhase={byPhase} />
      )}

      {tab === 'stats' && hasPlayoffs && (
        <PlayoffStats games={playoffGames} stats={stats} playerById={playerById} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bracket view
// ---------------------------------------------------------------------------
function BracketView({ byPhase }: { byPhase: Record<PlayoffPhase, Game[]> }) {
  return (
    <div className="space-y-6">
      {PHASE_ORDER.map(phase => {
        const phaseGames = byPhase[phase];
        if (phaseGames.length === 0) return null;
        return (
          <section key={phase}>
            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              {phase === 'quarterfinal' && '🏀'}
              {phase === 'semifinal' && '🔥'}
              {phase === 'final' && '👑'}
              {PHASE_LABELS[phase]}
            </h2>
            <div className={`grid gap-3 ${
              phase === 'quarterfinal' ? 'grid-cols-1 sm:grid-cols-2' :
              phase === 'semifinal' ? 'grid-cols-1 sm:grid-cols-2' :
              'grid-cols-1 sm:grid-cols-1'
            }`}>
              {phaseGames.map(g => (
                <PlayoffGameCard key={g.id} game={g} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlayoffGameCard({ game }: { game: Game }) {
  const home = TEAMS_BY_ID[game.homeTeamId];
  const away = TEAMS_BY_ID[game.awayTeamId];
  const isFinished = game.status === 'finished';
  const isLive = game.status === 'live';
  const homeWon = isFinished && game.homeScore > game.awayScore;
  const awayWon = isFinished && game.awayScore > game.homeScore;

  return (
    <Link
      to={isFinished ? `/partido/${game.id}` : `/partido/${game.id}/mesa`}
      className={`card block hover:shadow-lg transition-shadow border-l-4 ${
        isLive ? 'border-red-500 animate-pulse' :
        isFinished ? 'border-green-500' :
        'border-gray-300'
      }`}
      style={{ borderLeftColor: isLive ? '#ef4444' : isFinished ? '#22c55e' : '#d1d5db' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500">
          {new Date(game.scheduledAt).toLocaleDateString('es-PR', {
            weekday: 'short', month: 'short', day: 'numeric'
          })}
          {' · '}
          {new Date(game.scheduledAt).toLocaleTimeString('es-PR', {
            hour: 'numeric', minute: '2-digit'
          })}
        </div>
        <div>
          {isLive && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded animate-pulse">
              EN VIVO
            </span>
          )}
          {isFinished && (
            <span className="text-gray-400 text-xs">FINAL</span>
          )}
          {!isFinished && !isLive && (
            <span className="text-gray-400 text-xs">PROGRAMADO</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <TeamScoreRow team={home} score={isFinished || isLive ? game.homeScore : null} won={homeWon} />
        <TeamScoreRow team={away} score={isFinished || isLive ? game.awayScore : null} won={awayWon} />
      </div>

      {!isFinished && !isLive && (
        <div className="mt-2 text-xs text-center text-blue-600 font-medium">
          → Ir a mesa de control
        </div>
      )}
      {isFinished && (
        <div className="mt-2 text-xs text-center text-green-600 font-medium">
          → Ver stats del partido
        </div>
      )}
    </Link>
  );
}

function TeamScoreRow({ team, score, won }: { team: any; score: number | null; won: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${
      won ? 'bg-green-50 font-bold' : ''
    }`}>
      <div
        className="w-2 h-6 rounded shrink-0"
        style={{ backgroundColor: team.color }}
      />
      <img
        src={team.logo}
        alt={team.name}
        className="w-7 h-7 object-cover rounded shrink-0"
      />
      <span className={`flex-1 truncate ${won ? 'text-green-800' : 'text-gray-800'}`}>
        {team.emoji} {team.name}
      </span>
      <span className={`text-xl font-bold ${won ? 'text-green-700' : 'text-gray-600'}`}>
        {score !== null ? score : '—'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playoff stats
// ---------------------------------------------------------------------------
function PlayoffStats({ games, stats, playerById }: {
  games: Game[];
  stats: PlayerGameStats[];
  playerById: Record<string, Player>;
}) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Default: most recent finished playoff game
  const sortedFinished = useMemo(
    () => [...games].filter(g => g.status === 'finished').sort((a, b) => b.scheduledAt - a.scheduledAt),
    [games]
  );
  const activeGameId = selectedGame ?? sortedFinished[0]?.id ?? null;
  const activeGame = games.find(g => g.id === activeGameId);

  const gameStats = useMemo(
    () => stats.filter(s => s.gameId === activeGameId),
    [stats, activeGameId]
  );

  const home = activeGame ? TEAMS_BY_ID[activeGame.homeTeamId] : null;
  const away = activeGame ? TEAMS_BY_ID[activeGame.awayTeamId] : null;

  const homeStats = gameStats.filter(s => s.teamId === activeGame?.homeTeamId)
    .sort((a, b) => (b.points || 0) - (a.points || 0));
  const awayStats = gameStats.filter(s => s.teamId === activeGame?.awayTeamId)
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <div className="space-y-4">
      {/* Game selector */}
      {sortedFinished.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-sm mb-3">Partido</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedFinished.map(g => {
              const h = TEAMS_BY_ID[g.homeTeamId];
              const a = TEAMS_BY_ID[g.awayTeamId];
              const isActive = g.id === activeGameId;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGame(g.id)}
                  className={`shrink-0 px-3 py-2 rounded text-sm font-medium border-2 transition-colors ${
                    isActive
                      ? 'bg-pmbo-primary text-white border-pmbo-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-pmbo-primary'
                  }`}
                >
                  {h?.emoji} {h?.name} vs {a?.name} {a?.emoji}
                  <br />
                  <span className="text-xs opacity-80">{g.homeScore} - {g.awayScore}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!activeGame && (
        <p className="text-gray-500 text-sm">Selecciona un partido para ver las stats.</p>
      )}

      {activeGame && (
        <>
          {/* Header */}
          <div className="card">
            <div className="flex items-center justify-center gap-4 text-center">
              <div className="flex-1">
                <div className="text-2xl">{home?.emoji}</div>
                <div className="font-bold">{home?.name}</div>
              </div>
              <div className="text-3xl font-bold text-gray-700">
                {activeGame.homeScore} - {activeGame.awayScore}
              </div>
              <div className="flex-1">
                <div className="text-2xl">{away?.emoji}</div>
                <div className="font-bold">{away?.name}</div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">
              {new Date(activeGame.scheduledAt).toLocaleDateString('es-PR', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })}
              {' · '}
              {PHASE_LABELS[activeGame.phase as PlayoffPhase] ?? 'Playoff'}
            </div>
          </div>

          {/* Stats grids per team */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[home, away].map((team, ti) => {
              const teamStats = ti === 0 ? homeStats : awayStats;
              return (
                <div key={team?.id} className="card" style={{ borderTop: `4px solid ${team?.color}` }}>
                  <h3 className="font-bold mb-3">{team?.emoji} {team?.name}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left pb-1">Jugador</th>
                        <th className="text-center pb-1">PTS</th>
                        <th className="text-center pb-1">3P</th>
                        <th className="text-center pb-1">AST</th>
                        <th className="text-center pb-1">REB</th>
                        <th className="text-center pb-1">BLK</th>
                        <th className="text-center pb-1">STL</th>
                        <th className="text-center pb-1">MIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamStats.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center text-gray-400 text-xs py-3">
                            Sin stats registradas
                          </td>
                        </tr>
                      )}
                      {teamStats.map(s => {
                        const p = playerById[s.playerId];
                        return (
                          <tr key={s.id} className="border-t border-gray-100">
                            <td className="py-1.5">
                              <span className="font-medium text-xs">
                                {p ? `#${p.number} ${p.name}` : s.playerId}
                              </span>
                            </td>
                            <td className="text-center font-bold">{s.points ?? 0}</td>
                            <td className="text-center text-gray-600">{s.threesMade ?? 0}</td>
                            <td className="text-center text-gray-600">{s.assists ?? 0}</td>
                            <td className="text-center text-gray-600">{s.rebounds ?? 0}</td>
                            <td className="text-center text-gray-600">{s.blocks ?? 0}</td>
                            <td className="text-center text-gray-600">{s.steals ?? 0}</td>
                            <td className="text-center text-gray-500 text-xs">
                              {s.minutesPlayed != null ? s.minutesPlayed.toFixed(1) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sortedFinished.length === 0 && hasUnfinishedGames(games) && (
        <p className="text-gray-500 text-sm text-center py-8">
          Los partidos de playoffs aún no terminan. Las stats se muestran cuando el partido acaba.
        </p>
      )}
    </div>
  );
}

function hasUnfinishedGames(games: Game[]) {
  return games.some(g => g.status !== 'finished');
}
