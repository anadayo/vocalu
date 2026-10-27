'use strict';
const assert = require('assert');
global.self = global;
require('../js/song-media.js');
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
assert.equal(global.VocaluCatalog.cards.filter(c => c.thumbnailVerified && c.thumbnailUrl).length, 300, 'all cards have verified artwork');
assert.equal(global.VocaluCatalog.producers.filter(c => c.trigger && c.trigger.type).length, 10, 'half of producers have reversal triggers');
assert.equal(global.VocaluCatalog.singers.filter(c => c.trigger && c.trigger.type).length, 20, 'half of singers have reversal triggers');
assert.equal(global.VocaluCatalog.producers.filter(c => c.abilities && c.abilities.length).length, 20, 'all producers have support effects');
assert.ok(global.VocaluCatalog.producers.some(c => c.abilities.length > 1), 'some producers have multi-line support effects');
assert.equal(global.VocaluCatalog.producers.every(c => c.cost === 0), true, 'all producer cards cost zero');
assert.deepEqual([...new Set(global.VocaluCatalog.cards.filter(c => c.trigger).map(c => c.trigger.type))].sort(), ['bounce','destroy_one','discard_one','heal_one','stop_attacks'].sort(), 'support trigger pool includes reversal effects');
assert.ok(global.VocaluCatalog.songs.filter(c => c.cost >= 6).every(c => c.abilities && c.abilities.length), 'all high-cost songs have an ability');
assert.ok(global.VocaluCatalog.songs.filter(c => c.cost < 6).every(c => !c.abilities.length), 'low-cost songs do not receive high-cost abilities');
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

const deck = global.VocaluCatalog.songs.slice(0,20).map(c => ({...c,cost:1,power:3000,abilities:[]}));
const battle = E.makeBattle(deck, deck, () => 0.2);
assert.equal(battle.user.life,5);
assert.equal(battle.user.hand.length,3,'opening hand has three cards');
assert.equal(battle.cpu.hand.length,2,'second player waits with two cards before the opening turn');
assert.equal(battle.user.lifeCards.length,5,'five shuffled cards are placed face down as life');
assert.equal(battle.user.deck.length,12,'opening hand and life are removed from the 20-card deck');
assert.equal(battle.user.maxCost,1);
const secondPlayerOpening = E.makeBattle(deck, deck, () => 0.2);
E.endTurn(secondPlayerOpening,'user');
assert.equal(secondPlayerOpening.cpu.hand.length,4,'second player starts the first turn with four cards after the two-card draw');
assert.equal(secondPlayerOpening.cpu.deck.length,11,'second-player opening bonus draws exactly two cards');
assert.equal(secondPlayerOpening.cpu.maxCost,2,'second player starts with one extra maximum cost');
assert.equal(secondPlayerOpening.cpu.cost,2,'second player can spend both opening cost points');
E.endTurn(secondPlayerOpening,'cpu');
E.endTurn(secondPlayerOpening,'user');
assert.equal(secondPlayerOpening.cpu.hand.length,5,'second player draws only one card on later turns');
assert.equal(secondPlayerOpening.cpu.maxCost,3,'second-player cost increases normally after the opening bonus');
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

const strongDeck = global.VocaluCatalog.songs.slice(0,20).map(c => ({...c,cost:1,power:9000,abilities:[]}));
const weakDeck = global.VocaluCatalog.songs.slice(20,40).map(c => ({...c,cost:1,power:1000,abilities:[]}));
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
E.attack(restedGuard,'cpu',0,'life',null,0);
assert.equal(restedGuard.user.life,5,'a REST card can guard an attack aimed at life');
assert.equal(restedGuard.user.field.length,0,'REST power penalty applies when guarding life');
assert.equal(restedGuard.cpu.field.length,1,'the attacker survives the weaker REST life guard');

