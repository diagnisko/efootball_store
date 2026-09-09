-- Add an explicit mode while keeping existing purchases monthly by default.
CREATE TYPE "PaymentMode" AS ENUM ('MONTHLY', 'ONE_TIME');

ALTER TABLE "PaymentPlan" ADD COLUMN "paymentMode" "PaymentMode" NOT NULL DEFAULT 'MONTHLY';