# VOCALU 収益化準備監査

更新日: 2026-11-01

## 現時点の判断

- 広告コードはまだ有効化しない。
- ロビー、対戦終了後、パック開封結果は自然な区切りだが、対戦中には配置しない。
- GoogleのH5 Games Adsは申請制で、承認済みAdSenseアカウントとパートナー適格性が必要。
- 報酬広告はH5 Games Ad Placement APIの利用承認とポリシー確認後に別フェーズで実装する。
- 楽曲名、公式MVサムネイル、アーティスト関連素材を伴うため、広告表示前に各素材の商用利用可否を権利者・配布規約単位で確認する。

## 実装済みの審査準備

- プライバシーポリシー
- 利用規約
- お問い合わせページ
- GA4の取得内容とlocalStorage利用の明示
- 広告未導入であることの明示

## 広告枠候補

1. 対戦結果画面の操作ボタンより下
2. ロビーのランキングより下
3. 5パック開封完了後、デッキ構築へ進む前
4. 任意視聴型はゲーム内報酬設計とH5 Games Ads承認後

## 公開前に必要な管理者判断

- AdSense/H5 Games Adsへ申請するか
- 商用利用可能と確認できた素材だけに限定するか、独自素材へ置換するか
- 広告同意管理プラットフォームを導入する対象地域
- 報酬広告で付与する内容と、無課金プレイへの影響

## 公式資料

- H5 Games Ads申請: https://support.google.com/adsense/answer/1705831
- H5 Games Ads概要: https://support.google.com/adsense/answer/9959170
- H5広告コード: https://support.google.com/adsense/answer/9955214
- GA4 Data API指標: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
