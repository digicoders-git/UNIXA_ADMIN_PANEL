// src/pages/Categories.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../apis/categories";
import {
  FaBox,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaSearch,
  FaToggleOn,
  FaToggleOff,
  FaTimes
} from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// ---------- helpers ----------
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN") : "-";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

export default function Categories() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { isLoggedIn } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // category being edited
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getCategories();
      // res could be array or { categories: [] }
      const list = Array.isArray(res) ? res : res.categories || [];
      setCategories(list);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load categories."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setImageFile(null);
    setImagePreview("");
  };

  const openAddModal = () => {
    resetForm();
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccess("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      isActive: typeof cat.isActive === "boolean" ? cat.isActive : true,
    });
    setImagePreview(cat.image?.url || "");
    setSuccess("");
    setError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (cat) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to delete categories.");
      return;
    }

    const idOrSlug = cat.slug || cat._id || cat.id;
    if (!idOrSlug) {
      setError("Cannot delete this category (missing identifier).");
      return;
    }

    const result = await Swal.fire({
      title: `Delete category "${cat.name}"?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e02424",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await deleteCategory(idOrSlug);
      setSuccess("Category deleted successfully.");
      await fetchCategories();
      if (editing && editing._id === cat._id) {
        resetForm();
      }
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Category deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to delete category.";
      setError(msg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to change status.");
      return;
    }

    const idOrSlug = cat.slug || cat._id || cat.id;
    if (!idOrSlug) {
      setError("Cannot update this category (missing identifier).");
      return;
    }

    const newStatus = !cat.isActive;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateCategory(idOrSlug, { isActive: newStatus });

      // Local state update so row stays visible,
      // only status changes
      setCategories((prev) =>
        prev.map((c) =>
          (c._id || c.id || c.slug) === (cat._id || cat.id || cat.slug)
            ? { ...c, isActive: newStatus }
            : c
        )
      );

      setSuccess(
        `Category ${newStatus ? "activated" : "deactivated"} successfully.`
      );

      Swal.fire({
        icon: "success",
        title: newStatus ? "Activated" : "Deactivated",
        text: `Category ${newStatus ? "activated" : "deactivated"} successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update category status.";
      setError(msg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      setError("You must be logged in as admin to manage categories.");
      return;
    }

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("isActive", form.isActive);
    if (form.slug.trim()) {
      formData.append("slug", form.slug.trim());
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editing) {
        const idOrSlug = editing.slug || editing._id || editing.id;
        if (!idOrSlug) {
          throw new Error("Missing category identifier for update.");
        }
        await updateCategory(idOrSlug, formData);
        setSuccess("Category updated successfully.");
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Category updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createCategory(formData);
        setSuccess("Category created successfully.");
        Swal.fire({
          icon: "success",
          title: "Created",
          text: "Category created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      resetForm();
      setIsModalOpen(false);
      await fetchCategories();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to save category.";
      setError(msg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const slug = (c.slug || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return name.includes(q) || slug.includes(q) || desc.includes(q);
    });
  }, [categories, search]);

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: currentFont.family }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaBox />
            Categories
          </h1>
          <p
            className="text-sm opacity-60"
            style={{ color: themeColors.text }}
          >
            Manage product categories for your e-commerce store.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs opacity-50">
              <FaSearch style={{ color: themeColors.text }} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchCategories}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors hover:bg-slate-50"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={openAddModal}
            disabled={!isLoggedIn}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: "#1e3a8a", // Dark blue from image
              color: "#ffffff",
            }}
          >
            <FaPlus />
            Add Category
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {(error || success || !isLoggedIn) && (
        <div className="space-y-2">
          {error && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                backgroundColor: themeColors.danger + "15",
                borderColor: themeColors.danger + "50",
                color: themeColors.danger,
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                backgroundColor:
                  (themeColors.success || themeColors.primary) + "15",
                borderColor:
                  (themeColors.success || themeColors.primary) + "50",
                color: themeColors.success || themeColors.primary,
              }}
            >
              {success}
            </div>
          )}
          {!isLoggedIn && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                backgroundColor:
                  (themeColors.warning || themeColors.primary) + "15",
                borderColor:
                  (themeColors.warning || themeColors.primary) + "50",
                color: themeColors.warning || themeColors.primary,
              }}
            >
              You are viewing public categories. Login as admin to add,
              edit, or delete categories.
            </div>
          )}
        </div>
      )}

      {/* Table only (form ab modal me) */}
      <div
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <h2
          className="text-lg font-semibold mb-4 flex items-center justify-between"
          style={{ color: themeColors.text }}
        >
          <span className="flex items-center gap-2">
            <FaBox />
            Category List
          </span>
          <span className="text-xs opacity-70">
            {filteredCategories.length} of {categories.length} shown
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: themeColors.background + "50",
                  borderColor: themeColors.border,
                }}
              >
                {["Category", "Slug & Desc", "Status", "Created", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: themeColors.text }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: themeColors.border }}
            >
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: themeColors.text }}
                  >
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: themeColors.text }}
                  >
                    No categories found.
                  </td>
                </tr>
              ) : (
                  filteredCategories.map((cat) => {
                  const id = cat._id || cat.id || cat.slug;
                  return (
                    <tr 
                      key={id}
                      className="hover:bg-slate-50/50 transition-colors group"
                      style={{ borderBottom: `1px solid ${themeColors.border}40` }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {cat.image?.url ? (
                            <img 
                              src={cat.image.url} 
                              alt={cat.name} 
                              className="w-10 h-10 object-cover rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                               <FaBox size={14} />
                            </div>
                          )}
                          <div className="font-bold text-sm" style={{ color: themeColors.text }}>{cat.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[10px] font-mono opacity-50 uppercase tracking-tighter">{cat.slug || "no-slug"}</div>
                        <div className="text-[11px] opacity-70 truncate max-w-[150px]" style={{ color: themeColors.text }}>{cat.description || "-"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                            cat.isActive 
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {cat.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-bold" style={{ color: themeColors.text }}>
                          {cat.createdAt ? fmtDate(cat.createdAt) : "-"}
                        </div>
                        <div className="text-[10px] opacity-50 uppercase tracking-tighter">Listed On</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(cat)}
                            disabled={!isLoggedIn}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-30"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            disabled={!isLoggedIn || saving}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-30"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <div
              className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50"
            >
              <h2
                className="text-xl font-bold flex items-center gap-3"
                style={{ color: themeColors.text }}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FaPlus />
                </div>
                {editing ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                style={{ color: themeColors.text }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* (Optional) show error inside modal */}
              {error && (
                <div
                  className="p-2 rounded-lg text-xs border"
                  style={{
                    backgroundColor: themeColors.danger + "15",
                    borderColor: themeColors.danger + "50",
                    color: themeColors.danger,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block mb-1 text-sm font-medium"
                  style={{ color: themeColors.text }}
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                  placeholder="e.g. Electronics"
                />
              </div>

              {/* Slug */}
              <div>
                <label
                  htmlFor="slug"
                  className="block mb-1 text-sm font-medium"
                  style={{ color: themeColors.text }}
                >
                  Slug (optional)
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={form.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                  placeholder="e.g. electronics"
                />
                <p
                  className="text-xs mt-1 opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Leave blank to let the system generate a slug.
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block mb-1 text-sm font-medium"
                  style={{ color: themeColors.text }}
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                  placeholder="Short description for this category..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block mb-1 text-sm font-medium" style={{ color: themeColors.text }}>
                   Category Image
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-lg border"
                      style={{ borderColor: themeColors.border }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-xs"
                    style={{ color: themeColors.text }}
                  />
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm"
                  style={{ color: themeColors.text }}
                >
                  Active
                </label>
              </div>

              </div>

              {/* Footer Actions */}
              <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: themeColors.surface,
                    color: themeColors.text,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isLoggedIn}
                  className="px-8 py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100"
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "#ffffff",
                  }}
                >
                  {saving
                    ? editing
                      ? "Saving..."
                      : "Creating..."
                    : editing
                    ? "Save Changes"
                    : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}