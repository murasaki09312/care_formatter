class UsageRecord < ApplicationRecord
  belongs_to :user

  validates :mode, presence: true
  validates :input_chars, numericality: { greater_than_or_equal_to: 0 }

  scope :success_only, -> { where(success: true) }
  scope :in_month, lambda { |time|
    where(created_at: time.beginning_of_month..time.end_of_month)
  }
end
