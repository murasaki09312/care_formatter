require 'net/http'
require 'json'

class LlmClient
  ENDPOINT = ENV.fetch('LLM_ENDPOINT', 'https://api.openai.com/v1/chat/completions').freeze
  DEFAULT_MODEL = ENV.fetch('LLM_MODEL', 'gpt-4o-mini').freeze

  def format(text:, mode:, tone:, system_prompt:, model_name:)
    return nil if api_key.to_s.strip.empty?

    request_body = {
      model: model_name.presence || model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: build_user_message(text: text, mode: mode, tone: tone) }
      ]
    }

    response = post_json(uri: URI.parse(ENDPOINT), body: request_body)
    return nil unless response.is_a?(Net::HTTPSuccess)

    parse_result(JSON.parse(response.body))
  rescue StandardError
    nil
  end

  private

  def model
    DEFAULT_MODEL
  end

  def api_key
    ENV['LLM_API_KEY']
  end

  def build_user_message(text:, mode:, tone:)
    <<~TEXT
      mode: #{mode}
      tone: #{tone}
      input:
      #{text}
    TEXT
  end

  def parse_result(payload)
    payload.dig('choices', 0, 'message', 'content').to_s.strip.presence
  end

  def post_json(uri:, body:)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.read_timeout = 15

    request = Net::HTTP::Post.new(uri.request_uri)
    request['Content-Type'] = 'application/json'
    request['Authorization'] = "Bearer #{api_key}"
    request.body = JSON.generate(body)

    http.request(request)
  end
end
