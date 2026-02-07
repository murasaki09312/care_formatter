class UsageLimiterService
  class LimitError < StandardError
    attr_reader :error_code, :http_status

    def initialize(error_code:, message:, http_status:)
      @error_code = error_code
      @http_status = http_status
      super(message)
    end
  end

  class TextTooLongError < LimitError
    def initialize(max_input_chars:)
      super(
        error_code: 'TEXT_TOO_LONG',
        message: "入力文字数が上限を超えています（最大#{max_input_chars}文字）",
        http_status: :payload_too_large
      )
    end
  end

  class MonthlyLimitExceededError < LimitError
    def initialize(monthly_limit:)
      super(
        error_code: 'MONTHLY_LIMIT_EXCEEDED',
        message: "月間利用上限（#{monthly_limit}回）に達しました",
        http_status: :too_many_requests
      )
    end
  end

  def initialize(user:, text:)
    @user = user
    @text = text.to_s
  end

  def check!
    raise TextTooLongError.new(max_input_chars: plan[:max_input_chars]) if input_chars > plan[:max_input_chars]
    raise MonthlyLimitExceededError.new(monthly_limit: plan[:monthly_limit]) if monthly_used >= plan[:monthly_limit]

    stats
  end

  def record_success!(mode:)
    user.usage_records.create!(
      mode: mode,
      input_chars: input_chars,
      success: true
    )
  end

  def record_failure!(mode:)
    user.usage_records.create!(
      mode: mode,
      input_chars: input_chars,
      success: false
    )
  end

  def stats
    {
      plan: plan[:name],
      monthly_used: monthly_used,
      monthly_limit: plan[:monthly_limit],
      remaining: [plan[:monthly_limit] - monthly_used, 0].max,
      max_input_chars: plan[:max_input_chars],
      model_name: plan[:model_name]
    }
  end

  private

  attr_reader :user, :text

  def plan
    @plan ||= PlanCatalog.fetch!(user.plan)
  end

  def input_chars
    @input_chars ||= text.length
  end

  def monthly_used
    @monthly_used ||= user.usage_records
                         .success_only
                         .in_month(Time.current)
                         .count
  end
end