const intercept = E.makeBattle(strongDeck, weakDeck, () => 0.1);
intercept.cpu.field.push({...weakDeck[0],currentPower:1500,attacked:false});
intercept.user.field.push({...strongDeck[0],currentPower:3000,attacked:true},{...strongDeck[1],currentPower:1000,attacked:false});
intercept.active = 'cpu';
E.attack(intercept,'cpu',0,'song',0,1);
assert.equal(intercept.user.field.some(c=>c.currentPower===3000),true,'an ACTIVE card can protect a targeted REST card');
assert.equal(intercept.user.discard.some(c=>c.currentPower===1000),true,'the ACTIVE guard receives the attack');
assert.equal(intercept.lastImpact.type,'knockout','destroying a battle card exposes the knockout animation state');

const equalPowerBattle = E.makeBattle(strongDeck, weakDeck, () => 0.1);
equalPowerBattle.user.field = [{...strongDeck[0],currentPower:3000,attacked:false}];
equalPowerBattle.cpu.field = [{...weakDeck[0],currentPower:4000,attacked:true}];
E.attack(equalPowerBattle,'user',0,'song',0,null);
assert.equal(equalPowerBattle.cpu.field.length,0,'equal-power attack destroys the defending REST card');
assert.equal(equalPowerBattle.user.field.length,0,'equal-power attack also destroys the attacker');
assert.equal(equalPowerBattle.user.discard.length,1,'equal-power attacker is sent to discard');
assert.equal(equalPowerBattle.lastImpact.type,'clash','equal-power attack exposes the clash animation state');

const equalPowerGuard = E.makeBattle(strongDeck, weakDeck, () => 0.1);
equalPowerGuard.user.field = [{...strongDeck[0],currentPower:3000,attacked:false}];
equalPowerGuard.cpu.field = [{...weakDeck[0],currentPower:3000,attacked:false}];
E.attack(equalPowerGuard,'user',0,'life',null,0);
assert.equal(equalPowerGuard.cpu.field.length,0,'equal-power attack destroys a life guard');
assert.equal(equalPowerGuard.user.field.length,0,'equal-power guard battle also destroys the attacker');
assert.equal(equalPowerGuard.user.discard.length,1,'equal-power guard battle sends the attacker to discard');
assert.equal(equalPowerGuard.cpu.life,5,'a defeated equal-power guard still protects life');

const activeTarget = E.makeBattle(strongDeck, weakDeck, () => 0.1);
activeTarget.user.field.push({...strongDeck[0],currentPower:9000,attacked:false});
activeTarget.cpu.field.push({...weakDeck[0],currentPower:1000,attacked:false});
assert.throws(()=>E.attack(activeTarget,'user',0,'song',0,null),/ACTIVE状態/,'an active battle card cannot be selected as an attack target');
assert.equal(activeTarget.user.field[0].attacked,false,'an invalid active target does not consume the attack');

const restedIntercept = E.makeBattle(strongDeck, weakDeck, () => 0.1);
restedIntercept.cpu.field.push({...weakDeck[0],currentPower:1500,attacked:false});
restedIntercept.user.field.push({...strongDeck[0],currentPower:3000,attacked:true},{...strongDeck[1],currentPower:2000,attacked:true});
restedIntercept.active = 'cpu';
assert.throws(()=>E.attack(restedIntercept,'cpu',0,'song',0,1),/REST状態/,'another REST card cannot protect a targeted REST card');
assert.equal(restedIntercept.cpu.field[0].attacked,false,'an invalid REST intercept does not consume the attack');

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
assert.equal(equipment.lastImpact.type,'tagteam','equipping a singer exposes the tag-team animation state');
E.playCard(equipment,'user',0,0);
assert.equal(equipment.user.field[0].currentPower,10500,'replacing equipment removes the previous boost');
assert.equal(equipment.user.discard.length,1,'replaced singer is discarded');

