-- =============================================
-- PAYMENT SERVICE DATABASE
-- Context: Addis Ababa, Ethiopia (Currency: ETB)
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment transactions
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN (
        'CASH_ON_DELIVERY',
        'MOBILE_MONEY',
        'BANK_TRANSFER'
    )),
    payment_gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    gateway_reference VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency_code CHAR(3) DEFAULT 'ETB',
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'PENDING',
        'PROCESSING',
        'AUTHORIZED',
        'CAPTURED',
        'SETTLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
        'FAILED',
        'CANCELLED'
    )),
    captured_amount DECIMAL(15,2) DEFAULT 0,
    refunded_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ
);

-- Payment fee breakdown
CREATE TABLE payment_fees (
    fee_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN (
        'BASE_FEE',
        'DISTANCE_FEE',
        'VEHICLE_MULTIPLIER',
        'PRIORITY_FEE',
        'SURGE_FEE',
        'WEIGHT_FEE',
        'VOLUME_FEE',
        'INSURANCE_FEE',
        'PAYMENT_PROCESSING_FEE',
        'TAX',
        'DISCOUNT'
    )),
    description VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    calculation_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery fee calculation cache
CREATE TABLE delivery_fee_calculations (
    calculation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    base_fee DECIMAL(15,2) NOT NULL,
    distance_km DECIMAL(6,2),
    distance_fee DECIMAL(15,2),
    vehicle_type VARCHAR(20),
    vehicle_multiplier DECIMAL(5,2) DEFAULT 1.0,
    priority_level VARCHAR(20),
    priority_multiplier DECIMAL(5,2) DEFAULT 1.0,
    surge_multiplier DECIMAL(5,2) DEFAULT 1.0,
    weight_kg DECIMAL(6,2),
    weight_surcharge DECIMAL(15,2),
    subtotal DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2) NOT NULL,
    calculation_parameters JSONB NOT NULL,
    is_applied BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
    refund_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    refund_reason VARCHAR(100) NOT NULL,
    refund_amount DECIMAL(15,2) NOT NULL CHECK (refund_amount > 0),
    status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED')),
    gateway_refund_id VARCHAR(255),
    processed_by UUID,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- COURIER SETTLEMENTS: Payouts to couriers
CREATE TABLE courier_settlements (
    settlement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    courier_id UUID NOT NULL,
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,
    total_orders INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2),
    deductions DECIMAL(15,2),
    net_amount DECIMAL(15,2) NOT NULL,
    currency_code CHAR(3) DEFAULT 'ETB',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED')),
    payment_method VARCHAR(30),
    transaction_reference VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settlement_details (
    detail_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES courier_settlements(settlement_id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    order_amount DECIMAL(15,2) NOT NULL,
    commission_percentage DECIMAL(5,2),
    commission_amount DECIMAL(15,2),
    bonus_amount DECIMAL(15,2),
    penalty_amount DECIMAL(15,2),
    net_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER WALLETS: Prepaid balance system
CREATE TABLE customer_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID UNIQUE NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0 CHECK (balance >= 0),
    currency_code CHAR(3) DEFAULT 'ETB',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES customer_wallets(wallet_id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(payment_id) ON DELETE SET NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'ADJUSTMENT')),
    amount DECIMAL(15,2) NOT NULL,
    running_balance DECIMAL(15,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment gateway logs
CREATE TABLE gateway_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(payment_id) ON DELETE SET NULL,
    gateway_name VARCHAR(50) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    request_body TEXT,
    response_body TEXT,
    response_code INTEGER,
    response_time_ms INTEGER,
    is_successful BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES - Payment Service
-- =============================================

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer_status ON payments(customer_id, status, created_at);
CREATE INDEX idx_payments_status_date ON payments(status, created_at);
CREATE INDEX idx_courier_settlements_courier ON courier_settlements(courier_id, settlement_period_end);
CREATE INDEX idx_customer_wallets_customer ON customer_wallets(customer_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at);
CREATE INDEX idx_gateway_logs_payment ON gateway_logs(payment_id, created_at);
CREATE INDEX idx_delivery_fee_calculations_order ON delivery_fee_calculations(order_id, expires_at);
CREATE INDEX idx_payment_fees_payment ON payment_fees(payment_id);