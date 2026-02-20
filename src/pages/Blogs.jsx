// src/pages/Blogs.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { BlogAnalyticsCharts } from "../components/BlogAnalyticsCharts";
import {
  getAllBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog,
  unlikeBlog,
  getBlogComments,
} from "../apis/blogs";
import { useNavigate } from "react-router-dom";
import {
  FaBlog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaSearch,
  FaEye,
  FaHeart,
  FaToggleOn,
  FaToggleOff,
  FaStar,
  FaCalendar,
  FaTags,
  FaImage,
  FaTimes
} from "react-icons/fa";
import Swal from "sweetalert2";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN") : "-";

const emptyForm = {
  title: "",
  shortDescription: "",
  content: "",
  thumbnailImage: "",
  coverImage: "",
  category: "",
  tags: [],
  metaTitle: "",
  metaDescription: "",
  metaKeywords: [],
  isPublished: true,
  isFeatured: false,
};

export default function Blogs() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewBlog, setViewBlog] = useState(null);
  const [blogComments, setBlogComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dynamic arrays for tags and keywords
  const [tagsList, setTagsList] = useState([""]);
  const [keywordsList, setKeywordsList] = useState([""]);

  // Content state for rich text editor
  const [editorContent, setEditorContent] = useState("");

  // Image files
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const fetchBlogs = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllBlogs(page, 10);
      setBlogs(res.blogs || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.totalPages || 1);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load blogs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setTagsList([""]);
    setKeywordsList([""]);
    setEditorContent("");
    setThumbnailFile(null);
    setCoverFile(null);
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

  // Tags handlers
  const handleTagChange = (index, value) => {
    setTagsList((prev) =>
      prev.map((tag, i) => (i === index ? value : tag))
    );
  };

  const handleTagAdd = () => {
    setTagsList((prev) => [...prev, ""]);
  };

  const handleTagRemove = (index) => {
    setTagsList((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  // Keywords handlers
  const handleKeywordChange = (index, value) => {
    setKeywordsList((prev) =>
      prev.map((keyword, i) => (i === index ? value : keyword))
    );
  };

  const handleKeywordAdd = () => {
    setKeywordsList((prev) => [...prev, ""]);
  };

  const handleKeywordRemove = (index) => {
    setKeywordsList((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEdit = (blog) => {
    setEditing(blog);
    setForm({
      title: blog.title || "",
      shortDescription: blog.shortDescription || "",
      content: blog.content || "",
      thumbnailImage: blog.thumbnailImage || "",
      coverImage: blog.coverImage || "",
      category: blog.category || "",
      metaTitle: blog.metaTitle || "",
      metaDescription: blog.metaDescription || "",
      isPublished: blog.isPublished ?? true,
      isFeatured: blog.isFeatured ?? false,
    });

    setTagsList(
      Array.isArray(blog.tags) && blog.tags.length ? blog.tags : [""]
    );
    setKeywordsList(
      Array.isArray(blog.metaKeywords) && blog.metaKeywords.length
        ? blog.metaKeywords
        : [""]
    );

    setEditorContent(blog.content || "");
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleDelete = async (blog) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to delete blogs.");
      return;
    }

    // Use ObjectId (_id) for delete operations
    const blogId = blog._id || blog.id;
    if (!blogId) {
      setError("Cannot delete this blog (missing ObjectId).");
      return;
    }

    const result = await Swal.fire({
      title: `Delete blog "${blog.title}"?`,
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
      await deleteBlog(blogId);
      setSuccess("Blog deleted successfully.");
      await fetchBlogs(currentPage);
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Blog deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to delete blog.";
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

  const handleTogglePublished = async (blog) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to change status.");
      return;
    }

    // Use ObjectId (_id) for update operations
    const blogId = blog._id || blog.id;
    if (!blogId) {
      setError("Cannot update this blog (missing ObjectId).");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateBlog(blogId, { isPublished: !blog.isPublished });

      setBlogs((prev) =>
        prev.map((b) =>
          (b._id || b.id || b.slug) === (blog._id || blog.id || blog.slug)
            ? { ...b, isPublished: !b.isPublished }
            : b
        )
      );

      setSuccess(
        `Blog ${!blog.isPublished ? "published" : "unpublished"} successfully.`
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update blog status.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLike = async (blog) => {
    const idOrSlug = blog.slug || blog._id || blog.id;
    if (!idOrSlug) return;

    try {
      const likedBlogs = JSON.parse(localStorage.getItem('adminLikedBlogs') || '[]');
      const isLiked = likedBlogs.includes(idOrSlug);

      if (isLiked) {
        await unlikeBlog(idOrSlug);
        const updatedLikes = likedBlogs.filter(id => id !== idOrSlug);
        localStorage.setItem('adminLikedBlogs', JSON.stringify(updatedLikes));
      } else {
        await likeBlog(idOrSlug);
        likedBlogs.push(idOrSlug);
        localStorage.setItem('adminLikedBlogs', JSON.stringify(likedBlogs));
      }

      setBlogs((prev) =>
        prev.map((b) =>
          (b._id || b.id || b.slug) === (blog._id || blog.id || blog.slug)
            ? { ...b, likes: isLiked ? Math.max(0, (b.likes || 0) - 1) : (b.likes || 0) + 1 }
            : b
        )
      );
    } catch (e) {
      console.error("Failed to like/unlike blog:", e);
    }
  };

  const fetchBlogComments = async (blog) => {
    try {
      setLoadingComments(true);
      const idOrSlug = blog.slug || blog._id || blog.id;
      const data = await getBlogComments(idOrSlug);
      setBlogComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setBlogComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleViewBlog = (blog) => {
    sessionStorage.setItem('viewBlog', JSON.stringify(blog));
    navigate(`/blogs/view/${blog._id || blog.id}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      setError("You must be logged in as admin to manage blogs.");
      return;
    }

    // Validation
    if (!form.title.trim()) {
      setError("Blog title is required.");
      return;
    }

    if (form.title.trim().length < 5) {
      setError("Title must be at least 5 characters long.");
      return;
    }

    if (!editorContent.trim()) {
      setError("Blog content is required.");
      return;
    }

    if (editorContent.trim().length < 50) {
      setError("Content must be at least 50 characters long.");
      return;
    }

    if (!form.category.trim()) {
      setError("Category is required.");
      return;
    }

    if (!thumbnailFile && !form.thumbnailImage.trim()) {
      setError("Thumbnail image is required (upload file or provide URL).");
      return;
    }

    if (form.thumbnailImage.trim() && !form.thumbnailImage.match(/^https?:\/\/.+/)) {
      setError("Thumbnail image URL must be valid (start with http:// or https://).");
      return;
    }

    if (form.coverImage.trim() && !form.coverImage.match(/^https?:\/\/.+/)) {
      setError("Cover image URL must be valid (start with http:// or https://).");
      return;
    }

    if (form.shortDescription.trim() && form.shortDescription.trim().length > 300) {
      setError("Short description must not exceed 300 characters.");
      return;
    }

    if (form.metaDescription.trim() && form.metaDescription.trim().length > 160) {
      setError("Meta description must not exceed 160 characters.");
      return;
    }

    const cleanTags = tagsList
      .map((tag) => tag.trim())
      .filter((tag) => tag.length);

    if (cleanTags.length === 0) {
      setError("At least one tag is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const cleanKeywords = keywordsList
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length);

      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("shortDescription", form.shortDescription.trim());
      formData.append("content", editorContent.trim());
      formData.append("category", form.category.trim());
      formData.append("tags", cleanTags.join(","));
      formData.append("metaTitle", form.metaTitle.trim() || form.title.trim());
      formData.append("metaDescription", form.metaDescription.trim());
      formData.append("metaKeywords", cleanKeywords.join(","));
      formData.append("isPublished", form.isPublished);
      formData.append("isFeatured", form.isFeatured);

      if (thumbnailFile) {
        formData.append("thumbnailImage", thumbnailFile);
      } else if (form.thumbnailImage) {
        formData.append("thumbnailImage", form.thumbnailImage);
      }

      if (coverFile) {
        formData.append("coverImage", coverFile);
      } else if (form.coverImage) {
        formData.append("coverImage", form.coverImage);
      }

      if (editing) {
        const blogId = editing._id || editing.id;
        if (!blogId) {
          throw new Error("Missing blog ObjectId for update.");
        }
        await updateBlog(blogId, formData);
        setSuccess("Blog updated successfully.");
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Blog updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createBlog(formData);
        setSuccess("Blog created successfully.");
        Swal.fire({
          icon: "success",
          title: "Created",
          text: "Blog created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      resetForm();
      setIsModalOpen(false);
      await fetchBlogs(currentPage);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to save blog.";
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

  const filteredBlogs = useMemo(() => {
    if (!search.trim()) return blogs;
    const q = search.toLowerCase();
    return blogs.filter((blog) => {
      const title = (blog.title || "").toLowerCase();
      const category = (blog.category || "").toLowerCase();
      const tags = (blog.tags || []).join(" ").toLowerCase();
      return (
        title.includes(q) ||
        category.includes(q) ||
        tags.includes(q)
      );
    });
  }, [blogs, search]);

  return (
    <div className="space-y-6" style={{ fontFamily: currentFont.family }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaBlog />
            Blogs & Articles
          </h1>
          <p
            className="text-sm opacity-60"
            style={{ color: themeColors.text }}
          >
            Manage your website's blog posts and educational content.
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
              placeholder="Search blogs..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchBlogs}
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
            Create Blog
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
              You are viewing blogs as public. Login as admin to add, edit, or delete blogs.
            </div>
          )}
        </div>
      )}

      {/* Blogs List */}
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
            <FaBlog />
            Blog Posts
          </span>
          <span className="text-xs opacity-70">
            {filteredBlogs.length} of {blogs.length} shown
          </span>
        </h2>

        {loading ? (
          <p
            className="text-sm text-center py-6"
            style={{ color: themeColors.text }}
          >
            Loading blogs...
          </p>
        ) : filteredBlogs.length === 0 ? (
          <p
            className="text-sm text-center py-6"
            style={{ color: themeColors.text }}
          >
            No blogs found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBlogs.map((blog) => (
              <div
                key={blog._id || blog.id || blog.slug}
                className="rounded-xl border flex flex-col overflow-hidden"
                style={{ borderColor: themeColors.border }}
              >
                {/* Image */}
                <div className="relative">
                  <img
                    src={blog.thumbnailImage || blog.coverImage || ""}
                    alt={blog.title}
                    className="w-full h-40 object-cover"
                  />
                  {blog.isFeatured && (
                    <span
                      className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                      style={{
                        backgroundColor: themeColors.primary + "dd",
                        color: themeColors.onPrimary,
                      }}
                    >
                      <FaStar /> Featured
                    </span>
                  )}
                  {!blog.isPublished && (
                    <span
                      className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: themeColors.danger + "dd",
                        color: themeColors.onPrimary,
                      }}
                    >
                      Draft
                    </span>
                  )}
                </div>

                {/* Content */}
                <div
                  className="p-4 flex-1 flex flex-col gap-2"
                  style={{ backgroundColor: themeColors.surface }}
                >
                  <div>
                    <h3
                      className="font-semibold text-sm mb-1"
                      style={{ color: themeColors.text }}
                    >
                      {blog.title}
                    </h3>
                    <p
                      className="text-xs opacity-75"
                      style={{ color: themeColors.text }}
                    >
                      {blog.category}
                    </p>
                  </div>

                  {blog.shortDescription && (
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: themeColors.text }}
                    >
                      {blog.shortDescription}
                    </p>
                  )}

                  {/* Tags */}
                  {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {blog.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={`${tag}-${idx}`}
                          className="px-2 py-0.5 rounded-full text-[11px]"
                          style={{
                            backgroundColor: themeColors.background + "60",
                            color: themeColors.text,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {blog.tags.length > 3 && (
                        <span
                          className="text-[11px] opacity-70"
                          style={{ color: themeColors.text }}
                        >
                          +{blog.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ color: themeColors.text }}
                        className="opacity-70 flex items-center gap-1"
                      >
                        <FaCalendar />
                        {fmtDate(blog.createdAt)}
                      </span>
                      <button
                        onClick={() => handleLike(blog)}
                        className="flex items-center gap-1 opacity-70 hover:opacity-100"
                        style={{ color: themeColors.text }}
                      >
                        <FaHeart />
                        {blog.likes || 0}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewBlog(blog)}
                        className="px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1"
                        style={{
                          borderColor: themeColors.border,
                          color: themeColors.text,
                        }}
                        title="View"
                      >
                        <FaEye />
                      </button>

                      {isLoggedIn && (
                        <>
                          <button
                            onClick={() => handleTogglePublished(blog)}
                            disabled={saving}
                            className="px-2 py-1 rounded-lg border text-[11px] disabled:opacity-40"
                            style={{
                              borderColor: themeColors.border,
                              color: blog.isPublished
                                ? themeColors.success || themeColors.primary
                                : themeColors.warning || "#f59e0b",
                            }}
                            title={
                              blog.isPublished
                                ? "Mark as Draft"
                                : "Publish"
                            }
                          >
                            {blog.isPublished ? (
                              <FaToggleOn />
                            ) : (
                              <FaToggleOff />
                            )}
                          </button>

                          <button
                            onClick={() => handleEdit(blog)}
                            className="px-2 py-1 rounded-lg border text-[11px]"
                            style={{
                              borderColor: themeColors.border,
                              color: themeColors.text,
                            }}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>

                          <button
                            onClick={() => handleDelete(blog)}
                            disabled={saving}
                            className="px-2 py-1 rounded-lg border text-[11px] disabled:opacity-40"
                            style={{
                              borderColor: themeColors.border,
                              color: themeColors.danger,
                            }}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => fetchBlogs(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            >
              Previous
            </button>
            <span
              className="text-sm"
              style={{ color: themeColors.text }}
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => fetchBlogs(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
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
                {editing ? "Edit Blog Post" : "Create Blog Post"}
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
                <div className="md:col-span-2">
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
                    placeholder="Latest Glass Trends 2024"
                  />
                </div>

                {/* Short Description */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="shortDescription"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Short Description <span className="text-xs text-slate-500">(max 300 chars)</span>
                  </label>
                  <textarea
                    id="shortDescription"
                    name="shortDescription"
                    value={form.shortDescription}
                    onChange={handleChange}
                    rows={2}
                    maxLength={300}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Discover the hottest eyewear trends for this year"
                  />
                  <p className="text-xs text-slate-500 mt-1">{form.shortDescription.length}/300</p>
                </div>

                {/* Content */}
                <div className="md:col-span-2">
                  <label
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Content <span className="text-red-500">*</span>
                  </label>
                  <RichTextEditor
                    value={editorContent}
                    onChange={setEditorContent}
                    placeholder="Start writing your blog content..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="category"
                    name="category"
                    type="text"
                    value={form.category}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Fashion"
                  />
                </div>

                {/* Thumbnail Image */}
                <div>
                  <label
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Thumbnail Image <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThumbnailFile(e.target.files[0])}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      }}
                    />
                    <input
                      id="thumbnailImage"
                      name="thumbnailImage"
                      type="url"
                      value={form.thumbnailImage}
                      onChange={handleChange}
                      placeholder="Or paste URL (https://...)"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      }}
                    />
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Cover Image (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files[0])}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      }}
                    />
                    <input
                      id="coverImage"
                      name="coverImage"
                      type="url"
                      value={form.coverImage}
                      onChange={handleChange}
                      placeholder="Or paste URL (https://...)"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      }}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Tags <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {tagsList.map((tag, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) =>
                            handleTagChange(idx, e.target.value)
                          }
                          className="flex-1 px-2 py-1 rounded border text-xs"
                          style={{
                            backgroundColor: themeColors.surface,
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                          placeholder="glasses"
                        />
                        <button
                          type="button"
                          onClick={() => handleTagRemove(idx)}
                          className="px-2 py-1 rounded text-[11px] border"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.danger,
                          }}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleTagAdd}
                    className="mt-2 px-3 py-1 rounded-lg text-xs border flex items-center gap-1"
                    style={{
                      backgroundColor: themeColors.surface,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  >
                    <FaPlus /> Add Tag
                  </button>
                </div>

                {/* Meta Keywords */}
                <div>
                  <label
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Meta Keywords
                  </label>
                  <div className="space-y-2">
                    {keywordsList.map((keyword, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) =>
                            handleKeywordChange(idx, e.target.value)
                          }
                          className="flex-1 px-2 py-1 rounded border text-xs"
                          style={{
                            backgroundColor: themeColors.surface,
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                          placeholder="eyewear"
                        />
                        <button
                          type="button"
                          onClick={() => handleKeywordRemove(idx)}
                          className="px-2 py-1 rounded text-[11px] border"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.danger,
                          }}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleKeywordAdd}
                    className="mt-2 px-3 py-1 rounded-lg text-xs border flex items-center gap-1"
                    style={{
                      backgroundColor: themeColors.surface,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  >
                    <FaPlus /> Add Keyword
                  </button>
                </div>

                {/* Meta Title */}
                <div>
                  <label
                    htmlFor="metaTitle"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Meta Title
                  </label>
                  <input
                    id="metaTitle"
                    name="metaTitle"
                    type="text"
                    value={form.metaTitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Glass Trends 2024 - Fashion Guide"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <label
                    htmlFor="metaDescription"
                    className="block mb-1 text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Meta Description <span className="text-xs text-slate-500">(max 160 chars)</span>
                  </label>
                  <textarea
                    id="metaDescription"
                    name="metaDescription"
                    value={form.metaDescription}
                    onChange={handleChange}
                    rows={2}
                    maxLength={160}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                    placeholder="Complete guide to latest eyewear trends"
                  />
                  <p className="text-xs text-slate-500 mt-1">{form.metaDescription.length}/160</p>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-4 md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      id="isPublished"
                      name="isPublished"
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span
                      className="text-sm"
                      style={{ color: themeColors.text }}
                    >
                      Published
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      id="isFeatured"
                      name="isFeatured"
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <span
                      className="text-sm"
                      style={{ color: themeColors.text }}
                    >
                      Featured
                    </span>
                  </label>
                </div>
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
                    : "Create Blog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Blog Modal */}
      {viewBlog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div
            className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            {/* Header with Cover Image */}
            <div className="relative h-64 md:h-80 w-full shrink-0">
              <img
                src={viewBlog.coverImage || viewBlog.thumbnailImage || ""}
                alt={viewBlog.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <button
                onClick={() => setViewBlog(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors z-10"
              >
                <FaTimes size={20} />
              </button>

              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    {viewBlog.category || "General"}
                  </span>
                  {viewBlog.isFeatured && (
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <FaStar size={10} /> Featured
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${viewBlog.isPublished ? 'bg-emerald-500' : 'bg-slate-500'} text-white`}>
                    {viewBlog.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                  {viewBlog.title}
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-8 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Analytics Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Blog Analytics</h4>
                      <BlogAnalyticsCharts blog={viewBlog} comments={blogComments} />
                    </div>

                    {viewBlog.shortDescription && (
                      <div className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600 rounded-full opacity-20" />
                        <p className="text-xl text-slate-600 italic leading-relaxed font-medium" style={{ color: themeColors.text + '99' }}>
                          "{viewBlog.shortDescription}"
                        </p>
                      </div>
                    )}

                    <div 
                      className="prose prose-lg max-w-none prose-slate"
                      style={{ color: themeColors.text }}
                      dangerouslySetInnerHTML={{ __html: viewBlog.content }}
                    />

                    {/* Meta Information Section */}
                    {(viewBlog.metaTitle || viewBlog.metaDescription) && (
                      <div className="mt-12 p-6 rounded-3xl bg-slate-50 border border-slate-100" style={{ backgroundColor: themeColors.background }}>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">SEO Metadata</h4>
                        <div className="space-y-4">
                          {viewBlog.metaTitle && (
                            <div>
                              <p className="text-xs font-bold text-slate-500 mb-1">Meta Title</p>
                              <p className="text-sm font-medium" style={{ color: themeColors.text }}>{viewBlog.metaTitle}</p>
                            </div>
                          )}
                          {viewBlog.metaDescription && (
                            <div>
                              <p className="text-xs font-bold text-slate-500 mb-1">Meta Description</p>
                              <p className="text-sm text-slate-600 leading-relaxed" style={{ color: themeColors.text + 'cc' }}>{viewBlog.metaDescription}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-8 shrink-0">
                    <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-6" style={{ backgroundColor: themeColors.background + '50' }}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                            <FaCalendar size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published On</p>
                            <p className="text-sm font-bold" style={{ color: themeColors.text }}>{fmtDate(viewBlog.createdAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-pink-500">
                            <FaHeart size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Likes</p>
                            <p className="text-sm font-bold" style={{ color: themeColors.text }}>{viewBlog.likes || 0} Likes</p>
                          </div>
                        </div>
                      </div>

                      {Array.isArray(viewBlog.tags) && viewBlog.tags.length > 0 && (
                        <div className="pt-6 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <FaTags size={12} /> Tags
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {viewBlog.tags.map((tag, idx) => (
                              <span
                                key={`${tag}-${idx}`}
                                className="px-3 py-1 rounded-xl text-[11px] font-bold bg-white border border-slate-100 shadow-sm"
                                style={{ color: themeColors.text }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments Section */}
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Comments ({blogComments.length})</p>
                        {loadingComments ? (
                          <p className="text-xs text-slate-500">Loading...</p>
                        ) : blogComments.length === 0 ? (
                          <p className="text-xs text-slate-500">No comments yet.</p>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {blogComments.map((comment) => (
                              <div key={comment._id} className="p-3 bg-white rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-xs" style={{ color: themeColors.text }}>{comment.name}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{comment.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {viewBlog.thumbnailImage && (
                      <div className="p-4 rounded-3xl border border-slate-100 bg-white shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Thumbnail Preview</p>
                        <img
                          src={viewBlog.thumbnailImage}
                          alt="Thumbnail"
                          className="w-full h-32 object-cover rounded-2xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 {/* Empty left side */}
              </div>
              <div className="flex items-center gap-3">
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      handleEdit(viewBlog);
                      setViewBlog(null);
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <FaEdit /> Edit Post
                  </button>
                )}
                <button
                  onClick={() => setViewBlog(null)}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}