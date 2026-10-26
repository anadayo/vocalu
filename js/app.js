(function () {
  'use strict';
  var app = document.getElementById('app');
  var boot = document.getElementById('boot');
  var fatal = document.getElementById('fatal');
  var testMode = new URLSearchParams(location.search).get('test') === '1';
  var STORAGE = 'vocalu-save-v1';
  var MIGRATION = 'vocalu-migration-v3';
  var RANK_STORAGE = 'vocalu-rank-v1';
  var state = {
    screen: 'home', opened: [], packNo: 0, selected: [], battle: null,
    selectedUnit: null, targeting: null, panelTab: 'log', triggerResume: null, mulliganSelected: [],
    difficulty: 'normal', matchMode: 'free', rank: loadRank(),
    collection: loadAndMigrate(), light: matchMedia('(prefers-reduced-motion: reduce)').matches,
    music: { ready: false, playing: false, volume: 40, title: 'BGM未再生' }
  };
  var yt = null;
  var renderedScreen = null;

  function loadRank() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(RANK_STORAGE) || '{}'); } catch (ignore) {}
    return {
      rating: Math.max(0, Number(saved.rating) || 1000),
      wins: Math.max(0, Number(saved.wins) || 0),
      losses: Math.max(0, Number(saved.losses) || 0)
    };
  }
  function saveRank() { try { localStorage.setItem(RANK_STORAGE, JSON.stringify(state.rank)); } catch (ignore) {} }
  function rankName(rating) { return rating >= 1700 ? 'MASTER' : rating >= 1500 ? 'PLATINUM' : rating >= 1300 ? 'GOLD' : rating >= 1100 ? 'SILVER' : 'BRONZE'; }
  function beginMatch(mode) {
    state.matchMode=mode;
    state.difficulty=mode==='ranked'?'expert':'normal';
    state.opened=[];state.packNo=0;state.selected=[];state.battle=null;
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
    var value=card.type==='song'?'<b class="card-stat"><small>POWER</small><strong>'+cardValue(card)+'</strong></b>':card.type==='producer'?'<b class="card-stat support"><strong>SUPPORT</strong></b>':'<b class="card-stat"><small>BOOST</small><strong>+'+cardValue(card)+'</strong></b>';
    var rest=card.type==='song'?'<span class="rest-power-rail"><small>REST POWER</small><b>'+restPower(card)+'</b></span>':'';
    return '<span class="card-face ' + (compact ? 'compact' : '') + (card.singer?' has-singer':'') + '"><span class="card-head"><span class="card-cost">' + card.cost + '</span><strong>' + esc(card.name) + '</strong><span class="card-rarity ' + card.rarity + '">' + card.rarity + '</span></span><span class="card-art">' + artHtml(card) + equipment + rest + '</span>' + ruleBox + '<span class="card-foot"><small>' + typeName(card.type) + (card.trigger ? ' · TRIGGER' : '') + (card.attacked ? ' · REST' : '') + '</small>' + value + '</span></span>';
  }
  function shell(content, battle) {
    if (battle) return '<main class="game-shell"><div class="battle-tools"><button data-action="battle-guide" title="ルールガイド" aria-label="ルールガイド">☰</button><button data-action="battle-settings" title="対戦設定" aria-label="対戦設定">⚙</button></div>' + content + '</main>';
    return '<main class="shell"><header class="topbar"><div class="brand">ボカる！ <em>VOCALU</em></div><button class="icon-btn" data-action="music" aria-label="BGM">' + (state.music.playing ? 'Ⅱ' : '♪') + '</button></header>' + content + '</main>';
  }
  function cardHtml(card, index, selectable) {
    var chosen = state.selected.indexOf(index) >= 0;
    return '<article class="card ' + (chosen ? 'selected ' : '') + 'reveal"><button type="button" ' + (selectable ? 'data-action="select" data-index="' + index + '"' : 'data-action="detail" data-card="' + esc(card.id) + '"') + '>' + cardFace(card, false) + '</button></article>';
  }
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
    app.innerHTML = shell('<section class="lobby"><div class="lobby-mast"><div class="lobby-title"><span>VOCALU BATTLE LOBBY</span><h1>ボカる！</h1><p>開けて、組んで、歌わせる。</p></div><img class="lobby-pack" src="assets/bc01-pack.webp" alt="VOCALU BC01"></div><div class="mode-select"><button class="mode-tile ranked" data-action="ranked-match"><span class="mode-index">01</span><span class="mode-copy"><small>CPU LADDER</small><strong>ランクマッチ</strong><em>勝敗でレートが変動</em></span><span class="mode-status"><b>' + rankName(state.rank.rating) + '</b><small>RATE ' + state.rank.rating + '</small></span></button><button class="mode-tile free" data-action="free-match"><span class="mode-index">02</span><span class="mode-copy"><small>CASUAL BATTLE</small><strong>フリーマッチ</strong><em>CPU難易度を選んで対戦</em></span><span class="mode-arrow" aria-hidden="true">›</span></button><button class="mode-tile collection" data-action="collection"><span class="mode-index">03</span><span class="mode-copy"><small>CARD LIBRARY</small><strong>コレクション</strong><em>楽曲の再生とカード確認</em></span><span class="mode-status"><b>' + owned + '</b><small>/ 300</small></span></button></div><div class="lobby-record"><span>RANK RECORD</span><b>' + state.rank.wins + ' WIN</b><b>' + state.rank.losses + ' LOSS</b><button data-action="toggle-light">軽量モード ' + (state.light ? 'ON' : 'OFF') + '</button></div></section>' + testPanel());
  }
  function testPanel() {
    if (!testMode) return '';
    return '<div class="test-panel"><b>開発者テストモード</b><div class="actions"><button class="secondary" data-action="test-battle">盤面・装備テスト</button><button class="secondary" data-action="force-rare" data-rare="SR">SR演出</button><button class="secondary" data-action="force-rare" data-rare="UR">UR演出</button><button class="secondary" data-action="reset-save">保存データ初期化</button></div></div>';
  }
  function renderPack() {
    if (state.packNo >= 5) { state.screen='deck'; state.selected=VocaluEngine.autoBuild(state.opened); return render(); }
    app.innerHTML = shell('<div class="section-head"><h2>BC01 · PACK ' + (state.packNo + 1) + ' / 5</h2><span>' + state.opened.length + ' / 25枚</span></div><div class="pack-stage"><div><button class="pack" data-action="open-pack" aria-label="BC01を開封"><img src="assets/bc01-pack.webp" alt="VOCALU BC01 ブースターパック"><span class="pack-swipe">上へスワイプ または タップ</span></button><p class="swipe-hint"><b>BOOSTER CODE BC01</b><span>5 CARDS</span></p></div></div><button class="secondary" data-action="bulk-open">残りを一括開封</button>');
  }
  function revealPack(cards) {
    state.opened=state.opened.concat(cards); state.packNo+=1;
    var highest=cards.reduce(function(best,c){return rank(c.rarity)>rank(best)?c.rarity:best;},'N'); flash(highest);
    app.innerHTML=shell('<div class="section-head"><h2>開封結果</h2><span>PACK ' + state.packNo + ' / 5</span></div><div class="cards">' + cards.map(function(c,i){return cardHtml(c,state.opened.length-cards.length+i,false);}).join('') + '</div><div class="deck-footer"><button class="primary" data-action="next-pack">' + (state.packNo<5?'次のパック':'デッキを組む') + '</button></div>');
  }
  function rank(r) { return ['N','R','SR','UR'].indexOf(r); }
  function flash(rarity) { if(state.light||rank(rarity)<2)return;var el=document.createElement('div');el.className='rare-flash '+rarity;document.body.appendChild(el);setTimeout(function(){el.remove();},900); }
  function renderDeck() { app.innerHTML=shell('<div class="section-head"><h2>20枚を選ぶ</h2><span>' + state.selected.length + ' / 20枚</span></div><div class="cards">' + state.opened.map(function(c,i){return cardHtml(c,i,true);}).join('') + '</div><div class="deck-footer"><button class="secondary" data-action="auto-deck">おまかせ</button><button class="primary" data-action="battle-setup" ' + (state.selected.length!==20?'disabled':'') + '>対戦準備へ</button></div>'); }
  function makeCpuDeck() { return VocaluCatalog.songs.slice(0,14).concat(VocaluCatalog.producers.slice(0,3),VocaluCatalog.singers.slice(0,3)); }
  function renderSetup() {
    var deck=state.selected.map(function(i){return state.opened[i];}); var lead=deck.find(function(c){return c.type==='song';})||deck[0]; var cpu=makeCpuDeck();
    var levels=[['normal','ノーマル','気軽に対戦'],['hard','ハード','強いカードを優先'],['expert','エキスパート','有利な交換を狙う']];
    var difficulty=state.matchMode==='ranked'?'<section class="ranked-brief"><span>RANK MATCH</span><b>' + rankName(state.rank.rating) + ' · RATE ' + state.rank.rating + '</b><p>エキスパートCPU戦。勝利 +25 / 敗北 -20</p></section>':'<section class="difficulty-select"><span>CPU DIFFICULTY</span><div>' + levels.map(function(level){return '<button class="' + (state.difficulty===level[0]?'active':'') + '" data-action="difficulty" data-level="' + level[0] + '"><b>' + level[1] + '</b><small>' + level[2] + '</small></button>';}).join('') + '</div></section>';
    app.innerHTML=shell('<section class="battle-setup"><div class="setup-deck"><span>YOUR DECK</span>' + cardFace(lead,false) + '<b>VOCALU DECK</b><small>' + deck.length + ' CARDS</small><button class="secondary" data-action="back-deck">デッキ変更</button></div><strong class="versus">VS</strong><div class="setup-deck opponent"><span>CPU DECK</span>' + cardFace(cpu[0],false) + '<b>STUDIO CPU</b><small>' + difficultyName() + '</small></div></section>' + difficulty + '<button class="primary setup-start" data-action="battle-start">BATTLE START</button>');
  }
  function difficultyName(){if(state.matchMode==='ranked')return 'RANKED · EXPERT';return state.difficulty==='expert'?'EXPERT':state.difficulty==='hard'?'HARD':'NORMAL';}
  function startBattle() { var deck=state.selected.map(function(i){return state.opened[i];});state.battle=VocaluEngine.makeBattle(deck,makeCpuDeck());state.selectedUnit=null;state.targeting=null;state.mulliganSelected=[];state.screen='opening';render(); }
  function startTestBattle() {
    var deck=VocaluCatalog.songs.slice(0,14).concat(VocaluCatalog.producers.slice(0,3),VocaluCatalog.singers.slice(0,3));
    state.battle=VocaluEngine.makeBattle(deck,makeCpuDeck(),function(){return .5;});
    state.battle.user.cost=10; state.battle.user.maxCost=10; state.battle.user.life=2;
    var highCost=VocaluCatalog.songs.find(function(card){return card.cost>=6&&card.abilities&&card.abilities.length;});
    state.battle.user.hand=[VocaluCatalog.songs[0],highCost,VocaluCatalog.singers.find(function(card){return card.trigger;}),VocaluCatalog.producers.find(function(card){return card.trigger;})];
    VocaluEngine.playCard(state.battle,'user',0,0);
    state.battle.user.field[0].attacked=false;
    state.selectedUnit=null; state.targeting=null; state.screen='battle'; render();
  }
  function renderOpening() {
    var cards=state.battle.user.hand.map(function(card,index){var chosen=state.mulliganSelected.indexOf(index)>=0;return '<button class="' + (chosen?'mulligan-selected':'') + '" data-action="mulligan-toggle" data-index="' + index + '">' + cardFace(card,false) + '<span class="mulligan-mark">' + (chosen?'戻す':'選択') + '</span></button>';}).join('');
    var used=state.battle.mulliganUsed;
    app.innerHTML=shell('<section class="opening-hand"><span>OPENING HAND</span><h1>初期手札</h1><div class="opening-cards">' + cards + '</div><p>' + (used?'引き直し済みです。この手札で対戦を開始します。':'戻したいカードを好きな枚数選択できます。マリガンは1ゲームに1回だけです。') + '</p><div class="opening-actions">' + (!used?'<button class="secondary" data-action="mulligan" ' + (!state.mulliganSelected.length?'disabled':'') + '>' + state.mulliganSelected.length + '枚を引き直す</button>':'') + '<button class="primary" data-action="keep-hand">この手札で始める</button></div></section>');
  }
  function slotHtml(song,index,side) {
    if(!song)return '<div class="battle-slot empty"><span>EMPTY</span></div>';
    var selected=state.selectedUnit&&state.selectedUnit.side===side&&state.selectedUnit.index===index;
    var target=side==='cpu'&&state.targeting!=null&&song.attacked;
    return '<div class="battle-slot ' + (selected?'selected ':'') + (target?'targetable ':'') + (song.attacked?'used':'') + '"><button class="slot-card" data-action="select-unit" data-side="' + side + '" data-index="' + index + '">' + cardFace(song,true) + '</button><button class="inspect" data-action="battle-detail" data-side="' + side + '" data-index="' + index + '" aria-label="詳細">⌕</button></div>';
  }
  function lifeCards(player,side) { var cards='';for(var i=0;i<player.life;i+=1)cards+='<span class="life-card">V</span>';return '<button class="life-target ' + (side==='cpu'&&state.targeting!=null?'targetable':'') + '" ' + (side==='cpu'&&state.targeting!=null?'data-action="attack-life"':'disabled') + '><b>LIFE ' + player.life + '</b><span class="life-cards">' + cards + '</span></button>'; }
  function pileHtml(player,side){
    var recent=player.discard.slice(-3).reverse(),dropCards=recent.map(function(card,index){return '<i class="discard-preview-card" style="--drop-index:' + index + '">' + artHtml(card) + '</i>';}).join('');
    return '<div class="pile-zone ' + side + '"><button class="pile-card drop" data-action="show-discard" data-side="' + side + '" aria-label="' + (side==='user'?'あなた':'CPU') + 'のドロップを見る"><span>DROP</span><span class="discard-stack">' + (dropCards||'<i class="discard-empty">EMPTY</i>') + '</span></button><div class="pile-card deck"><span>DECK</span><span class="deck-back"><b>ボカる！</b><small>VOCALU</small></span><em>' + player.deck.length + '</em></div></div>';
  }
  function leekMeter(player){var leaves='';for(var i=0;i<player.maxCost;i+=1)leaves+='<i class="leek-icon ' + (i<player.cost?'ready':'spent') + '"></i>';return '<div class="leek-meter"><span>葱 COST</span><b>' + player.cost + '/' + player.maxCost + '</b><div>' + leaves + '</div></div>';}
  function compactHand(player,side){
    var cards='';
    if(side==='cpu')for(var i=0;i<player.hand.length;i+=1)cards+='<i class="hidden-hand-card">V</i>';
    return '<div class="compact-hand ' + side + '-hand"><span>HAND</span><b>' + player.hand.length + '</b>' + (cards?'<div>' + cards + '</div>':'') + '</div>';
  }
  function playerStrip(player,side){
    var name=side==='cpu'?'STUDIO CPU':'YOU',label=side==='cpu'?'OPPONENT':'PLAYER';
    return '<div class="player-strip ' + side + '"><div class="player-meta"><b>' + name + '</b><small>' + label + '</small></div>' + leekMeter(player) + compactHand(player,side) + '</div>';
  }
  function lifeRail(player,side){
    var name=side==='cpu'?'CPU':'YOU';
    return '<div class="life-rail ' + side + '"><div class="rail-player"><b>' + name + '</b><span><i class="mini-leek"></i>' + player.cost + '/' + player.maxCost + '</span></div>' + lifeCards(player,side) + '</div>';
  }
  function handHtml(card,i,total,userActive,cost) {
    var offset=i-(total-1)/2,angle=Math.max(-9,Math.min(9,offset*3)),lift=Math.min(14,Math.abs(offset)*4),unavailable=!userActive||(card.cost||0)>cost;
    return '<div class="hand-card ' + (unavailable?'unavailable':'') + '" style="--hand-angle:' + angle + 'deg;--hand-lift:' + lift + 'px;--hand-z:' + (20-Math.abs(offset)) + '"><button class="hand-play" data-action="play" data-index="' + i + '" aria-disabled="' + unavailable + '">' + cardFace(card,true) + '</button><button class="hand-inspect" data-action="hand-detail" data-index="' + i + '" aria-label="カード詳細">⌕</button></div>';
  }
  function selectedCard() { if(!state.selectedUnit||!state.battle)return null;return state.battle[state.selectedUnit.side].field[state.selectedUnit.index]||null; }
  function actionPanel() {
    var card=selectedCard(), tabs='<div class="panel-tabs"><button data-action="panel-tab" data-tab="action" class="' + (state.panelTab==='action'?'active':'') + '">ACTION</button><button data-action="panel-tab" data-tab="detail" class="' + (state.panelTab==='detail'?'active':'') + '">DETAIL</button><button data-action="panel-tab" data-tab="log" class="' + (state.panelTab==='log'?'active':'') + '">LOG</button></div>',body='';
    if(state.panelTab==='log'){var recent=state.battle.log.slice(0,4).map(function(entry){var meta=logStyle(entry);return '<p class="' + meta[0] + '"><i>' + meta[1] + '</i><span>' + esc(entry) + '</span></p>';}).join('');body='<div class="panel-live-log">' + recent + '</div><button class="secondary panel-log-open" data-action="battle-log">履歴をすべて見る</button>';}
    else if(state.panelTab==='detail')body=card?'<div class="panel-card">' + cardFace(card,false) + '<p>' + esc(card.metricNote||'現在パワーや装備効果を含む状態です。') + '</p></div>':'<p class="panel-empty">盤面のカードを選択してください。</p>';
    else body=card&&state.selectedUnit.side==='user'?'<div class="panel-card-name"><b>' + esc(card.name) + '</b><span>' + (card.attacked?'REST · 攻撃不可':'ACTIVE · 攻撃先をタップ') + ' · POWER ' + VocaluEngine.effectivePower(card) + '</span></div><button class="secondary" data-action="battle-detail" data-side="user" data-index="' + state.selectedUnit.index + '">詳細</button><button class="secondary" data-action="cancel-action">取消</button>':'<p class="panel-empty">ACTIVEの楽曲をタップし、点線の先にある攻撃対象を選択します。</p>';
    return '<aside class="action-panel">' + tabs + '<div class="panel-body">' + body + '</div></aside>';
  }
  function renderBattle() {
    var b=state.battle,u=b.user,c=b.cpu,userActive=b.active==='user';
    var impact=b.lastImpact;b.lastImpact=null;
    var cpuSlots=[0,1,2].map(function(i){return slotHtml(c.field[i],i,'cpu');}).join('');
    var userSlots=[0,1,2].map(function(i){return slotHtml(u.field[i],i,'user');}).join('');
    var hand=u.hand.map(function(card,i){return handHtml(card,i,u.hand.length,userActive,u.cost);}).join('');
    var targeting=state.targeting!=null?'<div class="target-guide">点線の先にある対象をタップ<span class="attack-arrow">↑</span><button data-action="cancel-action">取消</button></div><div class="attack-vector"><i></i></div>':'';
    var impactLabels={life:'LIFE BREAK',knockout:'KNOCKOUT',clash:'DOUBLE DROP',entry:'HIGH COST ENTRY',encore:'ENCORE ATTACK',tagteam:'TAG TEAM'};
    var impactHtml=impact?'<div class="impact-effect ' + impact.type + '"><b>' + esc(impact.label||impactLabels[impact.type]||'IMPACT') + '</b></div>':'';
    var board='<section class="battle-center"><header class="battle-status"><span>TURN ' + b.turn + '</span><b class="' + (userActive?'user-turn':'cpu-turn') + '">' + (userActive?'YOUR TURN':'CPU TURN') + '</b><span>' + difficultyName() + '</span></header>' + targeting
      + '<div class="battle-zone player-row enemy mirrored">' + pileHtml(c,'cpu') + '<div class="battle-core">' + compactHand(c,'cpu') + '<div class="battle-field enemy-field">' + cpuSlots + '</div></div>' + lifeRail(c,'cpu') + '</div>'
      + '<div class="stage-line"><span>VOCALU STAGE</span><button class="stage-end-turn" data-action="end-turn" ' + (userActive?'':'disabled') + '>ターン終了</button></div>'
      + '<div class="battle-zone player-row user">' + lifeRail(u,'user') + '<div class="battle-core"><div class="battle-field user-field">' + userSlots + '</div></div>' + pileHtml(u,'user') + '</div>'
      + (u.life<=2?'<div class="clutch-rule">LIFE 2 OR LESS · 召喚した楽曲はすぐ攻撃可能</div>':'') + '<div class="hand-zone"><div class="hand-label"><b>HAND</b><span>' + u.hand.length + ' CARDS</span></div><div class="hand">' + hand + '</div></div>' + impactHtml + '</section>';
    app.innerHTML=shell(board+actionPanel(),true);
  }
  function choose(title,buttons,canCancel) { var cancel=canCancel===false?'':'<button class="secondary" data-action="close-modal">キャンセル</button>';var modal=document.createElement('div');modal.className='modal';modal.innerHTML='<div class="dialog"><h2>' + esc(title) + '</h2><div class="actions">' + buttons + cancel + '</div></div>';document.body.appendChild(modal); }
  function playFromHand(index) { var card=state.battle.user.hand[index];if(!card)return;if(state.battle.active!=='user')return toast('CPUのターンです');if((card.cost||0)>state.battle.user.cost)return toast('使える葱COSTが足りません');if(card.type==='song'&&state.battle.user.field.length>=3)choose('入れ替える楽曲',state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="replace-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>';}).join(''));else if(card.type==='singer'&&state.battle.user.field.length)choose('装備する楽曲',state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="equip-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>';}).join(''));else{VocaluEngine.playCard(state.battle,'user',index,0);render();} }
  function resolveUserAttack(targetType,targetIndex) { var attacker=state.targeting,enemy=state.battle.cpu,guard=null;state.targeting=null;if(targetType==='song'&&enemy.field[targetIndex]&&enemy.field[targetIndex].attacked)guard=enemy.field.findIndex(function(song,index){return index!==targetIndex&&!song.attacked;});else if(targetType==='life'&&enemy.life<=2){guard=enemy.field.findIndex(function(song){return !song.attacked;});if(guard<0)guard=enemy.field.findIndex(function(){return true;});}if(guard<0)guard=null;VocaluEngine.attack(state.battle,'user',attacker,targetType,targetIndex,guard);if(guard!=null)toast(targetType==='life'?'CPUの楽曲がライフをガード':'CPUのACTIVE楽曲がガード');state.selectedUnit=null;afterAction(); }
  function showTriggerNotice(resume) { var trigger=state.battle&&state.battle.lastTrigger;if(!trigger)return false;state.battle.lastTrigger=null;state.triggerResume=resume||null;render();choose('TRIGGER 発動','<div class="trigger-reveal"><span>' + esc((trigger.side==='user'?'あなた':'CPU')+'のライフ') + '</span><b>' + esc(trigger.cardName) + '</b><strong>' + esc(trigger.label) + '</strong><p>' + esc(trigger.text) + '</p></div><button class="primary" data-action="dismiss-trigger">効果を確認</button>',false);return true; }
  function afterAction(){state.panelTab='log';if(state.battle.winner)finishBattle();else if(!showTriggerNotice(null))render();}
  function finishBattle(){
    saveCollection(state.opened);
    if(state.matchMode==='ranked'&&!state.battle.rankSettled){
      var won=state.battle.winner==='user';
      state.battle.rankDelta=won?25:-20;
      state.rank.rating=Math.max(0,state.rank.rating+state.battle.rankDelta);
      if(won)state.rank.wins+=1;else state.rank.losses+=1;
      state.battle.rankSettled=true;saveRank();
    }
    state.screen='result';render();
  }
  function renderResult(){var win=state.battle.winner==='user';var ranked=state.matchMode==='ranked';var rankResult=ranked?'<div class="rank-result"><span>' + (state.battle.rankDelta>0?'+':'') + state.battle.rankDelta + ' RATE</span><b>' + rankName(state.rank.rating) + ' · ' + state.rank.rating + '</b></div>':'';app.innerHTML=shell('<section class="hero result"><span class="eyebrow">BATTLE RESULT</span><h1>' + (win?'LIVE CLEAR!':'NEXT STAGE') + '</h1><p>' + (win?'勝利しました。':'今回はCPUの勝利です。') + ' 開封した25枚をコレクションに保存しました。</p></section>' + rankResult + '<div class="actions"><button class="primary" data-action="rematch">もう一度遊ぶ</button><button class="secondary" data-action="home">ロビーへ戻る</button><button class="secondary" data-action="collection">コレクションを見る</button></div>');}
  function renderCollection(){var cards=VocaluCatalog.cards.filter(function(c){return state.collection[c.id];});app.innerHTML=shell('<div class="section-head"><h2>コレクション</h2><span>' + cards.length + ' / 300種</span></div>' + (cards.length?'<div class="cards">' + cards.map(function(c){return cardHtml(c,-1,false);}).join('') + '</div>':'<p class="notice">対戦を最後まで終えると、開封カードがここに保存されます。</p>') + '<div class="deck-footer"><button class="primary" data-action="home">ホームへ</button></div>');}
  function mediaEmbed(card){if(card.type!=='song'||!card.videoUrl)return '';var url=card.videoUrl,embed='';var youtube=url.match(/[?&]v=([\w-]{6,})/)||url.match(/youtu\.be\/([\w-]{6,})/);var nico=url.match(/nicovideo\.jp\/watch\/(sm\d+)/);if(youtube)embed='https://www.youtube-nocookie.com/embed/'+youtube[1]+'?playsinline=1';else if(nico)embed='https://embed.nicovideo.jp/watch/'+nico[1];if(!embed)return '';return '<div class="song-player"><span>公式楽曲を再生</span><iframe src="' + esc(embed) + '" title="' + esc(card.name) + ' 公式動画" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';}
  function detailContent(card){var text=card.type==='song'?card.metricNote:(card.text||card.profile);var trigger=card.trigger?'<div class="trigger-detail"><b>TRIGGER · ' + esc(card.trigger.label) + '</b><p>' + esc(card.trigger.text) + '</p></div>':'';var abilities=(card.abilities||[]).map(function(ability){return '<div class="ability-detail"><b>' + esc(ability.label) + '</b><p>' + esc(ability.text) + '</p></div>';}).join('');var equip=card.singer?'<div class="equipment-detail"><h3>装備中の歌い手</h3>' + cardFace(card.singer,false) + '<p>POWER +' + card.singer.boost + '</p></div>':'';var source=card.videoUrl||card.profileUrl;return '<div class="detail-card">' + cardFace(card,false) + '</div><p>' + esc(text) + '</p>' + abilities + trigger + equip + mediaEmbed(card) + (source?'<a class="official-link" href="' + esc(source) + '" target="_blank" rel="noopener">掲載元を見る</a>':'');}
  function cardDetail(id){var card=VocaluCatalog.cards.find(function(c){return c.id===id;});if(card)choose(card.name,detailContent(card)+'<p>所持 ' + (state.collection[id]||0) + '枚</p>');}
  function battleDetail(side,index){var card=state.battle[side].field[index];if(card)choose(card.name,detailContent(card));}
  function showDiscard(side){var cards=state.battle[side].discard.slice().reverse();var title=(side==='user'?'あなた':'CPU')+'のDROP';var content=cards.length?'<div class="discard-history">' + cards.map(function(card){return '<button data-action="discard-detail" data-card="' + esc(card.id) + '">' + cardFace(card,false) + '</button>';}).join('') + '</div>':'<p class="notice">まだ使われたカードはありません。</p>';choose(title,content);}
  function toast(message){var old=document.querySelector('.error-toast');if(old)old.remove();var el=document.createElement('div');el.className='error-toast';el.textContent=message;document.body.appendChild(el);setTimeout(function(){el.remove();},3500);}
  function initMusic(){if(yt&&state.music.ready){state.music.playing?yt.pauseVideo():yt.playVideo();return;}state.music.title='YouTubeを接続中';render();window.onYouTubeIframeAPIReady=function(){try{yt=new YT.Player('yt-player',{height:'1',width:'1',playerVars:{listType:'playlist',list:'PL4hnIvXd3nC4mvwumy4IFfY4d8vVmcVGA',playsinline:1,controls:0},events:{onReady:function(e){state.music.ready=true;e.target.setVolume(state.music.volume);e.target.playVideo();},onStateChange:function(e){state.music.playing=e.data===1;try{state.music.title=e.target.getVideoData().title||'VOCALU BGM';}catch(ignore){}render();},onError:function(){toast('BGMを読み込めませんでした。');}}});}catch(err){toast('BGMの初期化に失敗しました。');}};if(!document.getElementById('youtube-api')){var s=document.createElement('script');s.id='youtube-api';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}}
  function musicControls(){if(!state.music.ready)initMusic();choose('BGM','<p>' + esc(state.music.title) + '</p><button class="secondary" data-action="music-prev">前の曲</button><button class="secondary" data-action="music-toggle">再生 / 停止</button><button class="secondary" data-action="music-next">次の曲</button><button class="secondary" data-action="music-down">音量 -</button><button class="secondary" data-action="music-up">音量 +</button><p>音量 ' + state.music.volume + '</p>');}
  function battleSettings(){choose('対戦設定','<div class="settings-group"><span>BGM</span><b>' + esc(state.music.title) + '</b><button class="secondary" data-action="music-toggle">' + (state.music.playing?'一時停止':'BGMを再生') + '</button></div><label class="settings-volume"><span>BGM音量</span><b data-volume-label>' + state.music.volume + '</b><input type="range" min="0" max="100" step="5" value="' + state.music.volume + '" data-volume></label><button class="secondary" data-action="battle-toggle-light">軽量モード ' + (state.light?'ON':'OFF') + '</button><button class="danger-button" data-action="retire-confirm">対戦をリタイア</button>');}
  function battleGuide(){choose('遊び方・キーワード','<div class="rule-guide"><section><h3>勝利条件</h3><p>相手のLIFEを0にすると勝利。毎ターン使える葱COSTが1増え、最大10になります。後攻は最初のターンだけ2枚引き、手札4枚・葱COST 2で行動を始めます。</p></section><section><h3>ACTIVE / REST</h3><p>ACTIVEは攻撃とガードが可能で、直接攻撃されません。攻撃後はRESTになり、攻撃対象になります。REST中はPOWER -1000。同じPOWERなら双方がDROPへ行く相打ちです。</p></section><section><h3>GUARD</h3><p>ACTIVE楽曲は、味方のREST楽曲をガードできます。LIFEへの攻撃はACTIVE・RESTどちらでもガードできます。</p></section><section><h3>SUPPORT / TAG TEAM</h3><p>ボカロPは先攻1ターン目から使える、1ターン1枚の使い切りサポート。低コストは探索、高コストは盤面を大きく動かします。歌い手は楽曲へ装備し、TAG TEAMとしてPOWERを強化します。</p></section><section><h3>TRIGGER</h3><p>LIFEから手札へ加わったサポートがTRIGGERを持つ場合、逆転効果がその場で発動します。</p></section></div>');}
  function logStyle(entry){if(/のターン/.test(entry))return ['turn','↻','TURN'];if(/TRIGGER/.test(entry))return ['trigger','✦','TRIGGER'];if(/攻撃|ガード/.test(entry))return ['attack','⚔','BATTLE'];if(/召喚|装備|サポート/.test(entry))return ['play','＋','PLAY'];if(/ドロー|POWER/.test(entry))return ['effect','◆','EFFECT'];return ['system','•','SYSTEM'];}
  function battleLog(){var b=state.battle;var summary='<div class="log-summary"><div><span>TURN</span><b>'+b.turn+'</b></div><div><span>YOU</span><b>LIFE '+b.user.life+'</b></div><div><span>CPU</span><b>LIFE '+b.cpu.life+'</b></div></div>';var entries=b.log.slice(0,40).map(function(entry,index){var meta=logStyle(entry);return '<div class="log-entry '+meta[0]+'"><i>'+meta[1]+'</i><div><span>'+meta[2]+(index===0?' · LATEST':'')+'</span><p>'+esc(entry)+'</p></div></div>';}).join('');choose('BATTLE HISTORY',summary+'<div class="battle-log modal-log">'+entries+'</div>');}
  function runCpuTurn(){VocaluEngine.endTurn(state.battle,'user');VocaluEngine.cpuMainPhase(state.battle,state.difficulty);state.selectedUnit=null;state.panelTab='log';render();setTimeout(runNextCpuAttack,state.light?20:280);}
  function cpuTarget(attacker,field){var candidates=field.map(function(card,index){return {card:card,index:index,power:VocaluEngine.effectivePower(card)};}).filter(function(x){return x.card.attacked&&attacker.currentPower>=x.power;});if(!candidates.length)return -1;if(state.difficulty==='normal')return candidates[0].index;candidates.sort(function(a,b){return state.difficulty==='expert'?b.power-a.power:a.power-b.power;});return candidates[0].index;}
  function runNextCpuAttack(){var b=state.battle;if(b.winner)return finishBattle();var ai=b.cpu.field.findIndex(function(song){return !song.attacked;});if(ai<0){VocaluEngine.endTurn(b,'cpu');return render();}var attacker=b.cpu.field[ai];var target=cpuTarget(attacker,b.user.field);if(target>=0&&b.user.life>1){var guards=b.user.field.map(function(song,i){return {song:song,index:i};}).filter(function(x){return x.index!==target&&!x.song.attacked;});if(b.user.field[target].attacked&&guards.length){var guardOptions='<button class="primary" data-action="resolve-cpu-attack" data-attacker="' + ai + '" data-target="song" data-target-index="' + target + '" data-guard="none">その楽曲で受ける</button>'+guards.map(function(x){return '<button class="secondary" data-action="resolve-cpu-attack" data-attacker="' + ai + '" data-target="song" data-target-index="' + target + '" data-guard="' + x.index + '">' + esc(x.song.name) + 'でACTIVEガード · POW ' + VocaluEngine.effectivePower(x.song) + '</button>';}).join('');return choose(attacker.name+'がREST楽曲へ攻撃',guardOptions,false);}VocaluEngine.attack(b,'cpu',ai,'song',target,null);render();return setTimeout(runNextCpuAttack,state.light?20:280);}var lifeGuards=b.user.field.map(function(song,i){return {song:song,index:i};});var options='<button class="primary" data-action="resolve-cpu-attack" data-attacker="' + ai + '" data-target="life" data-guard="none">ライフで受ける</button>'+lifeGuards.map(function(x){return '<button class="secondary" data-action="resolve-cpu-attack" data-attacker="' + ai + '" data-target="life" data-guard="' + x.index + '">' + esc(x.song.name) + 'でガード · ' + (x.song.attacked?'REST -1000 · ':'ACTIVE · ') + 'POW ' + VocaluEngine.effectivePower(x.song) + '</button>';}).join('');choose(attacker.name+'の攻撃 · POW '+attacker.currentPower,options,false);}

  document.addEventListener('click',function(event){var button=event.target.closest('[data-action]');if(!button)return;var action=button.dataset.action;try{
    if(action==='start'||action==='free-match')beginMatch('free');
    else if(action==='ranked-match')beginMatch('ranked');
    else if(action==='open-pack'){button.classList.add('opening');setTimeout(function(){revealPack(VocaluEngine.openPack(VocaluCatalog.cards));},state.light?20:500);}
    else if(action==='bulk-open'){while(state.packNo<5){state.opened=state.opened.concat(VocaluEngine.openPack(VocaluCatalog.cards));state.packNo+=1;}state.screen='deck';state.selected=VocaluEngine.autoBuild(state.opened);render();}
    else if(action==='next-pack'){state.screen=state.packNo<5?'pack':'deck';if(state.screen==='deck')state.selected=VocaluEngine.autoBuild(state.opened);render();}
    else if(action==='select'){var idx=Number(button.dataset.index),pos=state.selected.indexOf(idx);if(pos>=0)state.selected.splice(pos,1);else if(state.selected.length<20)state.selected.push(idx);else toast('デッキは20枚です');render();}
    else if(action==='auto-deck'){state.selected=VocaluEngine.autoBuild(state.opened);render();}
    else if(action==='battle-setup'){state.screen='setup';render();}
    else if(action==='difficulty'){state.difficulty=button.dataset.level;render();}
    else if(action==='test-battle'&&testMode)startTestBattle();
    else if(action==='back-deck'){state.screen='deck';render();}
    else if(action==='battle-start')startBattle();
    else if(action==='mulligan-toggle'){var mi=Number(button.dataset.index),mp=state.mulliganSelected.indexOf(mi);if(mp>=0)state.mulliganSelected.splice(mp,1);else state.mulliganSelected.push(mi);render();}
    else if(action==='mulligan'){VocaluEngine.mulligan(state.battle,state.mulliganSelected);state.mulliganSelected=[];render();}
    else if(action==='keep-hand'){state.screen='battle';render();}
    else if(action==='play')playFromHand(Number(button.dataset.index));
    else if(action==='hand-detail'){var handCard=state.battle.user.hand[Number(button.dataset.index)];if(handCard)choose(handCard.name,detailContent(handCard));}
    else if(action==='replace-play'||action==='equip-play'){button.closest('.modal').remove();VocaluEngine.playCard(state.battle,'user',Number(button.dataset.hand),Number(button.dataset.index));render();}
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
    else if(action==='retire'){document.querySelectorAll('.modal').forEach(function(modal){modal.remove();});state.battle=null;state.selectedUnit=null;state.targeting=null;state.screen='home';render();}
    else if(action==='end-turn')runCpuTurn();
    else if(action==='resolve-cpu-attack'){button.closest('.modal').remove();var targetType=button.dataset.target||'life',targetIndex=targetType==='song'?Number(button.dataset.targetIndex):null,guardIndex=button.dataset.guard==='none'?null:Number(button.dataset.guard);VocaluEngine.attack(state.battle,'cpu',Number(button.dataset.attacker),targetType,targetIndex,guardIndex);if(!showTriggerNotice(runNextCpuAttack)){render();setTimeout(runNextCpuAttack,state.light?20:280);}}
    else if(action==='dismiss-trigger'){button.closest('.modal').remove();var resume=state.triggerResume;state.triggerResume=null;if(resume)setTimeout(resume,state.light?20:280);else render();}
    else if(action==='close-modal')button.closest('.modal').remove();
    else if(action==='collection'){state.screen='collection';render();}
    else if(action==='home'){state.screen='home';render();}
    else if(action==='restart'||action==='rematch')beginMatch(state.matchMode);
    else if(action==='toggle-light'){state.light=!state.light;render();}
    else if(action==='music')musicControls();
    else if(action==='music-prev'){if(yt&&state.music.ready)yt.previousVideo();}
    else if(action==='music-next'){if(yt&&state.music.ready)yt.nextVideo();}
    else if(action==='music-toggle'){if(yt&&state.music.ready)(state.music.playing?yt.pauseVideo():yt.playVideo());}
    else if(action==='music-down'||action==='music-up'){state.music.volume=Math.max(0,Math.min(100,state.music.volume+(action==='music-up'?10:-10)));if(yt&&state.music.ready)yt.setVolume(state.music.volume);button.closest('.modal').remove();musicControls();}
    else if(action==='detail')cardDetail(button.dataset.card);
    else if(action==='force-rare'){var forced=VocaluCatalog.cards.find(function(c){return c.rarity===button.dataset.rare;});flash(button.dataset.rare);choose(button.dataset.rare+'演出確認',cardHtml(forced,-1,false));}
    else if(action==='reset-save'){localStorage.removeItem(STORAGE);localStorage.removeItem(MIGRATION);localStorage.removeItem(RANK_STORAGE);state.collection={};state.rank={rating:1000,wins:0,losses:0};render();}
  }catch(err){toast(err.message||'操作を続けられませんでした');console.error(err);}});
  document.addEventListener('input',function(event){if(!event.target.matches('[data-volume]'))return;state.music.volume=Number(event.target.value);var label=event.target.closest('.dialog').querySelector('[data-volume-label]');if(label)label.textContent=state.music.volume;if(yt&&state.music.ready)yt.setVolume(state.music.volume);});
  var startY=0;app.addEventListener('touchstart',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.touches[0])startY=e.touches[0].clientY;},{passive:true});app.addEventListener('touchend',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.changedTouches[0]&&startY-e.changedTouches[0].clientY>35)p.click();},{passive:true});
  document.addEventListener('error',function(e){if(e.target&&e.target.matches&&e.target.matches('.card-art img')){var art=e.target.parentNode;art.innerHTML='<div class="song-cover"><b>♪</b><span>画像を表示できません</span></div>';e.target.remove();}},true);
  function fatalError(message){boot.hidden=true;app.hidden=true;fatal.hidden=false;document.getElementById('fatal-message').textContent=message;}
  window.addEventListener('error',function(e){if(!app.hidden)toast('エラーから復旧しました: '+e.message);else fatalError('起動エラー: '+e.message);});window.addEventListener('unhandledrejection',function(e){toast('処理エラーから復旧しました');console.error(e.reason);});document.getElementById('reload-button').addEventListener('click',function(){location.reload();});
  try{if(!window.VocaluCatalog||!window.VocaluEngine)throw new Error('必要なゲームデータを読み込めませんでした');if(VocaluCatalog.counts.total!==300)throw new Error('カードデータが300種類ではありません');boot.hidden=true;app.hidden=false;render();}catch(err){fatalError(err.message);}
}());
