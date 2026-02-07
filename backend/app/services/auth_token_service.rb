class AuthTokenService
  ALGORITHM = 'HS256'.freeze
  EXPIRES_IN = 30.days

  class << self
    def issue_for(user)
      payload = {
        user_id: user.id,
        exp: EXPIRES_IN.from_now.to_i
      }

      JWT.encode(payload, secret_key, ALGORITHM)
    end

    def decode(token)
      decoded, = JWT.decode(token, secret_key, true, { algorithm: ALGORITHM })
      decoded.with_indifferent_access
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end

    private

    def secret_key
      ENV['JWT_SECRET_KEY'].presence || Rails.application.secret_key_base
    end
  end
end
