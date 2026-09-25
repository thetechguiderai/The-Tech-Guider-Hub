import React, { useState } from 'react';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { SectionHead, Badge, Icon } from '../components/ui';

const ANDROID_BRANDS = [
  'Samsung', 'Xiaomi', 'Redmi', 'POCO', 'Realme', 'Oppo', 'Vivo', 'OnePlus',
  'Infinix', 'Tecno', 'Motorola', 'Google Pixel', 'Huawei', 'Other',
];

const IOS_MODELS = ['iPhone', 'iPad'];
const PC_TIERS = ['Low End', 'Mid Range', 'High End'];

const DEVICE_TYPES = [
  { key: 'android', label: 'Android' },
  { key: 'ios', label: 'iPhone / iPad' },
  { key: 'pc', label: 'PC / Laptop' },
];

const PLAY_STYLES = [
  { key: 'one_tap', label: 'One Tap', desc: 'Fast-flick one tap battles' },
  { key: 'rush', label: 'Rush', desc: 'Close range, aggressive' },
  { key: 'balanced', label: 'Balanced', desc: 'All-around play' },
  { key: 'sniper', label: 'Sniper', desc: 'Long range precision' },
  { key: 'custom', label: 'Custom', desc: 'Start from a base, tune it' },
];

const RAMS = ['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB'];
const RESOLUTIONS = ['720p (HD)', '1080p (FHD)', '1440p (QHD)'];
const REFRESH = ['60 Hz', '90 Hz', '120 Hz', '144 Hz'];

const SENS_FIELDS = [
  { key: 'general', label: 'General' },
  { key: 'redDot', label: 'Red Dot' },
  { key: 'scope2', label: '2x Scope' },
  { key: 'scope4', label: '4x Scope' },
  { key: 'sniperScope', label: 'Sniper Scope' },
  { key: 'freeLook', label: 'Free Look' },
];

