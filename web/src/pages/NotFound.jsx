import React from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../App';
import { Icon } from '../components/ui';

export default function NotFound() {
  useMeta('Page not found — The Tech Guider Hub');
  return (
    <div className="container" style={{ padding: 80 }}>
      <div className="state">
        <div className="state-icon">
          <Icon.alert size={22} />
        </div>
        <div className="state-title">404 — Page not found</div>
        <p className="state-desc">That page doesn't exist or has moved.</p>
        <Link to="/" className="btn btn-primary btn-sm">Back to home</Link>
      </div>
    </div>
  );
}