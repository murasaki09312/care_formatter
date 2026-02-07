module Api
  module V1
    class FormatsController < ApplicationController
      def create
        result = FormatTextService.call(
          text: params[:text],
          mode: params[:mode],
          tone: params[:tone]
        )

        render json: {
          result: result[:result],
          meta: {
            mode: result[:mode],
            tone: result[:tone],
            category_order: result[:category_order],
            used_llm: result[:used_llm]
          }
        }
      rescue FormatTextService::ValidationError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
