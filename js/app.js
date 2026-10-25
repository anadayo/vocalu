(function () {
  'use strict';
  var app = document.getElementById('app');
  var boot = document.getElementById('boot');
  var fatal = document.getElementById('fatal');
  var testMode = new URLSearchParams(location.search).get('test') === '1';
  var STORAGE = 'vocalu-save-v1';
  var MIGRATION = 'vocalu-migration-v3';
  var state = {
    screen: 'home', opened: [], packNo: 0, selected: [], battle: null,
    selectedUnit: null, targeting: null, panelTab: 'action', triggerResume: null,
    difficulty: 'normal',
    collection: loadAndMigrate(), light: matchMedia('(prefers-reduced-motion: reduce)').matches,
    music: { ready: false, playing: false, volume: 40, title: 'BGM未再生' }
  };
  var yt = null;

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
  function cardValue(card) { return card.type === 'song' ? (card.currentPower != null ? VocaluEngine.effectivePower(card) : card.power) : (card.bonus || card.boost || 0); }
  function cardFace(card, compact) {
    var equipment = card.singer ? '<span class="equipment-badge"><span class="equipment-thumb">' + artHtml(card.singer) + '</span><span>装備 ' + esc(card.singer.name) + '<small>POWER +' + card.singer.boost + '</small></span></span>' : '';
    return '<span class="card-face ' + (compact ? 'compact' : '') + '"><span class="card-head"><span class="card-cost">' + card.cost + '</span><strong>' + esc(card.name) + '</strong><span class="card-rarity ' + card.rarity + '">' + card.rarity + '</span></span><span class="card-art">' + artHtml(card) + '</span><span class="card-foot"><small>' + typeName(card.type) + (card.trigger ? ' · TRIGGER' : '') + (card.attacked ? ' · REST' : '') + '</small><b>' + (card.type === 'song' ? 'POWER ' : 'BOOST +') + cardValue(card) + '</b></span>' + equipment + '</span>';
  }
  function shell(content, battle) {
    if (battle) return '<main class="game-shell"><nav class="game-nav" aria-label="ゲームメニュー"><button data-action="home" title="ホーム">⌂<span>ホーム</span></button><button class="active" title="対戦">VS<span>対戦</span></button><button data-action="collection" title="コレクション">▦<span>図鑑</span></button><button data-action="music" title="BGM">♪<span>BGM</span></button></nav>' + content + '</main>';
    return '<main class="shell"><header class="topbar"><div class="brand">ボカる！ <em>VOCALU</em></div><button class="icon-btn" data-action="music" aria-label="BGM">' + (state.music.playing ? 'Ⅱ' : '♪') + '</button></header>' + content + '</main>';
  }
  function cardHtml(card, index, selectable) {
    var chosen = state.selected.indexOf(index) >= 0;
    return '<article class="card ' + (chosen ? 'selected ' : '') + 'reveal"><button type="button" ' + (selectable ? 'data-action="select" data-index="' + index + '"' : 'data-action="detail" data-card="' + esc(card.id) + '"') + '>' + cardFace(card, false) + '</button></article>';
  }
  function render() {
    document.body.classList.toggle('light-mode', state.light);
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'pack') renderPack();
    else if (state.screen === 'deck') renderDeck();
    else if (state.screen === 'setup') renderSetup();
    else if (state.screen === 'opening') renderOpening();
    else if (state.screen === 'battle') renderBattle();
    else if (state.screen === 'result') renderResult();
    else if (state.screen === 'collection') renderCollection();
  }
  function renderHome() {
    var owned = Object.keys(state.collection).filter(function (id) { return state.collection[id] > 0; }).length;
    app.innerHTML = shell('<section class="hero"><span class="eyebrow">DIGITAL TCG</span><h1>開けて、組んで、歌わせる。</h1><p>5パックから生まれる20枚デッキで、すぐにCPUバトル。</p></section><div class="status-grid"><div class="stat"><b>300</b><small>カード</small></div><div class="stat"><b>' + owned + '</b><small>図鑑</small></div><div class="stat"><b>5</b><small>ライフ</small></div></div><div class="actions"><button class="primary" data-action="start">5パック開封を始める</button><button class="secondary" data-action="collection">コレクション</button><button class="secondary" data-action="toggle-light">軽量モード ' + (state.light ? 'ON' : 'OFF') + '</button></div><p class="notice">掲載元を確認できた画像だけを表示します。未確認作品にはVOCALU独自カバーを使用しています。</p>' + testPanel());
  }
  function testPanel() {
    if (!testMode) return '';
    return '<div class="test-panel"><b>開発者テストモード</b><div class="actions"><button class="secondary" data-action="test-battle">盤面・装備テスト</button><button class="secondary" data-action="force-rare" data-rare="SR">SR演出</button><button class="secondary" data-action="force-rare" data-rare="UR">UR演出</button><button class="secondary" data-action="reset-save">保存データ初期化</button></div></div>';
  }
  function renderPack() {
    if (state.packNo >= 5) { state.screen='deck'; state.selected=VocaluEngine.autoBuild(state.opened); return render(); }
    app.innerHTML = shell('<div class="section-head"><h2>PACK ' + (state.packNo + 1) + ' / 5</h2><span>' + state.opened.length + ' / 25枚</span></div><div class="pack-stage"><div><button class="pack" data-action="open-pack"><strong>VOCALU</strong><small>上へスワイプ または タップ</small></button><p class="swipe-hint">パックを開ける</p></div></div><button class="secondary" data-action="bulk-open">残りを一括開封</button>');
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
    var difficulty='<section class="difficulty-select"><span>CPU DIFFICULTY</span><div>' + levels.map(function(level){return '<button class="' + (state.difficulty===level[0]?'active':'') + '" data-action="difficulty" data-level="' + level[0] + '"><b>' + level[1] + '</b><small>' + level[2] + '</small></button>';}).join('') + '</div></section>';
    app.innerHTML=shell('<section class="battle-setup"><div class="setup-deck"><span>YOUR DECK</span>' + cardFace(lead,false) + '<b>VOCALU DECK</b><small>' + deck.length + ' CARDS</small><button class="secondary" data-action="back-deck">デッキ変更</button></div><strong class="versus">VS</strong><div class="setup-deck opponent"><span>CPU DECK</span>' + cardFace(cpu[0],false) + '<b>STUDIO CPU</b><small>' + difficultyName() + '</small></div></section>' + difficulty + '<button class="primary setup-start" data-action="battle-start">BATTLE START</button>');
  }
  function difficultyName(){return state.difficulty==='expert'?'EXPERT':state.difficulty==='hard'?'HARD':'NORMAL';}
  function startBattle() { var deck=state.selected.map(function(i){return state.opened[i];});state.battle=VocaluEngine.makeBattle(deck,makeCpuDeck());state.selectedUnit=null;state.targeting=null;state.screen='opening';render(); }
  function startTestBattle() {
    var deck=VocaluCatalog.songs.slice(0,14).concat(VocaluCatalog.producers.slice(0,3),VocaluCatalog.singers.slice(0,3));
    state.battle=VocaluEngine.makeBattle(deck,makeCpuDeck(),function(){return .5;});
    state.battle.user.cost=10; state.battle.user.maxCost=10; state.battle.user.life=1;
    state.battle.user.hand=[VocaluCatalog.songs[0],VocaluCatalog.singers[0],VocaluCatalog.producers[0]];
    VocaluEngine.playCard(state.battle,'user',0,0);
    state.battle.user.field[0].attacked=false;
    state.selectedUnit=null; state.targeting=null; state.screen='battle'; render();
  }
  function renderOpening() {
    var cards=state.battle.user.hand.map(function(card){return '<button data-action="detail" data-card="' + esc(card.id) + '">' + cardFace(card,false) + '</button>';}).join('');
    app.innerHTML=shell('<section class="opening-hand"><span>OPENING HAND</span><h1>初期手札</h1><div class="opening-cards">' + cards + '</div><p>カードをタップすると詳細を確認できます。現行ルールにマリガンはないため、この3枚で開始します。</p><button class="primary" data-action="keep-hand">この手札で始める</button></section>');
  }
  function slotHtml(song,index,side) {
    if(!song)return '<div class="battle-slot empty"><span>EMPTY</span></div>';
    var selected=state.selectedUnit&&state.selectedUnit.side===side&&state.selectedUnit.index===index;
    var target=side==='cpu'&&state.targeting!=null;
    var power=VocaluEngine.effectivePower(song);
    return '<div class="battle-slot ' + (selected?'selected ':'') + (target?'targetable ':'') + (song.attacked?'used':'') + '"><button class="slot-card" data-action="select-unit" data-side="' + side + '" data-index="' + index + '">' + cardFace(song,true) + '</button><span class="battle-power ' + (song.attacked?'rest':'active') + '"><small>' + (song.attacked?'REST -1000':'POWER') + '</small><b>' + power + '</b></span><button class="inspect" data-action="battle-detail" data-side="' + side + '" data-index="' + index + '" aria-label="詳細">⌕</button></div>';
  }
  function lifeCards(player,side) { var cards='';for(var i=0;i<player.life;i+=1)cards+='<span class="life-card">V</span>';return '<button class="life-target ' + (side==='cpu'&&state.targeting!=null?'targetable':'') + '" ' + (side==='cpu'&&state.targeting!=null?'data-action="attack-life"':'disabled') + '><span class="life-cards">' + cards + '</span><b>LIFE ' + player.life + '</b></button>'; }
  function handHtml(card,i,total,userActive,cost) {
    var offset=i-(total-1)/2,angle=Math.max(-9,Math.min(9,offset*3)),lift=Math.min(14,Math.abs(offset)*4),unavailable=!userActive||(card.cost||0)>cost;
    return '<button class="hand-card" data-action="play" data-index="' + i + '" style="--hand-angle:' + angle + 'deg;--hand-lift:' + lift + 'px;--hand-z:' + (20-Math.abs(offset)) + '" ' + (unavailable?'disabled':'') + '>' + cardFace(card,true) + '</button>';
  }
  function selectedCard() { if(!state.selectedUnit||!state.battle)return null;return state.battle[state.selectedUnit.side].field[state.selectedUnit.index]||null; }
  function actionPanel() {
    var card=selectedCard(), tabs='<div class="panel-tabs"><button data-action="panel-tab" data-tab="action" class="' + (state.panelTab==='action'?'active':'') + '">ACTION</button><button data-action="panel-tab" data-tab="detail" class="' + (state.panelTab==='detail'?'active':'') + '">DETAIL</button><button data-action="panel-tab" data-tab="log" class="' + (state.panelTab==='log'?'active':'') + '">LOG</button></div>',body='';
    if(state.panelTab==='log')body='<div class="battle-log">' + state.battle.log.slice(0,16).map(function(x){return '<p>' + esc(x) + '</p>';}).join('') + '</div>';
    else if(state.panelTab==='detail')body=card?'<div class="panel-card">' + cardFace(card,false) + '<p>' + esc(card.metricNote||'現在パワーや装備効果を含む状態です。') + '</p></div>':'<p class="panel-empty">盤面のカードを選択してください。</p>';
    else body=card&&state.selectedUnit.side==='user'?'<div class="panel-card-name"><b>' + esc(card.name) + '</b><span>' + (card.attacked?'REST':'ACTIVE') + ' · POWER ' + VocaluEngine.effectivePower(card) + '</span></div><button class="primary" data-action="begin-attack" ' + (card.attacked?'disabled':'') + '>攻撃</button><button class="secondary" data-action="battle-detail" data-side="user" data-index="' + state.selectedUnit.index + '">詳細</button><button class="secondary" data-action="cancel-action">取消</button>':'<p class="panel-empty">自分の楽曲を選ぶと操作を表示します。</p>';
    return '<aside class="action-panel">' + tabs + '<div class="panel-body">' + body + '</div><button class="end-turn" data-action="end-turn" ' + (state.battle.active!=='user'?'disabled':'') + '>ターン終了</button></aside>';
  }
  function renderBattle() {
    var b=state.battle,u=b.user,c=b.cpu,userActive=b.active==='user';
    var cpuSlots=[0,1,2].map(function(i){return slotHtml(c.field[i],i,'cpu');}).join('');
    var userSlots=[0,1,2].map(function(i){return slotHtml(u.field[i],i,'user');}).join('');
    var hand=u.hand.map(function(card,i){return handHtml(card,i,u.hand.length,userActive,u.cost);}).join('');
    var targeting=state.targeting!=null?'<div class="target-guide">攻撃対象を選択してください<button data-action="cancel-action">取消</button></div>':'';
    var board='<section class="battle-center"><header class="battle-status"><span>TURN ' + b.turn + '</span><b class="' + (userActive?'user-turn':'cpu-turn') + '">' + (userActive?'YOUR TURN':'CPU TURN') + '</b><span>' + difficultyName() + '</span></header>' + targeting + '<div class="player-row enemy"><div class="player-meta"><b>STUDIO CPU</b><small>DECK ' + c.deck.length + ' · DISCARD ' + c.discard.length + '</small></div>' + lifeCards(c,'cpu') + '</div><div class="battle-field enemy-field">' + cpuSlots + '</div><div class="stage-line"><span>VOCALU STAGE</span></div><div class="battle-field user-field">' + userSlots + '</div><div class="player-row"><div class="player-meta"><b>YOU</b><small>DECK ' + u.deck.length + ' · DISCARD ' + u.discard.length + '</small></div>' + lifeCards(u,'user') + '</div><div class="cost-meter"><span>AVAILABLE COST</span><b>' + u.cost + '</b><em>/ ' + u.maxCost + '</em></div>' + (u.life===1?'<div class="clutch-rule">FINAL LIFE · 召喚した楽曲はすぐ攻撃可能</div>':'') + '<div class="hand-zone"><div class="hand-label"><b>HAND</b><span>' + u.hand.length + ' CARDS</span></div><div class="hand">' + hand + '</div></div></section>';
    app.innerHTML=shell(board+actionPanel(),true);
  }
  function choose(title,buttons,canCancel) { var cancel=canCancel===false?'':'<button class="secondary" data-action="close-modal">キャンセル</button>';var modal=document.createElement('div');modal.className='modal';modal.innerHTML='<div class="dialog"><h2>' + esc(title) + '</h2><div class="actions">' + buttons + cancel + '</div></div>';document.body.appendChild(modal); }
  function playFromHand(index) { var card=state.battle.user.hand[index];if(!card)return;if(card.type==='song'&&state.battle.user.field.length>=3)choose('入れ替える楽曲',state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="replace-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>';}).join(''));else if(card.type==='singer'&&state.battle.user.field.length)choose('装備する楽曲',state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="equip-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>';}).join(''));else{VocaluEngine.playCard(state.battle,'user',index,0);render();} }
  function resolveUserAttack(targetType,targetIndex) { var attacker=state.targeting;state.targeting=null;VocaluEngine.attack(state.battle,'user',attacker,targetType,targetIndex,null);state.selectedUnit=null;afterAction(); }
  function showTriggerNotice(resume) { var trigger=state.battle&&state.battle.lastTrigger;if(!trigger)return false;state.battle.lastTrigger=null;state.triggerResume=resume||null;render();choose('TRIGGER 発動','<div class="trigger-reveal"><span>' + esc((trigger.side==='user'?'あなた':'CPU')+'のライフ') + '</span><b>' + esc(trigger.cardName) + '</b><strong>' + esc(trigger.label) + '</strong><p>' + esc(trigger.text) + '</p></div><button class="primary" data-action="dismiss-trigger">効果を確認</button>',false);return true; }
  function afterAction(){if(state.battle.winner)finishBattle();else if(!showTriggerNotice(null))render();}
  function finishBattle(){saveCollection(state.opened);state.screen='result';render();}
  function renderResult(){var win=state.battle.winner==='user';app.innerHTML=shell('<section class="hero result"><span class="eyebrow">BATTLE RESULT</span><h1>' + (win?'LIVE CLEAR!':'NEXT STAGE') + '</h1><p>' + (win?'勝利しました。':'今回はCPUの勝利です。') + ' 開封した25枚をコレクションに保存しました。</p></section><div class="actions"><button class="primary" data-action="restart">もう一度遊ぶ</button><button class="secondary" data-action="collection">コレクションを見る</button></div>');}
  function renderCollection(){var cards=VocaluCatalog.cards.filter(function(c){return state.collection[c.id];});app.innerHTML=shell('<div class="section-head"><h2>コレクション</h2><span>' + cards.length + ' / 300種</span></div>' + (cards.length?'<div class="cards">' + cards.map(function(c){return cardHtml(c,-1,false);}).join('') + '</div>':'<p class="notice">対戦を最後まで終えると、開封カードがここに保存されます。</p>') + '<div class="deck-footer"><button class="primary" data-action="home">ホームへ</button></div>');}
  function detailContent(card){var text=card.type==='song'?card.metricNote:(card.text||card.profile);var trigger=card.trigger?'<div class="trigger-detail"><b>TRIGGER · ' + esc(card.trigger.label) + '</b><p>' + esc(card.trigger.text) + '</p></div>':'';var equip=card.singer?'<div class="equipment-detail"><h3>装備中の歌い手</h3>' + cardFace(card.singer,false) + '<p>POWER +' + card.singer.boost + '</p></div>':'';var source=card.videoUrl||card.profileUrl;return '<div class="detail-card">' + cardFace(card,false) + '</div><p>' + esc(text) + '</p>' + trigger + equip + (source?'<a class="official-link" href="' + esc(source) + '" target="_blank" rel="noopener">掲載元を見る</a>':'');}
  function cardDetail(id){var card=VocaluCatalog.cards.find(function(c){return c.id===id;});if(card)choose(card.name,detailContent(card)+'<p>所持 ' + (state.collection[id]||0) + '枚</p>');}
  function battleDetail(side,index){var card=state.battle[side].field[index];if(card)choose(card.name,detailContent(card));}
  function toast(message){var old=document.querySelector('.error-toast');if(old)old.remove();var el=document.createElement('div');el.className='error-toast';el.textContent=message;document.body.appendChild(el);setTimeout(function(){el.remove();},3500);}
  function initMusic(){if(yt&&state.music.ready){state.music.playing?yt.pauseVideo():yt.playVideo();return;}state.music.title='YouTubeを接続中';render();window.onYouTubeIframeAPIReady=function(){try{yt=new YT.Player('yt-player',{height:'1',width:'1',playerVars:{listType:'playlist',list:'PL4hnIvXd3nC4mvwumy4IFfY4d8vVmcVGA',playsinline:1,controls:0},events:{onReady:function(e){state.music.ready=true;e.target.setVolume(state.music.volume);e.target.playVideo();},onStateChange:function(e){state.music.playing=e.data===1;try{state.music.title=e.target.getVideoData().title||'VOCALU BGM';}catch(ignore){}render();},onError:function(){toast('BGMを読み込めませんでした。');}}});}catch(err){toast('BGMの初期化に失敗しました。');}};if(!document.getElementById('youtube-api')){var s=document.createElement('script');s.id='youtube-api';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}}
  function musicControls(){if(!state.music.ready)initMusic();choose('BGM','<p>' + esc(state.music.title) + '</p><button class="secondary" data-action="music-prev">前の曲</button><button class="secondary" data-action="music-toggle">再生 / 停止</button><button class="secondary" data-action="music-next">次の曲</button><button class="secondary" data-action="music-down">音量 -</button><button class="secondary" data-action="music-up">音量 +</button><p>音量 ' + state.music.volume + '</p>');}
  function runCpuTurn(){VocaluEngine.endTurn(state.battle,'user');VocaluEngine.cpuMainPhase(state.battle,state.difficulty);state.selectedUnit=null;render();setTimeout(runNextCpuAttack,state.light?20:280);}
  function cpuTarget(attacker,field){var candidates=field.map(function(card,index){return {card:card,index:index,power:VocaluEngine.effectivePower(card)};}).filter(function(x){return attacker.currentPower>=x.power;});if(!candidates.length)return -1;if(state.difficulty==='normal')return candidates[0].index;candidates.sort(function(a,b){return state.difficulty==='expert'?b.power-a.power:a.power-b.power;});return candidates[0].index;}
  function runNextCpuAttack(){var b=state.battle;if(b.winner)return finishBattle();var ai=b.cpu.field.findIndex(function(song){return !song.attacked;});if(ai<0){VocaluEngine.endTurn(b,'cpu');return render();}var attacker=b.cpu.field[ai];var target=cpuTarget(attacker,b.user.field);if(target>=0&&b.user.life>1){VocaluEngine.attack(b,'cpu',ai,'song',target);render();return setTimeout(runNextCpuAttack,state.light?20:280);}var options='<button class="primary" data-action="resolve-cpu-attack" data-attacker="' + ai + '" data-guard="life">ライフで受ける</button>'+b.user.field.map(function(song,i){return '<button class="secondary" data-action="resolve-cpu-attack" data-attacker="' + ai + '" data-guard="' + i + '">' + esc(song.name) + 'でガード · POW ' + VocaluEngine.effectivePower(song) + (song.attacked?' (REST)':'') + '</button>';}).join('');choose(attacker.name+'の攻撃 · POW '+attacker.currentPower,options,false);}

  document.addEventListener('click',function(event){var button=event.target.closest('[data-action]');if(!button)return;var action=button.dataset.action;try{
    if(action==='start'){state.opened=[];state.packNo=0;state.selected=[];state.screen='pack';render();}
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
    else if(action==='keep-hand'){state.screen='battle';render();}
    else if(action==='play')playFromHand(Number(button.dataset.index));
    else if(action==='replace-play'||action==='equip-play'){button.closest('.modal').remove();VocaluEngine.playCard(state.battle,'user',Number(button.dataset.hand),Number(button.dataset.index));render();}
    else if(action==='select-unit'){var side=button.dataset.side,index=Number(button.dataset.index);if(side==='cpu'&&state.targeting!=null)resolveUserAttack('song',index);else{state.selectedUnit={side:side,index:index};state.panelTab='action';render();}}
    else if(action==='begin-attack'){var card=selectedCard();if(!card||card.attacked)throw new Error('この楽曲は攻撃できません');state.targeting=state.selectedUnit.index;render();}
    else if(action==='attack-life')resolveUserAttack('life',null);
    else if(action==='cancel-action'){state.targeting=null;state.selectedUnit=null;render();}
    else if(action==='panel-tab'){state.panelTab=button.dataset.tab;render();}
    else if(action==='battle-detail')battleDetail(button.dataset.side,Number(button.dataset.index));
    else if(action==='end-turn')runCpuTurn();
    else if(action==='resolve-cpu-attack'){button.closest('.modal').remove();VocaluEngine.attack(state.battle,'cpu',Number(button.dataset.attacker),'life',null,button.dataset.guard==='life'?null:Number(button.dataset.guard));if(!showTriggerNotice(runNextCpuAttack)){render();setTimeout(runNextCpuAttack,state.light?20:280);}}
    else if(action==='dismiss-trigger'){button.closest('.modal').remove();var resume=state.triggerResume;state.triggerResume=null;if(resume)setTimeout(resume,state.light?20:280);else render();}
    else if(action==='close-modal')button.closest('.modal').remove();
    else if(action==='collection'){state.screen='collection';render();}
    else if(action==='home'){state.screen='home';render();}
    else if(action==='restart'){state.opened=[];state.packNo=0;state.selected=[];state.battle=null;state.screen='pack';render();}
    else if(action==='toggle-light'){state.light=!state.light;render();}
    else if(action==='music')musicControls();
    else if(action==='music-prev'){if(yt&&state.music.ready)yt.previousVideo();}
    else if(action==='music-next'){if(yt&&state.music.ready)yt.nextVideo();}
    else if(action==='music-toggle'){if(yt&&state.music.ready)(state.music.playing?yt.pauseVideo():yt.playVideo());}
    else if(action==='music-down'||action==='music-up'){state.music.volume=Math.max(0,Math.min(100,state.music.volume+(action==='music-up'?10:-10)));if(yt&&state.music.ready)yt.setVolume(state.music.volume);button.closest('.modal').remove();musicControls();}
    else if(action==='detail')cardDetail(button.dataset.card);
    else if(action==='force-rare'){var forced=VocaluCatalog.cards.find(function(c){return c.rarity===button.dataset.rare;});flash(button.dataset.rare);choose(button.dataset.rare+'演出確認',cardHtml(forced,-1,false));}
    else if(action==='reset-save'){localStorage.removeItem(STORAGE);localStorage.removeItem(MIGRATION);state.collection={};render();}
  }catch(err){toast(err.message||'操作を続けられませんでした');console.error(err);}});
  var startY=0;app.addEventListener('touchstart',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.touches[0])startY=e.touches[0].clientY;},{passive:true});app.addEventListener('touchend',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.changedTouches[0]&&startY-e.changedTouches[0].clientY>35)p.click();},{passive:true});
  document.addEventListener('error',function(e){if(e.target&&e.target.matches&&e.target.matches('.card-art img')){var art=e.target.parentNode;art.innerHTML='<div class="song-cover"><b>♪</b><span>画像を表示できません</span></div>';e.target.remove();}},true);
  function fatalError(message){boot.hidden=true;app.hidden=true;fatal.hidden=false;document.getElementById('fatal-message').textContent=message;}
  window.addEventListener('error',function(e){if(!app.hidden)toast('エラーから復旧しました: '+e.message);else fatalError('起動エラー: '+e.message);});window.addEventListener('unhandledrejection',function(e){toast('処理エラーから復旧しました');console.error(e.reason);});document.getElementById('reload-button').addEventListener('click',function(){location.reload();});
  try{if(!window.VocaluCatalog||!window.VocaluEngine)throw new Error('必要なゲームデータを読み込めませんでした');if(VocaluCatalog.counts.total!==300)throw new Error('カードデータが300種類ではありません');boot.hidden=true;app.hidden=false;render();}catch(err){fatalError(err.message);}
}());
