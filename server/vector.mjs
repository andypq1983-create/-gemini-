const WORD_REGEX = /[\p{Script=Han}]+|[A-Za-z0-9]+/gu;

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function addFeature(vec, feature, weight) {
  if (!feature) return;
  const base = fnv1a(feature);
  const idx = base % vec.length;
  const sign = (fnv1a(`${feature}#`) & 1) === 0 ? 1 : -1;
  vec[idx] += sign * weight;
}

function normalizeVector(values) {
  let norm = 0;
  for (let i = 0; i < values.length; i += 1) {
    norm += values[i] * values[i];
  }
  norm = Math.sqrt(norm);
  if (norm <= 0) return values;

  for (let i = 0; i < values.length; i += 1) {
    values[i] /= norm;
  }
  return values;
}

export function textToVector(text, dim = 256) {
  const safeDim = Math.max(64, Number.parseInt(String(dim || 256), 10) || 256);
  const vec = new Float32Array(safeDim);
  const normalized = String(text || "").toLowerCase();
  const tokens = normalized.match(WORD_REGEX) || [];

  for (const token of tokens) {
    if (!token) continue;

    const isAsciiWord = /^[a-z0-9]+$/.test(token);
    const baseWeight = isAsciiWord ? 1.3 : 1.7;

    addFeature(vec, `tok:${token}`, baseWeight);

    for (let i = 0; i < token.length - 1; i += 1) {
      addFeature(vec, `bg:${token.slice(i, i + 2)}`, baseWeight * 0.6);
    }

    for (let i = 0; i < token.length - 2; i += 1) {
      addFeature(vec, `tg:${token.slice(i, i + 3)}`, baseWeight * 0.4);
    }
  }

  if (tokens.length === 0 && normalized.trim()) {
    addFeature(vec, `raw:${normalized.trim().slice(0, 80)}`, 1);
  }

  normalizeVector(vec);
  return Array.from(vec);
}

export function ensureVector(maybeVector, text, dim = 256) {
  if (Array.isArray(maybeVector) && maybeVector.length > 0) {
    const list = maybeVector.map((n) => Number(n) || 0);
    normalizeVector(list);
    return list;
  }
  return textToVector(text, dim);
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i += 1) {
    dot += (Number(a[i]) || 0) * (Number(b[i]) || 0);
  }
  return dot;
}
