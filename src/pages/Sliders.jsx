// src/pages/Sliders.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import {
  listSliders,
  createSlider,
  updateSlider,
  deleteSlider,
} from "../apis/sliders";
import {
  FaImages,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaSearch,
  FaLink,
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
  title: "",
  subtitle: "",
  buttonText: "",
  linkUrl: "",
  sortOrder: "",
  titleColor: "#ffffff",
  subtitleColor: "#ffffff",
  isActive: true,
};

export default function Sliders() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { isLoggedIn } = useAuth();

  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // slider being edited
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [search, setSearch] = useState("");

  // ---------- fetch ----------
  const fetchSliders = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await listSliders();
      setSliders(list);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load sliders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSliders();
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
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview("");
    }
  };

  const handleEdit = (slider) => {
    setEditing(slider);
    setForm({
      title: slider.title || "",
      subtitle: slider.subtitle || "",
      buttonText: slider.buttonText || "",
      linkUrl: slider.linkUrl || "",
      sortOrder:
        typeof slider.sortOrder === "number"
          ? String(slider.sortOrder)
          : slider.sortOrder || "",
      titleColor: slider.titleColor || "#ffffff",
      subtitleColor: slider.subtitleColor || "#ffffff",
      isActive:
        typeof slider.isActive === "boolean" ? slider.isActive : true,
    });
    setImageFile(null);
    setImagePreview(slider.image?.url || "");
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    if (form.subtitle.trim()) fd.append("subtitle", form.subtitle.trim());
    if (form.buttonText.trim())
      fd.append("buttonText", form.buttonText.trim());
    if (form.linkUrl.trim()) fd.append("linkUrl", form.linkUrl.trim());
    if (form.sortOrder !== "") fd.append("sortOrder", form.sortOrder);
    fd.append("titleColor", form.titleColor);
    fd.append("subtitleColor", form.subtitleColor);
    fd.append("isActive", String(form.isActive));
    if (imageFile) fd.append("image", imageFile);
    return fd;
  };

  const handleDelete = async (slider) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to delete sliders.");
      return;
    }

    const id = slider._id || slider.id;
    if (!id) {
      setError("Cannot delete this slider (missing identifier).");
      return;
    }

    const result = await Swal.fire({
      title: `Delete slider "${slider.title}"?`,
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
      await deleteSlider(id);
      setSuccess("Slider deleted successfully.");
      await fetchSliders();
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Slider deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to delete slider.";
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

  // ---------- Active / Inactive toggle ----------
  const handleToggleStatus = async (slider) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to change status.");
      return;
    }

    const id = slider._id || slider.id;
    if (!id) {
      setError("Cannot update this slider (missing identifier).");
      return;
    }

    const newStatus = !slider.isActive;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateSlider(id, { isActive: newStatus });

      // Local state update so row list se gayab na ho
      setSliders((prev) =>
        prev.map((s) =>
          (s._id || s.id) === (slider._id || slider.id)
            ? { ...s, isActive: newStatus }
            : s
        )
      );

      setSuccess(
        `Slider ${newStatus ? "activated" : "deactivated"} successfully.`
      );

      Swal.fire({
        icon: "success",
        title: newStatus ? "Activated" : "Deactivated",
        text: `Slider ${newStatus ? "activated" : "deactivated"} successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update slider status.";
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
      setError("You must be logged in as admin to manage sliders.");
      return;
    }

    if (!form.title.trim()) {
      setError("Slider title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const fd = buildFormData();

      if (editing) {
        const id = editing._id || editing.id;
        if (!id) throw new Error("Missing slider identifier for update.");
        await updateSlider(id, fd);
        setSuccess("Slider updated successfully.");
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Slider updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createSlider(fd);
        setSuccess("Slider created successfully.");
        Swal.fire({
          icon: "success",
          title: "Created",
          text: "Slider created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      resetForm();
      setIsModalOpen(false);
      await fetchSliders();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to save slider.";
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

  const filteredSliders = useMemo(() => {
    let list = sliders;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        const title = (s.title || "").toLowerCase();
        const subtitle = (s.subtitle || "").toLowerCase();
        const btn = (s.buttonText || "").toLowerCase();
        const url = (s.linkUrl || "").toLowerCase();
        return (
          title.includes(q) ||
          subtitle.includes(q) ||
          btn.includes(q) ||
          url.includes(q)
        );
      });
    }

    // sort by sortOrder ascending, then createdAt desc
    return [...list].sort((a, b) => {
      const sa = a.sortOrder ?? 9999;
      const sb = b.sortOrder ?? 9999;
      if (sa !== sb) return sa - sb;
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });
  }, [sliders, search]);

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: currentFont.family }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaImages />
            Homepage Sliders
          </h1>
          <p
            className="text-sm opacity-60"
            style={{ color: themeColors.text }}
          >
            Manage the carousel images on your website's home page.
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
              placeholder="Search sliders..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchSliders}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors hover:bg-slate-50"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
            title="Refresh"
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
            Add Slider
          </button>
        </div>
      </div>

      {/* Messages */}
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
                  (themeColors.success || themeColors.primary) +
                  "15",
                borderColor:
                  (themeColors.success || themeColors.primary) +
                  "50",
                color:
                  themeColors.success || themeColors.primary,
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
                  (themeColors.warning || themeColors.primary) +
                  "15",
                borderColor:
                  (themeColors.warning || themeColors.primary) +
                  "50",
                color:
                  themeColors.warning || themeColors.primary,
              }}
            >
              You are viewing sliders in read-only mode. Login as admin
              to create, edit, or delete sliders.
            </div>
          )}
        </div>
      )}

      {/* Table */}
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
            <FaImages />
            Slider List
          </span>
          <span className="text-xs opacity-70">
            {filteredSliders.length} of {sliders.length} shown
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: themeColors.background + "30",
                }}
              >
                {[
                  "Image",
                  "Title & Subtitle",
                  "Button / Link",
                  "Order",
                  "Status",
                  "Created",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: themeColors.text }}
                  >
                    {h}
                  </th>
                ))}
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
                    Loading sliders...
                  </td>
                </tr>
              ) : filteredSliders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: themeColors.text }}
                  >
                    No sliders found.
                  </td>
                </tr>
              ) : (
                filteredSliders.map((s) => (
                  <tr key={s._id || s.id}>
                    {/* Image/Video */}
                    <td className="px-4 py-2">
                      {s.video?.url ? (
                        <video
                          src={s.video.url}
                          className="h-16 w-32 object-cover rounded-lg border"
                          style={{ borderColor: themeColors.border }}
                          muted
                        />
                      ) : s.image?.url ? (
                        <img
                          src={s.image.url}
                          alt={s.title}
                          className="h-16 w-32 object-cover rounded-lg border"
                          style={{ borderColor: themeColors.border }}
                        />
                      ) : (
                        <div
                          className="h-16 w-32 rounded-lg border flex items-center justify-center text-xs"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                        >
                          No media
                        </div>
                      )}
                    </td>

                    {/* Title */}
                    <td
                      className="px-4 py-2"
                      style={{ color: themeColors.text }}
                    >
                      <div className="font-semibold">{s.title}</div>
                      {s.subtitle && (
                        <div className="text-xs opacity-70">
                          {s.subtitle}
                        </div>
                      )}
                    </td>

                    {/* Button / Link */}
                    <td
                      className="px-4 py-2 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {s.buttonText && (
                        <div className="font-medium">
                          Button: {s.buttonText}
                        </div>
                      )}
                      {s.linkUrl && (
                        <div className="flex items-center gap-1 opacity-80 mt-1">
                          <FaLink />
                          <span>{s.linkUrl}</span>
                        </div>
                      )}
                    </td>

                    {/* Order */}
                    <td
                      className="px-4 py-2 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {s.sortOrder ?? "-"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: s.isActive
                            ? (themeColors.success ||
                                themeColors.primary) + "15"
                            : themeColors.border,
                          color: s.isActive
                            ? themeColors.success ||
                              themeColors.primary
                            : themeColors.text,
                        }}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Created */}
                    <td
                      className="px-4 py-2 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {fmtDate(s.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {/* Active/Inactive Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
                          disabled={!isLoggedIn || saving}
                          className="p-2 rounded-lg border text-xs disabled:opacity-40"
                          style={{
                            borderColor: themeColors.border,
                            color: s.isActive
                              ? themeColors.warning || "#f59e0b"
                              : themeColors.success ||
                                themeColors.primary,
                          }}
                          title={
                            isLoggedIn
                              ? s.isActive
                                ? "Mark as Inactive"
                                : "Mark as Active"
                              : "Login as admin to change status"
                          }
                        >
                          {s.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          disabled={!isLoggedIn}
                          className="p-2 rounded-lg border text-xs disabled:opacity-40"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                          title={
                            isLoggedIn
                              ? "Edit"
                              : "Login as admin to edit"
                          }
                        >
                          <FaEdit />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          disabled={!isLoggedIn || saving}
                          className="p-2 rounded-lg border text-xs disabled:opacity-40"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.danger,
                          }}
                          title={
                            isLoggedIn
                              ? "Delete"
                              : "Login as admin to delete"
                          }
                        >
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
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
                {editing ? "Edit Slider" : "Create Slider"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label
                    htmlFor="title"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Big Sale Banner"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label
                    htmlFor="subtitle"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Subtitle
                  </label>
                  <input
                    id="subtitle"
                    name="subtitle"
                    type="text"
                    value={form.subtitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Up to 50% Off"
                  />
                </div>

                {/* Button text */}
                <div>
                  <label
                    htmlFor="buttonText"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Button Text
                  </label>
                  <input
                    id="buttonText"
                    name="buttonText"
                    type="text"
                    value={form.buttonText}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Shop Now"
                  />
                </div>

                {/* Link URL */}
                <div>
                  <label
                    htmlFor="linkUrl"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Link URL
                  </label>
                  <input
                    id="linkUrl"
                    name="linkUrl"
                    type="text"
                    value={form.linkUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="/sale"
                  />
                </div>

                {/* Sort order */}
                <div>
                  <label
                    htmlFor="sortOrder"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Sort Order
                  </label>
                  <input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="1"
                  />
                  <p
                    className="text-xs mt-1 opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    Lower number appears earlier in the slider.
                  </p>
                </div>

                {/* Title Color */}
                <div>
                  <label
                    htmlFor="titleColor"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Title Color
                  </label>
                  <input
                    id="titleColor"
                    name="titleColor"
                    type="color"
                    value={form.titleColor}
                    onChange={handleChange}
                    className="w-full h-10 px-1 py-1 rounded-lg border cursor-pointer"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                    }}
                  />
                </div>

                {/* Subtitle Color */}
                <div>
                  <label
                    htmlFor="subtitleColor"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Subtitle Color
                  </label>
                  <input
                    id="subtitleColor"
                    name="subtitleColor"
                    type="color"
                    value={form.subtitleColor}
                    onChange={handleChange}
                    className="w-full h-10 px-1 py-1 rounded-lg border cursor-pointer"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                    }}
                  />
                </div>

                {/* Active */}
                <div className="flex items-center gap-2 mt-6">
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

                {/* Image/Video picker */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="sliderMedia"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Slider Image or Video
                  </label>

                  <label
                    className="w-full flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer text-sm transition hover:border-opacity-80"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background + "40",
                      color: themeColors.text,
                    }}
                  >
                    <input
                      id="sliderMedia"
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <FaImages className="text-xl mb-2 opacity-80" />
                    <span className="font-medium">
                      {imageFile
                        ? "Change selected file"
                        : "Click to choose image or video"}
                    </span>
                    <span className="text-xs opacity-70 mt-1">
                      Recommended: Wide banner (JPG/PNG/MP4)
                    </span>
                  </label>

                  {(imagePreview || editing?.image?.url || editing?.video?.url) && (
                    <div className="mt-3">
                      <p
                        className="text-xs mb-1 opacity-70"
                        style={{ color: themeColors.text }}
                      >
                        Preview:
                      </p>
                      {(imagePreview || editing?.image?.url) && !imageFile?.type?.startsWith('video/') && (
                        <img
                          src={imagePreview || editing?.image?.url}
                          alt="Preview"
                          className="w-full max-h-48 object-cover rounded-xl border"
                          style={{ borderColor: themeColors.border }}
                        />
                      )}
                      {((imageFile?.type?.startsWith('video/')) || editing?.video?.url) && (
                        <video
                          src={imagePreview || editing?.video?.url}
                          controls
                          className="w-full max-h-48 object-cover rounded-xl border"
                          style={{ borderColor: themeColors.border }}
                        />
                      )}
                      {editing && !imageFile && (
                        <p
                          className="text-xs mt-1 opacity-70"
                          style={{ color: themeColors.text }}
                        >
                          Uploading a new file will replace the existing one.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              </div>

              {/* Footer Actions - ALWAYS VISIBLE */}
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
                    backgroundColor: "#1e3a8a", // Match premium theme blue
                    color: "#ffffff",
                  }}
                >
                  {saving
                    ? (editing ? "Saving..." : "Creating...")
                    : (editing ? "Save Changes" : "Create Slider")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
