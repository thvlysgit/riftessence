import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { FiArrowRight, FiShield } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { scrimApiRequest } from '../utils/scrimApi';

type OpenScrimRoom = {
  id: string;
  scheduledAt: string;
  hostTeam: { name: string; tag: string | null };
  guestTeam: { name: string; tag: string | null };
};

const labelTeam = (team: OpenScrimRoom['hostTeam']) =>
  `${team.name}${team.tag ? ` [${team.tag}]` : ''}`;

export default function ActiveScrimRoomBanner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<OpenScrimRoom[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setRooms([]);
      return;
    }

    try {
      const result = await scrimApiRequest<{ series?: OpenScrimRoom[] }>(
        '/scrims/series/pending-results',
      );
      setRooms(result.series || []);
    } catch {
      // This reminder is supplemental and must never block the rest of the app.
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [loading, refresh, router.asPath]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onRefresh = () => void refresh();
    window.addEventListener('focus', onRefresh);
    window.addEventListener('riftessence:scrim-room-changed', onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('riftessence:scrim-room-changed', onRefresh);
    };
  }, [refresh, user]);

  const room = rooms[0];
  if (!room) return null;

  return (
    <aside
      aria-label="Open scrim room reminder"
      className="border-b px-4 py-2.5"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="mx-auto flex max-w-[1480px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            <FiShield aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm">
            <strong>Scrim room open</strong>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {' '}
              · {labelTeam(room.hostTeam)} vs {labelTeam(room.guestTeam)}
              {rooms.length > 1 ? ` · ${rooms.length} open rooms` : ''}
            </span>
          </p>
        </div>
        <Link
          href={`/scrims/room/${room.id}`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--color-accent-1)' }}
        >
          Open room <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
