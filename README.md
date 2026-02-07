# 介護記録 整形/要約ツール

- Frontend: Next.js (`/Users/hyomaeda/program/codex/kaigo_handover/frontend`)
- Backend: Rails API (`/Users/hyomaeda/program/codex/kaigo_handover/backend`)

## クイックスタート
### 1) Backend起動
```bash
cd /Users/hyomaeda/program/codex/kaigo_handover/backend
bundle install
bundle exec rails db:migrate
bundle exec rails s -p 3001
```

### 2) Frontend起動
```bash
cd /Users/hyomaeda/program/codex/kaigo_handover/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

- Front: `http://localhost:3000`
- API: `http://localhost:3001`

## Backendの詳細
認証・Stripe課金・プラン制限の設定と検証手順は以下を参照:
- `/Users/hyomaeda/program/codex/kaigo_handover/backend/README.md`
