class User < ApplicationRecord
  has_secure_password

  has_many :usage_records, dependent: :destroy

  enum plan: { basic: 0, standard: 1, pro: 2 }, _default: :basic

  validates :email, presence: true, uniqueness: true
end