export default function Sensitivity() {
  useMeta(
    'Free Fire Sensitivity Generator — The Tech Guider Hub',
    'Generate Free Fire sensitivity settings tuned for your device, RAM and play style. Free tool from The Tech Guider.'
  );

  const [deviceType, setDeviceType] = useState('android');
  const [brand, setBrand] = useState('Samsung');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [ram, setRam] = useState('4 GB');
  const [dpi, setDpi] = useState('');
  const [resolution, setResolution] = useState('1080p (FHD)');
  const [refresh, setRefresh] = useState('90 Hz');
  const [pcTier, setPcTier] = useState('Mid Range');
  const [playStyle, setPlayStyle] = useState('balanced');

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tuned, setTuned] = useState(null);

  const effectiveBrand = brand === 'Other' ? customBrand.trim() || 'Other' : brand;

  function buildPayload() {
    return {
      deviceType,
      brand: deviceType === 'android' ? effectiveBrand : '',
      deviceModel: model || '',
      ram,
      dpi: deviceType === 'android' ? dpi : '',
      resolution,
      refreshRate: refresh,
      pcTier: deviceType === 'pc' ? pcTier : '',
      playStyle,
    };
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const data = await publicApi.generateSensitivity(buildPayload());
      setResult(data);
      setTuned({ ...data.values });
    } catch (e) {
      setError(e.message || 'Unable to generate sensitivity settings.');
    } finally {
      setBusy(false);
    }
  }

  function resetTuning() {
    if (result) setTuned({ ...result.values });
  }

  function copySettings() {
    const v = tuned || (result && result.values);
    if (!v) return;
    const lines = [
      'THE TECH GUIDER HUB — FREE FIRE SENSITIVITY SETTINGS',
      '----------------------------------------------',
      `Device: ${deviceLabel()}`,
      `Play style: ${playStyle.replace('_', ' ')}`,
      '',
      `General: ${v.general}`,
      `Red Dot: ${v.redDot}`,
      `2x Scope: ${v.scope2}`,
      `4x Scope: ${v.scope4}`,
      `Sniper Scope: ${v.sniperScope}`,
      `Free Look: ${v.freeLook}`,
      `Fire Button Size: ${v.fireButtonSize}`,
      v.dpi ? `DPI: ${v.dpi}` : `DPI: ${v.dpiRange}`,
      '',
      'Not an official guarantee — fine-tune in the training ground.',
    ].join('\n');
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lines).then(done).catch(() => fallbackCopy(lines, done));
    } else {
      fallbackCopy(lines, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  }

  function deviceLabel() {
    if (deviceType === 'android') return `Android — ${effectiveBrand}${model ? ' ' + model : ''} · ${ram} · ${dpi ? dpi + ' DPI' : resolution}`;
    if (deviceType === 'ios') return `iOS — ${model || 'iPhone'} (system DPI applies)`;
    return `PC — ${pcTier} · ${ram} · ${resolution}`;
  }

  function setTune(key, val) {
    setTuned((t) => ({ ...t, [key]: val }));
  }

  const v = tuned || (result && result.values);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 900 }}>
      <SectionHead
        eyebrow="Free Fire"
        title="FF Sensitivity Generator"
        sub="Pick your device and play style, then generate a sensitivity setup to try in the training ground."
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label className="field-label">Device type</label>
          <div className="chip-select" role="group" aria-label="Device type">
            {DEVICE_TYPES.map((d) => (
              <button
                key={d.key}
                className={`chip${deviceType === d.key ? ' on' : ''}`}
                onClick={() => {
                  setDeviceType(d.key);
                  setResult(null);
                  setTuned(null);
                  if (d.key === 'ios') setModel('iPhone');
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {deviceType === 'android' && (
          <>
            <div className="field">
              <label className="field-label">Brand</label>
              <div className="chip-select" role="group" aria-label="Android brand">
                {ANDROID_BRANDS.map((b) => (
                  <button key={b} className={`chip${brand === b ? ' on' : ''}`} onClick={() => setBrand(b)}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            {brand === 'Other' && (
              <div className="field">
                <label className="field-label" htmlFor="customBrand">Your device brand</label>
                <input
                  id="customBrand"
                  className="input"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="e.g. Asus"
                />
              </div>
            )}
            <div className="form-grid">
              <div className="field">
                <label className="field-label" htmlFor="model">Device model <span className="muted3">(optional)</span></label>
                <input id="model" className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Galaxy A54" />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="dpi">Current DPI <span className="muted3">(if you know it)</span></label>
                <input id="dpi" className="input" type="number" inputMode="numeric" min="200" max="700" value={dpi} onChange={(e) => setDpi(e.target.value)} placeholder="e.g. 440" />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">RAM</label>
                <div className="chip-select">
                  {RAMS.map((r) => (
                    <button key={r} className={`chip${ram === r ? ' on' : ''}`} onClick={() => setRam(r)}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-label">Screen</label>
                <div className="chip-select">
                  {RESOLUTIONS.map((r) => (
                    <button key={r} className={`chip${resolution === r ? ' on' : ''}`} onClick={() => setResolution(r)}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Refresh rate</label>
              <div className="chip-select">
                {REFRESH.map((r) => (
                  <button key={r} className={`chip${refresh === r ? ' on' : ''}`} onClick={() => setRefresh(r)}>{r}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {deviceType === 'ios' && (
          <div className="field">
            <label className="field-label">Model</label>
            <div className="chip-select" role="group" aria-label="iOS model">
              {IOS_MODELS.map((m) => (
                <button key={m} className={`chip${model === m ? ' on' : ''}`} onClick={() => setModel(m)}>{m}</button>
              ))}
            </div>
            <p className="text-xs muted3">iOS DPI is set by Apple and cannot be changed in-game.</p>
          </div>
        )}

        {deviceType === 'pc' && (
          <>
            <div className="field">
              <label className="field-label">Performance class</label>
              <div className="chip-select" role="group" aria-label="PC tier">
                {PC_TIERS.map((t) => (
                  <button key={t} className={`chip${pcTier === t ? ' on' : ''}`} onClick={() => setPcTier(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">RAM</label>
                <div className="chip-select">
                  {RAMS.map((r) => (
                    <button key={r} className={`chip${ram === r ? ' on' : ''}`} onClick={() => setRam(r)}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-label">Monitor</label>
                <div className="chip-select">
                  {RESOLUTIONS.map((r) => (
                    <button key={r} className={`chip${resolution === r ? ' on' : ''}`} onClick={() => setResolution(r)}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Refresh rate</label>
              <div className="chip-select">
                {REFRESH.map((r) => (
                  <button key={r} className={`chip${refresh === r ? ' on' : ''}`} onClick={() => setRefresh(r)}>{r}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label className="field-label">Play style</label>
          <div className="chip-select" role="group" aria-label="Play style">
            {PLAY_STYLES.map((p) => (
              <button
                key={p.key}
                className={`chip${playStyle === p.key ? ' on' : ''}`}
                onClick={() => setPlayStyle(p.key)}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-accent" onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate Sensitivity'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-2" role="alert">
          <Icon.alert size={16} />
          <span>{error}</span>
        </div>
      )}

      {!result && !busy && (
        <div className="state">
          <div className="state-icon">
            <Icon.tool size={22} />
          </div>
          <div className="state-title">Your settings will appear here</div>
          <p className="state-desc">
            Choose your device and play style, then press Generate Sensitivity.
          </p>
        </div>
      )}

      {result && v && (
        <div className="sens-result mt-2">
          <div className="flex align-center justify-between flex-wrap gap-2">
            <div>
              <div className="eyebrow mb-2">Your settings</div>
              <div className="flex align-center gap-2 flex-wrap">
                {result.source === 'owner_profile' ? (
                  <Badge tone="green">Prescribed by The Tech Guider</Badge>
                ) : (
                  <Badge tone="blue">Calculated for your device</Badge>
                )}
                <span className="text-xs muted">{deviceLabel()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={copySettings}>
                <Icon.copy size={14} /> {copied ? 'Copied!' : 'Copy Settings'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={generate} disabled={busy}>
                <Icon.refresh size={14} /> Regenerate
              </button>
            </div>
          </div>

          <div className="sens-grid mt-2">
            {SENS_FIELDS.map((f) => (
              <div className="sens-cell" key={f.key}>
                <span className="key">{f.label}</span>
                <input
                  className="val"
                  type="range"
                  min="1"
                  max="100"
                  value={v[f.key]}
                  onChange={(e) => setTune(f.key, Number(e.target.value))}
                  aria-label={`${f.label} sensitivity`}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <span className="val">{v[f.key]}<small> / 100</small></span>
              </div>
            ))}
            <div className="sens-cell">
              <span className="key">DPI recommendation</span>
              <span className="val">{v.dpi ? v.dpi : '—'}<small>{v.dpi ? ' DPI' : ''}</small></span>
              <span className="text-xs muted3">{v.dpiRange}</span>
            </div>
            <div className="sens-cell">
              <span className="key">Fire button size</span>
              <input
                className="val"
                type="range"
                min="40"
                max="100"
                value={v.fireButtonSize}
                onChange={(e) => setTune('fireButtonSize', Number(e.target.value))}
                aria-label="Fire button size"
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <span className="val">{v.fireButtonSize}<small> / 100</small></span>
            </div>
          </div>

          <div className="alert mt-2" style={{ marginTop: 16 }}>
            <Icon.alert size={16} />
            <span>
              {result.notes}
              <br />
              <span className="text-xs muted3">{result.disclaimer}</span>
            </span>
          </div>

          <div className="flex gap-2 mt-2" style={{ marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={resetTuning}>Reset tuned values</button>
          </div>
        </div>
      )}
    </div>
  );
}