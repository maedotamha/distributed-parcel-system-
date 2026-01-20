//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\frontend\src\pages\Payment\CheckoutPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { PAYMENTS_API, ORDERS_API } from "../../lib/axios";

interface OrderItem {
  name: string;
  quantity: number;
  unit_value: number;
}

interface Parcel {
  parcelNumber: string;
  description: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  declaredValue?: number;
  category?: string;
  isFragile?: boolean;
  isPerishable?: boolean;
  requiresSignature?: boolean;
  insuranceAmount?: number;
  items?: OrderItem[];
}

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  amount: number;
  currency: string;
  parcels: Parcel[];
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Fetch order details
      const orderRes = await api.get(`${ORDERS_API}/${orderId}`);
      const orderData = orderRes.data;

      // Get delivery address
      const deliveryAddr = orderData.addresses?.find((a: any) => a.addressType === 'DELIVERY');
      const deliveryAddressStr = deliveryAddr
        ? `${deliveryAddr.streetAddress}, ${deliveryAddr.subcity}, ${deliveryAddr.kebele}`
        : 'N/A';

      // Fetch price from backend
      let totalAmount = 100; // fallback
      const totalWeight = orderData.parcels?.reduce((sum: number, p: any) => sum + parseFloat(p.weightKg), 0) || 1;

      try {
        const pricingRes = await api.post(`${PAYMENTS_API}/estimate-price`, {
          priority: orderData.priority,
          weightKg: totalWeight,
          pickupSubcity: orderData.addresses?.find((a: any) => a.addressType === 'PICKUP')?.subcity || '',
          deliverySubcity: orderData.addresses?.find((a: any) => a.addressType === 'DELIVERY')?.subcity || ''
        });
        totalAmount = pricingRes.data.totalAmount;
      } catch (pErr) {
        console.error('Failed to fetch backend price, using fallback logic', pErr);
        // Fallback logic if pricing service is down
        const baseAmount = 50;
        const weightFee = orderData.parcels?.reduce((sum: number, p: any) => sum + (p.weightKg * 10), 0) || 0;
        const priorityMultiplier = orderData.priority === 'EXPRESS' ? 1.5 : orderData.priority === 'SAME_DAY' ? 2 : 1;
        totalAmount = (baseAmount + weightFee) * priorityMultiplier;
      }

      const orderDetails: OrderDetails = {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        customerName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer',
        email: user.email || '',
        phone: user.phone_number || '',
        deliveryAddress: deliveryAddressStr,
        amount: totalAmount,
        currency: 'ETB',
        parcels: orderData.parcels?.map((p: any) => ({
          parcelNumber: p.parcelNumber,
          description: p.description || 'Package',
          weightKg: parseFloat(p.weightKg),
          lengthCm: p.lengthCm ? parseFloat(p.lengthCm) : undefined,
          widthCm: p.widthCm ? parseFloat(p.widthCm) : undefined,
          heightCm: p.heightCm ? parseFloat(p.heightCm) : undefined,
          declaredValue: p.declaredValue ? parseFloat(p.declaredValue) : undefined,
          category: p.category || 'General',
          isFragile: p.isFragile || false,
          isPerishable: p.isPerishable || false,
          requiresSignature: p.requiresSignature || false,
          insuranceAmount: p.insuranceAmount ? parseFloat(p.insuranceAmount) : 0,
          items: p.items || []
        })) || []
      };

      setOrder(orderDetails);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch order:', err);
      setError('Failed to load order details');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order) return;
    setPaymentLoading(true);
    setError("");
    try {
      const response = await api.post(`${PAYMENTS_API}/initiate`, {
        orderId: order.orderId,
        first_name: order.customerName.split(" ")[0],
        last_name: order.customerName.split(" ")[1] || "",
        email: order.email,
        phone_number: order.phone,
        amount: order.amount,
      });
      const { checkout_url } = response.data;
      window.location.href = checkout_url;
    } catch (err: any) {
      console.error(err.response?.data || err);
      setError(err.response?.data?.message || "Server error. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-12 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading order details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-5xl mx-auto mt-12 p-8 text-center">
        <p className="text-red-600 text-lg">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!order) return <p className="text-center mt-20">Order not found</p>;

  return (
    <div className="max-w-5xl mx-auto mt-12 p-8 bg-green-50 rounded shadow-lg">
      <h2 className="text-4xl font-bold text-green-800 mb-8">Checkout</h2>

      {/* Customer Info */}
      <section className="mb-8">
        <h3 className="text-2xl font-semibold text-green-700 mb-4">Customer Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <p><strong>Name:</strong> {order.customerName}</p>
          <p><strong>Email:</strong> {order.email}</p>
          <p><strong>Phone:</strong> {order.phone}</p>
          <p><strong>Delivery Address:</strong> {order.deliveryAddress}</p>
          <p><strong>Order Number:</strong> {order.orderNumber}</p>
        </div>
      </section>

      {/* Parcels & Items */}
      <section className="mb-8">
        <h3 className="text-2xl font-semibold text-green-700 mb-4">Parcels & Items</h3>
        {order.parcels.map((parcel, idx) => (
          <div key={idx} className="mb-6 p-6 border rounded bg-green-100 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">{parcel.parcelNumber} - {parcel.category}</h4>
            <p className="mb-2">{parcel.description}</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <p><strong>Weight:</strong> {parcel.weightKg} kg</p>
              {parcel.lengthCm && parcel.widthCm && parcel.heightCm && (
                <p><strong>Dimensions:</strong> {parcel.lengthCm} x {parcel.widthCm} x {parcel.heightCm} cm</p>
              )}
              {parcel.declaredValue && (
                <p><strong>Declared Value:</strong> {order.currency} {parcel.declaredValue}</p>
              )}
              {parcel.insuranceAmount && parcel.insuranceAmount > 0 && (
                <p><strong>Insurance:</strong> {order.currency} {parcel.insuranceAmount}</p>
              )}
              <p><strong>Fragile:</strong> {parcel.isFragile ? "Yes" : "No"}</p>
              <p><strong>Perishable:</strong> {parcel.isPerishable ? "Yes" : "No"}</p>
              <p><strong>Signature Required:</strong> {parcel.requiresSignature ? "Yes" : "No"}</p>
            </div>

            {parcel.items && parcel.items.length > 0 && (
              <table className="w-full text-left border border-green-200">
                <thead className="bg-green-200">
                  <tr>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">Qty</th>
                    <th className="p-2 border">Unit Price</th>
                    <th className="p-2 border">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {parcel.items.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 border">{item.name}</td>
                      <td className="p-2 border">{item.quantity}</td>
                      <td className="p-2 border">{order.currency} {item.unit_value.toFixed(2)}</td>
                      <td className="p-2 border">{order.currency} {(item.quantity * item.unit_value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </section>

      {/* Total & Payment */}
      <section>
        <div className="text-right mb-4 text-2xl font-bold text-green-800">
          Total Delivery Fee: {order.currency} {order.amount.toFixed(2)}
        </div>
        <button
          onClick={handlePayment}
          disabled={paymentLoading}
          className="bg-green-700 text-white px-6 py-3 rounded hover:bg-green-800 w-full text-lg font-semibold disabled:bg-gray-400"
        >
          {paymentLoading ? "Redirecting to Payment..." : `Pay ${order.currency} ${order.amount.toFixed(2)}`}
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </section>
    </div>
  );
}
