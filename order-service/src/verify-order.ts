
import axios from 'axios';

const USER_SERVICE_URL = 'http://localhost:3001/api';
const ORDER_SERVICE_URL = 'http://localhost:3002/api';

const randomId = Math.floor(Math.random() * 10000);

async function verifyOrderFlow() {
  console.log('🚀 Starting Order Service Verification...');

  try {
    // 1. Get a valid user token from User Service
    console.log('\n--- 1. Authenticating with User Service ---');
    const email = `testuser${randomId}@example.com`;
    const password = 'password123';
    
    // Attempt register (might exist)
    try {
        await axios.post(`${USER_SERVICE_URL}/auth/register`, {
            email, password, first_name: 'Test', last_name: 'User', phone_number: `+2519${randomId}`, user_role: 'CUSTOMER'
        });
        console.log('✅ Registered new user');
    } catch (e) {
        // Ignore if already exists
    }

    const loginRes = await axios.post(`${USER_SERVICE_URL}/auth/login`, { email, password });
    const token = loginRes.data.token;
    console.log('✅ Got Auth Token');

    // 2. Create Order
    console.log('\n--- 2. Creating Order ---');
    const orderData = {
        pickup_lat: 9.00,
        pickup_lng: 38.75,
        pickup_address: 'Bole',
        dropoff_lat: 9.05,
        dropoff_lng: 38.78,
        dropoff_address: 'Piassa',
        receiver_name: 'Abebe',
        receiver_phone: '+251911223344',
        package_type: 'STANDARD',
        weight: 2.5
    };

    const createRes = await axios.post(`${ORDER_SERVICE_URL}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Order Created:', createRes.data.id);
    console.log('   Price:', createRes.data.price);
    console.log('   Status:', createRes.data.status);


    // 3. Fetch My Orders
    console.log('\n--- 3. Fetching My Orders ---');
    const listRes = await axios.get(`${ORDER_SERVICE_URL}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Fetched ${listRes.data.length} orders`);

    console.log('\n✨ Order Service Verification Complete!');

  } catch (error: any) {
    console.error('❌ Verification Failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
        console.error('Check if User Service (3001) and Order Service (3002) are running!');
    }
  }
}

verifyOrderFlow();
