import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { Link, Navigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { TEAMS, TEAMS_BY_ID } from '../data/teams';
import type { Game, Player, PlayerGameStats, TeamId, Venue } from '../types';
import { fileToResizedDataUrl } from '../utils/image';

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'players' | 'venues' | 'games' | 'audit'>('games');

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">⚙️ Panel de árbitros</h1>
      <div className="flex gap-2 border-b">
        <TabBtn active={tab === 'games'} onClick={() => setTab('games')} label="Partidos" />
        <TabBtn active={tab === 'players'} onClick={() => setTab('players')} label="Jugadores" />
        <TabBtn active={tab === 'venues'} onClick={() => setTab('venues')} label="Canchas" />
        <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')} label="Auditoría" />
      </div>
      {tab === 'games' && <GamesAdmin />}
      {tab === 'players' && <PlayersAdmin />}
      {tab === 'venues' && <VenuesAdmin />}
      {tab === 'audit' && <AuditAdmin />}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium ${
        active ? 'border-b-2 border-pmbo-primary text-pmbo-primary' : 'text-gray-500'
      }`}
    >
      {label}
    </button>
  );
}

function PlayersAdmin() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [number, setNumber] = useState<number | ''>('');
  const [teamId, setTeamId] = useState<TeamId>('leneros');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'players'), (snap) =>
      setPlayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })))
    );
  }, []);

  const onPickPhoto = async (file: File | null) => {
    if (!file) { setPhotoPreview(null); return; }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhotoPreview(dataUrl);
    } catch (err) {
      console.error(err);
      alert('No pude procesar la foto. Intenta otra.');
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || number === '') return;
    setBusy(true);
    try {
      const data: Omit<Player, 'id'> = {
        name: name.trim(),
        number: Number(number),
        teamId,
        ...(photoPreview ? { photoUrl: photoPreview } : {}),
      };
      await addDoc(collection(db, 'players'), data);
      setName(''); setNumber(''); setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  const replacePhoto = async (player: Player, file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      await updateDoc(doc(db, 'players', player.id), { photoUrl: dataUrl });
    } catch (err) {
      console.error(err);
      alert('No pude actualizar la foto.');
    }
  };

  const removePhoto = async (player: Player) => {
    if (!confirm(`¿Quitar foto de ${player.name}?`)) return;
    await updateDoc(doc(db, 'players', player.id), { photoUrl: '' });
  };

  const remove = async (id: string) => {
    if (confirm('¿Eliminar este jugador?')) {
      await deleteDoc(doc(db, 'players', id));
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          placeholder="Nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded p-2"
          required
        />
        <input
          type="number"
          placeholder="#"
          value={number}
          onChange={e => setNumber(e.target.value === '' ? '' : Number(e.target.value))}
          className="border rounded p-2"
          required
        />
        <select
          value={teamId}
          onChange={e => setTeamId(e.target.value as TeamId)}
          className="border rounded p-2"
        >
          {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '...' : 'Añadir'}
        </button>
        <div className="sm:col-span-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Foto (opcional):</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => onPickPhoto(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {photoPreview && (
            <img
              src={photoPreview}
              alt="preview"
              className="w-12 h-12 rounded-full object-cover border"
            />
          )}
        </div>
      </form>
      <div className="space-y-2">
        {TEAMS.map(t => {
          const teamPlayers = players.filter(p => p.teamId === t.id).sort((a, b) => a.number - b.number);
          return (
            <div key={t.id} className="card">
              <h3 className="font-bold mb-2">{t.emoji} {t.name} ({teamPlayers.length})</h3>
              <ul className="text-sm divide-y">
                {teamPlayers.map(p => (
                  <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">—</div>
                      )}
                      <span className="truncate">#{p.number} — {p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                        {p.photoUrl ? 'cambiar foto' : 'subir foto'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) replacePhoto(p, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {p.photoUrl && (
                        <button onClick={() => removePhoto(p)} className="text-xs text-gray-500 hover:underline">quitar</button>
                      )}
                      <button
                        onClick={() => remove(p.id)}
                        className="text-red-500 text-xs hover:underline"
                      >
                        eliminar
                      </button>
                    </div>
                  </li>
                ))}
                {teamPlayers.length === 0 && (
                  <li className="text-gray-400 text-xs italic">sin jugadores</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VenuesAdmin() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'venues'), snap =>
      setVenues(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Venue, 'id'>) })))
    );
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, 'venues'), { name: name.trim(), address: address.trim() });
    setName(''); setAddress('');
  };

  const remove = async (id: string) => {
    if (confirm('¿Eliminar esta cancha?')) await deleteDoc(doc(db, 'venues', id));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          placeholder="Nombre de cancha"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded p-2"
          required
        />
        <input
          placeholder="Dirección (opcional)"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="border rounded p-2"
        />
        <button type="submit" className="btn-primary">Añadir</button>
      </form>
      <div className="card">
        <ul className="divide-y text-sm">
          {venues.map(v => (
            <li key={v.id} className="py-2 flex justify-between">
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-xs text-gray-500">{v.address}</div>
              </div>
              <button onClick={() => remove(v.id)} className="text-red-500 text-xs hover:underline">eliminar</button>
            </li>
          ))}
          {venues.length === 0 && <li className="text-gray-400 italic py-2">sin canchas aún</li>}
        </ul>
      </div>
    </div>
  );
}

function GamesAdmin() {
  const [games, setGames] = useState<Game[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [home, setHome] = useState<TeamId>('leneros');
  const [away, setAway] = useState<TeamId>('buzos');
  const [venueId, setVenueId] = useState('');
  const [datetime, setDatetime] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'games'), orderBy('scheduledAt', 'asc')), snap =>
      setGames(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) })))
    );
    const u2 = onSnapshot(collection(db, 'venues'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Venue, 'id'>) }));
      setVenues(list);
      if (!venueId && list[0]) setVenueId(list[0].id);
    });
    return () => { u1(); u2(); };
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datetime || !venueId || home === away) return;
    await addDoc(collection(db, 'games'), {
      homeTeamId: home,
      awayTeamId: away,
      venueId,
      scheduledAt: new Date(datetime).getTime(),
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
    });
    setDatetime('');
  };

  const remove = async (id: string) => {
    if (confirm('¿Eliminar este partido?')) await deleteDoc(doc(db, 'games', id));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card grid grid-cols-2 gap-2">
        <select value={home} onChange={e => setHome(e.target.value as TeamId)} className="border rounded p-2">
          {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name} (Local)</option>)}
        </select>
        <select value={away} onChange={e => setAway(e.target.value as TeamId)} className="border rounded p-2">
          {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name} (Visitante)</option>)}
        </select>
        <select value={venueId} onChange={e => setVenueId(e.target.value)} className="border rounded p-2 col-span-2">
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          {venues.length === 0 && <option value="">— Crea una cancha primero —</option>}
        </select>
        <input
          type="datetime-local"
          value={datetime}
          onChange={e => setDatetime(e.target.value)}
          className="border rounded p-2 col-span-2"
          required
        />
        <button type="submit" className="btn-primary col-span-2" disabled={home === away}>
          Programar partido
        </button>
      </form>
      <div className="space-y-2">
        {games.map(g => {
          const h = TEAMS_BY_ID[g.homeTeamId];
          const a = TEAMS_BY_ID[g.awayTeamId];
          const v = venues.find(x => x.id === g.venueId);
          return (
            <div key={g.id} className="card flex justify-between items-center">
              <div>
                <div className="font-medium">{h?.name} vs {a?.name}</div>
                <div className="text-xs text-gray-500">
                  {new Date(g.scheduledAt).toLocaleString('es-PR')} · {v?.name}
                </div>
                <div className="text-xs">
                  Estado: <span className="font-semibold">{g.status}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/partido/${g.id}/mesa`} className="btn-primary text-sm">
                  Mesa
                </Link>
                <button onClick={() => remove(g.id)} className="text-red-500 text-xs hover:underline">
                  eliminar
                </button>
              </div>
            </div>
          );
        })}
        {games.length === 0 && <p className="text-gray-500 text-sm">No hay partidos programados.</p>}
      </div>
    </div>
  );
}

