-- =============================================
-- ORDER MANAGEMENT SERVICE DATABASE
-- Context: Addis Ababa, Ethiopia
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main orders table
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL,
    courier_id UUID,
    vehicle_id UUID,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'CONFIRMED',
        'ASSIGNED_TO_COURIER',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED',
        'CANCELLED',
        'RETURNED'
    )),
    priority VARCHAR(20) DEFAULT 'STANDARD' CHECK (priority IN ('STANDARD', 'EXPRESS', 'SAME_DAY')),
    service_type VARCHAR(30) CHECK (service_type IN ('DOOR_TO_DOOR', 'PICKUP_STATION', 'LOCKER')),
    estimated_delivery_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_pickup_time TIMESTAMPTZ,
    scheduled_delivery_time TIMESTAMPTZ,
    notes TEXT
);

-- Order addresses
CREATE TABLE order_addresses (
    address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('PICKUP', 'DELIVERY', 'RETURN')),
    contact_name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(15) NOT NULL,
    contact_email VARCHAR(255),
    street_address TEXT NOT NULL,
    subcity VARCHAR(100) NOT NULL,
    kebele VARCHAR(100) NOT NULL,
    woreda VARCHAR(100),
    house_number VARCHAR(50),
    landmark TEXT,
    instructions TEXT,
    access_codes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcel details
CREATE TABLE parcels (
    parcel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    parcel_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    weight_kg DECIMAL(6,2) NOT NULL CHECK (weight_kg > 0),
    length_cm DECIMAL(6,2),
    width_cm DECIMAL(6,2),
    height_cm DECIMAL(6,2),
    declared_value DECIMAL(15,2),
    category VARCHAR(50),
    is_fragile BOOLEAN DEFAULT FALSE,
    is_perishable BOOLEAN DEFAULT FALSE,
    requires_signature BOOLEAN DEFAULT FALSE,
    insurance_amount DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_value DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking events
CREATE TABLE tracking_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'ORDER_CREATED',
        'ORDER_CONFIRMED',
        'COURIER_ASSIGNED',
        'PICKUP_SCHEDULED',
        'ARRIVED_AT_PICKUP',
        'PARCEL_PICKED_UP',
        'IN_TRANSIT',
        'ARRIVED_AT_HUB',
        'DEPARTED_FROM_HUB',
        'OUT_FOR_DELIVERY',
        'DELIVERY_ATTEMPTED',
        'DELIVERED',
        'FAILED',
        'DELAYED',
        'CANCELLED',
        'RETURN_INITIATED',
        'RETURNED'
    )),
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    location_text VARCHAR(500),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    courier_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier assignments
CREATE TABLE courier_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    courier_id UUID NOT NULL,
    vehicle_id UUID,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    unassignment_reason VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'REASSIGNED'))
);

-- Delivery proof
CREATE TABLE delivery_proofs (
    proof_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    proof_type VARCHAR(30) NOT NULL CHECK (proof_type IN ('SIGNATURE', 'PHOTO', 'CODE', 'RECIPIENT_DETAILS')),
    recipient_name VARCHAR(200),
    recipient_relation VARCHAR(100),
    signature_image_url TEXT,
    photo_urls TEXT[],
    access_code_used VARCHAR(100),
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location updates
CREATE TABLE location_updates (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    courier_id UUID NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy_meters DECIMAL(5,1),
    speed_kph DECIMAL(5,1),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES - Order Management Service
-- =============================================

CREATE INDEX idx_orders_customer_status ON orders(customer_id, status, created_at);
CREATE INDEX idx_orders_courier_status ON orders(courier_id, status);
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_tracking_events_order ON tracking_events(order_id, event_timestamp);
CREATE INDEX idx_location_updates_order ON location_updates(order_id, recorded_at);
CREATE INDEX idx_parcels_order ON parcels(order_id);
CREATE INDEX idx_order_addresses_order ON order_addresses(order_id, address_type);
CREATE INDEX idx_courier_assignments_active ON courier_assignments(status, assigned_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_orders_delivery_time ON orders(status, estimated_delivery_time) WHERE status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY');