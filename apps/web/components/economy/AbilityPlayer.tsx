import React, { useEffect, useRef, useState } from 'react';
import { FiHeadphones } from 'react-icons/fi';
import { ECONOMY_API, GameRound } from '../../utils/economy';
import { getAuthHeader } from '../../utils/auth';
import { EconomyError } from './EconomyLayout';

export default function AbilityPlayer({
  round,
  disabled,
  onBusyChange,
  onListened,
}: {
  round: GameRound;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onListened: (slot: number) => void;
}) {
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
      onBusyChange(false);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [onBusyChange],
  );
  const play = async (next: number) => {
    if (loading || disabled) return;
    abort.current?.abort();
    audio.current?.pause();
    const controller = new AbortController();
    abort.current = controller;
    setSlot(next);
    setLoading(true);
    onBusyChange(true);
    setError(null);
    try {
      const response = await fetch(`${ECONOMY_API}/api/games/rounds/${round.id}/audio/${next}`, {
        headers: getAuthHeader(),
        credentials: 'include',
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error('This clip could not load. Try again; your guesses are safe.');
      onListened(next);
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      const url = URL.createObjectURL(blob);
      currentUrl.current = url;
      setSrc(url);
    } catch (err) {
      if (!controller.signal.aborted) setError(err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        onBusyChange(false);
      }
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
          Choose an ability. Replay it as often as you like.
        </p>
      </div>
      <div className="essence-audio-tabs" aria-label="Ability sounds">
        {round.audioSlots.map((s, i) => (
          <button
            className="essence-button essence-secondary"
            type="button"
            key={s}
            aria-pressed={slot === s}
            aria-label={`Play ${['Q', 'W', 'E', 'R'][i]} ability${
              !round.finished &&
              !round.practice &&
              round.listenedSlots.length > 0 &&
              !round.listenedSlots.includes(s)
                ? ' (−10 PE)'
                : ''
            }`}
            disabled={disabled || loading}
            onClick={() => play(s)}
          >
            {round.answer?.abilities[i]?.key || ['Q', 'W', 'E', 'R'][i]}
          </button>
        ))}
      </div>
      <div className="essence-audio-control">
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
      </div>
      <p className="essence-audio-status essence-muted essence-small" role="status">
        {loading
          ? 'Loading ability…'
          : slot !== null
          ? `${['Q', 'W', 'E', 'R'][slot]} selected · ${round.listenedSlots.length} of ${
              round.audioSlots.length
            } abilities opened`
          : `${round.listenedSlots.length} of ${round.audioSlots.length} abilities opened`}
      </p>
      {round.answer && slot !== null ? (
        <p className="essence-small">{round.answer.abilities[slot]?.name}</p>
      ) : null}
      <EconomyError error={error} retry={slot !== null ? () => play(slot) : undefined} />
    </div>
  );
}
