import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { listServiceRequests, updateServiceRequest } from "../apis/serviceRequest";
import {
  FaWrench,
  FaSearch,
  FaSyncAlt,
  FaUserCog,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaClipboardList
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function ServiceRequests() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
      status: "",
      assignedTechnician: "",
      resolutionNotes: "",
      priority: ""
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await listServiceRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load service requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (req) => {
      setSelectedRequest(req);
      setUpdateForm({
          status: req.status || "Open",
          assignedTechnician: req.assignedTechnician || "",
          resolutionNotes: req.resolutionNotes || "",
          priority: req.priority || "Medium"
      });
      setIsModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
      e.preventDefault();
      try {
          await updateServiceRequest(selectedRequest.ticketId, updateForm);
          Swal.fire("Success", "Request updated successfully", "success");
          setIsModalOpen(false);
          fetchRequests();
      } catch (err) {
          Swal.fire("Error", "Failed to update request", "error");
      }
  };

  const filteredRequests = requests.filter(req => {
      const matchesSearch = 
          req.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          req.ticketId?.toLowerCase().includes(search.toLowerCase()) ||
          req.type?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || req.status === statusFilter;

      return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
      switch(status) {
          case "Open": return "bg-red-100 text-red-700";
          case "In Progress": return "bg-yellow-100 text-yellow-700";
          case "Resolved": return "bg-green-100 text-green-700";
          default: return "bg-gray-100 text-gray-700";
      }
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaWrench className="text-blue-600" /> Service Requests
        </h1>
        <button 
            onClick={fetchRequests}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition"
            style={{ color: themeColors.text }}
        >
            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              {["All", "Open", "In Progress", "Resolved"].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                        statusFilter === status 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                      {status}
                  </button>
              ))}
          </div>

          <div className="relative w-full md:w-auto">
              <FaSearch className="absolute left-3 top-3 opacity-40" />
              <input 
                  type="text" 
                  placeholder="Search Ticket ID, Customer..." 
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
              />
          </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
                      <tr>
                          <th className="p-4">Ticket ID</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Issue Type</th>
                          <th className="p-4">Priority</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Technician</th>
                          <th className="p-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                      {loading ? (
                          <tr><td colSpan="7" className="p-8 text-center">Loading requests...</td></tr>
                      ) : filteredRequests.length === 0 ? (
                          <tr><td colSpan="7" className="p-8 text-center opacity-50">No requests found.</td></tr>
                      ) : (
                          filteredRequests.map(req => (
                              <tr key={req.ticketId} className="hover:bg-black/5 transition">
                                  <td className="p-4 font-mono text-xs font-bold">{req.ticketId}</td>
                                  <td className="p-4">
                                      <div className="font-bold">{req.customerName}</div>
                                      <div className="text-xs opacity-60">{req.customerMobile}</div>
                                  </td>
                                  <td className="p-4">
                                      <span className="font-medium block">{req.type}</span>
                                      <span className="text-xs opacity-60">{new Date(req.date).toLocaleDateString()}</span>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                                          req.priority === 'High' ? 'bg-red-50 text-red-600' : 
                                          req.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                                      }`}>
                                          {req.priority}
                                      </span>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(req.status)}`}>
                                          {req.status}
                                      </span>
                                  </td>
                                  <td className="p-4 text-xs">
                                      {req.assignedTechnician ? (
                                          <div className="flex items-center gap-1 font-medium text-blue-600">
                                              <FaUserCog /> {req.assignedTechnician}
                                          </div>
                                      ) : (
                                          <span className="opacity-40 italic">Unassigned</span>
                                      )}
                                  </td>
                                  <td className="p-4 text-right">
                                      <button 
                                          onClick={() => openUpdateModal(req)}
                                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                                      >
                                          Update
                                      </button>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Update Modal */}
      {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                  className="rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200"
                  style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
              >
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: themeColors.border }}>
                      <FaClipboardList className="text-blue-600" /> Update Request: {selectedRequest.ticketId}
                  </h2>
                  
                  <form onSubmit={handleUpdateSubmit} className="space-y-4">
                      
                      <div className="p-3 bg-blue-50 rounded-lg text-sm mb-4 border border-blue-100">
                          <p className="font-bold text-blue-800 mb-1">Issue Description:</p>
                          <p className="text-blue-700 opacity-90">{selectedRequest.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold uppercase opacity-60 mb-1">Status</label>
                              <select 
                                  value={updateForm.status}
                                  onChange={e => setUpdateForm({...updateForm, status: e.target.value})}
                                  className="w-full p-2.5 rounded-lg border font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                              >
                                  <option>Open</option>
                                  <option>In Progress</option>
                                  <option>Resolved</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold uppercase opacity-60 mb-1">Priority</label>
                              <select 
                                  value={updateForm.priority}
                                  onChange={e => setUpdateForm({...updateForm, priority: e.target.value})}
                                  className="w-full p-2.5 rounded-lg border font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                              >
                                  <option>Low</option>
                                  <option>Medium</option>
                                  <option>High</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase opacity-60 mb-1">Assigned Technician</label>
                          <input 
                              type="text"
                              value={updateForm.assignedTechnician}
                              onChange={e => setUpdateForm({...updateForm, assignedTechnician: e.target.value})}
                              placeholder="Technician Name"
                              className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase opacity-60 mb-1">Resolution Notes</label>
                          <textarea 
                              value={updateForm.resolutionNotes}
                              onChange={e => setUpdateForm({...updateForm, resolutionNotes: e.target.value})}
                              placeholder="Add notes about the fix or progress..."
                              rows="3"
                              className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                          />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t mt-2" style={{ borderColor: themeColors.border }}>
                          <button 
                              type="button" 
                              onClick={() => setIsModalOpen(false)}
                              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit" 
                              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition"
                          >
                              Save Updates
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}
