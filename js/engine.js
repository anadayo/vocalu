(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VocaluEngine = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RARITY_WEIGHTS = { N: 55, R: 28, SR: 12, UR: 5 };
  var RARITIES = ['N', 'R', 'SR', 'UR'];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function randomItem(items, rng) { return items[Math.floor(rng() * items.length)]; }
  function weightedRarity(rng) {
    var roll = rng() * 100;
    var total = 0;
    for (var i = 0; i < RARITIES.length; i += 1) {
      total += RARITY_WEIGHTS[RARITIES[i]];
      if (roll < total) return RARITIES[i];
    }
    return 'N';
  }

  function openPack(catalog, rng, forced) {
    rng = rng || Math.random;
    var cards = [];
    for (var i = 0; i < 5; i += 1) {
      var rarity = forced && forced[i] ? forced[i] : weightedRarity(rng);
      if (i === 4 && cards.every(function (c) { return c.rarity === 'N'; })) rarity = 'R';
      var pool = catalog.filter(function (card) { return card.rarity === rarity; });
      if (!pool.length) pool = catalog;
      cards.push(clone(randomItem(pool, rng)));
    }
    return cards;
  }

  function openFivePacks(catalog, rng, forcedRarities) {
    var result = [];
    for (var i = 0; i < 5; i += 1) {
      result = result.concat(openPack(catalog, rng, forcedRarities && forcedRarities[i]));
    }
    return result;
  }

  function autoBuild(cards) {
    var scored = cards.map(function (card, index) {
      var typeScore = card.type === 'song' ? 8000 : card.type === 'producer' ? 3000 : 2000;
      var curveScore = card.type === 'song' && card.cost <= 2 ? 5000 : 0;
      return { card: card, index: index, score: typeScore + curveScore + (card.power || card.boost || 0) / 2 - (card.cost || 0) * 900 };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var selected = scored.slice(0, 20);
    var songCount = selected.filter(function (x) { return x.card.type === 'song'; }).length;
    if (songCount < 12) {
      var songs = scored.filter(function (x) { return x.card.type === 'song' && selected.indexOf(x) < 0; });
      var nonSongs = selected.filter(function (x) { return x.card.type !== 'song'; }).sort(function (a, b) { return a.score - b.score; });
      while (songCount < 12 && songs.length && nonSongs.length) {
        selected.splice(selected.indexOf(nonSongs.shift()), 1, songs.shift());
        songCount += 1;
      }
    }
    var cheapSongs = scored.filter(function (x) { return x.card.type === 'song' && x.card.cost <= 2 && selected.indexOf(x) < 0; });
    var selectedCheap = selected.filter(function (x) { return x.card.type === 'song' && x.card.cost <= 2; }).length;
    var replaceable = selected.filter(function (x) { return x.card.type === 'song' && x.card.cost > 3; }).sort(function (a, b) { return a.score - b.score; });
    while (selectedCheap < 5 && cheapSongs.length && replaceable.length) {
      selected.splice(selected.indexOf(replaceable.shift()), 1, cheapSongs.shift());
      selectedCheap += 1;
    }
    return selected.map(function (x) { return x.index; });
  }

  function makeBattle(deckCards, cpuCards, rng) {
    rng = rng || Math.random;
    function player(cards) {
      var deck = clone(cards).sort(function () { return rng() - 0.5; });
      var hand = deck.splice(0, 3);
      var lifeCards = deck.splice(0, 3);
      return { life: 3, lifeCards: lifeCards, deck: deck, hand: hand, field: [], discard: [], maxCost: 0, cost: 0, producerUsed: false };
    }
    var state = { turn: 0, active: 'user', phase: 'main', winner: null, actionCount: 0, log: [] };
    state.user = player(deckCards);
    state.cpu = player(cpuCards);
    startTurn(state, 'user', false);
    return state;
  }

  function startTurn(state, side, drawCard) {
    var p = state[side];
    state.turn += side === 'user' ? 1 : 0;
    state.active = side;
    state.phase = 'main';
    p.maxCost = Math.min(10, p.maxCost + 1);
    p.cost = p.maxCost;
    p.producerUsed = false;
    p.field.forEach(function (song) { song.attacked = false; });
    if (drawCard !== false && p.deck.length) p.hand.push(p.deck.shift());
    state.log.unshift((side === 'user' ? 'あなた' : 'CPU') + 'のターン');
    validate(state);
  }

  function playCard(state, side, handIndex, replaceIndex) {
    ensureTurn(state, side);
    var p = state[side];
    var card = p.hand[handIndex];
    if (!card) throw new Error('カードが見つかりません');
    if ((card.cost || 0) > p.cost) throw new Error('コストが足りません');
    if (card.type === 'song') {
      if (p.field.length >= 3 && (replaceIndex == null || !p.field[replaceIndex])) throw new Error('入れ替える楽曲を選んでください');
      p.cost -= card.cost;
      p.hand.splice(handIndex, 1);
      var song = clone(card);
      song.currentPower = song.power;
      song.attacked = p.life !== 1;
      song.singer = null;
      if (p.field.length >= 3) p.discard.push(p.field.splice(replaceIndex, 1)[0]);
      p.field.push(song);
      state.log.unshift(card.name + ' を召喚' + (p.life === 1 ? ' · ライフ1で即攻撃可能' : ''));
    } else if (card.type === 'producer') {
      if (p.producerUsed) throw new Error('ボカロPは1ターンに1枚までです');
      p.cost -= card.cost;
      p.producerUsed = true;
      p.hand.splice(handIndex, 1);
      var owned = p.field.some(function (song) { return song.producer === card.name; });
      p.field.forEach(function (song) { song.currentPower += owned ? card.bonus * 2 : card.bonus; });
      p.discard.push(card);
      state.log.unshift(card.name + ' のプロデュース効果');
    } else {
      if (!p.field.length) throw new Error('装備する楽曲がありません');
      var target = replaceIndex == null ? 0 : replaceIndex;
      if (!p.field[target]) throw new Error('装備先が見つかりません');
      p.cost -= card.cost;
      p.hand.splice(handIndex, 1);
      if (p.field[target].singer) {
        p.field[target].currentPower -= p.field[target].singer.boost || 0;
        p.discard.push(p.field[target].singer);
      }
      p.field[target].singer = card;
      p.field[target].currentPower += card.boost;
      state.log.unshift(card.name + ' を装備');
    }
    bump(state);
    return state;
  }

  function attack(state, side, attackerIndex, targetType, targetIndex, guardIndex) {
    ensureTurn(state, side);
    var p = state[side];
    var enemy = state[side === 'user' ? 'cpu' : 'user'];
    var attacker = p.field[attackerIndex];
    if (!attacker || attacker.attacked) throw new Error('この楽曲は攻撃できません');
    attacker.attacked = true;
    state.phase = 'attack';
    if (targetType === 'song') {
      var target = enemy.field[targetIndex];
      if (!target) throw new Error('攻撃対象が見つかりません');
      if (attacker.currentPower >= target.currentPower) enemy.discard.push(enemy.field.splice(targetIndex, 1)[0]);
      if (attacker.currentPower <= target.currentPower) p.discard.push(p.field.splice(attackerIndex, 1)[0]);
      state.log.unshift(attacker.name + ' が楽曲へ攻撃');
    } else {
      if (guardIndex != null && enemy.field[guardIndex]) {
        var guard = enemy.field[guardIndex];
        if (attacker.currentPower >= guard.currentPower) enemy.discard.push(enemy.field.splice(guardIndex, 1)[0]);
        if (attacker.currentPower <= guard.currentPower) p.discard.push(p.field.splice(attackerIndex, 1)[0]);
        state.log.unshift(guard.name + ' でガード');
      } else {
        enemy.life -= 1;
        resolveLifeCard(state, side === 'user' ? 'cpu' : 'user', side);
        state.log.unshift(attacker.name + ' がライフへ攻撃');
        if (enemy.life <= 0) state.winner = side;
      }
    }
    bump(state);
    return state;
  }

  function resolveLifeCard(state, defendingSide, attackingSide) {
    var defender = state[defendingSide];
    var attacker = state[attackingSide];
    if (!defender.lifeCards || !defender.lifeCards.length) return null;
    var lifeCard = defender.lifeCards.pop();
    defender.discard.push(lifeCard);
    if (defender.life <= 0 || lifeCard.type === 'song' || !lifeCard.trigger) return null;

    var effect = lifeCard.trigger.type;
    if (effect === 'destroy_all') {
      while (attacker.field.length) attacker.discard.push(attacker.field.pop());
    } else if (effect === 'cost_limit') {
      while (fieldCost(attacker.field) > 10 && attacker.field.length) {
        var highestCost = 0;
        for (var i = 1; i < attacker.field.length; i += 1) {
          if ((attacker.field[i].cost || 0) > (attacker.field[highestCost].cost || 0)) highestCost = i;
        }
        attacker.discard.push(attacker.field.splice(highestCost, 1)[0]);
      }
    } else if (effect === 'bounce') {
      if (attacker.field.length) {
        var highestPower = 0;
        for (var j = 1; j < attacker.field.length; j += 1) {
          if ((attacker.field[j].currentPower || 0) > (attacker.field[highestPower].currentPower || 0)) highestPower = j;
        }
        var returned = attacker.field.splice(highestPower, 1)[0];
        returned.attacked = true;
        attacker.hand.push(returned);
      }
    } else if (effect === 'stop_attacks') {
      attacker.field.forEach(function (song) { song.attacked = true; });
    }

    state.lastTrigger = { side: defendingSide, cardName: lifeCard.name, label: lifeCard.trigger.label, text: lifeCard.trigger.text, type: effect };
    state.log.unshift('TRIGGER · ' + lifeCard.name + '「' + lifeCard.trigger.label + '」');
    return state.lastTrigger;
  }

  function fieldCost(field) {
    return field.reduce(function (total, card) { return total + (card.cost || 0); }, 0);
  }

  function endTurn(state, side) {
    ensureTurn(state, side);
    if (state.winner) return state;
    startTurn(state, side === 'user' ? 'cpu' : 'user', true);
    return state;
  }

  function cpuMainPhase(state) {
    if (state.active !== 'cpu' || state.winner) return state;
    var safety = 0;
    while (safety < 20) {
      safety += 1;
      var playable = state.cpu.hand.map(function (c, i) { return { card: c, index: i }; }).filter(function (x) {
        return (x.card.cost || 0) <= state.cpu.cost && (x.card.type !== 'producer' || !state.cpu.producerUsed) && (x.card.type !== 'singer' || state.cpu.field.length);
      });
      if (!playable.length) break;
      playable.sort(function (a, b) { return (b.card.power || b.card.boost || b.card.bonus || 0) - (a.card.power || a.card.boost || a.card.bonus || 0); });
      try { playCard(state, 'cpu', playable[0].index, state.cpu.field.length >= 3 ? 0 : 0); } catch (ignore) { break; }
    }
    return state;
  }

  function cpuTurn(state, rng, userGuardIndex) {
    rng = rng || Math.random;
    if (state.active !== 'cpu' || state.winner) return state;
    cpuMainPhase(state);
    var attackers = state.cpu.field.slice();
    var guardAvailable = userGuardIndex;
    attackers.forEach(function (song) {
      var index = state.cpu.field.indexOf(song);
      if (index < 0 || song.attacked || state.winner) return;
      var weakTarget = state.user.field.findIndex(function (target) { return song.currentPower >= target.currentPower; });
      if (weakTarget >= 0 && state.user.life > 1) attack(state, 'cpu', index, 'song', weakTarget);
      else {
        attack(state, 'cpu', index, 'life', null, guardAvailable);
        guardAvailable = null;
      }
    });
    if (!state.winner) endTurn(state, 'cpu');
    return state;
  }

  function ensureTurn(state, side) {
    if (state.winner) throw new Error('対戦は終了しています');
    if (state.active !== side) throw new Error('現在のターンではありません');
  }
  function bump(state) { state.actionCount += 1; if (state.actionCount > 500) throw new Error('安全のため対戦を停止しました'); validate(state); }
  function validate(state) {
    ['user', 'cpu'].forEach(function (side) {
      if (state[side].field.length > 3) throw new Error('場の楽曲上限を超えました');
      if (state[side].cost < 0) throw new Error('コスト計算エラーです');
    });
    return true;
  }

  return { RARITY_WEIGHTS: RARITY_WEIGHTS, openPack: openPack, openFivePacks: openFivePacks, autoBuild: autoBuild, makeBattle: makeBattle, playCard: playCard, attack: attack, endTurn: endTurn, cpuMainPhase: cpuMainPhase, cpuTurn: cpuTurn, validate: validate };
}));
