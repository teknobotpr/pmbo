import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  collection, doc, onSnapshot, query, setDoc, updateDoc, where, increment, serverTimestamp, writeBatch, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { TEAMS_BY_ID } from '../data/teams';
import type { Game, Player, PlayerGameStats, TeamId } from '../types';

type StatKey = 'points' | 'assists' | 'rebounds' | 'blocks' | 'steals';

export default function GameMesa() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, loading } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

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

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!game || !gameId) return <div>Cargando partido...</div>;

  const home = TEAMS_BY_ID[game.homeTeamId];
  const away = TEAMS_BY_ID[game.awayTeamId];
  const team = selectedTeam ? TEAMS_BY_ID[selectedTeam] : null;
  const teamPlayers = selectedTeam ? players.filter(p => p.teamId === selectedTeam).sort((a, b) => a.number - b.number) : [];

  // start game
  const startGame = async () => {
    await updateDoc(doc(db, 'games', gameId), { status: 'live', startedAt: serverTimestamp() });
  };
  const endGame = async () => {
    if (!confirm('¿Terminar el partido?')) return;
    await updateDoc(doc(db, 'games', gameId), { status: 'finished', endedAt: serverTimestamp() });
  };

  // Add stat for selected player
  // Uses a Firestore batch so the player stat increment and the team-score
  // increment succeed (or fail) atomically — guarantees standings stay in sync
  // with the sum of per-player points.
  // For negative amounts (deshacer), reads current value first and clamps to 0
  // so we never go negative.
  const bumpStat = async (statKey: StatKey, amount: number = 1) => {
    if (!selectedPlayer || !selectedTeam) return;
    const player = players.find(p => p.id === selectedPlayer);
    if (!player) return;

    const statsId = `${gameId}_${selectedPlayer}`;
    const statRef = doc(db, 'playerGameStats', statsId);
    const gameRef = doc(db, 'games', gameId);

    // Check current doc — needed for clamp on negatives and to choose set vs update
    const existing = await getDoc(statRef);

    // Clamp negative amounts so we never end up with a sub-zero stat
    let effectiveAmount = amount;
    if (amount < 0) {
      const current = existing.exists() ? (existing.data()[statKey] as number) || 0 : 0;
      if (current <= 0) {
        // Nothing to undo — quietly no-op
        return;
      }
      // Don't go below zero
      effectiveAmount = Math.max(amount, -current);
    }

    const batch = writeBatch(db);

    if (existing.exists()) {
      batch.update(statRef, { [statKey]: increment(effectiveAmount) });
    } else {
      // First-time create — only reachable when amount > 0 (negative early-returns above)
      batch.set(statRef, {
        gameId,
        playerId: selectedPlayer,
        teamId: selectedTeam,
        points: 0, assists: 0, rebounds: 0, blocks: 0, steals: 0, minutesPlayed: 0,
        [statKey]: effectiveAmount,
      });
    }

    // Update game score for points — same batch so it cannot drift.
    // Uses the same clamped effectiveAmount.
    if (statKey === 'points') {
      const scoreField = selectedTeam === game.homeTeamId ? 'homeScore' : 'awayScore';
      batch.update(gameRef, { [scoreField]: increment(effectiveAmount) });
    }

    await batch.commit();
  };

  // Toggle player on court (start/stop minutes)
  const toggleOnCourt = async (playerId: string) => {
    const onCourtSince = game.onCourtSince || {};
    const minutesPlayed = game.minutesPlayed || {};
    const now = Date.now();

    if (onCourtSince[playerId]) {
      // Player coming off — accumulate minutes
      const elapsed = (now - onCourtSince[playerId]) / 1000 / 60;
      const newTotal = (minutesPlayed[playerId] || 0) + elapsed;
      await updateDoc(doc(db, 'games', gameId), {
        [`minutesPlayed.${playerId}`]: newTotal,
        [`onCourtSince.${playerId}`]: null,
      });
      // Save to playerGameStats too
      const statsId = `${gameId}_${playerId}`;
      const ref = doc(db, 'playerGameStats', statsId);
      try {
        await updateDoc(ref, { minutesPlayed: newTotal });
      } catch {
        const player = players.find(p => p.id === playerId);
        if (player) {
          await setDoc(ref, {
            gameId,
            playerId,
            teamId: player.teamId,
            points: 0, assists: 0, rebounds: 0, blocks: 0, steals: 0,
            minutesPlayed: newTotal,
          });
        }
      }
    } else {
      // Player going on court
      await updateDoc(doc(db, 'games', gameId), {
        [`onCourtSince.${playerId}`]: now,
      });
    }
  };

  const playerStat = (playerId: string) => stats.find(s => s.playerId === playerId);

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="card flex items-center justify-around">
        <div className="text-center">
          <div className="text-xs">{home.emoji} {home.name}</div>
          <div className="text-3xl font-bold">{game.homeScore}</div>
        </div>
        <div>
          {game.status === 'scheduled' && (
            <button onClick={startGame} className="btn-primary">▶️ Iniciar</button>
          )}
          {game.status === 'live' && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">EN VIVO</span>
          )}
          {game.status === 'finished' && <span className="text-sm">FINAL</span>}
        </div>
        <div className="text-center">
          <div className="text-xs">{away.name} {away.emoji}</div>
          <div className="text-3xl font-bold">{game.awayScore}</div>
        </div>
      </div>

      {/* Team picker */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setSelectedTeam(home.id); setSelectedPlayer(null); }}
          className={`p-3 rounded-lg font-bold ${selectedTeam === home.id ? 'ring-4 ring-pmbo-primary' : ''}`}
          style={{ backgroundColor: home.color, color: home.textColor }}
        >
          {home.emoji} {home.name}
        </button>
        <button
          onClick={() => { setSelectedTeam(away.id); setSelectedPlayer(null); }}
          className={`p-3 rounded-lg font-bold ${selectedTeam === away.id ? 'ring-4 ring-pmbo-primary' : ''}`}
          style={{ backgroundColor: away.color, color: away.textColor }}
        >
          {away.emoji} {away.name}
        </button>
      </div>

      {/* Players */}
      {team && (
        <div>
          <h3 className="font-bold mb-2">Selecciona jugador de {team.name}:</h3>
          {teamPlayers.length === 0 && (
            <p className="text-gray-500 text-sm">Este equipo no tiene jugadores. Añádelos en Admin → Jugadores.</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {teamPlayers.map(p => {
              const onCourt = game.onCourtSince?.[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p.id)}
                  className={`relative p-3 rounded-lg border-2 flex flex-col items-center ${
                    selectedPlayer === p.id ? 'bg-pmbo-primary text-white border-pmbo-primary' : 'bg-white'
                  }`}
                >
                  {p.photoUrl ? (
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="w-12 h-12 rounded-full object-cover border mb-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600 mb-1">
                      #{p.number}
                    </div>
                  )}
                  <div className="text-lg font-bold leading-none">#{p.number}</div>
                  <div className="text-xs truncate w-full text-center">{p.name}</div>
                  {onCourt && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" title="En cancha" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stat buttons */}
      {selectedPlayer && (
        <div className="space-y-3">
          <div className="card">
            <div className="text-sm text-gray-600 mb-2">
              Anotando para: <strong>#{players.find(p => p.id === selectedPlayer)?.number} {players.find(p => p.id === selectedPlayer)?.name}</strong>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => bumpStat('points', 1)} className="btn-stat">+1 PT</button>
              <button onClick={() => bumpStat('points', 2)} className="btn-stat">+2 PT</button>
              <button onClick={() => bumpStat('points', 3)} className="btn-stat">+3 PT</button>
              <button onClick={() => bumpStat('assists', 1)} className="btn-stat bg-blue-700 hover:bg-blue-800">AST</button>
              <button onClick={() => bumpStat('rebounds', 1)} className="btn-stat bg-green-700 hover:bg-green-800">REB</button>
              <button onClick={() => bumpStat('blocks', 1)} className="btn-stat bg-purple-700 hover:bg-purple-800">BLK</button>
              <button onClick={() => bumpStat('steals', 1)} className="btn-stat bg-yellow-700 hover:bg-yellow-800">STL</button>
              <button
                onClick={() => toggleOnCourt(selectedPlayer)}
                className={`btn-stat ${game.onCourtSince?.[selectedPlayer] ? 'bg-red-700' : 'bg-emerald-700'}`}
              >
                {game.onCourtSince?.[selectedPlayer] ? 'BANCA' : 'CANCHA'}
              </button>
              <span /> {/* spacer to keep 3-col grid aligned */}
            </div>

            {/* Deshacer row — una fila dedicada para revertir cada stat */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2 font-semibold">Deshacer:</div>
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => bumpStat('points', -1)}
                  className="btn-stat bg-gray-500 hover:bg-gray-600 text-xs py-2"
                  title="Restar 1 punto"
                >
                  −1 PT
                </button>
                <button
                  onClick={() => bumpStat('assists', -1)}
                  className="btn-stat bg-blue-400 hover:bg-blue-500 text-xs py-2"
                  title="Restar 1 asistencia"
                >
                  − AST
                </button>
                <button
                  onClick={() => bumpStat('rebounds', -1)}
                  className="btn-stat bg-green-400 hover:bg-green-500 text-xs py-2"
                  title="Restar 1 rebote"
                >
                  − REB
                </button>
                <button
                  onClick={() => bumpStat('blocks', -1)}
                  className="btn-stat bg-purple-400 hover:bg-purple-500 text-xs py-2"
                  title="Restar 1 bloqueo"
                >
                  − BLK
                </button>
                <button
                  onClick={() => bumpStat('steals', -1)}
                  className="btn-stat bg-yellow-500 hover:bg-yellow-600 text-xs py-2"
                  title="Restar 1 robo"
                >
                  − STL
                </button>
              </div>
            </div>
            {/* Current stats */}
            {(() => {
              const s = playerStat(selectedPlayer);
              if (!s) return <div className="text-xs text-gray-500 mt-2">Sin stats todavía</div>;
              return (
                <div className="mt-3 text-sm grid grid-cols-6 gap-2 text-center">
                  <div><div className="font-bold">{s.points}</div><div className="text-xs text-gray-500">PTS</div></div>
                  <div><div className="font-bold">{s.assists}</div><div className="text-xs text-gray-500">AST</div></div>
                  <div><div className="font-bold">{s.rebounds}</div><div className="text-xs text-gray-500">REB</div></div>
                  <div><div className="font-bold">{s.blocks}</div><div className="text-xs text-gray-500">BLK</div></div>
                  <div><div className="font-bold">{s.steals}</div><div className="text-xs text-gray-500">STL</div></div>
                  <div><div className="font-bold">{(s.minutesPlayed || 0).toFixed(1)}</div><div className="text-xs text-gray-500">MIN</div></div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* End game */}
      {game.status === 'live' && (
        <button onClick={endGame} className="btn-secondary w-full">
          ⏹️ Terminar partido
        </button>
      )}
    </div>
  );
}
