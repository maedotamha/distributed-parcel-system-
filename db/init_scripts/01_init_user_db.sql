-- =============================================
-- USER MANAGEMENT SERVICE DATABASE
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main user table with role included
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    user_role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (user_role IN ('CUSTOMER', 'COURIER', 'MANAGER', 'ADMIN')),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    profile_image_url TEXT
);

-- Customer profiles
CREATE TABLE customer_profiles (
    customer_profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    preferred_notification_method VARCHAR(10) DEFAULT 'SMS' CHECK (preferred_notification_method IN ('EMAIL', 'SMS', 'CALL')),
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    sms_notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier profiles
CREATE TABLE courier_profiles (
    courier_profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    id_number VARCHAR(50),
    hire_date DATE NOT NULL,
    employment_type VARCHAR(20) CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACTOR')),
    status VARCHAR(15) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'OFF_DUTY', 'ON_LEAVE')),
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_deliveries_completed INTEGER DEFAULT 0,
    on_time_delivery_rate DECIMAL(5,2),
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_location_update TIMESTAMPTZ,
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier availability schedule
CREATE TABLE courier_availability (
    availability_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    courier_profile_id UUID NOT NULL REFERENCES courier_profiles(courier_profile_id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    courier_profile_id UUID NOT NULL REFERENCES courier_profiles(courier_profile_id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('BIKE', 'MOTORCYCLE', 'CAR', 'VAN')),
    make VARCHAR(100),
    model VARCHAR(100),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    capacity_weight_kg DECIMAL(6,2),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses for Addis Ababa
CREATE TABLE addresses (
    address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('HOME', 'WORK', 'OTHER', 'BILLING')),
    street_address TEXT NOT NULL,
    subcity VARCHAR(100) NOT NULL,
    kebele VARCHAR(100) NOT NULL,
    woreda VARCHAR(100),
    house_number VARCHAR(50),
    landmark TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier ratings
CREATE TABLE courier_ratings (
    rating_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    courier_profile_id UUID NOT NULL REFERENCES courier_profiles(courier_profile_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_reference_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    device_type VARCHAR(50),
    access_token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES - User Management Service
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(user_role, is_active);
CREATE INDEX idx_courier_profiles_status ON courier_profiles(status, is_online);
CREATE INDEX idx_courier_profiles_location ON courier_profiles(current_latitude, current_longitude);
CREATE INDEX idx_vehicles_courier ON vehicles(courier_profile_id);
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_courier_ratings_courier ON courier_ratings(courier_profile_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, expires_at);

-- Insert initial admin user (optional)
-- INSERT INTO users (email, phone_number, user_role, password_hash, first_name, last_name, is_verified)
-- VALUES ('admin@delivery.com', '+251911111111', 'ADMIN', '$2b$10$YourHashedPasswordHere', 'Admin', 'User', TRUE);