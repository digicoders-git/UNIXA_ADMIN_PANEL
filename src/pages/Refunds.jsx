import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getRefunds, updateRefundStatus, deleteRefundRequest } from "../apis/refunds";
import {
  FaUndo,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaSearch,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaExchangeAlt
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function Refunds() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [adminComment, setAdminComment] = useState("");

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = {
          status: statusFilter,
          type: typeFilter
      };
      const res = await getRefunds(filters);
      setRefunds(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
      // For rejection or approval, maybe ask for confirmation or comments
      if (status === "Rejected" && !adminComment) {
          const { value: text } = await Swal.fire({
              input: 'textarea',
              inputLabel: 'Reason for Rejection',
              inputPlaceholder: 'Type your reason here...',
              inputAttributes: {
                  'aria-label': 'Type your reason here'
              },
              showCancelButton: true
          });
          if (text) {
             processUpdate(id, status, text);
          }
      } else {
          Swal.fire({
              title: `Mark as ${status}?`,
              text: `Are you sure you want to update this request to ${status}?`,
              icon: "question",
              showCancelButton: true,
              confirmButtonText: "Yes, Update",
              confirmButtonColor: status === 'Approved' ? '#10B981' : '#EF4444'
          }).then((result) => {
              if (result.isConfirmed) {
                  processUpdate(id, status, adminComment);
              }
          });
      }
  };

  const processUpdate = async (id, status, comment) => {
      try {
          await updateRefundStatus(id, { status, adminComments: comment });
          Swal.fire("Updated!", `Request has been marked as ${status}.`, "success");
          setIsDetailsModalOpen(false);
          setAdminComment("");
          fetchData();
      } catch (err) {
          Swal.fire("Error", "Failed to update status", "error");
      }
  };

  const handleDelete = async (id) => {
      const result = await Swal.fire({
            title: "Delete Request?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
      });

      if (result.isConfirmed) {
          try {
              await deleteRefundRequest(id);
              Swal.fire("Deleted!", "Request has been deleted.", "success");
              fetchData();
          } catch (err) {
              Swal.fire("Error", "Failed to delete request", "error");
          }
      }
  };

  const openDetails = (refund) => {
      setSelectedRefund(refund);
      setAdminComment(refund.adminComments || "");
      setIsDetailsModalOpen(true);
  };

  const filteredRefunds = refunds.filter(r => 
      r.orderId?._id?.includes(search) || 
      r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.userId?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
          <FaUndo className="text-purple-600" /> Refunds & Cancellations
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60">Pending Requests</p>
                  <p className="text-2xl font-bold text-yellow-600">{refunds.filter(r=>r.status==='Pending').length}</p>
              </div>
              <FaClock className="text-yellow-100 text-3xl" />
          </div>
          <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60">Approved/Refunded</p>
                  <p className="text-2xl font-bold text-green-600">{refunds.filter(r=>['Approved','Refunded'].includes(r.status)).length}</p>
              </div>
              <FaCheckCircle className="text-green-100 text-3xl" />
          </div>
          <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">₹{refunds.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}</p>
              </div>
              <FaMoneyBillWave className="text-blue-100 text-3xl" />
          </div>
          <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{refunds.filter(r=>r.status==='Rejected').length}</p>
              </div>
              <FaTimesCircle className="text-red-100 text-3xl" />
          </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2">
              <div className="flex gap-2 p-1 rounded-lg border overflow-x-auto" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                  {["All", "Pending", "Approved", "Refunded", "Rejected"].map(s => (
                      <button
                        key={s}
                        onClick={()=>setStatusFilter(s)}
                        className={`px-3 py-2 text-xs md:text-sm rounded-md transition font-medium whitespace-nowrap`}
                        style={{
                            backgroundColor: statusFilter === s ? themeColors.background : 'transparent',
                            color: statusFilter === s ? themeColors.primary : themeColors.text,
                            opacity: statusFilter === s ? 1 : 0.6
                        }}
                      >
                          {s}
                      </button>
                  ))}
              </div>
               <div className="flex gap-2 p-1 rounded-lg border overflow-x-auto" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                  {["All", "Cancellation", "Return"].map(t => (
                      <button
                        key={t}
                        onClick={()=>setTypeFilter(t)}
                        className={`px-3 py-2 text-xs md:text-sm rounded-md transition font-medium whitespace-nowrap`}
                        style={{
                            backgroundColor: typeFilter === t ? themeColors.background : 'transparent',
                            color: typeFilter === t ? themeColors.primary : themeColors.text,
                            opacity: typeFilter === t ? 1 : 0.6
                        }}
                      >
                          {t}
                      </button>
                  ))}
              </div>
          </div>
            
          <div className="relative w-full md:w-auto">
             <FaSearch className="absolute left-3 top-3 opacity-50" />
             <input
                 type="text"
                 placeholder="Search Order ID, Customer..."
                 value={search}
                 onChange={(e)=>setSearch(e.target.value)}
                 className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500"
                 style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
             />
          </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead style={{ backgroundColor: themeColors.background, color: themeColors.text }} className="text-xs uppercase opacity-70 border-b">
                      <tr>
                          <th className="p-4">Request Info</th>
                          <th className="p-4">Order Details</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                      {loading ? (
                          <tr><td colSpan="6" className="p-8 text-center animate-pulse" style={{ color: themeColors.text }}>Loading...</td></tr>
                      ) : filteredRefunds.length === 0 ? (
                          <tr><td colSpan="6" className="p-8 text-center opacity-50" style={{ color: themeColors.text }}>No requests found.</td></tr>
                      ) : (
                          filteredRefunds.map(refund => (
                              <tr key={refund._id} className="transition hover:bg-black/5" style={{ color: themeColors.text }}>
                                  <td className="p-4">
                                      <div className="font-bold flex items-center gap-2">
                                          {refund.type === 'Cancellation' ? <FaTimesCircle className="text-red-500" /> : <FaExchangeAlt className="text-blue-500" />}
                                          {refund.type}
                                      </div>
                                      <div className="text-xs opacity-60 mt-1">{new Date(refund.createdAt).toLocaleDateString()}</div>
                                  </td>
                                  <td className="p-4">
                                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                                          #{refund.orderId?._id?.slice(-6)}
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="font-medium">{refund.userId?.name || "Unknown"}</div>
                                      <div className="text-xs opacity-60">{refund.userId?.mobile}</div>
                                  </td>
                                  <td className="p-4">
                                      <span className="font-bold">₹{refund.amount}</span>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                          refund.status === 'Pending' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                          refund.status === 'Approved' || refund.status === 'Refunded' ? 'text-green-600 bg-green-50 border-green-200' :
                                          'text-red-600 bg-red-50 border-red-200'
                                      }`}>
                                          {refund.status}
                                      </span>
                                  </td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={()=>openDetails(refund)}
                                            className="px-3 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-xs font-medium"
                                          >
                                              Details
                                          </button>
                                          <button 
                                            onClick={()=>handleDelete(refund._id)}
                                            className="px-2 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition text-xs"
                                            title="Delete Request"
                                          >
                                              <FaTimesCircle />
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

      {/* Details Modal */}
      {isDetailsModalOpen && selectedRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                  className="rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
                  style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
              >
                  <h2 className="text-xl font-bold mb-4 border-b pb-2 flex justify-between items-center" style={{ borderColor: themeColors.border }}>
                      <span>Request Details</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                           selectedRefund.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>{selectedRefund.status}</span>
                  </h2>

                  <div className="space-y-4">
                      <div className="p-3 bg-opacity-50 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
                          <p className="text-xs opacity-60 uppercase mb-1">Reason for Request</p>
                          <p className="text-sm font-medium">{selectedRefund.reason}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <p className="text-xs opacity-60">Request Type</p>
                              <p className="font-medium">{selectedRefund.type}</p>
                          </div>
                          <div>
                              <p className="text-xs opacity-60">Refund Amount</p>
                              <p className="font-bold text-lg">₹{selectedRefund.amount}</p>
                          </div>
                      </div>

                      {/* Action Section */}
                      {selectedRefund.status === 'Pending' && (
                          <div className="mt-6 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                              <p className="text-sm font-bold mb-2">Admin Actions</p>
                              <textarea 
                                  className="w-full p-2 rounded border mb-3 text-sm"
                                  placeholder="Add admin comments (optional)..."
                                  rows="3"
                                  value={adminComment}
                                  onChange={e=>setAdminComment(e.target.value)}
                                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                              ></textarea>
                              <div className="flex gap-2">
                                  <button 
                                      onClick={()=>handleStatusUpdate(selectedRefund._id, 'Approved')}
                                      className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                  >
                                      Approve
                                  </button>
                                  <button 
                                      onClick={()=>handleStatusUpdate(selectedRefund._id, 'Rejected')}
                                      className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                  >
                                      Reject
                                  </button>
                              </div>
                          </div>
                      )}
                      
                      {selectedRefund.status === 'Approved' && (
                           <div className="mt-4">
                                <button 
                                   onClick={()=>handleStatusUpdate(selectedRefund._id, 'Refunded')}
                                   className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                                >
                                    Mark as Refunded
                                </button>
                           </div>
                      )}

                      <div className="flex justify-end mt-4">
                          <button 
                              onClick={()=>setIsDetailsModalOpen(false)}
                              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                              Close
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
