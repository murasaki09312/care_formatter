# Backend API (Rails)

介護記録整形APIに、認証・Stripeサブスク・プラン制限（回数/文字数）を追加したMVPです。

## 実装済み機能
- Bearerトークン認証（email + password）
- プラン3種
  - `basic`: 300円 / `gpt-4o-mini` / 月30回 / 1回1000文字
  - `standard`: 500円 / `gpt-4.1-mini` / 月100回 / 1回1000文字
  - `pro`: 1000円 / `gpt-4.1-mini` / 月500回 / 1回3000文字
- `POST /api/v1/format` で制限チェック
  - 文字数超過: `413 { error_code: "TEXT_TOO_LONG", message }`
  - 月間回数超過: `429 { error_code: "MONTHLY_LIMIT_EXCEEDED", message }`
  - 未ログイン: `401 { error_code: "UNAUTHORIZED", message }`
- 成功した生成のみ使用回数を加算（`UsageRecord.success = true`）
- 当月利用数は `created_at` の月で集計（バッチ不要）
- Stripe Checkout（テストモード）
- Stripe Webhookで購読状態同期

## 必要な環境変数
```bash
# 既存
export LLM_API_KEY="..."

# 認証JWT
export JWT_SECRET_KEY="change-me-in-dev"

# Stripe
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export STRIPE_PRICE_ID_BASIC="price_..."
export STRIPE_PRICE_ID_STANDARD="price_..."
export STRIPE_PRICE_ID_PRO="price_..."

# Front URL（Checkout戻り先）
export FRONTEND_BASE_URL="http://localhost:3000"
```

## ローカル起動
```bash
cd /Users/hyomaeda/program/codex/kaigo_handover/backend
bundle install
bundle exec rails db:migrate
bundle exec rails s -p 3001
```

## 認証API
### サインアップ
```bash
curl -X POST http://localhost:3001/api/v1/auth/sign_up \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","password_confirmation":"password"}'
```

### サインイン（トークン取得）
```bash
curl -X POST http://localhost:3001/api/v1/auth/sign_in \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 自分の情報
```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

## 生成API（認証付き）
```bash
curl -X POST http://localhost:3001/api/v1/format \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"text":"9時10分に体温36.5。昼食は8割摂取。","mode":"handover","tone":"objective"}'
```

レスポンス `meta` には以下を返します。
- `plan`
- `monthly_used`
- `monthly_limit`
- `remaining`
- `max_input_chars`
- `model_name`

## Stripe API
### Checkout Session作成
```bash
curl -X POST http://localhost:3001/api/v1/billing/checkout_session \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"plan":"standard"}'
```

### 現在の課金状態
```bash
curl http://localhost:3001/api/v1/billing/me \
  -H "Authorization: Bearer <TOKEN>"
```

## Webhookローカル検証（Stripe CLI）
1. Stripe CLIでログイン
```bash
stripe login
```

2. Webhook転送開始
```bash
stripe listen --forward-to localhost:3001/api/v1/billing/webhook
```

3. 出力された `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定

4. テストイベント送信
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

## 追加された主要エンドポイント
- `POST /api/v1/auth/sign_up`
- `POST /api/v1/auth/sign_in`
- `GET  /api/v1/auth/me`
- `POST /api/v1/format`（認証必須）
- `POST /api/v1/billing/checkout_session`
- `POST /api/v1/billing/webhook`
- `GET  /api/v1/billing/me`
