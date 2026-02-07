module Api
  module V1
    class BillingController < ApplicationController
      before_action :authenticate_user!, except: :webhook

      def checkout_session
        target_plan = params[:plan].to_s

        begin
          plan = PlanCatalog.fetch!(target_plan)
          price_id = PlanCatalog.price_id_for!(target_plan)
        rescue KeyError => e
          return render_api_error(error_code: 'INVALID_PLAN', message: e.message, status: :unprocessable_entity)
        end

        customer_id = ensure_stripe_customer!(current_user)
        session = Stripe::Checkout::Session.create(
          mode: 'subscription',
          customer: customer_id,
          line_items: [{ price: price_id, quantity: 1 }],
          success_url: "#{frontend_base_url}/billing/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "#{frontend_base_url}/billing/cancel",
          metadata: {
            user_id: current_user.id,
            plan: plan[:name]
          },
          subscription_data: {
            metadata: {
              user_id: current_user.id,
              plan: plan[:name]
            }
          }
        )

        render json: { url: session.url }
      rescue Stripe::StripeError => e
        render_api_error(error_code: 'STRIPE_ERROR', message: e.message, status: :bad_gateway)
      end

      def me
        limiter = UsageLimiterService.new(user: current_user, text: '')
        render json: {
          plan: current_user.plan,
          subscription_status: current_user.subscription_status,
          stripe_customer_id: current_user.stripe_customer_id,
          stripe_subscription_id: current_user.stripe_subscription_id,
          limits: limiter.stats
        }
      end

      def webhook
        event = Stripe::Webhook.construct_event(
          request.raw_post,
          request.headers['Stripe-Signature'],
          ENV.fetch('STRIPE_WEBHOOK_SECRET')
        )

        case event.type
        when 'checkout.session.completed'
          handle_checkout_session_completed(event.data.object)
        when 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'
          handle_subscription_event(event.data.object)
        end

        render json: { received: true }
      rescue KeyError
        render_api_error(
          error_code: 'WEBHOOK_SECRET_MISSING',
          message: 'STRIPE_WEBHOOK_SECRET is missing',
          status: :internal_server_error
        )
      rescue JSON::ParserError, Stripe::SignatureVerificationError => e
        render_api_error(error_code: 'WEBHOOK_INVALID', message: e.message, status: :bad_request)
      end

      private

      def frontend_base_url
        ENV['FRONTEND_BASE_URL'].presence || 'http://localhost:3000'
      end

      def ensure_stripe_customer!(user)
        return user.stripe_customer_id if user.stripe_customer_id.present?

        customer = Stripe::Customer.create(email: user.email, metadata: { user_id: user.id })
        user.update!(stripe_customer_id: customer.id)
        customer.id
      end

      def handle_checkout_session_completed(session)
        user = find_user_from_checkout_session(session)
        return unless user

        subscription_id = session.subscription
        customer_id = session.customer

        user.update!(
          stripe_customer_id: customer_id,
          stripe_subscription_id: subscription_id,
          subscription_status: 'active'
        )
      end

      def handle_subscription_event(subscription)
        user = User.find_by(stripe_customer_id: subscription.customer)
        return unless user

        plan = extract_plan_from_subscription(subscription) || user.plan
        status = subscription.status.to_s

        user.update!(
          plan: plan,
          stripe_subscription_id: subscription.id,
          subscription_status: status
        )
      end

      def find_user_from_checkout_session(session)
        session_hash = stripe_object_to_hash(session)
        user_id = session_hash.dig('metadata', 'user_id')
        return User.find_by(id: user_id) if user_id.present?

        User.find_by(stripe_customer_id: session_hash['customer'])
      end

      def extract_plan_from_subscription(subscription)
        subscription_hash = stripe_object_to_hash(subscription)
        price_id = subscription_hash.dig('items', 'data', 0, 'price', 'id')
        PlanCatalog.plan_for_price_id(price_id)
      end

      def stripe_object_to_hash(object)
        object.respond_to?(:to_hash) ? object.to_hash : object
      end
    end
  end
end
