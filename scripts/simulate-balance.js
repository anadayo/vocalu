'use strict';

const fs = require('fs');
const path = require('path');
global.self = global;
require('../js/song-media.js');
require('../js/catalog.js');
const E = require('../js/engine.js');

const C = global.VocaluCatalog;
const GAMES = Math.max(100, Number(process.argv[2]) || 10000);
const OUT = path.join(__dirname, '..', 'reports', 'vocalu-balance-2026-10-29.md');

function seeded(seed) {
  let value = seed >>> 0;
  return function () {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shuffled(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildDeck(cards, rng) {
  const songs = cards.filter(card => card.type === 'song');
  const songPicks = [];
  for (let cost = 1; cost <= 7; cost += 1) {
    songPicks.push(...shuffled(songs.filter(card => card.cost === cost), rng).slice(0, 2));
  }
  return shuffled(songPicks
    .concat(shuffled(cards.filter(card => card.type === 'producer'), rng).slice(0, 3))
    .concat(shuffled(cards.filter(card => card.type === 'singer'), rng).slice(0, 3)), rng);
}

function legacyTriggers(cards) {
  const supportTypes = ['destroy_one', 'heal_one', 'discard_one', 'bounce', 'stop_attacks'];
  const songTypes = ['conditional_play', 'draw_one', 'stop_attacks'];
  const templates = Object.fromEntries(C.cards.filter(card => card.trigger).map(card => [card.trigger.type, card.trigger]));
  cards.forEach(card => { card.trigger = null; });
  cards.filter(card => card.type === 'song' && card.cost >= 6).forEach((card, index) => {
    card.trigger = {...templates[songTypes[index % songTypes.length]]};
  });
  cards.filter(card => card.type === 'producer').forEach((card, index) => {
    if (index % 2 === 0) card.trigger = {...templates[supportTypes[(index / 2) % supportTypes.length]]};
  });
  cards.filter(card => card.type === 'singer').forEach((card, index) => {
    if (index % 2 === 0) card.trigger = {...templates[supportTypes[(index / 2) % supportTypes.length]]};
  });
}

function variantCards(name) {
  const cards = JSON.parse(JSON.stringify(C.cards));
  if (name === 'A' || name === 'B') legacyTriggers(cards);
  if (name === 'A' || name === 'B' || name === 'C') {
    cards.filter(card => card.type === 'song' && card.cost >= 3 && card.cost <= 6).forEach(card => { card.abilities = []; });
  }
  if (name !== 'E') {
    cards.filter(card => card.type === 'producer').forEach(card => {
      card.abilities = (card.abilities || []).filter(ability => ability.type !== 'creator_synergy');
    });
  }
  return cards;
}

function guardFor(state, defendingSide, attackerPower, targetType, targetIndex) {
  const defender = state[defendingSide];
  if (targetType === 'song') {
    const options = defender.field.map((card, index) => ({card, index})).filter(item => item.index !== targetIndex && !item.card.attacked);
    options.sort((a, b) => E.effectivePower(a.card) - E.effectivePower(b.card));
    return options.length && E.effectivePower(defender.field[targetIndex]) > E.effectivePower(options[0].card) ? options[0].index : null;
  }
  if (defender.life > 2) return null;
  const options = defender.field.map((card, index) => ({card, index}));
  options.sort((a, b) => E.effectivePower(a.card) - E.effectivePower(b.card));
  return options.length && (defender.life === 1 || E.effectivePower(options[0].card) >= attackerPower) ? options[0].index : null;
}

function playAutomatedTurn(state, side, metrics) {
  const player = state[side];
  const enemySide = side === 'user' ? 'cpu' : 'user';
  const available = player.cost;
  const playableAtStart = player.hand.some(card => (card.cost || 0) <= player.cost && (card.type !== 'singer' || player.field.length));
  if (!playableAtStart && !player.field.some(card => !card.attacked)) metrics.handAccidents += 1;
  const supportBefore = player.discard.filter(card => card.type === 'producer').length;
  E.cpuMainPhase(state, 'expert', side);
  metrics.supportUses += player.discard.filter(card => card.type === 'producer').length - supportBefore;
  metrics.costAvailable += available;
  metrics.costSpent += Math.max(0, available - player.cost);
  let safety = 0;
  while (!state.winner && safety < 8) {
    safety += 1;
    const attackerIndex = player.field.findIndex(card => !card.attacked);
    if (attackerIndex < 0) break;
    const attacker = player.field[attackerIndex];
    const targets = state[enemySide].field.map((card, index) => ({card, index})).filter(item => item.card.attacked && E.effectivePower(attacker) >= E.effectivePower(item.card));
    targets.sort((a, b) => E.effectivePower(b.card) - E.effectivePower(a.card));
    const targetType = targets.length && state[enemySide].life > 1 && state.turn < 12 ? 'song' : 'life';
    const targetIndex = targetType === 'song' ? targets[0].index : null;
    const guard = guardFor(state, enemySide, E.effectivePower(attacker), targetType, targetIndex);
    E.attack(state, side, attackerIndex, targetType, targetIndex, guard);
    if (state.lastTrigger) {
      metrics.triggers[state.lastTrigger.type] = (metrics.triggers[state.lastTrigger.type] || 0) + 1;
      state.lastTrigger = null;
    }
  }
  if (!state.winner) E.endTurn(state, side);
}

function simulateVariant(name, seed) {
  const cards = variantCards(name);
  const rng = seeded(seed);
  const metrics = {firstWins:0,secondWins:0,turns:0,early:0,reversals:0,stalls:0,errors:0,triggers:{},costAvailable:0,costSpent:0,supportUses:0,handAccidents:0};
  for (let game = 0; game < GAMES; game += 1) {
    try {
      const battle = E.makeBattle(buildDeck(cards, rng), buildDeck(cards, rng), rng, {secondPlayerCostBonusTurns:name === 'A' ? 1 : 3});
      E.setLeaders(battle, game % 2 ? 'teto' : 'miku', game % 2 ? 'miku' : 'teto');
      const trailed = {user:false,cpu:false};
      let rounds = 0;
      while (!battle.winner && rounds < 30) {
        const side = battle.active;
        if (battle.user.life < battle.cpu.life) trailed.user = true;
        if (battle.cpu.life < battle.user.life) trailed.cpu = true;
        playAutomatedTurn(battle, side, metrics);
        rounds = Math.max(battle.user.turnsStarted, battle.cpu.turnsStarted);
      }
      if (!battle.winner) metrics.stalls += 1;
      else {
        if (battle.winner === 'user') metrics.firstWins += 1;
        else metrics.secondWins += 1;
        if (trailed[battle.winner]) metrics.reversals += 1;
        if (rounds <= 3) metrics.early += 1;
      }
      metrics.turns += rounds;
    } catch (error) {
      metrics.errors += 1;
    }
  }
  return metrics;
}

function percent(value, total) { return (value / Math.max(1, total) * 100).toFixed(1) + '%'; }
const descriptions = {
  A:'既存相当（後攻初回のみ+1・旧トリガー・中コスト効果なし）',
  B:'後攻1〜3ターン+1',
  C:'B＋新トリガー配分',
  D:'C＋中コスト登場時効果',
  E:'D＋ボカロP制作者シナジー'
};
const results = ['A','B','C','D','E'].map(name => ({name,metrics:simulateVariant(name, 20261029)}));
const lines = [
  '# VOCALU バランスシミュレーション', '',
  `- 実行日: 2026-10-29`, `- 各条件: ${GAMES.toLocaleString('ja-JP')}試合`, '- 固定シード・同一AI強度・20枚デッキ・ライフ5', '',
  '|条件|内容|先攻勝率|後攻勝率|平均決着ターン|3ターン以内|逆転勝利|停止|エラー|コスト使用率|サポート/試合|',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
];
results.forEach(({name,metrics:m}) => {
  const completed = m.firstWins + m.secondWins;
  lines.push(`|${name}|${descriptions[name]}|${percent(m.firstWins,completed)}|${percent(m.secondWins,completed)}|${(m.turns/GAMES).toFixed(2)}|${percent(m.early,completed)}|${percent(m.reversals,completed)}|${m.stalls}|${m.errors}|${percent(m.costSpent,m.costAvailable)}|${(m.supportUses/GAMES).toFixed(2)}|`);
});
lines.push('', '## トリガー発動数');
results.forEach(({name,metrics:m}) => lines.push(`- ${name}: ${Object.entries(m.triggers).map(([type,count])=>`${type} ${count}`).join(' / ') || 'なし'}`));
lines.push('', '## 注記', '- 対人の最適プレイを保証するものではなく、同一AI条件で変更差を見る回帰シミュレーション。', '- 勝率目標45〜55%から外れる条件は、本番採用前に追加調整する。', '- エラーまたは30ターン停止が1件でも発生した場合は原因調査対象とする。', '');
fs.mkdirSync(path.dirname(OUT), {recursive:true});
fs.writeFileSync(OUT, lines.join('\n'));
process.stdout.write(lines.join('\n'));
