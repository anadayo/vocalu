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
    function player(cards, openingSize, goingSecond) {
      var deck = clone(cards).sort(function () { return rng() - 0.5; });
      var hand = deck.splice(0, openingSize);
      var lifeCards = deck.splice(0, 5);
      return { life: 5, lifeCards: lifeCards, deck: deck, hand: hand, field: [], discard: [], maxCost: 0, cost: 0, producerUsed: false, leader: null, leaderAwakened: false, leaderSkillUsed: false, goingSecond: goingSecond, firstTurnStarted: false };
    }
    var state = { turn: 0, active: 'user', phase: 'main', winner: null, actionCount: 0, log: [], mulliganUsed: false, lastImpact: null };
    state.user = player(deckCards, 3, false);
    state.cpu = player(cpuCards, 2, true);
    startTurn(state, 'user', false);
    return state;
  }

  function setLeaders(state, userLeader, cpuLeader) {
    state.user.leader = userLeader === 'teto' ? 'teto' : 'miku';
    state.cpu.leader = cpuLeader === 'miku' ? 'miku' : 'teto';
    return state;
  }

  function mulligan(state, indexes, rng) {
    rng = rng || Math.random;
    if (state.mulliganUsed) throw new Error('マリガンは1ゲームに1回までです');
    if (state.turn !== 1 || state.active !== 'user' || state.actionCount !== 0) throw new Error('マリガンできるタイミングではありません');
    var unique = indexes.filter(function (index, position) { return indexes.indexOf(index) === position; }).sort(function (a, b) { return b - a; });
    if (unique.some(function (index) { return index < 0 || index >= state.user.hand.length; })) throw new Error('戻すカードを確認できません');
    var returned = unique.map(function (index) { return state.user.hand.splice(index, 1)[0]; });
    state.user.deck = state.user.deck.concat(returned).sort(function () { return rng() - 0.5; });
    while (returned.length && state.user.deck.length) {
      state.user.hand.push(state.user.deck.shift());
      returned.pop();
    }
    state.mulliganUsed = true;
    state.log.unshift('マリガン · ' + unique.length + '枚を引き直し');
    validate(state);
    return state;
  }

  function startTurn(state, side, drawCard) {
    var p = state[side];
    var secondPlayerOpening = p.goingSecond && !p.firstTurnStarted;
    state.turn += side === 'user' ? 1 : 0;
    state.active = side;
    state.phase = 'main';
    p.maxCost = Math.min(10, p.maxCost + 1 + (secondPlayerOpening ? 1 : 0));
    p.cost = p.maxCost;
    p.producerUsed = false;
    p.leaderSkillUsed = false;
    p.field.forEach(function (song) { song.attacked = false; song.encoreUsed = false; });
    var drawCount = drawCard === false ? 0 : secondPlayerOpening ? 2 : 1;
    drawCards(p, drawCount);
    if (secondPlayerOpening) state.log.unshift('後攻ボーナス · 葱COST +1');
    if (drawCount) state.log.unshift((secondPlayerOpening ? '後攻ボーナス · ' : '') + drawCount + '枚ドロー');
    p.firstTurnStarted = true;
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
      song.turnPowerBonus = 0;
      song.attacked = p.life > 2 && !hasAbility(song, 'ready_entry');
      song.encoreUsed = false;
      song.singer = null;
      if (p.leader === 'miku' && !p.leaderSkillUsed) {
        song.turnPowerBonus += p.leaderAwakened ? 1500 : 1000;
        p.leaderSkillUsed = true;
        state.log.unshift('初音ミク「FIRST STAGE」· POWER +' + (p.leaderAwakened ? 1500 : 1000));
      }
      if (p.field.length >= 3) p.discard.push(p.field.splice(replaceIndex, 1)[0]);
      p.field.push(song);
      if (hasAbility(song, 'draw_one') && p.deck.length) {
        p.hand.push(p.deck.shift());
        state.log.unshift(card.name + '「アンコール・ドロー」· 1枚ドロー');
      }
      if ((card.cost || 0) >= 6) {
        state.lastImpact = { type: 'entry', side: side, label: (song.abilities || []).map(function (ability) { return ability.label; }).join(' / ') || 'HIGH COST ENTRY' };
      }
      state.log.unshift(card.name + ' を召喚' + (!song.attacked ? ' · ACTIVEで登場' : ''));
    } else if (card.type === 'producer') {
      if (p.producerUsed) throw new Error('ボカロPは1ターンに1枚までです');
      p.cost -= card.cost;
      p.producerUsed = true;
      p.hand.splice(handIndex, 1);
      var supportEvent = { side: side, cardId: card.id, cardName: card.name, abilities: clone(card.abilities || []), revealed: null };
      (card.abilities || []).forEach(function (ability) {
        if (ability.type === 'draw_cards') {
          drawCards(p, ability.count || 1);
        } else if (ability.type === 'power_all') {
          p.field.forEach(function (song) { song.turnPowerBonus = (song.turnPowerBonus || 0) + (ability.amount || 0); });
        } else if (ability.type === 'power_one' && p.field.length) {
          var powerTarget = p.field[highestPowerIndex(p.field)];
          powerTarget.turnPowerBonus = (powerTarget.turnPowerBonus || 0) + (ability.amount || 0);
        } else if (ability.type === 'reveal_top_cost_song' && p.deck.length) {
          var revealed = p.deck.shift();
          if (revealed.type === 'song' && (revealed.cost || 0) <= (ability.maxCost || 1)) {
            p.hand.push(revealed);
            supportEvent.revealed = { cardId: revealed.id, outcome: 'hand', label: '手札に加える' };
            state.log.unshift('公開した ' + revealed.name + ' を手札に加えた');
          } else {
            p.deck.push(revealed);
            supportEvent.revealed = { cardId: revealed.id, outcome: 'bottom', label: 'デッキの下へ送る' };
            state.log.unshift('公開した ' + revealed.name + ' をデッキの下へ送った');
          }
        } else if (ability.type === 'destroy_all_enemy') {
          var enemy = state[side === 'user' ? 'cpu' : 'user'];
          var destroyed = enemy.field.splice(0, enemy.field.length);
          enemy.discard = enemy.discard.concat(destroyed);
          if (destroyed.length) state.lastImpact = { type: 'knockout', side: side === 'user' ? 'cpu' : 'user', label: 'ALL BREAK' };
        }
        state.log.unshift(card.name + '「' + ability.label + '」· ' + ability.text);
      });
      state.lastSupport = supportEvent;
      p.discard.push(card);
      state.log.unshift(card.name + ' をサポートとして使用 · DROPへ');
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
      state.lastImpact = { type: 'tagteam', side: side, label: 'TAG TEAM · ' + card.name };
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
    if (guardIndex != null && targetType === 'song' && guardIndex !== targetIndex) {
      if (!enemy.field[guardIndex]) throw new Error('ガードする楽曲が見つかりません');
      if (enemy.field[guardIndex].attacked) throw new Error('REST状態の楽曲はガードできません');
    } else if (guardIndex != null && targetType === 'life' && !enemy.field[guardIndex]) {
      throw new Error('ガードする楽曲が見つかりません');
    }
    if (targetType === 'song') {
      var attackTarget = enemy.field[targetIndex];
      if (!attackTarget) throw new Error('攻撃対象が見つかりません');
      if (!attackTarget.attacked) throw new Error('ACTIVE状態の楽曲は攻撃対象にできません');
    }
    if (p.leader === 'teto' && !p.leaderSkillUsed) {
      attacker.turnPowerBonus = (attacker.turnPowerBonus || 0) + (p.leaderAwakened ? 2000 : 1000);
      p.leaderSkillUsed = true;
      state.log.unshift('重音テト「REPEAT BEAT」· POWER +' + (p.leaderAwakened ? 2000 : 1000));
    }
    var attackPower = effectivePower(attacker);
    attacker.attacked = true;
    state.phase = 'attack';
    if (targetType === 'song') {
      var target = enemy.field[targetIndex];
      var defenderIndex = targetIndex;
      if (guardIndex != null && guardIndex !== targetIndex) {
        defenderIndex = guardIndex;
      }
      var defender = enemy.field[defenderIndex];
      var targetPower = effectivePower(defender);
      if (attackPower > targetPower) {
        enemy.discard.push(enemy.field.splice(defenderIndex, 1)[0]);
        state.lastImpact = { type: 'knockout', side: side === 'user' ? 'cpu' : 'user' };
      }
      if (attackPower < targetPower) p.discard.push(p.field.splice(attackerIndex, 1)[0]);
      if (attackPower === targetPower) {
        enemy.discard.push(enemy.field.splice(defenderIndex, 1)[0]);
        p.discard.push(p.field.splice(attackerIndex, 1)[0]);
        state.lastImpact = { type: 'clash', label: 'DOUBLE DROP' };
      }
      if (attackPower > targetPower) readyAfterKnockout(state, side, attacker);
      state.log.unshift(attacker.name + ' が ' + defender.name + ' へ攻撃' + (defenderIndex !== targetIndex ? ' · ACTIVEガード' : '') + (attackPower === targetPower ? ' · 相打ち' : ''));
    } else {
      if (guardIndex != null && enemy.field[guardIndex]) {
        var guard = enemy.field[guardIndex];
        var guardPower = effectivePower(guard);
        if (attackPower > guardPower) {
          enemy.discard.push(enemy.field.splice(guardIndex, 1)[0]);
          state.lastImpact = { type: 'knockout', side: side === 'user' ? 'cpu' : 'user' };
        }
        if (attackPower < guardPower) p.discard.push(p.field.splice(attackerIndex, 1)[0]);
        if (attackPower === guardPower) {
          enemy.discard.push(enemy.field.splice(guardIndex, 1)[0]);
          p.discard.push(p.field.splice(attackerIndex, 1)[0]);
          state.lastImpact = { type: 'clash', label: 'DOUBLE DROP' };
        }
        if (attackPower > guardPower) readyAfterKnockout(state, side, attacker);
        state.log.unshift(guard.name + ' でライフをガード' + (guard.attacked ? ' · REST補正 -1000' : '') + (attackPower === guardPower ? ' · 相打ち' : ''));
      } else {
        enemy.life -= 1;
        awakenLeader(state, side === 'user' ? 'cpu' : 'user');
        state.lastImpact = { type: 'life', side: side === 'user' ? 'cpu' : 'user' };
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
    defender.hand.push(lifeCard);
    if (defender.life <= 0 || !lifeCard.trigger) return null;

    if (lifeCard.type === 'song') {
      if (lifeCard.trigger.type !== 'conditional_play' || defender.life >= attacker.life) return null;
      defender.hand.pop();
      var song = clone(lifeCard);
      song.currentPower = song.power;
      song.turnPowerBonus = 0;
      song.attacked = false;
      song.encoreUsed = false;
      song.singer = null;
      if (defender.field.length >= 3) {
        var weakest = defender.field.reduce(function (index, card, current, field) {
          return effectivePower(card) < effectivePower(field[index]) ? current : index;
        }, 0);
        defender.discard.push(defender.field.splice(weakest, 1)[0]);
      }
      defender.field.push(song);
      state.lastTrigger = { side: defendingSide, cardId: lifeCard.id, cardName: lifeCard.name, label: lifeCard.trigger.label, text: lifeCard.trigger.text, type: lifeCard.trigger.type };
      state.log.unshift('TRIGGER · ' + lifeCard.name + ' がコストなしでACTIVE登場');
      return state.lastTrigger;
    }

    var effect = lifeCard.trigger.type;
    if (effect === 'destroy_one') {
      if (attacker.field.length) attacker.discard.push(attacker.field.splice(highestPowerIndex(attacker.field), 1)[0]);
    } else if (effect === 'heal_one') {
      if (defender.life < 5 && defender.deck.length) {
        defender.lifeCards.push(defender.deck.shift());
        defender.life += 1;
      }
    } else if (effect === 'discard_one') {
      if (attacker.hand.length) attacker.discard.push(attacker.hand.pop());
    } else if (effect === 'bounce') {
      if (attacker.field.length) {
        var highestPower = highestPowerIndex(attacker.field);
        var returned = attacker.field.splice(highestPower, 1)[0];
        returned.attacked = true;
        attacker.hand.push(returned);
      }
    } else if (effect === 'stop_attacks') {
      attacker.field.forEach(function (song) { song.attacked = true; });
    }

    state.lastTrigger = { side: defendingSide, cardId: lifeCard.id, cardName: lifeCard.name, label: lifeCard.trigger.label, text: lifeCard.trigger.text, type: effect };
    state.log.unshift('TRIGGER · ' + lifeCard.name + '「' + lifeCard.trigger.label + '」');
    return state.lastTrigger;
  }

  function awakenLeader(state, side) {
    var player = state[side];
    if (!player || !player.leader || player.leaderAwakened || player.life > 2) return false;
    player.leaderAwakened = true;
    state.lastLeaderAwaken = { side: side, leader: player.leader };
    state.log.unshift((player.leader === 'miku' ? '初音ミク' : '重音テト') + ' · AWAKEN');
    return true;
  }

  function hasAbility(card, type) {
    return Boolean(card && (card.abilities || []).some(function (ability) { return ability.type === type; }));
  }

  function drawCards(player, count) {
    for (var i = 0; i < count && player.deck.length; i += 1) player.hand.push(player.deck.shift());
  }

  function highestPowerIndex(field) {
    var highestPower = 0;
    for (var i = 1; i < field.length; i += 1) {
      if (effectivePower(field[i]) > effectivePower(field[highestPower])) highestPower = i;
    }
    return highestPower;
  }

  function readyAfterKnockout(state, side, attacker) {
    if (!hasAbility(attacker, 'encore_on_ko') || attacker.encoreUsed) return false;
    attacker.attacked = false;
    attacker.encoreUsed = true;
    state.lastImpact = { type: 'encore', side: side, label: 'ダブルアンコール' };
    state.log.unshift(attacker.name + '「ダブルアンコール」· 再攻撃可能');
    return true;
  }

  function fieldCost(field) {
    return field.reduce(function (total, card) { return total + (card.cost || 0); }, 0);
  }

  function effectivePower(card) {
    return Math.max(0, (card.currentPower || card.power || 0) + (card.turnPowerBonus || 0) - (card.attacked ? 1000 : 0));
  }

  function rankDifficulty(rating) {
    rating = Math.max(0, Number(rating) || 0);
    if (rating >= 1300) return 'expert';
    if (rating >= 1100) return 'hard';
    return 'normal';
  }

  function endTurn(state, side) {
    ensureTurn(state, side);
    if (state.winner) return state;
    state[side].field.forEach(function (song) { song.turnPowerBonus = 0; });
    startTurn(state, side === 'user' ? 'cpu' : 'user', true);
    return state;
  }

  function cpuMainPhase(state, difficulty) {
    if (state.active !== 'cpu' || state.winner) return state;
    var safety = 0;
    while (safety < 20) {
      safety += 1;
      var playable = state.cpu.hand.map(function (c, i) { return { card: c, index: i }; }).filter(function (x) {
        return (x.card.cost || 0) <= state.cpu.cost && (x.card.type !== 'producer' || !state.cpu.producerUsed) && (x.card.type !== 'singer' || state.cpu.field.length);
      });
      if (!playable.length) break;
      playable.sort(function (a, b) {
        var av = a.card.power || a.card.boost || a.card.bonus || 0;
        var bv = b.card.power || b.card.boost || b.card.bonus || 0;
        if (difficulty === 'normal') return (a.card.cost || 0) - (b.card.cost || 0) || av - bv;
        if (difficulty === 'expert') return (b.card.type === 'song' ? 1 : 0) - (a.card.type === 'song' ? 1 : 0) || bv - av || (b.card.cost || 0) - (a.card.cost || 0);
        return bv - av;
      });
      var chosen = playable[0];
      var replaceIndex = 0;
      if (chosen.card.type === 'song' && state.cpu.field.length >= 3 && difficulty !== 'normal') {
        replaceIndex = state.cpu.field.reduce(function (weakest, card, index, field) {
          return effectivePower(card) < effectivePower(field[weakest]) ? index : weakest;
        }, 0);
      } else if (chosen.card.type === 'singer' && state.cpu.field.length && difficulty !== 'normal') {
        replaceIndex = state.cpu.field.reduce(function (best, card, index, field) {
          return effectivePower(card) > effectivePower(field[best]) ? index : best;
        }, 0);
      }
      try { playCard(state, 'cpu', chosen.index, replaceIndex); } catch (ignore) { break; }
    }
    return state;
  }

  function cpuTurn(state, rng, userGuardIndex, difficulty) {
    rng = rng || Math.random;
    if (state.active !== 'cpu' || state.winner) return state;
    cpuMainPhase(state, difficulty || 'normal');
    var attackers = state.cpu.field.slice();
    var guardAvailable = userGuardIndex;
    attackers.forEach(function (song) {
      var index = state.cpu.field.indexOf(song);
      if (index < 0 || song.attacked || state.winner) return;
      var weakTarget = state.user.field.findIndex(function (target) { return target.attacked && song.currentPower >= effectivePower(target); });
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

  return { RARITY_WEIGHTS: RARITY_WEIGHTS, openPack: openPack, openFivePacks: openFivePacks, autoBuild: autoBuild, makeBattle: makeBattle, setLeaders: setLeaders, mulligan: mulligan, playCard: playCard, attack: attack, endTurn: endTurn, cpuMainPhase: cpuMainPhase, cpuTurn: cpuTurn, effectivePower: effectivePower, rankDifficulty: rankDifficulty, validate: validate };
}));
