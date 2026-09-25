'use strict';

const crypto = require('node:crypto');
const { db } = require('./db');

const PLAY_STYLES = ['one_tap', 'rush', 'balanced', 'sniper', 'custom'];

const PLAY_STYLE_MODS = {
  one_tap: { general: 1.05, redDot: 1.06, scope2: 0.98, scope4: 0.95, sniper: 0.94, freeLook: 1.0, fireButton: 0.82, dpi: 1.0 },
  rush:    { general: 1.02, redDot: 1.02, scope2: 1.0,  scope4: 0.98, sniper: 0.97, freeLook: 1.0, fireButton: 0.9,  dpi: 1.0 },
  balanced:{ general: 1.0,  redDot: 1.0,  scope2: 1.0,  scope4: 1.0,  sniper: 1.0,  freeLook: 1.0, fireButton: 0.86, dpi: 1.0 },
  sniper:  { general: 1.02, redDot: 0.98, scope2: 0.94, scope4: 0.9,  sniper: 0.86, freeLook: 0.92, fireButton: 0.86, dpi: 0.9 },
  custom:  { general: 1.0,  redDot: 1.0,  scope2: 1.0,  scope4: 1.0,  sniper: 1.0,  freeLook: 1.0, fireButton: 0.86, dpi: 1.0 },
};

