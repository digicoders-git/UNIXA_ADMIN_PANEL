import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import http from "../apis/http";
import { listProducts } from "../apis/products";
import { FaShieldAlt, FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaCheck } from "react-icons/fa";
import Swal from "sweetalert2";

const DEFAULT_CONFIG = { rateOneYear: "", rateTwoYear: "", rateThreeYear: "", discount: "", serviceSchedule: { type: "Half Yearly" } };

const EMPTY_FORM = {
  name: "", amcType: "Paid", servicesIncluded: 3,
  features: "", isPopular: false, isActive: true, partsIncluded: false,
  productConfigs: [], // [{ productId, productName, rateOneYear, rateTwoYear, rateThreeYear, discount, serviceSchedule }]
};

const afterDiscount = (rate, disc) => {
  const r = parseFloat(rate) || 0, d = parseFloat(disc) || 0;
  return r > 0 ? Math.round(r - r * d / 100) : "—";
};

export default function AmcPlans() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);

  useEffect(() => { fetchPlans(); fetchProducts(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/api/amc-plans");
      if (data.success) setPlans(data.plans);
    } catch { Swal.fire("Error", "Failed to fetch plans", "error"); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try { setAllProducts(await listProducts() || []); } catch { }
  };

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setProductSearch(""); setIsModalOpen(true); };

  const openEdit = (plan) => {
    setEditingId(plan._id);
    const configs = (plan.productConfigs || []).map(c => ({
      productId: c.productId?._id || c.productId,
      productName: c.productId?.name || "",
      rateOneYear: c.rateOneYear || "",
      rateTwoYear: c.rateTwoYear || "",
      rateThreeYear: c.rateThreeYear || "",
      discount: c.discount || "",
      serviceSchedule: { type: c.serviceSchedule?.type || "Half Yearly" },
    }));
    setForm({
      name: plan.name, amcType: plan.amcType || "Paid",
      servicesIncluded: plan.servicesIncluded || 3,
      features: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      isPopular: plan.isPopular || false, isActive: plan.isActive !== false,
      partsIncluded: plan.partsIncluded || false,
      productConfigs: configs,
    });
    setProductSearch(""); setIsModalOpen(true);
  };

  // Add product to config list
  const addProduct = (product) => {
    if (form.productConfigs.find(c => c.productId === product._id)) return;
    setForm(p => {
      const newConfigs = [...p.productConfigs, { productId: product._id, productName: product.name, ...DEFAULT_CONFIG }];
      const autoName = newConfigs.map(c => c.productName).join(" + ") + " AMC";
      return { ...p, name: autoName, productConfigs: newConfigs };
    });
    setProductSearch(""); setShowDrop(false);
  };

  const removeProduct = (productId) => {
    setForm(p => {
      const newConfigs = p.productConfigs.filter(c => c.productId !== productId);
      const autoName = newConfigs.length > 0 ? newConfigs.map(c => c.productName).join(" + ") + " AMC" : "";
      return { ...p, name: autoName, productConfigs: newConfigs };
    });
  };

  const updateConfig = (productId, field, value) => {
    setForm(p => ({
      ...p,
      productConfigs: p.productConfigs.map(c =>
        c.productId === productId
          ? field === "scheduleType"
            ? { ...c, serviceSchedule: { type: value } }
            : { ...c, [field]: value }
          : c
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.productConfigs.length === 0) {
      Swal.fire("Warning", "Please add at least one product.", "warning"); return;
    }
    const payload = {
      ...form,
      features: form.features.split(",").map(f => f.trim()).filter(Boolean),
      productConfigs: form.productConfigs.map(c => ({
        productId: c.productId,
        rateOneYear: Number(c.rateOneYear) || 0,
        rateTwoYear: Number(c.rateTwoYear) || 0,
        rateThreeYear: Number(c.rateThreeYear) || 0,
        discount: Number(c.discount) || 0,
        serviceSchedule: { type: c.serviceSchedule?.type || "Half Yearly" },
      })),
    };
    try {
      if (editingId) { await http.put(`/api/amc-plans/${editingId}`, payload); Swal.fire("Updated!", "", "success"); }
      else { await http.post("/api/amc-plans", payload); Swal.fire("Created!", "", "success"); }
      setIsModalOpen(false); fetchPlans();
    } catch { Swal.fire("Error", "Failed to save plan", "error"); }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete this plan?", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33" });
    if (r.isConfirmed) { try { await http.delete(`/api/amc-plans/${id}`); fetchPlans(); } catch { } }
  };

  const filteredProducts = allProducts.filter(p =>
    !form.productConfigs.find(c => c.productId === p._id) &&
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const f = form;

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont?.family, color: themeColors?.text }}>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaShieldAlt className="text-blue-600" /> Master AMC Plans
        </h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md text-sm">
          <FaPlus /> Create New Plan
        </button>
      </div>

      {/* Plans Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors?.surface, borderColor: themeColors?.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors?.background, color: themeColors?.text }}>
              <tr>
                <th className="p-4">Plan Name</th>
                <th className="p-4">Products & Rates</th>
                <th className="p-4 text-center">Schedule</th>
                <th className="p-4 text-center">Services</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors?.border }}>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center opacity-50">Loading...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center opacity-50">No AMC plans found.</td></tr>
              ) : plans.map(plan => (
                <tr key={plan._id} className="hover:bg-gray-50/50 transition align-top">
                  <td className="p-4">
                    <p className="font-bold">{plan.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${plan.amcType === "Free" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{plan.amcType}</span>
                      {plan.isPopular && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">⭐ Popular</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    {plan.productConfigs?.length > 0 ? (
                      <div className="space-y-2">
                        {plan.productConfigs.map((c, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <p className="font-semibold text-gray-700 mb-1">{c.productId?.name || "Product"}</p>
                            <div className="flex gap-3 flex-wrap">
                              {c.rateOneYear > 0 && <span className="text-blue-700 font-bold">1Y: ₹{afterDiscount(c.rateOneYear, c.discount)}{c.discount > 0 && <span className="line-through text-gray-400 font-normal ml-1">₹{c.rateOneYear}</span>}</span>}
                              {c.rateTwoYear > 0 && <span className="text-blue-700 font-bold">2Y: ₹{afterDiscount(c.rateTwoYear, c.discount)}{c.discount > 0 && <span className="line-through text-gray-400 font-normal ml-1">₹{c.rateTwoYear}</span>}</span>}
                              {c.rateThreeYear > 0 && <span className="text-blue-700 font-bold">3Y: ₹{afterDiscount(c.rateThreeYear, c.discount)}{c.discount > 0 && <span className="line-through text-gray-400 font-normal ml-1">₹{c.rateThreeYear}</span>}</span>}
                              {c.discount > 0 && <span className="bg-green-100 text-green-700 font-bold px-1.5 rounded">{c.discount}% OFF</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-xs opacity-40">No products</span>}
                  </td>
                  <td className="p-4 text-center">
                    {plan.productConfigs?.[0]?.serviceSchedule?.type
                      ? <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{plan.productConfigs[0].serviceSchedule.type}</span>
                      : "—"}
                  </td>
                  <td className="p-4 text-center font-semibold">{plan.servicesIncluded || 0}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${plan.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(plan)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><FaEdit size={13} /></button>
                      <button onClick={() => handleDelete(plan._id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><FaTrash size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — Landscape */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-6" style={{ backgroundColor: themeColors?.surface, color: themeColors?.text }}>

            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center rounded-t-2xl" style={{ borderColor: themeColors?.border, backgroundColor: themeColors?.surface }}>
              <h2 className="text-lg font-bold flex items-center gap-2"><FaShieldAlt className="text-blue-500" /> {editingId ? "Edit AMC Plan" : "Create New AMC Plan"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><FaTimes /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: themeColors?.border }}>

                {/* ── LEFT: Plan Info ── */}
                <div className="p-6 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Plan Info</p>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Plan Name *</label>
                    <input type="text" value={f.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Gold AMC" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">AMC Type</label>
                      <select value={f.amcType} onChange={e => setForm(p => ({ ...p, amcType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Paid">Paid</option>
                        <option value="Free">Free</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">Services Included</label>
                      <input type="number" min="0" value={f.servicesIncluded} onChange={e => setForm(p => ({ ...p, servicesIncluded: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Features (comma separated)</label>
                    <textarea value={f.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Free Labor, Filter Change..." />
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {[{ key: "isPopular", label: "Popular" }, { key: "isActive", label: "Active" }, { key: "partsIncluded", label: "Parts Included" }].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" checked={f[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Product Search */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-600">Add Products</label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                      <input
                        type="text" value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        onFocus={() => setShowDrop(true)}
                        placeholder="Search & select product..."
                        className="w-full pl-8 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showDrop && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {filteredProducts.length === 0
                            ? <p className="p-3 text-xs text-gray-400 text-center">No products found</p>
                            : filteredProducts.map(p => (
                              <div key={p._id} onMouseDown={() => addProduct(p)} className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm transition">
                                <span className="font-medium text-gray-800">{p.name}</span>
                                <span className="text-xs text-blue-500 font-semibold">+ Add</span>
                              </div>
                            ))}
                        </div>
                      )}
                      {showDrop && <div className="fixed inset-0 z-40" onMouseDown={() => setShowDrop(false)} />}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{f.productConfigs.length} product(s) added</p>
                  </div>
                </div>

                {/* ── RIGHT: Per-Product Config ── */}
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Product-wise AMC Rates</p>

                  {f.productConfigs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                      <FaShieldAlt size={28} className="mb-2 opacity-30" />
                      <p className="text-sm">Search & add products from the left panel</p>
                      <p className="text-xs mt-1 opacity-60">Each product will have its own AMC rates</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                      {f.productConfigs.map((config) => {
                        const disc = parseFloat(config.discount) || 0;
                        return (
                          <div key={config.productId} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Product Header */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                              <p className="font-semibold text-sm text-gray-800">{config.productName}</p>
                              <button type="button" onClick={() => removeProduct(config.productId)} className="text-red-400 hover:text-red-600 transition p-1">
                                <FaTimes size={12} />
                              </button>
                            </div>

                            {/* Rates Grid */}
                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: "1 Year Rate (₹)", field: "rateOneYear" },
                                { label: "2 Year Rate (₹)", field: "rateTwoYear" },
                                { label: "3 Year Rate (₹)", field: "rateThreeYear" },
                                { label: "Discount (%)", field: "discount" },
                              ].map(({ label, field }) => (
                                <div key={field}>
                                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
                                  <input
                                    type="number" min="0" max={field === "discount" ? 100 : undefined}
                                    value={config[field]}
                                    onChange={e => updateConfig(config.productId, field, e.target.value)}
                                    className="w-full px-2.5 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Service Schedule */}
                            <div className="px-4 pb-4">
                              <label className="block text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Mandatory Service Schedule</label>
                              <div className="grid grid-cols-2 gap-2">
                                {["Half Yearly", "Quarterly"].map(opt => (
                                  <button
                                    key={opt} type="button"
                                    onClick={() => updateConfig(config.productId, "scheduleType", opt)}
                                    className={`py-2 rounded-lg border-2 text-xs font-semibold transition text-center ${config.serviceSchedule?.type === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                                  >
                                    {opt}
                                    <span className="block text-[10px] font-normal opacity-60">Every {opt === "Quarterly" ? "3" : "6"} months</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Live Discount Preview */}
                            {disc > 0 && (
                              <div className="mx-4 mb-4 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex gap-4 flex-wrap">
                                <span className="text-[10px] font-bold text-green-600 self-center">{disc}% OFF →</span>
                                {config.rateOneYear > 0 && <span className="text-xs text-gray-600">1Y: <strong className="text-green-700">₹{afterDiscount(config.rateOneYear, disc)}</strong></span>}
                                {config.rateTwoYear > 0 && <span className="text-xs text-gray-600">2Y: <strong className="text-green-700">₹{afterDiscount(config.rateTwoYear, disc)}</strong></span>}
                                {config.rateThreeYear > 0 && <span className="text-xs text-gray-600">3Y: <strong className="text-green-700">₹{afterDiscount(config.rateThreeYear, disc)}</strong></span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: themeColors?.border }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm">Cancel</button>
                <button type="submit" className="px-7 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 text-sm">{editingId ? "Update Plan" : "Create Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
