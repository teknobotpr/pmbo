# PMBO — Peñuelas Master Basketball Organization

Sitio web público del torneo. Frontend en React + Vite + TypeScript + Tailwind, base de datos en tiempo real con Firebase Firestore, hospedaje en GitHub Pages.

## ✨ Funcionalidades

- 📊 Stats por jugador: puntos, asistencias, rebotes, bloqueos, robos
- ⏱️ Minutos jugados (cronómetro on-court por jugador)
- 📅 Calendario de partidos con fecha, hora y cancha
- 🏆 Líderes del torneo (top 10 en cada categoría)
- 🥇 Resultados y stats acumulados por equipo
- 🔴 Vista en vivo de partidos (actualización en tiempo real)
- 🔐 Panel privado para árbitros (login Firebase Auth)
- 📱 Móvil-first — diseñado para tablets y celulares en cancha

## 🛠️ Setup

### 1. Crear proyecto Firebase

1. Ve a https://console.firebase.google.com
2. **Add project** → Nombre: `pmbo` (o lo que quieras)
3. Disable Google Analytics (no necesario)
4. Una vez creado:
   - **Build → Authentication → Get started → Email/Password → Enable**
   - **Build → Firestore Database → Create database → Start in production mode → Region: us-east1 (o la más cercana)**
5. **Project settings (engranaje arriba) → General → Your apps → Web (`</>`)**
   - Apodo: `pmbo-web`
   - **NO** marques Firebase Hosting
   - Copia el config object (apiKey, authDomain, projectId, etc.)

### 2. Variables de entorno (local)

```bash
cp .env.example .env
# Edita .env y pega los valores del Firebase config
```

### 3. Reglas de Firestore

Copia el contenido de `firestore.rules` en:
- Firebase Console → Firestore Database → Rules → Publish

### 4. Crear primer árbitro

Firebase Console → Authentication → Users → **Add user**
- Email + password (lo que vas a usarles a los árbitros)

### 5. Correr local

```bash
npm install
npm run dev
```

## 🚀 Deploy a GitHub Pages

1. Crea repo en GitHub: `teknobotpr/pmbo`
2. Push del código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/teknobotpr/pmbo.git
   git push -u origin main
   ```
3. **GitHub repo → Settings → Pages → Source: GitHub Actions**
4. **Settings → Secrets and variables → Actions → New repository secret** (uno por cada VITE_FIREBASE_*):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Push y el workflow desplegará automáticamente a https://teknobotpr.github.io/pmbo

## 📋 Uso

### Como público

Todos pueden ver: equipos, calendario, líderes, stats acumulados, partidos en vivo.

### Como árbitro de mesa

1. Login en `/login` con su cuenta
2. **Admin → Partidos**: programa el partido o haz clic en **Mesa** del partido a llevar
3. **Modo mesa**:
   - Click ▶️ Iniciar para activar el partido
   - Selecciona equipo → selecciona jugador
   - Botones grandes: +1, +2, +3, AST, REB, BLK, STL
   - **CANCHA / BANCA** alterna el cronómetro de minutos (cuando un jugador entra/sale)
   - ⏹️ Terminar partido cuando acabe

## 🏀 Equipos

| Equipo | Color |
|---|---|
| 🪵 Leñeros | Amarillo |
| 🤿 Buzos | Azul |
| 🧙‍♂️ Brujos | Naranja |
| 🥷 Asesinos | Negro |
| 😇 Ángeles | Amarillo + Azul marino |
| 😈 Villanos | Rojo |

## 📁 Estructura

```
src/
  assets/logos/   # Logos de equipos (.jpg)
  components/     # Layout, etc.
  contexts/       # AuthContext
  data/teams.ts   # Definición estática de los 6 equipos
  pages/          # Home, Teams, Team, Leaders, Schedule, Login, Admin, GameLive, GameMesa
  firebase.ts     # Init Firebase
  types.ts        # Modelos TypeScript
```
