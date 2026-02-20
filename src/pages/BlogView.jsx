import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getBlogComments, likeBlog, unlikeBlog } from "../apis/blogs";
import { BlogAnalyticsCharts } from "../components/BlogAnalyticsCharts";
import { FaArrowLeft, FaHeart, FaTags, FaCalendar } from "react-icons/fa";

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN") : "-";

export default function BlogView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const blogData = JSON.parse(sessionStorage.getItem('viewBlog'));
    if (blogData) {
      setBlog(blogData);
      fetchComments(blogData);
    } else {
      navigate('/blogs');
    }
    setLoading(false);
  }, [id, navigate]);

  const fetchComments = async (blogData) => {
    try {
      setLoadingComments(true);
      const idOrSlug = blogData.slug || blogData._id || blogData.id;
      const data = await getBlogComments(idOrSlug);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    const idOrSlug = blog.slug || blog._id || blog.id;
    const likedBlogs = JSON.parse(localStorage.getItem('adminLikedBlogs') || '[]');
    const isLiked = likedBlogs.includes(idOrSlug);

    try {
      if (isLiked) {
        await unlikeBlog(idOrSlug);
        const updatedLikes = likedBlogs.filter(id => id !== idOrSlug);
        localStorage.setItem('adminLikedBlogs', JSON.stringify(updatedLikes));
        setBlog(prev => ({ ...prev, likes: Math.max(0, (prev.likes || 0) - 1) }));
      } else {
        await likeBlog(idOrSlug);
        likedBlogs.push(idOrSlug);
        localStorage.setItem('adminLikedBlogs', JSON.stringify(likedBlogs));
        setBlog(prev => ({ ...prev, likes: (prev.likes || 0) + 1 }));
      }
    } catch (error) {
      console.error('Failed to like/unlike:', error);
    }
  };

  if (loading || !blog) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: currentFont.family }}>
        <p style={{ color: themeColors.text }}>Loading...</p>
      </div>
    );
  }

  const likedBlogs = JSON.parse(localStorage.getItem('adminLikedBlogs') || '[]');
  const isLiked = likedBlogs.includes(blog.slug || blog._id || blog.id);

  return (
    <div className="space-y-6 p-6" style={{ fontFamily: currentFont.family }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/blogs')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-slate-50"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            color: themeColors.text,
          }}
        >
          <FaArrowLeft />
          Back to Blogs
        </button>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
            isLiked ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-600'
          }`}
        >
          <FaHeart fill={isLiked ? 'currentColor' : 'none'} />
          {blog.likes || 0} Likes
        </button>
      </div>

      {/* Blog Title */}
      <div className="p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: themeColors.text }}>{blog.title}</h1>
        <div className="flex items-center gap-4 text-sm" style={{ color: themeColors.text, opacity: 0.7 }}>
          <span className="flex items-center gap-2">
            <FaCalendar />
            {fmtDate(blog.createdAt)}
          </span>
          <span>{blog.category}</span>
          <span>{blog.views || 0} views</span>
        </div>
      </div>

      {/* Analytics */}
      <div className="p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>Analytics</h2>
        <BlogAnalyticsCharts blog={blog} comments={comments} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>Content</h2>
          {blog.shortDescription && (
            <p className="text-slate-600 italic mb-4">"{blog.shortDescription}"</p>
          )}
          <div
            className="prose max-w-none"
            style={{ color: themeColors.text }}
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <h3 className="text-sm font-bold uppercase mb-3 flex items-center gap-2" style={{ color: themeColors.text }}>
                <FaTags /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100"
                    style={{ color: themeColors.text }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <h3 className="text-sm font-bold uppercase mb-3" style={{ color: themeColors.text }}>
              Comments ({comments.length})
            </h3>
            {loadingComments ? (
              <p className="text-xs text-slate-500">Loading...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-500">No comments yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment._id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs" style={{ color: themeColors.text }}>{comment.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
