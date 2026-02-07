# Backend (Rails API)

## 目的
`POST /api/v1/format` で介護記録テキストを整形します。

- `LLM_API_KEY` あり: AI整形 (`used_llm: true`)
- `LLM_API_KEY` なし: ダミー整形 (`used_llm: false`)

## 起動
```bash
cd /Users/hyomaeda/program/codex/kaigo_handover/backend
bundle install
bundle exec rails s -p 3001
```

## 環境変数
```bash
export LLM_API_KEY="your_api_key"
# 任意
export LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
export LLM_MODEL="gpt-4o-mini"
```

`LLM_API_KEY` 未設定時もAPIは動作します（ダミー出力）。

## API
### POST `/api/v1/format`
Request:
```json
{
  "text": "9時10分に体温36.5、昼食は8割摂取。",
  "mode": "handover",
  "tone": "objective"
}
```

Response:
```json
{
  "result": "09:10 【バイタル】体温36.5℃、血圧128/74、脈拍72で安定。",
  "meta": {
    "mode": "handover",
    "tone": "objective",
    "category_order": ["vitals","meal","hydration","toilet","activity","sleep","medication","skin","notes"],
    "used_llm": true
  }
}
```
