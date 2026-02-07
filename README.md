# 介護記録 整形/要約 API (Rails API mode)

Rails(APIモード)で、介護記録フリーテキストを `handover / summary / family` 形式に整形するAPIです。

- Endpoint: `POST /api/v1/format`
- Response: `JSON { result, meta }`
- `LLM_API_KEY` が未設定でもダミー出力で必ず動作
- CORSで `http://localhost:3000` (Next.js) からの呼び出しを許可

## 動作要件

- Ruby
- Rails(API mode)
- Bundler

## セットアップ

```bash
bundle install
```

`Gemfile` に `rack-cors` と `rspec-rails` が未追加の場合は追加してください。

```ruby
gem 'rack-cors'
gem 'rspec-rails', group: [:development, :test]
```

RSpec初期化(未実施の場合):

```bash
bundle exec rails generate rspec:install
```

## 起動

```bash
bundle exec rails s -p 3001
```

## API仕様

### POST `/api/v1/format`

Request JSON:

```json
{
  "text": "9時10分に体温36.5、昼食は8割摂取。",
  "mode": "handover",
  "tone": "objective"
}
```

- `text`: required, 1文字以上
- `mode`: required, `handover | summary | family`
- `tone`: required, `objective | warm`

Response JSON:

```json
{
  "result": "09:10 【バイタル】体温36.5℃、血圧128/74、脈拍72で安定。\n...",
  "meta": {
    "mode": "handover",
    "tone": "objective",
    "category_order": ["vitals", "meal", "hydration", "toilet", "activity", "sleep", "medication", "skin", "notes"],
    "used_llm": false
  }
}
```

Validation Error (422):

```json
{ "error": "text is required" }
```

## curl例

### ダミー出力で疎通確認(キーなし)

```bash
curl -X POST http://localhost:3001/api/v1/format \
  -H "Content-Type: application/json" \
  -d '{"text":"9時10分に体温36.5、昼食は8割摂取。","mode":"handover","tone":"objective"}'
```

### LLM利用(キーあり)

```bash
export LLM_API_KEY="your_api_key"
export LLM_ENDPOINT="https://your-llm-endpoint.example/v1/format"

curl -X POST http://localhost:3001/api/v1/format \
  -H "Content-Type: application/json" \
  -d '{"text":"本日の記録...","mode":"summary","tone":"warm"}'
```

## テスト

```bash
bundle exec rspec spec/requests/api/v1/format_spec.rb
```

- 正常系: ダミー整形結果が返る
- 異常系: `text` 空で 422

## 実装ポイント

- Controllerは薄く維持: `Api::V1::FormatsController#create`
- ロジックは `FormatTextService` に集約
- `LlmClient` は `LLM_API_KEY` が無い場合 `nil` を返し、Service側でダミー出力にフォールバック
- カテゴリ順は固定:
  - バイタル
  - 食事
  - 水分
  - 排泄
  - 活動/リハ
  - 睡眠
  - 服薬
  - 皮膚/創
  - 特記事項

## 今後の拡張案

- 整形履歴の保存/再利用
- 利用者別テンプレートと辞書(よく使う表現)
- 施設ごとの申し送りフォーマット切替
- 監査ログ/アクセス制御
- 禁止語チェックや個人情報マスキング

## フロントエンド (Next.js + Tailwind)

`/Users/hyomaeda/program/codex/kaigo_handover/frontend` に1ページUIを実装しています。

- 入力(text/mode/tone) -> Rails APIへPOST
- 結果表示 (`pre`)
- コピー機能 + トースト表示
- ローディング・エラー表示
- `meta.used_llm` 表示
- PCは2カラム、モバイルは1カラム

### フロント起動

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

`.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

アクセス先:

- Front: `http://localhost:3000`
- API: `http://localhost:3001`
