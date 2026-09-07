import React, { useEffect, useRef, useState } from 'react';
import { FiHeadphones } from 'react-icons/fi';
import { ECONOMY_API, GameRound } from '../../utils/economy';
import { getAuthHeader } from '../../utils/auth';
import { EconomyError } from './EconomyLayout';

export default function AbilityPlayer({ round }: { round: GameRound }) {
  const audio = useRef<HTMLAudioElement>(null);
  const abort = useRef<AbortController | null>(null);
  const currentUrl = useRef<string | null>(null);
  const autoplayUrl = useRef<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );
  const play = async (next: number) => {
    abort.current?.abort();
    audio.current?.pause();
    const controller = new AbortController();
    abort.current = controller;
    setSlot(next);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${ECONOMY_API}/api/games/rounds/${round.id}/audio/${next}`, {
        headers: getAuthHeader(),
        credentials: 'include',
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error('This clip could not load. Try again; your guesses are safe.');
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      const url = URL.createObjectURL(blob);
      currentUrl.current = url;
      setSrc(url);
    } catch (err) {
      if (!controller.signal.aborted) setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  return (
    <div className="essence-sound-stage">
      <div className="essence-sound-mark" aria-hidden="true">
        <FiHeadphones />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2>Listen closely.</h2>
        <p className="essence-muted essence-small">
          Play any ability. Replay as often as you like.
        </p>
      </div>
      <div className="essence-audio-tabs" aria-label="Ability sounds">
        {round.audioSlots.map((s, i) => (
          <button
            className="essence-button essence-secondary"
            type="button"
            key={s}
            aria-pressed={slot === s}
            onClick={() => play(s)}
          >
            {loading && slot === s
              ? 'Loading…'
              : round.answer?.abilities[i]?.key || ['Q', 'W', 'E', 'R'][i]}
          </button>
        ))}
      </div>
      {src ? (
        <audio
          ref={audio}
          src={src}
          controls
          preload="auto"
          aria-label="Champion ability sound"
          onCanPlay={() => {
            if (autoplayUrl.current !== src) {
              autoplayUrl.current = src;
              audio.current?.play().catch(() => {});
            }
          }}
          onError={() => setError(new Error('Audio playback failed. Select the clip to retry.'))}
        />
      ) : (
        <p className="essence-muted essence-small">Choose an ability to start listening.</p>
      )}
      {round.answer && slot !== null ? (
        <p className="essence-small">{round.answer.abilities[slot]?.name}</p>
      ) : null}
      <EconomyError error={error} retry={slot !== null ? () => play(slot) : undefined} />
    </div>
  );
}
