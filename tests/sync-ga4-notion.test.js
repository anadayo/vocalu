'use strict';

const assert = require('assert');
const sync = require('../scripts/sync-ga4-notion.js');

assert.equal(sync.jstYesterday(new Date('2026-11-01T01:00:00Z')), '2026-10-31');
assert.equal(sync.jstYesterday(new Date('2026-11-01T23:30:00Z')), '2026-11-01');
assert.equal(sync.jstYesterday(new Date(), '2026-10-30'), '2026-10-30');

const events = sync.eventRows({ rows: [
  { dimensionValues: [{ value: 'pack_open' }], metricValues: [{ value: '5' }] },
  { dimensionValues: [{ value: 'battle_start' }], metricValues: [{ value: '2' }] }
] });
assert.equal(events.pack_open, 5);
assert.equal(events.battle_start, 2);
assert.equal(events.battle_complete, 0, 'successful GA report with no event row is a measured zero');

const filter = sync.vocaluFilter({ filter: { fieldName: 'eventName', inListFilter: { values: ['pack_open'] } } });
assert.equal(filter.andGroup.expressions[0].filter.fieldName, 'hostName');
assert.equal(filter.andGroup.expressions[1].filter.stringFilter.value, '/vocalu/');
assert.equal(filter.andGroup.expressions[2].filter.fieldName, 'eventName');

const properties = sync.notionProperties({
  date: '2026-10-31', pageViews: 10, activeUsers: 3, newUsers: 2, returningUsers: 1,
  sessions: 4, averagePlaySeconds: 32.5, events, state: '実測', note: 'test'
}, '2026-11-01T00:00:00.000Z');
assert.equal(properties.PV.number, 10);
assert.equal(properties['パック開封'].number, 5);
assert.equal(properties['計測状態'].select.name, '実測');

const unavailable = sync.notionProperties(sync.unavailableReport('2026-10-31', 'offline'), '2026-11-01T00:00:00.000Z');
assert.equal(Object.prototype.hasOwnProperty.call(unavailable, 'PV'), false, 'unavailable values are omitted instead of written as zero');
assert.equal(unavailable['計測状態'].select.name, '取得不可');

console.log('VOCALU GA4/Notion sync tests: OK');
