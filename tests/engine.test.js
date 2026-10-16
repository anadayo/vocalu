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
assert.equal(global.VocaluCatalog.songs.filter(c => c.thumbnailVerified).length, 80, '40 verified songs have two card variants');
assert.ok(global.VocaluCatalog.songs.find(c => c.name === 'ローリンガール').videoUrl.includes('vnw8zURAxkU'));

const opened = E.openFivePacks(global.VocaluCatalog.cards, rngSequence([0.1,0.2,0.5,0.8]));
assert.equal(opened.length, 25, 'five packs contain 25 cards');
const deckIndexes = E.autoBuild(opened);
assert.equal(deckIndexes.length, 20, 'auto deck has 20 cards');
assert.equal(new Set(deckIndexes).size, 20, 'auto deck uses unique opened slots');

const deck = global.VocaluCatalog.songs.slice(0,20).map(c => ({...c,cost:1,power:3000}));
const battle = E.makeBattle(deck, deck, () => 0.2);
assert.equal(battle.user.life,3);
assert.equal(battle.user.hand.length,3,'opening hand has three cards');
assert.equal(battle.user.lifeCards.length,3,'three shuffled cards are placed face down as life');
assert.equal(battle.user.deck.length,14,'opening hand and life are removed from the 20-card deck');
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
assert.equal(combat.cpu.lifeCards.length,2,'direct attack removes one face-down life card');
combat.cpu.life = 1;
combat.user.field[0].attacked = false;
E.attack(combat,'user',0,'life',null,null);
assert.equal(combat.winner,'user','third life loss ends battle');

const guarded = E.makeBattle(strongDeck, weakDeck, () => 0.1);
guarded.cpu.field.push({...weakDeck[0],currentPower:1000,attacked:false});
guarded.user.field.push({...strongDeck[0],currentPower:9000,attacked:false});
guarded.active = 'cpu';
E.attack(guarded,'cpu',0,'life',null,0);
assert.equal(guarded.user.life,3,'guard choice protects life');
assert.equal(guarded.user.lifeCards.length,3,'guard choice keeps face-down life cards');
assert.equal(guarded.cpu.field.length,0,'weaker attacker is discarded by guard');

const cpuMain = E.makeBattle(strongDeck, weakDeck, () => 0.1);
E.endTurn(cpuMain,'user');
const lifeBeforeMain = cpuMain.user.life;
E.cpuMainPhase(cpuMain);
assert.equal(cpuMain.user.life,lifeBeforeMain,'CPU main phase does not resolve attacks before player choice');
assert.equal(cpuMain.active,'cpu','CPU main phase waits for attack resolution');

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
