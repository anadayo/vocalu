'use strict';
const assert = require('assert');
global.self = global;
require('../js/catalog.js');
const E = require('../js/engine.js');

function rngSequence(values) { let i=0; return () => values[(i++)%values.length]; }
assert.equal(global.VocaluCatalog.cards.length, 280, 'catalog total');
assert.equal(global.VocaluCatalog.songs.length, 200, 'songs total');
assert.equal(global.VocaluCatalog.producers.length, 30, 'producer total');
assert.equal(global.VocaluCatalog.singers.length, 50, 'singer total');

const opened = E.openFivePacks(global.VocaluCatalog.cards, rngSequence([0.1,0.2,0.5,0.8]));
assert.equal(opened.length, 25, 'five packs contain 25 cards');
const deckIndexes = E.autoBuild(opened);
assert.equal(deckIndexes.length, 20, 'auto deck has 20 cards');
assert.equal(new Set(deckIndexes).size, 20, 'auto deck uses unique opened slots');

const deck = global.VocaluCatalog.songs.slice(0,20).map(c => ({...c,cost:1,power:3000}));
const battle = E.makeBattle(deck, deck, () => 0.2);
assert.equal(battle.user.life,3);
assert.equal(battle.user.maxCost,1);
E.playCard(battle,'user',0,0);
assert.equal(battle.user.field.length,1);
E.endTurn(battle,'user');
E.cpuTurn(battle,()=>0.2,null);
assert.equal(battle.active,'user','CPU turn returns control');
assert.ok(battle.user.maxCost >= 2,'cost increases');
assert.doesNotThrow(()=>E.validate(battle));

const strongDeck = global.VocaluCatalog.songs.slice(0,20).map(c => ({...c,cost:1,power:9000}));
const weakDeck = global.VocaluCatalog.songs.slice(20,40).map(c => ({...c,cost:1,power:1000}));
const combat = E.makeBattle(strongDeck, weakDeck, () => 0.1);
E.playCard(combat,'user',0,0);
E.endTurn(combat,'user');
E.cpuTurn(combat,()=>0.1,null);
assert.equal(combat.active,'user');
E.attack(combat,'user',0,'life',null,null);
assert.equal(combat.cpu.life,2,'direct attack removes one life');

const replacement = E.makeBattle(strongDeck, weakDeck, () => 0.1);
replacement.user.cost = 10;
replacement.user.maxCost = 10;
E.playCard(replacement,'user',0,0);
replacement.user.hand.unshift({...strongDeck[1]});
E.playCard(replacement,'user',0,0);
replacement.user.hand.unshift({...strongDeck[2]});
E.playCard(replacement,'user',0,0);
assert.equal(replacement.user.field.length,3,'field accepts three songs');
replacement.user.hand.unshift({...strongDeck[3]});
replacement.user.cost = 10;
E.playCard(replacement,'user',0,1);
assert.equal(replacement.user.field.length,3,'replacement keeps field at three');
assert.equal(replacement.user.discard.length,1,'replaced song goes to discard');

console.log('VOCALU engine tests: OK');
