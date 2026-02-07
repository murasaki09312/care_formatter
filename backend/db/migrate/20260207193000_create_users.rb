class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.integer :plan, null: false, default: 0
      t.string :stripe_customer_id
      t.string :stripe_subscription_id
      t.string :subscription_status, null: false, default: 'inactive'

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :stripe_customer_id, unique: true
    add_index :users, :stripe_subscription_id, unique: true
  end
end
