Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/sign_up", to: "auth#sign_up"
      post "auth/sign_in", to: "auth#sign_in"
      get "auth/me", to: "auth#me"

      post :format, to: "formats#create"

      post "billing/checkout_session", to: "billing#checkout_session"
      post "billing/webhook", to: "billing#webhook"
      get "billing/me", to: "billing#me"
    end
  end
end
