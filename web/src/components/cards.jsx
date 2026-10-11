import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon, Badge } from './ui';
import { publicApi } from '../api';

export function formatThumbFallback(title) {
  return title.slice(0, 2).toUpperCase();
}

export function VideoCard({ video }) {
  const coming = video.status === 'coming_soon';
  const reduce = useReducedMotion();
  return (
    <motion.article
      className="video-card"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Link to={`/videos/${video.id}`} aria-label={video.title} tabIndex={-1}>
        <div className="video-thumb-wrap">
          {video.thumbnail ? (
            <img className="video-thumb" src={video.thumbnail} alt="" loading="lazy" />
          ) : (
            <div className="video-thumb fallback" aria-hidden="true">
              <span>{formatThumbFallback(video.title)}</span>
            </div>
          )}
          <div className="video-thumb-overlay">
            {coming ? <Badge tone="amber">Coming soon</Badge> : <Badge tone="blue">Video</Badge>}
          </div>
        </div>
      </Link>
      <div className="video-body">
        <Link to={`/videos/${video.id}`} style={{ color: 'inherit' }}>
          <h3 className="video-title">{video.title}</h3>
        </Link>
        <div className="video-meta">
          <span>{video.category || 'General'}</span>
          {coming && video.releaseDate && (
            <>
              <span>·</span>
              <span>{video.releaseDate}</span>
            </>
          )}
          {video.resources?.length > 0 && (
            <>
              <span>·</span>
              <span>{video.resources.length} resource{video.resources.length === 1 ? '' : 's'}</span>
            </>
          )}
        </div>
        {video.description && <p className="text-sm muted clamp-2 mt-1">{video.description}</p>}
      </div>
    </motion.article>
  );
}

export function ResourceCard({ resource, highlight }) {
  const letter = (resource.name || '?').slice(0, 2).toUpperCase();
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`resource-card${highlight ? ' card-hover' : ''}`}
      id={highlight ? `resource-${resource.id}` : undefined}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -3, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="flex align-center gap-2">
        {resource.logo ? (
          <img className="resource-logo" src={resource.logo} alt={`${resource.name} logo`} loading="lazy" />
        ) : (
          <span className="resource-logo fallback" aria-hidden="true">{letter}</span>
        )}
        <div className="minwidth-0">
          <h3 className="resource-name">{resource.name}</h3>
          <div className="flex align-center gap-2 text-xs muted3">
            <span>{resource.category || 'General'}</span>
            {resource.featured ? (
              <>
                <span>·</span>
                <Badge tone="blue">Featured</Badge>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {resource.description && <p className="text-sm muted">{resource.description}</p>}
      <div className="flex align-center justify-between mt-2">
        {resource.url ? (
          <a
            className="visit-link"
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => publicApi.resourceClick(resource.id)}
          >
            Visit website <Icon.arrow size={15} />
          </a>
        ) : (
          <span className="text-sm muted3">No external link</span>
        )}
        {resource.clicks ? (
          <span className="text-xs muted3">{resource.clicks} click{resource.clicks === 1 ? '' : 's'}</span>
        ) : null}
      </div>
    </motion.div>
  );
}