// src/pages/OfflineOrders.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { listOrders, updateOrderStatus, createOfflineOrder, deleteOrder, updateOrderDetails } from "../apis/orders";
import { listProducts } from "../apis/products";
import { listAmcPlans } from "../apis/amcPlans";
import {
  FaShoppingCart,
  FaSyncAlt,
  FaSearch,
  FaPlus,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import { 
    ShieldCheck, 
    Download, 
} from 'lucide-react';
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

const fmtCurrency = (n) =>
  typeof n === "number"
    ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : n ?? "-";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];
const PAYMENT_STATUSES = ["pending", "paid", "failed"];

const InvoiceModal = ({ order, isOpen, onClose }) => {
    const [show, setShow] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setShow(true), 10);
        } else {
            setShow(false);
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    const handleDownloadPdf = async () => {
        const element = document.getElementById('printable-invoice');
        if (!element) {
            Swal.fire("Error", "Invoice element not found!", "error");
            return;
        }
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('printable-invoice');
                    if (clonedElement) {
                        clonedElement.style.height = 'auto';
                        clonedElement.style.maxHeight = 'none';
                        clonedElement.style.overflow = 'visible';
                        clonedElement.style.paddingBottom = '40px'; 
                    }
                }
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`UNIXA_INV_${(order._id || order.id).slice(-6).toUpperCase()}.pdf`);
            Swal.fire("Success", "lnvoice Downloaded!", "success");
        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire("Error", "Generation sequence failed.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[11000] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div className={`bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-500 ${show ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-95 opacity-0'}`} onClick={e => e.stopPropagation()}>
                <div id="printable-invoice" className="flex flex-col flex-1 overflow-y-auto p-12" style={{ backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}>
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <div className="w-16 h-16 rounded-[28px] flex items-center justify-center mb-6" style={{ backgroundColor: '#3b82f6', color: '#ffffff', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)' }}>
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase" style={{ color: '#0f172a' }}>Unixa <span style={{ color: '#3b82f6' }}>Pure</span></h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1" style={{ color: '#94a3b8' }}>Official Proof of Authenticity</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#94a3b8' }}>Digital Signature</p>
                            <p className="text-lg font-black" style={{ color: '#0f172a' }}>#UX-{(order._id || order.id).slice(-6).toUpperCase()}</p>
                            <p className="text-xs font-bold mt-1" style={{ color: '#94a3b8' }}>{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-16">
                        <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(59, 130, 246, 0.6)' }}>Issued From</p>
                            <div className="space-y-1">
                                <p className="text-sm font-black" style={{ color: '#0f172a' }}>Unixa Pure HQ</p>
                                <p className="text-[11px] font-bold leading-relaxed" style={{ color: '#94a3b8' }}>Ahirawan, Sandila, Uttar Pradesh, 241204</p>
                            </div>
                        </div>
                        <div className="text-right space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(59, 130, 246, 0.6)' }}>Recipient Identity</p>
                            <div className="space-y-1">
                                <p className="text-sm font-black" style={{ color: '#0f172a' }}>{order.shippingAddress?.name}</p>
                                <p className="text-[11px] font-bold leading-relaxed" style={{ color: '#94a3b8' }}>
                                    {order.shippingAddress?.addressLine1 || order.shippingAddress?.address}, {order.shippingAddress?.city}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t mb-12" style={{ borderColor: '#f1f5f9' }}>
                        {order.items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 py-8 border-b items-center" style={{ borderColor: '#f1f5f9' }}>
                                <div className="col-span-8">
                                    <h4 className="text-sm font-black uppercase" style={{ color: '#0f172a' }}>{item.productName}</h4>
                                    
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[10px] font-bold flex items-center gap-2" style={{ color: '#3b82f6' }}>
                                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
                                            WARRANTY ID: <span style={{ color: '#0f172a' }}>{item.warrantyId || `WAR-REG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`}</span>
                                        </p>
                                        
                                        {item.amcPlan && (
                                            <p className="text-[10px] font-bold flex items-center gap-2" style={{ color: '#3b82f6' }}>
                                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
                                                AMC PLAN: <span className="uppercase tracking-tight" style={{ color: '#0f172a' }}>{item.amcPlan}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-1 text-center font-black" style={{ color: '#94a3b8' }}>0{item.quantity}</div>
                                <div className="col-span-3 text-right font-black" style={{ color: '#0f172a' }}>₹{(item.price || item.productPrice).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-10 border-t-4 border-double" style={{ borderColor: '#0f172a' }}>
                        <div className="flex flex-col gap-4 text-xs font-black uppercase tracking-widest">
                            <div className="flex justify-between items-center px-4">
                                <span style={{ color: '#94a3b8' }}>Total Valuation</span>
                                <span className="text-2xl font-black tracking-tighter" style={{ color: '#0f172a' }}>₹{order.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button onClick={onClose} className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-colors">Close</button>
                    <button 
                        onClick={handleDownloadPdf} 
                        disabled={isGenerating}
                        className="px-10 py-5 bg-slate-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all flex items-center gap-4 active:scale-95"
                    >
                        {isGenerating ? 'Processing...' : <><Download size={14} strokeWidth={3} /> Download Invoice</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function OfflineOrders() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [amcPlans, setAmcPlans] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Modal & Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);

  const [newItem, setNewItem] = useState({ productId: "", amcId: "", quantity: 1 });
  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerCity: "",
    customerState: "", 
    customerPincode: "",
    items: [],
    paymentMethod: "Cash",
    paymentStatus: "paid",
    status: "confirmed",
  });

  // Invoice Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Fetch Data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const list = await listOrders();
      // Filter only offline orders
      const offlineList = list.filter((o) => o.source === "offline");
      setOrders(offlineList);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const list = await listProducts();
      setProducts(list);
    } catch (e) { console.error(e); }
  };

  const fetchAmc = async () => {
    try {
        const list = await listAmcPlans(true);
        setAmcPlans(list);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchAmc();
  }, []);

  // Filter Logic
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((o) => {
      const id = (o._id || o.id || "").toLowerCase();
      const name = (o.shippingAddress?.name || "").toLowerCase();
      const phone = (o.shippingAddress?.phone || "").toLowerCase();
      return id.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [orders, search, statusFilter]);

  // Create Order Logic
  const handleAddItem = () => {
    if (!newItem.productId) return;
    const product = products.find((p) => (p._id || p.id) === newItem.productId);
    if (!product) return;

    const amc = newItem.amcId ? amcPlans.find(a => a._id === newItem.amcId) : null;
    const amcPrice = amc ? amc.price : 0;
    const itemPrice = (product.price || product.sellingPrice || 0) + amcPrice;

    const existingItemIndex = orderForm.items.findIndex(
      (it) => it.productId === newItem.productId && it.amcId === newItem.amcId
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...orderForm.items];
      updatedItems[existingItemIndex].quantity += parseInt(newItem.quantity);
      setOrderForm({ ...orderForm, items: updatedItems });
    } else {
      setOrderForm({
        ...orderForm,
        items: [
          ...orderForm.items,
          {
            productId: newItem.productId,
            name: product.name,
            price: itemPrice,
            productPrice: product.price || product.sellingPrice || 0,
            quantity: parseInt(newItem.quantity),
            amcId: amc ? amc._id : undefined,
            amcPlan: amc ? amc.name : undefined,
            amcPrice: amcPrice,
          },
        ],
      });
    }
    setNewItem({ productId: "", amcId: "", quantity: 1 });
  };

  const handleRemoveItem = (index) => {
    const updated = [...orderForm.items];
    updated.splice(index, 1);
    setOrderForm({ ...orderForm, items: updated });
  };

  const openCreateModal = () => {
      setIsEditMode(false);
      setEditOrderId(null);
      setOrderForm({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        customerCity: "",
        customerState: "",
        customerPincode: "",
        items: [],
        paymentMethod: "Cash",
        paymentStatus: "paid",
        status: "confirmed",
      });
      setShowCreateModal(true);
  };

  const handleEditOrder = (order) => {
      setIsEditMode(true);
      setEditOrderId(order._id);
      setOrderForm({
        customerName: order.shippingAddress.name,
        customerPhone: order.shippingAddress.phone,
        customerAddress: order.shippingAddress.addressLine1 || order.shippingAddress.address,
        customerCity: order.shippingAddress.city,
        customerState: order.shippingAddress.state || "",
        customerPincode: order.shippingAddress.pincode || "",
        items: [], // Editing items is disabled for simplicity in this iteration
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
      });
      setShowCreateModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!isEditMode && orderForm.items.length === 0) {
      Swal.fire("Error", "Please add at least one item", "error");
      return;
    }
    if (!orderForm.customerName || !orderForm.customerPhone) {
        Swal.fire("Error", "Please fill customer details", "error");
        return;
    }

    try {
      if (isEditMode) {
          const payload = {
            shippingAddress: {
                name: orderForm.customerName,
                phone: orderForm.customerPhone,
                addressLine1: orderForm.customerAddress,
                city: orderForm.customerCity,
                state: orderForm.customerState,
                pincode: orderForm.customerPincode,
            },
            paymentMethod: orderForm.paymentMethod,
            paymentStatus: orderForm.paymentStatus,
            status: orderForm.status,
          };
          await updateOrderDetails(editOrderId, payload);
          Swal.fire("Success", "Order Updated", "success");
      } else {
          // Create
          const totalAmount = orderForm.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          const payload = {
            shippingAddress: {
              name: orderForm.customerName,
              phone: orderForm.customerPhone,
              addressLine1: orderForm.customerAddress,
              city: orderForm.customerCity,
              state: orderForm.customerState,
              pincode: orderForm.customerPincode,
            },
            items: orderForm.items.map((it) => ({
              productId: it.productId, 
              quantity: it.quantity,
              productPrice: it.productPrice,
              amcPrice: it.amcPrice,
              price: it.price,
              productName: it.name,
              amcId: it.amcId,
              amcPlan: it.amcPlan,
            })),
            total: totalAmount,
            paymentMethod: orderForm.paymentMethod,
            paymentStatus: orderForm.paymentStatus,
            status: orderForm.status,
            source: "offline",
          };

          await createOfflineOrder(payload);
          Swal.fire("Success", "Offline Order Created", "success");
      }
      
      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", isEditMode ? "Failed to update order" : "Failed to create order", "error");
    }
  };
  
  const handleDeleteOrder = async (orderId) => {
      const result = await Swal.fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!"
      });

      if (result.isConfirmed) {
          try {
              await deleteOrder(orderId);
              setOrders(orders.filter(o => o._id !== orderId));
              Swal.fire("Deleted!", "Order has been deleted.", "success");
          } catch (error) {
              Swal.fire("Error", "Failed to delete order", "error");
          }
      }
  };

  const handleStatusChange = async (order, newStatus) => {
        if (!newStatus || newStatus === order.status) return;

        const result = await Swal.fire({
          title: "Change status?",
          text: `Update status to "${newStatus}"?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes",
        });
    
        if (!result.isConfirmed) return;
    
        try {
          await updateOrderStatus(order._id || order.id, newStatus);
          setOrders((prev) =>
            prev.map((o) =>
              (o._id || o.id) === (order._id || order.id)
                ? { ...o, status: newStatus }
                : o
            )
          );
          Swal.fire("Updated", "Status updated", "success");
        } catch (e) {
          Swal.fire("Error", "Failed to update status", "error");
        }
  };

  const handleOpenInvoice = (order) => {
      setSelectedOrder(order);
      setShowInvoiceModal(true);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: currentFont.family }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaShoppingCart /> Offline Orders
          </h1>
          <p className="text-sm mt-1 opacity-75" style={{ color: themeColors.text }}>
            Manage in-store/offline orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Create Order
          </button>
           <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
            <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs opacity-50">
                  <FaSearch style={{ color: themeColors.text }} />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 pr-3 py-2 rounded-lg border text-sm w-40 md:w-60"
                  style={{
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                />
            </div>
          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg border text-sm hover:bg-slate-50"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: themeColors.surface }}>
            <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>{isEditMode ? 'Edit Offline Order' : 'Create Offline Order'}</h2>
            </div>
            <form onSubmit={handleSubmitOrder} className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Name</label>
                    <input required type="text" className="w-full border rounded p-2" value={orderForm.customerName} onChange={e => setOrderForm({...orderForm, customerName: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Phone</label>
                    <input required type="text" className="w-full border rounded p-2" value={orderForm.customerPhone} onChange={e => setOrderForm({...orderForm, customerPhone: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Address</label>
                    <input type="text" className="w-full border rounded p-2" value={orderForm.customerAddress} onChange={e => setOrderForm({...orderForm, customerAddress: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>City</label>
                    <input type="text" className="w-full border rounded p-2" value={orderForm.customerCity} onChange={e => setOrderForm({...orderForm, customerCity: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>State</label>
                    <input type="text" className="w-full border rounded p-2" value={orderForm.customerState} onChange={e => setOrderForm({...orderForm, customerState: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Pincode</label>
                    <input type="text" className="w-full border rounded p-2" value={orderForm.customerPincode} onChange={e => setOrderForm({...orderForm, customerPincode: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }} />
                </div>
              </div>

              {/* Items Section - Only Show for New Orders */}
              {!isEditMode && (
                  <div className="border-t pt-4" style={{ borderColor: themeColors.border }}>
                    <h3 className="font-bold mb-2" style={{ color: themeColors.text }}>Items</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                        <div className="md:col-span-2">
                            <select 
                                className="w-full border rounded p-2"
                                value={newItem.productId}
                                onChange={e => setNewItem({...newItem, productId: e.target.value})}
                                style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                            >
                                <option value="">Select Product...</option>
                                {products.map(p => (
                                    <option key={p._id || p.id} value={p._id || p.id}>{p.name} - {fmtCurrency(p.price || p.sellingPrice)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select 
                                className="w-full border rounded p-2"
                                value={newItem.amcId}
                                onChange={e => setNewItem({...newItem, amcId: e.target.value})}
                                style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                            >
                                <option value="">No AMC</option>
                                {amcPlans.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} (+{fmtCurrency(p.price)})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                min="1" 
                                className="w-20 border rounded p-2" 
                                value={newItem.quantity} 
                                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                                style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                            />
                            <button type="button" onClick={handleAddItem} className="bg-green-600 text-white px-4 rounded hover:bg-green-700 flex-1">Add</button>
                        </div>
                    </div>

                    {/* Added Items List */}
                    <div className="space-y-2 mb-4">
                        {orderForm.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 border">
                                <div>
                                    <span className="text-sm font-medium">{item.name}</span>
                                    {item.amcPlan && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">+ {item.amcPlan}</span>}
                                    <span className="text-xs text-gray-500 ml-2">x{item.quantity}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold">{fmtCurrency(item.price * item.quantity)}</span>
                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700"><FaTrash size={12} /></button>
                                </div>
                            </div>
                        ))}
                        {orderForm.items.length === 0 && <p className="text-xs text-center opacity-50">No items added.</p>}
                    </div>
                    
                    {orderForm.items.length > 0 && (
                         <div className="text-right font-black text-lg" style={{ color: themeColors.text }}>
                            Total: {fmtCurrency(orderForm.items.reduce((sum, i) => sum + i.price * i.quantity, 0))}
                         </div>
                    )}
                  </div>
              )}

              {/* Payment & Status */}
              <div className="grid grid-cols-3 gap-4 border-t pt-4" style={{ borderColor: themeColors.border }}>
                 <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Payment Method</label>
                    <select className="w-full border rounded p-2" value={orderForm.paymentMethod} onChange={e => setOrderForm({...orderForm, paymentMethod: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}>
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Payment Status</label>
                    <select className="w-full border rounded p-2" value={orderForm.paymentStatus} onChange={e => setOrderForm({...orderForm, paymentStatus: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}>
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: themeColors.textSecondary }}>Order Status</label>
                    <select className="w-full border rounded p-2" value={orderForm.status} onChange={e => setOrderForm({...orderForm, status: e.target.value})} style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded border hover:bg-slate-100" style={{ color: themeColors.text, borderColor: themeColors.border }}>Cancel</button>
                <button type="submit" className="px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg">{isEditMode ? 'Update Order' : 'Create Order'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal order={selectedOrder} isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} />

      {/* Orders Table */}
      <div className="p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b" style={{ backgroundColor: themeColors.background + "50", borderColor: themeColors.border }}>
                    <th className="px-4 py-3 text-left font-bold uppercase" style={{ color: themeColors.text }}>Order ID</th>
                    <th className="px-4 py-3 text-left font-bold uppercase" style={{ color: themeColors.text }}>Customer</th>
                    <th className="px-4 py-3 text-left font-bold uppercase" style={{ color: themeColors.text }}>Total</th>
                    <th className="px-4 py-3 text-left font-bold uppercase" style={{ color: themeColors.text }}>Status</th>
                    <th className="px-4 py-3 text-left font-bold uppercase" style={{ color: themeColors.text }}>Date</th>
                    <th className="px-4 py-3 text-left font-bold uppercase" style={{ color: themeColors.text }}>Action</th>
                </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                {filteredOrders.length === 0 ? (
                    <tr><td colSpan="6" className="p-4 text-center">No offline orders found.</td></tr>
                ) : (
                    filteredOrders.map(Order => (
                        <tr key={Order._id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono text-xs">{(Order._id || Order.id || "").slice(-6).toUpperCase()}</td>
                            <td className="px-4 py-3">
                                <div className="font-bold">{Order.shippingAddress?.name}</div>
                                <div className="text-xs opacity-60">{Order.shippingAddress?.phone}</div>
                            </td>
                            <td className="px-4 py-3 font-bold">{fmtCurrency(Order.total)}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${Order.status === 'confirmed' || Order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                                    {Order.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs">{fmtDateTime(Order.createdAt)}</td>
                            <td className="px-4 py-3 flex gap-2">
                                <button 
                                    onClick={() => handleEditOrder(Order)}
                                    className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
                                    title="Edit"
                                >
                                    <FaEdit size={12} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteOrder(Order._id || Order.id)}
                                    className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200"
                                    title="Delete"
                                >
                                    <FaTrash size={12} />
                                </button>
                                <button 
                                    onClick={() => handleOpenInvoice(Order)}
                                    className="bg-slate-800 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-slate-900"
                                >
                                    <Download size={10} /> Invoice
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
