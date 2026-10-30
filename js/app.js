(function () {
  'use strict';
  var app = document.getElementById('app');
  var boot = document.getElementById('boot');
  var fatal = document.getElementById('fatal');
  var testMode = new URLSearchParams(location.search).get('test') === '1';
  var STORAGE = 'vocalu-save-v1';
  var MIGRATION = 'vocalu-migration-v3';
  var RANK_STORAGE = 'vocalu-rank-v1';
  var RANK_BOARD_STORAGE = 'vocalu-rank-board-v1';
  var PLAYER_PROFILES_STORAGE = 'vocalu-player-profiles-v1';
  var CURRENT_PLAYER_STORAGE = 'vocalu-current-player-v1';
  var LEADER_STORAGE = 'vocalu-leader-v1';
  var state = {
    screen: 'home', opened: [], packNo: 0, selected: [], battle: null,
    selectedUnit: null, targeting: null, pendingAttack: null, panelTab: 'log', triggerResume: null, mulliganSelected: [],
    difficulty: 'normal', matchMode: 'free', leaderChoice: loadLeaderChoice(), rank: loadRank(),
    collection: loadAndMigrate(), light: matchMedia('(prefers-reduced-motion: reduce)').matches,
    collectionType: 'all', collectionSort: 'number', collectionView: 'all', collectionQuery: '',
    music: { ready: false, playing: false, volume: 40, title: 'BGM未再生' }
  };
  var yt = null;
  var renderedScreen = null;
  var battleInputLockedUntil = 0;
  var battleMotionCleanupTimer = null;

  function track(name, params) {
    if (!window.VOCALU_ANALYTICS_ENABLED || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  }

  function loadLeaderChoice() {
    try { return localStorage.getItem(LEADER_STORAGE) === 'teto' ? 'teto' : 'miku'; } catch (ignore) { return 'miku'; }
  }

  function rankRecord(saved, fallbackName) {
    saved = saved || {};
    return {
      username: String(saved.username || fallbackName || '').trim().slice(0, 12),
      rating: Math.max(0, Number(saved.rating) || 1000),
      wins: Math.max(0, Number(saved.wins) || 0),
      losses: Math.max(0, Number(saved.losses) || 0)
    };
  }
  function playerKey(name) { return String(name || '').trim().toLocaleLowerCase('ja-JP'); }
  function loadPlayerProfiles() {
    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem(PLAYER_PROFILES_STORAGE) || '{}'); } catch (ignore) {}
    return profiles && typeof profiles === 'object' && !Array.isArray(profiles) ? profiles : {};
  }
  function loadRank() {
    var legacy = {}, profiles = loadPlayerProfiles(), current = '';
    try { legacy = JSON.parse(localStorage.getItem(RANK_STORAGE) || '{}'); } catch (ignore) {}
    try { current = localStorage.getItem(CURRENT_PLAYER_STORAGE) || ''; } catch (ignoreCurrent) {}
    current = current || legacy.username || '';
    var saved = profiles[playerKey(current)] || legacy;
    var record = rankRecord(saved, current);
    if (record.username && !profiles[playerKey(record.username)]) {
      profiles[playerKey(record.username)] = record;
      try { localStorage.setItem(PLAYER_PROFILES_STORAGE, JSON.stringify(profiles)); } catch (ignoreMigration) {}
    }
    return record;
  }
  function loadRankBoard() {
    var entries = [];
    try { entries = JSON.parse(localStorage.getItem(RANK_BOARD_STORAGE) || '[]'); } catch (ignore) {}
    return Array.isArray(entries) ? entries.filter(function (entry) { return entry && entry.username; }).slice(0, 30) : [];
  }
  function saveRank() {
    try {
      localStorage.setItem(RANK_STORAGE, JSON.stringify(state.rank));
      if (!state.rank.username) return;
      var profiles = loadPlayerProfiles();
      profiles[playerKey(state.rank.username)] = rankRecord(state.rank);
      localStorage.setItem(PLAYER_PROFILES_STORAGE, JSON.stringify(profiles));
      localStorage.setItem(CURRENT_PLAYER_STORAGE, state.rank.username);
      var board = loadRankBoard().filter(function (entry) { return entry.username !== state.rank.username; });
      board.push({ username: state.rank.username, rating: state.rank.rating, wins: state.rank.wins, losses: state.rank.losses, updatedAt: Date.now() });
      board.sort(function (a, b) { return b.rating - a.rating || b.wins - a.wins; });
      localStorage.setItem(RANK_BOARD_STORAGE, JSON.stringify(board.slice(0, 30)));
    } catch (ignore) {}
  }
  function rankName(rating) { return rating >= 1700 ? 'MASTER' : rating >= 1500 ? 'PLATINUM' : rating >= 1300 ? 'GOLD' : rating >= 1100 ? 'SILVER' : 'BRONZE'; }
  function rankRegistration(startAfterSave) {
    choose('ランクネーム登録','<p class="notice">ランキングに表示するユーザーネームだけを登録します。メールアドレスは不要です。</p><label class="rank-name-field"><span>USER NAME</span><input data-rank-name maxlength="12" autocomplete="nickname" value="' + esc(state.rank.username) + '" placeholder="1～12文字"></label><button class="primary" data-action="save-rank-name" data-start="' + (startAfterSave ? 'ranked' : '') + '">登録する</button>');
  }
  function saveRankName(value) {
    var name = String(value || '').replace(/\s+/g, ' ').trim();
    if (!name || name.length > 12) throw new Error('ユーザーネームは1～12文字で入力してください');
    if (/[<>&"']/.test(name)) throw new Error('使用できない記号が含まれています');
    var profiles = loadPlayerProfiles(), nextKey = playerKey(name), currentKey = playerKey(state.rank.username);
    if (profiles[nextKey]) {
      state.rank = rankRecord(profiles[nextKey], name);
    } else {
      if (currentKey && profiles[currentKey] && currentKey !== nextKey) delete profiles[currentKey];
      state.rank = rankRecord({ username: name, rating: state.rank.rating, wins: state.rank.wins, losses: state.rank.losses });
      profiles[nextKey] = state.rank;
      try { localStorage.setItem(PLAYER_PROFILES_STORAGE, JSON.stringify(profiles)); } catch (ignore) {}
    }
    saveRank();
  }
  function leaderboardHtml() {
    var board = loadRankBoard();
    if (state.rank.username && !board.some(function (entry) { return entry.username === state.rank.username; })) board.push(state.rank);
    board.sort(function (a, b) { return b.rating - a.rating || b.wins - a.wins; });
    var rows = board.slice(0, 5).map(function (entry, index) { return '<div class="leaderboard-row ' + (entry.username === state.rank.username ? 'is-you' : '') + '"><b>' + (index + 1) + '</b><span>' + esc(entry.username) + '</span><strong>' + Math.max(0, Number(entry.rating) || 1000) + ' pt</strong></div>'; }).join('');
    if (!rows) rows = '<p class="leaderboard-empty">ユーザーネームを登録すると最初の記録が載ります。</p>';
    return '<section class="leaderboard"><header><div><span>PRESEASON · LOCAL</span><h2>RANKING</h2></div><button data-action="edit-rank-name">' + (state.rank.username ? esc(state.rank.username) : '名前を登録') + '</button></header><div class="leaderboard-head"><span>#</span><span>USER</span><span>POINT</span></div>' + rows + '<p class="leaderboard-note">現在はこの端末のプレシーズン記録です。オンラインランキング接続後も同じユーザーネームを使えます。</p></section>';
  }
  function beginMatch(mode) {
    state.matchMode=mode;
    state.difficulty=mode==='ranked'?VocaluEngine.rankDifficulty(state.rank.rating):'normal';
    state.opened=[];state.packNo=0;state.selected=[];state.battle=null;state.pendingAttack=null;
    track('vocalu_mode_start',{mode:mode});
    state.screen='pack';render();
  }

  function loadAndMigrate() {
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch (ignore) {}
    if (localStorage.getItem(MIGRATION) === 'done') return raw;
    try {
      localStorage.setItem(STORAGE + '-backup-v3', JSON.stringify(raw));
      var migrated = VocaluCatalog.migrateCollection(raw);
      ['vocalu-deck-v1', 'vocalu-deck'].forEach(function (key) {
        var deck = JSON.parse(localStorage.getItem(key) || 'null');
        if (Array.isArray(deck)) {
          localStorage.setItem(key + '-backup-v3', JSON.stringify(deck));
          localStorage.setItem(key, JSON.stringify(deck.map(function (id) { return VocaluCatalog.legacyIdMap[id] || id; })));
        }
      });
      localStorage.setItem(STORAGE, JSON.stringify(migrated));
      localStorage.setItem(MIGRATION, 'done');
      return migrated;
    } catch (ignoreMigration) { return raw; }
  }
  function saveCollection(cards) {
    cards.forEach(function (card) { state.collection[card.id] = (state.collection[card.id] || 0) + 1; });
    try { localStorage.setItem(STORAGE, JSON.stringify(state.collection)); } catch (err) { toast('保存容量が不足しています。ゲームは続けられます。'); }
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]; }); }
  function typeName(type) { return type === 'song' ? '楽曲' : type === 'producer' ? 'ボカロP' : '歌い手'; }
  function leaderInfo(id) {
    var isTeto=id==='teto',name=isTeto?'重音テト':'初音ミク';
    var card=VocaluCatalog.singers.find(function(item){return item.name===name;});
    return { id:isTeto?'teto':'miku', name:name, image:card&&card.thumbnailUrl, skill:isTeto?'毎ターン最初の攻撃をPOWER +500。覚醒後は+1000。':'毎ターン最初に登場する楽曲をPOWER +500。覚醒後は+1000。' };
  }
  function hueFor(value) { var total=0; String(value).split('').forEach(function(c){total=(total+c.charCodeAt(0)*17)%360;}); return total; }
  function artHtml(card) {
    if (card.thumbnailVerified && card.thumbnailUrl) return '<img src="' + esc(card.thumbnailUrl) + '" alt="' + esc(card.name) + '" loading="lazy">';
    var hue = hueFor(card.id || card.name);
    if (card.type === 'producer') return '<div class="avatar-icon producer-icon" style="--hue:' + hue + '"><b>P</b><span>' + esc(card.name) + '</span></div>';
    if (card.type === 'singer') return '<div class="avatar-icon singer-icon" style="--hue:' + hue + '"><b>Vo</b><span>' + esc(card.name) + '</span></div>';
    return '<div class="song-cover" style="--hue:' + hue + '"><b>♪</b><span>' + esc(card.name) + '</span><small>ARTWORK VERIFYING</small></div>';
  }
  function cardValue(card) { return card.type === 'song' ? (card.currentPower != null ? VocaluEngine.effectivePower(card) : card.power) : (card.boost || 0); }
  function restPower(card) { var power=card.currentPower!=null?(card.currentPower||card.power||0)+(card.turnPowerBonus||0):(card.power||0);return Math.max(0,power-1000); }
  function cardFace(card, compact) {
    var equipment = card.singer ? '<span class="tag-team-panel"><span class="tag-team-art">' + artHtml(card.singer) + '</span><span class="tag-team-copy"><b>TAG TEAM</b><strong>' + esc(card.singer.name) + '</strong><small>POWER +' + card.singer.boost + '</small></span></span>' : '';
    var rules=(card.abilities||[]).map(function(item){return '<span class="card-rule"><b>◆ ' + esc(item.label) + '</b><small>' + esc(item.text) + '</small></span>';});
    if(card.trigger)rules.push('<span class="card-rule trigger"><b>TRIGGER · ' + esc(card.trigger.label) + '</b><small>' + esc(card.trigger.text) + '</small></span>');
    var ruleBox=rules.length?'<span class="card-rules">' + rules.join('') + '</span>':'';
    var statValue=cardValue(card),digits=String(Math.abs(statValue)).length;
    var value=card.type==='song'?'<b class="card-stat digits-'+digits+'"><small>POWER</small><strong>'+statValue+'</strong></b>':card.type==='producer'?'<b class="card-stat support"><strong>SUPPORT</strong></b>':'<b class="card-stat digits-'+digits+'"><small>BOOST</small><strong>+'+statValue+'</strong></b>';
    var rest=card.type==='song'?'<span class="rest-power-rail"><small>REST POWER</small><b>'+restPower(card)+'</b></span>':'';
    return '<span class="card-face card-' + card.type + ' ' + (compact ? 'compact' : '') + (card.singer?' has-singer':'') + '"><span class="card-head"><span class="card-cost">' + card.cost + '</span><strong>' + esc(card.name) + '</strong><span class="card-rarity ' + card.rarity + '">' + card.rarity + '</span></span><span class="card-art">' + artHtml(card) + equipment + rest + '</span>' + ruleBox + '<span class="card-foot"><small>' + typeName(card.type) + (card.trigger ? ' · TRIGGER' : '') + (card.attacked ? ' · REST' : '') + '</small>' + value + '</span></span>';
  }
  function shell(content, battle) {
    if (battle) return '<main class="game-shell"><div class="battle-tools"><button data-action="battle-guide" title="ルールガイド" aria-label="ルールガイド">☰</button><button data-action="battle-settings" title="対戦設定" aria-label="対戦設定">⚙</button></div>' + content + '</main>';
    return '<main class="shell"><header class="topbar"><div class="brand">ボカる！ <em>VOCALU</em></div><button class="icon-btn" data-action="music" aria-label="BGM">' + (state.music.playing ? 'Ⅱ' : '♪') + '</button></header>' + content + '</main>';
  }
  function cardHtml(card, index, selectable) {
    var chosen = state.selected.indexOf(index) >= 0;
    var selectedOrder=chosen?state.selected.indexOf(index)+1:0;
    return '<article class="card ' + (chosen ? 'selected ' : '') + 'reveal" style="--card-order:' + (index>=0?index%5:0) + '"><button type="button" ' + (selectable ? 'data-action="select" data-index="' + index + '" aria-pressed="' + chosen + '"' : 'data-action="detail" data-card="' + esc(card.id) + '"') + '>' + cardFace(card, false) + (selectable?'<span class="pick-state">' + (chosen?selectedOrder:'＋') + '</span>':'') + '</button></article>';
  }
  function packProgress(current) { var dots='';for(var i=0;i<5;i+=1)dots+='<i class="' + (i<current?'done ':i===current?'current ':'') + '"><b>' + (i+1) + '</b></i>';return '<div class="pack-progress" aria-label="' + current + 'パック開封済み">' + dots + '</div>'; }
  function deckStats(cards) { return cards.reduce(function(stats,card){stats[card.type]=(stats[card.type]||0)+1;return stats;},{song:0,producer:0,singer:0}); }
  function render() {
    var screenChanged = renderedScreen !== state.screen;
    renderedScreen = state.screen;
    document.body.classList.toggle('light-mode', state.light);
    document.body.classList.toggle('battle-mode', state.screen === 'battle');
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'pack') renderPack();
    else if (state.screen === 'deck') renderDeck();
    else if (state.screen === 'setup') renderSetup();
    else if (state.screen === 'opening') renderOpening();
    else if (state.screen === 'battle') renderBattle();
    else if (state.screen === 'result') renderResult();
    else if (state.screen === 'collection') renderCollection();
    if (screenChanged) requestAnimationFrame(function () { window.scrollTo(0, 0); });
  }
  function renderHome() {
    var owned = Object.keys(state.collection).filter(function (id) { return state.collection[id] > 0; }).length;
    app.innerHTML = shell('<section class="lobby"><div class="lobby-mast"><div class="lobby-title"><span>VOCALU BATTLE LOBBY</span><h1>ボカる！</h1><p>開けて、組んで、歌わせる。</p></div><img class="lobby-pack" src="assets/bc01-pack.webp" alt="VOCALU BC01"></div><div class="mode-select"><button class="mode-tile ranked" data-action="ranked-match"><span class="mode-index">01</span><span class="mode-copy"><small>CPU LADDER</small><strong>ランクマッチ</strong><em>勝敗でレートが変動</em></span><span class="mode-status"><b>' + rankName(state.rank.rating) + '</b><small>RATE ' + state.rank.rating + '</small></span></button><button class="mode-tile free" data-action="free-match"><span class="mode-index">02</span><span class="mode-copy"><small>CASUAL BATTLE</small><strong>フリーマッチ</strong><em>CPU難易度を選んで対戦</em></span><span class="mode-arrow" aria-hidden="true">›</span></button><button class="mode-tile collection" data-action="collection"><span class="mode-index">03</span><span class="mode-copy"><small>CARD LIBRARY</small><strong>コレクション</strong><em>楽曲の再生とカード確認</em></span><span class="mode-status"><b>' + owned + '</b><small>/ 300</small></span></button></div><div class="lobby-record"><span>RANK RECORD</span><b>' + state.rank.wins + ' WIN</b><b>' + state.rank.losses + ' LOSS</b><button data-action="share-x">Xで共有</button><button data-action="toggle-light">軽量モード ' + (state.light ? 'ON' : 'OFF') + '</button></div>' + leaderboardHtml() + '</section>' + testPanel());
  }
  function testPanel() {
    if (!testMode) return '';
    return '<div class="test-panel"><b>開発者テストモード</b><div class="actions"><button class="secondary" data-action="test-battle">盤面・装備テスト</button><button class="secondary" data-action="force-rare" data-rare="SR">SR演出</button><button class="secondary" data-action="force-rare" data-rare="UR">UR演出</button><button class="secondary" data-action="reset-save">保存データ初期化</button></div></div>';
  }
  function renderPack() {
    if (state.packNo >= 5) { state.screen='deck'; state.selected=VocaluEngine.autoBuild(state.opened); return render(); }
    app.innerHTML = shell('<div class="section-head"><h2>BC01 · PACK ' + (state.packNo + 1) + ' / 5</h2><span>' + state.opened.length + ' / 25枚</span></div>' + packProgress(state.packNo) + '<div class="pack-stage"><div class="pack-wrap"><button class="pack" data-action="open-pack" aria-label="BC01を開封"><span class="tear-line"><i></i></span><img src="assets/bc01-pack.webp" alt="VOCALU BC01 ブースターパック"><span class="pack-swipe">上へスワイプ または タップ</span></button><p class="swipe-hint"><b>BOOSTER CODE BC01</b><span>5 CARDS</span></p></div></div><button class="secondary bulk-open" data-action="bulk-open">演出を省略して残りを開封</button>');
  }
  function revealPack(cards) {
    state.opened=state.opened.concat(cards); state.packNo+=1;
    var highest=cards.reduce(function(best,c){return rank(c.rarity)>rank(best)?c.rarity:best;},'N');track('vocalu_pack_open',{pack_number:state.packNo,highest_rarity:highest}); flash(highest);
    var counts=cards.reduce(function(out,card){out[card.rarity]=(out[card.rarity]||0)+1;return out;},{}),summary=['N','R','SR','UR'].filter(function(r){return counts[r];}).map(function(r){return '<span class="' + r + '">' + r + ' ×' + counts[r] + '</span>';}).join('');
    app.innerHTML=shell('<div class="section-head"><h2>開封結果</h2><span>PACK ' + state.packNo + ' / 5</span></div>' + packProgress(state.packNo) + '<div class="pack-result-head"><b>5 CARDS GET</b><div>' + summary + '</div><small>カードをタップすると詳細を確認できます</small></div><div class="cards pack-result">' + cards.map(function(c,i){return cardHtml(c,state.opened.length-cards.length+i,false);}).join('') + '</div><div class="deck-footer"><button class="primary" data-action="next-pack">' + (state.packNo<5?'次のパックへ':'20枚デッキを選ぶ') + '</button></div>');
  }
  function rank(r) { return ['N','R','SR','UR'].indexOf(r); }
  function flash(rarity) { if(state.light||rank(rarity)<2)return;var el=document.createElement('div');el.className='rare-flash '+rarity;document.body.appendChild(el);setTimeout(function(){el.remove();},900); }
  function renderDeck() { var chosen=state.selected.map(function(i){return state.opened[i];}),stats=deckStats(chosen),remaining=20-state.selected.length;app.innerHTML=shell('<div class="section-head deck-title"><div><small>DECK BUILD</small><h2>20枚を選ぶ</h2></div><span>' + state.selected.length + ' / 20枚</span></div><section class="deck-build-status ' + (remaining===0?'complete':'') + '"><div class="deck-count"><b>' + state.selected.length + '</b><span>/ 20</span><small>' + (remaining?'あと'+remaining+'枚':'デッキ完成') + '</small></div><div class="deck-types"><span>楽曲 <b>' + stats.song + '</b></span><span>ボカロP <b>' + stats.producer + '</b></span><span>歌い手 <b>' + stats.singer + '</b></span></div><button data-action="clear-deck" ' + (!state.selected.length?'disabled':'') + '>全解除</button></section><p class="deck-help">カードをタップして選択。丸数字はデッキに入る順番です。</p><div class="cards deck-picker ' + (remaining===0?'at-limit':'') + '">' + state.opened.map(function(c,i){return cardHtml(c,i,true);}).join('') + '</div><div class="deck-footer"><button class="secondary" data-action="auto-deck">おすすめ20枚</button><button class="primary" data-action="battle-setup" ' + (state.selected.length!==20?'disabled':'') + '>' + (state.selected.length===20?'対戦前確認へ':'あと'+remaining+'枚') + '</button></div>'); }
  function makeCpuDeck() { return VocaluCatalog.songs.slice(0,14).concat(VocaluCatalog.producers.slice(0,3),VocaluCatalog.singers.slice(0,3)); }
  function renderSetup() {
    var deck=state.selected.map(function(i){return state.opened[i];}); var lead=deck.find(function(c){return c.type==='song';})||deck[0];
    var stats=deckStats(deck),leader=leaderInfo(state.leaderChoice);
    var levels=[['normal','ノーマル','気軽に対戦'],['hard','ハード','強いカードを優先'],['expert','エキスパート','有利な交換を狙う']];
    var difficulty=state.matchMode==='ranked'?'<section class="ranked-brief"><span>RANK MATCH</span><b>' + rankName(state.rank.rating) + ' · RATE ' + state.rank.rating + '</b><p>CPU ' + difficultyName() + ' · 勝利 +25 / 敗北 -20</p><small>ランク上昇で判断が強化されます。手札・コスト・ライフの補正はありません。</small></section>':'<section class="difficulty-select"><span>CPU DIFFICULTY</span><div>' + levels.map(function(level){return '<button class="' + (state.difficulty===level[0]?'active':'') + '" data-action="difficulty" data-level="' + level[0] + '"><b>' + level[1] + '</b><small>' + level[2] + '</small></button>';}).join('') + '</div></section>';
    var leaders=['miku','teto'].map(function(id){var leader=leaderInfo(id);return '<button class="leader-choice ' + (state.leaderChoice===id?'active':'') + '" data-action="choose-leader" data-leader="' + id + '">' + (leader.image?'<img src="' + esc(leader.image) + '" alt="' + esc(leader.name) + '">':'') + '<span><b>' + esc(leader.name) + '</b><small>' + esc(leader.skill) + '</small></span></button>';}).join('');
    app.innerHTML=shell('<div class="prebattle-head"><span>MATCH PREPARATION</span><h1>対戦前確認</h1><button class="secondary" data-action="back-deck">デッキ変更</button></div><section class="battle-setup"><div class="setup-deck"><span>YOUR DECK</span><div class="setup-card-stack">' + cardFace(lead,false) + '<i>V</i><i>V</i></div><b>VOCALU DECK</b><small>' + deck.length + ' CARDS · 楽曲 ' + stats.song + ' / P ' + stats.producer + ' / 歌い手 ' + stats.singer + '</small></div><strong class="versus">VS</strong><div class="setup-deck opponent"><span>CPU DECK</span><div class="setup-card-stack cpu"><span class="setup-card-back">V<small>VOCALU</small></span><i>V</i><i>V</i></div><b>STUDIO CPU</b><small>' + difficultyName() + '</small></div></section><section class="match-summary"><div><span>LEADER</span><b>' + esc(leader.name) + '</b></div><div><span>RULE</span><b>LIFE 5</b></div><div><span>MODE</span><b>' + (state.matchMode==='ranked'?'RANKED':'FREE') + '</b></div></section><section class="leader-select"><span>SELECT LEADER</span><div>' + leaders + '</div><p>LIFE 2以下で覚醒。回復しても覚醒状態は維持されます。</p></section>' + difficulty + '<button class="primary setup-start" data-action="battle-start">BATTLE START</button>');
  }
  function difficultyName(){return state.difficulty==='expert'?'EXPERT':state.difficulty==='hard'?'HARD':'NORMAL';}
  function startBattle() { var deck=state.selected.map(function(i){return state.opened[i];});if(state.matchMode==='ranked')state.difficulty=VocaluEngine.rankDifficulty(state.rank.rating);track('vocalu_battle_start',{mode:state.matchMode,difficulty:state.difficulty,rank:rankName(state.rank.rating),leader:state.leaderChoice});state.battle=VocaluEngine.makeBattle(deck,makeCpuDeck());VocaluEngine.setLeaders(state.battle,state.leaderChoice,state.leaderChoice==='miku'?'teto':'miku');state.selectedUnit=null;state.targeting=null;state.pendingAttack=null;state.mulliganSelected=[];state.screen='opening';render(); }
  function startTestBattle() {
    var deck=VocaluCatalog.songs.slice(0,14).concat(VocaluCatalog.producers.slice(0,3),VocaluCatalog.singers.slice(0,3));
    state.battle=VocaluEngine.makeBattle(deck,makeCpuDeck(),function(){return .5;});
    VocaluEngine.setLeaders(state.battle,state.leaderChoice,state.leaderChoice==='miku'?'teto':'miku');
    state.battle.user.cost=10; state.battle.user.maxCost=10; state.battle.user.life=2;
    var highCost=VocaluCatalog.songs.find(function(card){return card.cost>=6&&card.abilities&&card.abilities.length;});
    state.battle.user.hand=[VocaluCatalog.songs[0],highCost,VocaluCatalog.singers.find(function(card){return card.trigger;}),VocaluCatalog.producers.find(function(card){return card.trigger;})];
    VocaluEngine.playCard(state.battle,'user',0,0);
    state.battle.user.field[0].attacked=false;
    state.selectedUnit=null; state.targeting=null; state.pendingAttack=null; state.screen='battle'; render();
  }
  function renderOpening() {
    var cards=state.battle.user.hand.map(function(card,index){var chosen=state.mulliganSelected.indexOf(index)>=0;return '<button class="' + (chosen?'mulligan-selected':'') + '" data-action="mulligan-toggle" data-index="' + index + '">' + cardFace(card,false) + '<span class="mulligan-mark">' + (chosen?'戻す':'選択') + '</span></button>';}).join('');
    var used=state.battle.mulliganUsed;
    app.innerHTML=shell('<section class="opening-hand"><span>OPENING HAND</span><h1>初期手札</h1><div class="opening-step"><b>1</b><span>戻すカードを選択</span><i></i><b>2</b><span>引き直して開始</span></div><div class="opening-cards">' + cards + '</div><div class="mulligan-status"><b>' + state.mulliganSelected.length + '枚選択</b><span>' + (used?'マリガン完了':'カードをタップして選択') + '</span></div><p>' + (used?'引き直し済みです。この手札で対戦を開始します。':'選んだ枚数だけ引き直せます。マリガンは1ゲームに1回です。') + '</p><div class="opening-actions">' + (!used?'<button class="secondary" data-action="clear-mulligan" ' + (!state.mulliganSelected.length?'disabled':'') + '>選択解除</button><button class="secondary" data-action="mulligan" ' + (!state.mulliganSelected.length?'disabled':'') + '>' + state.mulliganSelected.length + '枚を引き直す</button>':'') + '<button class="primary" data-action="keep-hand">' + (used?'この手札で始める':'このままキープ') + '</button></div></section>');
  }
  function slotHtml(song,index,side,motion) {
    if(!song)return '<div class="battle-slot empty"><span>EMPTY</span></div>';
    var selected=state.selectedUnit&&state.selectedUnit.side===side&&state.selectedUnit.index===index;
    var target=side==='cpu'&&state.targeting!=null&&song.attacked;
    var incoming=state.pendingAttack&&((side==='cpu'&&state.pendingAttack.attackerIndex===index)||(side==='user'&&state.pendingAttack.targetType==='song'&&state.pendingAttack.targetIndex===index));
    var motionClass=motion&&motion.side===side&&motion.index===index?(motion.type==='summon'?'summon-motion ':motion.type==='equip'?'equip-motion ':''):'';
    return '<div class="battle-slot ' + motionClass + (selected?'selected ':'') + (target?'targetable ':'') + (incoming?(side==='cpu'?'attacking ':'under-attack '):'') + (song.attacked?'used':'') + '"><button class="slot-card" data-action="select-unit" data-side="' + side + '" data-index="' + index + '">' + cardFace(song,true) + '</button><button class="inspect" data-action="battle-detail" data-side="' + side + '" data-index="' + index + '" aria-label="詳細">⌕</button></div>';
  }
  function lifeCards(player,side) { var cells='';for(var i=0;i<5;i+=1)cells+='<i class="life-cell ' + (i<player.life?'filled':'broken') + '"><span></span></i>';var incoming=side==='user'&&state.pendingAttack&&state.pendingAttack.targetType==='life';return '<button class="life-target digital-life-target ' + (side==='cpu'&&state.targeting!=null?'targetable ':'') + (incoming?'under-attack ':'') + '" ' + (side==='cpu'&&state.targeting!=null?'data-action="attack-life"':'disabled') + '><span class="life-readout"><small>LIFE</small><b>' + player.life + '</b><em>/5</em></span><span class="life-cells">' + cells + '</span></button>'; }
  function pileHtml(player,side){
    var recent=player.discard.slice(-3).reverse(),dropCards=recent.map(function(card,index){return '<i class="discard-preview-card" style="--drop-index:' + index + '">' + artHtml(card) + '</i>';}).join('');
    return '<div class="pile-zone ' + side + '"><button class="pile-card drop" data-action="show-discard" data-side="' + side + '" aria-label="' + (side==='user'?'あなた':'CPU') + 'のドロップを見る"><span>DROP</span><span class="discard-stack">' + (dropCards||'<i class="discard-empty">EMPTY</i>') + '</span></button><div class="pile-card deck"><span>DECK</span><span class="deck-back"><b>V</b><small>VOCALU</small></span><em>' + player.deck.length + '</em></div></div>';
  }
  function leekMeter(player){var leaves='';for(var i=0;i<player.maxCost;i+=1)leaves+='<i class="leek-icon ' + (i<player.cost?'ready':'spent') + '"></i>';return '<div class="leek-meter"><span>葱 COST</span><b>' + player.cost + '/' + player.maxCost + '</b><div>' + leaves + '</div></div>';}
  function compactHand(player,side){
    var cards='';
    if(side==='cpu')for(var i=0;i<Math.min(3,player.hand.length);i+=1)cards+='<i class="hidden-hand-card" style="--hidden-index:' + i + '">V</i>';
    return '<div class="compact-hand ' + side + '-hand"><span>HAND</span>' + (cards?'<div class="opponent-hand-stack">' + cards + '<strong>×' + player.hand.length + '</strong></div>':'<div class="opponent-hand-stack empty"><strong>×0</strong></div>') + '</div>';
  }
  function playerStrip(player,side){
    var name=side==='cpu'?'STUDIO CPU':'YOU',label=side==='cpu'?'OPPONENT':'PLAYER';
    return '<div class="player-strip ' + side + '"><div class="player-meta"><b>' + name + '</b><small>' + label + '</small></div>' + leekMeter(player) + compactHand(player,side) + '</div>';
  }
  function lifeRail(player,side,damageSide){
    var name=side==='cpu'?'CPU':'YOU',leader=leaderInfo(player.leader),awake=player.leaderAwakened,damaged=damageSide===side;
    return '<div class="life-rail ' + side + '"><div class="rail-player"><b>' + name + '</b><span><i class="mini-leek"></i>' + player.cost + '/' + player.maxCost + '</span></div><div class="leader-skin leader-' + leader.id + ' ' + (awake?'awakened ':'') + (damaged?'damaged ':'') + '" data-leader-skin="' + side + '"><div class="leader-aura"><i></i><i></i><i></i></div><div class="leader-art">' + (leader.image?'<img src="' + esc(leader.image) + '" alt="' + esc(leader.name) + '">':'<span>' + esc(leader.name.slice(0,1)) + '</span>') + '</div><div class="leader-name"><small>LEADER</small><b>' + esc(leader.name) + '</b></div>' + (awake?'<em>AWAKEN</em>':'') + '<i class="damage-burst"></i></div>' + lifeCards(player,side) + '</div>';
  }
  function handHtml(card,i,total,userActive,cost) {
    var offset=i-(total-1)/2,angle=Math.max(-9,Math.min(9,offset*3)),lift=Math.min(14,Math.abs(offset)*4),unavailable=!userActive||(card.cost||0)>cost;
    return '<div class="hand-card ' + (unavailable?'unavailable':'') + '" style="--hand-angle:' + angle + 'deg;--hand-lift:' + lift + 'px;--hand-z:' + (20-Math.abs(offset)) + '"><button class="hand-play" data-action="play" data-index="' + i + '" aria-disabled="' + unavailable + '">' + cardFace(card,true) + '</button><button class="hand-inspect" data-action="hand-detail" data-index="' + i + '" aria-label="カード詳細">⌕</button></div>';
  }
  function selectedCard() { if(!state.selectedUnit||!state.battle)return null;return state.battle[state.selectedUnit.side].field[state.selectedUnit.index]||null; }
  function actionPanel() {
    var card=selectedCard(), tabs='<div class="panel-tabs"><button data-action="panel-tab" data-tab="action" class="' + (state.panelTab==='action'?'active':'') + '">ACTION</button><button data-action="panel-tab" data-tab="detail" class="' + (state.panelTab==='detail'?'active':'') + '">DETAIL</button><button data-action="panel-tab" data-tab="log" class="' + (state.panelTab==='log'?'active':'') + '">LOG</button></div>',body='';
    if(state.pendingAttack){
      var pending=state.pendingAttack,attacker=state.battle.cpu.field[pending.attackerIndex],target=pending.targetType==='song'?state.battle.user.field[pending.targetIndex]:null;
      var decisions='<button class="primary" data-action="resolve-cpu-attack" data-attacker="' + pending.attackerIndex + '" data-target="' + pending.targetType + '" data-target-index="' + (pending.targetIndex==null?'':pending.targetIndex) + '" data-guard="none">' + (target?'この楽曲で受ける':'ライフで受ける') + '</button>';
      state.battle.user.field.forEach(function(song,index){if(pending.targetType==='song'&&(index===pending.targetIndex||song.attacked))return;decisions+='<button class="secondary" data-action="resolve-cpu-attack" data-attacker="' + pending.attackerIndex + '" data-target="' + pending.targetType + '" data-target-index="' + (pending.targetIndex==null?'':pending.targetIndex) + '" data-guard="' + index + '">' + esc(song.name) + 'でガード · ' + (song.attacked?'REST -1000 · ':'ACTIVE · ') + 'POW ' + VocaluEngine.effectivePower(song) + '</button>';});
      return '<aside class="action-panel defense-panel"><div class="defense-heading"><span>INCOMING ATTACK</span><b>' + esc(attacker.name) + ' · POWER ' + VocaluEngine.effectivePower(attacker) + '</b><small>盤面や手札の ⌕ で詳細を確認してから選択</small></div><div class="panel-body defense-actions">' + decisions + '</div></aside>';
    }
    if(state.panelTab==='log'){var recent=state.battle.log.slice(0,4).map(function(entry){var meta=logStyle(entry);return '<p class="' + meta[0] + '"><i>' + meta[1] + '</i><span>' + esc(entry) + '</span></p>';}).join('');body='<div class="panel-live-log">' + recent + '</div><button class="secondary panel-log-open" data-action="battle-log">履歴をすべて見る</button>';}
    else if(state.panelTab==='detail')body=card?'<div class="panel-card">' + cardFace(card,false) + '<p>' + esc(card.metricNote||'現在パワーや装備効果を含む状態です。') + '</p></div>':'<p class="panel-empty">盤面のカードを選択してください。</p>';
    else body=card&&state.selectedUnit.side==='user'?'<div class="panel-card-name"><b>' + esc(card.name) + '</b><span>' + (card.attacked?'REST · 攻撃不可':'ACTIVE · 攻撃先をタップ') + ' · POWER ' + VocaluEngine.effectivePower(card) + '</span></div><button class="secondary" data-action="battle-detail" data-side="user" data-index="' + state.selectedUnit.index + '">詳細</button><button class="secondary" data-action="cancel-action">取消</button>':'<p class="panel-empty">ACTIVEの楽曲をタップし、点線の先にある攻撃対象を選択します。</p>';
    return '<aside class="action-panel">' + tabs + '<div class="panel-body">' + body + '</div></aside>';
  }
  function renderBattle() {
    var b=state.battle,u=b.user,c=b.cpu,userActive=b.active==='user';
    var impact=b.lastImpact,leaderAwaken=b.lastLeaderAwaken,lifeTransfer=b.lastLifeTransfer,motion=b.lastMotion,leaderSkill=b.lastLeaderSkill;b.lastImpact=null;b.lastLeaderAwaken=null;b.lastLifeTransfer=null;b.lastMotion=null;b.lastLeaderSkill=null;
    var cpuSlots=[0,1,2].map(function(i){return slotHtml(c.field[i],i,'cpu',motion);}).join('');
    var userSlots=[0,1,2].map(function(i){return slotHtml(u.field[i],i,'user',motion);}).join('');
    var hand=u.hand.map(function(card,i){return handHtml(card,i,u.hand.length,userActive,u.cost);}).join('');
    var targeting=state.targeting!=null?'<div class="target-guide">指・カーソルへ攻撃ラインが追従 · 対象をタップ<button data-action="cancel-action">取消</button></div><div class="attack-trail" data-attack-trail><i></i></div>':state.pendingAttack?'<div class="target-guide incoming-guide">CPUから攻撃中 · 点線の攻撃先を確認して防御を選択<span class="attack-arrow">↓</span></div><div class="attack-trail cpu-attack-trail" data-cpu-attack-trail><i></i></div>':'';
    var impactLabels={life:'LIFE BREAK',knockout:'KNOCKOUT',clash:'DOUBLE DROP',entry:'HIGH COST ENTRY',encore:'ENCORE ATTACK',tagteam:'TAG TEAM'};
    var impactPieces='<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
    var impactHtml=impact?'<div class="impact-effect ' + impact.type + '"><span class="impact-core"></span><span class="impact-shards">'+impactPieces+'</span><b>' + esc(impact.label||impactLabels[impact.type]||'IMPACT') + '</b></div>':leaderAwaken?'<div class="impact-effect leader-awaken"><span class="awaken-rings"><i></i><i></i><i></i></span><b><small>'+esc(leaderInfo(leaderAwaken.leader).name)+'</small>AWAKEN</b></div>':'';
    var transferCard=lifeTransfer&&VocaluCatalog.cards.find(function(card){return card.id===lifeTransfer.cardId;});
    var transferFront=lifeTransfer&&lifeTransfer.revealed?((transferCard?artHtml(transferCard):'<b>VOCALU</b>')+'<small>'+esc(lifeTransfer.cardName||'TRIGGER')+'</small>'):'V';
    var transferHtml=lifeTransfer?'<div class="life-transfer ' + lifeTransfer.side + ' ' + (lifeTransfer.revealed?'revealed':'concealed') + '"><div class="life-transfer-card"><span class="transfer-back">V</span><span class="transfer-front ' + (lifeTransfer.revealed?'':'concealed-back') + '">' + transferFront + '</span></div><b>' + (lifeTransfer.revealed?'TRIGGER REVEAL':'LIFE → HAND') + '</b></div>':'';
    var turnHtml=motion&&motion.type==='turn'?'<div class="turn-motion motion-overlay ' + motion.side + '"><small>TURN ' + motion.turn + '</small><b>' + (motion.side==='user'?'YOUR TURN':'CPU TURN') + '</b>' + (motion.drawCount?'<em>DRAW ' + motion.drawCount + '</em>':'') + '</div>':'';
    var motionCard=motion&&motion.cardId?VocaluCatalog.cards.find(function(card){return card.id===motion.cardId;}):null;
    var attackHtml=motion&&motion.type==='attack'?'<div class="attack-motion motion-overlay ' + motion.side + '"><div class="attack-speed-lines"></div><div class="attack-card-art">'+(motionCard?artHtml(motionCard):'<b>V</b>')+'</div><div class="attack-copy"><small>'+esc(motion.cardName||'VOCALU')+'</small><b>ATTACK</b><strong>POWER '+(motion.power||0)+'</strong><em>→ '+esc(motion.targetName||'LIFE')+'</em></div><i></i><i></i><i></i></div>':'';
    var playLabels={summon:'LIVE IN',support:'SUPPORT',equip:'TAG TEAM'};
    var playHtml=motion&&playLabels[motion.type]&&motionCard?'<div class="play-motion motion-overlay '+motion.side+' '+motion.type+' '+motionCard.rarity+'"><span class="play-aura"><i></i><i></i><i></i></span><div class="play-art">'+artHtml(motionCard)+'</div><div class="play-copy"><small>'+esc(motionCard.rarity)+' · '+esc(typeName(motionCard.type))+'</small><b>'+esc(motionCard.name)+'</b><strong>'+playLabels[motion.type]+'</strong></div></div>':'';
    var leaderSkillHtml=leaderSkill?'<div class="leader-skill-motion motion-overlay ' + leaderSkill.side + ' ' + (leaderSkill.awakened?'awakened':'') + '"><small>' + esc(leaderInfo(leaderSkill.leader).name) + '</small><b>' + esc(leaderSkill.label) + '</b><strong>POWER +' + leaderSkill.amount + '</strong></div>':'';
    var finaleHtml=b.finishQueued?'<div class="finale-motion motion-overlay '+b.winner+'"><span></span><i></i><b>FINAL BEAT</b><small>'+(b.winner==='user'?'LIVE CLEAR':'LIVE FAILED')+'</small></div>':'';
    var damageSide=impact&&impact.type==='life'?impact.side:null;
    var board='<section class="battle-center"><header class="battle-status"><span>TURN ' + b.turn + '</span><b class="' + (userActive?'user-turn':'cpu-turn') + '">' + (userActive?'YOUR TURN':'CPU TURN') + '</b><span>' + difficultyName() + '</span></header>' + targeting
      + '<div class="battle-zone player-row enemy mirrored ' + (!userActive?'is-active':'') + '">' + pileHtml(c,'cpu') + '<div class="battle-core">' + compactHand(c,'cpu') + '<div class="battle-field enemy-field">' + cpuSlots + '</div></div>' + lifeRail(c,'cpu',damageSide) + '</div>'
      + '<div class="stage-line"><span>VOCALU STAGE</span><button class="stage-end-turn" data-action="end-turn" ' + (userActive?'':'disabled') + '>ターン終了</button></div>'
      + '<div class="battle-zone player-row user ' + (userActive?'is-active':'') + '">' + lifeRail(u,'user',damageSide) + '<div class="battle-core"><div class="battle-field user-field">' + userSlots + '</div></div>' + pileHtml(u,'user') + '</div>'
      + (u.life<=2?'<div class="clutch-rule">LIFE 2 OR LESS · 召喚した楽曲はすぐ攻撃可能</div>':'') + '<div class="hand-zone ' + (motion&&motion.type==='turn'&&motion.side==='user'&&motion.drawCount?'draw-motion':'') + '"><div class="hand-label"><b>HAND</b><span>' + u.hand.length + ' CARDS</span></div><div class="hand">' + hand + '</div></div>' + turnHtml + playHtml + attackHtml + leaderSkillHtml + transferHtml + impactHtml + finaleHtml + '</section>';
    app.innerHTML=shell(board+actionPanel(),true);
    if(motion||impact||leaderAwaken||lifeTransfer||leaderSkill||b.finishQueued){
      clearTimeout(battleMotionCleanupTimer);
      battleMotionCleanupTimer=setTimeout(function(){
        app.querySelectorAll('.motion-overlay,.life-transfer,.impact-effect').forEach(function(element){element.remove();});
        app.querySelectorAll('.summon-motion,.equip-motion,.draw-motion').forEach(function(element){element.classList.remove('summon-motion','equip-motion','draw-motion');});
      },state.light?100:1200);
    }
    if(state.targeting!=null)requestAnimationFrame(resetAttackTrail);
    if(state.pendingAttack)requestAnimationFrame(updateCpuAttackTrail);
  }
  function choose(title,buttons,canCancel) { var cancel=canCancel===false?'':'<button class="secondary" data-action="close-modal">キャンセル</button>';var modal=document.createElement('div');modal.className='modal';modal.innerHTML='<div class="dialog"><h2>' + esc(title) + '</h2><div class="actions">' + buttons + cancel + '</div></div>';document.body.appendChild(modal); }
  function playFromHand(index) { var card=state.battle.user.hand[index];if(!card)return;if(state.battle.active!=='user')return toast('CPUのターンです');if((card.cost||0)>state.battle.user.cost)return toast('使える葱COSTが足りません');if(card.type==='song'&&state.battle.user.field.length>=3)choose('入れ替える楽曲',state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="replace-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>';}).join(''));else if(card.type==='singer'&&state.battle.user.field.length)choose('装備する楽曲',state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="equip-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>';}).join(''));else{lockBattleInput();VocaluEngine.playCard(state.battle,'user',index,0);if(card.type==='producer')showSupportNotice();else render();} }
  function showSupportNotice(){var support=state.battle&&state.battle.lastSupport;if(!support)return render();state.battle.lastSupport=null;render();var card=VocaluCatalog.cards.find(function(item){return item.id===support.cardId;}),modal=document.createElement('div');modal.className='modal support-modal';modal.dataset.revealed=support.revealed?JSON.stringify(support.revealed):'';modal.innerHTML='<div class="dialog support-dialog"><span class="support-cut-in">SUPPORT</span><h2>' + esc(support.cardName) + '</h2>' + (card?'<div class="support-card">' + cardFace(card,false) + '</div>':'') + '<div class="support-abilities">' + support.abilities.map(function(ability){return '<section><b>' + esc(ability.label) + '</b><p>' + esc(ability.text) + '</p></section>';}).join('') + '</div><button class="primary" data-action="support-next">' + (support.revealed?'山札の上を公開する':'効果を確認して続ける') + '</button></div>';document.body.appendChild(modal);}
  function revealSupportCard(modal){var info={};try{info=JSON.parse(modal.dataset.revealed||'{}');}catch(ignore){}var card=VocaluCatalog.cards.find(function(item){return item.id===info.cardId;}),dialog=modal.querySelector('.dialog');if(!card)return modal.remove();dialog.innerHTML='<span class="support-cut-in">DECK TOP</span><h2>山札の上から公開</h2><div class="support-revealed ' + (info.outcome==='bottom'?'to-bottom':'to-hand') + '">' + cardFace(card,false) + '</div><div class="support-destination"><span>' + (info.outcome==='bottom'?'条件に合わないため':'条件を満たしたため') + '</span><strong>' + esc(info.label||'効果処理') + '</strong></div><button class="primary" data-action="support-finish">確認して続ける</button>';}
  function positionAttackTrail(trail,source,targetX,targetY){if(!trail||!source)return;var rect=source.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2,dx=targetX-x,dy=targetY-y;trail.style.left=x+'px';trail.style.top=y+'px';trail.style.width=Math.max(12,Math.hypot(dx,dy))+'px';trail.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';}
  function updateAttackTrail(clientX,clientY){var trail=document.querySelector('[data-attack-trail]'),source=document.querySelector('.user-field .battle-slot:nth-child(' + (Number(state.targeting)+1) + ')');positionAttackTrail(trail,source,clientX,clientY);}
  function updateCpuAttackTrail(){var pending=state.pendingAttack,trail=document.querySelector('[data-cpu-attack-trail]');if(!pending||!trail)return;var source=document.querySelector('.enemy-field .battle-slot:nth-child(' + (Number(pending.attackerIndex)+1) + ')');var target=pending.targetType==='song'?document.querySelector('.user-field .battle-slot:nth-child(' + (Number(pending.targetIndex)+1) + ')'):document.querySelector('.battle-zone.user .life-target');if(!source||!target)return;var targetRect=target.getBoundingClientRect();positionAttackTrail(trail,source,targetRect.left+targetRect.width/2,targetRect.top+targetRect.height/2);}
  function resetAttackTrail(){var field=document.querySelector('.enemy-field');if(!field)return;var rect=field.getBoundingClientRect();updateAttackTrail(rect.left+rect.width/2,rect.top+rect.height/2);}
  function chooseCpuGuard(targetType,targetIndex,attackerIndex) {
    var cpu=state.battle.cpu,attacker=state.battle.user.field[attackerIndex],attackPower=VocaluEngine.effectivePower(attacker),difficulty=state.difficulty;
    if(difficulty==='normal')return targetType==='life'&&cpu.life<=1?cpu.field.findIndex(function(){return true;}):null;
    var active=cpu.field.map(function(card,index){return {card:card,index:index,power:VocaluEngine.effectivePower(card)};}).filter(function(item){return !item.card.attacked;});
    if(targetType==='song'){
      var target=cpu.field[targetIndex];
      if(!target||!active.length)return null;
      if(difficulty==='hard'&&VocaluEngine.effectivePower(target)<attackPower)return null;
      active.sort(function(a,b){var aSurvives=a.power>=attackPower?0:1,bSurvives=b.power>=attackPower?0:1;return aSurvives-bSurvives||a.power-b.power;});
      return active[0].index;
    }
    var lifeGuards=cpu.field.map(function(card,index){return {card:card,index:index,power:VocaluEngine.effectivePower(card)};});
    if(cpu.life>2&&difficulty!=='expert')return null;
    if(cpu.life>1&&difficulty==='expert'&&lifeGuards.every(function(item){return item.power<attackPower;}))return null;
    lifeGuards.sort(function(a,b){var aSurvives=a.power>=attackPower?0:1,bSurvives=b.power>=attackPower?0:1;return aSurvives-bSurvives||a.power-b.power;});
    return lifeGuards.length?lifeGuards[0].index:null;
  }
  function resolveUserAttack(targetType,targetIndex) { var attacker=state.targeting,guard=chooseCpuGuard(targetType,targetIndex,attacker);state.targeting=null;if(guard<0)guard=null;lockBattleInput();VocaluEngine.attack(state.battle,'user',attacker,targetType,targetIndex,guard);if(guard!=null)toast(targetType==='life'?'CPUの楽曲がライフをガード':'CPUのACTIVE楽曲がガード');state.selectedUnit=null;afterAction(); }
  function showTriggerNotice(resume) { var trigger=state.battle&&state.battle.lastTrigger;if(!trigger)return false;state.battle.lastTrigger=null;state.triggerResume=resume||null;render();var card=VocaluCatalog.cards.find(function(item){return item.id===trigger.cardId;});var modal=document.createElement('div');modal.className='modal trigger-modal';modal.innerHTML='<div class="dialog trigger-dialog"><span class="trigger-cut-in">TRIGGER</span><h2>' + esc(trigger.label) + '</h2>' + (card?'<div class="trigger-card">' + cardFace(card,false) + '</div>':'<b class="trigger-card-name">' + esc(trigger.cardName) + '</b>') + '<div class="trigger-effect"><span>' + esc((trigger.side==='user'?'あなた':'CPU')+'のLIFEから発動') + '</span><strong>' + esc(trigger.cardName) + '</strong><p>' + esc(trigger.text) + '</p></div><button class="primary" data-action="dismiss-trigger">効果を確認して続ける</button></div>';setTimeout(function(){if(state.battle)document.body.appendChild(modal);},state.light?40:720);return true; }
  function afterAction(){state.panelTab='log';if(showTriggerNotice(state.battle.winner?finishBattle:null))return;if(state.battle.winner)finishBattle();else render();}
  function finishBattle(){
    if(state.battle.finishQueued)return;
    state.battle.finishQueued=true;
    render();
    setTimeout(completeBattle,state.light?80:1050);
  }
  function completeBattle(){
    if(!state.battle||!state.battle.finishQueued)return;
    saveCollection(state.opened);
    track('vocalu_battle_complete',{mode:state.matchMode,difficulty:state.difficulty,result:state.battle.winner==='user'?'win':'loss',turns:state.battle.turn});
    if(state.matchMode==='ranked'&&!state.battle.rankSettled){
      var won=state.battle.winner==='user';
      state.battle.rankDelta=won?25:-20;
      state.rank.rating=Math.max(0,state.rank.rating+state.battle.rankDelta);
      if(won)state.rank.wins+=1;else state.rank.losses+=1;
      state.battle.rankSettled=true;saveRank();
    }
    state.screen='result';render();
  }
  function renderResult(){var win=state.battle.winner==='user';var ranked=state.matchMode==='ranked';var rankResult=ranked?'<div class="rank-result"><span>' + (state.battle.rankDelta>0?'+':'') + state.battle.rankDelta + ' RATE</span><b>' + rankName(state.rank.rating) + ' · ' + state.rank.rating + '</b></div>':'';app.innerHTML=shell('<section class="battle-result-stage '+(win?'win':'loss')+'"><div class="result-rays"><i></i><i></i><i></i></div><span class="eyebrow">BATTLE RESULT</span><div class="result-emblem"><small>'+(win?'VOCALU LIVE COMPLETE':'RETRY THE STAGE')+'</small><h1>' + (win?'LIVE CLEAR!':'NEXT STAGE') + '</h1><b>'+(win?'WIN':'LOSE')+'</b></div><p>' + (win?'勝利しました。':'今回はCPUの勝利です。') + ' 開封した25枚をコレクションに保存しました。</p></section>' + rankResult + '<div class="actions result-actions"><button class="primary" data-action="rematch">もう一度遊ぶ</button><button class="secondary" data-action="home">ロビーへ戻る</button><button class="secondary" data-action="collection">コレクションを見る</button></div>');}
  function collectionNumber(index){return 'No.'+String(index+1).padStart(3,'0');}
  function collectionCardHtml(entry){
    var card=entry.card,count=entry.owned,number=collectionNumber(entry.index);
    if(!count)return '<article class="card collection-card locked"><div class="collection-slot"><span class="collection-number">'+number+'</span><span class="collection-lock" aria-label="未所持"><b>V</b><small>未所持</small></span><span class="collection-type">'+typeName(card.type)+'</span></div></article>';
    return '<article class="card collection-card owned"><button type="button" data-action="detail" data-card="'+esc(card.id)+'">'+cardFace(card,false)+'<span class="collection-number">'+number+'</span><span class="owned-count">×'+count+'</span></button></article>';
  }
  function collectionEntries(){
    var query=state.collectionQuery.toLocaleLowerCase('ja');
    var rarityRank={N:0,R:1,SR:2,UR:3,SEC:4};
    var entries=VocaluCatalog.cards.map(function(card,index){return {card:card,index:index,owned:Number(state.collection[card.id])||0};});
    if(state.collectionType!=='all')entries=entries.filter(function(entry){return entry.card.type===state.collectionType;});
    if(state.collectionView==='owned')entries=entries.filter(function(entry){return entry.owned>0;});
    if(query)entries=entries.filter(function(entry){var card=entry.card;return [card.name,card.producer,card.profile,card.text].filter(Boolean).join(' ').toLocaleLowerCase('ja').indexOf(query)>=0;});
    entries.sort(function(a,b){
      if(state.collectionSort==='rarity')return (rarityRank[b.card.rarity]||0)-(rarityRank[a.card.rarity]||0)||a.index-b.index;
      if(state.collectionSort==='cost')return (b.card.cost||0)-(a.card.cost||0)||a.index-b.index;
      if(state.collectionSort==='power')return cardValue(b.card)-cardValue(a.card)||a.index-b.index;
      if(state.collectionSort==='name')return a.card.name.localeCompare(b.card.name,'ja');
      return a.index-b.index;
    });
    return entries;
  }
  function renderCollection(){
    var all=VocaluCatalog.cards,ownedTotal=all.filter(function(card){return state.collection[card.id];}).length;
    var completion=Math.round(ownedTotal/all.length*100),entries=collectionEntries();
    var typeCounts=['song','producer','singer'].map(function(type){var total=all.filter(function(card){return card.type===type;}).length;var owned=all.filter(function(card){return card.type===type&&state.collection[card.id];}).length;return '<span><small>'+typeName(type)+'</small><b>'+owned+' / '+total+'</b></span>';}).join('');
    var typeTabs=[['all','すべて'],['song','楽曲'],['producer','ボカロP'],['singer','歌い手']].map(function(item){return '<button data-action="collection-type" data-type="'+item[0]+'" aria-pressed="'+(state.collectionType===item[0])+'">'+item[1]+'</button>';}).join('');
    var sortOptions=[['number','カード番号'],['rarity','レアリティ'],['cost','コスト'],['power','パワー'],['name','名前']].map(function(item){return '<option value="'+item[0]+'" '+(state.collectionSort===item[0]?'selected':'')+'>'+item[1]+'</option>';}).join('');
    var empty='<div class="collection-empty"><b>該当するカードがありません</b><p>検索条件を変えるか、未所持カードも表示してみてください。</p><button class="secondary" data-action="collection-clear">条件を解除</button></div>';
    app.innerHTML=shell('<section class="collection-head"><div><span>CARD LIBRARY</span><h1>VOCALU図鑑</h1><p>開封したカードを集めて、楽曲とクリエイターをもっと知ろう。</p></div><div class="collection-completion"><b>'+completion+'%</b><small>'+ownedTotal+' / '+all.length+' 種</small></div><div class="collection-progress"><i style="width:'+completion+'%"></i></div><div class="collection-breakdown">'+typeCounts+'</div></section>'+
      '<form class="collection-search" data-collection-form><label><span>カード検索</span><input type="search" data-collection-query value="'+esc(state.collectionQuery)+'" placeholder="楽曲名・ボカロP・歌い手" autocomplete="off"></label><button type="submit">検索</button></form>'+
      '<div class="collection-tabs" role="group" aria-label="カード種別">'+typeTabs+'</div>'+
      '<div class="collection-toolbar"><div role="group" aria-label="所持状況"><button data-action="collection-view" data-view="all" aria-pressed="'+(state.collectionView==='all')+'">図鑑</button><button data-action="collection-view" data-view="owned" aria-pressed="'+(state.collectionView==='owned')+'">所持のみ</button></div><label><span>並び順</span><select data-collection-sort>'+sortOptions+'</select></label><small>'+entries.length+'件</small></div>'+
      (entries.length?'<div class="cards collection-grid">'+entries.map(collectionCardHtml).join('')+'</div>':empty)+
      '<div class="deck-footer"><button class="primary" data-action="home">ホームへ</button></div>');
  }
  function mediaEmbed(card){if(card.type!=='song'||!card.videoUrl)return '';var url=card.videoUrl,embed='';var youtube=url.match(/[?&]v=([\w-]{6,})/)||url.match(/youtu\.be\/([\w-]{6,})/);var nico=url.match(/nicovideo\.jp\/watch\/(sm\d+)/);if(youtube)embed='https://www.youtube-nocookie.com/embed/'+youtube[1]+'?playsinline=1';else if(nico)embed='https://embed.nicovideo.jp/watch/'+nico[1];if(!embed)return '';return '<div class="song-player"><span>公式楽曲を再生</span><iframe src="' + esc(embed) + '" title="' + esc(card.name) + ' 公式動画" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';}
  function detailContent(card){var text=card.type==='song'?card.metricNote:(card.text||card.profile);var trigger=card.trigger?'<div class="trigger-detail"><b>TRIGGER · ' + esc(card.trigger.label) + '</b><p>' + esc(card.trigger.text) + '</p></div>':'';var abilities=(card.abilities||[]).map(function(ability){return '<div class="ability-detail"><b>' + esc(ability.label) + '</b><p>' + esc(ability.text) + '</p></div>';}).join('');var equip=card.singer?'<div class="equipment-detail"><h3>装備中の歌い手</h3>' + cardFace(card.singer,false) + '<p>POWER +' + card.singer.boost + '</p></div>':'';var source=card.videoUrl||card.profileUrl;return '<div class="detail-card">' + cardFace(card,false) + '</div><p>' + esc(text) + '</p>' + abilities + trigger + equip + mediaEmbed(card) + (source?'<a class="official-link" href="' + esc(source) + '" target="_blank" rel="noopener">掲載元を見る</a>':'');}
  function cardDetail(id){var card=VocaluCatalog.cards.find(function(c){return c.id===id;});if(card)choose(card.name,detailContent(card)+'<p>所持 ' + (state.collection[id]||0) + '枚</p>');}
  function battleDetail(side,index){var card=state.battle[side].field[index];if(card)choose(card.name,detailContent(card));}
  function showDiscard(side){var cards=state.battle[side].discard.slice().reverse();var title=(side==='user'?'あなた':'CPU')+'のDROP';var content=cards.length?'<div class="discard-history">' + cards.map(function(card){return '<button data-action="discard-detail" data-card="' + esc(card.id) + '">' + cardFace(card,false) + '</button>';}).join('') + '</div>':'<p class="notice">まだ使われたカードはありません。</p>';choose(title,content);}
  function toast(message){var old=document.querySelector('.error-toast');if(old)old.remove();var el=document.createElement('div');el.className='error-toast';el.textContent=message;document.body.appendChild(el);setTimeout(function(){el.remove();},3500);}
  function lockBattleInput(duration){battleInputLockedUntil=Date.now()+(state.light?40:(duration||520));}
  function initMusic(){if(yt&&state.music.ready){state.music.playing?yt.pauseVideo():yt.playVideo();return;}state.music.title='YouTubeを接続中';render();window.onYouTubeIframeAPIReady=function(){try{yt=new YT.Player('yt-player',{height:'1',width:'1',playerVars:{listType:'playlist',list:'PL4hnIvXd3nC4mvwumy4IFfY4d8vVmcVGA',playsinline:1,controls:0},events:{onReady:function(e){state.music.ready=true;e.target.setVolume(state.music.volume);e.target.playVideo();},onStateChange:function(e){state.music.playing=e.data===1;try{state.music.title=e.target.getVideoData().title||'VOCALU BGM';}catch(ignore){}render();},onError:function(){toast('BGMを読み込めませんでした。');}}});}catch(err){toast('BGMの初期化に失敗しました。');}};if(!document.getElementById('youtube-api')){var s=document.createElement('script');s.id='youtube-api';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}}
  function musicControls(){if(!state.music.ready)initMusic();choose('BGM','<p>' + esc(state.music.title) + '</p><button class="secondary" data-action="music-prev">前の曲</button><button class="secondary" data-action="music-toggle">再生 / 停止</button><button class="secondary" data-action="music-next">次の曲</button><button class="secondary" data-action="music-down">音量 -</button><button class="secondary" data-action="music-up">音量 +</button><p>音量 ' + state.music.volume + '</p>');}
  function battleSettings(){choose('対戦設定','<div class="settings-group"><span>BGM</span><b>' + esc(state.music.title) + '</b><button class="secondary" data-action="music-toggle">' + (state.music.playing?'一時停止':'BGMを再生') + '</button></div><label class="settings-volume"><span>BGM音量</span><b data-volume-label>' + state.music.volume + '</b><input type="range" min="0" max="100" step="5" value="' + state.music.volume + '" data-volume></label><button class="secondary" data-action="battle-toggle-light">軽量モード ' + (state.light?'ON':'OFF') + '</button><button class="danger-button" data-action="retire-confirm">対戦をリタイア</button>');}
  function battleGuide(){choose('遊び方・キーワード','<div class="rule-guide"><section><h3>勝利条件</h3><p>相手のLIFEを0にすると勝利。毎ターン使える葱COSTが1増え、最大10になります。後攻は最初のターンだけ2枚引き、後攻自身の1〜3ターン目は葱COSTが通常より1多くなります。</p></section><section><h3>LEADER / AWAKEN</h3><p>リーダーはデッキ外から毎ターン1回の固有スキルを使います。通常はPOWER +500。LIFE 2以下で覚醒すると+1000へ強化され、その後LIFEを回復しても覚醒は解除されません。</p></section><section><h3>ACTIVE / REST</h3><p>ACTIVEは攻撃とガードが可能で、直接攻撃されません。攻撃後はRESTになり、攻撃対象になります。REST中はPOWER -1000。同じPOWERなら双方がDROPへ行く相打ちです。</p></section><section><h3>GUARD</h3><p>ACTIVE楽曲は、味方のREST楽曲をガードできます。LIFEへの攻撃はACTIVE・RESTどちらでもガードできます。</p></section><section><h3>SUPPORT / TAG TEAM</h3><p>ボカロPは0コストで使える、1ターン1枚の使い切りサポート。山札確認・ドロー・楽曲強化などでライブを支えます。歌い手は楽曲へ装備し、TAG TEAMとしてPOWERを強化します。</p></section><section><h3>TRIGGER</h3><p>LIFEから加わったカードがTRIGGERを持つと、勝敗判定より先に逆転効果を解決します。高コスト楽曲はLIFE差の条件を満たすと無料でACTIVE登場します。</p></section></div>');}
  function logStyle(entry){if(/のターン/.test(entry))return ['turn','↻','TURN'];if(/TRIGGER/.test(entry))return ['trigger','✦','TRIGGER'];if(/攻撃|ガード/.test(entry))return ['attack','⚔','BATTLE'];if(/召喚|装備|サポート/.test(entry))return ['play','＋','PLAY'];if(/ドロー|POWER/.test(entry))return ['effect','◆','EFFECT'];return ['system','•','SYSTEM'];}
  function battleLog(){var b=state.battle;var summary='<div class="log-summary"><div><span>TURN</span><b>'+b.turn+'</b></div><div><span>YOU</span><b>LIFE '+b.user.life+'</b></div><div><span>CPU</span><b>LIFE '+b.cpu.life+'</b></div></div>';var entries=b.log.slice(0,40).map(function(entry,index){var meta=logStyle(entry);return '<div class="log-entry '+meta[0]+'"><i>'+meta[1]+'</i><div><span>'+meta[2]+(index===0?' · LATEST':'')+'</span><p>'+esc(entry)+'</p></div></div>';}).join('');choose('BATTLE HISTORY',summary+'<div class="battle-log modal-log">'+entries+'</div>');}
  function runCpuTurn(){VocaluEngine.endTurn(state.battle,'user');VocaluEngine.cpuMainPhase(state.battle,state.difficulty);state.selectedUnit=null;state.pendingAttack=null;state.panelTab='log';render();setTimeout(runNextCpuAttack,state.light?20:280);}
  function cpuTarget(attacker,field){var candidates=field.map(function(card,index){return {card:card,index:index,power:VocaluEngine.effectivePower(card)};}).filter(function(x){return x.card.attacked&&attacker.currentPower>=x.power;});if(!candidates.length)return -1;if(state.difficulty==='normal')return candidates[0].index;candidates.sort(function(a,b){return state.difficulty==='expert'?b.power-a.power:a.power-b.power;});return candidates[0].index;}
  function runNextCpuAttack(){var b=state.battle;if(b.winner)return finishBattle();var ai=b.cpu.field.findIndex(function(song){return !song.attacked;});if(ai<0){state.pendingAttack=null;VocaluEngine.endTurn(b,'cpu');return render();}var attacker=b.cpu.field[ai];var target=cpuTarget(attacker,b.user.field);state.pendingAttack={attackerIndex:ai,targetType:target>=0&&b.user.life>1?'song':'life',targetIndex:target>=0&&b.user.life>1?target:null};state.panelTab='action';render();}

  document.addEventListener('click',function(event){var button=event.target.closest('[data-action]');if(!button)return;var action=button.dataset.action;try{
    if(state.screen==='battle'&&Date.now()<battleInputLockedUntil&&['play','replace-play','equip-play','attack-life','end-turn','resolve-cpu-attack'].indexOf(action)>=0)return;
    if(action==='start'||action==='free-match')beginMatch('free');
    else if(action==='ranked-match'){if(state.rank.username)beginMatch('ranked');else rankRegistration(true);}
    else if(action==='edit-rank-name')rankRegistration(false);
    else if(action==='save-rank-name'){var rankInput=button.closest('.dialog').querySelector('[data-rank-name]');saveRankName(rankInput&&rankInput.value);var shouldStart=button.dataset.start==='ranked';button.closest('.modal').remove();track('vocalu_rank_name_register',{location:shouldStart?'rank_start':'lobby'});if(shouldStart)beginMatch('ranked');else render();}
    else if(action==='open-pack'){if(button.classList.contains('opening'))return;button.classList.add('opening');button.disabled=true;setTimeout(function(){revealPack(VocaluEngine.openPack(VocaluCatalog.cards));},state.light?20:720);}
    else if(action==='bulk-open'){while(state.packNo<5){state.opened=state.opened.concat(VocaluEngine.openPack(VocaluCatalog.cards));state.packNo+=1;}state.screen='deck';state.selected=VocaluEngine.autoBuild(state.opened);render();}
    else if(action==='next-pack'){state.screen=state.packNo<5?'pack':'deck';if(state.screen==='deck')state.selected=VocaluEngine.autoBuild(state.opened);render();}
    else if(action==='select'){var idx=Number(button.dataset.index),pos=state.selected.indexOf(idx);if(pos>=0)state.selected.splice(pos,1);else if(state.selected.length<20)state.selected.push(idx);else toast('デッキは20枚です');render();}
    else if(action==='auto-deck'){state.selected=VocaluEngine.autoBuild(state.opened);render();}
    else if(action==='clear-deck'){state.selected=[];render();}
    else if(action==='battle-setup'){state.screen='setup';render();}
    else if(action==='difficulty'){state.difficulty=button.dataset.level;render();}
    else if(action==='choose-leader'){state.leaderChoice=button.dataset.leader==='teto'?'teto':'miku';try{localStorage.setItem(LEADER_STORAGE,state.leaderChoice);}catch(ignoreLeader){}render();}
    else if(action==='test-battle'&&testMode)startTestBattle();
    else if(action==='back-deck'){state.screen='deck';render();}
    else if(action==='battle-start')startBattle();
    else if(action==='mulligan-toggle'){var mi=Number(button.dataset.index),mp=state.mulliganSelected.indexOf(mi);if(mp>=0)state.mulliganSelected.splice(mp,1);else state.mulliganSelected.push(mi);render();}
    else if(action==='clear-mulligan'){state.mulliganSelected=[];render();}
    else if(action==='mulligan'){VocaluEngine.mulligan(state.battle,state.mulliganSelected);state.mulliganSelected=[];render();}
    else if(action==='keep-hand'){state.screen='battle';render();}
    else if(action==='play')playFromHand(Number(button.dataset.index));
    else if(action==='hand-detail'){var handCard=state.battle.user.hand[Number(button.dataset.index)];if(handCard)choose(handCard.name,detailContent(handCard));}
    else if(action==='replace-play'||action==='equip-play'){button.closest('.modal').remove();lockBattleInput();VocaluEngine.playCard(state.battle,'user',Number(button.dataset.hand),Number(button.dataset.index));render();}
    else if(action==='select-unit'){var side=button.dataset.side,index=Number(button.dataset.index);if(side==='cpu'&&state.targeting!=null&&state.battle.cpu.field[index].attacked)resolveUserAttack('song',index);else if(side==='cpu'&&state.targeting!=null)toast('ACTIVE状態の楽曲は攻撃対象にできません');else{state.selectedUnit={side:side,index:index};state.panelTab='action';state.targeting=side==='user'&&state.battle.active==='user'&&!state.battle.user.field[index].attacked?index:null;render();}}
    else if(action==='attack-life')resolveUserAttack('life',null);
    else if(action==='cancel-action'){state.targeting=null;state.selectedUnit=null;state.panelTab='log';render();}
    else if(action==='panel-tab'){state.panelTab=button.dataset.tab;render();}
    else if(action==='battle-detail')battleDetail(button.dataset.side,Number(button.dataset.index));
    else if(action==='show-discard')showDiscard(button.dataset.side);
    else if(action==='discard-detail'){button.closest('.modal').remove();cardDetail(button.dataset.card);}
    else if(action==='battle-settings')battleSettings();
    else if(action==='battle-guide')battleGuide();
    else if(action==='battle-log')battleLog();
    else if(action==='battle-toggle-light'){button.closest('.modal').remove();state.light=!state.light;render();}
    else if(action==='retire-confirm'){button.closest('.modal').remove();choose('対戦を終了しますか？','<p>現在の対戦結果と開封カードは保存されません。</p><button class="danger-button" data-action="retire">リタイアする</button>');}
    else if(action==='retire'){document.querySelectorAll('.modal').forEach(function(modal){modal.remove();});state.battle=null;state.selectedUnit=null;state.targeting=null;state.pendingAttack=null;state.screen='home';render();}
    else if(action==='end-turn'){lockBattleInput();runCpuTurn();}
    else if(action==='resolve-cpu-attack'){var attack=state.pendingAttack||{};var targetType=button.dataset.target||attack.targetType||'life',targetIndex=targetType==='song'?Number(button.dataset.targetIndex):null,guardIndex=button.dataset.guard==='none'?null:Number(button.dataset.guard),attackerIndex=Number(button.dataset.attacker);state.pendingAttack=null;lockBattleInput();VocaluEngine.attack(state.battle,'cpu',attackerIndex,targetType,targetIndex,guardIndex);if(showTriggerNotice(state.battle.winner?finishBattle:runNextCpuAttack))return;if(state.battle.winner)finishBattle();else{render();setTimeout(runNextCpuAttack,state.light?20:520);}}
    else if(action==='dismiss-trigger'){button.closest('.modal').remove();var resume=state.triggerResume;state.triggerResume=null;if(resume)setTimeout(resume,state.light?20:280);else render();}
    else if(action==='support-next'){var supportModal=button.closest('.support-modal');if(supportModal.dataset.revealed)revealSupportCard(supportModal);else supportModal.remove();}
    else if(action==='support-finish')button.closest('.support-modal').remove();
    else if(action==='close-modal')button.closest('.modal').remove();
    else if(action==='collection'){state.screen='collection';render();}
    else if(action==='collection-type'){state.collectionType=button.dataset.type||'all';render();}
    else if(action==='collection-view'){state.collectionView=button.dataset.view==='owned'?'owned':'all';render();}
    else if(action==='collection-clear'){state.collectionType='all';state.collectionView='all';state.collectionSort='number';state.collectionQuery='';render();}
    else if(action==='home'){state.screen='home';render();}
    else if(action==='restart'||action==='rematch')beginMatch(state.matchMode);
    else if(action==='toggle-light'){state.light=!state.light;render();}
    else if(action==='share-x'){track('vocalu_share',{method:'x',location:'lobby'});var shareText='ボカロ楽曲で20枚デッキを組んで遊べる「ボカる！」を公開しました。\n5パック開封→デッキ構築→CPU対戦までスマホで無料。\nあなたなら最初にどの曲を収録したい？\n\n#ボカロ #VOCALU';var shareUrl='https://anadayo.github.io/vocalu/?utm_source=x&utm_medium=social&utm_campaign=vocalu_launch';window.open('https://x.com/intent/post?text='+encodeURIComponent(shareText)+'&url='+encodeURIComponent(shareUrl),'_blank','noopener');}
    else if(action==='music')musicControls();
    else if(action==='music-prev'){if(yt&&state.music.ready)yt.previousVideo();}
    else if(action==='music-next'){if(yt&&state.music.ready)yt.nextVideo();}
    else if(action==='music-toggle'){if(yt&&state.music.ready)(state.music.playing?yt.pauseVideo():yt.playVideo());}
    else if(action==='music-down'||action==='music-up'){state.music.volume=Math.max(0,Math.min(100,state.music.volume+(action==='music-up'?10:-10)));if(yt&&state.music.ready)yt.setVolume(state.music.volume);button.closest('.modal').remove();musicControls();}
    else if(action==='detail')cardDetail(button.dataset.card);
    else if(action==='force-rare'){var forced=VocaluCatalog.cards.find(function(c){return c.rarity===button.dataset.rare;});flash(button.dataset.rare);choose(button.dataset.rare+'演出確認',cardHtml(forced,-1,false));}
    else if(action==='reset-save'){localStorage.removeItem(STORAGE);localStorage.removeItem(MIGRATION);localStorage.removeItem(RANK_STORAGE);localStorage.removeItem(RANK_BOARD_STORAGE);localStorage.removeItem(PLAYER_PROFILES_STORAGE);localStorage.removeItem(CURRENT_PLAYER_STORAGE);localStorage.removeItem(LEADER_STORAGE);state.collection={};state.rank={username:'',rating:1000,wins:0,losses:0};state.leaderChoice='miku';render();}
  }catch(err){toast(err.message||'操作を続けられませんでした');console.error(err);}});
  document.addEventListener('submit',function(event){if(!event.target.matches('[data-collection-form]'))return;event.preventDefault();var input=event.target.querySelector('[data-collection-query]');state.collectionQuery=(input&&input.value||'').trim();render();});
  document.addEventListener('change',function(event){if(!event.target.matches('[data-collection-sort]'))return;state.collectionSort=event.target.value;render();});
  document.addEventListener('input',function(event){if(!event.target.matches('[data-volume]'))return;state.music.volume=Number(event.target.value);var label=event.target.closest('.dialog').querySelector('[data-volume-label]');if(label)label.textContent=state.music.volume;if(yt&&state.music.ready)yt.setVolume(state.music.volume);});
  var startY=0;app.addEventListener('touchstart',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.touches[0])startY=e.touches[0].clientY;},{passive:true});app.addEventListener('touchend',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.changedTouches[0]&&startY-e.changedTouches[0].clientY>35)p.click();},{passive:true});
  app.addEventListener('pointermove',function(e){if(state.targeting!=null)updateAttackTrail(e.clientX,e.clientY);},{passive:true});
  window.addEventListener('resize',function(){if(state.pendingAttack)requestAnimationFrame(updateCpuAttackTrail);});
  document.addEventListener('error',function(e){if(e.target&&e.target.matches&&e.target.matches('.card-art img')){var art=e.target.parentNode;art.innerHTML='<div class="song-cover"><b>♪</b><span>画像を表示できません</span></div>';e.target.remove();}},true);
  function fatalError(message){boot.hidden=true;app.hidden=true;fatal.hidden=false;document.getElementById('fatal-message').textContent=message;}
  window.addEventListener('error',function(e){if(!app.hidden)toast('エラーから復旧しました: '+e.message);else fatalError('起動エラー: '+e.message);});window.addEventListener('unhandledrejection',function(e){toast('処理エラーから復旧しました');console.error(e.reason);});document.getElementById('reload-button').addEventListener('click',function(){location.reload();});
  try{if(!window.VocaluCatalog||!window.VocaluEngine)throw new Error('必要なゲームデータを読み込めませんでした');if(VocaluCatalog.counts.total!==300)throw new Error('カードデータが300種類ではありません');boot.hidden=true;app.hidden=false;render();}catch(err){fatalError(err.message);}
}());
