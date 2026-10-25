'use strict';
const assert = require('assert');
global.self = global;
require('../js/catalog.js');
const E = require('../js/engine.js');

function rngSequence(values) { let i=0; return () => values[(i++)%values.length]; }
assert.equal(global.VocaluCatalog.cards.length, 300, 'catalog total');
assert.equal(global.VocaluCatalog.songs.length, 240, 'songs total');
assert.equal(global.VocaluCatalog.producers.length, 20, 'producer total');
assert.equal(global.VocaluCatalog.singers.length, 40, 'singer total');
assert.equal(new Set(global.VocaluCatalog.songs.map(c => c.name)).size, 240, 'songs are unique');
assert.equal(global.VocaluCatalog.cards.some(c => c.variant === 'コレクター版' || /-sp$/.test(c.id)), false, 'collector cards are removed');
assert.equal(global.VocaluCatalog.producers.filter(c => c.thumbnailVerified && c.thumbnailUrl && c.profileUrl).length, 20, 'all producers have sourced profile artwork');
assert.equal(global.VocaluCatalog.singers.filter(c => c.thumbnailVerified && c.thumbnailUrl && c.profileUrl).length, 40, 'all singers have sourced profile artwork');
assert.equal(global.VocaluCatalog.producers.filter(c => c.trigger && c.trigger.type).length, 20, 'all producers have triggers');
assert.equal(global.VocaluCatalog.singers.filter(c => c.trigger && c.trigger.type).length, 40, 'all singers have triggers');
assert.deepEqual(global.VocaluCatalog.songs.reduce((a,c)=>(a[c.rarity]=(a[c.rarity]||0)+1,a),{}), {N:100,R:80,SR:45,UR:15});
assert.deepEqual(global.VocaluCatalog.producers.reduce((a,c)=>(a[c.rarity]=(a[c.rarity]||0)+1,a),{}), {N:4,R:6,SR:6,UR:4});
assert.deepEqual(global.VocaluCatalog.singers.reduce((a,c)=>(a[c.rarity]=(a[c.rarity]||0)+1,a),{}), {N:16,R:12,SR:8,UR:4});
assert.deepEqual(global.VocaluCatalog.migrateCollection({'song-001':2,'song-001-sp':1,'missing-card':9}), {'song-001':3}, 'collector ownership migrates once into the base card');
assert.ok(global.VocaluCatalog.songs.find(c => c.name === 'ローリンガール').videoUrl.includes('vnw8zURAxkU'));
assert.ok(global.VocaluCatalog.producers.find(c => c.name === 'じん').thumbnailUrl.includes('/552.jpg'), 'Jin uses the verified producer profile');
assert.ok(global.VocaluCatalog.producers.find(c => c.name === 'sasakure.UK').thumbnailUrl.includes('/51.jpg'), 'sasakure.UK uses the verified producer profile');
assert.ok(global.VocaluCatalog.singers.find(c => c.name === '鏡音レン').thumbnailUrl.includes('/15.png'), 'Kagamine Len uses the character profile');
assert.ok(global.VocaluCatalog.singers.find(c => c.name === 'flower').thumbnailUrl.includes('/21165.png'), 'flower uses the character profile');
assert.ok(global.VocaluCatalog.singers.find(c => c.name === 'miki').thumbnailUrl.includes('/146.png'), 'miki uses the character profile');

const opened = E.openFivePacks(global.VocaluCatalog.cards, rngSequence([0.1,0.2,0.5,0.8]));
assert.equal(opened.length, 25, 'five packs contain 25 cards');
const deckIndexes = E.autoBuild(opened);
assert.equal(deckIndexes.length, 20, 'auto deck has 20 cards');
assert.equal(new Set(deckIndexes).size, 20, 'auto deck uses unique opened slots');

const deck = global.VocaluCatalog.songs.slice(0,20).map(c => ({...c,cost:1,power:3000}));
const battle = E.makeBattle(deck, deck, () => 0.2);
assert.equal(battle.user.life,5);
assert.equal(battle.user.hand.length,3,'opening hand has three cards');
assert.equal(battle.user.lifeCards.length,5,'five shuffled cards are placed face down as life');
assert.equal(battle.user.deck.length,12,'opening hand and life are removed from the 20-card deck');
assert.equal(battle.user.maxCost,1);
const mulliganBattle = E.makeBattle(deck, deck, () => 0.2);
E.mulligan(mulliganBattle,[0,2],() => 0.8);
assert.equal(mulliganBattle.user.hand.length,3,'mulligan redraws the number returned');
assert.equal(mulliganBattle.user.deck.length,12,'mulligan keeps deck and hand counts stable');
assert.equal(mulliganBattle.mulliganUsed,true,'mulligan is marked as used');
assert.throws(()=>E.mulligan(mulliganBattle,[0],() => 0.2),/1ゲームに1回/,'mulligan cannot be used twice');
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
assert.equal(combat.cpu.life,4,'direct attack removes one life');
assert.equal(combat.cpu.lifeCards.length,4,'direct attack removes one face-down life card');
assert.equal(combat.lastImpact.type,'life','direct life damage exposes the life-break animation state');
combat.cpu.life = 1;
combat.user.field[0].attacked = false;
E.attack(combat,'user',0,'life',null,null);
assert.equal(combat.winner,'user','final life loss ends battle');