const producerDraw = E.makeBattle(strongDeck, weakDeck, () => 0.1);
producerDraw.user.cost = 10;
producerDraw.user.hand = [{...global.VocaluCatalog.producers.find(c => c.abilities.some(a => a.type === 'draw_cards' && a.count === 2))}];
const producerDrawDeckBefore = producerDraw.user.deck.length;
E.playCard(producerDraw,'user',0,0);
assert.equal(producerDraw.user.hand.length,2,'producer draw support draws two cards');
assert.equal(producerDraw.user.deck.length,producerDrawDeckBefore-2,'producer draw support removes two cards from deck');
assert.equal(producerDraw.user.discard.some(c => c.type === 'producer'),true,'used producer is discarded');
producerDraw.user.hand.unshift({...global.VocaluCatalog.producers[1]});
assert.throws(()=>E.playCard(producerDraw,'user',0,0),/1ターンに1枚/,'only one producer can be used each turn');

const producerScout = E.makeBattle(strongDeck, weakDeck, () => 0.1);
producerScout.user.hand = [{...global.VocaluCatalog.producers.find(c => c.abilities.some(a => a.type === 'reveal_top_cost_song'))}];
producerScout.user.deck = [{...strongDeck[0],cost:1},...producerScout.user.deck];
assert.doesNotThrow(()=>E.playCard(producerScout,'user',0,0),'a zero-cost producer can be used on the first player opening turn');
assert.equal(producerScout.user.hand.some(c => c.type === 'song' && c.cost === 1),true,'zero-cost producer adds a revealed one-cost song to hand');
assert.equal(producerScout.lastSupport.revealed.outcome,'hand','matching deck-top reveal reports the hand destination to the UI');
assert.equal(producerScout.lastSupport.revealed.cardId,strongDeck[0].id,'matching deck-top reveal reports the exact card to the UI');

const producerMiss = E.makeBattle(strongDeck, weakDeck, () => 0.1);
producerMiss.user.hand = [{...global.VocaluCatalog.producers.find(c => c.abilities.some(a => a.type === 'reveal_top_cost_song'))}];
producerMiss.user.deck = [{...strongDeck[0],cost:2},...producerMiss.user.deck];
const missDeckSize = producerMiss.user.deck.length;
E.playCard(producerMiss,'user',0,0);
assert.equal(producerMiss.user.hand.length,0,'a revealed nonmatching song is not added to hand');
assert.equal(producerMiss.user.deck.length,missDeckSize,'a revealed nonmatching song moves to the bottom without changing deck size');
assert.equal(producerMiss.lastSupport.revealed.outcome,'bottom','nonmatching deck-top reveal reports the bottom-deck destination to the UI');

const producerPower = E.makeBattle(strongDeck, weakDeck, () => 0.1);
producerPower.user.cost = 10;
producerPower.user.field = [{...strongDeck[0],currentPower:3000,turnPowerBonus:0,attacked:false}];
producerPower.user.hand = [{...global.VocaluCatalog.producers.find(c => c.abilities.some(a => a.type === 'power_all'))}];
const baseProducerPower = E.effectivePower(producerPower.user.field[0]);
E.playCard(producerPower,'user',0,0);
assert.ok(E.effectivePower(producerPower.user.field[0]) > baseProducerPower,'producer power support increases power this turn');
E.endTurn(producerPower,'user');
assert.equal(E.effectivePower(producerPower.user.field[0]),baseProducerPower,'producer power support expires at end of turn');

function makeTriggerBattle(type) {
  const support = global.VocaluCatalog.cards.find(c => c.type !== 'song' && c.trigger && c.trigger.type === type);
  const state = E.makeBattle(strongDeck, weakDeck, () => 0.1);
  state.cpu.life = 2;
  state.cpu.lifeCards = [{...support}];
  state.user.field = [
    {...strongDeck[0],cost:6,currentPower:9000,attacked:false},
    {...strongDeck[1],cost:5,currentPower:8000,attacked:false},
    {...strongDeck[2],cost:4,currentPower:7000,attacked:false}
  ];
  E.attack(state,'user',0,'life',null,null);
  assert.equal(state.cpu.life,type === 'heal_one' ? 2 : 1,type + ' trigger damage resolves');
  assert.equal(state.cpu.hand.some(c => c.id === support.id),true,type + ' life support enters hand');
  assert.equal(state.cpu.discard.some(c => c.id === support.id),false,type + ' life support does not enter discard');
  assert.equal(state.lastTrigger.type,type,type + ' trigger is reported to the UI');
  assert.equal(state.lastTrigger.cardId,support.id,type + ' trigger reports the exact revealed card');
  return state;
}

