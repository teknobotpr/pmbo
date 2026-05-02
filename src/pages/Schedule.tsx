import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { TEAMS_BY_ID } from '../data/teams';
import type { Game, Venue } from '../types';

export default function Schedule() {
  const [games, setGames] = useState<Game[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('scheduledAt', 'asc'));
    const u1 = onSnapshot(q, snap =>
      setGames(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) })))
    );
    const u2 = onSnapshot(collection(db, 'venues'), snap =>
      setVenues(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Venue, 'id'>) })))
    );
    return () => { u1(); u2(); };
  }, []);

  const venueById = Object.fromEntries(venues.map(v => [v.id, v]));

  const grouped = games.reduce<Record<string, Game[]>>((acc, g) => {
    const date = new Date(g.scheduledAt).toLocaleDateString('es-PR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    (acc[date] = acc[date] || []).push(g);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📅 Calendario</h1>
      {games.length === 0 && (
        <p className="text-gray-500">No hay partidos programados aún.</p>
      )}
      {Object.entries(grouped).map(([date, dayGames]) => (
        <section key={date}>
          <h2 className="font-bold capitalize text-gray-700 mb-2">{date}</h2>
          <div className="space-y-2">
            {dayGames.map(g => {
              const home = TEAMS_BY_ID[g.homeTeamId];
              const away = TEAMS_BY_ID[g.awayTeamId];
              const venue = venueById[g.venueId];
              const time = new Date(g.scheduledAt).toLocaleTimeString('es-PR', {
                hour: 'numeric', minute: '2-digit'
              });
              return (
                <Link
                  key={g.id}
                  to={`/partido/${g.id}`}
                  className="card hover:shadow-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm text-gray-500 w-16">{time}</div>
                    <div className="flex items-center gap-2 flex-1">
                      <TeamBadge team={home} score={g.status !== 'scheduled' ? g.homeScore : undefined} />
                      <span className="text-gray-400 text-xs">vs</span>
                      <TeamBadge team={away} score={g.status !== 'scheduled' ? g.awayScore : undefined} />
                    </div>
                  </div>
                  <div className="text-right">
                    {g.status === 'live' && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded animate-pulse">
                        EN VIVO
                      </span>
                    )}
                    {g.status === 'finished' && (
                      <span className="text-xs text-gray-400">FINAL</span>
                    )}
                    <div className="text-xs text-gray-500">{venue?.name || ''}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function TeamBadge({ team, score }: { team: any; score?: number }) {
  if (!team) return null;
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-2 h-6 rounded"
        style={{ backgroundColor: team.color }}
      />
      <span className="font-medium text-sm">{team.name}</span>
      {score !== undefined && (
        <span className="font-bold ml-1">{score}</span>
      )}
    </div>
  );
}
