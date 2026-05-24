import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Teams from './pages/Teams';
import Team from './pages/Team';
import Leaders from './pages/Leaders';
import Schedule from './pages/Schedule';
import Standings from './pages/Standings';
import Login from './pages/Login';
import Admin from './pages/Admin';
import GameLive from './pages/GameLive';
import GameMesa from './pages/GameMesa';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="equipos" element={<Teams />} />
            <Route path="equipos/:teamId" element={<Team />} />
            <Route path="lideres" element={<Leaders />} />
            <Route path="standing" element={<Standings />} />
            <Route path="calendario" element={<Schedule />} />
            <Route path="login" element={<Login />} />
            <Route path="admin" element={<Admin />} />
            <Route path="partido/:gameId" element={<GameLive />} />
            <Route path="partido/:gameId/mesa" element={<GameMesa />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
