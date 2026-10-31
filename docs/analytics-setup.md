# VOCALU GA4 / Notion日次同期設定

## 現在の構成

- 公開URL: `https://anadayo.github.io/vocalu/`
- GA4測定ID: 既存の`G-1RKFX1HCCV`を継続利用
- Notion data source: `VOCALU｜運用・アクセス日次レポート`
- 同期時刻: 毎日03:20 JST。前日の実測値を同期
- 手動実行: GitHub Actionsの`VOCALU daily analytics sync`から日付を指定可能

## GitHub Actions Secrets

リポジトリの`Settings > Secrets and variables > Actions`へ次を登録します。

| Secret | 内容 |
| --- | --- |
| `GA4_PROPERTY_ID` | GA4管理画面に表示される数値のプロパティID。`G-`で始まる測定IDではありません。 |
| `GA4_SERVICE_ACCOUNT_JSON` | Google CloudサービスアカウントのJSON全文。改行を含むJSONまたはbase64化したJSONに対応。 |
| `NOTION_TOKEN` | Notion内部インテグレーションのトークン。 |
| `NOTION_DATABASE_ID` | data source ID `569e14d2-b05e-4ea8-921e-c844f1b66ec0`。 |

秘密情報を`index.html`、JavaScript、Actionsログへ貼り付けないでください。

## 管理画面側の設定

1. Google Analyticsの対象プロパティへサービスアカウントを「閲覧者」として追加する。
2. Google CloudでGoogle Analytics Data APIを有効にする。
3. Notionインテグレーションへ対象データベースを共有する。
4. 上記4つのSecretsを登録する。
5. Actionsを手動実行し、指定日が作成または更新されることを確認する。

## 同期仕様

- 同じ`日付`の行があれば更新し、なければ新規作成します。
- GA4取得成功後にイベント行が存在しない場合のみ、実測ゼロとして保存します。
- GA4取得自体が失敗した場合は数値列を送らず、`計測状態=取得不可`と原因を保存します。
- 平均プレイ時間秒は標準指標`userEngagementDuration / activeUsers`です。
- 個人情報、生のユーザーID、デッキ内容は送信しません。

## KPI定義

| KPI | 分子 / 定義 | 分母 |
| --- | --- | --- |
| DAU | 対象日の`activeUsers` | なし |
| WAU | 7日範囲の`activeUsers` | なし |
| MAU | 28日範囲の`activeUsers` | なし |
| 再訪率 | `newVsReturning=returning`のユーザー | `totalUsers` |
| パック開封率 | `pack_open`を起こしたユーザー | `activeUsers` |
| デッキ作成完了率 | `deck_build_complete`を起こしたユーザー | `pack_open`を起こしたユーザー |
| 対戦開始率 | `battle_start`を起こしたユーザー | `deck_build_complete`を起こしたユーザー |
| 対戦完了率 | `battle_complete`イベント数 | `battle_start`イベント数 |
| 平均対戦回数 | `battle_start`イベント数 | `activeUsers` |

日次Notion同期はイベント件数を保存します。イベントを起こしたユーザー数による率が必要な場合は、GA4探索または追加のData API集計を使います。
