(function () {
  'use strict';
  var app = document.getElementById('app');
  var boot = document.getElementById('boot');
  var fatal = document.getElementById('fatal');
  var testMode = new URLSearchParams(location.search).get('test') === '1';
  var STORAGE = 'vocalu-save-v1';
  var state = { screen: 'home', opened: [], packNo: 0, selected: [], battle: null, collection: loadCollection(), light: matchMedia('(prefers-reduced-motion: reduce)').matches, music: { ready: false, playing: false, volume: 40, title: 'BGM未再生' } };
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
  function shell(content) {
    return '<main class="shell"><header class="topbar"><div class="brand">ボカる！ <em>VOCALU</em></div><button class="icon-btn" data-action="music" aria-label="BGM">' + (state.music.playing ? 'Ⅱ' : '♪') + '</button></header>' + content + '</main>';
  }
  function cardHtml(card, index, selectable) {
    var chosen = state.selected.indexOf(index) >= 0;
    var art = card.thumbnailVerified && card.thumbnailUrl ? '<img src="' + esc(card.thumbnailUrl) + '" alt="' + esc(card.name) + ' 公式MV" loading="lazy">' : '<span>' + icon(card.type) + '<br>' + esc(card.name) + '</span>';
    var detail = card.type === 'song' ? 'POW ' + card.power + ' / COST ' + card.cost : card.type === 'producer' ? '+' + card.bonus + ' / COST ' + card.cost : '+' + card.boost + ' / COST ' + card.cost;
    return '<article class="card ' + (chosen ? 'selected ' : '') + 'reveal"><button type="button" ' + (selectable ? 'data-action="select" data-index="' + index + '"' : 'data-action="detail" data-card="' + esc(card.id) + '"') + '><div class="card-art">' + art + '</div><span class="rarity ' + card.rarity + '">' + card.rarity + '</span><div class="card-body"><h3>' + esc(card.name) + '</h3><div class="meta"><span>' + esc(card.variant || card.type) + '</span><b>' + detail + '</b></div></div></button></article>';
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
  function songSlot(song, index, enemy) {
    if (!song) return '<div class="slot">EMPTY</div>';
    return '<button class="slot ready ' + (song.attacked ? 'used' : '') + '" type="button" data-action="' + (enemy ? 'attack-song' : 'attack-life') + '" data-index="' + index + '"><b>' + esc(song.name) + '</b><br>POW ' + song.currentPower + '<br>' + (song.attacked ? '行動済み' : '攻撃可能') + '</button>';
  }
  function renderBattle() {
    var b = state.battle, u = b.user, c = b.cpu;
    var cpuSlots = [0,1,2].map(function (i) { return songSlot(c.field[i], i, true); }).join('');
    var userSlots = [0,1,2].map(function (i) { return songSlot(u.field[i], i, false); }).join('');
    var hand = u.hand.map(function (card, i) { return '<button class="hand-card" data-action="play" data-index="' + i + '" ' + ((card.cost || 0) > u.cost ? 'disabled' : '') + '><b>' + esc(card.name) + '</b><br><small>' + card.type + ' / COST ' + card.cost + '</small></button>'; }).join('');
    app.innerHTML = shell('<section class="battle"><div class="fighter"><div class="fighter-head"><b>CPU</b><span class="life">LIFE ' + c.life + '</span></div><div class="field">' + cpuSlots + '</div></div><div class="fighter"><div class="fighter-head"><b>YOU · TURN ' + b.turn + '</b><span>COST ' + u.cost + ' / ' + u.maxCost + ' · <span class="life">LIFE ' + u.life + '</span></span></div><div class="field">' + userSlots + '</div></div><div><small>HAND</small><div class="hand">' + hand + '</div></div><div class="log">' + b.log.slice(0,8).map(esc).join('<br>') + '</div>' + (testMode ? '<button class="secondary" data-action="test-finish">テスト: 勝利で終了</button>' : '') + '</section><div class="battle-actions"><button class="secondary" data-action="phase">' + (b.phase === 'main' ? '攻撃フェーズ' : 'メインフェーズ') + '</button><button class="primary" data-action="end-turn">ターン終了</button></div>');
  }
  function choose(title, buttons) {
    var modal = document.createElement('div'); modal.className = 'modal'; modal.innerHTML = '<div class="dialog"><h2>' + esc(title) + '</h2><div class="actions">' + buttons + '<button class="secondary" data-action="close-modal">キャンセル</button></div></div>'; document.body.appendChild(modal);
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
  function attackSong(targetIndex) {
    var ready = state.battle.user.field.map(function (s, i) { return { s:s, i:i }; }).filter(function (x) { return !x.s.attacked; });
    if (!ready.length) return toast('攻撃できる楽曲がありません');
    choose('攻撃する楽曲', ready.map(function (x) { return '<button class="secondary" data-action="confirm-song-attack" data-attacker="' + x.i + '" data-index="' + targetIndex + '">' + esc(x.s.name) + ' (' + x.s.currentPower + ')</button>'; }).join(''));
  }
  function afterAction() { if (state.battle.winner) finishBattle(); else render(); }
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
    var officialLink = card.videoUrl ? '<a class="official-link" href="' + esc(card.videoUrl) + '" target="_blank" rel="noopener">YouTubeで公式MVを見る</a>' : '';
    choose(card.name, '<p>' + esc(text) + '</p>' + officialLink + '<p>所持 ' + (state.collection[id] || 0) + '枚</p>');
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
  function runCpuTurn(guardIndex) {
    VocaluEngine.endTurn(state.battle,'user');
    VocaluEngine.cpuTurn(state.battle,Math.random,guardIndex);
    afterAction();
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
      else if (action === 'attack-life') attackLife(Number(button.dataset.index));
      else if (action === 'attack-song') attackSong(Number(button.dataset.index));
      else if (action === 'confirm-song-attack') { document.querySelector('.modal').remove(); VocaluEngine.attack(state.battle,'user',Number(button.dataset.attacker),'song',Number(button.dataset.index));afterAction(); }
      else if (action === 'phase') { state.battle.phase=state.battle.phase==='main'?'attack':'main';render(); }
      else if (action === 'end-turn') {
        if (state.battle.user.field.length) {
          choose('ライフ攻撃を受ける時', '<button class="secondary" data-action="cpu-guard" data-index="life">ライフで受ける</button>' + state.battle.user.field.map(function(song,i){return '<button class="secondary" data-action="cpu-guard" data-index="'+i+'">'+esc(song.name)+'でガード</button>';}).join(''));
        } else runCpuTurn(null);
      }
      else if (action === 'cpu-guard') { button.closest('.modal').remove(); runCpuTurn(button.dataset.index === 'life' ? null : Number(button.dataset.index)); }
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
