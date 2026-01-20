import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { ORDERS_API } from "../../lib/axios";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await api.get(`${ORDERS_API}/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error("Failed to fetch order details:", err);
      setError("Could not load order details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Use fetched data or defaults if missing (though URL param check handles missing ID)
  const orderNumber = order?.orderNumber || "Unknown";
  // Assuming the payment amount matches the order logic from CheckoutPage
  const baseAmount = 100;
  const weightFee = order?.parcels?.reduce((sum: number, p: any) => sum + (Number(p.weightKg) * 10), 0) || 0;
  const priorityMultiplier = order?.priority === 'EXPRESS' ? 1.5 : order?.priority === 'SAME_DAY' ? 2 : 1;
  const amount = (baseAmount + weightFee) * priorityMultiplier;

  const currency = "ETB";
  const addresses = order?.addresses || [];
  const deliveryAddress = addresses.find((a: any) => a.addressType === 'DELIVERY');
  const customerName = deliveryAddress ? deliveryAddress.contactName : "Customer";

  const items = order?.parcels?.flatMap((p: any) =>
    p.items?.map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      unit_value: Number(i.unitValue)
    })) || [{ name: p.description, quantity: 1, unit_value: 0 }]
  ) || [];

  return (
    <div className="max-w-5xl mx-auto mt-12 p-8 bg-green-50 rounded shadow-lg">
      <h2 className="text-4xl font-bold text-green-800 mb-6 text-center">Payment Successful!</h2>
      <p className="text-xl text-green-700 mb-6 text-center">Thank you, {customerName}, for your payment.</p>

      <div className="bg-green-100 p-6 rounded mb-6">
        <p className="text-lg mb-2"><strong>Order Number:</strong> {orderNumber}</p>
        <p className="text-lg mb-2"><strong>Amount Paid:</strong> {currency} {amount.toFixed(2)}</p>
        <p className="text-sm text-gray-600 mt-2">Status: {order?.status || 'PAID'}</p>
      </div>

      <section className="mb-6">
        <h3 className="text-2xl font-semibold text-green-700 mb-4">Order Summary</h3>
        <div className="space-y-2">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between p-3 bg-white rounded shadow-sm">
              <div className="font-medium">{item.name}</div>
              <div>Qty: {item.quantity}</div>
              {item.unit_value > 0 && <div>{currency} {item.unit_value.toFixed(2)}</div>}
              {item.unit_value > 0 && <div className="font-semibold">{currency} {(item.quantity * item.unit_value).toFixed(2)}</div>}
            </div>
          ))}
        </div>
        <div className="mt-4 text-right text-xl font-bold text-green-800">
          Total: {currency} {amount.toFixed(2)}
        </div>
      </section>

      <p className="text-green-700 mb-6 text-center">Your order is now being processed and will be delivered soon.</p>

      <div className="text-center">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-green-700 text-white px-6 py-3 rounded hover:bg-green-800 text-lg font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
