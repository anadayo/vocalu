# VOCALU バランスシミュレーション

- 実行日: 2026-10-31
- 各条件: 10,000試合
- 固定シード・同一AI強度・20枚デッキ・ライフ5

|条件|内容|先攻勝率|後攻勝率|平均決着ターン|3ターン以内|逆転勝利|停止|エラー|コスト使用率|サポート/試合|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|A|既存相当（後攻初回のみ+1・旧トリガー・中コスト効果なし）|48.2%|51.8%|9.61|0.0%|79.2%|36|0|84.7%|5.16|
|B|後攻1〜3ターン+1|50.6%|49.4%|9.51|0.0%|80.5%|33|0|84.6%|5.15|
|C|B＋新トリガー配分|50.7%|49.3%|9.57|0.0%|80.4%|40|0|84.6%|5.18|
|D|C＋中コスト登場時効果|54.5%|45.5%|9.60|0.0%|82.9%|40|0|85.1%|5.37|
|E|D＋ボカロP制作者シナジー|54.6%|45.4%|9.61|0.0%|82.9%|43|0|85.0%|5.37|

## トリガー発動数
- A: bounce 2598 / conditional_play 2847 / draw_one 5823 / heal_one 2544 / stop_attacks 8498 / destroy_one 2593 / discard_one 2492
- B: conditional_play 2851 / bounce 2607 / draw_one 5821 / stop_attacks 8533 / heal_one 2549 / destroy_one 2637 / discard_one 2501
- C: stop_attacks 5092 / conditional_play 2796 / heal_one 4647 / discard_one 2660 / destroy_one 2620 / draw_one 5702 / bounce 4507
- D: stop_attacks 5042 / conditional_play 2741 / heal_one 4607 / discard_one 2619 / destroy_one 2585 / draw_one 5635 / bounce 4507
- E: stop_attacks 5040 / conditional_play 2741 / heal_one 4603 / discard_one 2623 / destroy_one 2590 / draw_one 5631 / bounce 4502

## 注記
- 対人の最適プレイを保証するものではなく、同一AI条件で変更差を見る回帰シミュレーション。
- 勝率目標45〜55%から外れる条件は、本番採用前に追加調整する。
- エラーまたは30ターン停止が1件でも発生した場合は原因調査対象とする。
