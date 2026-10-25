#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
global.self = global;
require(path.join(root, 'js/catalog.js'));

const outputPath = path.join(root, 'js/song-media.js');
const cachePath = path.join(root, 'data/song-media-cache.json');
const cards = global.VocaluCatalog.songs;
const existing = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/deco\*?27/g, 'deco27')
    .replace(/40(?:m|メートル)p/g, '40mp')
    .replace(/n-?buna|ナブナ/g, 'nbuna')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function producerMatches(item, producer) {
  const wanted = normalize(producer);
  const names = [item.artistString]
    .concat((item.artists || []).map(entry => entry.name || entry.artist?.name))
    .map(normalize);
  return names.some(name => name.includes(wanted) || wanted.includes(name));
}

function score(item, card) {
  let value = Math.min(Number(item.ratingScore) || 0, 500);
  if (normalize(item.name) === normalize(card.name) || normalize(item.defaultName) === normalize(card.name)) value += 1000;
  if (producerMatches(item, card.producer)) value += 700;
  if (item.songType === 'Original') value += 250;
  if (!item.originalVersionId) value += 100;
  if (item.mainPicture?.urlOriginal) value += 80;
  return value;
}

function preferredPv(item) {
  const active = (item.pvs || []).filter(pv => !pv.disabled && pv.pvType === 'Original');
  return active.find(pv => pv.service === 'Youtube') || active.find(pv => pv.service === 'NicoNicoDouga') || active[0] || null;
}

function imageFor(match, pv) {
  if (pv?.service === 'Youtube' && pv.pvId) return `https://i.ytimg.com/vi/${pv.pvId}/hqdefault.jpg`;
  if (pv?.thumbUrl) return pv.thumbUrl.replace('http://', 'https://');
  return match.mainPicture?.urlOriginal?.replace('http://', 'https://') || null;
}

async function imageAvailable(url) {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function lookup(card) {
  const url = new URL('https://vocadb.net/api/songs');
  url.searchParams.set('query', card.name);
  url.searchParams.set('nameMatchMode', 'Exact');
  url.searchParams.set('maxResults', '20');
  url.searchParams.set('preferAccurateMatches', 'true');
  url.searchParams.set('sort', 'RatingScore');
  url.searchParams.set('fields', 'MainPicture,PVs,Artists');
  url.searchParams.set('lang', 'Japanese');
  const response = await fetch(url, { headers: { 'User-Agent': 'VOCALU-media-sync/1.0 (+https://anadayo.github.io/vocalu/)' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const payload = await response.json();
  const candidates = (payload.items || []).filter(item =>
    (normalize(item.name) === normalize(card.name) || normalize(item.defaultName) === normalize(card.name)) && producerMatches(item, card.producer)
  );
  candidates.sort((a, b) => score(b, card) - score(a, card));
  const match = candidates[0];
  if (!match || !match.mainPicture?.urlOriginal || score(match, card) < 1100) return null;
  const pv = preferredPv(match);
  const image = imageFor(match, pv);
  return {
    title: match.name,
    producer: card.producer,
    image,
    source: `https://vocadb.net/S/${match.id}`,
    mediaUrl: pv ? pv.url.replace('http://', 'https://') : `https://vocadb.net/S/${match.id}`,
    sourceLabel: 'VocaDB掲載・原曲照合済み',
    artistString: match.artistString,
    artistVerified: true,
    vocadbId: match.id,
    verifiedAt: new Date().toISOString().slice(0, 10)
  };
}

function writeFiles(data) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2) + '\n');
  const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(outputPath, `(function(root){'use strict';root.VocaluSongMedia=${JSON.stringify(sorted)};})(typeof self!=='undefined'?self:this);\n`);
}

(async function main() {
  const missing = cards.filter(card => !card.thumbnailVerified || !card.thumbnailUrl);
  let success = 0;
  let failed = 0;
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (cursor < missing.length) {
      const card = missing[cursor++];
      if (existing[card.id]?.image && existing[card.id]?.artistVerified && await imageAvailable(existing[card.id].image)) {
        success += 1;
      } else try {
        const media = await lookup(card);
        if (media) {
          existing[card.id] = media;
          success += 1;
        } else {
          failed += 1;
          console.warn(`NO_MATCH ${card.id} ${card.name} / ${card.producer}`);
        }
      } catch (error) {
        failed += 1;
        console.warn(`ERROR ${card.id} ${card.name}: ${error.message}`);
      }
      completed += 1;
      if (completed % 10 === 0) writeFiles(existing);
      await new Promise(resolve => setTimeout(resolve, 180));
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  writeFiles(existing);
  console.log(JSON.stringify({ requested: missing.length, success, failed, cached: Object.keys(existing).length }));
}()).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
