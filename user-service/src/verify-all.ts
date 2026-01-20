//user-service\src\test-auth.ts
import axios from 'axios';

const API_URL = 'http://nginx-lb/api/users';

const randomId = Math.floor(Math.random() * 100000);

async function verifyAll() {
  console.log('🚀 Starting Comprehensive System Verification...');

  // ==========================================
  // 1. CUSTOMER FLOW
  // ==========================================
  console.log('\n--- 👤 CUSTOMER FLOW ---');
  const customerUser = {
    email: `customer${randomId}@test.com`,
    password: 'password123',
    first_name: 'Alice',
    last_name: 'Customer',
    phone_number: `+2519${randomId}`,
    user_role: 'CUSTOMER'
  };

  try {
    // Register
    console.log(`1. Registering Customer (${customerUser.email})...`);
    await axios.post(`${API_URL}/auth/register`, customerUser);
    console.log('✅ Registration Successful');

    // Login
    console.log('2. Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: customerUser.email,
      password: customerUser.password
    });
    const customerToken = loginRes.data.token;
    console.log('✅ Login Successful');

    // Add Address
    console.log('3. Adding Address...');
    await axios.post(`${API_URL}/customers/me/addresses`, {
        address_type: 'HOME',
        street_address: 'Bole Road',
        subcity: 'Bole',
        kebele: '03',
        house_number: '123'
    }, { headers: { Authorization: `Bearer ${customerToken}` } });
    console.log('✅ Address Added');

    // Get Profile
    console.log('4. Fetching Profile...');
    await axios.get(`${API_URL}/customers/me/profile`, {
        headers: { Authorization: `Bearer ${customerToken}` }
    });
    // console.log('Profile:', profileRes.data);
    console.log('✅ Profile Fetched (with addresses)');

  } catch (err: any) {
    console.error('❌ Customer Flow Failed:', err.response?.data || err.message);
  }

  // ==========================================
  // 2. COURIER FLOW
  // ==========================================
  console.log('\n--- 🚚 COURIER FLOW ---');
  const courierUser = {
    email: `courier${randomId}@test.com`,
    password: 'password123',
    first_name: 'Bob',
    last_name: 'Courier',
    phone_number: `+2517${randomId}`,
    user_role: 'COURIER'
  };

  try {
    // Register
    console.log(`1. Registering Courier (${courierUser.email})...`);
    await axios.post(`${API_URL}/auth/register`, courierUser);
    console.log('✅ Registration Successful');

    // Login
    console.log('2. Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: courierUser.email,
      password: courierUser.password
    });
    const courierToken = loginRes.data.token;
    console.log('✅ Login Successful');

    // Update Status
    console.log('3. Updating Status to AVAILABLE...');
    await axios.put(`${API_URL}/couriers/me/status`, {
        status: 'AVAILABLE'
    }, { headers: { Authorization: `Bearer ${courierToken}` } });
    console.log('✅ Status Updated');

    // Update Location
    console.log('4. Updating Location...');
    await axios.put(`${API_URL}/couriers/me/location`, {
        latitude: 9.03,
        longitude: 38.74
    }, { headers: { Authorization: `Bearer ${courierToken}` } });
    console.log('✅ Location Updated');

    // Add Vehicle
    console.log('5. Adding Vehicle...');
    await axios.post(`${API_URL}/couriers/me/vehicles`, {
        vehicle_type: 'MOTORCYCLE',
        make: 'Yamaha',
        model: 'FZN',
        license_plate: `ET-${randomId}`
    }, { headers: { Authorization: `Bearer ${courierToken}` } });
    console.log('✅ Vehicle Added');

  } catch (err: any) {
    console.error('❌ Courier Flow Failed:', err.response?.data || err.message);
  }

  console.log('\n✨ Verification Complete!');
}

verifyAll();
