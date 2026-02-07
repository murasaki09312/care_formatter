class CreateUsageRecords < ActiveRecord::Migration[7.1]
  def change
    create_table :usage_records do |t|
      t.references :user, null: false, foreign_key: true
      t.string :mode, null: false
      t.integer :input_chars, null: false, default: 0
      t.boolean :success, null: false, default: false

      t.timestamps
    end

    add_index :usage_records, [:user_id, :created_at]
    add_index :usage_records, [:user_id, :success, :created_at]
  end
end
