# 声調チャレンジの学習記録設定

## 保存先と識別方法

ゲーム記録は Neon の PostgreSQL に保存します。Vercel Blob は既存の音声ファイル保存に使われていますが、学習履歴をプレイヤー・場次・回答で関連付けて調べる用途には PostgreSQL を使います。

初回アクセス時、API は 32 バイトのランダムな匿名トークンを発行し、`HttpOnly; SameSite=Strict` Cookie に保存します。DB にはトークンの SHA-256 ハッシュとランダムな `player_id` だけを保存します。`player_id` やトークンはブラウザー JavaScript に返しません。ニックネームは任意で、各ゲーム開始時に場次へ記録します。

遊玩次數は、API が新しい `session_id` を初めて DB に作成した時点で1回増やします。同じ `session_id` の開始再送は同じ場次を返し、回数を増やしません。ブラウザーを更新しただけでは API は新しい場次を作りません。回答は `(session_id, question_order)` を一意キーに保存し、重複送信時には最初の選択を返します。

## Neon と Vercel

1. Neon で PostgreSQL プロジェクトを作成するか、Vercel の Neon Integration で既存 Vercel プロジェクトに接続します。
2. Vercel の Project Settings → Environment Variables に `DATABASE_URL` を登録します。Neon の pooled connection string を使い、Production / Preview / Development の必要な環境を選びます。
3. 再デプロイします。既定では API の初回リクエストで `tonegame_players`、`tonegame_sessions`、`tonegame_answers` と索引を作成するため、接続ロールに DDL 権限が必要です。
4. 組織の運用で自動 DDL を許可しない場合は、Neon SQL Editor で `api/tonegame-schema.sql` を実行し、Vercel に `TONEGAME_AUTO_MIGRATE=false` を設定してください。その場合、API 実行ロールにはテーブルへの読み書き権限を与えます。

`DATABASE_URL` は必須のサーバー専用変数です。HTML、JavaScript、公開環境変数には設定しないでください。`TONEGAME_AUTO_MIGRATE` は任意で、既定は自動作成、有効なスキーマを別途作成した場合のみ `false` にします。LINE 用の環境変数や Webhook はこのゲームでは使いません。

## ローカル実行

1. Neon の開発用 DB を作成し、`DATABASE_URL` をルートの `.env.local` に設定します。`.env.local` は Git に追加しないでください。
2. Vercel CLI を使い、Repository のルートで `npx vercel dev` を実行します。既存 Vercel プロジェクトと連携していない場合は、先に `vercel link` を実行するか、ローカル `.env.local` から環境変数を読み込めるよう設定します。
3. `http://localhost:3000/tonegame_pc.html` を開きます。静的ページだけを HTTP サーバーで開くと `/api/tonegame-records` が動かないため、正式プレイの開始と記録照会には Vercel Functions を動かす必要があります。

## 記録を確認する

- ゲーム画面の「学習記録」で累計回数、レベル別回数、各ラウンドの正答率／得点／完了時刻、全回答の問題 ID・音檔 ID・正解・選択・正誤・作答時間・記録時刻を確認できます。
- Neon SQL Editor では `tonegame_players`, `tonegame_sessions`, `tonegame_answers` を参照してください。関連は `player_id` と `session_id`、逐題順序は `question_order` です。
- API の `GET /api/tonegame-records?action=history` は Cookie の匿名プレイヤーに紐づく記録だけを返します。DB 未設定時や接続失敗時は明示的にエラーを返し、成功したようには表示しません。

## デプロイ

静的ページ、音檔、`api/` Functions は既存 Repository の Vercel デプロイで一緒に公開されます。Project Root Directory は Repository のルートのままにしてください。遊戲 URL は `/tonegame_pc.html` です。既存 `api/webhook.js`、`api/tonegame.js` と主站 `ChaiGo.html` は変更していません。
