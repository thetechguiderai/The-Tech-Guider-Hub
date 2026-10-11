'use strict';

/**
 * Optional starter content so the hub is not empty when it first goes live.
 * Run with: npm run seed
 *
 * Only real, verifiable resources are seeded. No statistics are ever faked —
 * YouTube stats render an "unavailable" state until a real API key + channel
 * are configured by the owner.
 */

require('./db');

function insertSQL(table, cols, values) {
  const placeholders = values.map(() => '?').join(', ');
  const { db } = require('./db');
  const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
  return stmt.run(...values);
}

(async () => {
  const { db } = require('./db');

  const videoCount = db.prepare('SELECT COUNT(*) AS c FROM videos').get().c;
  if (videoCount === 0) {
    const info = insertSQL(
      'videos',
      ['title', 'thumbnail', 'youtube_url', 'description', 'category', 'status', 'release_date', 'sort_order', 'featured'],
      [
        'Best Free Minecraft Hosting Websites',
        '',
        '',
        'Looking for free Minecraft hosting that actually works? We round up the best options, what they give you, and what to watch out for.',
        'Minecraft',
        'coming_soon',
        '',
        1,
        1,
      ]
    );
    const videoId = Number(info.lastInsertRowid);

    const resourceRows = [
      ['MC Server Host', 'https://mcserverhost.com', '', 'Solid free & paid plans for Java servers.', 'Hosting', 0],
      ['Magmanode', 'https://magmanode.com', '', 'Affordable Minecraft hosting with free tier.', 'Hosting', 1],
      ['Seadloaf Hosting', 'https://seadloaf.com', '', 'Reliable low-cost hosting with good support.', 'Hosting', 0],
      ['Play Hosting', 'https://playhosting.com', '', 'Budget-friendly server hosting options.', 'Hosting', 0],
    ];
    db.prepare('BEGIN');
    try {
      for (const [name, url, logo, desc, category, featured] of resourceRows) {
        const r = db.prepare(
          `INSERT INTO resources (name, url, logo, description, category, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(name, url, logo, desc, category, featured, 0);
        db.prepare(
          'INSERT INTO video_resources (video_id, resource_id, sort_order) VALUES (?, ?, ?)'
        ).run(videoId, Number(r.lastInsertRowid), 0);
      }
      db.prepare('COMMIT');
    } catch (e) {
      db.prepare('ROLLBACK');
      throw e;
    }
    console.log('Seeded starter video "Best Free Minecraft Hosting Websites" and its resources.');
  } else {
    console.log('Videos already exist — skipping video seed.');
  }

  const mcCount = db.prepare('SELECT COUNT(*) AS c FROM minecraft_listings').get().c;
  if (mcCount === 0) {
    insertSQL(
      'minecraft_listings',
      ['title', 'edition', 'listing_type', 'price', 'availability', 'description', 'url', 'contact', 'featured', 'sort_order'],
      [
        'Free Server Hosting Guides', 'java', 'guide', '', 'available',
        'How to spin up free Java & Bedrock servers, step by step.', '/minecraft', '', 1, 0,
      ]
    );
    insertSQL(
      'minecraft_listings',
      ['title', 'edition', 'listing_type', 'price', 'availability', 'description', 'url', 'contact', 'featured', 'sort_order'],
      [
        'Texture Pack Roundup', 'bedrock', 'resource', 'Free', 'available',
        'A curated set of performance texture packs for Bedrock.', '/minecraft', '', 0, 1,
      ]
    );
    console.log('Seeded starter Minecraft listings.');
  }

  const annCount = db.prepare('SELECT COUNT(*) AS c FROM announcements').get().c;
  if (annCount === 0) {
    insertSQL(
      'announcements',
      ['title', 'message', 'ann_type', 'start_date', 'end_date', 'active'],
      ['Welcome to The Tech Guider Hub', 'Everything from The Tech Guider in one place — check back often.', 'website', new Date().toISOString().slice(0, 10), '', 1]
    );
    console.log('Seeded a welcome announcement.');
  }

  console.log('Seed complete.');
})();