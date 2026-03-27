import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { 
  getCustomerCompleteHistory, 
  renewAmc, 
  createManualAmc 
} from "../apis/userAmc";
import http from "../apis/http";
import { listAmcPlans } from "../apis/amcPlans";
import { listProducts } from "../apis/products";
import { createOfflineOrder } from "../apis/orders";
import {
  FaArrowLeft,
  FaUsers,
  FaBox,
  FaShieldAlt,
  FaPhone,
  FaMapMarkerAlt,
  FaTools,
  FaHistory,
  FaSync,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function CustomerDetailPage() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookServiceModal, setShowBookServiceModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    scheduledDate: new Date().toISOString().split('T')[0],
  });
  const [employees, setEmployees] = useState([]);
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [showTechDropdown, setShowTechDropdown] = useState(false);

  // Add Order Modal
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const [orderAmcPlans, setOrderAmcPlans] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [newOrderItem, setNewOrderItem] = useState({ productId: "", amcId: "", quantity: 1 });
  const [orderPaymentMethod, setOrderPaymentMethod] = useState("Cash");
  const [orderPaymentStatus, setOrderPaymentStatus] = useState("paid");
  const [orderStatus, setOrderStatus] = useState("confirmed");
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [showOrderProductDropdown, setShowOrderProductDropdown] = useState(false);
  const [orderAmcSearch, setOrderAmcSearch] = useState("");
  const [showOrderAmcDropdown, setShowOrderAmcDropdown] = useState(false);

  // Fetch customer history
  const fetchCustomerHistory = useCallback(async () => {
    try {
      setLoading(true);
      const history = await getCustomerCompleteHistory(customerId);
      setCustomer(history.customer);
      setOrders(history.orders || []);
      setAmcs(history.amcs || []);
    } catch (error) {
      console.error("Failed to load customer details", error);
      Swal.fire("Error", "Failed to load customer details", "error");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerHistory();
    // Fetch employees for dropdown
    const fetchEmployees = async () => {
      try {
        const { data } = await http.get('/api/employees');
        setEmployees(data || []);
      } catch (error) {
        console.error("Failed to fetch employees", error);
      }
    };
    fetchEmployees();
    // Fetch products & amc plans for order modal
    listProducts().then(setOrderProducts).catch(console.error);
    listAmcPlans(true).then(setOrderAmcPlans).catch(console.error);
  }, [fetchCustomerHistory]);

  const fmtCurrencySimple = (n) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const handleAddOrderItem = () => {
    if (!newOrderItem.productId) return;
    const product = orderProducts.find(p => (p._id || p.id) === newOrderItem.productId);
    if (!product) return;
    const amc = newOrderItem.amcId ? orderAmcPlans.find(a => a._id === newOrderItem.amcId) : null;
    const amcPrice = amc ? amc.price : 0;
    const itemPrice = (product.price || product.sellingPrice || 0) + amcPrice;
    const existing = orderItems.findIndex(it => it.productId === newOrderItem.productId && it.amcId === newOrderItem.amcId);
    if (existing > -1) {
      const updated = [...orderItems];
      updated[existing].quantity += parseInt(newOrderItem.quantity);
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        productId: newOrderItem.productId,
        name: product.name,
        price: itemPrice,
        productPrice: product.price || product.sellingPrice || 0,
        quantity: parseInt(newOrderItem.quantity),
        amcId: amc ? (amc.amcId || `AMC-${Date.now()}`) : undefined,
        amcPlan: amc ? amc._id : undefined,
        amcPlanName: amc ? amc.name : undefined,
        amcPrice,
      }]);
    }
    setNewOrderItem({ productId: "", amcId: "", quantity: 1 });
  };

  const handleSubmitAddOrder = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      Swal.fire("Error", "Kam se kam ek item add karo", "error");
      return;
    }
    try {
      const addr = customer.address || {};
      const totalAmount = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      await createOfflineOrder({
        shippingAddress: {
          name: customer.name,
          phone: customer.mobile,
          addressLine1: `${addr.house || ""} ${addr.area || ""}`.trim() || "N/A",
          city: addr.city || "N/A",
          state: addr.state || "N/A",
          pincode: addr.pincode || "000000",
        },
        items: orderItems.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          productPrice: it.productPrice,
          amcPrice: it.amcPrice || 0,
          price: it.price,
          productName: it.name,
          amcId: it.amcId || null,
          amcPlan: it.amcPlan || null,
          amcPlanName: it.amcPlanName || null,
        })),
        total: totalAmount,
        paymentMethod: orderPaymentMethod,
        paymentStatus: orderPaymentStatus,
        status: orderStatus,
        source: "offline",
      });
      Swal.fire("Success", "Order create ho gaya!", "success");
      setShowAddOrderModal(false);
      setOrderItems([]);
      setNewOrderItem({ productId: "", amcId: "", quantity: 1 });
      fetchCustomerHistory();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Order create karne mein error aaya", "error");
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      delivered: "bg-green-100 text-green-700",
      confirmed: "bg-blue-100 text-blue-700",
      shipped: "bg-cyan-100 text-cyan-700",
      cancelled: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
      active: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      inactive: "bg-gray-100 text-gray-700",
      paid: "bg-green-100 text-green-700",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  // Format currency
  const fmtCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val || 0);
  };

  // Format date
  const fmtDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get AMC for product - match by productId first, then productName
  const getAmcForProduct = (order) => {
    return amcs.find(amc =>
      (order.product && amc.productId && String(amc.productId) === String(order.product)) ||
      (amc.productName?.toLowerCase() === order.productName?.toLowerCase())
    );
  };

  // Handle AMC Renewal or Purchase
  const handleRenewOrPurchaseAmc = async (order, existingAmc) => {
    try {
      Swal.fire({
        title: 'Loading AMC Plans...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const plans = await listAmcPlans(true);
      Swal.close();

      if (!plans || plans.length === 0) {
        Swal.fire("Error", "No active AMC plans available", "error");
        return;
      }

      const { value: planResult } = await Swal.fire({
        title: existingAmc ? 'Renew AMC Subscription' : 'Purchase AMC Plan',
        html: `
          <div class="text-left space-y-4">
            <div class="p-3 bg-blue-50 rounded border border-blue-100 mb-4">
              <p class="text-xs font-bold text-blue-800 uppercase">Selected Product</p>
              <p class="font-bold text-sm">${order.productName}</p>
            </div>
            
            <div class="mb-3">
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Select AMC Plan</label>
              <select id="swal-plan-id" class="w-full p-2 border rounded text-sm bg-white">
                ${plans.map(p => `<option value="${p._id}" data-price="${p.price}" data-months="${p.durationMonths}" data-services="${p.servicesIncluded || 4}">${p.name} (₹${p.price})</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Duration (Months)</label>
                <input id="swal-duration" type="number" value="12" class="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Price Paid</label>
                <input id="swal-price" type="number" class="w-full p-2 border rounded text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Total Services</label>
              <input id="swal-services" type="number" value="4" class="w-full p-2 border rounded text-sm" />
            </div>

            <div class="text-[10px] text-gray-500 italic mt-2">
              Note: This will create a fresh AMC record starting from today.
            </div>
          </div>
        `,
        didOpen: () => {
          const select = document.getElementById('swal-plan-id');
          const durationInput = document.getElementById('swal-duration');
          const priceInput = document.getElementById('swal-price');
          const servicesInput = document.getElementById('swal-services');

          const handleZeroDuration = () => {
            const isZero = parseInt(durationInput.value) === 0;
            if (isZero) {
              priceInput.value = 0;
              priceInput.disabled = true;
              priceInput.style.backgroundColor = "#f3f4f6";
              servicesInput.value = 0;
              servicesInput.disabled = true;
              servicesInput.style.backgroundColor = "#f3f4f6";
            } else {
              priceInput.disabled = false;
              priceInput.style.backgroundColor = "white";
              servicesInput.disabled = false;
              servicesInput.style.backgroundColor = "white";
            }
          };

          const updateFields = () => {
            const opt = select.options[select.selectedIndex];
            durationInput.value = opt.dataset.months;
            priceInput.value = opt.dataset.price;
            servicesInput.value = opt.dataset.services;
            handleZeroDuration();
          };

          select.addEventListener('change', updateFields);
          durationInput.addEventListener('input', handleZeroDuration);
          updateFields();
        },
        showCancelButton: true,
        confirmButtonText: existingAmc ? 'Renew Subscription' : 'Activate AMC',
        confirmButtonColor: '#059669',
        preConfirm: () => {
          const planId = document.getElementById('swal-plan-id').value;
          const planName = document.getElementById('swal-plan-id').options[document.getElementById('swal-plan-id').selectedIndex].text.split(' (')[0];
          const duration = parseInt(document.getElementById('swal-duration').value);
          const price = parseFloat(document.getElementById('swal-price').value);
          const services = parseInt(document.getElementById('swal-services').value);

          if (isNaN(duration) || duration < 0) return Swal.showValidationMessage('Invalid duration');
          if (isNaN(price)) return Swal.showValidationMessage('Invalid price');

          return { planId, planName, duration, price, services };
        }
      });

      if (planResult) {
        Swal.fire({
          title: 'Processing...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        if (existingAmc) {
          await renewAmc(existingAmc._id, {
            durationMonths: planResult.duration,
            servicesTotal: planResult.services,
            pricePaid: planResult.price,
            startDate: new Date().toISOString()
          });
        } else {
          await createManualAmc({
            userId: customer.userId || null,
            orderId: order.orderId || order._id || null,
            productId: order.product,
            productType: order.productType || 'Product',
            productName: order.productName,
            productImage: order.productImage,
            amcPlanId: planResult.planId,
            amcPlanName: planResult.planName,
            amcPlanPrice: planResult.price,
            durationMonths: planResult.duration,
            servicesTotal: planResult.services,
            startDate: new Date().toISOString(),
            customerPhone: customer.mobile || null
          });
        }

        Swal.fire("Success", existingAmc ? "AMC Renewed Successfully!" : "AMC Plan Activated Successfully!", "success");
        fetchCustomerHistory();
      }
    } catch (err) {
      console.error("AMC Action Error:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to process AMC action", "error");
    }
  };

  // Handle book service
  const handleBookService = (product, amc) => {
    setSelectedProduct({ ...product, amc });
    setShowBookServiceModal(true);
  };

  // Submit service booking
  const handleSubmitService = async () => {
    if (!serviceForm.technicianName || !serviceForm.scheduledDate) {
      Swal.fire("Error", "Please fill all required fields", "error");
      return;
    }

    try {
      Swal.fire({
        title: 'Booking...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const adminData = JSON.parse(localStorage.getItem('admin-data') || '{}');
      const addressString = `${customer.address?.house || ''} ${customer.address?.area || ''} ${customer.address?.city || ''} ${customer.address?.pincode || ''}`.trim();

      await http.post('/api/assigned-tickets', {
        title: `${serviceForm.serviceType} - ${customer.name}`,
        ticketType: 'service_request', // Always use valid enums, 'installation' is not in enum
        customerName: customer.name,
        customerPhone: customer.mobile,
        address: addressString,
        description: `Regular ${serviceForm.serviceType} for ${selectedProduct.productName}. ${serviceForm.notes}`,
        priority: 'Medium',
        status: 'Pending',
        assignedBy: adminData.name || 'Admin',
        assignedTo: serviceForm.technicianName,
        amcId: selectedProduct.amc?._id, // Add amcId back so it links to AMC history
        userId: customer.userId || customer._id,
        productId: selectedProduct.product || selectedProduct._id,
        dueDate: serviceForm.scheduledDate
      });

      Swal.fire("Success", "Service ticket assigned successfully!", "success");
      setShowBookServiceModal(false);
      setServiceForm({
        serviceType: "Regular Service",
        technicianName: "",
        notes: "",
        scheduledDate: new Date().toISOString().split('T')[0],
      });
      fetchCustomerHistory();
    } catch (error) {
      console.error("Booking error:", error);
      Swal.fire("Error", error.response?.data?.message || "Failed to book service", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg font-bold mb-4">Customer not found</p>
          <button
            onClick={() => navigate("/customer-history")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header - Fixed */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] p-6 border-b shadow-lg"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/customer-history")}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FaArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FaUsers className="text-purple-500" />
                {customer.name}
              </h1>
              <p className="text-xs opacity-60 mt-1">Complete Product & AMC History</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddOrderModal(true)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition shadow"
            >
              <FaPlus /> Add Order
            </button>
            <button
              onClick={fetchCustomerHistory}
              className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 hover:bg-opacity-80 transition"
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
            >
              <FaSync /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content - Scrollable with top margin for fixed header */}
      <div className="pt-28 p-6 space-y-6 pb-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border bg-blue-50/30 border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Products</p>
              <p className="text-2xl font-black mt-1 text-blue-900">{orders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FaBox size={24} />
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-green-50/30 border-green-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Active AMCs</p>
              <p className="text-2xl font-black mt-1 text-green-900">
                {amcs.filter(a => a.status === 'Active' && new Date(a.endDate) > new Date()).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <FaCheckCircle size={24} />
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-red-50/30 border-red-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Inactive AMCs</p>
              <p className="text-2xl font-black mt-1 text-red-900">
                {amcs.filter(a => a.status !== 'Active' || new Date(a.endDate) <= new Date()).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <FaTimesCircle size={24} />
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: themeColors.background + "50", borderColor: themeColors.border }}
        >
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <FaUsers size={14} /> Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FaPhone className="text-blue-500" />
              <div>
                <p className="opacity-60 text-xs">Phone</p>
                <p className="font-semibold">{customer.mobile}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="text-blue-500 mt-1" />
              <div>
                <p className="opacity-60 text-xs">Address</p>
                <p className="font-semibold">
                  {[
                    customer.address?.house,
                    customer.address?.area,
                    customer.address?.city,
                    customer.address?.pincode
                  ].filter(Boolean).join(", ") || "Address not available"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products with AMC Status */}
        <div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FaBox className="text-purple-500" /> Products & AMC Status ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <div
              className="p-4 rounded-lg text-center opacity-60 text-sm"
              style={{ backgroundColor: themeColors.background + "50" }}
            >
              No products found
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[11px] uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background + "50" }}>
                    <tr>
                      <th className="p-4">Product / Order</th>
                      <th className="p-4">Delivery Status</th>
                      <th className="p-4">AMC Status</th>
                      <th className="p-4">Plan Details</th>
                      <th className="p-4">Services</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                    {orders.map((order, idx) => {
                      const productAmc = getAmcForProduct(order);
                      const isExpired = productAmc && (productAmc.status === 'Expired' || new Date(productAmc.endDate) < new Date());
                      const amcStatus = isExpired ? "Expired" : (productAmc?.status || "No AMC");
                      const isAmcActive = productAmc?.status === "Active" && !isExpired;
                      
                      // Only show if AMC was actually taken (has valid plan name and status)
                      const hasValidAmc = productAmc && productAmc.amcPlanName && productAmc.status !== 'Not Taken';
                      
                      return (
                        <tr key={idx} className="hover:bg-black/5 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-bold text-sm">{order.productName || "N/A"}</div>
                            <div className="text-[10px] opacity-60 uppercase font-bold tracking-tight">
                              ID: {order._id?.slice(-6).toUpperCase()} | {fmtDate(order.createdAt)}
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                                amcStatus === "Active" ? "bg-green-100 text-green-700" :
                                amcStatus === "Expired" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {hasValidAmc ? amcStatus : "No AMC"}
                            </span>
                            {hasValidAmc && isAmcActive && (
                              <div className="text-[10px] text-green-600 font-bold mt-1">
                                Ends: {fmtDate(productAmc.endDate)}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {hasValidAmc ? (
                              <div className="max-w-[150px]">
                                <div className="font-bold text-blue-600 truncate">{productAmc.amcPlanName}</div>
                                <div className="text-[10px] opacity-60">{fmtCurrency(productAmc.amcPlanPrice)}</div>
                              </div>
                            ) : (
                              <span className="opacity-40 italic">No Plan Activated</span>
                            )}
                          </td>
                          <td className="p-4">
                            {hasValidAmc ? (
                              <div>
                                <div className="font-bold">{productAmc.servicesUsed || 0} / {productAmc.servicesTotal || 4}</div>
                                <div className="text-[10px] opacity-60">Visits Used</div>
                              </div>
                            ) : (
                              <span className="opacity-40">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* Book Service */}
                              <button
                                onClick={() => handleBookService(order, productAmc)}
                                className={`p-2 rounded-lg transition ${
                                  isAmcActive ? 'text-green-600 hover:bg-green-50' : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title={isAmcActive ? "Book AMC Service" : "Book Regular Service"}
                              >
                                <FaTools size={14} />
                              </button>

                              {/* Renew / Purchase */}
                              {(!hasValidAmc || isExpired) ? (
                                <button
                                  onClick={() => handleRenewOrPurchaseAmc(order, productAmc)}
                                  className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                                  title={isExpired ? "Renew AMC" : "Purchase AMC"}
                                >
                                  {isExpired ? <FaSync size={14} /> : <FaShieldAlt size={14} />}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Standalone AMCs (AMCs not linked to products in the list) */}
        {amcs.filter(amc => !orders.some(o => o.productName?.toLowerCase() === amc.productName?.toLowerCase())).length > 0 && (
          <div className="mt-10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-green-500" /> Other Active & Past AMCs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {amcs.filter(amc => !orders.some(o => o.productName?.toLowerCase() === amc.productName?.toLowerCase())).map((amc, aidx) => (
                <div
                  key={aidx}
                  className="p-4 rounded-lg border bg-green-50/10"
                  style={{ borderColor: themeColors.border }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">{amc.amcPlanName}</p>
                      <p className="text-xs opacity-60">Product: {amc.productName || "Generic/Other"}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getStatusColor(amc.status)}`}>
                      {amc.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="opacity-60">Start Date</p>
                      <p className="font-semibold">{fmtDate(amc.startDate)}</p>
                    </div>
                    <div>
                      <p className="opacity-60">End Date</p>
                      <p className="font-semibold">{fmtDate(amc.endDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600">
                    <span className="px-1.5 py-0.5 bg-blue-50 rounded border border-blue-100 uppercase">
                      Source: {amc.source || "System"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Order Modal */}
      {showAddOrderModal && customer && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: themeColors.surface }}>
            <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
                <FaPlus className="text-green-500" /> Add Offline Order
              </h3>
              <button onClick={() => setShowAddOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmitAddOrder} className="p-5 space-y-5">
              {/* Customer Info - Read Only */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: themeColors.background + "50", borderColor: themeColors.border }}>
                <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Customer (Auto-filled)</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="opacity-60 text-xs">Name</p>
                    <p className="font-bold">{customer.name}</p>
                  </div>
                  <div>
                    <p className="opacity-60 text-xs">Phone</p>
                    <p className="font-bold">{customer.mobile}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="opacity-60 text-xs">Address</p>
                    <p className="font-bold">{`${customer.address?.house || ""} ${customer.address?.area || ""} ${customer.address?.city || ""}`.trim() || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Add Items */}
              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Products & AMC</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                  {/* Product Dropdown */}
                  <div className="md:col-span-2 relative">
                    <input
                      type="text" readOnly placeholder="Select Product..."
                      className="w-full border rounded p-2 cursor-pointer text-sm"
                      style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                      onClick={() => setShowOrderProductDropdown(!showOrderProductDropdown)}
                      value={newOrderItem.productId ? orderProducts.find(p => (p._id || p.id) === newOrderItem.productId)?.name || "" : ""}
                    />
                    {showOrderProductDropdown && (
                      <div className="absolute z-[100001] w-full mt-1 rounded-xl shadow-2xl border p-3" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                        <input autoFocus type="text" placeholder="Search..." className="w-full p-2 mb-2 rounded border text-sm"
                          style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                          value={orderProductSearch} onChange={e => setOrderProductSearch(e.target.value)} />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {orderProducts.filter(p => p.name.toLowerCase().includes(orderProductSearch.toLowerCase())).map(p => (
                            <div key={p._id || p.id} className="p-2 hover:bg-black/5 cursor-pointer rounded text-sm flex justify-between"
                              onClick={() => { setNewOrderItem({ ...newOrderItem, productId: p._id || p.id }); setShowOrderProductDropdown(false); setOrderProductSearch(""); }}>
                              <span className="font-bold">{p.name}</span>
                              <span className="text-xs opacity-60">{fmtCurrencySimple(p.price || p.sellingPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {showOrderProductDropdown && <div className="fixed inset-0 z-[100000]" onClick={() => setShowOrderProductDropdown(false)}></div>}
                  </div>

                  {/* AMC Dropdown */}
                  <div className="relative">
                    <input
                      type="text" readOnly placeholder="No AMC"
                      className="w-full border rounded p-2 cursor-pointer text-sm"
                      style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                      onClick={() => setShowOrderAmcDropdown(!showOrderAmcDropdown)}
                      value={newOrderItem.amcId ? orderAmcPlans.find(a => a._id === newOrderItem.amcId)?.name || "No AMC" : "No AMC"}
                    />
                    {showOrderAmcDropdown && (
                      <div className="absolute z-[100001] w-full mt-1 rounded-xl shadow-2xl border p-3" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                        <input autoFocus type="text" placeholder="Search AMC..." className="w-full p-2 mb-2 rounded border text-sm"
                          style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                          value={orderAmcSearch} onChange={e => setOrderAmcSearch(e.target.value)} />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          <div className="p-2 hover:bg-black/5 cursor-pointer rounded text-sm"
                            onClick={() => { setNewOrderItem({ ...newOrderItem, amcId: "" }); setShowOrderAmcDropdown(false); setOrderAmcSearch(""); }}>No AMC</div>
                          {orderAmcPlans.filter(p => p.name.toLowerCase().includes(orderAmcSearch.toLowerCase())).map(p => (
                            <div key={p._id} className="p-2 hover:bg-black/5 cursor-pointer rounded text-sm flex justify-between"
                              onClick={() => { setNewOrderItem({ ...newOrderItem, amcId: p._id }); setShowOrderAmcDropdown(false); setOrderAmcSearch(""); }}>
                              <span className="font-bold">{p.name}</span>
                              <span className="text-xs opacity-60">+{fmtCurrencySimple(p.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {showOrderAmcDropdown && <div className="fixed inset-0 z-[100000]" onClick={() => setShowOrderAmcDropdown(false)}></div>}
                  </div>

                  {/* Qty + Add */}
                  <div className="flex gap-2">
                    <input type="number" min="1" className="w-16 border rounded p-2 text-sm"
                      value={newOrderItem.quantity} onChange={e => setNewOrderItem({ ...newOrderItem, quantity: e.target.value })}
                      style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                    <button type="button" onClick={handleAddOrderItem} className="bg-green-600 text-white px-3 rounded hover:bg-green-700 text-sm flex-1">Add</button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded border text-sm" style={{ backgroundColor: themeColors.background + "50", borderColor: themeColors.border }}>
                      <div>
                        <span className="font-bold">{item.name}</span>
                        {item.amcPlanName && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">{item.amcPlanName}</span>}
                        <span className="text-xs opacity-60 ml-2">x{item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{fmtCurrencySimple(item.price * item.quantity)}</span>
                        <button type="button" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><FaTrash size={11} /></button>
                      </div>
                    </div>
                  ))}
                  {orderItems.length === 0 && <p className="text-xs text-center opacity-50">Koi item nahi add hua</p>}
                </div>

                {orderItems.length > 0 && (
                  <div className="text-right font-black text-base mt-2" style={{ color: themeColors.text }}>
                    Total: {fmtCurrencySimple(orderItems.reduce((s, i) => s + i.price * i.quantity, 0))}
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="grid grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: themeColors.border }}>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-60" style={{ color: themeColors.text }}>Payment Method</label>
                  <select className="w-full border rounded p-2 text-sm" value={orderPaymentMethod} onChange={e => setOrderPaymentMethod(e.target.value)}
                    style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}>
                    {["Cash", "UPI", "Card", "Bank Transfer", "Online"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-60" style={{ color: themeColors.text }}>Payment Status</label>
                  <select className="w-full border rounded p-2 text-sm" value={orderPaymentStatus} onChange={e => setOrderPaymentStatus(e.target.value)}
                    style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}>
                    {["pending", "paid", "failed"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 opacity-60" style={{ color: themeColors.text }}>Order Status</label>
                  <select className="w-full border rounded p-2 text-sm" value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                    style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}>
                    {["pending", "confirmed", "shipped", "delivered", "cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: themeColors.border }}>
                <button type="button" onClick={() => setShowAddOrderModal(false)} className="px-4 py-2 rounded border hover:bg-slate-100 text-sm" style={{ color: themeColors.text, borderColor: themeColors.border }}>Cancel</button>
                <button type="submit" className="px-6 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700 shadow text-sm">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Service Modal */}
      {showBookServiceModal && selectedProduct && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl p-6"
            style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FaTools className="text-blue-500" /> Book Service
            </h3>

            <div className="mb-4 p-3 rounded" style={{ backgroundColor: themeColors.background + "50" }}>
              <p className="text-xs opacity-60">Product</p>
              <p className="font-bold">{selectedProduct.productName}</p>
              <p className="text-xs opacity-70 mt-1">
                AMC: {selectedProduct.amc?.amcPlanName || "No AMC"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Type *</label>
                <select
                  value={serviceForm.serviceType}
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}
                  className="w-full p-2 rounded border"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                >
                  <option value="Regular Service">Regular Service</option>
                  <option value="Installation">Installation</option>
                  <option value="Repair">Repair</option>
                  <option value="Filter Change">Filter Change</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">Technician Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={serviceForm.technicianName}
                    onClick={() => setShowTechDropdown(!showTechDropdown)}
                    readOnly
                    placeholder="Select technician"
                    className="w-full p-2 rounded border cursor-pointer"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                  />
                  {showTechDropdown && (
                    <div 
                      className="absolute z-[100000] w-full mt-1 rounded-xl shadow-2xl border p-3"
                      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                    >
                      <input
                        type="text"
                        placeholder="Search employee..."
                        autoFocus
                        value={technicianSearch}
                        onChange={(e) => setTechnicianSearch(e.target.value)}
                        className="w-full p-2 mb-2 rounded-lg border text-sm"
                        style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {employees
                          .filter(emp => emp.role !== 'Manager' && (
                            emp.name.toLowerCase().includes(technicianSearch.toLowerCase()) || 
                            (emp.designation || emp.role).toLowerCase().includes(technicianSearch.toLowerCase())
                          ))
                          .map((emp, i) => (
                          <div
                            key={i}
                            className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors"
                            onClick={() => {
                              setServiceForm({ ...serviceForm, technicianName: emp.name });
                              setShowTechDropdown(false);
                              setTechnicianSearch("");
                            }}
                          >
                            <div className="font-bold">{emp.name}</div>
                            <div className="text-[10px] opacity-60 uppercase font-black">{emp.designation || emp.role}</div>
                          </div>
                        ))}
                        {employees.filter(emp => emp.role !== 'Manager' && (
                            emp.name.toLowerCase().includes(technicianSearch.toLowerCase()) || 
                            (emp.designation || emp.role).toLowerCase().includes(technicianSearch.toLowerCase())
                          )).length === 0 && (
                          <div className="p-4 text-center text-xs opacity-50">No technician found</div>
                        )}
                      </div>
                    </div>
                  )}
                  {showTechDropdown && (
                    <div className="fixed inset-0 z-[99999]" onClick={() => setShowTechDropdown(false)}></div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Scheduled Date *</label>
                <input
                  type="date"
                  value={serviceForm.scheduledDate}
                  onChange={(e) => setServiceForm({ ...serviceForm, scheduledDate: e.target.value })}
                  className="w-full p-2 rounded border"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows="3"
                  className="w-full p-2 rounded border"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBookServiceModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitService}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <FaTools size={12} /> Book Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
