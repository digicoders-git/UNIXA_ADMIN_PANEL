import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getEmployees } from "../apis/employees";
import http from "../apis/http";
import {
  FaExclamationTriangle, FaSearch, FaSyncAlt, FaUserCog,
  FaCheckCircle, FaClock, FaTrash, FaSms, FaTicketAlt, FaTimes, FaClipboardList
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

export default function Complaints() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: "", assignedTechnician: "", resolutionNotes: "", priority: "" });

  useEffect(() => { 
    fetchComplaints(); 
    fetchEmployees();
    const interval = setInterval(fetchComplaints, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data.filter(e => e.role === "Employee" || e.role === "employee" || e.role === "Technician"));
    } catch (err) { console.error(err); }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/api/admin/complaints");
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      Swal.fire("Error", "Failed to load complaints", "error");
    } finally { setLoading(false); }
  };

  const openModal = (c) => {
    setSelectedComplaint(c);
    setEmployeeSearch(c.assignedTechnician || "");
    setUpdateForm({ status: c.status || "Open", assignedTechnician: c.assignedTechnician || "", resolutionNotes: c.resolutionNotes || "", priority: c.priority || "Medium" });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await http.put(`/api/admin/complaints/${selectedComplaint.complaintId}`, updateForm);
      Swal.fire("Updated!", "Complaint updated successfully.", "success");
      setIsModalOpen(false);
      fetchComplaints();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Update failed", "error");
    }
  };

  const handleDelete = async (c) => {
    const result = await Swal.fire({
      title: "Delete Complaint?", text: `Delete ${c.complaintId}?`,
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#d33", confirmButtonText: "Yes, delete"
    });
    if (result.isConfirmed) {
      try {
        await http.delete(`/api/admin/complaints/${c.complaintId}`);
        Swal.fire("Deleted!", "Complaint deleted.", "success");
        fetchComplaints();
      } catch (err) {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const handleSendSMS = async (c) => {
    const result = await Swal.fire({
      title: "Send SMS",
      html: `<p class="mb-2">Customer: <strong>${c.customerName}</strong></p>
             <textarea id="sms-msg" class="w-full p-3 border rounded-lg" rows="4">Dear ${c.customerName}, your complaint ${c.complaintId} status: ${c.status}. Thank you!</textarea>`,
      showCancelButton: true, confirmButtonText: "Send SMS", confirmButtonColor: "#10b981",
      preConfirm: () => {
        const msg = document.getElementById("sms-msg").value;
        if (!msg) Swal.showValidationMessage("Enter a message");
        return { message: msg };
      }
    });
    if (result.isConfirmed) {
      try {
        await http.post("/api/sms/send", { mobile: c.customerPhone, message: result.value.message });
        Swal.fire("Sent!", "SMS sent successfully.", "success");
      } catch (err) {
        Swal.fire("Error", "SMS failed: " + (err.response?.data?.message || "Server Error"), "error");
      }
    }
  };

  const handleAssignTicket = (c) => {
    navigate("/assign-ticket", { state: { fromComplaint: true, complaint: c } });
  };

  const filtered = complaints.filter(c => {
    const matchSearch = c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.complaintId?.toLowerCase().includes(search.toLowerCase()) ||
      c.type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    const matchPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === "Open").length,
    inProgress: complaints.filter(c => c.status === "In Progress").length,
    resolved: complaints.filter(c => c.status === "Resolved").length,
  };

  const statusColor = (s) => {
    switch (s) {
      case "Open": return "bg-red-100 text-red-700";
      case "In Progress": return "bg-yellow-100 text-yellow-700";
      case "Resolved": return "bg-green-100 text-green-700";
      case "Cancelled": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const priorityColor = (p) => {
    switch (p) {
      case "High": return "bg-red-50 text-red-600";
      case "Medium": return "bg-orange-50 text-orange-600";
      default: return "bg-blue-50 text-blue-600";
    }
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaExclamationTriangle className="text-orange-500" /> Complaints
        </h1>
        <button onClick={fetchComplaints} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition" style={{ color: themeColors.text }}>
          <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Open", value: stats.open, color: "text-red-600", bg: "bg-red-50" },
          { label: "In Progress", value: stats.inProgress, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Resolved", value: stats.resolved, color: "text-green-600", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border`} style={{ borderColor: themeColors.border }}>
            <p className="text-xs font-bold uppercase opacity-60">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="flex gap-2 flex-wrap">
          {["All", "Open", "In Progress", "Resolved", "Cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${statusFilter === s ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          {["All", "High", "Medium", "Low"].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${priorityFilter === p ? "bg-orange-500 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-auto">
          <FaSearch className="absolute left-3 top-3 opacity-40" />
          <input type="text" placeholder="Search ID, Customer, Type..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
              <tr>
                <th className="p-4">Complaint ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Technician</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center">Loading complaints...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center opacity-50">No complaints found.</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c._id} className="hover:bg-black/5 transition">
                    <td className="p-4 font-mono text-xs font-bold">{c.complaintId}</td>
                    <td className="p-4">
                      <div className="font-bold">{c.customerName}</div>
                      <div className="text-xs opacity-60">{c.customerPhone}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium block">{c.type}</span>
                      {c.relatedItemName && <span className="text-xs opacity-50">{c.relatedItemName}</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${priorityColor(c.priority)}`}>{c.priority}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor(c.status)}`}>{c.status}</span>
                    </td>
                    <td className="p-4 text-xs">
                      {c.assignedTechnician
                        ? <div className="flex items-center gap-1 font-medium text-blue-600"><FaUserCog /> {c.assignedTechnician}</div>
                        : <span className="opacity-40 italic">Not Assigned</span>}
                    </td>
                    <td className="p-4 text-xs opacity-60">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleAssignTicket(c)}
                          disabled={c.isAssigned}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            c.isAssigned
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                          }`} title={c.isAssigned ? 'Already Assigned' : 'Assign Ticket'}>
                          <FaTicketAlt /> {c.isAssigned ? 'Assigned' : 'Assign'}
                        </button>
                        <button onClick={() => openModal(c)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1">
                          <FaClipboardList /> Update
                        </button>
                        <button onClick={() => handleSendSMS(c)}
                          className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition">
                          <FaSms />
                        </button>
                        <button onClick={() => handleDelete(c)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">
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

      {/* Update Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl shadow-xl max-w-lg w-full p-6" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
            <div className="flex justify-between items-center border-b pb-3 mb-4" style={{ borderColor: themeColors.border }}>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FaClipboardList className="text-blue-600" /> Update: {selectedComplaint.complaintId}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><FaTimes /></button>
            </div>

            <div className="p-3 bg-orange-50 rounded-lg text-sm mb-4 border border-orange-100">
              <p className="font-bold text-orange-800 mb-1">Complaint: {selectedComplaint.type}</p>
              <p className="text-orange-700 opacity-90">{selectedComplaint.description}</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">Status</label>
                  <select value={updateForm.status} onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-lg border font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
                    <option>Open</option><option>In Progress</option><option>Resolved</option><option>Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">Priority</label>
                  <select value={updateForm.priority} onChange={e => setUpdateForm({ ...updateForm, priority: e.target.value })}
                    className="w-full p-2.5 rounded-lg border font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Assigned Technician</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-3 opacity-40 text-sm" />
                  <input type="text" value={employeeSearch}
                    onChange={e => { setEmployeeSearch(e.target.value); setShowEmployeeDropdown(true); }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    placeholder="Search technician..."
                    className="w-full pl-10 pr-4 p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }} />
                  {showEmployeeDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                      {employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase())).map((emp, i) => (
                        <div key={emp._id || i} onClick={() => { setEmployeeSearch(emp.name); setUpdateForm({ ...updateForm, assignedTechnician: emp.name }); setShowEmployeeDropdown(false); }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition flex items-center gap-2">
                          <FaUserCog className="text-blue-600" /><span className="font-medium">{emp.name}</span>
                        </div>
                      ))}
                      {employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-2 text-center opacity-50 text-sm">No employees found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Resolution Notes</label>
                <textarea value={updateForm.resolutionNotes} onChange={e => setUpdateForm({ ...updateForm, resolutionNotes: e.target.value })}
                  placeholder="Add resolution notes..." rows="3"
                  className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }} />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: themeColors.border }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
