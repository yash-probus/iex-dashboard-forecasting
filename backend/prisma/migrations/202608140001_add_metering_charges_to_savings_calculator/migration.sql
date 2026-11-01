ALTER TABLE "public"."savings_calculator_entries"
ADD COLUMN IF NOT EXISTS "metering_charges" DECIMAL(12,4);

ALTER TABLE "public"."savings_calculator_entry_histories"
ADD COLUMN IF NOT EXISTS "metering_charges" DECIMAL(12,4);
