import React from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context';
import { useMeta } from '../App';
import { SectionHead, Icon } from '../components/ui';

export default function AIPage() {
  useMeta('The Tech Guider AI — The Tech Guider Hub', 'Your AI assistant by The Tech Guider. Ask questions and get help exploring the hub.');
  const { site } = useSite();
  const aiUrl = site?.aiUrl;

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 60, maxWidth: 820 }}>
      <div style={{ textAlign: 'center' }}>
        <span className="resource-logo fallback" style={{ margin: '0 auto', width: 64, height: 64, fontSize: 30, borderRadius: 18 }}>
          <Icon.ai size={32} />
        </span>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', letterSpacing: '-0.04em', marginTop: 22 }}>
          The Tech Guider AI
        </h1>
        <p className="section-sub" style={{ margin: '14px auto 0' }}>
          Your AI assistant by The Tech Guider. Ask questions, get recommendations and quickly find
          answers across the channel's content.
        </p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          {aiUrl ? (
            <a className="btn btn-accent btn-lg" href={aiUrl} target="_blank" rel="noopener noreferrer">
              <Icon.ai size={18} /> Open The Tech Guider AI
            </a>
          ) : (
            <span className="btn btn-ghost btn-lg" style={{ cursor: 'default' }}>
              <Icon.ai size={18} /> The Tech Guider AI is not available yet
            </span>
          )}
        </div>
      </div>

      {aiUrl ? (
        <p className="text-xs muted3" style={{ textAlign: 'center', marginTop: 14 }}>
          Opening in a new tab.
        </p>
      ) : (
        <div className="state mt-4">
          <div className="state-icon">
            <Icon.ai size={22} />
          </div>
          <div className="state-title">AI assistant unavailable</div>
          <p className="state-desc">
            The Tech Guider AI is coming soon. The owner has not connected it yet — no placeholder is shown.
          </p>
          <Link to="/" className="btn btn-ghost btn-sm">Back to home</Link>
        </div>
      )}

      <div className="grid-2 mt-4">
        <div className="card">
          <h3 style={{ fontSize: 17, marginBottom: 8 }}>
            <span className="resource-logo fallback" style={{ width: 32, height: 32, fontSize: 15, display: 'inline-grid', marginRight: 8, verticalAlign: 'middle' }}>
              <Icon.tool size={16} />
            </span>
            What it can help with
          </h3>
          <ul className="text-sm muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
            <li>Finding the right tool or resource</li>
            <li>Questions about the Free Fire sensitivity generator</li>
            <li>Minecraft hosting and setup guidance</li>
            <li>Navigating the hub and latest videos</li>
          </ul>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 17, marginBottom: 8 }}>
            <span className="resource-logo fallback" style={{ width: 32, height: 32, fontSize: 15, display: 'inline-grid', marginRight: 8, verticalAlign: 'middle' }}>
              <Icon.shield size={16} />
            </span>
            How it works
          </h3>
          <ul className="text-sm muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
            <li>An AI assistant trained around The Tech Guider's content</li>
            <li>Links back to the resources used in videos</li>
            <li>Never asks for passwords or account details</li>
            <li>Follows the same community rules as the channel</li>
          </ul>
        </div>
      </div>
    </div>
  );
}