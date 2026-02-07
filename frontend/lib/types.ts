export type Mode = 'handover' | 'summary' | 'family';
export type Tone = 'objective' | 'warm';

export type LimitStats = {
  plan: 'basic' | 'standard' | 'pro';
  monthly_used: number;
  monthly_limit: number;
  remaining: number;
  max_input_chars: number;
  model_name: string;
};

export type AuthResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    plan: 'basic' | 'standard' | 'pro';
    subscription_status: string;
  };
};

export type BillingMeResponse = {
  plan: 'basic' | 'standard' | 'pro';
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  limits: LimitStats;
};

export type FormatResponse = {
  result: string;
  meta: {
    mode: Mode;
    tone: Tone;
    category_order: string[];
    used_llm: boolean;
    plan: 'basic' | 'standard' | 'pro';
    monthly_used: number;
    monthly_limit: number;
    remaining: number;
    max_input_chars: number;
    model_name: string;
  };
};
