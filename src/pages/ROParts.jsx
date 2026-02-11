// src/pages/ROParts.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import {
  listRoParts,
  createRoPart,
  updateRoPart,
  deleteRoPart,
} from "../apis/roParts";
import { getCategories } from "../apis/categories";
import { listAmcPlans } from "../apis/amcPlans";
import { FaCheck } from "react-icons/fa";
import {
  FaWrench,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaSearch,
  FaToggleOn,
  FaToggleOff,
  FaTimes,
  FaFilter
} from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const emptyForm = {
  p_id: "",
  name: "",
  price: "",
  discountPercent: "0",
  description: "",
  categoryId: "",
  isActive: true,
  amcPlans: [],
};

export default function ROParts() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [roParts, setRoParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allAmcPlans, setAllAmcPlans] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [partsList, catsData, amcPlansData] = await Promise.all([
        listRoParts(),
        getCategories(),
        listAmcPlans(true),
      ]);
      setRoParts(partsList);
      setCategories(Array.isArray(catsData) ? catsData : catsData.categories || []);
      setAllAmcPlans(amcPlansData || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleAmcPlan = (planId) => {
    setForm(prev => {
      const exists = prev.amcPlans.includes(planId);
      if (exists) {
        return { ...prev, amcPlans: prev.amcPlans.filter(id => id !== planId) };
      } else {
        return { ...prev, amcPlans: [...prev.amcPlans, planId] };
      }
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (part) => {
    setEditing(part);
    setForm({
      p_id: part.p_id || "",
      name: part.name || "",
      price: String(part.price || ""),
      discountPercent: String(part.discountPercent || "0"),
      description: part.description || "",
      categoryId: part.category?._id || part.category || "",
      isActive: part.isActive ?? true,
      amcPlans: Array.isArray(part.amcPlans) ? part.amcPlans.map(a => a._id || a) : [],
    });
    setImagePreview(part.mainImage?.url || "");
    setImageFile(null);
    setError("");
    setIsModalOpen(true);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("p_id", form.p_id);
    fd.append("name", form.name);
    fd.append("price", form.price);
    fd.append("discountPercent", form.discountPercent);
    fd.append("description", form.description);
    fd.append("categoryId", form.categoryId);
    fd.append("isActive", String(form.isActive));
    if (form.amcPlans && form.amcPlans.length) {
      fd.append("amcPlans", JSON.stringify(form.amcPlans));
    }
    if (imageFile) fd.append("mainImage", imageFile);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.categoryId) {
      setError("Name, Price and Category are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const fd = buildFormData();

      if (editing) {
        await updateRoPart(editing._id, fd);
        Swal.fire({ icon: "success", title: "Updated", text: "RO Part updated successfully!", timer: 1500, showConfirmButton: false });
      } else {
        if (!imageFile) throw new Error("Image is required for new RO Part.");
        await createRoPart(fd);
        Swal.fire({ icon: "success", title: "Created", text: "RO Part created successfully!", timer: 1500, showConfirmButton: false });
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (part) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You want to delete "${part.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await deleteRoPart(part._id);
        Swal.fire("Deleted!", "Part has been deleted.", "success");
        fetchData();
      } catch (err) {
        Swal.fire("Error!", err?.response?.data?.message || "Failed to delete part.", "error");
      }
    }
  };

  const filteredParts = useMemo(() => {
    return roParts.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [roParts, search]);

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: currentFont.family }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaWrench className="text-blue-600" /> RO Parts Management
          </h1>
          <p className="text-sm opacity-60" style={{ color: themeColors.text }}>
            Manage RO replacement parts, filters, and accessories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Search parts..."
              className="pl-9 pr-4 py-2 rounded-lg border focus:ring-2 outline-none text-sm transition-all"
              style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={fetchData} className="p-2.5 rounded-lg border hover:bg-slate-50 transition-colors" style={{ borderColor: themeColors.border, color: themeColors.text }}>
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-95"
          >
            <FaPlus /> Add Part
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
          <FaTimes className="shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto opacity-50 hover:opacity-100"><FaTimes /></button>
        </div>
      )}

      <div className="grid grid-cols-1 overflow-x-auto rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b" style={{ backgroundColor: themeColors.background + "40", borderColor: themeColors.border }}>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60">Image</th>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60">Part Details</th>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60">Category</th>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60">Pricing</th>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60">Status</th>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60">AMC Plans</th>
              <th className="px-4 py-3 font-semibold uppercase text-[11px] tracking-wider opacity-60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
            {loading ? (
              <tr><td colSpan="6" className="py-20 text-center opacity-50">Loading parts...</td></tr>
            ) : filteredParts.length === 0 ? (
              <tr><td colSpan="6" className="py-20 text-center opacity-50">No parts found matching your search.</td></tr>
            ) : (
              filteredParts.map((part) => (
                <tr key={part._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <img src={part.mainImage?.url} alt={part.name} className="w-12 h-12 object-cover rounded-lg border shadow-sm" style={{ borderColor: themeColors.border }} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{part.name}</div>
                    <div className="text-xs opacity-50 line-clamp-1">{part.description || "No description"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                      {part.category?.name || "Uncategorized"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold">₹{part.finalPrice}</div>
                    {part.discountPercent > 0 && (
                      <div className="text-[10px] text-red-500">
                        <span className="line-through text-slate-400 mr-1">₹{part.price}</span>
                        {part.discountPercent}% OFF
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${part.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${part.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {part.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {part.amcPlans?.length > 0 ? (
                        part.amcPlans.map((p, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded border border-indigo-100">
                             {typeof p === 'object' ? p.name : allAmcPlans.find(ap => ap._id === p)?.name || 'Plan'}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(part)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FaEdit /></button>
                      <button onClick={() => handleDelete(part)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold"><FaPlus size={14} /></div>
                {editing ? "Edit Part" : "Add New Part"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FaTimes /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Part P ID *</label>
                  <input
                    type="text" required value={form.p_id} name="p_id" onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                    placeholder="e.g. 93101"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Part Name *</label>
                  <input
                    type="text" required value={form.name} name="name" onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Category *</label>
                  <select
                    name="categoryId" required value={form.categoryId} onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                  <div className="flex items-center h-[38px]">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={`text-xl transition-colors ${form.isActive ? 'text-blue-600' : 'text-slate-300'}`}
                    >
                      {form.isActive ? <FaToggleOn /> : <FaToggleOff />}
                    </button>
                    <span className="ml-2 text-xs font-semibold">{form.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Base Price (₹) *</label>
                  <input
                    type="number" required value={form.price} name="price" onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Discount (%)</label>
                  <input
                    type="number" min="0" max="100" value={form.discountPercent} name="discountPercent" onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Part Image *</label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 group-hover:border-blue-400 transition-colors">
                        {imagePreview ? (
                          <img src={imagePreview} className="w-full h-full object-cover" />
                        ) : (
                          <FaPlus className="text-slate-300" />
                        )}
                        <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      JPG, PNG or WEBP allowed.
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Short Description</label>
                  <textarea
                    rows="2" value={form.description} name="description" onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-sm"
                    placeholder="Brief details..."
                  />
                </div>
                {/* AMC Plans Selection */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Applicable AMC Plans</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allAmcPlans.map((plan) => (
                      <div
                        key={plan._id}
                        onClick={() => toggleAmcPlan(plan._id)}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                          form.amcPlans.includes(plan._id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold">{plan.name}</span>
                          <span className="text-[10px] opacity-60">₹{plan.price} / {plan.durationMonths}m</span>
                        </div>
                        {form.amcPlans.includes(plan._id) ? (
                          <FaCheck className="text-blue-500 text-[10px]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                  {allAmcPlans.length === 0 && (
                     <p className="text-[10px] opacity-50 italic">No AMC plans found.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-2.5 rounded-xl border font-bold text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
