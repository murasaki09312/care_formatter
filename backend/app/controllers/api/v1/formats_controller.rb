module Api
  module V1
    class FormatsController < ApplicationController
      before_action :authenticate_user!

      def create
        limiter = UsageLimiterService.new(user: current_user, text: params[:text])
        limit_stats = limiter.check!

        result = FormatTextService.call(
          text: params[:text],
          mode: params[:mode],
          tone: params[:tone],
          model_name: limit_stats[:model_name]
        )

        limiter.record_success!(mode: params[:mode])
        latest_stats = UsageLimiterService.new(user: current_user, text: params[:text]).stats

        render json: {
          result: result[:result],
          meta: {
            mode: result[:mode],
            tone: result[:tone],
            category_order: result[:category_order],
            used_llm: result[:used_llm],
            plan: latest_stats[:plan],
            monthly_used: latest_stats[:monthly_used],
            monthly_limit: latest_stats[:monthly_limit],
            remaining: latest_stats[:remaining],
            max_input_chars: latest_stats[:max_input_chars],
            model_name: latest_stats[:model_name]
          }
        }
      rescue UsageLimiterService::LimitError => e
        render_api_error(error_code: e.error_code, message: e.message, status: e.http_status)
      rescue FormatTextService::ValidationError => e
        limiter&.record_failure!(mode: params[:mode].to_s.presence || 'unknown')
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
