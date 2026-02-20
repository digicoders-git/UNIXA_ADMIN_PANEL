import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { listServiceRequests, updateServiceRequest } from "../apis/serviceRequest";
import { getEmployees } from "../apis/employees";
import http from "../apis/http";
import {
  FaWrench,
  FaSearch,
  FaSyncAlt,
  FaUserCog,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaClipboardList,
  FaTrash
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function ServiceRequests() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [updateForm, setUpdateForm] = useState({
      status: "",
      assignedTechnician: "",
      resolutionNotes: "",
      priority: ""
  });

  useEffect(() => {
    fetchRequests();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      // Filter only employees, exclude managers
      const employeesOnly = data.filter(emp => emp.role === 'Employee' || emp.role === 'employee' || emp.role === 'Technician' || emp.role === 'technician');
      setEmployees(employeesOnly);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await listServiceRequests();
      console.log("Service Requests Data:", data);
      
      // Convert _id to readable ticket format if complaintId is missing
      const processedData = data.map((req, index) => {
        if (!req.ticketId || req.ticketId.length > 20) {
          // Generate sequential ticket ID
          const ticketNum = String(index + 1).padStart(3, '0');
          return { ...req, displayTicketId: `TKT-${ticketNum}` };
        }
        return { ...req, displayTicketId: req.ticketId };
      });
      
      setRequests(processedData);
    } catch (err) {
      console.error("Fetch error:", err);
      Swal.fire("Error", "Failed to load service requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (req) => {
      setSelectedRequest(req);
      setEmployeeSearch(req.assignedTechnician || "");
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
      const id = selectedRequest.ticketId || selectedRequest.complaintId || selectedRequest._id;
      
      if (!id || id === "undefined") {
          console.error("No valid ID found in selectedRequest:", selectedRequest);
          Swal.fire("Error", "Cannot identify the ticket. Please refresh and try again.", "error");
          return;
      }
      
      console.log("Updating request with ID:", id);

      try {
          await updateServiceRequest(id, updateForm);
          Swal.fire("Success", "Request updated successfully", "success");
          setIsModalOpen(false);
          setShowEmployeeDropdown(false);
          fetchRequests();
      } catch (err) {
          console.error("Update failed:", err);
          Swal.fire("Error", "Failed to update request: " + (err.response?.data?.message || "Server Error"), "error");
      }
  };

  const handleDelete = async (req) => {
    const result = await Swal.fire({
      title: 'Delete Service Request?',
      text: `Are you sure you want to delete ticket ${req.displayTicketId || req.ticketId}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const id = req.ticketId || req.complaintId || req._id;
        await http.delete(`/api/customers/complaints/${id}`);
        Swal.fire('Deleted!', 'Service request has been deleted.', 'success');
        fetchRequests();
      } catch (err) {
        console.error('Delete failed:', err);
        Swal.fire('Error', 'Failed to delete request: ' + (err.response?.data?.message || 'Server Error'), 'error');
      }
    }
  };

  const filteredRequests = requests.filter(req => {
      const ticketId = req.ticketId || req.complaintId || '';
      const matchesSearch = 
          req.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          ticketId.toLowerCase().includes(search.toLowerCase()) ||
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
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                      {loading ? (
                          <tr><td colSpan="7" className="p-8 text-center">Loading requests...</td></tr>
                      ) : filteredRequests.length === 0 ? (
                          <tr><td colSpan="7" className="p-8 text-center opacity-50">No requests found.</td></tr>
                      ) : (
                          filteredRequests.map(req => (
                              <tr key={req.ticketId || req.complaintId || req._id} className="hover:bg-black/5 transition">
                                  <td className="p-4 font-mono text-xs font-bold">{req.displayTicketId || req.ticketId || req.complaintId || 'N/A'}</td>
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
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => openUpdateModal(req)}
                                              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                          >
                                              Update
                                          </button>
                                          <button 
                                              onClick={() => handleDelete(req)}
                                              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                          >
                                              <FaTrash /> Delete
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
      {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                  className="rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200"
                  style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
              >
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: themeColors.border }}>
                      <FaClipboardList className="text-blue-600" /> Update Request: {selectedRequest.displayTicketId || selectedRequest.ticketId || selectedRequest.complaintId}
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
                          <div className="relative">
                              <div className="relative">
                                  <FaSearch className="absolute left-3 top-3 opacity-40 text-sm" />
                                  <input 
                                      type="text"
                                      value={employeeSearch}
                                      onChange={(e) => {
                                          setEmployeeSearch(e.target.value);
                                          setShowEmployeeDropdown(true);
                                      }}
                                      onFocus={() => setShowEmployeeDropdown(true)}
                                      placeholder="Search technician..."
                                      className="w-full pl-10 pr-4 p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                                      style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                                  />
                              </div>
                              {showEmployeeDropdown && (
                                  <div 
                                      className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                                  >
                                      {employees
                                          .filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                          .map((emp, index) => (
                                              <div
                                                  key={emp._id || index}
                                                  onClick={() => {
                                                      setEmployeeSearch(emp.name);
                                                      setUpdateForm({...updateForm, assignedTechnician: emp.name});
                                                      setShowEmployeeDropdown(false);
                                                  }}
                                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition flex items-center gap-2"
                                              >
                                                  <FaUserCog className="text-blue-600" />
                                                  <span className="font-medium">{emp.name}</span>
                                              </div>
                                          ))}
                                      {employees.filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                          <div className="px-4 py-2 text-center opacity-50 text-sm">No employees found</div>
                                      )}
                                  </div>
                              )}
                          </div>
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
