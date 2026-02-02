// src/pages/Transactions.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getAllTransactions } from "../apis/transactions";
import {
  FaCoins,
  FaSyncAlt,
  FaSearch,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await getAllTransactions();
      setTransactions(list);
    } catch (e) {
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
  }, [transactions, search, statusFilter]);


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

      {/* Main Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
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
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No transactions found in history.
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
                        {t.userId?.email || "-"}
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
                      <div style={statusBadgeStyle(t.status || "pending")} className="uppercase tracking-widest text-[9px] px-3 py-1 font-black">
                        {t.status || "pending"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[11px] opacity-70 truncate max-w-[150px]" style={{ color: themeColors.text }}>
                        {t.description || "Website Purchase"}
                      </div>
                      {t.orderId && (
                        <div className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">
                          ORD: { (t.orderId?._id || t.orderId).slice(-6).toUpperCase() }
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[10px] font-bold" style={{ color: themeColors.text }}>
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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
      </div>
    </div>
  );
}
