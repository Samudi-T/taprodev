import React from 'react';
import { BarChart3, Package, ShoppingCart, Users, Trophy, TrendingUp } from 'lucide-react';
import ReportChart from '../reports/ReportChart';

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

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return 'Rs.0.00';
  return `Rs.${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DashboardStats = ({ productStats, productSalesData = [] }) => {
  const customerCount = productStats?.customerCount ?? productStats?.totalCustomers ?? 0;
  const orderCount = productStats?.orderCount ?? productStats?.totalOrders ?? 0;
  const productCount = productStats?.productCount ?? productStats?.totalProducts ?? 0;
  const revenue = productStats?.revenue ?? 0;

  const normalizedSales = [...productSalesData]
    .map((item) => ({
      name: item.name || item.productName || 'Unknown Product',
      quantity: Number(item.quantity || 0),
      revenue: Number(item.revenue || item.total || 0),
    }))
    .filter((item) => item.quantity > 0 || item.revenue > 0)
    .sort((a, b) => b.quantity - a.quantity);

  const topProduct = normalizedSales[0] || { name: 'No sales yet', quantity: 0, revenue: 0 };
  const totalUnitsSold = normalizedSales.reduce((sum, item) => sum + item.quantity, 0);
  const totalProductRevenue = normalizedSales.reduce((sum, item) => sum + item.revenue, 0);
  const averageSalePerProduct = normalizedSales.length ? totalProductRevenue / normalizedSales.length : 0;

  const chartData = {
    labels: normalizedSales.slice(0, 6).map((item) => {
      const maxLength = 14;
      return item.name.length > maxLength ? `${item.name.slice(0, maxLength)}...` : item.name;
    }),
    datasets: [
      {
        label: 'Units Sold',
        data: normalizedSales.slice(0, 6).map((item) => item.quantity),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'],
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'x',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw} units`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
          value={formatCurrency(revenue)}
          bgColor="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Product-wise sales</h3>
              <p className="text-sm text-gray-500">Top sold items this period</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
          </div>

          {normalizedSales.length > 0 ? (
            <ReportChart type="bar" data={chartData} options={chartOptions} theme="light" height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
              No product sales data available yet.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-yellow-500" size={18} />
            <h3 className="text-lg font-semibold text-gray-800">Sales stats</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Top product</p>
              <p className="mt-2 text-lg font-semibold text-gray-800">{topProduct.name}</p>
              <p className="text-sm text-blue-700">{topProduct.quantity} units sold</p>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-green-700">Units sold</p>
              <p className="mt-2 text-2xl font-bold text-gray-800">{totalUnitsSold}</p>
            </div>

            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-purple-700">Avg. product value</p>
              <p className="mt-2 text-lg font-semibold text-gray-800">{formatCurrency(averageSalePerProduct)}</p>
            </div>
          </div>

          <div className="mt-5 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Top products</p>
            <div className="space-y-2">
              {normalizedSales.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm text-gray-700">
                  <span className="truncate pr-3">{item.name}</span>
                  <span className="font-medium">{item.quantity} sold</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;