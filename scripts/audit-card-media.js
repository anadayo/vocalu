#!/usr/bin/env node
'use strict';

global.self = global;
require('../js/song-media.js');
require('../js/catalog.js');

const cards = global.VocaluCatalog.cards;
let cursor = 0;
const results = [];

async function worker() {
  while (cursor < cards.length) {
    const card = cards[cursor++];
    try {
      const response = await fetch(card.thumbnailUrl, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'VOCALU-media-audit/1.0 (+https://anadayo.github.io/vocalu/)' }
      });
      results.push({ id: card.id, name: card.name, ok: response.ok, status: response.status, url: card.thumbnailUrl });
    } catch (error) {
      results.push({ id: card.id, name: card.name, ok: false, status: 0, url: card.thumbnailUrl, error: error.message });
    }
  }
}

(async function main() {
  await Promise.all(Array.from({ length: 12 }, worker));
  const failed = results.filter(result => !result.ok);
  console.log(JSON.stringify({ total: results.length, loaded: results.length - failed.length, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
}());
