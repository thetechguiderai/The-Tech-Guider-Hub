import React, { useEffect, useRef, useState } from 'react';
import { useMeta } from '../../App';
import { EntNav, LocalBadge, PageHeader } from '../../entertainment/shared';
import { recordActivity, useEntStats } from '../../entertainment/storage';

const RATIOS = [
  { id: 'square', label: '1:1', w: 900, h: 900 },
  { id: 'portrait', label: '4:5', w: 900, h: 1125 },
  { id: 'wide', label: '16:9', w: 900, h: 506 },
];

const TEMPLATES = [
  { id: 'studio', label: 'Studio' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'grid', label: 'Grid' },
  { id: 'split', label: 'Split' },
  { id: 'dots', label: 'Dots' },
];

const COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#111111', label: 'Black' },
  { value: '#f87171', label: 'Red' },
  { value: '#fbbf24', label: 'Amber' },
];

const CAPTION_IDEAS = [
  ['JAB CODE PEHLI DAFAA CHAL JAYE', 'AUR AAP DEVELOPER BAN JATE HAIN'],
  ['MUJHE LAGTA THA YE EASY HOGA', 'MAIN GALAT THA'],
  ['WIFI KAAM KAR RAHA HAI', 'LEKIN SIRF DOOSRE KAMRE MEIN'],
  ['MAINE SIRF EK CHHOTA CHANGE KIYA', 'AB POORI SITE DOWN HAI'],
  ['DEBUGGING: 3 GHANTE', 'GHALATI: SEMICOLON'],
  ['AAJ JALDI SONA HAI', 'GAME: EK AUR ROUND'],
  ['BATTERY 1%', 'MUJHE BUS EK MESSAGE BHEJNA HAI'],
  ['MAINE APNA KAAM KHATAM KAR LIYA', 'BOSS: EK NAYA IDEA HAI'],
];

