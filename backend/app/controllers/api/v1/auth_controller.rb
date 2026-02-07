module Api
  module V1
    class AuthController < ApplicationController
      before_action :authenticate_user!, only: :me

      def sign_up
        user = User.new(sign_up_params)

        if user.save
          token = AuthTokenService.issue_for(user)
          render json: auth_payload(user, token), status: :created
        else
          render_api_error(
            error_code: 'VALIDATION_ERROR',
            message: user.errors.full_messages.join(', '),
            status: :unprocessable_entity
          )
        end
      end

      def sign_in
        user = User.find_by(email: params[:email].to_s.downcase)

        unless user&.authenticate(params[:password].to_s)
          return render_api_error(
            error_code: 'INVALID_CREDENTIALS',
            message: 'メールアドレスまたはパスワードが不正です',
            status: :unauthorized
          )
        end

        token = AuthTokenService.issue_for(user)
        render json: auth_payload(user, token)
      end

      def me
        limiter = UsageLimiterService.new(user: current_user, text: '')

        render json: {
          user: user_payload(current_user),
          limits: limiter.stats
        }
      end

      private

      def sign_up_params
        {
          email: params[:email].to_s.downcase,
          password: params[:password],
          password_confirmation: params[:password_confirmation]
        }
      end

      def auth_payload(user, token)
        {
          token: token,
          user: user_payload(user)
        }
      end

      def user_payload(user)
        {
          id: user.id,
          email: user.email,
          plan: user.plan,
          subscription_status: user.subscription_status
        }
      end
    end
  end
end
