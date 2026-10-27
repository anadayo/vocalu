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

  // 実在作品のみを収録する。画像は掲載元を確認できた作品だけ別途紐付ける。
  rawSongs = rawSongs.concat([
    'アンハッピーリフレイン|wowaka','グレーゾーンにて。|wowaka','とおせんぼ|wowaka','僕のサイノウ|wowaka','テノヒラ|wowaka',
    'Mrs.Pumpkinの滑稽な夢|ハチ','Persona Alice|ハチ','演劇テレプシコーラ|ハチ','恋人のランジェ|ハチ','clock lock works|ハチ',
    'ストリーミングハート|DECO*27','アンドロイドガール|DECO*27','シンデレラ|DECO*27','ラビットホール|DECO*27','サラマンダー|DECO*27',
    '妄想税|DECO*27','毒占欲|DECO*27','ハートアラモード|DECO*27','リバーシブル・キャンペーン|DECO*27','スクランブル交際|DECO*27',
    '東京駅|みきとP','小夜子|みきとP','ヨンジュウナナ|みきとP','僕は初音ミクとキスをした|みきとP','刹那プラス|みきとP',
    'ノンブレス・オブリージュ|ピノキオピー','ラヴィット|ピノキオピー','転生林檎|ピノキオピー','内臓ありますか|ピノキオピー','ぼくらはみんな意味不明|ピノキオピー',
    '頓珍漢の宴|ピノキオピー','アルティメットセンパイ|ピノキオピー','零号|ピノキオピー','おばけのウケねらい|ピノキオピー','余命2:30|ピノキオピー',
    'タイムマシン|40mP','少年と魔法のロボット|40mP','春に一番近い街|40mP','妄想スケッチ|40mP','純情スカート|40mP',
    'シリョクケンサ|40mP','キミボシ|40mP','巨大少女|40mP','ジェンガ|40mP','夢地図|40mP',
    'カミサマネジマキ|kemu','イカサマライフゲイム|kemu','リンカーネイション|kemu','拝啓ドッペルゲンガー|kemu','インタビュア|クワガタP',
    'MIRA|Kanaria','アイデンティティ|Kanaria','デーモンロード|Kanaria','レクイエム|Kanaria','百鬼祭|Kanaria',
    'ノマド|バルーン','パメラ|バルーン','ミザン|バルーン','愛及屋烏|バルーン','夕染|バルーン',
    'Henceforth|Orangestar','Surges|Orangestar','霽れを待つ|Orangestar','空奏列車|Orangestar','Alice in 冷凍庫|Orangestar',
    '雨き声残響|Orangestar','シンクロナイザー|Orangestar','未完成タイムリミッター|Orangestar','残灯花火|Orangestar','夏色アンサー|Orangestar',
    'テロル|Neru','イドラのサーカス|Neru','延命治療|Neru','命のユースティティア|Neru','ばいばい、ノスタルジーカ|Neru',
    'SNOBBISM|Neru','捨て子のステラ|Neru','病名は愛だった|Neru','脱獄|Neru','potatoになっていく|Neru',
    'ロケットサイダー|ナユタン星人','ストラトステラ|ナユタン星人','明星ギャラクティカ|ナユタン星人','アンドロメダアンドロメダ|ナユタン星人','金星のダンス|ナユタン星人',
    '群青レイン|じん','オツキミリサイタル|じん','サマータイムレコード|じん','ヘッドフォンアクター|じん','メカクシコード|じん',
    '想像フォレスト|じん','夕景イエスタデイ|じん','コノハの世界事情|じん','ロスタイムメモリー|じん','アヤノの幸福理論|じん',
    '厨病激発ボーイ|れるりり','一触即発☆禅ガール|れるりり','神のまにまに|れるりり','Mr.Music|れるりり','乱躁滅裂ガール|れるりり',
    'エンヴィキャットウォーク|トーマ','バビロン|トーマ','オレンジ|トーマ','九龍レトロ|トーマ','ヤンキーボーイ・ヤンキーガール|トーマ',
    '骸骨楽団とリリア|トーマ','魔法少女幸福論|トーマ','アザレアの亡霊|トーマ','幽霊屋敷の首吊り少女|トーマ','クジラ病棟の或る前夜|トーマ',
    'いかないで|想太','ウミユリ海底譚|n-buna','夜明けと蛍|n-buna','メリュー|n-buna','透明エレジー|n-buna',
    '始発とカフカ|n-buna','白ゆき|n-buna','花降らし|n-buna','ラプンツェル|n-buna','アイラ|n-buna',
    'ベノム|かいりきベア','ダーリンダンス|かいりきベア','失敗作少女|かいりきベア','アルカリレットウセイ|かいりきベア','アンヘル|かいりきベア',
    'バグ|かいりきベア','ルマ|かいりきベア','メンタルチェンソー|かいりきベア','マネマネサイコトロピック|かいりきベア','アイ情劣等生|かいりきベア',
    'フォニイ|ツミキ','トウキョウダイバアフェイクショウ|ツミキ','リコレクションエンドロウル|ツミキ','レゾンデイトル・カレイドスコウプ|ツミキ','ニビイロドロウレ|ツミキ',
    'マーシャル・マキシマイザー|柊マグネタイト','終焉逃避行|柊マグネタイト','旧約汎化街|柊マグネタイト','或世界消失|柊マグネタイト','リアライズ|柊マグネタイト'
  ]);

  var producerNames = ['ryo','DECO*27','wowaka','ハチ','みきとP','ピノキオピー','40mP','kemu','Kanaria','バルーン','Orangestar','カンザキイオリ','Neru','ナユタン星人','じん','れるりり','黒うさP','kz','cosMo@暴走P','sasakure.UK'];
  var singerNames = ['初音ミク','鏡音リン','鏡音レン','巡音ルカ','MEIKO','KAITO','GUMI','IA','flower','音街ウナ','可不','重音テト','歌愛ユキ','結月ゆかり','神威がくぽ','氷山キヨテル','猫村いろは','miki','VY1','VY2','Fukase','MAYU','蒼姫ラピス','kokone','東北ずん子','琴葉茜','琴葉葵','紲星あかり','星界','裏命','狐子','羽累','知声','ナクモ','めろう','ずんだもん','四国めたん','九州そら','双葉湊音','夏色花梨'];

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
    '1925':'QvGLt5CUBVo','ダブルラリアット':'hC8KrIY8qT4','Just Be Friends':'li1WjKl2boY','零号':'OSzvgljQ_3I'
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

  function rarityByQuota(index, quotas) {
    if (index < quotas[0]) return 'N';
    if (index < quotas[0] + quotas[1]) return 'R';
    if (index < quotas[0] + quotas[1] + quotas[2]) return 'SR';
    return 'UR';
  }
  function powerFor(index) { return 1000 + ((index * 7) % 19) * 500; }
  function songCost(power) { return Math.max(1, Math.min(10, Math.ceil(power / 1500))); }
  var triggerEffects = [
    { type:'destroy_one', label:'ステージブレイク', text:'相手の場で最もパワーが高い楽曲1枚を倒す。' },
    { type:'heal_one', label:'リカバリーライブ', text:'デッキの上から1枚をLIFEに置き、LIFEを1回復する。' },
    { type:'discard_one', label:'ノイズキャンセル', text:'相手は手札を1枚捨てる。' },
    { type:'bounce', label:'リテイク', text:'相手の場で最もパワーが高い楽曲1枚を手札へ戻す。' },
    { type:'stop_attacks', label:'ブレイクタイム', text:'相手の場の楽曲は、このターンこれ以上攻撃できない。' }
  ];
  function triggerFor(index, offset) {
    var triggerIndex = index + offset;
    return triggerIndex % 2 === 0 ? triggerEffects[Math.floor(triggerIndex / 2) % triggerEffects.length] : null;
  }
  var songAbilityPool = [
    { type:'draw_one', label:'アンコール・ドロー', text:'登場時、デッキからカードを1枚引く。' },
    { type:'ready_entry', label:'クイック・ライブ', text:'この楽曲はACTIVE状態で登場し、すぐ攻撃できる。' },
    { type:'encore_on_ko', label:'ダブルアンコール', text:'相手の楽曲を倒した時、1ターンに1回だけACTIVEに戻る。' }
  ];
  function abilitiesForSong(index, cost) {
    if (cost < 6) return [];
    var abilities = [songAbilityPool[index % songAbilityPool.length]];
    if (cost >= 7 && !abilities.some(function (ability) { return ability.type === 'ready_entry'; })) abilities.push(songAbilityPool[1]);
    return abilities;
  }
  function producerCost(index) {
    return index < 10 ? 1 : 2;
  }
  function abilitiesForProducer(index, cost) {
    if (cost === 1) return [{ type:'reveal_top_cost_song', maxCost:1, label:'ルーキー・サーチ', text:'デッキの上から1枚を公開する。1コストの楽曲なら手札に加え、それ以外はデッキの下へ送る。' }];
    var patterns = [
      [{ type:'draw_cards', count:2, label:'クリエイターズ・ドロー', text:'カードを2枚引く。' }],
      [{ type:'power_all', amount:1000, label:'フルミックス', text:'このターン、自分の楽曲すべてをPOWER +1000。' }],
      [{ type:'power_one', amount:2500, label:'スポットライト', text:'このターン、自分の楽曲1枚をPOWER +2500。' }],
      [
        { type:'draw_cards', count:1, label:'デモテープ', text:'カードを1枚引く。' },
        { type:'power_all', amount:500, label:'マスタリング', text:'このターン、自分の楽曲すべてをPOWER +500。' }
      ]
    ];
    return patterns[index % patterns.length];
  }

  var songs = [];
  rawSongs.forEach(function (line, index) {
    var parts = line.split('|');
    var basePower = powerFor(index);
    var cost = songCost(basePower);
    var videoId = verifiedVideos[parts[0]] || null;
    var artwork = verifiedArtwork[parts[0]] || null;
    var syncedMedia = root.VocaluSongMedia && root.VocaluSongMedia['song-' + String(index + 1).padStart(3, '0')] || null;
    songs.push({
        id: 'song-' + String(index + 1).padStart(3, '0'),
        type: 'song',
        name: parts[0],
        producer: parts[1],
        rarity: rarityByQuota(index, [100, 80, 45, 15]),
        power: basePower,
        cost: cost,
        abilities: abilitiesForSong(index, cost),
        viewCount: null,
        viewCountVerifiedAt: null,
        videoUrl: videoId ? 'https://www.youtube.com/watch?v=' + videoId : artwork ? artwork.url : syncedMedia ? syncedMedia.mediaUrl : null,
        thumbnailUrl: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : artwork ? artwork.thumb : syncedMedia ? syncedMedia.image : null,
        thumbnailVerified: Boolean(videoId || artwork || syncedMedia),
        mediaVerifiedAt: videoId || artwork ? '2026-10-17' : syncedMedia ? syncedMedia.verifiedAt : null,
        mediaSource: videoId ? 'YouTube公式投稿' : artwork ? artwork.source : syncedMedia ? syncedMedia.sourceLabel : null,
        metricNote: videoId || artwork || syncedMedia ? '作品と投稿元を確認済み。再生数と対戦値の同期は準備中です。' : '公式画像は確認待ち。対戦値はテスト用バランス値です。'
      });
  });

  var producers = producerNames.map(function (name, index) {
    var profile = producerProfiles[name];
    var cost = producerCost(index);
    var abilities = abilitiesForProducer(index, cost);
    return { id: 'producer-' + String(index + 1).padStart(2, '0'), type: 'producer', name: name, rarity: rarityByQuota(index, [4, 6, 6, 4]), cost: cost, abilities: abilities, text: '1ターンに1枚だけ使える使い切りサポート。' + abilities.map(function (ability) { return ability.text; }).join(' '), trigger: triggerFor(index, 0), thumbnailUrl: profile.image, thumbnailVerified: true, profileUrl: profile.source, mediaSource: profile.label, mediaVerifiedAt: '2026-10-17' };
  });
  var singers = singerNames.map(function (name, index) {
    var profile = singerProfiles[name];
    return { id: 'singer-' + String(index + 1).padStart(2, '0'), type: 'singer', name: name, rarity: rarityByQuota(index, [16, 12, 8, 4]), cost: 1 + index % 3, boost: 500 + index % 5 * 500, profile: '楽曲に装備し、歌声の個性でパワーを加えるサポートカード。', trigger: triggerFor(index, 2), thumbnailUrl: profile.image, thumbnailVerified: true, profileUrl: profile.source, mediaSource: profile.label, mediaVerifiedAt: '2026-10-17' };
  });

  var catalog = songs.concat(producers, singers);
  var legacyIdMap = songs.reduce(function (map, song, index) { map['song-' + String(index + 1).padStart(3, '0') + '-sp'] = song.id; return map; }, {});
  function migrateCollection(raw) {
    var migrated = {};
    Object.keys(raw || {}).forEach(function (oldId) {
      var newId = legacyIdMap[oldId] || oldId;
      if (catalog.some(function (card) { return card.id === newId; })) migrated[newId] = (migrated[newId] || 0) + Math.max(0, Number(raw[oldId]) || 0);
    });
    return migrated;
  }
  root.VocaluCatalog = { cards: catalog, songs: songs, producers: producers, singers: singers, legacyIdMap: legacyIdMap, migrateCollection: migrateCollection, counts: { songs: songs.length, producers: producers.length, singers: singers.length, total: catalog.length } };
}(typeof self !== 'undefined' ? self : this));
