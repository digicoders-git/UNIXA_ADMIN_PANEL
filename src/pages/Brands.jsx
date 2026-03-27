import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { listBrands, createBrand, updateBrand, deleteBrand } from "../apis/brands";
import { FaTag, FaPlus, FaEdit, FaTrash, FaTimes, FaSyncAlt } from "react-icons/fa";
import Swal from "sweetalert2";

export default function Brands() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", isActive: true });
  const [error, setError] = useState("");

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setBrands(await listBrands());
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load brands.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", isActive: true });
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (brand) => {
    setEditing(brand);
    setForm({ name: brand.name, isActive: brand.isActive });
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Brand name is required."); return; }
    try {
      setSaving(true);
      setError("");
      if (editing) {
        await updateBrand(editing._id, form);
        Swal.fire({ icon: "success", title: "Updated", timer: 1500, showConfirmButton: false });
      } else {
        await createBrand(form);
        Swal.fire({ icon: "success", title: "Created", timer: 1500, showConfirmButton: false });
      }
      setIsModalOpen(false);
      fetchBrands();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brand) => {
    const result = await Swal.fire({
      title: `Delete "${brand.name}"?`,
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e02424",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteBrand(brand._id);
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
      fetchBrands();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: e?.response?.data?.message || "Failed to delete." });
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: currentFont.family }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaTag /> Brands
          </h1>
          <p className="text-sm opacity-60" style={{ color: themeColors.text }}>
            Manage product brands used in products and RO parts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBrands}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "#1e3a8a", color: "#fff" }}
          >
            <FaPlus /> Add Brand
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ backgroundColor: themeColors.background + "50", borderColor: themeColors.border }}>
              {["#", "Brand Name", "Status", "Created", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: themeColors.text }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm opacity-50">Loading brands...</td></tr>
            ) : brands.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm opacity-50">No brands found. Add your first brand!</td></tr>
            ) : brands.map((brand, idx) => (
              <tr key={brand._id} className="border-b hover:bg-slate-50/50 transition-colors" style={{ borderColor: themeColors.border + "40" }}>
                <td className="px-4 py-3 text-xs opacity-50" style={{ color: themeColors.text }}>{idx + 1}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: themeColors.text }}>{brand.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${brand.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {brand.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs opacity-60" style={{ color: themeColors.text }}>
                  {new Date(brand.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(brand)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title="Edit">
                      <FaEdit size={14} />
                    </button>
                    <button onClick={() => handleDelete(brand)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                      <FaTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl shadow-2xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: themeColors.border }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><FaTag size={14} /></div>
                {editing ? "Edit Brand" : "Add New Brand"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors" style={{ color: themeColors.text }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg text-xs border" style={{ backgroundColor: themeColors.danger + "15", borderColor: themeColors.danger + "50", color: themeColors.danger }}>
                  {error}
                </div>
              )}

              <div>
                <label className="block mb-1 text-sm font-medium" style={{ color: themeColors.text }}>
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                  placeholder="e.g. Kent, Aquaguard, Livpure"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="brandActive"
                  checked={form.isActive}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="brandActive" className="text-sm" style={{ color: themeColors.text }}>Active</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                  style={{ borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.surface }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-100"
                  style={{ backgroundColor: "#1e3a8a", color: "#fff" }}
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
