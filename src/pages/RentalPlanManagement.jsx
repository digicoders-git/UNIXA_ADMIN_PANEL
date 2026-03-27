import { useEffect, useState } from "react";
import { getRentalPlans, createRentalPlan, updateRentalPlan, deleteRentalPlan } from "../apis/rentalPlans";
import { listAmcPlans } from "../apis/amcPlans";
import { listProducts } from "../apis/products";
import { FaEdit, FaTrash, FaPlus, FaImage, FaCheck, FaTimes, FaTable, FaTh } from "react-icons/fa";
import { getImageUrl } from "../apis/http";
import Swal from "sweetalert2";

export default function RentalPlanManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [allAmcPlans, setAllAmcPlans] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Form State
  const [formData, setFormData] = useState({
    planName: "",
    price: "",
    tag: "",
    installationCost: "Free",
    deposit: "None",
    securityMoney: "None",
    discount: "",
    freeUses: "",
    freeParts: "",
    features: "",
    image: null, 
    isActive: true,
    amcPlans: [],
    productId: "",
    description: "",
  });
  const [imagePreview, setImagePreview] = useState(null);

  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchAmcPlans();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await listProducts();
      setAllProducts(data || []);
    } catch (error) {
      console.error("Failed to fetch products", error);
    }
  };

  const fetchAmcPlans = async () => {
    try {
      const data = await listAmcPlans(true);
      setAllAmcPlans(data || []);
    } catch (error) {
      console.error("Failed to fetch AMC plans", error);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getRentalPlans();
      setPlans(data || []);
    } catch (error) {
      console.error("Failed to fetch plans", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({
      planName: "",
      price: "",
      tag: "",
      installationCost: "Free",
      deposit: "None",
      securityMoney: "None",
      discount: "",
      freeUses: "",
      freeParts: "",
      features: "",
      image: null,
      isActive: true,
      amcPlans: [],
      productId: "",
      description: "",
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setModalMode("edit");
    setSelectedPlanId(plan._id);
    setFormData({
      planName: plan.planName,
      price: plan.price,
      tag: plan.tag || "",
      installationCost: plan.installationCost || "Free",
      deposit: plan.deposit || "None",
      securityMoney: plan.securityMoney || "None",
      discount: plan.discount || "",
      freeUses: plan.freeUses ? plan.freeUses.join("\n") : "",
      freeParts: plan.freeParts ? plan.freeParts.join("\n") : "",
      features: plan.features ? plan.features.join("\n") : "",
      image: null,
      isActive: plan.isActive,
      amcPlans: Array.isArray(plan.amcPlans) ? plan.amcPlans.map(a => a._id || a) : [],
      productId: plan.productId?._id || plan.productId || "",
      description: plan.description || "",
    });
    setImagePreview(plan.image?.url ? getImageUrl(plan.image.url) : null);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleAmcPlan = (planId) => {
    setFormData(prev => {
      const exists = prev.amcPlans.includes(planId);
      if (exists) {
        return { ...prev, amcPlans: prev.amcPlans.filter(id => id !== planId) };
      } else {
        return { ...prev, amcPlans: [...prev.amcPlans, planId] };
      }
    });
  };

  // Auto-calculate total amount
  const calcTotal = (data) => {
    const rent = parseFloat(data.price) || 0;
    const disc = parseFloat(data.discount) || 0;
    const security = parseFloat(data.securityMoney) || 0;
    const installation = data.installationCost === "Free" ? 0 : (parseFloat(data.installationCost) || 0);
    const discountAmount = Math.round((rent + installation + security) * disc / 100);
    const total = Math.round(rent + installation + security - discountAmount);
    return { rent, installation, security, discountAmount, disc, total };
  };

  const calc = calcTotal(formData);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare FormData
    const submissionData = new FormData();
    submissionData.append("planName", formData.planName);
    submissionData.append("price", formData.price);
    submissionData.append("tag", formData.tag);
    submissionData.append("installationCost", formData.installationCost);
    submissionData.append("deposit", formData.deposit);
    submissionData.append("securityMoney", formData.securityMoney);
    submissionData.append("discount", formData.discount || 0);
    submissionData.append("isActive", formData.isActive);

    const featuresArray = formData.features.split("\n").filter(f => f.trim() !== "");
    submissionData.append("features", JSON.stringify(featuresArray));

    const freeUsesArray = formData.freeUses.split("\n").filter(f => f.trim() !== "");
    submissionData.append("freeUses", JSON.stringify(freeUsesArray));

    const freePartsArray = formData.freeParts.split("\n").filter(f => f.trim() !== "");
    submissionData.append("freeParts", JSON.stringify(freePartsArray));

    if (formData.amcPlans && formData.amcPlans.length) {
      submissionData.append("amcPlans", JSON.stringify(formData.amcPlans));
    }

    submissionData.append("productId", formData.productId);
    submissionData.append("description", formData.description);

    if (formData.image) {
      submissionData.append("image", formData.image);
    }

    try {
      if (modalMode === "create") {
         await createRentalPlan(submissionData);
         Swal.fire("Success", "Rental Plan Created", "success");
      } else {
         await updateRentalPlan(selectedPlanId, submissionData);
         Swal.fire("Success", "Rental Plan Updated", "success");
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Operation Failed", "error");
    }
  };

  const handleToggleWebsite = async (plan) => {
    const newVal = plan.showOnWebsite === false ? true : false;
    try {
      const fd = new FormData();
      fd.append("showOnWebsite", String(newVal));
      await updateRentalPlan(plan._id, fd);
      setPlans(prev => prev.map(p => p._id === plan._id ? { ...p, showOnWebsite: newVal } : p));
    } catch { Swal.fire("Error", "Failed to update", "error"); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteRentalPlan(id);
        Swal.fire("Deleted!", "Plan has been deleted.", "success");
        fetchPlans();
      } catch (error) {
        Swal.fire("Error", "Failed to delete plan.", "error");
      }
    }
  };

  // Calculate total for saved plan card
  const getPlanTotal = (plan) => {
    const rent = plan.price || 0;
    const disc = plan.discount || 0;
    const security = parseFloat(plan.securityMoney) || 0;
    const installation = plan.installationCost === "Free" ? 0 : (parseFloat(plan.installationCost) || 0);
    const discountAmount = Math.round((rent + installation + security) * disc / 100);
    return {
      discountAmount,
      total: Math.round(rent + installation + security - discountAmount),
    };
  };

  const totalPages = Math.ceil(plans.length / PAGE_SIZE);
  const paginated = plans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rental Plans Management</h1>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition ${
                viewMode === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <FaTable size={13} /> Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition ${
                viewMode === "grid" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <FaTh size={13} /> Grid
            </button>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FaPlus /> Add New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
            <FaImage size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No Rental Plans Yet</h3>
          <p className="text-sm text-gray-400 mb-4">Click "Add New Plan" to create your first rental plan.</p>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <FaPlus /> Add New Plan
          </button>
        </div>
      ) : viewMode === "table" ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-right">Monthly Rent</th>
                    <th className="px-4 py-3 text-right">Installation</th>
                    <th className="px-4 py-3 text-right">Security</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right font-bold text-blue-600">Total Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Website</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((plan, idx) => {
                    const { total, discountAmount } = getPlanTotal(plan);
                    return (
                      <tr key={plan._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-400">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={getImageUrl(plan.image?.url)} alt={plan.planName} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                            <div>
                              <p className="font-semibold text-gray-800">{plan.planName}</p>
                              {plan.tag && <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded uppercase">{plan.tag}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">₹{plan.price}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{plan.installationCost === "Free" ? <span className="text-green-600 font-medium">Free</span> : `₹${plan.installationCost}`}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{parseFloat(plan.securityMoney) > 0 ? `₹${plan.securityMoney}` : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3 text-right">
                          {plan.discount > 0
                            ? <span className="text-green-600 font-semibold">{plan.discount}% <span className="text-xs text-gray-400">(-₹{discountAmount})</span></span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-blue-700 text-base">₹{total}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${plan.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleWebsite(plan)}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                              plan.showOnWebsite !== false
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                            }`}
                          >
                            {plan.showOnWebsite !== false ? "Visible" : "Hidden"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEditModal(plan)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"><FaEdit size={13} /></button>
                            <button onClick={() => handleDelete(plan._id)} className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition"><FaTrash size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, plans.length)} of {plans.length} plans</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition"
                >Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition ${
                      p === currentPage ? "bg-blue-600 text-white font-bold" : "border border-gray-200 hover:bg-gray-100"
                    }`}
                  >{p}</button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition"
                >Next</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((plan) => (
            <div key={plan._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group">
              {/* Status Badge */}
               <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${plan.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {plan.isActive ? "Active" : "Inactive"}
               </div>
               <div
                 onClick={() => handleToggleWebsite(plan)}
                 className={`absolute top-8 right-2 mt-1 px-2 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                   plan.showOnWebsite !== false ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-600"
                 }`}
               >
                 {plan.showOnWebsite !== false ? "Visible" : "Hidden"}
               </div>

              {/* Tag Badge */}
              {plan.tag && (
                 <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 uppercase">
                    {plan.tag}
                 </div>
              )}

              <div className="h-48 overflow-hidden bg-gray-100">
                <img
                  src={getImageUrl(plan.image?.url)}
                  alt={plan.planName}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.planName}</h3>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-2xl font-black text-blue-600">₹{plan.price}<span className="text-sm text-gray-400 font-normal">/mo</span></span>
                  {plan.discount > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">{plan.discount}% OFF</span>
                  )}
                </div>
                {/* Total Amount */}
                <div className="bg-blue-50 rounded-lg px-3 py-2 mb-4 flex justify-between items-center">
                  <span className="text-xs text-blue-500 font-medium">Total Amount</span>
                  <span className="text-sm font-black text-blue-700">₹{getPlanTotal(plan).total}</span>
                </div>
                
                <div className="space-y-2 mb-4">
                   <div className="flex justify-between text-sm text-gray-600 border-b border-gray-50 pb-1">
                      <span>Deposit</span>
                      <span className="font-semibold">{plan.deposit}</span>
                   </div>
                   {plan.securityMoney && plan.securityMoney !== "None" && (
                   <div className="flex justify-between text-sm text-gray-600 border-b border-gray-50 pb-1">
                      <span>Security</span>
                      <span className="font-semibold">{plan.securityMoney}</span>
                   </div>
                   )}
                   {plan.discount > 0 && (
                   <div className="flex justify-between text-sm text-green-600 border-b border-gray-50 pb-1">
                      <span>Discount</span>
                      <span className="font-semibold">{plan.discount}% OFF</span>
                   </div>
                   )}
                   <div className="flex justify-between text-sm text-gray-600 border-b border-gray-50 pb-1">
                      <span>Installation</span>
                      <span className="font-semibold">{plan.installationCost}</span>
                   </div>
                   {plan.productId && (
                      <div className="flex justify-between text-sm text-blue-600 font-bold border-b border-gray-50 pb-1">
                         <span>Model</span>
                         <span className="truncate max-w-[120px]">{plan.productId.name}</span>
                      </div>
                   )}
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Features</p>
                  <ul className="grid grid-cols-1 gap-1">
                    {plan.features.slice(0, 3).map((feat, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-center gap-1.5">
                             <FaCheck className="text-green-500 text-[10px]" /> {feat}
                        </li>
                    ))}
                    {plan.features.length > 3 && (
                        <li className="text-xs text-blue-500 font-medium">+ {plan.features.length - 3} more</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan._id)}
                    className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

          {/* Grid Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, plans.length)} of {plans.length} plans</p>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition">Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 text-sm rounded-lg transition ${p === currentPage ? "bg-blue-600 text-white font-bold" : "border border-gray-200 hover:bg-gray-100"}`}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {modalMode === "create" ? "Add New Plan" : "Edit Plan"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Basic Info */}
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                        <input
                        type="text"
                        name="planName"
                        value={formData.planName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Premium RO"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (₹)</label>
                        <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        disabled={formData.installationCost === "Free"}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                        placeholder="499"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag (Optional)</label>
                        <input
                        type="text"
                        name="tag"
                        value={formData.tag}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Most Popular"
                        />
                    </div>
                 </div>

                 {/* Costs */}
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Installation Cost</label>
                        <select
                          name="installationCost"
                          value={formData.installationCost === "Free" ? "Free" : "Paid"}
                          onChange={(e) => {
                            if (e.target.value === "Free") {
                              setFormData(prev => ({ ...prev, installationCost: "Free", price: "0" }));
                            } else {
                              setFormData(prev => ({ ...prev, installationCost: "", price: "" }));
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="Free">Free</option>
                          <option value="Paid">Paid</option>
                        </select>
                        {formData.installationCost !== "Free" && (
                          <input
                            type="text"
                            name="installationCost"
                            value={formData.installationCost}
                            onChange={handleInputChange}
                            className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. ₹500"
                          />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Refundable Deposit</label>
                        <input
                        type="text"
                        name="deposit"
                        value={formData.deposit}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. ₹1000 Refundable"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Security Money</label>
                        <input
                        type="text"
                        name="securityMoney"
                        value={formData.securityMoney}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. ₹2000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                        <input
                        type="number"
                        name="discount"
                        value={formData.discount}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. 10"
                        />
                    </div>

                     <div className="flex items-center gap-2 pt-6">
                        <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 select-none">Plan is Active</label>
                    </div>
                 </div>
              </div>

              {/* Total Amount Summary */}
              {(formData.price || formData.securityMoney || formData.installationCost !== "Free") && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">💰 Auto Calculated Summary</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Monthly Rent</span>
                    <span>₹{calc.rent}</span>
                  </div>
                  {calc.installation > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Installation Cost</span>
                    <span>₹{calc.installation}</span>
                  </div>
                  )}
                  {calc.security > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Security Money</span>
                    <span>₹{calc.security}</span>
                  </div>
                  )}
                  {calc.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({calc.disc}%)</span>
                    <span>- ₹{calc.discountAmount}</span>
                  </div>
                  )}
                  <div className="flex justify-between font-black text-blue-700 text-base border-t border-blue-200 pt-2 mt-2">
                    <span>Total Amount</span>
                    <span>₹{calc.total}</span>
                  </div>
                </div>
              </div>
              )}

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features (One per line)
                </label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  placeholder="Free Installation&#10;Unlimited Service&#10;Lifetime Warranty"
                />
              </div>

              {/* Free Uses & Free Parts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Free Uses (One per line)</label>
                  <textarea
                    name="freeUses"
                    value={formData.freeUses}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    placeholder="Unlimited Service Visits&#10;Free Filter Change&#10;Free Technician Visit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Free Parts (One per line)</label>
                  <textarea
                    name="freeParts"
                    value={formData.freeParts}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    placeholder="Sediment Filter&#10;Carbon Filter&#10;Membrane"
                  />
                </div>
              </div>

              {/* Linked Product & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link RO Product (Model)</label>
                    <div className="relative">
                        <input 
                            type="text"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer bg-white"
                            readOnly
                            placeholder="-- No Product Linked --"
                            onClick={() => setShowProductDropdown(!showProductDropdown)}
                            value={formData.productId ? allProducts.find(p => (p._id || p.id) === formData.productId)?.name || "No Product Linked" : "No Product Linked"}
                        />
                        {showProductDropdown && (
                            <div className="absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border p-3 animate-in fade-in slide-in-from-top-2 duration-200 bg-white">
                                <div className="relative mb-2">
                                    <div className="absolute left-3 top-2.5 opacity-40 text-xs">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search product..."
                                        autoFocus
                                        className="w-full pl-8 p-1.5 rounded-lg border text-xs outline-none focus:ring-2"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    <div 
                                        className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors text-red-500 font-bold"
                                        onClick={() => {
                                            setFormData({...formData, productId: ""});
                                            setShowProductDropdown(false);
                                            setProductSearch("");
                                        }}
                                    >
                                        -- No Product Linked --
                                    </div>
                                    {allProducts.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                        <div 
                                            key={p._id || p.id}
                                            className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors flex justify-between items-center"
                                            onClick={() => {
                                                setFormData({...formData, productId: p._id || p.id});
                                                setShowProductDropdown(false);
                                                setProductSearch("");
                                            }}
                                        >
                                            <span className="font-medium">{p.name}</span>
                                        </div>
                                    ))}
                                    {allProducts.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && productSearch && (
                                        <div className="p-2 text-center text-xs opacity-50">No products found</div>
                                    )}
                                </div>
                            </div>
                        )}
                        {showProductDropdown && <div className="fixed inset-0 z-[999]" onClick={() => setShowProductDropdown(false)}></div>}
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. For large families (4-6 members)"
                    />
                 </div>
              </div>

              {/* AMC Plans Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Applicable AMC Plans</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allAmcPlans.map((plan) => (
                      <div
                        key={plan._id}
                        onClick={() => toggleAmcPlan(plan._id)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.amcPlans.includes(plan._id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-100"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">{plan.name}</span>
                          <span className="text-[11px] text-gray-500">₹{plan.price} / {plan.durationMonths}m</span>
                        </div>
                        {formData.amcPlans.includes(plan._id) ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <FaCheck className="text-white text-[10px]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                        )}
                      </div>
                    ))}
                  </div>
                  {allAmcPlans.length === 0 && (
                     <p className="text-xs text-gray-400 italic">No AMC plans found.</p>
                  )}
                </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {imagePreview ? (
                        <div className="relative w-full max-w-xs mx-auto h-48 rounded-lg overflow-hidden shadow-sm">
                             <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400">
                            <FaImage className="text-4xl mb-2" />
                            <span className="text-sm font-medium">Click to upload image</span>
                        </div>
                    )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
                >
                  {modalMode === "create" ? "Create Plan" : "Update Plan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
