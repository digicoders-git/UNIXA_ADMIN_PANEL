import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import http from "../apis/http"; 
import { assignProductsToAmc, getAmcProducts } from "../apis/amcPlans";
import { listProducts } from "../apis/products";
import {
  FaShieldAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaStar,
  FaBox,
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function AmcPlans() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth(); // Get token from context
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [form, setForm] = useState({
    name: "",
    price: "",
    durationMonths: 12,
    features: "",
    color: "blue",
    isPopular: false,
    isActive: true,
  });

  useEffect(() => {
    fetchPlans();
    fetchProducts();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data } = await http.get("/api/amc-plans"); // Public/Admin route
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Error fetching plans", error);
      Swal.fire("Error", "Failed to fetch plans", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const products = await listProducts();
      setAllProducts(products);
    } catch (error) {
      console.error("Error fetching products", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      };

      if (editingId) {
        await http.put(`/api/amc-plans/${editingId}`, payload);
        Swal.fire("Success", "Plan updated successfully", "success");
      } else {
        await http.post("/api/amc-plans", payload);
        Swal.fire("Success", "Plan created successfully", "success");
      }
      setIsModalOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan", error);
      Swal.fire("Error", "Failed to save plan", "error");
    }
  };

  const handleEdit = (plan) => {
    setEditingId(plan._id);
    setForm({
      name: plan.name,
      price: plan.price,
      durationMonths: plan.durationMonths,
      features: plan.features.join(', '),
      color: plan.color,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await http.delete(`/api/amc-plans/${id}`);
      Swal.fire("Success", "Plan deleted", "success");
      fetchPlans();
    } catch (error) {
      Swal.fire("Error", "Failed to delete plan", "error");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      price: "",
      durationMonths: 12,
      features: "",
      color: "blue",
      isPopular: false,
      isActive: true,
    });
  };

  const handleAssignProducts = async (planId) => {
    setSelectedPlanId(planId);
    try {
      const response = await getAmcProducts(planId);
      const ids = response.productIds?.map(p => typeof p === 'string' ? p : p._id) || [];
      setSelectedProducts(ids);
    } catch (error) {
      setSelectedProducts([]);
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProducts = async () => {
    try {
      await assignProductsToAmc(selectedPlanId, selectedProducts);
      Swal.fire("Success", "Products assigned successfully", "success");
      setIsProductModalOpen(false);
    } catch (error) {
      Swal.fire("Error", "Failed to assign products", "error");
    }
  };

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont?.family, color: themeColors?.text }}
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors?.text }}>
          <FaShieldAlt className="text-blue-600" /> Master AMC Plans
        </h1>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md"
        >
          <FaPlus /> Create New Plan
        </button>
      </div>

      <div
        className="rounded-xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: themeColors?.surface || '#fff', borderColor: themeColors?.border || '#eee' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead
              style={{ backgroundColor: themeColors?.background || '#f9f9f9', color: themeColors?.text }}
              className="text-xs uppercase opacity-70 border-b"
            >
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Price</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Features</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors?.border || '#eee' }}>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center">Loading...</td></tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan._id} style={{ color: themeColors?.text }}>
                    <td className="p-4">
                        <div className="font-bold">{plan.name}</div>
                        {plan.isPopular && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">Popular</span>}
                    </td>
                    <td className="p-4 font-bold">₹{plan.price}</td>
                    <td className="p-4">{plan.durationMonths} Months</td>
                    <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                            {plan.features.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-700">{f}</span>
                            ))}
                            {plan.features.length > 3 && <span className="text-xs opacity-50">+{plan.features.length - 3} more</span>}
                        </div>
                    </td>
                    <td className="p-4">
                        {plan.isActive ? 
                            <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Active</span> : 
                            <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">Inactive</span>
                        }
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleAssignProducts(plan._id)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Assign Products">
                          <FaBox />
                        </button>
                        <button onClick={() => handleEdit(plan)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(plan._id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: themeColors?.surface, color: themeColors?.text }}>
            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Plan" : "Create Plan"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 rounded border"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full p-2 rounded border"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    value={form.durationMonths}
                    onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                    className="w-full p-2 rounded border"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Features (comma separated)</label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="w-full p-2 rounded border"
                  rows="3"
                  placeholder="e.g. Free Labor, 2 Services, Filter Change"
                ></textarea>
              </div>
              
              <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.isPopular}
                        onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                    />
                    Is Popular?
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Is Active?
                  </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Assignment Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: themeColors?.surface, color: themeColors?.text }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaBox /> Assign Products to AMC Plan
            </h2>
            <div className="space-y-2 mb-4">
              {allProducts.map((product) => (
                <label key={product._id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product._id)}
                    onChange={() => toggleProduct(product._id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm opacity-60">₹{product.price}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProducts}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                Save Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