const BRAND_QUALITY = {
  samsung: 1.0, xiaomi: 0.97, redmi: 0.92, poco: 0.95, realme: 0.94, oppo: 0.95,
  vivo: 0.94, oneplus: 1.0, infinix: 0.88, tecno: 0.9, motorola: 0.94,
  google_pixel: 1.02, huawei: 1.0,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function seedFrom(input) {
  const str = [
    input.deviceType, input.brand, input.deviceModel, input.ram,
    input.resolution, input.refreshRate, input.playStyle, input.dpi,
  ].filter(Boolean).join('|');
  const h = crypto.createHash('sha256').update(str).digest();
  // deterministic factor in [-0.02, 0.02]
  const variation = (h[0] / 255) * 0.04 - 0.02;
  return variation;
}

function inferPerformanceClass(input) {
  if (input.deviceType === 'pc') {
    const p = (input.pcTier || 'mid').toLowerCase();
    if (p === 'low' || p === 'low_end') return 'low';
    if (p === 'high' || p === 'high_end') return 'high';
    return 'mid';
  }
  if (input.deviceType === 'ios') {
    const model = (input.deviceModel || '').toLowerCase();
    const isPro = /pro|air|plus|max/.test(model);
    return isPro ? 'high' : 'mid';
  }
  const ram = parseInt(input.ram, 10) || 4;
  const brand = (input.brand || '').toLowerCase();
  const q = BRAND_QUALITY[brand] || 0.95;
  if (ram >= 8) return q >= 0.95 ? 'high' : 'mid';
  if (ram >= 6) return q >= 0.95 ? 'mid' : 'mid';
  return 'low';
}

function baseMultiplier(input, perfClass) {
  const cls = { low: 0.86, mid: 1.0, high: 1.1 }[perfClass] || 1.0;
  const ram = parseInt(input.ram, 10) || 4;
  let ramFactor = 1.0;
  if (ram < 4) ramFactor = 0.92;
  else if (ram < 6) ramFactor = 0.98;
  else if (ram === 8) ramFactor = 1.02;
  else if (ram > 8) ramFactor = 1.05;
  let refreshFactor = 1.0;
  const hz = parseInt(String(input.refreshRate || '0').replace(/[^0-9]/g, ''), 10) || 0;
  if (hz >= 144) refreshFactor = 1.08;
  else if (hz >= 120) refreshFactor = 1.07;
  else if (hz >= 90) refreshFactor = 1.04;
  let resFactor = 1.0;
  const res = String(input.resolution || '');
  if (/720/.test(res)) resFactor = 0.96;
  else if (/1440/.test(res)) resFactor = 1.03;
  return cls * ramFactor * refreshFactor * resFactor;
}

function recommendedDpi(input, perfClass, playStyle, fireButton) {
  const variation = seedFrom(input);
  if (input.deviceType === 'ios') {
    return { value: null, range: 'System DPI on iOS is fixed by Apple — no DPI change is needed.', compact: 'iOS fixed DPI' };
  }
  if (input.deviceType === 'pc') {
    const pc = (input.pcTier || 'mid').toLowerCase();
    if (pc === 'low' || pc === 'low_end') return { value: null, range: '400 – 600 (lower DPI helps on low-end PCs)', compact: '400–600' };
    if (pc === 'high' || pc === 'high_end') return { value: null, range: '400 – 800 (match your mouse sensor native DPI)', compact: '400–800' };
    return { value: null, range: '400 – 800 (match your mouse sensor native DPI)', compact: '400–800' };
  }
  const base = inferAndroidDpi(input, perfClass);
  const playBias = PLAY_STYLE_MODS[playStyle] ? PLAY_STYLE_MODS[playStyle].dpi : 1;
  const value = clamp(Math.round(base * (1 + variation * 0.5) * playBias), 320, 500);
  return { value, range: `${value - 20} – ${value + 20}`, compact: `${value - 20}–${value + 20}` };
}

function inferAndroidDpi(input, perfClass) {
  const brand = (input.brand || '').toLowerCase();
  const res = String(input.resolution || '');
  let base = { low: 390, mid: 410, high: 430 }[perfClass] || 410;
  if (BRAND_QUALITY[brand] >= 1.0) base += 10;
  if (BRAND_QUALITY[brand] <= 0.91) base -= 14;
  if (/1080/.test(res)) base += 4;
  if (/1440/.test(res)) base += 10;
  if (/720/.test(res)) base -= 8;
  return base;
}

function buildAlgorithmValues(input) {
  const perfClass = inferPerformanceClass(input);
  const base = baseMultiplier(input, perfClass);
  const variation = seedFrom(input);
  const mod = PLAY_STYLE_MODS[input.playStyle] || PLAY_STYLE_MODS.balanced;
  const v = (key, baseVal, lo, hi) =>
    clamp(Math.round(baseVal * base * (1 + variation) * mod[key]), lo, hi);
  const fireButton = clamp(Math.round(86 * mod.fireButton * (1 + variation * 0.5)), 50, 100);
  const dpi = recommendedDpi(input, perfClass, input.playStyle, fireButton);
  return {
    general: v('general', 100, 55, 100),
    redDot: v('redDot', 92, 45, 100),
    scope2: v('scope2', 84, 35, 100),
    scope4: v('scope4', 74, 25, 100),
    sniperScope: v('sniper', 64, 20, 95),
    freeLook: v('freeLook', 70, 40, 100),
    fireButtonSize: fireButton,
    dpi: dpi.value,
    dpiRange: dpi.range,
    performanceClass: perfClass,
  };
}

function matchProfile(input, perfClass) {
  const brand = (input.brand || '').toLowerCase() || (input.pcTier || '').toLowerCase();
  const model = (input.deviceModel || '').toLowerCase();
  const ram = String(input.ram || '');
  const play = input.playStyle;
  const rows = db
    .prepare('SELECT * FROM sensitivity_profiles ORDER BY updated_at DESC')
    .all();

  const matches = rows.filter((r) => r.device_type.toLowerCase() === input.deviceType);
  const score = (r) => {
    let s = 0;
    if (r.brand && brand && r.brand.toLowerCase() === brand) s += 30;
    if (r.device_model && model && r.device_model.toLowerCase() === model) s += 40;
    if (r.ram && ram && r.ram.toLowerCase() === ram) s += 20;
    if (r.play_style && r.play_style.toLowerCase() === play) s += 50;
    if (r.performance_class && r.performance_class.toLowerCase() === perfClass) s += 15;
    if (r.dpi && input.dpi && String(r.dpi).toLowerCase() === String(input.dpi).toLowerCase()) s += 25;
    return s;
  };
  const best = matches
    .map((r) => ({ r, s: score(r) }))
    .filter((m) => m.s > 50)
    .sort((a, b) => b.s - a.s)[0];
  return best ? best.r : null;
}

function generate(input) {
  const deviceType = (input.deviceType || 'android').toLowerCase();
  const playStyle = PLAY_STYLES.includes((input.playStyle || '').toLowerCase())
    ? input.playStyle.toLowerCase()
    : 'balanced';

  const normalized = {
    ...input,
    deviceType,
    playStyle,
    pcTier: (input.pcTier || '').toLowerCase(),
  };

  const algorithmValues = buildAlgorithmValues(normalized);
  const perfClass = algorithmValues.performanceClass;
  const profile = matchProfile(normalized, perfClass);

  let values;
  let source = 'algorithm';
  let profileName = null;
  let notes = 'Generated by the sensitivity calculator. These values are suggestions — every device and grip is different, so fine-tune until it feels right.';

  if (profile) {
    let pv;
    try {
      pv = JSON.parse(profile.values_json || '{}');
    } catch {
      pv = {};
    }
    source = 'owner_profile';
    profileName = profile.name;
    values = {
      general: pv.general ?? algorithmValues.general,
      redDot: pv.redDot ?? algorithmValues.redDot,
      scope2: pv.scope2 ?? algorithmValues.scope2,
      scope4: pv.scope4 ?? algorithmValues.scope4,
      sniperScope: pv.sniperScope ?? algorithmValues.sniperScope,
      freeLook: pv.freeLook ?? algorithmValues.freeLook,
      fireButtonSize: pv.fireButtonSize ?? algorithmValues.fireButtonSize,
      dpi: pv.dpi !== undefined && pv.dpi !== null ? pv.dpi : algorithmValues.dpi,
      dpiRange: pv.dpiRange || algorithmValues.dpiRange,
      performanceClass: profile.performance_class || perfClass,
    };
    notes = `These values are a tuned preset (${profile.name}) for your setup, based on The Tech Guider's recommendations. Still fine-tune to taste in practice mode.`;
  } else {
    values = { ...algorithmValues };
  }

  return {
    values,
    source,
    profileName,
    performanceClass: values.performanceClass,
    notes,
    disclaimer:
      'Not an official guarantee: results vary by device, ping, and muscle memory. Test in training ground and adjust.',
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generate, PLAY_STYLES };