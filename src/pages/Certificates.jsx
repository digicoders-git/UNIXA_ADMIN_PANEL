import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getCertificates, addCertificate, updateCertificate, deleteCertificate } from "../apis/certificates";
import { FaCertificate, FaPlus, FaEdit, FaTrash, FaImage, FaTimes, FaUpload, FaLink } from "react-icons/fa";
import Swal from "sweetalert2";

export default function Certificates() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", imageUrl: "", isActive: true, order: 0 });
  const [uploadMode, setUploadMode] = useState("url"); // "url" or "file"
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await getCertificates();
      console.log('Admin Panel - Fetched certificates:', data);
      setCertificates(data);
    } catch (error) {
      console.error('Admin Panel - Error fetching certificates:', error);
      Swal.fire("Error", "Failed to load certificates", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire("Error", "Please select an image file", "error");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, imageUrl: reader.result });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      Swal.fire("Error", "Failed to upload image", "error");
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCertificate(editing._id, form);
        Swal.fire("Success", "Certificate updated", "success");
      } else {
        await addCertificate(form);
        Swal.fire("Success", "Certificate added", "success");
      }
      setIsModalOpen(false);
      fetchCertificates();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Certificate?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await deleteCertificate(id);
        Swal.fire("Deleted!", "Certificate deleted.", "success");
        fetchCertificates();
      } catch (error) {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ title: "", description: "", imageUrl: "", isActive: true, order: 0 });
    setUploadMode("url");
    setIsModalOpen(true);
  };

  const openEditModal = (cert) => {
    setEditing(cert);
    setForm({ title: cert.title, description: cert.description || "", imageUrl: cert.imageUrl, isActive: cert.isActive, order: cert.order });
    setUploadMode("url");
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaCertificate className="text-blue-500" /> Certificates
          </h1>
          <p className="text-sm opacity-60">Manage company certifications</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <FaPlus /> Add Certificate
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl" style={{ borderColor: themeColors.border }}>
          <FaCertificate className="text-6xl opacity-20 mb-4" />
          <p className="text-lg font-medium opacity-60">No certificates found</p>
          <p className="text-sm opacity-40 mt-1">Click "Add Certificate" to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div key={cert._id} className="rounded-xl border p-5 flex flex-col gap-4 hover:shadow-lg transition" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
              <div className="relative">
                <img src={cert.imageUrl} alt={cert.title} className="w-full h-48 object-cover rounded-lg" />
                {!cert.isActive && <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">Inactive</div>}
              </div>
              <div>
                <h3 className="font-bold text-lg">{cert.title}</h3>
                {cert.description && <p className="text-sm opacity-70 mt-1">{cert.description}</p>}
                <p className="text-xs opacity-50 mt-2">Order: {cert.order}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => openEditModal(cert)} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1">
                  <FaEdit /> Edit
                </button>
                <button onClick={() => handleDelete(cert._id)} className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold">{editing ? "Edit Certificate" : "Add Certificate"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 transition">
                <FaTimes />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title *</label>
                      <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} rows="3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Display Order</label>
                        <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                          <span className="text-sm font-medium">Active</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Image *</label>
                      <div className="flex gap-2 mb-3">
                        <button type="button" onClick={() => setUploadMode("url")} className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition ${uploadMode === "url" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                          <FaLink /> URL
                        </button>
                        <button type="button" onClick={() => setUploadMode("file")} className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 transition ${uploadMode === "file" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                          <FaUpload /> Upload
                        </button>
                      </div>
                      {uploadMode === "url" ? (
                        <input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/image.jpg" className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required />
                      ) : (
                        <div>
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} disabled={uploading} />
                          {uploading && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
                        </div>
                      )}
                    </div>
                    {form.imageUrl && (
                      <div className="border rounded-lg p-3" style={{ borderColor: themeColors.border }}>
                        <p className="text-xs font-medium mb-2 opacity-70">Preview</p>
                        <img src={form.imageUrl} alt="Preview" className="w-full h-48 object-contain rounded bg-gray-50" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-6 mt-6 border-t" style={{ borderColor: themeColors.border }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 transition">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Save Certificate</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
