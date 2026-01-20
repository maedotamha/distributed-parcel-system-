
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import CheckoutPage from './pages/Payment/CheckoutPage';
import PaymentSuccessPage from './pages/Payment/PaymentSucess';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/order/:orderId" element={<OrderDetailsPage />} />
        <Route path="/checkout/:orderId" element={<CheckoutPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />


        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
