//user-service\src\test-auth.ts
import axios from 'axios';

const API_URL = 'http://localhost:3001/api/auth';

async function testAuth() {
  const randomId = Math.floor(Math.random() * 10000);
  const testUser = {
    email: `testuser${randomId}@example.com`,
    password: 'password123',
    first_name: 'Test',
    last_name: 'User',
    phone_number: `+2519${randomId.toString().padStart(8, '0')}`,
    user_role: 'CUSTOMER'
  };

  console.log(`\n🧪 Testing Auth with user: ${testUser.email}`);

  try {
    // 1. Test Registration
    console.log('1. Attempting Registration...');
    const registerRes = await axios.post(`${API_URL}/register`, testUser);
    
    if (registerRes.status === 201) {
      console.log('✅ Registration Successful!');
      console.log('   User ID:', registerRes.data.user.user_id);
    }

    // 2. Test Login
    console.log('\n2. Attempting Login...');
    const loginRes = await axios.post(`${API_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (loginRes.status === 200) {
      console.log('✅ Login Successful!');
      console.log('   Token received:', loginRes.data.token.substring(0, 20) + '...');
      console.log('\n🎉 AUTHENTICATION FLOW VERIFIED!');
    }

  } catch (error: any) {
    console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
  }
}

testAuth();
