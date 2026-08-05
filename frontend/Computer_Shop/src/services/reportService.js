import api from './api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Fetches sales report data
 * @param {Object} params - Parameters for filtering the report
 */
export const getSalesReport = async (params = {}) => {
  try {
    const queryParams = { 
      ...params, 
      status: 'delivered',
      ...(params.category && { categoryId: params.category })
    };
    const response = await api.get('/reports/sales', { params: queryParams });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches repairs report data
 * @param {Object} params - Parameters for filtering the report
 */
export const getRepairsReport = async (params = {}) => {
  try {
    const queryParams = {
      ...params,
      status: 'completed',
      ...(params.category && { categoryId: params.category })
    };
    const response = await api.get('/reports/repairs', { params: queryParams });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches order report data
 * @param {Object} params - Parameters for filtering the report
 */
export const getOrderReport = async (params = {}) => {
  try {
    const apiParams = {};
    if (params.status) apiParams.status = params.status.toUpperCase();
    if (params.page !== undefined) apiParams.page = params.page;
    if (params.size !== undefined) apiParams.size = params.size;
    const response = await api.get('/orders', { params: apiParams });
    
    if (response.data && response.data.content) {
      return {
        content: response.data.content,
        totalPages: response.data.totalPages,
        totalElements: response.data.totalElements
      };
    } else {
      return response.data;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches inventory report data
 * @param {Object} params - Parameters for filtering the report
 */
export const getInventoryReport = async (params = {}) => {
  try {
    const apiParams = { 
      size: 1000, 
    };
    
    if (params.category) {
      apiParams.categoryId = params.category;
    }
    
    const response = await api.get('/products', { params: apiParams });
    
    const inventoryItems = (response.data.content || []).map(product => {
      let status = 'In Stock';
      if (product.stockQuantity <= 0) {
        status = 'Out of Stock';
      } else if (product.stockQuantity <= product.lowStockThreshold) {
        status = 'Low Stock';
      }
      
      const stockValue = (product.stockQuantity || 0) * (product.price || 0);
      
      return {
        id: product.productId,
        sku: product.sku || 'N/A',
        name: product.name,
        category: product.categoryName || 'Uncategorized',
        stock: product.stockQuantity || 0,
        stockValue: stockValue,
        reorderLevel: product.lowStockThreshold || 5,
        status: status,
        price: product.price || 0,
        brand: product.brand || 'N/A'
      };
    });
    
    if (params.lowStock) {
      return inventoryItems.filter(item => 
        item.status === 'Low Stock' || item.status === 'Out of Stock'
      );
    }
    
    return inventoryItems;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches customer report data
 * @param {Object} params - Parameters for filtering the report
 */
export const getCustomerReport = async (params = {}) => {
  try {
    const response = await api.get('/reports/customers', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches sales data directly from the orders API
 * @param {Object} params - Parameters for filtering orders
 */
export const fetchSalesDataFromOrders = async (params = {}) => {
  try {
    const queryParams = { 
      status: 'DELIVERED', 
      size: 100, 
      ...params
    };
    
    const response = await api.get('/orders', { params: queryParams });
    const orders = response.data.content || [];
    
    const summaryData = processSalesDataSummary(orders, params);
    const detailedData = processSalesDataDetailed(orders, params);
    
    return {
      summary: summaryData,
      detailed: detailedData,
      rawOrders: orders
    };
  } catch (error) {
    throw error;
  }
};

const processSalesDataSummary = (orders, filters) => {
  const parseDateString = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  const isDateInRange = (dateStr, startDateStr, endDateStr) => {
    if (!dateStr) return false;
    
    const date = parseDateString(dateStr);
    const startDate = startDateStr ? parseDateString(startDateStr) : null;
    const endDate = endDateStr ? parseDateString(endDateStr) : null;
    
    date.setHours(0, 0, 0, 0);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);
    
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  };
  
  const salesByDate = orders.reduce((acc, order) => {
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
    
    if (filters.startDate || filters.endDate) {
      if (!isDateInRange(orderDate, filters.startDate, filters.endDate)) {
        return acc; 
      }
    }
    
    if (!acc[orderDate]) {
      acc[orderDate] = {
        date: orderDate,
        orderCount: 0,
        sales: 0,
        itemsSold: 0,
      };
    }
    
    if (order.status === 'DELIVERED') {
      acc[orderDate].orderCount += 1;
      acc[orderDate].sales += parseFloat(order.finalAmount || 0);
      
      const itemCount = order.items ? order.items.reduce((sum, item) => 
        sum + (item.quantity || 0), 0) : 0;
      acc[orderDate].itemsSold += itemCount;
    }
    
    return acc;
  }, {});
  
  const salesData = Object.values(salesByDate).map(day => ({
    ...day,
    avgOrderValue: day.orderCount > 0 ? day.sales / day.orderCount : 0
  }));
  
  return salesData.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const processSalesDataDetailed = (orders, filters) => {
  const detailedSalesData = [];
  
  const parseDateString = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  const isDateInRange = (dateStr, startDateStr, endDateStr) => {
    if (!dateStr) return false;
    
    const date = parseDateString(dateStr);
    const startDate = startDateStr ? parseDateString(startDateStr) : null;
    const endDate = endDateStr ? parseDateString(endDateStr) : null;
    
    date.setHours(0, 0, 0, 0);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);
    
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  };
  
  orders.forEach(order => {
    if (order.status === 'DELIVERED' && order.items && order.items.length > 0) {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      
      if (filters.startDate || filters.endDate) {
        if (!isDateInRange(orderDate, filters.startDate, filters.endDate)) {
          return; 
        }
      }
      
      order.items.forEach(item => {
        detailedSalesData.push({
          id: `${order.orderId}-${item.productName}`,
          date: orderDate,
          orderId: order.orderId,
          orderReference: order.orderReference || order.orderId,
          itemName: item.productName,
          quantity: item.quantity,
          price: item.priceAtPurchase,
          total: item.subtotal
        });
      });
    }
  });
  
  return detailedSalesData.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Exports a report to PDF format
 */
export const exportReportToPdf = async (reportType, params = {}) => {
  try {
    if (reportType === 'inventory') {
      const inventoryData = await getInventoryReport(params);
      const doc = new jsPDF();
      
      const title = 'Inventory Report';
      const date = new Date().toLocaleDateString();
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${date}`, 14, 30);
      
      let yPos = 38;
      if (params.category) {
        doc.text(`Category Filter: ${params.category}`, 14, yPos);
        yPos += 8;
      }
      if (params.lowStock) {
        doc.text('Showing Low Stock Items Only', 14, yPos);
        yPos += 8;
      }
      
      const totalProducts = inventoryData.length;
      const totalStockValue = inventoryData.reduce((sum, item) => sum + Number(item.stockValue || 0), 0);
      const lowStockCount = inventoryData.filter(item => item.status === 'Low Stock').length;
      const outOfStockCount = inventoryData.filter(item => item.status === 'Out of Stock').length;
      
      doc.setFontSize(12);
      doc.text('Summary', 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Total Products: ${totalProducts}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Stock Value: Rs ${totalStockValue.toFixed(2)}`, 14, yPos);
      yPos += 6;
      doc.text(`Low Stock Items: ${lowStockCount}`, 14, yPos);
      yPos += 6;
      doc.text(`Out of Stock Items: ${outOfStockCount}`, 14, yPos);
      yPos += 10;
      
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.rect(14, yPos, 180, 8, 'F');
      
      doc.text('SKU', 16, yPos + 5);
      doc.text('Product Name', 36, yPos + 5);
      doc.text('Brand', 78, yPos + 5);
      doc.text('Category', 110, yPos + 5);
      doc.text('Price', 142, yPos + 5);
      doc.text('Stock', 160, yPos + 5);
      doc.text('Status', 178, yPos + 5);
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      
      let rowCount = 0;
      for (const item of inventoryData) {
        if (rowCount % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(14, yPos, 180, 7, 'F');
        }
        
        doc.text(item.sku || 'N/A', 16, yPos + 5);
        
        let productName = item.name || 'N/A';
        if (productName.length > 20) {
          productName = productName.substring(0, 18) + '...';
        }
        doc.text(productName, 36, yPos + 5);
        
        doc.text(item.brand || 'N/A', 78, yPos + 5);
        doc.text(item.category || 'N/A', 110, yPos + 5);
        doc.text(`Rs ${Number(item.price || 0).toFixed(2)}`, 142, yPos + 5);
        doc.text(String(item.stock || 0), 160, yPos + 5);
        
        if (item.status === 'Low Stock') {
          doc.setTextColor(255, 0, 0); 
          doc.text(item.status, 178, yPos + 5);
          doc.setTextColor(0, 0, 0); 
        } else if (item.status === 'Out of Stock') {
          doc.setTextColor(180, 0, 0); 
          doc.text(item.status, 178, yPos + 5);
          doc.setTextColor(0, 0, 0); 
        } else {
          doc.text(item.status || 'N/A', 178, yPos + 5);
        }
        
        yPos += 7;
        rowCount++;
        
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
          rowCount = 0;
        }
      }
      return doc.output('blob');
    }
    
    if (reportType === 'sales') {
      const salesData = await fetchSalesDataFromOrders(params);
      const doc = new jsPDF();
      
      const title = 'Sales Report';
      const date = new Date().toLocaleDateString();
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${date}`, 14, 30);
      
      let yPos = 38;
      if (params.startDate) {
        doc.text(`Start Date: ${params.startDate}`, 14, yPos);
        yPos += 7;
      }
      if (params.endDate) {
        doc.text(`End Date: ${params.endDate}`, 14, yPos);
        yPos += 7;
      }
      
      const summaryData = salesData.summary;
      const totalSales = summaryData.reduce((sum, item) => sum + Number(item.sales || 0), 0);
      const totalOrders = summaryData.reduce((sum, item) => sum + Number(item.orderCount || 0), 0);
      const totalItems = summaryData.reduce((sum, item) => sum + Number(item.itemsSold || 0), 0);
      const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;
      
      doc.setFontSize(14);
      doc.text('Sales Summary', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.text(`Total Sales: Rs ${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Orders: ${totalOrders}`, 14, yPos);
      yPos += 6;
      doc.text(`Items Sold: ${totalItems}`, 14, yPos);
      yPos += 6;
      doc.text(`Average Order Value: Rs ${avgOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
      yPos += 12;
      
      doc.setFontSize(14);
      doc.text('Daily Sales Summary', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Orders', 'Sales Amount (Rs)', 'Items Sold', 'Avg Order Value (Rs)']],
        body: summaryData.map(item => [
          new Date(item.date).toLocaleDateString(),
          item.orderCount,
          Number(item.sales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          item.itemsSold,
          Number(item.avgOrderValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Sales Report - Detailed Items', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${date}`, 14, 30);
      yPos = 40;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Order ID', 'Item Name', 'Quantity', 'Price (Rs)', 'Total (Rs)']],
        body: salesData.detailed.map(item => [
          new Date(item.date).toLocaleDateString(),
          item.orderReference || item.orderId,
          item.itemName,
          item.quantity,
          Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      return doc.output('blob');
    }
    
    if (reportType === 'customers' && Array.isArray(params.data) && Array.isArray(params.columns)) {
      const doc = new jsPDF();
      const title = 'Customer Report';
      const date = new Date().toLocaleDateString();
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${date}`, 14, 30);
      let yPos = 38;
      if (params.startDate) {
        doc.text(`Start Date: ${params.startDate}`, 14, yPos);
        yPos += 7;
      }
      if (params.endDate) {
        doc.text(`End Date: ${params.endDate}`, 14, yPos);
        yPos += 7;
      }
      
      const head = [params.columns.map(col => col.label)];
      const body = params.data.map(row => params.columns.map(col => {
        if (col.format) return col.format(row[col.key], row);
        return row[col.key] ?? '';
      }));
      
      autoTable(doc, {
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      return doc.output('blob');
    }
    
    if (reportType === 'orderdetails') {
      const responseData = await getOrderReport(params);
      
      // ✅ FIX: Safely parse array list context from the paginated envelope container structure
      const orderData = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.content || responseData?.items || []);
        
      const doc = new jsPDF();
      const title = 'Order Report';
      const date = new Date().toLocaleDateString();
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${date}`, 14, 30);
      
      let yPos = 38;
      if (params.startDate) {
        doc.text(`Start Date: ${params.startDate}`, 14, yPos);
        yPos += 7;
      }
      if (params.endDate) {
        doc.text(`End Date: ${params.endDate}`, 14, yPos);
        yPos += 7;
      }
      if (params.status) {
        doc.text(`Status: ${params.status}`, 14, yPos);
        yPos += 7;
      }
      
      const totalOrders = orderData.length;
      const totalAmount = orderData.reduce((sum, item) => sum + Number(item.totalAmount || item.finalAmount || 0), 0);
      const avgOrderValue = totalOrders ? totalAmount / totalOrders : 0;
      
      const statusCounts = {};
      orderData.forEach(order => {
        const status = order.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      doc.setFontSize(14);
      doc.text('Order Summary', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.text(`Total Orders: ${totalOrders}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Amount: Rs ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
      yPos += 6;
      doc.text(`Average Order Value: Rs ${avgOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
      yPos += 6;
      
      doc.text('Status Breakdown:', 14, yPos);
      yPos += 6;
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        doc.text(`${status}: ${count} orders`, 24, yPos);
        yPos += 5;
      });
      
      yPos += 6;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Order ID', 'Date', 'Customer', 'Items Count', 'Amount (Rs)', 'Status']],
        body: orderData.map(order => [
          String(order.orderId || order.id || 'N/A').substring(0, 8) + '...',
          order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
          order.customerEmail || 'N/A',
          order.items ? order.items.reduce((s, i) => s + (i.quantity || 0), 0) : (order.itemCount || 0),
          Number(order.totalAmount || order.finalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          order.status || 'UNKNOWN'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      return doc.output('blob');
    }
    
    throw new Error(`PDF export not implemented for report type: ${reportType}`);
  } catch (error) {
    console.error("PDF generation pipeline break:", error);
    throw error;
  }
};

/**
 * Exports a report to CSV format
 */
export const exportReportToCsv = async (reportType, params = {}) => {
  try {
    if (reportType === 'inventory') {
      const inventoryData = await getInventoryReport(params);
      const headers = ['SKU', 'Product Name', 'Brand', 'Category', 'Price', 'Stock Level', 'Stock Value', 'Reorder Level', 'Status'];
      const rows = inventoryData.map(item => [
        item.sku || 'N/A',
        item.name || 'N/A',
        item.brand || 'N/A',
        item.category || 'N/A',
        `Rs ${Number(item.price || 0).toFixed(2)}`,
        String(item.stock || 0),
        `Rs ${Number(item.stockValue || 0).toFixed(2)}`,
        String(item.reorderLevel || 0),
        item.status || 'N/A'
      ]);
      
      const escapeCSV = (value) => {
        value = String(value || '');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');
      
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    if (reportType === 'sales') {
      const salesData = await fetchSalesDataFromOrders(params);
      
      const escapeCSV = (value) => {
        value = String(value || '');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      const summaryHeaders = ['Date', 'Orders', 'Sales Amount (Rs)', 'Items Sold', 'Avg Order Value (Rs)'];
      const summaryRows = salesData.summary.map(item => [
        new Date(item.date).toLocaleDateString(),
        item.orderCount,
        Number(item.sales).toFixed(2),
        item.itemsSold,
        Number(item.avgOrderValue).toFixed(2)
      ]);
      
      const summaryCsv = [
        ['SALES REPORT SUMMARY'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [''],
        summaryHeaders.map(escapeCSV).join(','),
        ...summaryRows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');
      
      const detailedHeaders = ['Date', 'Order ID', 'Item Name', 'Quantity', 'Price (Rs)', 'Total (Rs)'];
      const detailedRows = salesData.detailed.map(item => [
        new Date(item.date).toLocaleDateString(),
        item.orderReference || item.orderId,
        item.itemName,
        item.quantity,
        Number(item.price).toFixed(2),
        Number(item.total).toFixed(2)
      ]);
      
      const detailedCsv = [
        [''],
        [''],
        ['DETAILED SALES ITEMS'],
        detailedHeaders.map(escapeCSV).join(','),
        ...detailedRows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');
      
      const fullCsvContent = summaryCsv + '\n' + detailedCsv;
      return new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    if (reportType === 'customers' && Array.isArray(params.data) && Array.isArray(params.columns)) {
      const headers = params.columns.map(col => col.label);
      const rows = params.data.map(row => params.columns.map(col => {
        let value = col.format ? col.format(row[col.key], row) : row[col.key] ?? '';
        value = String(value);
        if (value.includes('"')) value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
          value = `"${value}"`;
        }
        return value;
      }));
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\r\n');
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    if (reportType === 'orders') {
      const responseData = await getOrderReport(params);
      
      // ✅ FIX: Safely parse array context here for the CSV generator too
      const orderData = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.content || responseData?.items || []);
        
      const headers = ['Order ID', 'Date', 'Customer Email', 'Amount (Rs)', 'Status'];
      
      const rows = orderData.map(order => [
        order.orderId || order.id || 'N/A',
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
        order.customerEmail || 'N/A',
        Number(order.totalAmount || order.finalAmount || 0).toFixed(2),
        order.status || 'UNKNOWN'
      ]);
      
      let csvContent = headers.join(',') + '\n';
      
      rows.forEach(row => {
        const escapedRow = row.map(value => {
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvContent += escapedRow.join(',') + '\n';
      });
      
      csvContent += '\n"Order Summary"\n';
      const totalOrders = orderData.length;
      const totalAmount = orderData.reduce((sum, item) => sum + Number(item.totalAmount || item.finalAmount || 0), 0);
      const avgOrderValue = totalOrders ? totalAmount / totalOrders : 0;
      
      csvContent += `"Total Orders",${totalOrders}\n`;
      csvContent += `"Total Amount","Rs ${totalAmount.toFixed(2)}"\n`;
      csvContent += `"Average Order Value","Rs ${avgOrderValue.toFixed(2)}"\n`;
      
      csvContent += '\n"Status Breakdown"\n';
      const statusCounts = {};
      orderData.forEach(order => {
        const status = order.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        csvContent += `"${status}",${count}\n`;
      });
      
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    throw new Error(`CSV export not implemented for report type: ${reportType}`);
  } catch (error) {
    console.error("CSV generation pipeline break:", error);
    throw error;
  }
};

/**
 * Helper function to download blob as file
 */
export const downloadBlob = (blob, fileName) => {
  try {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Blob download pipeline exception:", error);
    throw error;
  }
};