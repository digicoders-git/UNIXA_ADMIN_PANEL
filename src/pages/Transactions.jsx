// src/pages/Transactions.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getAllTransactions } from "../apis/transactions";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  FaCoins,
  FaSyncAlt,
  FaSearch,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartLine,
  FaChartPie,
  FaChartBar,
} from "react-icons/fa";


const fmtCurrency = (n) =>
  typeof n === "number"
    ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : n ?? "-";

export default function Transactions() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await getAllTransactions();
      console.log("Transactions received:", list);
      setTransactions(list);
    } catch (e) {
      console.error("Transaction fetch error:", e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load transaction history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (typeFilter !== "all") {
      list = list.filter((t) => (t.type || "order") === typeFilter);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();

    return list.filter((t) => {
      const tid = (t.transactionId || "").toLowerCase();
      const userName = (t.userId?.name || "").toLowerCase();
      const userEmail = (t.userId?.email || "").toLowerCase();
      const orderId = (t.orderId?._id || t.orderId || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      
      return (
        tid.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        orderId.includes(q) ||
        desc.includes(q)
      );
    });
  }, [transactions, search, statusFilter, typeFilter]);

  // Chart data calculations based on filtered transactions
  const chartData = useMemo(() => {
    let baseData = transactions;
    
    // Apply filters to base data for charts
    if (statusFilter !== "all") {
      baseData = baseData.filter((t) => t.status === statusFilter);
    }
    if (typeFilter !== "all") {
      baseData = baseData.filter((t) => (t.type || "order") === typeFilter);
    }

    // Status distribution
    const statusCount = {
      success: baseData.filter(t => t.status === 'success').length,
      failed: baseData.filter(t => t.status === 'failed').length,
      pending: baseData.filter(t => t.status === 'pending').length,
      refunded: baseData.filter(t => t.status === 'refunded').length,
    };

    // Payment method distribution
    const paymentMethods = {};
    baseData.forEach(t => {
      const method = t.paymentMethod || 'COD';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Payment gateway distribution
    const paymentGateways = {};
    baseData.forEach(t => {
      const gateway = t.paymentGateway || 'N/A';
      paymentGateways[gateway] = (paymentGateways[gateway] || 0) + 1;
    });

    // Daily revenue (last 7 days)
    const last7Days = [];
    const dailyRevenue = [];
    const dailyTransactions = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
      
      const dayTxns = baseData.filter(t => 
        new Date(t.createdAt).toISOString().split('T')[0] === dateStr && t.status === 'success'
      );
      dailyTransactions.push(dayTxns.length);
      dailyRevenue.push(dayTxns.reduce((sum, t) => sum + (t.amount || 0), 0));
    }

    // Revenue by payment method
    const revenueByMethod = {};
    baseData.filter(t => t.status === 'success').forEach(t => {
      const method = t.paymentMethod || 'COD';
      revenueByMethod[method] = (revenueByMethod[method] || 0) + (t.amount || 0);
    });

    return {
      statusCount,
      paymentMethods,
      paymentGateways,
      last7Days,
      dailyRevenue,
      dailyTransactions,
      revenueByMethod,
      totalRevenue: baseData.filter(t => t.status === 'success').reduce((sum, t) => sum + (t.amount || 0), 0),
      avgTransaction: baseData.filter(t => t.status === 'success').length > 0 
        ? baseData.filter(t => t.status === 'success').reduce((sum, t) => sum + (t.amount || 0), 0) / baseData.filter(t => t.status === 'success').length 
        : 0
    };
  }, [transactions, statusFilter, typeFilter]);


  const statusBadgeStyle = (status) => {
    const base = {
      padding: "4px 12px",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px"
    };

    switch (status) {
      case "success":
        return {
          ...base,
          backgroundColor: "#22c55e15",
          color: "#16a34a",
        };
      case "failed":
        return {
          ...base,
          backgroundColor: "#ef444415",
          color: "#dc2626",
        };
      case "pending":
        return {
          ...base,
          backgroundColor: "#eab30815",
          color: "#ca8a04",
        };
      default:
        return {
          ...base,
          backgroundColor: "#94a3b815",
          color: "#64748b",
        };
    }
  };

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: currentFont.family }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaFileInvoiceDollar className="text-[var(--color-primary)]" />
            Transaction History
          </h1>
          <p
            className="text-sm mt-1 opacity-75"
            style={{ color: themeColors.text }}
          >
            Monitor all incoming payments and transaction logs.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          >
            <option value="all">All Types</option>
            <option value="order">Orders</option>
            <option value="amc">AMC</option>
            <option value="rental">Rental</option>
            <option value="service">Service</option>
            <option value="refund">Refund</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <div className="relative">
            <span className="absolute left-3 top-3 text-xs opacity-50">
              <FaSearch />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, Customer, Order..."
              className="pl-9 pr-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 w-64"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchTransactions}
            className="px-4 py-2 rounded-lg border text-sm flex items-center gap-2 hover:opacity-80 transition-all font-semibold"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm border flex items-center gap-3"
          style={{
            backgroundColor: "#ef444410",
            borderColor: "#ef444430",
            color: "#dc2626",
          }}
        >
          <FaTimesCircle />
          {error}
        </div>
      )}

      {/* Stats Summary (Simplified) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border bg-white shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <FaCoins size={20} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Volume</p>
                  <p className="text-xl font-black text-gray-800">
                      {fmtCurrency(transactions.reduce((acc, curr) => acc + (curr.status === 'success' ? curr.amount : 0), 0))}
                  </p>
              </div>
          </div>
          <div className="p-4 rounded-xl border bg-white shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <FaCheckCircle size={20} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Successful</p>
                  <p className="text-xl font-black text-gray-800">{transactions.filter(t => t.status === 'success').length}</p>
              </div>
          </div>
          <div className="p-4 rounded-xl border bg-white shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <FaTimesCircle size={20} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Failed</p>
                  <p className="text-xl font-black text-gray-800">{transactions.filter(t => t.status === 'failed').length}</p>
              </div>
          </div>
      </div>

      {/* Charts Section */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction Status Distribution */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaChartPie className="text-blue-600" /> Status Distribution
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'pie', backgroundColor: 'transparent', height: 280, animation: { duration: 1000 } },
                title: { text: '' },
                credits: { enabled: false },
                plotOptions: {
                  pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                      enabled: true,
                      format: '<b>{point.name}</b>: {point.y}',
                      style: { fontSize: '11px' }
                    },
                    animation: { duration: 1000 }
                  }
                },
                series: [{
                  name: 'Transactions',
                  colorByPoint: true,
                  data: [
                    { name: 'Success', y: chartData.statusCount.success, color: '#22c55e' },
                    { name: 'Failed', y: chartData.statusCount.failed, color: '#ef4444' },
                    { name: 'Pending', y: chartData.statusCount.pending, color: '#f59e0b' },
                    { name: 'Refunded', y: chartData.statusCount.refunded, color: '#8b5cf6' }
                  ].filter(item => item.y > 0)
                }]
              }}
            />
          </div>

          {/* Payment Methods */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaChartBar className="text-purple-600" /> Payment Methods
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'column', backgroundColor: 'transparent', height: 280, animation: { duration: 1200 } },
                title: { text: '' },
                credits: { enabled: false },
                xAxis: {
                  categories: Object.keys(chartData.paymentMethods),
                  labels: { style: { color: themeColors.text } }
                },
                yAxis: {
                  min: 0,
                  title: { text: 'Count', style: { color: themeColors.text } },
                  labels: { style: { color: themeColors.text } }
                },
                legend: { enabled: false },
                plotOptions: {
                  column: {
                    borderRadius: 8,
                    dataLabels: { enabled: true },
                    animation: { duration: 1200 }
                  }
                },
                series: [{
                  name: 'Transactions',
                  data: Object.values(chartData.paymentMethods),
                  colorByPoint: true,
                  colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
                }]
              }}
            />
          </div>

          {/* Payment Gateways */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaChartPie className="text-green-600" /> Payment Gateways
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'pie', backgroundColor: 'transparent', height: 280, animation: { duration: 1000 } },
                title: { text: '' },
                credits: { enabled: false },
                plotOptions: {
                  pie: {
                    innerSize: '50%',
                    dataLabels: {
                      enabled: true,
                      format: '<b>{point.name}</b>: {point.y}',
                      style: { fontSize: '10px' }
                    },
                    animation: { duration: 1000 }
                  }
                },
                series: [{
                  name: 'Transactions',
                  colorByPoint: true,
                  data: Object.entries(chartData.paymentGateways).map(([name, y]) => ({ name, y }))
                }]
              }}
            />
          </div>

          {/* Revenue Trend (Last 7 Days) */}
          <div
            className="p-6 rounded-xl border shadow-sm lg:col-span-2"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaChartLine className="text-blue-600" /> Revenue Trend (Last 7 Days)
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'areaspline', backgroundColor: 'transparent', height: 280, animation: { duration: 1500 } },
                title: { text: '' },
                credits: { enabled: false },
                xAxis: {
                  categories: chartData.last7Days,
                  labels: { style: { color: themeColors.text } }
                },
                yAxis: [{
                  title: { text: 'Revenue (₹)', style: { color: themeColors.text } },
                  labels: { style: { color: themeColors.text }, format: '₹{value}' }
                }, {
                  title: { text: 'Transactions', style: { color: themeColors.text } },
                  labels: { style: { color: themeColors.text } },
                  opposite: true
                }],
                legend: { itemStyle: { color: themeColors.text } },
                plotOptions: {
                  areaspline: {
                    fillOpacity: 0.3,
                    marker: { enabled: true, radius: 4 },
                    animation: { duration: 1500 }
                  }
                },
                series: [
                  { name: 'Revenue', data: chartData.dailyRevenue, color: '#10b981', yAxis: 0 },
                  { name: 'Transactions', data: chartData.dailyTransactions, color: '#3b82f6', yAxis: 1 }
                ]
              }}
            />
          </div>

          {/* Revenue by Payment Method */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaCoins className="text-yellow-600" /> Revenue by Method
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'bar', backgroundColor: 'transparent', height: 280, animation: { duration: 1200 } },
                title: { text: '' },
                credits: { enabled: false },
                xAxis: {
                  categories: Object.keys(chartData.revenueByMethod),
                  labels: { style: { color: themeColors.text } }
                },
                yAxis: {
                  min: 0,
                  title: { text: 'Revenue (₹)', style: { color: themeColors.text } },
                  labels: { style: { color: themeColors.text }, format: '₹{value}' }
                },
                legend: { enabled: false },
                plotOptions: {
                  bar: {
                    borderRadius: 8,
                    dataLabels: { enabled: true, format: '₹{point.y}' },
                    animation: { duration: 1200 }
                  }
                },
                series: [{
                  name: 'Revenue',
                  data: Object.values(chartData.revenueByMethod),
                  colorByPoint: true,
                  colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
                }]
              }}
            />
          </div>
        </div>
      )}

      {/* Main Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaFileInvoiceDollar /> All Transactions
          </h2>
          <span className="text-sm opacity-70" style={{ color: themeColors.text }}>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b" style={{ backgroundColor: themeColors.background + "50" }}>
                {[
                  "Transaction ID",
                  "Customer",
                  "Amount",
                  "Gateway",
                  "Status",
                  "Details",
                  "Date & Time",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: themeColors.text }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-bold text-gray-400">Fetching records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FaCoins size={48} className="text-gray-300" />
                      <div>
                        <p className="text-gray-400 font-bold">No transactions found</p>
                        <p className="text-xs text-gray-400 mt-1">Transactions will appear here once customers make payments</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50 transition-colors group" style={{ borderBottom: `1px solid ${themeColors.border}40` }}>
                    <td className="px-4 py-4">
                      <div className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded w-fit opacity-70 group-hover:opacity-100 transition-opacity" title={t.transactionId}>
                        #{ (t.transactionId || t._id).slice(-8).toUpperCase() }
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold" style={{ color: themeColors.text }}>
                        {t.userId?.name || "Guest User"}
                      </div>
                      <div className="text-[10px] opacity-50" style={{ color: themeColors.text }}>
                        {t.userId?.email || t.userId?.phone || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-black" style={{ color: themeColors.text }}>
                        {fmtCurrency(t.amount)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[10px] font-bold uppercase tracking-tight opacity-70 mb-1" style={{ color: themeColors.text }}>
                        {t.paymentMethod || "COD"}
                      </div>
                      <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                        {t.paymentGateway || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div style={statusBadgeStyle(t.status || "pending")}>
                        {t.status === 'success' && <FaCheckCircle size={10} />}
                        {t.status === 'failed' && <FaTimesCircle size={10} />}
                        {t.status === 'pending' && <FaClock size={10} />}
                        {t.status || "pending"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[11px] opacity-70 truncate max-w-[150px]" style={{ color: themeColors.text }}>
                        {t.description || "Website Purchase"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          (t.type || 'order') === 'order' ? 'bg-blue-100 text-blue-700' :
                          (t.type || 'order') === 'amc' ? 'bg-purple-100 text-purple-700' :
                          (t.type || 'order') === 'rental' ? 'bg-green-100 text-green-700' :
                          (t.type || 'order') === 'service' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {t.type || 'order'}
                        </span>
                        {t.orderId && (
                          <div className="text-[9px] font-bold text-blue-500 uppercase">
                            ORD: { (t.orderId?._id || t.orderId).slice(-6).toUpperCase() }
                          </div>
                        )}
                        {t.referenceId && (
                          <div className="text-[9px] font-bold text-purple-500 uppercase">
                            REF: {t.referenceId.slice(-6).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[10px] font-bold" style={{ color: themeColors.text }}>
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[9px] opacity-50 uppercase tracking-tighter">
                        {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length > 0 && (
          <div className="p-4 border-t flex justify-between items-center text-sm" style={{ borderColor: themeColors.border, color: themeColors.text }}>
            <div className="opacity-70">
              Total: {filteredTransactions.length} transactions
            </div>
            <div className="font-bold">
              Total Amount: {fmtCurrency(filteredTransactions.filter(t => t.status === 'success').reduce((sum, t) => sum + (t.amount || 0), 0))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
