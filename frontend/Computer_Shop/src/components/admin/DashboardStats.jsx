import React from 'react';
import { BarChart3, Package, ShoppingCart, Users } from 'lucide-react';

const StatCard = ({ icon: Icon, title, value, bgColor }) => (
  <div className={`${bgColor} rounded-lg shadow-sm p-6 flex items-center space-x-4`}>
    <div className="p-3 bg-white rounded-full bg-opacity-30">
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-white text-opacity-80">{title}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  </div>
);

const DashboardStats = ({ productStats }) => {
  // Extract values directly from props with safe fallbacks for varying backend property names
  const customerCount = productStats?.customerCount ?? productStats?.totalCustomers ?? 0;
  const orderCount = productStats?.orderCount ?? productStats?.totalOrders ?? 0;
  const productCount = productStats?.productCount ?? productStats?.totalProducts ?? 0;
  const revenue = productStats?.revenue ?? 0;

  // Format numeric values to localized Sri Lankan Rupee representation
  const formatRevenue = (amount) => {
    const value = parseFloat(amount);
    if (isNaN(value)) return 'Rs.0.00';
    return `Rs.${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatCard
        icon={Users}
        title="Customers"
        value={customerCount}
        bgColor="bg-blue-500"
      />
      <StatCard
        icon={ShoppingCart}
        title="Orders"
        value={orderCount}
        bgColor="bg-green-500"
      />
      <StatCard
        icon={Package}
        title="Products"
        value={productCount}
        bgColor="bg-yellow-500"
      />
      <StatCard
        icon={BarChart3}
        title="Revenue"
        value={formatRevenue(revenue)}
        bgColor="bg-purple-500"
      />
    </div>
  );
};

export default DashboardStats;