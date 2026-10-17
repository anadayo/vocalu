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

  function vocaDbProfile(id, extension) {
    return { image: 'https://static.vocadb.net/img/Artist/mainOrig/' + id + '.' + (extension || 'png'), source: 'https://vocadb.net/Artist/Details/' + id, label: 'VocaDB掲載プロフィール画像' };
  }

  // 同名人物の取り違えを避けるため、確認済みのアーティストIDを明示する。
  var producerProfiles = {
    'ryo':vocaDbProfile(67,'jpg'),'DECO*27':vocaDbProfile(45,'jpg'),'wowaka':vocaDbProfile(53),'ハチ':vocaDbProfile(49,'jpg'),'みきとP':vocaDbProfile(876,'jpg'),
    'ピノキオピー':vocaDbProfile(28,'jpg'),'40mP':vocaDbProfile(8,'jpg'),'kemu':vocaDbProfile(735,'jpg'),'Kanaria':vocaDbProfile(80976,'jpg'),'バルーン':vocaDbProfile(10259,'jpg'),
    'Orangestar':vocaDbProfile(11630,'jpg'),'カンザキイオリ':vocaDbProfile(23721,'jpg'),'Neru':vocaDbProfile(137,'jpg'),'ナユタン星人':vocaDbProfile(36280,'jpg'),'じん':vocaDbProfile(552,'jpg'),
    'れるりり':vocaDbProfile(712,'jpg'),'黒うさP':vocaDbProfile(310,'jpg'),'kz':vocaDbProfile(89,'jpg'),'cosMo@暴走P':vocaDbProfile(85,'jpg'),'sasakure.UK':vocaDbProfile(51,'jpg'),
    '和田たけあき':vocaDbProfile(1226,'jpg'),'日向電工':vocaDbProfile(2435,'jpg'),'164':vocaDbProfile(41,'jpg'),'koyori':vocaDbProfile(308,'jpg'),'蝶々P':vocaDbProfile(96,'jpg'),
    'iroha(sasaki)':vocaDbProfile(491,'jpg'),'mothy':vocaDbProfile(189),'ゆうゆ':vocaDbProfile(66,'jpg'),'samfree':vocaDbProfile(52,'jpg'),'minato':vocaDbProfile(17,'jpg')
  };

  var singerProfiles = {
    '初音ミク':vocaDbProfile(1),'鏡音リン':vocaDbProfile(14),'鏡音レン':vocaDbProfile(15),'巡音ルカ':vocaDbProfile(2),'MEIKO':vocaDbProfile(176),
    'KAITO':vocaDbProfile(71),'GUMI':vocaDbProfile(3),'IA':vocaDbProfile(504),'flower':vocaDbProfile(21165),'音街ウナ':vocaDbProfile(87780),
    '可不':vocaDbProfile(83928),'重音テト':vocaDbProfile(116),'歌愛ユキ':vocaDbProfile(191),'結月ゆかり':vocaDbProfile(623),'神威がくぽ':vocaDbProfile(12),
    '氷山キヨテル':vocaDbProfile(246),'猫村いろは':vocaDbProfile(77),'miki':vocaDbProfile(146),'VY1':vocaDbProfile(117),'VY2':vocaDbProfile(118),
    'Fukase':vocaDbProfile(40866),'MAYU':vocaDbProfile(1766),'蒼姫ラピス':vocaDbProfile(156),'kokone':vocaDbProfile(16545),'東北ずん子':vocaDbProfile(16933),
    '琴葉茜':vocaDbProfile(40988),'琴葉葵':vocaDbProfile(40989),'紲星あかり':vocaDbProfile(62968),'星界':vocaDbProfile(99953),'裏命':vocaDbProfile(105295),
    '狐子':vocaDbProfile(110061),'羽累':vocaDbProfile(112287),'知声':vocaDbProfile(99757),'ナクモ':vocaDbProfile(89778),'めろう':vocaDbProfile(85854),
    'ずんだもん':vocaDbProfile(58538),'四国めたん':vocaDbProfile(58539),'九州そら':vocaDbProfile(100778),'双葉湊音':vocaDbProfile(110840),'夏色花梨':vocaDbProfile(94959),
    '小春六花':vocaDbProfile(85853),'花隈千冬':vocaDbProfile(103592),'ゲキヤク':vocaDbProfile(57096),'カゼヒキ':vocaDbProfile(43443),'足立レイ':vocaDbProfile(74389),
    '波音リツ':vocaDbProfile(1746),'桃音モモ':vocaDbProfile(598),'唄音ウタ':vocaDbProfile(803),
    '亞北ネル':{image:'https://miku.sega.jp/mega39s/img/module/module_10.png',source:'https://miku.sega.jp/mega39s/module/etc/',label:'SEGA公式掲載画像'},
    '弱音ハク':{image:'https://miku.sega.jp/mega39s/img/module/module_9.png',source:'https://miku.sega.jp/mega39s/module/etc/',label:'SEGA公式掲載画像'}
  };

  // YouTube上の公式投稿または公式アーティストチャンネルを確認した動画のみ登録する。
  var verifiedVideos = {
    '千本桜':'shs0rAiwsGQ','砂の惑星':'AS4q9yaWJkI','ゴーストルール':'KushW6zvazM','ヒバナ':'hxSg2Ioz3LM','ヴァンパイア':'e1xCOsgWG0M',
    'モザイクロール':'DnLFVUi3oOU','妄想感傷代償連盟':'8pGRdRhjX3o','乙女解剖':'7zwCIz-Ohn4','ローリンガール':'vnw8zURAxkU','アンノウン・マザーグース':'P_CSdxSGfaA',
    'マトリョシカ':'HOz-9FzIDf0','ドーナツホール':'qnX2CdOBcDI','パンダヒーロー':'0RU_05zpETo','ロキ':'Xg-qfsKN2_E','少女レイ':'JW3N-HvU0MA',
    'いーあるふぁんくらぶ':'oBgADhsOoog','サリシノハラ':'fAbO6CV7Qko','神っぽいな':'EHBFKhLUVig','すろぉもぉしょん':'ARt2fVT33Lw','魔法少女とチョコレゐト':'T2kS1gAbxhc',
    'からくりピエロ':'xxFkW3PCT5M','恋愛裁判':'TXzfQ0cP1P0','六兆年と一夜物語':'Om3MTou2kPg','KING':'cm-l2h6GB8Q','酔いどれ知らず':'vB8sxY_PJ_w',
    'QUEEN':'KFCaSz_yYCM','EYE':'sSHkXxADtaE','エンヴィーベイビー':'dgS6HvEohsw','シャルル':'TA5OFS_xX0c','アスノヨゾラ哨戒班':'XogSflwXgpw',
    'DAYBREAK FRONTLINE':'emrt46SRyYs','命に嫌われている。':'0HYm60Mjm0k','ロストワンの号哭':'8oBV3jPTW4s','エイリアンエイリアン':'2t1NMRse6aI','太陽系デスコ':'Ja9qmYjXk6U',
    'ダンスロボットダンス':'g7dvpD_zlIM','惑星ループ':'LNX0GsjBP2w','彗星ハネムーン':'wCj04kwAFX8','天ノ弱':'2-zPY0vrpjQ','カゲロウデイズ':'EMGyiiTC7sg',
    'Tell Your World':'PqJNc9KVIZE','Hand in Hand':'RKtoreimcQ8','39':'ecU_uJRzhfk','愛言葉':'I0eeS5wYGzI','二息歩行':'O4ygRYdrwWk',
    '弱虫モンブラン':'B-A2eYlbrwQ','アンデッドアリス':'3CsQyaZOHhI','裏表ラバーズ':'b_cuMcDWwsI','ワールズエンド・ダンスホール':'ZB75e7vzX0I','積み木の人形':'6nrK6iTVkz4',
    '結ンデ開イテ羅刹ト骸':'AKffZySqQts','リンネ':'EahYs-8tTjQ','バレリーコ':'4Ohpj2GDbRQ','ありふれたせかいせいふく':'8Z3TbMBfDM0','腐れ外道とチョコレゐト':'sHnvEsNU1X0',
    'トリノコシティ':'yIQDGwyJpSo','キリトリセン':'EjYwEoZHKvQ','ドレミファロンド':'bphS6_wayug','人生リセットボタン':'IN3kbST908c','敗北の少年':'w2ySuxC2SNI',
    'インビジブル':'vXSpdipuiFs','地球最後の告白を':'s8KBk8ZRH54','雨とペトラ':'PdfdOhYVU40','レディーレ':'cweRY2J9EZI','花瓶に触れた':'1U7KFKO5GPo',
    'メーベル':'PfCcIsDmlfA','快晴':'BwGpXK3W6tE','イヤホンと蝉時雨':'UBqPPkB_Ybc','回る空うさぎ':'CLywtSOj4NA','あの夏が飽和する。':'mKaRxty1j7g',
    '君の神様になりたい。':'X5kQR92kYn0','ハウトゥー世界征服':'HdC2cB_DZok','脱法ロック':'u5mHVUwDf_0','東京テディベア':'eSI7RsjZy1E','再教育':'xauTD6nRMio',
    'チュルリラ・チュルリラ・ダッダッダ！':'_j0kfGNwIlw','ブリキノダンス':'6EuR6FuOXXw','脳漿炸裂ガール':'Ey_NHZNYTeE','聖槍爆裂ボーイ':'MqNmKnCNLyM','夜咄ディセイブ':'aPDaFGqMX4I',
    'チルドレンレコード':'8xR6zghZM1c','アウターサイエンス':'HswIHVN5D4o','如月アテンション':'-y3BSoHOT9A','独りんぼエンヴィー':'PXZmn1nf-7Q','心做し':'3SkNrZnoK5w',
    '炉心融解':'dSw8CucthGc','右肩の蝶':'HhOK1-whpsc','悪ノ娘':'sV7ODBvxw38','悪ノ召使':'GC6YNb6ZLKg','深海少女':'2CwBFr-Eoxg',
    '1925':'QvGLt5CUBVo','ダブルラリアット':'hC8KrIY8qT4','Just Be Friends':'li1WjKl2boY'
  };

  // YouTubeに制作者本人の原曲投稿がない作品は、本人投稿または公式配信の画像を使う。
  var verifiedArtwork = {
    'メルト': { url: 'https://www.nicovideo.jp/watch/sm1715919', thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/1715919/1715919', source: 'ニコニコ動画・制作者本人投稿' },
    'ワールドイズマイン': { url: 'https://www.nicovideo.jp/watch/sm3504435', thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/3504435/3504435', source: 'ニコニコ動画・制作者本人投稿' },
    '初音ミクの消失': { url: 'https://www.nicovideo.jp/watch/sm1476648', thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/1476648/1476648', source: 'ニコニコ動画・制作者本人投稿' },
    'みくみくにしてあげる♪': { url: 'https://www.nicovideo.jp/watch/sm1097445', thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/1097445/1097445', source: 'ニコニコ動画・制作者本人投稿' },
    'ODDS&ENDS': { url: 'https://music.apple.com/jp/album/odds-ends-%E5%88%9D%E9%9F%B3%E3%83%9F%E3%82%AF-%E3%83%9E%E3%82%B8%E3%82%AB%E3%83%AB%E3%83%9F%E3%83%A9%E3%82%A4-2014-live-feat-%E5%88%9D%E9%9F%B3%E3%83%9F%E3%82%AF/969914420?i=969914590', thumb: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2f/89/69/2f8969f3-defc-aca7-debf-63b7f9d2a946/4511820-93366.jpg/600x600bb.jpg', source: 'Apple Music公式配信' },
    'ルカルカ★ナイトフィーバー': { url: 'https://www.nicovideo.jp/watch/sm6119955', thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/6119955/6119955', source: 'ニコニコ動画・制作者本人投稿' },
    'magnet': { url: 'https://www.nicovideo.jp/watch/sm6909505', thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/6909505/6909505', source: 'ニコニコ動画・制作者本人投稿' }
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
    var artwork = verifiedArtwork[parts[0]] || null;
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
        videoUrl: videoId ? 'https://www.youtube.com/watch?v=' + videoId : artwork ? artwork.url : null,
        thumbnailUrl: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : artwork ? artwork.thumb : null,
        thumbnailVerified: Boolean(videoId || artwork),
        mediaVerifiedAt: videoId || artwork ? '2026-10-17' : null,
        mediaSource: videoId ? 'YouTube公式投稿' : artwork ? artwork.source : null,
        metricNote: videoId || artwork ? '作品と投稿元を確認済み。再生数と対戦値の同期は準備中です。' : '公式画像は確認待ち。対戦値はテスト用バランス値です。'
      });
    });
  });

  var producers = producerNames.map(function (name, index) {
    var profile = producerProfiles[name];
    return { id: 'producer-' + String(index + 1).padStart(2, '0'), type: 'producer', name: name, rarity: rarityFor(index + 40), cost: 1 + index % 3, bonus: 500 + index % 4 * 500, text: '自分の楽曲を強化。制作楽曲が場にあると効果が2倍。', thumbnailUrl: profile.image, thumbnailVerified: true, profileUrl: profile.source, mediaSource: profile.label, mediaVerifiedAt: '2026-10-17' };
  });
  var singers = singerNames.map(function (name, index) {
    var profile = singerProfiles[name];
    return { id: 'singer-' + String(index + 1).padStart(2, '0'), type: 'singer', name: name, rarity: rarityFor(index + 70), cost: 1 + index % 3, boost: 500 + index % 5 * 500, profile: '楽曲に装備し、歌声の個性でパワーを加えるサポートカード。', thumbnailUrl: profile.image, thumbnailVerified: true, profileUrl: profile.source, mediaSource: profile.label, mediaVerifiedAt: '2026-10-17' };
  });

  var catalog = songs.concat(producers, singers);
  root.VocaluCatalog = { cards: catalog, songs: songs, producers: producers, singers: singers, counts: { songs: songs.length, producers: producers.length, singers: singers.length, total: catalog.length } };
}(typeof self !== 'undefined' ? self : this));
