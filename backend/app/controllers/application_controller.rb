class ApplicationController < ActionController::API
  private

  def authenticate_user!
    return if current_user

    render json: {
      error_code: 'UNAUTHORIZED',
      message: 'ログインが必要です'
    }, status: :unauthorized
  end

  def current_user
    return @current_user if defined?(@current_user)

    token = bearer_token
    payload = token.present? ? AuthTokenService.decode(token) : nil
    @current_user = payload ? User.find_by(id: payload[:user_id]) : nil
  end

  def bearer_token
    request.headers['Authorization'].to_s.split(' ', 2).last
  end

  def render_api_error(error_code:, message:, status:)
    render json: { error_code: error_code, message: message }, status: status
  end
end
