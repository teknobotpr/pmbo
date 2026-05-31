import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { LiveStreamConfig } from '../../types';
import LiveStreamPlayer from '../../components/LiveStreamPlayer';

const DEFAULTS: LiveStreamConfig = {
  enabled: false,
  platform: 'youtube',
  url: '',
  title: '',
};

const PLATFORM_INFO: Record<LiveStreamConfig['platform'], { label: string; placeholder: string; help: string }> = {
  youtube: {
    label: '▶️ YouTube',
    placeholder: 'https://www.youtube.com/watch?v=XXXXXXXXXXX  o  https://youtu.be/XXXXXXXXXXX',
    help: 'Pega el link del video o live de YouTube. Funciona con /watch?v=, /live/, youtu.be/ y @canal/live.',
  },
  facebook: {
    label: '📘 Facebook',
    placeholder: 'https://www.facebook.com/<pagina>/videos/<id>  o  link del Live',
    help: 'El video DEBE estar público. Si está como "Solo amigos" no se va a mostrar.',
  },
  twitch: {
    label: '🟣 Twitch',
    placeholder: 'https://www.twitch.tv/<canal>',
    help: 'Pega el link del canal de Twitch. Se mostrará en vivo cuando esté transmitiendo.',
  },
  custom: {
    label: '🛠️ Custom (HLS/RTMP/iframe)',
    placeholder: 'https://… (URL completa de embed)',
    help: 'Pega una URL de embed completa (por ejemplo, /embed/ de YouTube, o un player HLS). Se inserta tal cual en el iframe.',
  },
};

const INPUT_CLS =
  'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pmbo-primary';

export default function LiveStreamAdmin() {
  const [cfg, setCfg] = useState<LiveStreamConfig>(DEFAULTS);
  const [saved, setSaved] = useState<LiveStreamConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const u = onSnapshot(doc(db, 'settings', 'liveStream'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LiveStreamConfig;
        setCfg({ ...DEFAULTS, ...data });
        setSaved({ ...DEFAULTS, ...data });
      } else {
        setSaved(null);
      }
    });
    return () => u();
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await setDoc(doc(db, 'settings', 'liveStream'), {
        ...cfg,
        url: cfg.url.trim(),
        title: (cfg.title || '').trim(),
        updatedAt: Date.now(),
      });
      setToast('✅ Guardado');
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      setToast('❌ Error: ' + (e as Error).message);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved || DEFAULTS);
  const info = PLATFORM_INFO[cfg.platform];

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-xl tracking-wider">🔴 EN VIVO — TRANSMISIÓN</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
              className="w-5 h-5"
            />
            <span className="text-sm font-semibold">
              {cfg.enabled ? '🟢 Visible en home' : '⚪ Oculto'}
            </span>
          </label>
        </div>

        <p className="text-xs text-gray-500">
          Esta sección aparece en la home <strong>solo cuando está activa</strong>. Apágala cuando no esté el juego en vivo.
        </p>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Plataforma</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(PLATFORM_INFO) as LiveStreamConfig['platform'][]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCfg({ ...cfg, platform: p })}
                className={`p-3 rounded-lg border-2 text-sm font-semibold ${
                  cfg.platform === p
                    ? 'bg-pmbo-primary text-white border-pmbo-dark'
                    : 'bg-white text-pmbo-dark border-gray-300 hover:border-pmbo-primary'
                }`}
              >
                {PLATFORM_INFO[p].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">URL del stream</label>
          <input
            type="url"
            className={INPUT_CLS}
            placeholder={info.placeholder}
            value={cfg.url}
            onChange={(e) => setCfg({ ...cfg, url: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">{info.help}</p>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Título (opcional)</label>
          <input
            type="text"
            className={INPUT_CLS}
            placeholder="Ej: Leñeros vs Buzos — Semifinal"
            value={cfg.title || ''}
            onChange={(e) => setCfg({ ...cfg, title: e.target.value })}
            maxLength={120}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {toast && <span className="text-sm text-emerald-700">{toast}</span>}
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="btn-primary disabled:opacity-40"
          >
            {busy ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado ✓'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="card">
        <h4 className="font-bold text-lg tracking-wider mb-2">👁️ PREVIEW</h4>
        {!cfg.enabled && (
          <p className="text-sm text-gray-500">Activa el toggle de arriba para ver el preview.</p>
        )}
        {cfg.enabled && !cfg.url.trim() && (
          <p className="text-sm text-gray-500">Pega una URL para ver el preview.</p>
        )}
        {cfg.enabled && cfg.url.trim() && <LiveStreamPlayer cfg={cfg} />}
      </div>
    </div>
  );
}
