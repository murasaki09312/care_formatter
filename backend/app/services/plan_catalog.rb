module PlanCatalog
  PLAN_DEFINITIONS = {
    basic: {
      name: 'basic',
      price_yen: 300,
      monthly_limit: 30,
      max_input_chars: 1000,
      model_name: 'gpt-4o-mini',
      stripe_price_id_env: 'STRIPE_PRICE_ID_BASIC'
    },
    standard: {
      name: 'standard',
      price_yen: 500,
      monthly_limit: 100,
      max_input_chars: 1000,
      model_name: 'gpt-4.1-mini',
      stripe_price_id_env: 'STRIPE_PRICE_ID_STANDARD'
    },
    pro: {
      name: 'pro',
      price_yen: 1000,
      monthly_limit: 500,
      max_input_chars: 3000,
      model_name: 'gpt-4.1-mini',
      stripe_price_id_env: 'STRIPE_PRICE_ID_PRO'
    }
  }.freeze

  module_function

  def fetch!(plan_name)
    plan = plan_name.to_s.presence&.to_sym || :basic
    PLAN_DEFINITIONS.fetch(plan)
  end

  def all
    PLAN_DEFINITIONS
  end

  def price_id_for!(plan_name)
    definition = fetch!(plan_name)
    price_id = ENV[definition[:stripe_price_id_env]].to_s
    raise KeyError, "missing #{definition[:stripe_price_id_env]}" if price_id.empty?

    price_id
  end

  def plan_for_price_id(price_id)
    return nil if price_id.to_s.empty?

    PLAN_DEFINITIONS.each do |plan_name, definition|
      return plan_name if ENV[definition[:stripe_price_id_env]].to_s == price_id.to_s
    end

    nil
  end
end
