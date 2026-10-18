(function () {
  'use strict';
  var app = document.getElementById('app');
  var boot = document.getElementById('boot');
  var fatal = document.getElementById('fatal');
  var testMode = new URLSearchParams(location.search).get('test') === '1';
  var STORAGE = 'vocalu-save-v1';
  var state = { screen: 'home', opened: [], packNo: 0, selected: [], battle: null, triggerResume: null, collection: loadCollection(), light: matchMedia('(prefers-reduced-motion: reduce)').matches, music: { ready: false, playing: false, volume: 40, title: 'BGM未再生' } };
  var yt = null;

  function loadCollection() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch (ignore) { return {}; }
  }
  function saveCollection(cards) {
    cards.forEach(function (card) { state.collection[card.id] = (state.collection[card.id] || 0) + 1; });
    try { localStorage.setItem(STORAGE, JSON.stringify(state.collection)); } catch (err) { toast('保存容量が不足しています。ゲームは続けられます。'); }
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]; }); }
  function icon(type) { return type === 'song' ? '♪' : type === 'producer' ? 'P' : 'Vo'; }
  function hueFor(value) { var total=0; String(value).split('').forEach(function(c){total=(total+c.charCodeAt(0)*17)%360;}); return total; }
  function artHtml(card) {
    if (card.thumbnailVerified && card.thumbnailUrl) {
      var imageKind = card.type === 'song' ? '公式MV' : 'プロフィール画像';
      return '<img src="' + esc(card.thumbnailUrl) + '" alt="' + esc(card.name) + ' ' + imageKind + '" loading="lazy">';
    }
    var hue = hueFor(card.id || card.name);
    if (card.type === 'producer') return '<div class="avatar-icon producer-icon" style="--hue:' + hue + '"><b>P</b><span>' + esc(card.name) + '</span></div>';
    if (card.type === 'singer') return '<div class="avatar-icon singer-icon" style="--hue:' + hue + '"><b>Vo</b><span>' + esc(card.name) + '</span></div>';
    return '<div class="song-cover" style="--hue:' + hue + '"><b>♪</b><span>' + esc(card.name) + '</span><small>ORIGINAL CARD COVER</small></div>';
  }
  function shell(content) {
    return '<main class="shell"><header class="topbar"><div class="brand">ボカる！ <em>VOCALU</em></div><button class="icon-btn" data-action="music" aria-label="BGM">' + (state.music.playing ? 'Ⅱ' : '♪') + '</button></header>' + content + '</main>';
  }
  function cardHtml(card, index, selectable) {
    var chosen = state.selected.indexOf(index) >= 0;
    var power = card.type === 'song' ? card.power : card.type === 'producer' ? '+' + card.bonus : '+' + card.boost;
    return '<article class="card ' + (chosen ? 'selected ' : '') + 'reveal"><button type="button" ' + (selectable ? 'data-action="select" data-index="' + index + '"' : 'data-action="detail" data-card="' + esc(card.id) + '"') + '><div class="card-top"><span class="cost-badge" aria-label="コスト ' + card.cost + '">' + card.cost + '</span><strong class="card-title">' + esc(card.name) + '</strong></div><div class="card-art">' + artHtml(card) + '</div><div class="card-body"><div class="meta"><span>' + (card.trigger ? '<b class="trigger-mark">TRIGGER</b>' : esc(card.variant || card.type)) + '</span><span>' + icon(card.type) + '</span></div><div class="card-power"><span><small>' + (card.type === 'song' ? 'POWER' : 'BOOST') + '</small><b>' + power + '</b></span><span class="rarity ' + card.rarity + '">' + card.rarity + '</span></div></div></button></article>';
  }
  function render() {
    document.body.classList.toggle('light-mode', state.light);
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'pack') renderPack();
    else if (state.screen === 'deck') renderDeck();
    else if (state.screen === 'battle') renderBattle();
    else if (state.screen === 'result') renderResult();
    else if (state.screen === 'collection') renderCollection();
  }
  function renderHome() {
    var owned = Object.keys(state.collection).length;
    app.innerHTML = shell('<section class="hero"><h1>開けて、組んで、歌わせる。</h1><p>5パックから生まれる20枚デッキで、すぐにCPUバトル。</p></section><div class="status-grid"><div class="stat"><b>280</b><small>カード</small></div><div class="stat"><b>' + owned + '</b><small>図鑑</small></div><div class="stat"><b>3</b><small>ライフ</small></div></div><div class="actions"><button class="primary" data-action="start">5パック開封を始める</button><button class="secondary" data-action="collection">コレクション</button><button class="secondary" data-action="toggle-light">軽量モード ' + (state.light ? 'ON' : 'OFF') + '</button></div><p class="notice">公式MV画像と再生数が確認済みのカードだけ実データを表示します。現時点の対戦値は動作確認用で、未確認画像を別楽曲の画像で代用しません。</p>' + testPanel());
  }
  function testPanel() {
    if (!testMode) return '';
    return '<div class="test-panel"><b>開発者テストモード</b><div class="actions"><button class="secondary" data-action="force-rare" data-rare="SR">SR演出</button><button class="secondary" data-action="force-rare" data-rare="UR">UR演出</button><button class="secondary" data-action="force-rare" data-rare="SEC">SEC演出</button><button class="secondary" data-action="reset-save">保存データ初期化</button></div></div>';
  }
  function renderPack() {
    if (state.packNo >= 5) { state.screen = 'deck'; state.selected = VocaluEngine.autoBuild(state.opened); render(); return; }
    app.innerHTML = shell('<div class="section-head"><h2>PACK ' + (state.packNo + 1) + ' / 5</h2><span>' + state.opened.length + ' / 25枚</span></div><div class="pack-stage"><div><button class="pack" data-action="open-pack" aria-label="パックを開封"><strong>VOCALU</strong><small>上へスワイプ または タップ</small></button><p class="swipe-hint">パックを開ける</p></div></div><button class="secondary" data-action="bulk-open">残りを一括開封</button>');
  }
  function revealPack(cards) {
    state.opened = state.opened.concat(cards);
    state.packNo += 1;
    var highest = cards.reduce(function (best, c) { return rank(c.rarity) > rank(best) ? c.rarity : best; }, 'N');
    flash(highest);
    app.innerHTML = shell('<div class="section-head"><h2>開封結果</h2><span>PACK ' + state.packNo + ' / 5</span></div><div class="cards">' + cards.map(function (c, i) { return cardHtml(c, state.opened.length - cards.length + i, false); }).join('') + '</div><div class="deck-footer"><button class="primary" data-action="next-pack">' + (state.packNo < 5 ? '次のパック' : 'デッキを組む') + '</button></div>');
  }
  function rank(r) { return ['N','R','SR','UR','SEC'].indexOf(r); }
  function flash(rarity) {
    if (state.light || rank(rarity) < 2) return;
    var el = document.createElement('div'); el.className = 'rare-flash ' + rarity; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 900);
  }
  function renderDeck() {
    app.innerHTML = shell('<div class="section-head"><h2>20枚を選ぶ</h2><span>' + state.selected.length + ' / 20枚</span></div><div class="cards">' + state.opened.map(function (c, i) { return cardHtml(c, i, true); }).join('') + '</div><div class="deck-footer"><button class="secondary" data-action="auto-deck">おまかせ</button><button class="primary" data-action="battle" ' + (state.selected.length !== 20 ? 'disabled' : '') + '>CPU戦へ</button></div>');
  }
  function makeCpuDeck() {
    var songs = VocaluCatalog.songs.slice(0, 14), supports = VocaluCatalog.producers.slice(0, 3).concat(VocaluCatalog.singers.slice(0, 3));
    return songs.concat(supports);
  }
  function startBattle() {
    var deck = state.selected.map(function (i) { return state.opened[i]; });
    state.battle = VocaluEngine.makeBattle(deck, makeCpuDeck());
    state.screen = 'battle'; render();
  }
  function songSlot(song, index, enemy, canAct) {
    if (!song) return '<div class="slot">EMPTY</div>';
    var disabled = !enemy && (!canAct || song.attacked);
    return '<button class="slot ready ' + (song.attacked ? 'used' : '') + '" type="button" data-action="' + (enemy ? 'attack-song' : 'choose-attack') + '" data-index="' + index + '" ' + (disabled ? 'disabled' : '') + '><span class="slot-art">' + artHtml(song) + '</span><span class="slot-copy"><b>' + esc(song.name) + '</b><span>POW <strong>' + song.currentPower + '</strong></span><small>' + (enemy ? '攻撃対象' : song.attacked ? '行動済み' : 'タップして攻撃') + '</small></span></button>';
  }
  function lifeCards(count) {
    var cards='';
    for(var i=0;i<count;i+=1) cards+='<span class="life-card" aria-label="裏向きのライフカード">V</span>';
    return '<span class="life-area"><span class="life-cards">' + cards + '</span><b>LIFE ' + count + '</b></span>';
  }
  function renderBattle() {
    var b = state.battle, u = b.user, c = b.cpu;
    var userActive = b.active === 'user';
    var cpuSlots = [0,1,2].map(function (i) { return songSlot(c.field[i], i, true, false); }).join('');
    var userSlots = [0,1,2].map(function (i) { return songSlot(u.field[i], i, false, userActive); }).join('');
    var handCenter = (u.hand.length - 1) / 2;
    var hand = u.hand.map(function (card, i) {
      var value = card.type === 'song' ? card.power : (card.boost || card.bonus);
      var offset = i - handCenter;
      var angle = Math.max(-9, Math.min(9, offset * 3));
      var lift = Math.min(14, Math.abs(offset) * 4);
      var unavailable = !userActive || (card.cost || 0) > u.cost;
      return '<button class="hand-card" data-action="play" data-index="' + i + '" aria-label="' + esc(card.name) + ' コスト' + card.cost + ' ' + (card.type === 'song' ? 'パワー' : 'ブースト') + value + '" style="--hand-angle:' + angle + 'deg;--hand-lift:' + lift + 'px;--hand-z:' + (20 - Math.abs(offset)) + '" ' + (unavailable ? 'disabled' : '') + '><span class="hand-card-top"><span class="mini-cost">' + card.cost + '</span><span class="hand-rarity ' + card.rarity + '">' + (card.trigger ? 'T · ' : '') + card.rarity + '</span></span><span class="mini-art">' + artHtml(card) + '</span><span class="hand-copy"><b>' + esc(card.name) + '</b><small>' + (card.type === 'song' ? 'POWER ' : 'BOOST +') + value + '</small></span></button>';
    }).join('');
    var turnStatus = userActive ? '<span class="turn-status user-turn">YOUR TURN</span>' : '<span class="turn-status cpu-turn">CPU THINKING</span>';
    var clutchRule = u.life === 1 ? '<div class="clutch-rule">FINAL LIFE · 召喚した楽曲はすぐ攻撃可能</div>' : '';
    app.innerHTML = shell('<section class="battle">' + turnStatus + clutchRule + '<div class="fighter"><div class="fighter-head"><span><b>CPU</b><small>HAND ' + c.hand.length + ' · DECK ' + c.deck.length + '</small></span>' + lifeCards(c.life) + '</div><div class="field">' + cpuSlots + '</div></div><div class="fighter"><div class="fighter-head"><span><b>YOU</b><small>TURN ' + b.turn + ' · DECK ' + u.deck.length + '</small></span>' + lifeCards(u.life) + '</div><div class="cost-meter"><span>使用可能 COST</span><b>' + u.cost + '</b><em>/ ' + u.maxCost + '</em></div><div class="field">' + userSlots + '</div></div><div class="hand-zone"><div class="hand-label"><b>HAND</b><span>' + u.hand.length + '枚 · カードをタップして使用</span></div><div class="hand">' + hand + '</div></div><div class="log">' + b.log.slice(0,8).map(esc).join('<br>') + '</div>' + (testMode ? '<button class="secondary" data-action="test-finish">テスト: 勝利で終了</button>' : '') + '</section><div class="battle-actions"><button class="secondary" data-action="phase" ' + (!userActive ? 'disabled' : '') + '>' + (b.phase === 'main' ? '攻撃フェーズ' : 'メインフェーズ') + '</button><button class="primary" data-action="end-turn" ' + (!userActive ? 'disabled' : '') + '>ターン終了</button></div>');
  }
  function choose(title, buttons, canCancel) {
    var cancel = canCancel === false ? '' : '<button class="secondary" data-action="close-modal">キャンセル</button>';
    var modal = document.createElement('div'); modal.className = 'modal'; modal.innerHTML = '<div class="dialog"><h2>' + esc(title) + '</h2><div class="actions">' + buttons + cancel + '</div></div>'; document.body.appendChild(modal);
  }
  function playFromHand(index) {
    var card = state.battle.user.hand[index];
    if (!card) return;
    if (card.type === 'song' && state.battle.user.field.length >= 3) {
      choose('入れ替える楽曲', state.battle.user.field.map(function (song, i) { return '<button class="secondary" data-action="replace-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>'; }).join(''));
    } else if (card.type === 'singer' && state.battle.user.field.length) {
      choose('装備する楽曲', state.battle.user.field.map(function (song, i) { return '<button class="secondary" data-action="equip-play" data-hand="' + index + '" data-index="' + i + '">' + esc(song.name) + '</button>'; }).join(''));
    } else { VocaluEngine.playCard(state.battle, 'user', index, 0); render(); }
  }
  function attackLife(attackerIndex) {
    var cpu = state.battle.cpu;
    var guard = cpu.field.findIndex(function (song) { return song.currentPower <= state.battle.user.field[attackerIndex].currentPower; });
    VocaluEngine.attack(state.battle, 'user', attackerIndex, 'life', null, guard >= 0 && cpu.life === 1 ? guard : null);
    afterAction();
  }
  function chooseAttack(attackerIndex) {
    var attacker = state.battle.user.field[attackerIndex];
    if (!attacker || attacker.attacked) return toast('この楽曲は攻撃できません');
    var targets = '<button class="primary" data-action="confirm-life-attack" data-attacker="' + attackerIndex + '">相手ライフへ攻撃</button>';
    targets += state.battle.cpu.field.map(function (song, i) { return '<button class="secondary" data-action="confirm-song-attack" data-attacker="' + attackerIndex + '" data-index="' + i + '">' + esc(song.name) + ' · POW ' + song.currentPower + '</button>'; }).join('');
    choose(attacker.name + ' · 攻撃先を選ぶ', targets);
  }
  function attackSong(targetIndex) {
    var ready = state.battle.user.field.map(function (s, i) { return { s:s, i:i }; }).filter(function (x) { return !x.s.attacked; });
    if (!ready.length) return toast('攻撃できる楽曲がありません');
    choose('攻撃する楽曲', ready.map(function (x) { return '<button class="secondary" data-action="confirm-song-attack" data-attacker="' + x.i + '" data-index="' + targetIndex + '">' + esc(x.s.name) + ' (' + x.s.currentPower + ')</button>'; }).join(''));
  }
  function showTriggerNotice(resume) {
    var trigger = state.battle && state.battle.lastTrigger;
    if (!trigger) return false;
    state.battle.lastTrigger = null;
    state.triggerResume = resume || null;
    render();
    var owner = trigger.side === 'user' ? 'あなた' : 'CPU';
    choose('TRIGGER 発動', '<div class="trigger-reveal"><span>' + esc(owner + 'のライフ') + '</span><b>' + esc(trigger.cardName) + '</b><strong>' + esc(trigger.label) + '</strong><p>' + esc(trigger.text) + '</p></div><button class="primary" data-action="dismiss-trigger">効果を確認</button>', false);
    return true;
  }
  function afterAction() {
    if (state.battle.winner) finishBattle();
    else if (!showTriggerNotice(null)) render();
  }
  function finishBattle() { saveCollection(state.opened); state.screen = 'result'; render(); }
  function renderResult() {
    var win = state.battle.winner === 'user';
    app.innerHTML = shell('<section class="hero"><h1>' + (win ? 'LIVE CLEAR!' : 'NEXT STAGE') + '</h1><p>' + (win ? '勝利しました。' : '今回はCPUの勝利です。') + ' 開封した25枚をコレクションに保存しました。</p></section><div class="actions"><button class="primary" data-action="restart">もう一度遊ぶ</button><button class="secondary" data-action="collection">コレクションを見る</button></div>');
  }
  function renderCollection() {
    var cards = VocaluCatalog.cards.filter(function (c) { return state.collection[c.id]; });
    app.innerHTML = shell('<div class="section-head"><h2>コレクション</h2><span>' + cards.length + ' / 280種</span></div>' + (cards.length ? '<div class="cards">' + cards.map(function (c) { return cardHtml(c, -1, false); }).join('') + '</div>' : '<p class="notice">対戦を最後まで終えると、開封カードがここに保存されます。</p>') + '<div class="deck-footer"><button class="primary" data-action="home">ホームへ</button></div>');
  }
  function cardDetail(id) {
    var card = VocaluCatalog.cards.find(function (c) { return c.id === id; }); if (!card) return;
    var text = card.type === 'song' ? card.metricNote : (card.text || card.profile);
    var triggerText = card.trigger ? '<div class="trigger-detail"><b>TRIGGER · ' + esc(card.trigger.label) + '</b><p>' + esc(card.trigger.text) + '</p></div>' : '';
    var sourceUrl = card.videoUrl || card.profileUrl;
    var officialLink = sourceUrl ? '<a class="official-link" href="' + esc(sourceUrl) + '" target="_blank" rel="noopener">画像・掲載元を見る</a>' : '';
    choose(card.name, '<p>' + esc(text) + '</p>' + triggerText + officialLink + '<p>所持 ' + (state.collection[id] || 0) + '枚</p>');
  }
  function toast(message) { var old = document.querySelector('.error-toast'); if (old) old.remove(); var el = document.createElement('div'); el.className = 'error-toast'; el.textContent = message; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 3500); }

  function initMusic() {
    if (yt && state.music.ready) { if (state.music.playing) yt.pauseVideo(); else yt.playVideo(); return; }
    state.music.title = 'YouTubeを接続中'; render();
    window.onYouTubeIframeAPIReady = function () {
      try {
        yt = new YT.Player('yt-player', { height:'1', width:'1', playerVars:{ listType:'playlist', list:'PL4hnIvXd3nC4mvwumy4IFfY4d8vVmcVGA', playsinline:1, controls:0 }, events:{ onReady:function (e) { state.music.ready=true; e.target.setVolume(state.music.volume); e.target.playVideo(); }, onStateChange:function (e) { state.music.playing=e.data===1; try { state.music.title=e.target.getVideoData().title || 'VOCALU BGM'; } catch(ignore){} render(); }, onError:function(){ toast('BGMを読み込めませんでした。ゲームは続けられます。'); } } });
      } catch (err) { toast('BGMの初期化に失敗しました。'); }
    };
    if (!document.getElementById('youtube-api')) { var s=document.createElement('script'); s.id='youtube-api'; s.src='https://www.youtube.com/iframe_api'; s.onerror=function(){ toast('BGMへ接続できません。ゲームは続けられます。'); }; document.head.appendChild(s); }
  }
  function musicControls() {
    if (!state.music.ready) initMusic();
    choose('BGM', '<p>' + esc(state.music.title) + '</p><button class="secondary" data-action="music-prev">前の曲</button><button class="secondary" data-action="music-toggle">再生 / 停止</button><button class="secondary" data-action="music-next">次の曲</button><button class="secondary" data-action="music-down">音量 -</button><button class="secondary" data-action="music-up">音量 +</button><p>音量 ' + state.music.volume + '</p>');
  }
  function runCpuTurn() {
    VocaluEngine.endTurn(state.battle,'user');
    VocaluEngine.cpuMainPhase(state.battle);
    render();
    window.setTimeout(runNextCpuAttack, state.light ? 20 : 280);
  }
  function runNextCpuAttack() {
    var b=state.battle;
    if(b.winner) return finishBattle();
    var attackerIndex=b.cpu.field.findIndex(function(song){return !song.attacked;});
    if(attackerIndex<0){VocaluEngine.endTurn(b,'cpu');return render();}
    var attacker=b.cpu.field[attackerIndex];
    var weakTarget=b.user.field.findIndex(function(target){return attacker.currentPower>=target.currentPower;});
    if(weakTarget>=0 && b.user.life>1){
      VocaluEngine.attack(b,'cpu',attackerIndex,'song',weakTarget);
      render();
      return window.setTimeout(runNextCpuAttack,state.light?20:280);
    }
    var options='<button class="primary" data-action="resolve-cpu-attack" data-attacker="'+attackerIndex+'" data-guard="life">ライフで受ける</button>';
    options+=b.user.field.map(function(song,i){return '<button class="secondary" data-action="resolve-cpu-attack" data-attacker="'+attackerIndex+'" data-guard="'+i+'">'+esc(song.name)+'でガード · POW '+song.currentPower+'</button>';}).join('');
    choose(attacker.name+'の攻撃 · POW '+attacker.currentPower,options,false);
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action]'); if (!button) return;
    var action = button.dataset.action;
    try {
      if (action === 'start') { state.opened=[]; state.packNo=0; state.selected=[]; state.screen='pack'; render(); }
      else if (action === 'open-pack') { button.classList.add('opening'); setTimeout(function(){ revealPack(VocaluEngine.openPack(VocaluCatalog.cards)); }, state.light?20:500); }
      else if (action === 'bulk-open') { while(state.packNo<5){ state.opened=state.opened.concat(VocaluEngine.openPack(VocaluCatalog.cards)); state.packNo+=1; } state.screen='deck'; state.selected=VocaluEngine.autoBuild(state.opened); render(); }
      else if (action === 'next-pack') { if(state.packNo<5){state.screen='pack';render();}else{state.screen='deck';state.selected=VocaluEngine.autoBuild(state.opened);render();} }
      else if (action === 'select') { var idx=Number(button.dataset.index), pos=state.selected.indexOf(idx); if(pos>=0)state.selected.splice(pos,1);else if(state.selected.length<20)state.selected.push(idx);else toast('デッキは20枚です'); render(); }
      else if (action === 'auto-deck') { state.selected=VocaluEngine.autoBuild(state.opened);render(); }
      else if (action === 'battle') startBattle();
      else if (action === 'play') playFromHand(Number(button.dataset.index));
      else if (action === 'replace-play' || action === 'equip-play') { document.querySelector('.modal').remove(); VocaluEngine.playCard(state.battle,'user',Number(button.dataset.hand),Number(button.dataset.index));render(); }
      else if (action === 'choose-attack') chooseAttack(Number(button.dataset.index));
      else if (action === 'confirm-life-attack') { document.querySelector('.modal').remove(); attackLife(Number(button.dataset.attacker)); }
      else if (action === 'attack-song') attackSong(Number(button.dataset.index));
      else if (action === 'confirm-song-attack') { document.querySelector('.modal').remove(); VocaluEngine.attack(state.battle,'user',Number(button.dataset.attacker),'song',Number(button.dataset.index));afterAction(); }
      else if (action === 'phase') { state.battle.phase=state.battle.phase==='main'?'attack':'main';render(); }
      else if (action === 'end-turn') runCpuTurn();
      else if (action === 'resolve-cpu-attack') { button.closest('.modal').remove(); VocaluEngine.attack(state.battle,'cpu',Number(button.dataset.attacker),'life',null,button.dataset.guard==='life'?null:Number(button.dataset.guard)); if(!showTriggerNotice(runNextCpuAttack)){render();window.setTimeout(runNextCpuAttack,state.light?20:280);} }
      else if (action === 'dismiss-trigger') { button.closest('.modal').remove(); var resumeTrigger=state.triggerResume;state.triggerResume=null;if(resumeTrigger)window.setTimeout(resumeTrigger,state.light?20:280);else render(); }
      else if (action === 'close-modal') button.closest('.modal').remove();
      else if (action === 'collection') { state.screen='collection';render(); }
      else if (action === 'home') { state.screen='home';render(); }
      else if (action === 'restart') { state.opened=[];state.packNo=0;state.selected=[];state.battle=null;state.screen='pack';render(); }
      else if (action === 'toggle-light') { state.light=!state.light;render(); }
      else if (action === 'music') musicControls();
      else if (action === 'music-prev') { if(yt&&state.music.ready)yt.previousVideo(); }
      else if (action === 'music-next') { if(yt&&state.music.ready)yt.nextVideo(); }
      else if (action === 'music-toggle') { if(yt&&state.music.ready){if(state.music.playing)yt.pauseVideo();else yt.playVideo();} }
      else if (action === 'music-down') { state.music.volume=Math.max(0,state.music.volume-10);if(yt&&state.music.ready)yt.setVolume(state.music.volume);button.closest('.modal').remove();musicControls(); }
      else if (action === 'music-up') { state.music.volume=Math.min(100,state.music.volume+10);if(yt&&state.music.ready)yt.setVolume(state.music.volume);button.closest('.modal').remove();musicControls(); }
      else if (action === 'detail') cardDetail(button.dataset.card);
      else if (action === 'force-rare') { var card=VocaluCatalog.cards.find(function(c){return c.rarity===button.dataset.rare;});flash(button.dataset.rare);choose(button.dataset.rare+'演出確認',cardHtml(card,-1,false)); }
      else if (action === 'reset-save') { localStorage.removeItem(STORAGE);state.collection={};render(); }
      else if (action === 'test-finish' && testMode) { state.battle.winner='user';finishBattle(); }
    } catch (err) { toast(err.message || '操作を続けられませんでした'); console.error(err); }
  });

  var startY=0;
  app.addEventListener('touchstart',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.touches[0])startY=e.touches[0].clientY;},{passive:true});
  app.addEventListener('touchend',function(e){var p=e.target.closest('[data-action="open-pack"]');if(p&&e.changedTouches[0]&&startY-e.changedTouches[0].clientY>35)p.click();},{passive:true});
  document.addEventListener('error',function(e){
    if(e.target && e.target.matches && e.target.matches('.card-art img')){
      var art=e.target.parentNode; art.textContent=e.target.alt.replace(' 公式MV',''); art.classList.add('image-fallback');
    }
  },true);

  function fatalError(message) { boot.hidden=true; app.hidden=true; fatal.hidden=false; document.getElementById('fatal-message').textContent=message; }
  window.addEventListener('error',function(e){ if(!app.hidden) toast('エラーから復旧しました: '+e.message); else fatalError('起動エラー: '+e.message); });
  window.addEventListener('unhandledrejection',function(e){ toast('処理エラーから復旧しました'); console.error(e.reason); });
  document.getElementById('reload-button').addEventListener('click',function(){location.reload();});

  try {
    if (!window.VocaluCatalog || !window.VocaluEngine) throw new Error('必要なゲームデータを読み込めませんでした');
    if (VocaluCatalog.counts.total !== 280) throw new Error('カードデータが280種類ではありません');
    boot.hidden=true; app.hidden=false; render();
  } catch (err) { fatalError(err.message); }
}());
