import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏀</div>
        <h1 className="text-2xl font-bold">Acceso de árbitros</h1>
        <p className="text-sm text-gray-500">Solo personal de mesa</p>
      </div>
      <form onSubmit={submit} className="space-y-3 card">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
