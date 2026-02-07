require 'rails_helper'

RSpec.describe 'POST /api/v1/format', type: :request do
  describe '正常系' do
    it 'ダミー整形結果を返す' do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('LLM_API_KEY').and_return(nil)

      post '/api/v1/format', params: {
        text: '9時10分に体温36.5、昼食は8割摂取。',
        mode: 'handover',
        tone: 'objective'
      }, as: :json

      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['result']).to be_a(String)
      expect(json['result']).to include('【バイタル】')
      expect(json['meta']).to include(
        'mode' => 'handover',
        'tone' => 'objective',
        'used_llm' => false
      )
      expect(json['meta']['category_order']).to eq(%w[
        vitals meal hydration toilet activity sleep medication skin notes
      ])
    end
  end

  describe 'バリデーション' do
    it 'textが空の場合は422を返す' do
      post '/api/v1/format', params: {
        text: '',
        mode: 'summary',
        tone: 'warm'
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json['error']).to eq('text is required')
    end
  end
end
