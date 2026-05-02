import type { Team } from '../types';
import lenerosLogo from '../assets/logos/leneros.jpg';
import buzosLogo from '../assets/logos/buzos.jpg';
import brujosLogo from '../assets/logos/brujos.jpg';
import asesinosLogo from '../assets/logos/asesinos.jpg';
import angelesLogo from '../assets/logos/angeles.jpg';
import villanosLogo from '../assets/logos/villanos.jpg';

export const TEAMS: Team[] = [
  {
    id: 'leneros',
    name: 'Leñeros',
    emoji: '🪵',
    color: '#FFD700',
    textColor: '#000000',
    logo: lenerosLogo,
  },
  {
    id: 'buzos',
    name: 'Buzos',
    emoji: '🤿',
    color: '#1E40AF',
    textColor: '#FFFFFF',
    logo: buzosLogo,
  },
  {
    id: 'brujos',
    name: 'Brujos',
    emoji: '🧙‍♂️',
    color: '#EA580C',
    textColor: '#FFFFFF',
    logo: brujosLogo,
  },
  {
    id: 'asesinos',
    name: 'Asesinos',
    emoji: '🥷',
    color: '#000000',
    textColor: '#FFFFFF',
    logo: asesinosLogo,
  },
  {
    id: 'angeles',
    name: 'Ángeles',
    emoji: '😇',
    color: '#FBBF24',
    textColor: '#1E3A8A',
    logo: angelesLogo,
  },
  {
    id: 'villanos',
    name: 'Villanos',
    emoji: '😈',
    color: '#DC2626',
    textColor: '#FFFFFF',
    logo: villanosLogo,
  },
];

export const TEAMS_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t])) as Record<string, Team>;
