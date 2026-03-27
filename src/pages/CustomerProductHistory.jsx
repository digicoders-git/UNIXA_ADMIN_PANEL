import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getCustomersFromOrders } from "../apis/customers";
import {
  FaSearch,
  FaUsers,
  FaBox,
  FaPhone,
  FaSync,
  FaEye,
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function CustomerProductHistory() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();
  const location = useLocation();
  const customerId = location.state?.customerId;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (customerId) {
      navigate(`/customer-detail/${customerId}`);
    }
  }, [customerId, navigate]);

  // Fetch customers list
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const customersData = await getCustomersFromOrders(search);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error("Failed to load data", error);
      Swal.fire("Error", "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAllData();
  }, [search, fetchAllData]);

  // Handle customer selection - navigate to detail page
  const handleSelectCustomer = (customer) => {
    navigate(`/customer-detail/${customer._id}`);
  };

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaBox className="text-purple-500" />
            Customer Order & AMC History
          </h1>
          <p className="text-sm opacity-60" style={{ color: themeColors.text }}>
            View complete order and AMC history for each customer
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs opacity-50">
              <FaSearch style={{ color: themeColors.text }} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none w-64"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchAllData}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 hover:bg-opacity-80 transition"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <FaSync className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div
          className="rounded-xl shadow-sm overflow-hidden border"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          {customers.length === 0 ? (
            <div className="p-8 text-center opacity-60">No customers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    style={{ backgroundColor: themeColors.background + "50", color: themeColors.text }}
                    className="text-[11px] font-bold uppercase tracking-widest border-b"
                  >
                    <th className="p-4">Customer</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Products (Orders)</th>
                    <th className="p-4">AMC Plans</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                  {customers.map((customer) => {
                    const orderCount = customer.orderCount || 0;
                    // Get unique product names
                    const productNames = Array.from(new Set((customer.orderItems || []).map(item => item.productName)));
                    
                    return (
                      <tr
                        key={customer._id}
                        className="hover:bg-slate-50/50 transition-colors"
                        style={{ borderBottom: `1px solid ${themeColors.border}40` }}
                      >
                        <td className="p-4">
                          <div className="font-bold text-sm" style={{ color: themeColors.text }}>
                            {customer.name}
                          </div>
                          <div className="text-[10px] opacity-60 font-bold tracking-tight" style={{ color: themeColors.text }}>
                            {[
                              customer.address?.house,
                              customer.address?.area,
                              customer.address?.city,
                              customer.address?.pincode
                            ].filter(Boolean).join(", ") || "N/A"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1 font-semibold">
                              <FaPhone size={10} className="text-blue-500" />
                              {customer.mobile}
                            </div>
                            <div className="text-[10px] opacity-60"> {customer.email} </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {productNames.length > 0 ? (
                              productNames.map((name, pIdx) => (
                                <span key={pIdx} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-bold">
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] opacity-50">No products</span>
                            )}
                            {orderCount > productNames.length && (
                              <span className="text-[10px] opacity-50 font-bold">+{orderCount - productNames.length} more</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs border border-green-100">
                               {customer.amcCount || 0}
                             </div>
                             <span className="text-[10px] font-bold opacity-60 uppercase">Plans</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleSelectCustomer(customer)}
                            className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-medium flex items-center gap-1 mx-auto"
                          >
                            <FaEye size={12} /> View History
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
