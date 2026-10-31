'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const calls = [];
global.window = global;
global.VOCALU_ANALYTICS_ENABLED = true;
global.gtag = function () { calls.push(Array.from(arguments)); };
require('../js/analytics.js');

assert.equal(VocaluAnalytics.event('lobby_view', { screen_name: 'lobby' }), true);
assert.equal(calls[0][0], 'event');
assert.equal(calls[0][1], 'lobby_view');
assert.equal(calls[0][2].game_name, 'vocalu');
assert.equal(VocaluAnalytics.event('unknown_event', {}), false, 'unknown events are not sent');
assert.equal(VocaluAnalytics.event('pack_open', {}, { dedupeKey: 'pack-1' }), true);
assert.equal(VocaluAnalytics.event('pack_open', {}, { dedupeKey: 'pack-1' }), false, 'dedupe keys suppress repeats');
assert.equal(VocaluAnalytics.error('TypeError', 'battle'), true);
assert.equal(VocaluAnalytics.error('TypeError', 'battle'), false, 'identical runtime errors are reported once per page');

const appSource = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
['lobby_view','pack_open','collection_view','deck_build_complete','battle_start','battle_complete','ranked_match_start','share_x','game_error'].forEach(name => {
  assert.ok(appSource.includes("'" + name + "'") || name === 'game_error', name + ' is wired into the app or analytics error wrapper');
});
assert.equal(/vocalu_(pack_open|battle_start|battle_complete|share)/.test(appSource), false, 'legacy event names are removed');

console.log('VOCALU analytics tests: OK');
