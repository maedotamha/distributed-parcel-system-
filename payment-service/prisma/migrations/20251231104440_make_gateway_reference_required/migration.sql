-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'MOBILE_MONEY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('BASE_FEE', 'DISTANCE_FEE', 'VEHICLE_MULTIPLIER', 'PRIORITY_FEE', 'SURGE_FEE', 'WEIGHT_FEE', 'VOLUME_FEE', 'INSURANCE_FEE', 'PAYMENT_PROCESSING_FEE', 'TAX', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "Payment" (
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_gateway" VARCHAR(50),
    "gateway_transaction_id" VARCHAR(255),
    "gateway_reference" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'ETB',
    "status" "PaymentStatus" NOT NULL,
    "captured_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "refunded_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "authorized_at" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "PaymentFee" (
    "fee_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "fee_type" "FeeType" NOT NULL,
    "description" VARCHAR(255),
    "amount" DECIMAL(15,2) NOT NULL,
    "calculation_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentFee_pkey" PRIMARY KEY ("fee_id")
);

-- CreateTable
CREATE TABLE "DeliveryFeeCalculation" (
    "calculation_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "base_fee" DECIMAL(15,2) NOT NULL,
    "distance_km" DECIMAL(6,2),
    "distance_fee" DECIMAL(15,2),
    "vehicle_type" VARCHAR(20),
    "vehicle_multiplier" DECIMAL(5,2) DEFAULT 1.0,
    "priority_level" VARCHAR(20),
    "priority_multiplier" DECIMAL(5,2) DEFAULT 1.0,
    "surge_multiplier" DECIMAL(5,2) DEFAULT 1.0,
    "weight_kg" DECIMAL(6,2),
    "weight_surcharge" DECIMAL(15,2),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2),
    "tax_amount" DECIMAL(15,2),
    "total_amount" DECIMAL(15,2) NOT NULL,
    "calculation_parameters" JSONB NOT NULL,
    "is_applied" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryFeeCalculation_pkey" PRIMARY KEY ("calculation_id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "refund_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "refund_reason" VARCHAR(100) NOT NULL,
    "refund_amount" DECIMAL(15,2) NOT NULL,
    "status" "RefundStatus" NOT NULL,
    "gateway_refund_id" VARCHAR(255),
    "processed_by" UUID,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("refund_id")
);

-- CreateTable
CREATE TABLE "CourierSettlement" (
    "settlement_id" UUID NOT NULL,
    "courier_id" UUID NOT NULL,
    "settlement_period_start" DATE NOT NULL,
    "settlement_period_end" DATE NOT NULL,
    "total_orders" INTEGER NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "commission_amount" DECIMAL(15,2),
    "deductions" DECIMAL(15,2),
    "net_amount" DECIMAL(15,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'ETB',
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" VARCHAR(30),
    "transaction_reference" VARCHAR(255),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierSettlement_pkey" PRIMARY KEY ("settlement_id")
);

-- CreateTable
CREATE TABLE "SettlementDetail" (
    "detail_id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_amount" DECIMAL(15,2) NOT NULL,
    "commission_percentage" DECIMAL(5,2),
    "commission_amount" DECIMAL(15,2),
    "bonus_amount" DECIMAL(15,2),
    "penalty_amount" DECIMAL(15,2),
    "net_amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementDetail_pkey" PRIMARY KEY ("detail_id")
);

-- CreateTable
CREATE TABLE "CustomerWallet" (
    "wallet_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'ETB',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerWallet_pkey" PRIMARY KEY ("wallet_id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "transaction_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "payment_id" UUID,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "running_balance" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "reference_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "GatewayLog" (
    "log_id" UUID NOT NULL,
    "payment_id" UUID,
    "gateway_name" VARCHAR(50) NOT NULL,
    "request_type" VARCHAR(50) NOT NULL,
    "request_body" TEXT,
    "response_body" TEXT,
    "response_code" INTEGER,
    "response_time_ms" INTEGER,
    "is_successful" BOOLEAN,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gateway_reference_key" ON "Payment"("gateway_reference");

-- CreateIndex
CREATE INDEX "idx_payments_order" ON "Payment"("order_id");

-- CreateIndex
CREATE INDEX "idx_payments_customer_status" ON "Payment"("customer_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_payments_status_date" ON "Payment"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_payment_fees_payment" ON "PaymentFee"("payment_id");

-- CreateIndex
CREATE INDEX "idx_delivery_fee_calculations_order" ON "DeliveryFeeCalculation"("order_id", "expires_at");

-- CreateIndex
CREATE INDEX "idx_courier_settlements_courier" ON "CourierSettlement"("courier_id", "settlement_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerWallet_customer_id_key" ON "CustomerWallet"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_wallets_customer" ON "CustomerWallet"("customer_id");

-- CreateIndex
CREATE INDEX "idx_wallet_transactions_wallet" ON "WalletTransaction"("wallet_id", "created_at");

-- AddForeignKey
ALTER TABLE "PaymentFee" ADD CONSTRAINT "PaymentFee_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("payment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("payment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementDetail" ADD CONSTRAINT "SettlementDetail_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "CourierSettlement"("settlement_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "CustomerWallet"("wallet_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("payment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayLog" ADD CONSTRAINT "GatewayLog_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("payment_id") ON DELETE SET NULL ON UPDATE CASCADE;
