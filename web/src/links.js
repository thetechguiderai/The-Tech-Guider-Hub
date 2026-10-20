// Central links for The Tech Guider Hub.
// Used as fallbacks wherever the owner settings (site.social.*) are empty,
// so buttons and bars never end up without a real destination.
export const SITE_LINKS = {
  youtube: 'https://www.youtube.com/@thetechguider01',
  discord: 'https://discord.gg/dczyhM8ZwV',
  instagram: 'https://www.instagram.com/legend0.26/',
  tiktok: 'https://www.tiktok.com/@legend0.26',
};

// Resolve a social link: prefer the configured site value, else the fallback.
export function socialLink(site, key) {
  const configured = site && site.social && site.social[key];
  return configured || SITE_LINKS[key] || '';
}

export const SUBSCRIBE_URL = SITE_LINKS.youtube;
