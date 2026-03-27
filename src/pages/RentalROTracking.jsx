import { useEffect, useState } from "react";
import { getRentalTracking, updateRentalTracking } from "../apis/rentalPlans";
import { FaSearch, FaEdit, FaTimes, FaCheck, FaExclamationTriangle, FaClock, FaRupeeSign, FaWater } from "react-icons/fa";
import Swal from "sweetalert2";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Cancelled: "bg-red-100 text-red-700",
  Inactive: "bg-gray-100 text-gray-500",
};

const PAYMENT_COLORS = {
  Paid: "bg-green-100 text-green-700",
  Due: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 10;

export default function RentalROTracking() {
  const [data, setData] = useState({ stats: {}, customers: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [editModal, setEditModal] = useState(null); // customer object
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getRentalTracking({
        status: statusFilter !== "All" ? statusFilter : undefined,
        payment: paymentFilter !== "All" ? paymentFilter : undefined,
        search: search || undefined,
      });
      setData(res);
      setPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter, paymentFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchData, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openEdit = (cust) => {
    setEditModal(cust);
    setEditForm({
      status: cust.rentalDetails?.status || "Active",
      paymentStatus: cust.rentalDetails?.paymentStatus || "Due",
      nextDueDate: cust.rentalDetails?.nextDueDate ? cust.rentalDetails.nextDueDate.split("T")[0] : "",
      notes: cust.rentalDetails?.notes || "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRentalTracking(editModal._id, editForm);
      Swal.fire("Updated!", "Rental status updated.", "success");
      setEditModal(null);
      fetchData();
    } catch (err) {
      Swal.fire("Error", "Failed to update.", "error");
    } finally {
      setSaving(false);
    }
  };

  const { stats, customers } = data;
  const totalPages = Math.ceil((customers?.length || 0) / PAGE_SIZE);
  const paginated = (customers || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const today = new Date();
  const isDueSoon = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };
  const isOverdue = (dateStr) => dateStr && new Date(dateStr) < today;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaWater className="text-blue-500" /> Rental RO Tracking
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Track all rental customers, payments & due dates</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total || 0, color: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Active", value: stats.active || 0, color: "bg-green-50 text-green-700 border-green-100" },
          { label: "Pending", value: stats.pending || 0, color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
          { label: "Cancelled", value: stats.cancelled || 0, color: "bg-red-50 text-red-700 border-red-100" },
          { label: "Overdue", value: stats.overdue || 0, color: "bg-orange-50 text-orange-700 border-orange-100" },
          { label: "Due in 7d", value: stats.dueSoon || 0, color: "bg-purple-50 text-purple-700 border-purple-100" },
          { label: "Total Revenue", value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, color: "bg-indigo-50 text-indigo-700 border-indigo-100", wide: true },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color} ${s.wide ? "col-span-2 md:col-span-1" : ""}`}>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-xl font-black mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, mobile, plan..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-white"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
          {["All", "Active", "Pending", "Inactive", "Cancelled"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
          {["All", "Paid", "Due", "Overdue"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No rental customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Plan / Model</th>
                  <th className="px-4 py-3 text-right">Monthly Rent</th>
                  <th className="px-4 py-3 text-center">Rental Status</th>
                  <th className="px-4 py-3 text-center">Payment</th>
                  <th className="px-4 py-3 text-center">Start Date</th>
                  <th className="px-4 py-3 text-center">Next Due</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((cust, idx) => {
                  const r = cust.rentalDetails || {};
                  const dueSoon = isDueSoon(r.nextDueDate);
                  const overdue = isOverdue(r.nextDueDate) && r.status === "Active";
                  return (
                    <tr key={cust._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{cust.name}</p>
                        <p className="text-xs text-gray-400">{cust.mobile}</p>
                        {cust.address?.city && <p className="text-xs text-gray-300">{cust.address.city}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{r.planName || "—"}</p>
                        <p className="text-xs text-gray-400">{r.machineModel || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">
                        {r.amount ? `₹${r.amount}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-500"}`}>
                          {r.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${PAYMENT_COLORS[r.paymentStatus] || "bg-gray-100 text-gray-500"}`}>
                          {r.paymentStatus || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.nextDueDate ? (
                          <span className={`text-xs font-semibold flex items-center justify-center gap-1 ${overdue ? "text-red-600" : dueSoon ? "text-orange-500" : "text-gray-600"}`}>
                            {overdue && <FaExclamationTriangle size={10} />}
                            {dueSoon && !overdue && <FaClock size={10} />}
                            {new Date(r.nextDueDate).toLocaleDateString("en-IN")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEdit(cust)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">
                          <FaEdit size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, customers.length)} of {customers.length}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm rounded-lg transition ${p === page ? "bg-blue-600 text-white font-bold" : "border border-gray-200 hover:bg-gray-100"}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition">Next</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">Update Rental</h2>
                <p className="text-xs text-gray-400">{editModal.name} — {editModal.rentalDetails?.planName}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-2 hover:bg-gray-100 rounded-full"><FaTimes /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rental Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  {["Active", "Pending", "Inactive", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select value={editForm.paymentStatus} onChange={e => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  {["Paid", "Due", "Overdue"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
                <input type="date" value={editForm.nextDueDate} onChange={e => setEditForm(f => ({ ...f, nextDueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                {saving ? "Saving..." : <><FaCheck size={12} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
