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
  const canvas = useRef<HTMLCanvasElement>(null);
  const graph = useRef<{
    context: AudioContext;
    analyser: AnalyserNode;
    source: MediaElementAudioSourceNode;
  } | null>(null);
  const frame = useRef(0);
  const graphStarting = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const stopVisuals = () => {
    setPlaying(false);
    cancelAnimationFrame(frame.current);
  };
  const beginVisuals = async () => {
    setPlaying(true);
    if (!audio.current) return;
    if (graphStarting.current) return;
    graphStarting.current = true;
    try {
      if (!graph.current) {
        const context = new AudioContext();
        await context.resume();
        if (!audio.current || context.state !== 'running') {
          await context.close();
          return;
        }
        const source = context.createMediaElementSource(audio.current);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(context.destination);
        graph.current = { context, analyser, source };
      }
      await graph.current.context.resume();
      cancelAnimationFrame(frame.current);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const samples = new Uint8Array(graph.current.analyser.frequencyBinCount);
      const draw = () => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx || !graph.current || !audio.current || audio.current.paused) return;
        graph.current.analyser.getByteTimeDomainData(samples);
        ctx.clearRect(0, 0, 900, 160);
        ctx.strokeStyle = '#66dfcd';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#66dfcd';
        ctx.beginPath();
        samples.forEach((sample, i) => {
          const x = (i / (samples.length - 1)) * 900;
          const y = 80 + (sample - 128) * 0.85;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
        frame.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      /* Native audio remains available when Web Audio is unsupported. */
    } finally {
      graphStarting.current = false;
    }
  };
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
      cancelAnimationFrame(frame.current);
      graph.current?.source.disconnect();
      void graph.current?.context.close();
      onBusyChange(false);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [onBusyChange],
  );
  useEffect(() => {
    if (round.finished) {
      audio.current?.pause();
    }
  }, [round.finished]);
  const play = async (next: number) => {
    if (loading || disabled) return;
    abort.current?.abort();
    audio.current?.pause();
    setElapsed(0);
    setDuration(0);
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
    <div
      className={`essence-sound-stage sound-console ${playing ? 'is-playing' : ''} ${
        round.finished ? 'finished' : ''
      }`}
    >
      <div className="essence-sound-mark" aria-hidden="true">
        <FiHeadphones />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2>{round.finished ? 'Signal identified.' : 'Find the champion in the sound.'}</h2>
        <p className="essence-muted essence-small">
          Choose an ability. Replay it as often as you like.
        </p>
      </div>
      <div className="sound-scope">
        <div className="sound-scope-label">
          <span>{loading ? 'LOADING SIGNAL' : playing ? 'SIGNAL LIVE' : 'LISTENING BOOTH'}</span>
          <span>{slot !== null ? `${['Q', 'W', 'E', 'R'][slot]} CHANNEL` : 'SELECT A PAD'}</span>
        </div>
        <canvas ref={canvas} width={900} height={160} aria-label="Live audio waveform" />
        <div className="sound-playhead">
          <progress max={duration || 1} value={elapsed} aria-label="Ability playback progress" />
          <span>
            {elapsed.toFixed(1)} / {duration.toFixed(1)}s
          </span>
        </div>
      </div>
      <div className="essence-audio-tabs" aria-label="Ability sounds">
        {round.audioSlots.map((s, i) => (
          <button
            className="essence-button essence-secondary"
            type="button"
            key={s}
            aria-pressed={slot === s}
            data-opened={round.listenedSlots.includes(s)}
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
            <kbd>{round.answer?.abilities[i]?.key || ['Q', 'W', 'E', 'R'][i]}</kbd>
            <span>
              {round.finished
                ? round.listenedSlots.includes(s)
                  ? 'OPENED'
                  : 'UNOPENED'
                : round.listenedSlots.includes(s)
                ? 'REPLAY · FREE'
                : round.practice || round.listenedSlots.length === 0
                ? 'FIRST LISTEN'
                : '−10 PE'}
            </span>
            {round.finished ? <small>{round.answer?.abilities[i]?.name}</small> : null}
          </button>
        ))}
      </div>
      <div className="essence-audio-control">
        <div hidden={!src}>
          <audio
            ref={audio}
            src={src || undefined}
            controls
            preload="auto"
            aria-label="Champion ability sound"
            onPlay={() => {
              void beginVisuals();
            }}
            onPause={stopVisuals}
            onEnded={stopVisuals}
            onTimeUpdate={() => setElapsed(audio.current?.currentTime || 0)}
            onLoadedMetadata={() =>
              setDuration(Number.isFinite(audio.current?.duration) ? audio.current!.duration : 0)
            }
            onCanPlay={() => {
              if (autoplayUrl.current !== src) {
                autoplayUrl.current = src;
                audio.current?.play().catch(() => {});
              }
            }}
            onError={() => setError(new Error('Audio playback failed. Select the clip to retry.'))}
          />
        </div>
        {!src ? (
          <p className="essence-muted essence-small">Choose an ability to start listening.</p>
        ) : null}
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
