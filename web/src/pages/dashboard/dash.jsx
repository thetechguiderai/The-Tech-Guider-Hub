import React, { useEffect, useRef, useState } from 'react';
import { ownerApi } from '../../api';
import { Icon } from '../../components/ui';

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 style={{ fontSize: 18 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon.close size={20} />
          </button>
        </div>
        {children}
        {footer && <div className="form-actions">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ message, onConfirm, onClose, confirmText = 'Delete' }) {
  return (
    <Modal title="Are you sure?" onClose={onClose}>
      <p className="text-sm muted">{message}</p>
      <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger btn-sm" onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {hint && <span className="muted3" style={{ fontWeight: 400 }}> — {hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function UrlField({ id, label, value, onChange, placeholder, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input
        id={id}
        className="input"
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'https://…'}
      />
    </Field>
  );
}

export function ImageUpload({ value, onChange, folder = 'thumbnails', label = 'Thumbnail image' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setErr('Please choose an image file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr('Image must be under 4 MB.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      const res = await ownerApi.upload(dataUrl, folder);
      onChange(res.url);
    } catch (e) {
      setErr(e.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="flex align-center gap-2 flex-wrap">
        {value ? (
          <img
            className="thumb-preview"
            src={value}
            alt="Preview"
            onClick={() => inputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <button
            type="button"
            className="thumb-preview"
            style={{ cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}
            onClick={() => inputRef.current?.click()}
            aria-label="Upload image"
          >
            <Icon.plus size={22} />
          </button>
        )}
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : value ? 'Change image' : 'Upload image'}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => onChange('')}>
              Remove
            </button>
          )}
          <p className="text-xs muted3" style={{ marginTop: 6 }}>
            PNG, JPG, WebP, GIF, SVG or AVIF · max 4 MB
          </p>
          {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function intOr(n, fallback = 0) {
  const v = parseInt(n, 10);
  return Number.isFinite(v) ? v : fallback;
}