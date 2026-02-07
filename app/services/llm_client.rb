require 'net/http'
require 'json'

class LlmClient
  ENDPOINT = ENV.fetch('LLM_ENDPOINT', 'https://example.com/v1/format').freeze

  def format(text:, mode:, tone:)
    return nil if api_key.to_s.strip.empty?

    request_body = {
      text: text,
      mode: mode,
      tone: tone,
      instruction: 'Care record formatter'
    }

    response = post_json(uri: URI.parse(ENDPOINT), body: request_body)
    parsed = JSON.parse(response.body)
    parsed['result'].presence
  rescue StandardError
    nil
  end

  private

  def api_key
    ENV['LLM_API_KEY']
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
