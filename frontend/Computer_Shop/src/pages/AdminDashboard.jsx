import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Search, ChevronsUpDown, MessageSquare } from 'lucide-react';
import { 
  getProducts, 
  deleteProduct,
  createProduct,
  updateProduct,
  getDashboardStats
} from '../services/productService';
import ProductModal from '../components/admin/ProductModal';
import ConfirmModal from '../components/admin/ConfirmModal';
import DashboardStats from '../components/admin/DashboardStats';
import OrderStatusChart from '../components/admin/OrderStatusChart';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from '../components/auth/FormElements';
import { useTheme } from '../context/ThemeContext';
import AdminAiChatDrawer from '../components/admin/adminAiChatDrawer';
import { getAllOrders } from '../services/orderService';

const AdminDashboard = () => {
  const { theme } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [productStats, setProductStats] = useState({});
  const [productSalesData, setProductSalesData] = useState([]);
  const [modalState, setModalState] = useState({
    showAdd: false,
    showEdit: false,
    showDelete: false,
    selectedProduct: null
  });

  const [filters, setFilters] = useState({
    query: '',
    categoryId: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'name',
    sortDirection: 'asc',
    page: 1,
    pageSize: 20
  });

  const [isAiOpen, setIsAiOpen] = useState(false);

  // Fetches the product list data from database repository
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProducts(filters);
      setProducts(data.items || []);
      setTotalItems(data.totalCount || 0);
    } catch (err) {
      setError(err.message || "Failed to load products");
      setProducts([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

 const fetchProductStats = useCallback(async () => {
    try {
      const stats = await getDashboardStats();
      
      // ✅ FIX: Match the exact property keys returned by getDashboardStats()
      const { customerCount, totalSales, activeCount, revenue } = stats;

      setProductStats({
        customerCount: customerCount || 0,
        productCount: activeCount || 0,
        orderCount: totalSales || 0,
        revenue: revenue || 0
      });
    } catch (err) {
      console.error("Failed aggregate compilation of distributed api metrics:", err.message);
    }
  }, []);

  const fetchProductSales = useCallback(async () => {
    try {
      const ordersData = await getAllOrders({ page: 0, size: 200 });
      const salesMap = new Map();

      const orders = ordersData?.content || [];

      orders.forEach((order) => {
        const items = Array.isArray(order.items) ? order.items : [];

        items.forEach((item) => {
          const productName = item.productName || item.name || 'Unknown Product';
          const quantity = Number(item.quantity || 0);
          const revenue = Number(item.subtotal || item.total || item.priceAtPurchase || 0) * quantity;

          if (!salesMap.has(productName)) {
            salesMap.set(productName, { name: productName, quantity: 0, revenue: 0 });
          }

          const current = salesMap.get(productName);
          current.quantity += quantity;
          current.revenue += revenue;
        });
      });

      const sortedSales = [...salesMap.values()]
        .filter((item) => item.quantity > 0 || item.revenue > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8);

      setProductSalesData(sortedSales);
    } catch (err) {
      console.error('Failed to load product sales data:', err.message);
      setProductSalesData([]);
    }
  }, []);

  // Sync operations layout execution windows
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
      fetchProductStats();
      fetchProductSales();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [fetchProducts, fetchProductStats, fetchProductSales]);

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, query: e.target.value, page: 1 }));
  };

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortDirection: prev.sortBy === column ? 
        prev.sortDirection === 'asc' ? 'desc' : 'asc' : 'asc'
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleProductSubmit = async (productData) => {
    try {
      if (modalState.selectedProduct) {
        await updateProduct(modalState.selectedProduct.id, productData);
      } else {
        await createProduct(productData);
      }
      fetchProducts();
      fetchProductStats(); // Refresh stats counters dynamically on item additions
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProduct(modalState.selectedProduct.id);
      fetchProducts();
      fetchProductStats(); // Refresh metrics on changes
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const openModal = (type, product = null) => {
    setModalState({
      showAdd: type === 'add',
      showEdit: type === 'edit',
      showDelete: type === 'delete',
      selectedProduct: product
    });
  };

  const closeModal = () => {
    setModalState({
      showAdd: false,
      showEdit: false,
      showDelete: false,
      selectedProduct: null
    });
  };

  // Prevent unexpected UI scaling errors by deriving boundaries cleanly
  const calculatedTotalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));

  return (
    <div className="container px-4 py-8 mx-auto">
      
      <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>

      
      {/* Dynamic Floating Action Trigger Button Node positioned on page body tail line layer */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-full hover:bg-gray-800 transition-all shadow-xl hover:scale-105 font-medium text-xs"
      >
        <MessageSquare size={16} className="text-blue-400" />
        Ask Data Agent
      </button>

      {/* Rest of your dashboard cards, charts, and product tables go here */}

      {/* Mount the AI drawer canvas context node block container */}
      <AdminAiChatDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
   
      {/* Render core metrics components wrapper passing analytical data */}
      <DashboardStats productStats={productStats} productSalesData={productSalesData} />

      <div className="mb-6" />
      
      <OrderStatusChart theme={theme} />

     
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {/* Structured Pagination Navigation Node */}
      <Pagination
        currentPage={filters.page}
        totalItems={totalItems}
        totalPages={calculatedTotalPages}
        itemsPerPage={filters.pageSize}
        onPageChange={handlePageChange}
        className="mt-6"
      />

      {/* Form Action Modals Context Layers */}
      <ProductModal
        isOpen={modalState.showAdd || modalState.showEdit}
        onClose={closeModal}
        onSubmit={handleProductSubmit}
        product={modalState.selectedProduct}
        mode={modalState.showAdd ? 'add' : 'edit'}
      />

      <ConfirmModal
        isOpen={modalState.showDelete}
        onClose={closeModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </div>
  );
};

export default AdminDashboard;