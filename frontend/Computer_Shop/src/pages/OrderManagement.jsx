import React, { useState, useEffect } from 'react';
import { Eye, Check, Trash, Edit, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAllOrders, updateOrderStatus, cancelOrder, getOrderById } from '../services/orderService';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 0,
    size: 10
  });
  const [totalPages, setTotalPages] = useState(0);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [expandedOrderDetails, setExpandedOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders(filters);
      setOrders(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setError(null);
    } catch (err) {
      setError('Failed to load orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrderId || !newStatus) return;
    
    setUpdatingOrderId(selectedOrderId);
    try {
      await updateOrderStatus(selectedOrderId, newStatus);
      
      setOrders(orders.map(order => {
        const currentId = order?.orderId || order?.id;
        return currentId === selectedOrderId ? { ...order, status: newStatus } : order;
      }));
      
      setShowStatusModal(false);
      setSelectedOrderId(null);
      setNewStatus('');
      
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrderId) return;
    
    try {
      await cancelOrder(selectedOrderId);
      
      setOrders(orders.filter(order => {
        const currentId = order?.orderId || order?.id;
        return currentId !== selectedOrderId;
      }));
      
      setShowDeleteModal(false);
      setSelectedOrderId(null);
      
      toast.success('Order has been cancelled');
    } catch (err) {
      toast.error('Failed to cancel order');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setFilters({ ...filters, page: newPage });
    }
  };

  const getStatusColor = (status) => {
    switch (String(status).toUpperCase()) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openStatusModal = (orderId, currentStatus) => {
    setSelectedOrderId(orderId);
    setNewStatus(currentStatus);
    setShowStatusModal(true);
  };

  const openDeleteModal = (orderId) => {
    setSelectedOrderId(orderId);
    setShowDeleteModal(true);
  };

  const toggleOrderDetails = async (orderId) => {
    if (!orderId) {
      toast.error("Critical identity context missing for this order row");
      return;
    }

    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setExpandedOrderDetails(null);
      return;
    }
    
    setExpandedOrderId(orderId);
    setLoadingDetails(true);
    
    try {
      const orderDetails = await getOrderById(orderId);
      setExpandedOrderDetails(orderDetails);
    } catch (err) {
      toast.error('Failed to load order details');
      setExpandedOrderId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Order Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filters Form Layout Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 0 }))}
              className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input 
              type="text" 
              placeholder="Order ID or Customer Email"
              className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 0 }))}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => fetchOrders()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Refresh Table
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">No active orders located matching current criteria</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  // SAFE RESOLUTION: Defensively track alternative property mapping patterns
                  const resolvedOrderId = order?.orderId || order?.id;
                  
                  return (
                    <React.Fragment key={resolvedOrderId || Math.random().toString()}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleOrderDetails(resolvedOrderId)}
                              className="mr-2 focus:outline-none p-1 rounded hover:bg-gray-200 transition-colors"
                            >
                              {expandedOrderId === resolvedOrderId ? 
                                <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              }
                            </button>
                            <div className="text-sm font-semibold text-gray-900 font-mono">
                              {resolvedOrderId ? `${resolvedOrderId.substring(0, 8)}...` : 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order?.customerEmail || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order?.status)}`}>
                            {order?.status || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          Rs.{(order?.totalAmount || order?.finalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button 
                              className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              onClick={() => navigate(`/admin/orders/${resolvedOrderId}`)}
                              title="View Details File"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            
                            <button
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              onClick={() => openStatusModal(resolvedOrderId, order?.status)}
                              title="Update Status Value"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            
                            {(order?.status === 'PENDING' || order?.status === 'PROCESSING') && (
                              <button
                                className="text-red-600 hover:text-red-900 transition-colors"
                                onClick={() => openDeleteModal(resolvedOrderId)}
                                title="Cancel Order Transaction"
                              >
                                <Trash className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Order Details Grid Block */}
                      {expandedOrderId === resolvedOrderId && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50 border-t border-b border-gray-100">
                            {loadingDetails ? (
                              <div className="text-center py-4">
                                <LoadingSpinner size="small" />
                              </div>
                            ) : expandedOrderDetails ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h3 className="text-sm font-semibold mb-2 text-gray-800">Order Items Summary</h3>
                                  <table className="min-w-full divide-y divide-gray-200 border bg-white rounded shadow-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Product</th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Qty</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Price</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(expandedOrderDetails.items || []).map((item, index) => (
                                        <tr key={index} className="border-t hover:bg-gray-50">
                                          <td className="px-3 py-2 text-xs text-gray-900 font-medium">{item.productName}</td>
                                          <td className="px-3 py-2 text-xs text-center text-gray-600">{item.quantity}</td>
                                          <td className="px-3 py-2 text-xs text-right text-gray-900 font-semibold">
                                            Rs.{(item.subtotal || (item.priceAtPurchase * item.quantity) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                
                                <div>
                                  <h3 className="text-sm font-semibold mb-2 text-gray-800">Shipping Target Information</h3>
                                  <div className="border border-gray-200 p-3 text-xs bg-white rounded shadow-sm text-gray-700">
                                    {expandedOrderDetails.shippingAddress || expandedOrderDetails.shippingAddressId ? (
                                      typeof expandedOrderDetails.shippingAddress === 'object' && expandedOrderDetails.shippingAddress !== null ? (
                                        <>
                                          <p><span className="font-semibold text-gray-600">Name:</span> {expandedOrderDetails.shippingAddress.fullName || 'N/A'}</p>
                                          <p><span className="font-semibold text-gray-600">Address:</span> {expandedOrderDetails.shippingAddress.addressLine1 || 'N/A'}</p>
                                          {expandedOrderDetails.shippingAddress.addressLine2 && <p>{expandedOrderDetails.shippingAddress.addressLine2}</p>}
                                          <p>{expandedOrderDetails.shippingAddress.city || ''}, {expandedOrderDetails.shippingAddress.state || ''} {expandedOrderDetails.shippingAddress.zipCode || ''}</p>
                                          <p>{expandedOrderDetails.shippingAddress.country || ''}</p>
                                        </>
                                      ) : (
                                        <>
                                          <span className="font-semibold text-gray-600 block mb-1">Address Reference UUID:</span>
                                          <p className="font-mono bg-gray-50 p-2 border rounded border-dashed break-all text-gray-600 select-all">
                                            {expandedOrderDetails.shippingAddressId || String(expandedOrderDetails.shippingAddress)}
                                          </p>
                                        </>
                                      )
                                    ) : (
                                      <p className="text-gray-400 italic">No destination address mapping context available</p>
                                    )}
                                  </div>
                                  
                                  <h3 className="text-sm font-semibold mt-4 mb-2 text-gray-800">Payment Audit Logs</h3>
                                  <div className="border border-gray-200 p-3 text-xs bg-white rounded shadow-sm text-gray-700">
                                    <p><span className="font-semibold text-gray-600">Method Strategy:</span> {expandedOrderDetails.paymentMethod || 'N/A'}</p>
                                    {expandedOrderDetails.paymentId && (
                                      <p className="mt-1"><span className="font-semibold text-gray-600">Gateway Log ID:</span> {expandedOrderDetails.paymentId}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-sm text-gray-500 italic">Failed fetching active row payload</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Elements */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 0}
                className="px-4 py-2 mr-2 bg-gray-100 border text-gray-700 font-medium rounded-md text-sm disabled:opacity-40 hover:bg-gray-200 transition-colors shadow-sm"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 font-medium">
                Page {filters.page + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === totalPages - 1}
                className="px-4 py-2 ml-2 bg-gray-100 border text-gray-700 font-medium rounded-md text-sm disabled:opacity-40 hover:bg-gray-200 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Update Order Status</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Target Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedOrderId(null);
                }}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel Action
              </button>
              <button
                onClick={handleUpdateOrderStatus}
                disabled={updatingOrderId === selectedOrderId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-all shadow-sm"
              >
                {updatingOrderId === selectedOrderId ? 'Updating State...' : 'Commit Change'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancellation Processing Overlay Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border">
            <h2 className="text-xl font-bold mb-2 text-red-600">Cancel Order Execution</h2>
            <p className="mb-5 text-sm text-gray-600 leading-relaxed">
              Are you sure you want to flag this order transaction as cancelled? This action triggers absolute workflow reversal and cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedOrderId(null);
                }}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                No, Keep Active
              </button>
              <button
                onClick={handleDeleteOrder}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors shadow-sm"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default OrderManagement;