
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ORDERS_API, PAYMENTS_API } from '../lib/axios';
import { Package, Truck, LogOut, MapPin } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState({
    priority: 'STANDARD',
    serviceType: 'DOOR_TO_DOOR',
    notes: '',
    pickupAddress: {
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      streetAddress: '',
      subcity: '',
      kebele: '',
      woreda: '',
      houseNumber: '',
      landmark: ''
    },
    deliveryAddress: {
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      streetAddress: '',
      subcity: '',
      kebele: '',
      woreda: '',
      houseNumber: '',
      landmark: ''
    },
    parcel: {
      description: '',
      weightKg: 1,
      category: 'GENERAL',
      isFragile: false,
      isPerishable: false
    }
  });
  const [estimate, setEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login'); return; }
    const u = JSON.parse(userStr);
    const normalized = {
      ...u,
      role: u.role || u.user_role,
      userId: u.userId || u.user_id || u.id,
    };
    setUser(normalized);
    if (normalized.role === 'CUSTOMER') fetchOrders();
    if (normalized.role === 'COURIER') {
      fetchCourierOrders();
      fetchAvailableOrders();
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get(`${ORDERS_API}/my-orders`);
      setOrders(res.data);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    }
  };

  const fetchCourierOrders = async () => {
    try {
      const res = await api.get(`${ORDERS_API}/courier-orders`);
      setOrders(res.data);
    } catch (e) {
      console.error('Failed to fetch courier orders:', e);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const res = await api.get(`${ORDERS_API}`);
      const pending = (res.data.orders || res.data || []).filter((o: any) =>
        (!o.courierId || o.courierId === null) &&
        (o.status === 'PENDING' || o.status === 'CONFIRMED')
      );
      setAvailableOrders(pending);
    } catch (e) {
      console.error('Failed to fetch available orders:', e);
    }
  };

  const getEstimate = async () => {
    if (!newOrder.pickupAddress.subcity || !newOrder.deliveryAddress.subcity) {
      alert('Please provide pickup and delivery subcities for an estimate');
      return;
    }
    setIsEstimating(true);
    try {
      const res = await api.post(`${PAYMENTS_API}/estimate-price`, {
        priority: newOrder.priority,
        weightKg: newOrder.parcel.weightKg,
        pickupSubcity: newOrder.pickupAddress.subcity,
        deliverySubcity: newOrder.deliveryAddress.subcity
      });
      setEstimate(res.data);
    } catch (e) {
      console.error('Estimate error:', e);
    } finally {
      setIsEstimating(false);
    }
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderData = {
        priority: newOrder.priority,
        serviceType: newOrder.serviceType,
        notes: newOrder.notes,
        addresses: [
          {
            addressType: 'PICKUP',
            ...newOrder.pickupAddress
          },
          {
            addressType: 'DELIVERY',
            ...newOrder.deliveryAddress
          }
        ],
        parcels: [
          {
            ...newOrder.parcel,
            weightKg: parseFloat(newOrder.parcel.weightKg.toString())
          }
        ]
      };

      await api.post(`${ORDERS_API}`, orderData);

      // Reset form
      setNewOrder({
        priority: 'STANDARD',
        serviceType: 'DOOR_TO_DOOR',
        notes: '',
        pickupAddress: {
          contactName: '',
          contactPhone: '',
          contactEmail: '',
          streetAddress: '',
          subcity: '',
          kebele: '',
          woreda: '',
          houseNumber: '',
          landmark: ''
        },
        deliveryAddress: {
          contactName: '',
          contactPhone: '',
          contactEmail: '',
          streetAddress: '',
          subcity: '',
          kebele: '',
          woreda: '',
          houseNumber: '',
          landmark: ''
        },
        parcel: {
          description: '',
          weightKg: 1,
          category: 'GENERAL',
          isFragile: false,
          isPerishable: false
        }
      });

      setTimeout(fetchOrders, 1000);
      alert('Order created successfully!');
    } catch (e: any) {
      console.error('Create order error:', e);
      alert('Failed to create order: ' + (e.response?.data?.message || e.message));
    }
  };

  const assignToSelf = async (orderId: string) => {
    if (!user?.userId) {
      alert('Missing courier ID');
      return;
    }
    try {
      await api.patch(`${ORDERS_API}/${orderId}/assign-courier`, {
        courierId: user.userId
      });
      await fetchCourierOrders();
      await fetchAvailableOrders();
      alert('Order assigned to you');
    } catch (e: any) {
      alert('Failed to claim order: ' + (e.response?.data?.message || e.message));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`${ORDERS_API}/${orderId}/status`, {
        status,
        notes: `Status updated to ${status}`
      });

      if (user.role === 'COURIER') {
        fetchCourierOrders();
      } else {
        fetchOrders();
      }

      alert('Order status updated successfully!');
    } catch (e: any) {
      alert('Failed to update status: ' + (e.response?.data?.message || e.message));
    }
  };

  const updateCourierLocation = async (orderId: string) => {
    try {
      // Mocked location coordinates
      const lat = 9.0 + (Math.random() * 0.1);
      const lng = 38.7 + (Math.random() * 0.1);

      await api.patch(`${ORDERS_API}/${orderId}/location`, {
        latitude: lat,
        longitude: lng,
        accuracy: 10
      });
      alert(`Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (e: any) {
      alert('Failed to update location');
    }
  };

  const submitProof = async (orderId: string) => {
    const recipientName = prompt("Enter recipient name:");
    if (!recipientName) return;

    try {
      await api.post(`${ORDERS_API}/${orderId}/proof`, {
        proofType: 'RECIPIENT_DETAILS',
        recipientName,
        recipientRelation: 'SELF'
      });

      await updateOrderStatus(orderId, 'DELIVERED');
      alert('Delivery proof submitted and order marked as Delivered!');
    } catch (e: any) {
      alert('Failed to submit proof: ' + (e.response?.data?.message || e.message));
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PENDING': 'bg-gray-100 text-gray-700',
      'CONFIRMED': 'bg-blue-100 text-blue-700',
      'ASSIGNED_TO_COURIER': 'bg-purple-100 text-purple-700',
      'PICKED_UP': 'bg-yellow-100 text-yellow-700',
      'IN_TRANSIT': 'bg-orange-100 text-orange-700',
      'OUT_FOR_DELIVERY': 'bg-indigo-100 text-indigo-700',
      'DELIVERED': 'bg-green-100 text-green-700',
      'FAILED': 'bg-red-100 text-red-700',
      'CANCELLED': 'bg-gray-100 text-gray-700',
      'RETURNED': 'bg-pink-100 text-pink-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <Truck /> Delivery App
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Welcome, {user?.first_name} ({user?.role})</span>
          <button onClick={logout} className="text-red-500 hover:text-red-700"><LogOut size={20} /></button>
        </div>
      </nav>

      <main className="container mx-auto p-6">
        {user?.role === 'CUSTOMER' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Order Panel */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow h-fit">
              <h2 className="text-lg font-bold mb-4 flex gap-2 items-center"><Package size={20} /> New Order</h2>
              <form onSubmit={createOrder} className="space-y-4">
                {/* Order Details */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Priority</label>
                  <select
                    className="w-full border p-2 rounded"
                    value={newOrder.priority}
                    onChange={e => setNewOrder({ ...newOrder, priority: e.target.value })}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="EXPRESS">Express</option>
                    <option value="SAME_DAY">Same Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Service Type</label>
                  <select
                    className="w-full border p-2 rounded"
                    value={newOrder.serviceType}
                    onChange={e => setNewOrder({ ...newOrder, serviceType: e.target.value })}
                  >
                    <option value="DOOR_TO_DOOR">Door to Door</option>
                    <option value="PICKUP_STATION">Pickup Station</option>
                    <option value="LOCKER">Locker</option>
                  </select>
                </div>

                {/* Pickup Address */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin size={16} /> Pickup Address</h3>
                  <input placeholder="Contact Name" className="w-full border p-2 rounded mb-2"
                    value={newOrder.pickupAddress.contactName}
                    onChange={e => setNewOrder({ ...newOrder, pickupAddress: { ...newOrder.pickupAddress, contactName: e.target.value } })}
                    required />
                  <input placeholder="Contact Phone" className="w-full border p-2 rounded mb-2"
                    value={newOrder.pickupAddress.contactPhone}
                    onChange={e => setNewOrder({ ...newOrder, pickupAddress: { ...newOrder.pickupAddress, contactPhone: e.target.value } })}
                    required />
                  <input placeholder="Street Address" className="w-full border p-2 rounded mb-2"
                    value={newOrder.pickupAddress.streetAddress}
                    onChange={e => setNewOrder({ ...newOrder, pickupAddress: { ...newOrder.pickupAddress, streetAddress: e.target.value } })}
                    required />
                  <input placeholder="Subcity" className="w-full border p-2 rounded mb-2"
                    value={newOrder.pickupAddress.subcity}
                    onChange={e => setNewOrder({ ...newOrder, pickupAddress: { ...newOrder.pickupAddress, subcity: e.target.value } })}
                    required />
                  <input placeholder="Kebele" className="w-full border p-2 rounded"
                    value={newOrder.pickupAddress.kebele}
                    onChange={e => setNewOrder({ ...newOrder, pickupAddress: { ...newOrder.pickupAddress, kebele: e.target.value } })}
                    required />
                </div>

                {/* Delivery Address */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin size={16} /> Delivery Address</h3>
                  <input placeholder="Receiver Name" className="w-full border p-2 rounded mb-2"
                    value={newOrder.deliveryAddress.contactName}
                    onChange={e => setNewOrder({ ...newOrder, deliveryAddress: { ...newOrder.deliveryAddress, contactName: e.target.value } })}
                    required />
                  <input placeholder="Receiver Phone" className="w-full border p-2 rounded mb-2"
                    value={newOrder.deliveryAddress.contactPhone}
                    onChange={e => setNewOrder({ ...newOrder, deliveryAddress: { ...newOrder.deliveryAddress, contactPhone: e.target.value } })}
                    required />
                  <input placeholder="Street Address" className="w-full border p-2 rounded mb-2"
                    value={newOrder.deliveryAddress.streetAddress}
                    onChange={e => setNewOrder({ ...newOrder, deliveryAddress: { ...newOrder.deliveryAddress, streetAddress: e.target.value } })}
                    required />
                  <input placeholder="Subcity" className="w-full border p-2 rounded mb-2"
                    value={newOrder.deliveryAddress.subcity}
                    onChange={e => setNewOrder({ ...newOrder, deliveryAddress: { ...newOrder.deliveryAddress, subcity: e.target.value } })}
                    required />
                  <input placeholder="Kebele" className="w-full border p-2 rounded"
                    value={newOrder.deliveryAddress.kebele}
                    onChange={e => setNewOrder({ ...newOrder, deliveryAddress: { ...newOrder.deliveryAddress, kebele: e.target.value } })}
                    required />
                </div>

                {/* Parcel Details */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Package size={16} /> Parcel Details</h3>
                  <input placeholder="Description" className="w-full border p-2 rounded mb-2"
                    value={newOrder.parcel.description}
                    onChange={e => setNewOrder({ ...newOrder, parcel: { ...newOrder.parcel, description: e.target.value } })}
                    required />
                  <input type="number" step="0.1" placeholder="Weight (kg)" className="w-full border p-2 rounded mb-2"
                    value={newOrder.parcel.weightKg}
                    onChange={e => setNewOrder({ ...newOrder, parcel: { ...newOrder.parcel, weightKg: parseFloat(e.target.value) } })}
                    required />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox"
                        checked={newOrder.parcel.isFragile}
                        onChange={e => setNewOrder({ ...newOrder, parcel: { ...newOrder.parcel, isFragile: e.target.checked } })}
                      />
                      <span className="text-sm">Fragile</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox"
                        checked={newOrder.parcel.isPerishable}
                        onChange={e => setNewOrder({ ...newOrder, parcel: { ...newOrder.parcel, isPerishable: e.target.checked } })}
                      />
                      <span className="text-sm">Perishable</span>
                    </label>
                  </div>
                </div>

                <textarea placeholder="Additional Notes (optional)" className="w-full border p-2 rounded"
                  value={newOrder.notes}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  rows={2}
                />

                <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-blue-800">Price Estimate</span>
                    <button
                      type="button"
                      onClick={getEstimate}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      disabled={isEstimating}
                    >
                      {isEstimating ? 'Calculating...' : 'Get Estimate'}
                    </button>
                  </div>
                  {estimate ? (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span>Base Fee:</span> <span>{estimate.baseFee} {estimate.currency}</span></div>
                      <div className="flex justify-between"><span>Distance Fee:</span> <span>{estimate.distanceFee} {estimate.currency}</span></div>
                      {estimate.weightFee > 0 && <div className="flex justify-between"><span>Weight Surcharge:</span> <span>{estimate.weightFee} {estimate.currency}</span></div>}
                      {estimate.priorityFee > 0 && <div className="flex justify-between"><span>Priority Fee:</span> <span>{estimate.priorityFee} {estimate.currency}</span></div>}
                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                        <span>Total:</span> <span>{estimate.totalAmount} {estimate.currency}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-600 italic">Click "Get Estimate" to see delivery cost.</p>
                  )}
                </div>

                <button className="w-full bg-primary text-white p-2 rounded hover:bg-blue-700">Create Order</button>
              </form>
            </div>

            {/* Order List Panel */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4">My Orders</h2>
              <div className="space-y-4">
                {orders.length === 0 && <p className="text-gray-500">No orders found.</p>}
                {orders.map((order) => {
                  const pickupAddr = order.addresses?.find((a: any) => a.addressType === 'PICKUP');
                  const deliveryAddr = order.addresses?.find((a: any) => a.addressType === 'DELIVERY');

                  return (
                    <div key={order.orderId} className="border p-4 rounded bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-lg">Order #{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700">Pickup:</p>
                          <p>{pickupAddr?.contactName}</p>
                          <p className="text-gray-600">{pickupAddr?.streetAddress}, {pickupAddr?.subcity}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Delivery:</p>
                          <p>{deliveryAddr?.contactName}</p>
                          <p className="text-gray-600">{deliveryAddr?.streetAddress}, {deliveryAddr?.subcity}</p>
                        </div>
                      </div>

                      {order.parcels && order.parcels.length > 0 && (
                        <div className="mt-3 text-sm">
                          <p className="font-semibold text-gray-700">Parcel:</p>
                          <p>{order.parcels[0].description} ({order.parcels[0].weightKg} kg)</p>
                        </div>
                      )}

                      {order.trackingEvents && order.trackingEvents.length > 0 && (
                        <div className="mt-3 text-xs text-gray-600">
                          <p className="font-semibold">Latest Update:</p>
                          <p>{order.trackingEvents[0].eventType.replace(/_/g, ' ')} - {new Date(order.trackingEvents[0].eventTimestamp).toLocaleString()}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/order/${order.orderId}`)}
                          className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 font-semibold"
                        >
                          View Details
                        </button>
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => navigate(`/checkout/${order.orderId}`)}
                            className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 font-semibold"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {user?.role === 'COURIER' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4">Available Orders</h2>
              <div className="space-y-4">
                {availableOrders.length === 0 && <p className="text-gray-500">No available orders right now.</p>}
                {availableOrders.map((order) => (
                  <div key={order.orderId} className="border p-4 rounded bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg">Order #{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{order.notes || 'No notes'}</p>
                    <button
                      onClick={() => assignToSelf(order.orderId)}
                      className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Claim Order
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4">My Assigned Orders</h2>
              <div className="space-y-4">
                {orders.length === 0 && <p className="text-gray-500">No orders assigned to you.</p>}
                {orders.map((order) => {
                  const pickupAddr = order.addresses?.find((a: any) => a.addressType === 'PICKUP');
                  const deliveryAddr = order.addresses?.find((a: any) => a.addressType === 'DELIVERY');

                  return (
                    <div key={order.orderId} className="border p-4 rounded bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-lg">Order #{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="font-semibold text-gray-700">Pickup:</p>
                          <p>{pickupAddr?.contactName} - {pickupAddr?.contactPhone}</p>
                          <p className="text-gray-600">{pickupAddr?.streetAddress}, {pickupAddr?.subcity}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Delivery:</p>
                          <p>{deliveryAddr?.contactName} - {deliveryAddr?.contactPhone}</p>
                          <p className="text-gray-600">{deliveryAddr?.streetAddress}, {deliveryAddr?.subcity}</p>
                        </div>
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {order.status === 'ASSIGNED_TO_COURIER' && (
                          <button
                            onClick={() => updateOrderStatus(order.orderId, 'PICKED_UP')}
                            className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Mark as Picked Up
                          </button>
                        )}
                        {order.status === 'PICKED_UP' && (
                          <button
                            onClick={() => updateOrderStatus(order.orderId, 'IN_TRANSIT')}
                            className="bg-orange-600 text-white text-sm px-3 py-1 rounded hover:bg-orange-700"
                          >
                            Mark as In Transit
                          </button>
                        )}
                        {order.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => updateOrderStatus(order.orderId, 'OUT_FOR_DELIVERY')}
                            className="bg-indigo-600 text-white text-sm px-3 py-1 rounded hover:bg-indigo-700"
                          >
                            Mark as Out for Delivery
                          </button>
                        )}
                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => submitProof(order.orderId)}
                            className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
                          >
                            Mark as Delivered (with Proof)
                          </button>
                        )}
                        {['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status) && (
                          <button
                            onClick={() => updateCourierLocation(order.orderId)}
                            className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
                          >
                            <MapPin size={14} /> Send Location
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