const guarded = E.makeBattle(strongDeck, weakDeck, () => 0.1);
guarded.cpu.field.push({...weakDeck[0],currentPower:1000,attacked:false});
guarded.user.field.push({...strongDeck[0],currentPower:9000,attacked:false});
guarded.active = 'cpu';
E.attack(guarded,'cpu',0,'life',null,0);
assert.equal(guarded.user.life,5,'guard choice protects life');
assert.equal(guarded.user.lifeCards.length,5,'guard choice keeps face-down life cards');
assert.equal(guarded.cpu.field.length,0,'weaker attacker is discarded by guard');

const restedGuard = E.makeBattle(strongDeck, weakDeck, () => 0.1);
restedGuard.cpu.field.push({...weakDeck[0],currentPower:1500,attacked:false});
restedGuard.user.field.push({...strongDeck[0],currentPower:2000,attacked:true});
restedGuard.active = 'cpu';
assert.equal(E.effectivePower(restedGuard.user.field[0]),1000,'REST subtracts 1000 from displayed and combat power');
assert.throws(()=>E.attack(restedGuard,'cpu',0,'life',null,0),/REST状態/,'a REST card cannot guard life');
assert.equal(restedGuard.cpu.field[0].attacked,false,'an invalid REST guard does not consume the attack');

const intercept = E.makeBattle(strongDeck, weakDeck, () => 0.1);
intercept.cpu.field.push({...weakDeck[0],currentPower:1500,attacked:false});
intercept.user.field.push({...strongDeck[0],currentPower:3000,attacked:true},{...strongDeck[1],currentPower:1000,attacked:false});
intercept.active = 'cpu';
E.attack(intercept,'cpu',0,'song',0,1);
assert.equal(intercept.user.field.some(c=>c.currentPower===3000),true,'an ACTIVE card can protect a targeted REST card');
assert.equal(intercept.user.discard.some(c=>c.currentPower===1000),true,'the ACTIVE guard receives the attack');
assert.equal(intercept.lastImpact.type,'knockout','destroying a battle card exposes the knockout animation state');

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

const clutch = E.makeBattle(strongDeck, weakDeck, () => 0.1);
clutch.user.life = 2;
clutch.user.cost = 10;
clutch.user.hand = [{...strongDeck[0],cost:1}];
E.playCard(clutch,'user',0,0);
assert.equal(clutch.user.field[0].attacked,false,'songs summoned at two life or less can attack immediately');

const equipment = E.makeBattle(strongDeck, weakDeck, () => 0.1);
equipment.user.cost = 10;
equipment.user.maxCost = 10;
equipment.user.field = [{...strongDeck[0],currentPower:9000,attacked:false,singer:null}];
equipment.user.hand = [{...global.VocaluCatalog.singers[0],boost:500,cost:1},{...global.VocaluCatalog.singers[1],boost:1500,cost:1}];
E.playCard(equipment,'user',0,0);
assert.equal(equipment.user.field[0].currentPower,9500,'first singer boost is applied');
E.playCard(equipment,'user',0,0);
assert.equal(equipment.user.field[0].currentPower,10500,'replacing equipment removes the previous boost');
assert.equal(equipment.user.discard.length,1,'replaced singer is discarded');

function makeTriggerBattle(type) {
  const support = global.VocaluCatalog.cards.find(c => c.type !== 'song' && c.trigger.type === type);
  const state = E.makeBattle(strongDeck, weakDeck, () => 0.1);
  state.cpu.life = 2;
  state.cpu.lifeCards = [{...support}];
  state.user.field = [
    {...strongDeck[0],cost:6,currentPower:9000,attacked:false},
    {...strongDeck[1],cost:5,currentPower:8000,attacked:false},
    {...strongDeck[2],cost:4,currentPower:7000,attacked:false}
  ];
  E.attack(state,'user',0,'life',null,null);
  assert.equal(state.cpu.life,1,type + ' trigger damage resolves');
  assert.equal(state.cpu.discard.some(c => c.id === support.id),true,type + ' life support enters discard');
  assert.equal(state.lastTrigger.type,type,type + ' trigger is reported to the UI');
  return state;
}

const destroyTrigger = makeTriggerBattle('destroy_all');
assert.equal(destroyTrigger.user.field.length,0,'destroy-all trigger clears the attacking field');

const costTrigger = makeTriggerBattle('cost_limit');
assert.ok(costTrigger.user.field.reduce((sum,c) => sum + c.cost,0) <= 10,'cost-limit trigger reduces field cost to ten or less');

const bounceTrigger = makeTriggerBattle('bounce');
assert.equal(bounceTrigger.user.field.length,2,'bounce trigger removes one field card');
assert.equal(bounceTrigger.user.hand.some(c => c.currentPower === 9000),true,'bounce trigger returns the strongest card to hand');

const stopTrigger = makeTriggerBattle('stop_attacks');
assert.equal(stopTrigger.user.field.every(c => c.attacked),true,'stop trigger prevents all remaining attacks this turn');

console.log('VOCALU engine tests: OK');
