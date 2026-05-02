// Core data models for PMBO

export type TeamId = 'leneros' | 'buzos' | 'brujos' | 'asesinos' | 'angeles' | 'villanos';

export interface Team {
  id: TeamId;
  name: string;
  emoji: string;
  color: string;       // tailwind color hex
  textColor: string;   // black or white for contrast
  logo: string;        // image path
}

export interface Player {
  id: string;          // doc id in firestore
  teamId: TeamId;
  name: string;
  number: number;      // jersey
}

export interface Venue {
  id: string;
  name: string;
  address?: string;
}

export interface Game {
  id: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  venueId: string;
  scheduledAt: number;        // ms timestamp
  status: 'scheduled' | 'live' | 'finished';
  homeScore: number;
  awayScore: number;
  // Per-player minutes played: { playerId: minutes }
  minutesPlayed?: Record<string, number>;
  // Last time each player's minutes started counting (when on court)
  onCourtSince?: Record<string, number>;
}

export interface PlayerGameStats {
  id: string;          // typically `${gameId}_${playerId}`
  gameId: string;
  playerId: string;
  teamId: TeamId;
  points: number;
  assists: number;
  rebounds: number;
  blocks: number;
  steals: number;
  minutesPlayed: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'referee' | 'admin';
}
