import type { LiveStreamConfig } from '../types';

/**
 * Detecta la plataforma desde una URL pegada y devuelve la URL de embed correcta.
 * Soporta: YouTube (live + video), Facebook (live + video), Twitch, embed custom.
 */
function toEmbedUrl(cfg: LiveStreamConfig): string | null {
  const url = (cfg.url || '').trim();
  if (!url) return null;

  if (cfg.platform === 'custom') return url;

  if (cfg.platform === 'youtube') {
    try {
      const u = new URL(url);
      if (u.pathname.endsWith('/live') && u.pathname.startsWith('/@')) {
        const handle = u.pathname.split('/')[1];
        return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(handle)}`;
      }
      if (u.pathname.startsWith('/live/')) {
        const id = u.pathname.split('/')[2];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
      if (u.hostname === 'youtu.be') {
        const id = u.pathname.replace(/^\//, '');
        if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (u.pathname.startsWith('/embed/')) return url;
    } catch {
      // not a valid URL
    }
    return null;
  }

  if (cfg.platform === 'facebook') {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
  }

  if (cfg.platform === 'twitch') {
    try {
      const u = new URL(url);
      const channel = u.pathname.replace(/^\//, '').split('/')[0];
      if (channel) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'teknobotpr.github.io';
        return `https://player.twitch.tv/?channel=${channel}&parent=${host}&autoplay=true`;
      }
    } catch {
      // ignore
    }
    return null;
  }

  return null;
}

export default function LiveStreamPlayer({ cfg }: { cfg: LiveStreamConfig }) {
  if (!cfg.enabled) return null;
  const embedUrl = toEmbedUrl(cfg);
  if (!embedUrl) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-wide text-pmbo-dark flex items-center gap-2">
          <span className="inline-flex w-3 h-3 rounded-full bg-red-500 animate-pulse" aria-hidden />
          EN VIVO
        </h2>
        {cfg.title && (
          <span className="text-sm text-gray-600 italic truncate max-w-[60%]">
            {cfg.title}
          </span>
        )}
      </div>
      <div
        className="relative w-full overflow-hidden rounded-2xl border-2 border-pmbo-primary shadow-lg bg-black"
        style={{ paddingTop: '56.25%' }}
      >
        <iframe
          src={embedUrl}
          title={cfg.title || 'Transmisión en vivo'}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          frameBorder={0}
        />
      </div>
    </section>
  );
}
