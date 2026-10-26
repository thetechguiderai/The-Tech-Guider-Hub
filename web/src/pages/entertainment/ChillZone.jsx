import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMeta } from '../../App';
import { EntNav, LocalBadge, PageHeader } from '../../entertainment/shared';
import { recordActivity, useEntStats } from '../../entertainment/storage';

const SOUNDS = [
  { id: 'rain', name: 'Rain', emoji: '🌧️', desc: 'Halki baarish jaisi soft noise.' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', desc: 'Dheere dheere aane wali lehron ki goonj.' },
  { id: 'brown', name: 'Brown Noise', emoji: '🌫️', desc: 'Focus ke liye low-frequency steady noise.' },
  { id: 'space', name: 'Deep Space', emoji: '🪐', desc: 'Do slow sine tones ka ambient drone.' },
];

const TIMERS = [0, 15, 30, 60];

function noiseBuffer(ctx, seconds, brown) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

export default function ChillZone() {
  useMeta(
    'Chill Zone — The Tech Guider Hub',
    'Relax with browser-generated rain, ocean, brown noise and ambient tones. Includes a visualizer, volume control, sleep timer and local audio playback. No copyrighted audio.'
  );

  const stats = useEntStats();
  const [active, setActive] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioError, setAudioError] = useState('');

  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const analyserRef = useRef(null);
  const sourcesRef = useRef([]);
  const rafRef = useRef(0);
  const canvasRef = useRef(null);
  const volumeRef = useRef(volume);
  const audioUrlRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    volumeRef.current = volume;
    const master = masterRef.current;
    if (master && ctxRef.current) {
      master.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.05);
    }
  }, [volume]);

  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 64; i += 1) {
      const h = 4 + (i % 7) * 2;
      ctx.fillRect(i * 9.3 + 2, canvas.height - h - 10, 5, h);
    }
  }, []);

  const startVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 64;
      const step = Math.floor(data.length / bars);
      const barW = canvas.width / bars;
      for (let i = 0; i < bars; i += 1) {
        let sum = 0;
        for (let j = 0; j < step; j += 1) sum += data[i * step + j] || 0;
        const value = sum / Math.max(1, step) / 255;
        const h = Math.max(3, value * (canvas.height - 24));
        const alpha = 0.18 + value * 0.7;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(i * barW + 1, canvas.height - h - 8, barW - 2, h);
      }
    };
    cancelAnimationFrame(rafRef.current);
    draw();
  }, []);

  const stopNodes = useCallback(() => {
    sourcesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    });
    sourcesRef.current = [];
  }, []);

  const stopAmbient = useCallback(() => {
    stopNodes();
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setActive(null);
    drawIdle();
  }, [drawIdle, stopNodes]);

  const ensureContext = useCallback(async () => {
    let ctx = ctxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctxRef.current = null;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) throw new Error('unsupported');
      ctx = new Ctor();
      ctxRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = volumeRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      master.connect(analyser);
      analyser.connect(ctx.destination);
      masterRef.current = master;
      analyserRef.current = analyser;
      drawIdle();
    }
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }, [drawIdle]);

  const startAmbient = useCallback(
    async (id) => {
      setError('');
      setNotice('');
      try {
        const ctx = await ensureContext();
        stopNodes();
        const master = masterRef.current;
        const sound = SOUNDS.find((s) => s.id === id);
        if (!sound || !master) return;

        if (id === 'space') {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 320;
          const gain = ctx.createGain();
          gain.gain.value = 0.075;
          const oscA = ctx.createOscillator();
          oscA.type = 'sine';
          oscA.frequency.value = 55;
          const oscB = ctx.createOscillator();
          oscB.type = 'sine';
          oscB.frequency.value = 82.41;
          const lfo = ctx.createOscillator();
          lfo.type = 'sine';
          lfo.frequency.value = 0.05;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 110;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          oscA.connect(filter);
          oscB.connect(filter);
          filter.connect(gain);
          gain.connect(master);
          oscA.start();
          oscB.start();
          lfo.start();
          sourcesRef.current = [oscA, oscB, lfo];
        } else {
          const src = ctx.createBufferSource();
          src.buffer = noiseBuffer(ctx, 2.2, id === 'brown' || id === 'ocean');
          src.loop = true;
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          let lfo = null;
          if (id === 'rain') {
            filter.type = 'highpass';
            filter.frequency.value = 520;
            const low = ctx.createBiquadFilter();
            low.type = 'lowpass';
            low.frequency.value = 7200;
            gain.gain.value = 0.22;
            src.connect(filter);
            filter.connect(low);
            low.connect(gain);
          } else if (id === 'ocean') {
            filter.type = 'lowpass';
            filter.frequency.value = 620;
            gain.gain.value = 0.18;
            lfo = ctx.createOscillator();
            lfo.frequency.value = 0.09;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.1;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            src.connect(filter);
            filter.connect(gain);
          } else {
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            gain.gain.value = 0.24;
            src.connect(filter);
            filter.connect(gain);
          }
          gain.connect(master);
          src.start();
          if (lfo) {
            lfo.start();
            sourcesRef.current = [src, lfo];
          } else {
            sourcesRef.current = [src];
          }
        }

        setActive(id);
        setPlaying(true);
        startVisualizer();
        recordActivity('chill', { counter: 'chill', xp: 5 });
      } catch {
        setError('Audio start nahi hua. Browser ne audio permission block ki ho sakti hai — page par click karke dobara try karein.');
        stopAmbient();
      }
    },
    [ensureContext, startVisualizer, stopAmbient, stopNodes]
  );

  useEffect(() => {
    if (!playing || !timerMinutes) return undefined;
    const id = window.setTimeout(() => {
      stopAmbient();
      setNotice(`${timerMinutes} minute ka sleep timer mukammal — sound band ho gaya.`);
    }, timerMinutes * 60 * 1000);
    return () => window.clearTimeout(id);
  }, [playing, timerMinutes, stopAmbient]);

  useEffect(
    () => () => {
      stopNodes();
      cancelAnimationFrame(rafRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
      ctxRef.current = null;
      masterRef.current = null;
      analyserRef.current = null;
    },
    [stopNodes]
  );

  function toggle(id) {
    if (playing && active === id) stopAmbient();
    else startAmbient(id);
  }

  function onAudioFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setAudioError('');
    if (!file.type.startsWith('audio/')) {
      setAudioError('Sirf audio files (MP3, WAV, OGG, M4A) select karein.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setAudioError('Audio file 25 MB se choti honi chahiye.');
      return;
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(file);
    audioUrlRef.current = url;
    setAudioFile({ url, name: file.name || 'audio file' });
  }

  function clearAudio() {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioFile(null);
    setAudioError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const activeSound = SOUNDS.find((s) => s.id === active);

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />
        <PageHeader
          eyebrow="Chill Zone"
          title="Music & Chill"
          sub="Browser mein generate hone wale ambient sounds — koi copyrighted audio download ya stream nahi hoti. Apni audio file bhi device se play kar sakte hain."
          right={<LocalBadge>No uploads</LocalBadge>}
        />

        <div className="ent-chill-layout">
          <section className="ent-panel ent-chill-sounds" aria-label="Ambient sounds">
            <h2 className="ent-card-title">Ambient sounds</h2>
            <p className="ent-page-sub">Ek sound chunein. Headphones par volume dheere rakhein.</p>
            <div className="ent-sound-grid">
              {SOUNDS.map((s) => {
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`ent-sound-card${isActive ? ' is-active' : ''}`}
                    onClick={() => toggle(s.id)}
                    aria-pressed={isActive}
                  >
                    <span className="ent-sound-emoji" aria-hidden="true">{s.emoji}</span>
                    <span className="ent-sound-name">{s.name}</span>
                    <span className="ent-sound-desc">{s.desc}</span>
                    <span className="ent-sound-action">{isActive && playing ? 'Stop' : 'Play'}</span>
                  </button>
                );
              })}
            </div>
            <p className="ent-hint">
              Sounds Web Audio API se real-time generate hote hain. Koi file server se load nahi hoti.
            </p>
          </section>

          <section className="ent-panel ent-chill-player" aria-label="Ambient player">
            <div className="ent-player-head">
              <div>
                <div className="eyebrow">Now playing</div>
                <h2 className="ent-card-title">{playing && activeSound ? `${activeSound.emoji} ${activeSound.name}` : 'Nothing playing'}</h2>
              </div>
              <div className="ent-player-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={playing ? stopAmbient : () => startAmbient(active || 'rain')}>
                  {playing ? 'Stop' : 'Play rain'}
                </button>
              </div>
            </div>

            <canvas ref={canvasRef} width={600} height={170} className="ent-visualizer" aria-label="Audio visualizer" role="img" />
            {!playing && (
              <div className="ent-visualizer-hint">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => startAmbient('rain')}>
                  Rain sound start karein
                </button>
              </div>
            )}

            <div className="ent-player-controls">
              <label className="ent-control-group">
                <span className="ent-control-label">Volume <span className="ent-muted">{Math.round(volume * 100)}%</span></span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
              </label>
              <label className="ent-control-group">
                <span className="ent-control-label">Sleep timer</span>
                <select value={timerMinutes} onChange={(e) => setTimerMinutes(Number(e.target.value))}>
                  {TIMERS.map((m) => (
                    <option key={m} value={m}>{m === 0 ? 'Off' : `${m} minutes`}</option>
                  ))}
                </select>
              </label>
            </div>
            {notice && <p className="ent-success-note">{notice}</p>}
            {error && <p className="ent-alert" role="alert">{error}</p>}
            <p className="ent-hint">Sessions: {stats.counters.chill || 0} local · Ambient sound playback browser par depend karta hai.</p>
          </section>
        </div>

        <section className="ent-panel ent-mt">
          <div className="ent-section-head">
            <div>
              <h2 className="ent-card-title">Apni audio file</h2>
              <p className="ent-page-sub">
                File sirf aapke browser mein load hoti hai — server par upload nahi hoti. Format support browser par depend karta hai.
              </p>
            </div>
            <LocalBadge>Device-only</LocalBadge>
          </div>
          <div className="ent-upload-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
              Audio select karein
            </button>
            {audioFile && (
              <button type="button" className="btn btn-danger btn-sm" onClick={clearAudio}>Remove</button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={onAudioFile}
              aria-label="Apni audio file select karein"
            />
          </div>
          {audioError && <p className="ent-alert" role="alert">{audioError}</p>}
          {audioFile ? (
            <div className="ent-user-audio">
              <span className="ent-muted">{audioFile.name}</span>
              <audio controls src={audioFile.url} preload="metadata" />
            </div>
          ) : (
            <p className="ent-hint">Koi audio file select nahi ki gayi. MP3 / WAV / OGG / M4A · max 25 MB.</p>
          )}
        </section>

        <p className="ent-footnote">
          Hum copyrighted music redistribute nahi karte. Yahan sab ambient audio browser ke andar generate hota hai aur aapki
          apni files device se play hoti hain.
        </p>
      </div>
    </div>
  );
}