// ============================================================================
// AuditAdmin — detects and fixes data integrity issues in player stats / scores
// ============================================================================

interface NegativeStat {
  statRow: PlayerGameStats;
  player: Player | undefined;
  fields: { key: keyof PlayerGameStats; value: number }[]; // which fields are negative
}

interface GameDrift {
  game: Game;
  homeSum: number;
  awaySum: number;
}

function AuditAdmin() {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'games'), s =>
      setGames(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) })))
    );
    const u2 = onSnapshot(collection(db, 'playerGameStats'), s =>
      setStats(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PlayerGameStats, 'id'>) })))
    );
    const u3 = onSnapshot(collection(db, 'players'), s =>
      setPlayers(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })))
    );
    return () => { u1(); u2(); u3(); };
  }, []);

  const playerById = useMemo(
    () => Object.fromEntries(players.map(p => [p.id, p])),
    [players]
  );

  // Find any negative stat fields across all playerGameStats
  const negatives: NegativeStat[] = useMemo(() => {
    const out: NegativeStat[] = [];
    const numericFields: (keyof PlayerGameStats)[] = [
      'points', 'assists', 'rebounds', 'blocks', 'steals', 'minutesPlayed', 'threesMade',
    ];
    for (const s of stats) {
      const fields: { key: keyof PlayerGameStats; value: number }[] = [];
      for (const f of numericFields) {
        const v = (s[f] as number) || 0;
        if (v < 0) fields.push({ key: f, value: v });
      }
      if (fields.length > 0) {
        out.push({ statRow: s, player: playerById[s.playerId], fields });
      }
    }
    return out;
  }, [stats, playerById]);

  // For each finished game, compare game.homeScore/awayScore with sum of player points
  const drifts: GameDrift[] = useMemo(() => {
    const out: GameDrift[] = [];
    for (const g of games) {
      if (g.status !== 'finished') continue;
      const gameStats = stats.filter(s => s.gameId === g.id);
      const homeSum = gameStats
        .filter(s => s.teamId === g.homeTeamId)
        .reduce((a, s) => a + ((s.points as number) || 0), 0);
      const awaySum = gameStats
        .filter(s => s.teamId === g.awayTeamId)
        .reduce((a, s) => a + ((s.points as number) || 0), 0);
      if (homeSum !== g.homeScore || awaySum !== g.awayScore) {
        out.push({ game: g, homeSum, awaySum });
      }
    }
    return out;
  }, [games, stats]);

  // Fix: clamp a single stat row's negative fields to 0
  // Also subtract the clamped delta from the team score if it was the points field
  // (because the negative was wrongly counted against the team score already)
  const fixNegative = async (item: NegativeStat) => {
    if (!item.statRow) return;
    if (busy) return;
    if (!confirm(`Corregir stats negativas de ${item.player?.name || item.statRow.playerId}?`)) return;

    setBusy(item.statRow.id);
    try {
      const update: Partial<PlayerGameStats> = {};
      for (const f of item.fields) {
        // @ts-expect-error key indexing
        update[f.key] = 0;
      }
      await updateDoc(doc(db, 'playerGameStats', item.statRow.id), update);
      alert(`Corregido: ${item.fields.map(f => `${String(f.key)} ${f.value} → 0`).join(', ')}`);
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // Fix drift: align game.homeScore/awayScore to the sum of player points
  // (player stats are treated as the granular source of truth)
  const reconcileGameToPlayers = async (d: GameDrift) => {
    if (busy) return;
    if (!confirm(
      `Reconciliar el score del partido ${d.game.id.slice(0, 8)}…?\n\n` +
      `Cambios:\n` +
      `  homeScore: ${d.game.homeScore} → ${d.homeSum}\n` +
      `  awayScore: ${d.game.awayScore} → ${d.awaySum}\n\n` +
      `Esto trata los puntos por jugador como la verdad granular.`
    )) return;
    setBusy(d.game.id);
    try {
      await updateDoc(doc(db, 'games', d.game.id), {
        homeScore: d.homeSum,
        awayScore: d.awaySum,
      });
      alert('Score del partido reconciliado.');
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // Fix all negatives in one batch
  const fixAllNegatives = async () => {
    if (busy) return;
    if (negatives.length === 0) return;
    if (!confirm(`Corregir ${negatives.length} jugador(es) con stats negativas a 0?`)) return;
    setBusy('all-negatives');
    try {
      const batch = writeBatch(db);
      for (const item of negatives) {
        const update: Partial<PlayerGameStats> = {};
        for (const f of item.fields) {
          // @ts-expect-error key indexing
          update[f.key] = 0;
        }
        batch.update(doc(db, 'playerGameStats', item.statRow.id), update);
      }
      await batch.commit();
      alert(`Corregidos ${negatives.length} registros.`);
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Negative stats section */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">🚫 Stats negativas</h2>
          {negatives.length > 0 && (
            <button
              onClick={fixAllNegatives}
              disabled={busy !== null}
              className="btn-primary text-sm"
            >
              Corregir todas a 0
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Stats por jugador con valor menor a cero. Causa típica: bug viejo del
          botón "Deshacer". Corregir a 0 es seguro.
        </p>
        {negatives.length === 0 ? (
          <p className="text-sm text-green-700 mt-3">✅ No hay stats negativas.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {negatives.map(item => (
              <li
                key={item.statRow.id}
                className="border border-amber-200 bg-amber-50 rounded p-2 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-medium">
                    {item.player
                      ? `#${item.player.number} ${item.player.name}`
                      : `Jugador desconocido (${item.statRow.playerId})`}
                    {' '}
                    <span className="text-xs text-gray-500">
                      ({TEAMS_BY_ID[item.statRow.teamId]?.name})
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono">
                    Partido {item.statRow.gameId.slice(0, 8)}… ·{' '}
                    {item.fields.map(f => `${String(f.key)}=${f.value}`).join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => fixNegative(item)}
                  disabled={busy !== null}
                  className="btn-secondary text-xs whitespace-nowrap"
                >
                  Corregir a 0
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Score drift section */}
      <section className="card">
        <h2 className="font-bold">⚖️ Discrepancias de score</h2>
        <p className="text-xs text-gray-500 mt-1">
          Partidos finalizados donde el score del juego (mostrado en el marcador)
          no coincide con la suma de puntos por jugador. Reconciliar fija el
          score del partido al total granular.
        </p>
        {drifts.length === 0 ? (
          <p className="text-sm text-green-700 mt-3">✅ Todos los scores cuadran.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {drifts.map(d => {
              const home = TEAMS_BY_ID[d.game.homeTeamId];
              const away = TEAMS_BY_ID[d.game.awayTeamId];
              const homeOk = d.homeSum === d.game.homeScore;
              const awayOk = d.awaySum === d.game.awayScore;
              return (
                <li
                  key={d.game.id}
                  className="border border-amber-200 bg-amber-50 rounded p-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-medium">
                      {home?.emoji} {home?.name} vs {away?.name} {away?.emoji}
                    </div>
                    <button
                      onClick={() => reconcileGameToPlayers(d)}
                      disabled={busy !== null}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      Reconciliar
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 font-mono space-y-0.5">
                    <div>
                      {home?.name}: marcador=<strong>{d.game.homeScore}</strong>{' '}
                      vs suma jugadores=<strong>{d.homeSum}</strong>{' '}
                      {homeOk ? '✅' : `(diff ${d.homeSum - d.game.homeScore})`}
                    </div>
                    <div>
                      {away?.name}: marcador=<strong>{d.game.awayScore}</strong>{' '}
                      vs suma jugadores=<strong>{d.awaySum}</strong>{' '}
                      {awayOk ? '✅' : `(diff ${d.awaySum - d.game.awayScore})`}
                    </div>
                    <div className="pt-1">
                      Partido: <Link className="underline" to={`/partido/${d.game.id}`}>{d.game.id}</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Tip: corrige primero las stats negativas. Eso suele resolver parte de las
        discrepancias de score. Después reconcilia los partidos que sigan con drift.
      </p>
    </div>
  );
}
