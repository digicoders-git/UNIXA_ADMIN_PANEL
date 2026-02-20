import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getAdminReviews, approveReview, deleteReview } from "../apis/reviews";
import { FaStar, FaCheck, FaTrash, FaClock, FaUser } from "react-icons/fa";
import Swal from "sweetalert2";

export default function Reviews() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await getAdminReviews();
      setReviews(data.reviews);
    } catch (error) {
      Swal.fire("Error", "Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, showInSlider = false) => {
    try {
      await approveReview(id, showInSlider);
      Swal.fire("Success", "Review approved", "success");
      fetchReviews();
    } catch (error) {
      Swal.fire("Error", "Failed to approve", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Review?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await deleteReview(id);
        Swal.fire("Deleted!", "Review deleted.", "success");
        fetchReviews();
      } catch (error) {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === "pending") return !r.isApproved;
    if (filter === "approved") return r.isApproved;
    return true;
  });

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaStar className="text-yellow-500" /> Customer Reviews
          </h1>
          <p className="text-sm opacity-60">Manage testimonials and reviews</p>
        </div>
        <div className="flex gap-2">
          {["all", "pending", "approved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg capitalize ${filter === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center" style={{ backgroundColor: themeColors.surface }}>
            <FaStar size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: themeColors.text }}>No Reviews Found</h3>
          <p className="opacity-60" style={{ color: themeColors.text }}>No customer reviews available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((review) => (
            <div key={review._id} className="rounded-xl border p-5 flex flex-col gap-4 hover:shadow-lg transition" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {review.user.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{review.user}</h3>
                    <p className="text-xs opacity-60">{review.role || "Customer"}</p>
                  </div>
                </div>
                {review.isApproved ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <FaCheck size={10} /> Approved
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                    <FaClock size={10} /> Pending
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} size={14} className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                ))}
              </div>
              <p className="text-sm opacity-80 italic">"{review.comment}"</p>
              <div className="flex gap-2 mt-auto pt-4 border-t" style={{ borderColor: themeColors.border }}>
                {!review.isApproved && (
                  <>
                    {/* <button onClick={() => handleApprove(review._id, false)} className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-1 text-xs">
                      <FaCheck /> Approve
                    </button> */}
                    <button onClick={() => handleApprove(review._id, true)} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1 text-xs">
                      <FaCheck /> Accept
                    </button>
                  </>
                )}
                <button onClick={() => handleDelete(review._id)} className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
