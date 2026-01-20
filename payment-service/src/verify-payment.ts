
import axios from 'axios';

const USER_SERVICE_URL = 'http://localhost:3001/api';
const ORDER_SERVICE_URL = 'http://localhost:3002/api';
const PAYMENT_SERVICE_URL = 'http://localhost:3003/api';

const randomId = Math.floor(Math.random() * 10000);

async function verifyPaymentFlow() {
  console.log('🚀 Starting Payment Service Verification...');

  try {
    // 1. Authenticate
    console.log('\n--- 1. Authenticating ---');
    const email = `payer${randomId}@test.com`;
    const password = 'password123';
    
    // Register if needed
    try {
        await axios.post(`${USER_SERVICE_URL}/auth/register`, {
            email, password, first_name: 'Payer', last_name: 'Test', phone_number: `+2519${randomId}`, user_role: 'CUSTOMER'
        });
    } catch (e) {}

    const loginRes = await axios.post(`${USER_SERVICE_URL}/auth/login`, { email, password });
    const token = loginRes.data.token;
    console.log('✅ Authenticated');

    // 2. Create Order (Triggers Event)
    console.log('\n--- 2. Creating Order (Publishes Event) ---');
    const orderRes = await axios.post(`${ORDER_SERVICE_URL}/orders`, {
        pickup_lat: 9.00, pickup_lng: 38.75, pickup_address: 'Bole',
        dropoff_lat: 9.05, dropoff_lng: 38.78, dropoff_address: 'Piassa',
        receiver_name: 'Receiver', receiver_phone: '0911223344',
        price: 150
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    const orderId = orderRes.data.id;
    console.log(`✅ Order Created: ${orderId}`);
    console.log('⏳ Waiting for RabbitMQ to process event...');
    
    // Wait for consumer to create payment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Check Pending Payment
    console.log('\n--- 3. Verifying Payment Record ---');
    const checkRes = await axios.get(`${PAYMENT_SERVICE_URL}/payments/${orderId}`);
    console.log('✅ Found Payment Record:', checkRes.data.status);
    
    if (checkRes.data.status !== 'PENDING') {
        throw new Error('Payment should be PENDING initially');
    }

    // 4. Process Payment
    console.log('\n--- 4. Processing Payment ---');
    const payRes = await axios.post(`${PAYMENT_SERVICE_URL}/payments/pay`, {
        orderId,
        amount: checkRes.data.amount
    });
    console.log('✅ Payment Processed:', payRes.data.status);
    console.log('   Transaction ID:', payRes.data.transaction_id);

    console.log('\n✨ Payment Service Verification Complete!');

  } catch (error: any) {
    console.error('❌ Verification Failed:', error.response?.data || error.message);
  }
}

verifyPaymentFlow();
