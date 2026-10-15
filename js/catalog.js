(function (root) {
  'use strict';

  var rawSongs = [
    '千本桜|黒うさP','メルト|ryo','ワールドイズマイン|ryo','初音ミクの消失|cosMo@暴走P','みくみくにしてあげる♪|ika','Tell Your World|kz','ODDS&ENDS|ryo','Hand in Hand|kz','39|sasakure.UK×DECO*27','砂の惑星|ハチ',
    'ゴーストルール|DECO*27','ヒバナ|DECO*27','ヴァンパイア|DECO*27','モザイクロール|DECO*27','妄想感傷代償連盟|DECO*27','乙女解剖|DECO*27','愛言葉|DECO*27','二息歩行|DECO*27','弱虫モンブラン|DECO*27','アンデッドアリス|DECO*27',
    'ローリンガール|wowaka','裏表ラバーズ|wowaka','ワールズエンド・ダンスホール|wowaka','アンノウン・マザーグース|wowaka','積み木の人形|wowaka','マトリョシカ|ハチ','ドーナツホール|ハチ','パンダヒーロー|ハチ','結ンデ開イテ羅刹ト骸|ハチ','リンネ|ハチ',
    'ロキ|みきとP','少女レイ|みきとP','いーあるふぁんくらぶ|みきとP','サリシノハラ|みきとP','バレリーコ|みきとP','神っぽいな|ピノキオピー','すろぉもぉしょん|ピノキオピー','魔法少女とチョコレゐト|ピノキオピー','ありふれたせかいせいふく|ピノキオピー','腐れ外道とチョコレゐト|ピノキオピー',
    'からくりピエロ|40mP','トリノコシティ|40mP','恋愛裁判|40mP','キリトリセン|40mP','ドレミファロンド|40mP','六兆年と一夜物語|kemu','人生リセットボタン|kemu','敗北の少年|kemu','インビジブル|kemu','地球最後の告白を|kemu',
    'KING|Kanaria','酔いどれ知らず|Kanaria','QUEEN|Kanaria','EYE|Kanaria','エンヴィーベイビー|Kanaria','シャルル|バルーン','雨とペトラ|バルーン','レディーレ|バルーン','花瓶に触れた|バルーン','メーベル|バルーン',
    'アスノヨゾラ哨戒班|Orangestar','DAYBREAK FRONTLINE|Orangestar','快晴|Orangestar','イヤホンと蝉時雨|Orangestar','回る空うさぎ|Orangestar','命に嫌われている。|カンザキイオリ','あの夏が飽和する。|カンザキイオリ','君の神様になりたい。|カンザキイオリ','ハウトゥー世界征服|Neru','脱法ロック|Neru',
    'ロストワンの号哭|Neru','東京テディベア|Neru','再教育|Neru','エイリアンエイリアン|ナユタン星人','太陽系デスコ|ナユタン星人','ダンスロボットダンス|ナユタン星人','惑星ループ|ナユタン星人','彗星ハネムーン|ナユタン星人','チュルリラ・チュルリラ・ダッダッダ！|和田たけあき','ブリキノダンス|日向電工',
    '脳漿炸裂ガール|れるりり','聖槍爆裂ボーイ|れるりり','天ノ弱|164','夜咄ディセイブ|じん','カゲロウデイズ|じん','チルドレンレコード|じん','アウターサイエンス|じん','如月アテンション|じん','独りんぼエンヴィー|koyori','心做し|蝶々P',
    '炉心融解|iroha(sasaki)','右肩の蝶|のりぴー','悪ノ娘|mothy','悪ノ召使|mothy','深海少女|ゆうゆ','1925|T-POCKET','ルカルカ★ナイトフィーバー|samfree','ダブルラリアット|アゴアニキ','Just Be Friends|Dixie Flatline','magnet|minato'
  ];

  var producerNames = ['ryo','DECO*27','wowaka','ハチ','みきとP','ピノキオピー','40mP','kemu','Kanaria','バルーン','Orangestar','カンザキイオリ','Neru','ナユタン星人','じん','れるりり','黒うさP','kz','cosMo@暴走P','sasakure.UK','和田たけあき','日向電工','164','koyori','蝶々P','iroha(sasaki)','mothy','ゆうゆ','samfree','minato'];
  var singerNames = ['初音ミク','鏡音リン','鏡音レン','巡音ルカ','MEIKO','KAITO','GUMI','IA','flower','音街ウナ','可不','重音テト','歌愛ユキ','結月ゆかり','神威がくぽ','氷山キヨテル','猫村いろは','miki','VY1','VY2','Fukase','MAYU','蒼姫ラピス','kokone','東北ずん子','琴葉茜','琴葉葵','紲星あかり','星界','裏命','狐子','羽累','知声','ナクモ','めろう','ずんだもん','四国めたん','九州そら','双葉湊音','夏色花梨','小春六花','花隈千冬','ゲキヤク','カゼヒキ','足立レイ','波音リツ','桃音モモ','唄音ウタ','亞北ネル','弱音ハク'];

  // YouTube上の公式投稿または公式アーティストチャンネルを確認した動画のみ登録する。
  var verifiedVideos = {
    '千本桜':'shs0rAiwsGQ','砂の惑星':'AS4q9yaWJkI','ゴーストルール':'KushW6zvazM','ヒバナ':'hW-Iy4CsCmQ','ヴァンパイア':'e1xCOsgWG0M',
    'モザイクロール':'DnLFVUi3oOU','妄想感傷代償連盟':'8pGRdRhjX3o','乙女解剖':'7zwCIz-Ohn4','ローリンガール':'vnw8zURAxkU','アンノウン・マザーグース':'P_CSdxSGfaA',
    'マトリョシカ':'HOz-9FzIDf0','ドーナツホール':'qnX2CdOBcDI','パンダヒーロー':'0RU_05zpETo','ロキ':'Xg-qfsKN2_E','少女レイ':'JW3N-HvU0MA',
    'いーあるふぁんくらぶ':'oBgADhsOoog','サリシノハラ':'fAbO6CV7Qko','神っぽいな':'EHBFKhLUVig','すろぉもぉしょん':'ARt2fVT33Lw','魔法少女とチョコレゐト':'T2kS1gAbxhc',
    'からくりピエロ':'xxFkW3PCT5M','恋愛裁判':'TXzfQ0cP1P0','六兆年と一夜物語':'Om3MTou2kPg','KING':'cm-l2h6GB8Q','酔いどれ知らず':'vB8sxY_PJ_w',
    'QUEEN':'KFCaSz_yYCM','EYE':'sSHkXxADtaE','エンヴィーベイビー':'dgS6HvEohsw','シャルル':'TA5OFS_xX0c','アスノヨゾラ哨戒班':'XogSflwXgpw',
    'DAYBREAK FRONTLINE':'emrt46SRyYs','命に嫌われている。':'0HYm60Mjm0k','ロストワンの号哭':'8oBV3jPTW4s','エイリアンエイリアン':'2t1NMRse6aI','太陽系デスコ':'Ja9qmYjXk6U',
    'ダンスロボットダンス':'g7dvpD_zlIM','惑星ループ':'LNX0GsjBP2w','彗星ハネムーン':'wCj04kwAFX8','天ノ弱':'2-zPY0vrpjQ','カゲロウデイズ':'EMGyiiTC7sg'
  };

  function rarityFor(index) {
    var roll = (index * 37 + 11) % 100;
    if (roll < 55) return 'N';
    if (roll < 83) return 'R';
    if (roll < 95) return 'SR';
    if (roll < 99) return 'UR';
    return 'SEC';
  }
  function powerFor(index) { return 1000 + ((index * 7) % 19) * 500; }
  function songCost(power) { return Math.max(1, Math.min(10, Math.ceil(power / 1500))); }

  var songs = [];
  rawSongs.forEach(function (line, index) {
    var parts = line.split('|');
    var basePower = powerFor(index);
    var videoId = verifiedVideos[parts[0]] || null;
    [false, true].forEach(function (special, variant) {
      var id = 'song-' + String(index + 1).padStart(3, '0') + (special ? '-sp' : '');
      songs.push({
        id: id,
        type: 'song',
        name: parts[0],
        producer: parts[1],
        variant: special ? 'コレクター版' : '通常版',
        rarity: special ? rarityFor(index + 180) : rarityFor(index),
        power: basePower,
        cost: songCost(basePower),
        viewCount: null,
        viewCountVerifiedAt: null,
        videoUrl: videoId ? 'https://www.youtube.com/watch?v=' + videoId : null,
        thumbnailUrl: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : null,
        thumbnailVerified: Boolean(videoId),
        mediaVerifiedAt: videoId ? '2026-10-16' : null,
        metricNote: videoId ? '公式動画を確認済み。再生数と対戦値の同期は準備中です。' : '公式MV画像は確認待ち。対戦値はテスト用バランス値です。'
      });
    });
  });

  var producers = producerNames.map(function (name, index) {
    return { id: 'producer-' + String(index + 1).padStart(2, '0'), type: 'producer', name: name, rarity: rarityFor(index + 40), cost: 1 + index % 3, bonus: 500 + index % 4 * 500, text: '自分の楽曲を強化。制作楽曲が場にあると効果が2倍。' };
  });
  var singers = singerNames.map(function (name, index) {
    return { id: 'singer-' + String(index + 1).padStart(2, '0'), type: 'singer', name: name, rarity: rarityFor(index + 70), cost: 1 + index % 3, boost: 500 + index % 5 * 500, profile: '楽曲に装備し、歌声の個性でパワーを加えるサポートカード。' };
  });

  var catalog = songs.concat(producers, singers);
  root.VocaluCatalog = { cards: catalog, songs: songs, producers: producers, singers: singers, counts: { songs: songs.length, producers: producers.length, singers: singers.length, total: catalog.length } };
}(typeof self !== 'undefined' ? self : this));
