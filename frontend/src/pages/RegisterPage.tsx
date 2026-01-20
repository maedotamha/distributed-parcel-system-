
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { USERS_API } from '../lib/axios';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    user_role: 'CUSTOMER'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`${USERS_API}/auth/register`, formData);
      navigate('/login');
    } catch (err: any) {
  const validationErrors = err.response?.data?.errors?.map((e: any) => e.msg).join(', ');
  setError(validationErrors || err.response?.data?.message || 'Registration failed');
}

  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary">Create Account</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <input 
            type="text" placeholder="First Name" 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, first_name: e.target.value})} required
          />
          <input 
            type="text" placeholder="Last Name" 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, last_name: e.target.value})} required
          />
          <input 
            type="email" placeholder="Email" 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, email: e.target.value})} required
          />
          <input 
            type="text" placeholder="Phone (+251...)" 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, phone_number: e.target.value})} required
          />
          <input 
            type="password" placeholder="Password" 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, password: e.target.value})} required
          />
          <select 
            className="w-full border p-2 rounded"
            onChange={e => setFormData({...formData, user_role: e.target.value})}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="COURIER">Courier</option>
          </select>

          <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition">
            Sign Up
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:underline">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
}