function drawTemplate(ctx, w, h, id) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  if (id === 'studio') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#222222');
    g.addColorStop(0.55, '#121212');
    g.addColorStop(1, '#050505');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.22, h * 0.18, 10, w * 0.22, h * 0.18, w * 0.8);
    glow.addColorStop(0, 'rgba(255,255,255,0.22)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (id === 'spotlight') {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7);
    glow.addColorStop(0, 'rgba(255,255,255,0.26)');
    glow.addColorStop(0.5, 'rgba(255,255,255,0.07)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, w - 68, h - 68);
  } else if (id === 'grid') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#161616');
    g.addColorStop(1, '#070707');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    const step = 36;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(w * 0.08, h * 0.08, w * 0.18, 8);
    ctx.fillRect(w * 0.74, h * 0.92 - 8, w * 0.18, 8);
  } else if (id === 'split') {
    ctx.fillStyle = '#d4d4d8';
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, h / 2, w, h / 2);
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + 26);
    ctx.lineTo(w, h / 2 - 26);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let x = 0; x < w; x += 26) ctx.fillRect(x, 0, 1, h / 2);
  } else {
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, w, h);
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 180; i += 1) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 1 + rand() * 3.4;
      ctx.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.22})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.7, h * 0.3, w * 0.7);
    glow.addColorStop(0, 'rgba(255,255,255,0.14)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

function drawCaption(ctx, text, opts) {
  const value = String(text || '').trim();
  if (!value) return;
  const { w, h, fontSize, color, yPercent, anchor, uppercase } = opts;
  const size = Math.max(18, Math.round(fontSize * (w / 900)));
  const content = uppercase ? value.toUpperCase() : value;
  ctx.font = `900 ${size}px Impact, "Arial Black", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxWidth = w - 72;
  const lines = wrapText(ctx, content, maxWidth).slice(0, 5);
  const lineHeight = size * 1.06;
  const startY = anchor === 'bottom' ? (h * yPercent) / 100 - lines.length * lineHeight : (h * yPercent) / 100;
  const stroke = color === '#111111' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.88)';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(4, size * 0.12);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.strokeText(line, w / 2, y, maxWidth);
    ctx.fillText(line, w / 2, y, maxWidth);
  });
}

export default function MemeGenerator() {
  useMeta(
    'Meme Lab — The Tech Guider Hub',
    'Create original memes in your browser: pick a template or upload an image, add top and bottom text, then download the PNG. Files stay on your device.'
  );

  const stats = useEntStats();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const objectUrlRef = useRef(null);
  const fileRef = useRef(null);
  const [template, setTemplate] = useState('studio');
  const [ratioId, setRatioId] = useState('square');
  const [topText, setTopText] = useState(CAPTION_IDEAS[0][0]);
  const [bottomText, setBottomText] = useState(CAPTION_IDEAS[0][1]);
  const [fontSize, setFontSize] = useState(64);
  const [topY, setTopY] = useState(7);
  const [bottomY, setBottomY] = useState(97);
  const [color, setColor] = useState('#ffffff');
  const [uppercase, setUppercase] = useState(true);
  const [hasImage, setHasImage] = useState(false);
  const [imageName, setImageName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shareSupported, setShareSupported] = useState(false);
  const [captionIndex, setCaptionIndex] = useState(0);

  const ratio = RATIOS.find((r) => r.id === ratioId) || RATIOS[0];

  useEffect(() => {
    setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function');
  }, []);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = ratio;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    let cancelled = false;
    const render = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, w, h);
      const img = imageRef.current;
      if (img) {
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        const shade = ctx.createLinearGradient(0, 0, 0, h);
        shade.addColorStop(0, 'rgba(0,0,0,0.45)');
        shade.addColorStop(0.35, 'rgba(0,0,0,0)');
        shade.addColorStop(0.65, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
      } else {
        drawTemplate(ctx, w, h, template);
      }
      drawCaption(ctx, topText, {
        w,
        h,
        fontSize,
        color,
        yPercent: topY,
        anchor: 'top',
        uppercase,
      });
      drawCaption(ctx, bottomText, {
        w,
        h,
        fontSize,
        color,
        yPercent: bottomY,
        anchor: 'bottom',
        uppercase,
      });
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [template, ratioId, topText, bottomText, fontSize, topY, bottomY, color, uppercase, hasImage]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    if (!file.type.startsWith('image/')) {
      setError('Sirf image files (PNG, JPG, WebP) upload karein.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image 8 MB se choti honi chahiye.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      imageRef.current = img;
      setImageName(file.name || 'uploaded image');
      setHasImage(true);
      setNotice('Image device par hi load hui — server par upload nahi hui.');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Image load nahi hui. Doosri file try karein.');
    };
    img.src = url;
  }

  function removeImage() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    imageRef.current = null;
    setHasImage(false);
    setImageName('');
    setNotice('');
  }

  function pickCaption() {
    const next = (captionIndex + 1) % CAPTION_IDEAS.length;
    setCaptionIndex(next);
    setTopText(CAPTION_IDEAS[next][0]);
    setBottomText(CAPTION_IDEAS[next][1]);
  }

  function makeBlob() {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  async function download() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const blob = await makeBlob();
      if (!blob) {
        setError('Meme render nahi hua. Dobara koshish karein.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ttg-meme-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      recordActivity('meme', { counter: 'memes', xp: 10 });
      setNotice('Meme download ho gaya. Upload aur editing sab aapke device par hi rahi.');
    } catch {
      setError('Download fail hua. Browser ki permission check karein.');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setError('');
    setNotice('');
    if (!shareSupported) return;
    setBusy(true);
    try {
      const blob = await makeBlob();
      if (!blob) {
        setError('Meme render nahi hua.');
        return;
      }
      const file = new File([blob], 'ttg-meme.png', { type: 'image/png' });
      if (!navigator.canShare({ files: [file] })) {
        setError('Ye browser image share support nahi karta. Download karke share karein.');
        return;
      }
      await navigator.share({ files: [file], title: 'The Tech Guider Hub meme' });
      recordActivity('meme', { counter: 'memes', xp: 10 });
    } catch (err) {
      if (err && err.name !== 'AbortError') setError('Share cancel ya fail hua. Download option use karein.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />
        <PageHeader
          eyebrow="Meme Lab"
          title="Meme Generator"
          sub="Original templates ya apni image, top/bottom text, font size aur position — sab browser mein. Koi file server par upload nahi hoti."
          right={<LocalBadge>Device-only</LocalBadge>}
        />

        <div className="ent-meme-layout">
          <section className="ent-panel ent-meme-controls" aria-label="Meme controls">
            <div className="ent-control-group">
              <span className="ent-control-label">Template</span>
              <div className="ent-chip-row">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`ent-chip${template === t.id && !hasImage ? ' active' : ''}`}
                    onClick={() => {
                      if (hasImage) removeImage();
                      setTemplate(t.id);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ent-control-group">
              <span className="ent-control-label">Apni image</span>
              <div className="ent-upload-row">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
                  Image upload karein
                </button>
                {hasImage && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={removeImage}>
                    Remove
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={onFile}
                  aria-label="Meme image upload"
                />
              </div>
              <span className="ent-hint">
                {hasImage ? `Loaded: ${imageName}` : 'PNG / JPG / WebP · max 8 MB. GIF ki pehli frame use hoti hai.'}
              </span>
            </div>

            <label className="ent-control-group">
              <span className="ent-control-label">Top text</span>
              <textarea
                className="ent-textarea"
                rows={2}
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                maxLength={120}
                placeholder="Top caption likhein…"
              />
            </label>

            <label className="ent-control-group">
              <span className="ent-control-label">Bottom text</span>
              <textarea
                className="ent-textarea"
                rows={2}
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                maxLength={120}
                placeholder="Bottom caption likhein…"
              />
            </label>

            <label className="ent-control-group">
              <span className="ent-control-label">Font size <span className="ent-muted">{fontSize}px</span></span>
              <input
                type="range"
                min={36}
                max={110}
                step={2}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                aria-label="Font size"
              />
            </label>

            <div className="ent-control-split">
              <label className="ent-control-group">
                <span className="ent-control-label">Top position <span className="ent-muted">{topY}%</span></span>
                <input
                  type="range"
                  min={2}
                  max={42}
                  value={topY}
                  onChange={(e) => setTopY(Number(e.target.value))}
                  aria-label="Top text position"
                />
              </label>
              <label className="ent-control-group">
                <span className="ent-control-label">Bottom position <span className="ent-muted">{bottomY}%</span></span>
                <input
                  type="range"
                  min={58}
                  max={99}
                  value={bottomY}
                  onChange={(e) => setBottomY(Number(e.target.value))}
                  aria-label="Bottom text position"
                />
              </label>
            </div>

            <div className="ent-control-group">
              <span className="ent-control-label">Text colour</span>
              <div className="ent-color-row">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`ent-color${color === c.value ? ' active' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => setColor(c.value)}
                    aria-label={`${c.label} text`}
                    aria-pressed={color === c.value}
                  />
                ))}
                <label className="ent-checkbox">
                  <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
                  UPPERCASE
                </label>
              </div>
            </div>

            <div className="ent-control-group">
              <span className="ent-control-label">Caption ideas</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={pickCaption}>
                Naya caption pair
              </button>
            </div>

            {error && <div className="ent-alert" role="alert">{error}</div>}
            {notice && <div className="ent-success-note" role="status">{notice}</div>}

            <div className="ent-action-row">
              <button type="button" className="btn btn-primary" onClick={download} disabled={busy}>
                {busy ? 'Rendering…' : 'Download PNG'}
              </button>
              {shareSupported && (
                <button type="button" className="btn btn-ghost" onClick={share} disabled={busy}>
                  Share
                </button>
              )}
            </div>
            {!shareSupported && (
              <p className="ent-hint">Direct image share is browser mein available nahi — PNG download karke share karein.</p>
            )}
          </section>

          <section className="ent-panel ent-meme-preview" aria-label="Meme preview">
            <div className="ent-preview-head">
              <span className="ent-control-label">Preview</span>
              <div className="ent-chip-row">
                {RATIOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`ent-chip${ratioId === r.id ? ' active' : ''}`}
                    onClick={() => setRatioId(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ent-canvas-preview">
              <canvas ref={canvasRef} className="ent-meme-canvas" role="img" aria-label="Generated meme preview" />
            </div>
            <div className="ent-preview-foot">
              <span className="ent-muted">{ratio.w} × {ratio.h} px PNG</span>
              <span className="ent-muted">{stats.counters.memes || 0} local memes downloaded</span>
            </div>
          </section>
        </div>

        <section className="ent-crosslink ent-mt">
          <div>
            <h2 className="ent-card-title">Safe by design</h2>
            <p className="ent-page-sub">
              Saare templates original hain. Apni image sirf browser memory mein rehti hai aur server par upload nahi hoti.
              Community meme uploads abhi maujood nahi hain, is liye koi moderation ya public feed ka dawa nahi kiya jata.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