const destroyTrigger = makeTriggerBattle('destroy_one');
assert.equal(destroyTrigger.user.field.length,2,'destroy-one trigger removes one attacking field card');
assert.equal(destroyTrigger.user.field.some(c => c.currentPower === 9000),false,'destroy-one trigger removes the strongest card');

const healTrigger = makeTriggerBattle('heal_one');
assert.equal(healTrigger.cpu.life,2,'heal trigger restores one life after damage');
assert.equal(healTrigger.cpu.lifeCards.length,1,'heal trigger places a deck card into life');

const discardState = E.makeBattle(strongDeck, weakDeck, () => 0.1);
const attackerHandBefore = discardState.user.hand.length;
discardState.cpu.life = 2;
discardState.cpu.lifeCards = [{...global.VocaluCatalog.cards.find(c => c.type !== 'song' && c.trigger && c.trigger.type === 'discard_one')}];
discardState.user.field = [{...strongDeck[0],currentPower:9000,attacked:false}];
E.attack(discardState,'user',0,'life',null,null);
assert.equal(discardState.user.hand.length,attackerHandBefore-1,'discard trigger removes one attacking hand card');

const bounceTrigger = makeTriggerBattle('bounce');
assert.equal(bounceTrigger.user.field.length,2,'bounce trigger removes one field card');
assert.equal(bounceTrigger.user.hand.some(c => c.currentPower === 9000),true,'bounce trigger returns the strongest card to hand');

const stopTrigger = makeTriggerBattle('stop_attacks');
assert.equal(stopTrigger.user.field.every(c => c.attacked),true,'stop trigger prevents all remaining attacks this turn');

function songWithAbility(type, overrides) {
  return {...strongDeck[0],cost:6,power:7000,abilities:[{type,label:type,text:type}],...overrides};
}

const drawBattle = E.makeBattle(strongDeck, weakDeck, () => 0.1);
drawBattle.user.cost = 10;
drawBattle.user.hand = [songWithAbility('draw_one')];
const drawDeckBefore = drawBattle.user.deck.length;
E.playCard(drawBattle,'user',0,0);
assert.equal(drawBattle.user.hand.length,1,'draw-one ability replaces the played card with one draw');
assert.equal(drawBattle.user.deck.length,drawDeckBefore-1,'draw-one ability consumes the top deck card');
assert.equal(drawBattle.lastImpact.type,'entry','high-cost songs expose the entry animation state');

const readyBattle = E.makeBattle(strongDeck, weakDeck, () => 0.1);
readyBattle.user.cost = 10;
readyBattle.user.hand = [songWithAbility('ready_entry')];
E.playCard(readyBattle,'user',0,0);
assert.equal(readyBattle.user.field[0].attacked,false,'ready-entry song can attack immediately above two life');

const encoreBattle = E.makeBattle(strongDeck, weakDeck, () => 0.1);
encoreBattle.user.field = [{...songWithAbility('encore_on_ko'),currentPower:7000,attacked:false,encoreUsed:false}];
encoreBattle.cpu.field = [{...weakDeck[0],currentPower:1000,attacked:true}];
E.attack(encoreBattle,'user',0,'song',0,null);
assert.equal(encoreBattle.user.field[0].attacked,false,'encore song becomes active after a knockout');
assert.equal(encoreBattle.user.field[0].encoreUsed,true,'encore is limited to once per turn');
assert.equal(encoreBattle.lastImpact.type,'encore','encore exposes its special animation state');

console.log('VOCALU engine tests: OK');
