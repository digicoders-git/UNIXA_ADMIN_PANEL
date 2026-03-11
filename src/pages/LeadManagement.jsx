import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFire, FaSun, FaSnowflake, FaEye, FaEdit, FaTrash, FaPlus, FaTicketAlt, FaTimes } from "react-icons/fa";
import http from "../apis/http";
import Swal from "sweetalert2";

export default function LeadManagement() {
  const { themeColors } = useTheme();
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null);
  const [assignData, setAssignData] = useState({
    employee: '',
    priority: 'Medium',
    dueDate: '',
    description: ''
  });

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
    fetchAssignedTickets();
    setLoading(false);
  }, []);

  // Auto-refresh assigned tickets every 10 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(fetchAssignedTickets, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await http.get('/api/employees');
      const filteredEmployees = data.filter(emp => emp.role !== 'Manager');
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data } = await http.get("/api/leads");
      const leads = data.leads || data || [];
      setLeads(Array.isArray(leads) ? leads : []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      setLeads([]);
      Swal.fire("Error", "Failed to load leads", "error");
    }
  };

  const fetchAssignedTickets = async () => {
    try {
      const { data } = await http.get("/api/assigned-tickets");
      console.log('[LeadManagement] Fetched assigned tickets:', data.length);
      const leadTickets = data.filter(t => t.ticketType === 'lead');
      console.log('[LeadManagement] Lead tickets count:', leadTickets.length);
      leadTickets.forEach(t => {
        console.log('[LeadManagement] Lead Ticket:', {
          ticketId: t._id,
          leadId: t.leadId,
          leadIdType: typeof t.leadId,
          leadIdIsObject: typeof t.leadId === 'object',
          leadIdValue: t.leadId?._id || t.leadId,
          status: t.status,
          assignedTo: t.assignedTo
        });
      });
      setAssignedTickets(Array.isArray(data) ? data : []);
      setTicketsLoaded(true);
    } catch (error) {
      console.error("Error fetching assigned tickets:", error);
      setAssignedTickets([]);
      setTicketsLoaded(true);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedLeadForAssign) {
        Swal.fire("Error", "No lead selected for assignment", "error");
        return;
      }

      if (!assignData.employee) {
        Swal.fire("Error", "Please select an employee to assign this lead to.", "warning");
        return;
      }

      const userData = JSON.parse(localStorage.getItem('admin-data') || '{}');
      const adminName = userData.name || 'Admin';

      const ticketData = {
        ticketType: 'lead',
        leadId: selectedLeadForAssign._id,
        title: `Lead Assignment: ${selectedLeadForAssign.name}`,
        assignedTo: assignData.employee,
        assignedBy: adminName,
        priority: assignData.priority,
        dueDate: assignData.dueDate ? new Date(assignData.dueDate) : null,
        description: assignData.description,
        status: 'Pending',
        customerName: selectedLeadForAssign.name,
        customerPhone: selectedLeadForAssign.phone,
        customerEmail: selectedLeadForAssign.email,
        address: selectedLeadForAssign.address || ""
      };

      console.log('[ASSIGN] Submitting ticket data:', ticketData);
      console.log('[ASSIGN] Lead ID being sent:', selectedLeadForAssign._id);
      const response = await http.post('/api/assigned-tickets', ticketData);
      console.log('[ASSIGN] Server response:', response.data);
      console.log('[ASSIGN] Created ticket ID:', response.data.ticket?._id);
      console.log('[ASSIGN] Created ticket leadId:', response.data.ticket?.leadId);

      Swal.fire("Success", "Ticket Assigned Successfully", "success");
      setIsAssignModalOpen(false);
      setAssignData({ employee: '', priority: 'Medium', dueDate: '', description: '' });
      setSelectedLeadForAssign(null);
      
      // Refresh both leads and tickets immediately
      await fetchLeads();
      await fetchAssignedTickets();
    } catch (error) {
      console.error('[ASSIGN] Error assigning lead FULL:', error);
      if (error.response) {
        console.error('[ASSIGN] Server response data:', error.response.data);
      }
      const errorDetail = error.response?.data?.error || error.response?.data?.message || error.message;
      Swal.fire("Error", `Assignment Failed: ${errorDetail}`, "error");
    }
  };

  const openAssignModal = (lead) => {
    setSelectedLeadForAssign(lead);
    setIsAssignModalOpen(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Lead?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete"
    });

    if (result.isConfirmed) {
      try {
        await http.delete(`/api/leads/${id}`);
        setLeads(leads.filter(l => l._id !== id));
        Swal.fire("Deleted!", "Lead has been deleted", "success");
      } catch (error) {
        Swal.fire("Error", "Failed to delete lead", "error");
      }
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === "All" || lead.leadStatus === statusFilter;
    const matchesSearch =
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.includes(search) ||
      lead.email?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status) => {
    if (status === "Hot") return FaFire;
    if (status === "Warm") return FaSun;
    return FaSnowflake;
  };

  const getStatusColor = (status) => {
    if (status === "Hot") return "red";
    if (status === "Warm") return "orange";
    return "blue";
  };

  const getLeadTicketStatus = (leadId) => {
    if (!ticketsLoaded || !Array.isArray(assignedTickets)) {
      return null;
    }

    const ticket = assignedTickets.find(t => {
      // Check if ticket type is lead
      if (t.ticketType !== 'lead') return false;

      // Get leadId from ticket (can be object or string)
      const ticketLeadId = typeof t.leadId === 'object' && t.leadId !== null ? t.leadId._id : t.leadId;
      
      // Convert both to strings for comparison
      const ticketLeadIdStr = String(ticketLeadId || '').trim();
      const leadIdStr = String(leadId || '').trim();

      // Debug log
      if (ticketLeadIdStr && leadIdStr) {
        console.log(`Comparing ticket leadId: "${ticketLeadIdStr}" with lead: "${leadIdStr}" - Match: ${ticketLeadIdStr === leadIdStr}`);
      }

      return ticketLeadIdStr === leadIdStr;
    });

    if (ticket) {
      console.log(`Found ticket for lead ${leadId}:`, ticket.status);
    }

    return ticket ? ticket.status : null;
  };

  const getTicketStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'yellow';
      case 'In Progress': return 'blue';
      case 'Completed': return 'green';
      case 'Cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ color: themeColors.text }}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FaUser /> Lead Management</h1>
        <button
          onClick={() => setIsAssignModalOpen(true)}
          disabled={!ticketsLoaded || leads.filter(lead => !getLeadTicketStatus(lead._id)).length === 0}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          title={leads.filter(lead => !getLeadTicketStatus(lead._id)).length === 0 ? 'All leads are already assigned' : 'Assign a lead to employee'}
        >
          <FaTicketAlt /> Assign Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          {["All", "Hot", "Warm", "Cold"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm rounded-md transition ${statusFilter === status ? 'bg-blue-600 text-white' : ''}`}
            >
              {status}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg border w-full md:w-96"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background }}>
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Product Interest</th>
                <th className="p-4">Status</th>
                <th className="p-4">Ticket Status</th>
                <th className="p-4">Location</th>
                <th className="p-4">Date</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center">Loading...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center opacity-50">No leads found</td></tr>
              ) : (
                filteredLeads.map(lead => {
                  const StatusIcon = getStatusIcon(lead.leadStatus);
                  const statusColor = getStatusColor(lead.leadStatus);

                  return (
                    <tr key={lead._id} className="hover:bg-black/5">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaUser className="text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold">{lead.name}</div>
                            <div className="text-xs opacity-60">{lead.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FaPhone className="text-green-600" size={12} />
                          <span className="font-medium">{lead.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">
                          {lead.productInterest || 'General'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 bg-${statusColor}-50 text-${statusColor}-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit`}>
                          <StatusIcon size={12} />
                          {lead.leadStatus || 'Warm'}
                        </span>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const leadId = lead._id;
                          const ticketStatus = getLeadTicketStatus(leadId);
                          console.log(`[TABLE] Lead ${lead.name} ID: ${leadId}, Status: ${ticketStatus || 'Not Assigned'}`);
                          return ticketStatus ? (
                            <span className={`px-3 py-1 bg-${getTicketStatusColor(ticketStatus)}-50 text-${getTicketStatusColor(ticketStatus)}-700 rounded-full text-xs font-bold`}>
                              {ticketStatus}
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-bold">
                              Not Assigned
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs">
                          <FaMapMarkerAlt className="text-gray-400" />
                          <span>{lead.address || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs opacity-60">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {!getLeadTicketStatus(lead._id) && (
                            <button
                              onClick={() => openAssignModal(lead)}
                              className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition"
                              title="Assign Ticket"
                            >
                              <FaTicketAlt size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(lead._id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                            title="Delete Lead"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Assign Modal - Landscape Style */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface }}
          >
            <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <FaTicketAlt />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>
                    Assign Lead Ticket
                  </h2>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Assignment Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Ticket Details
                  </h3>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                      Select Lead
                    </label>
                    <select
                      required
                      value={selectedLeadForAssign?._id || ''}
                      onChange={(e) => {
                        const lead = leads.find(l => l._id === e.target.value);
                        setSelectedLeadForAssign(lead);
                      }}
                      className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                    >
                      <option value="">Choose a lead to assign</option>
                      {leads
                        .filter(lead => {
                          // Only show leads that are NOT assigned (no ticket found)
                          const ticketStatus = getLeadTicketStatus(lead._id);
                          return !ticketStatus; // Show only if no ticket exists
                        })
                        .map(lead => (
                          <option key={lead._id} value={lead._id}>
                            {lead.name} - {lead.phone} ({lead.leadStatus})
                          </option>
                        ))
                      }
                    </select>
                    {leads.filter(lead => !getLeadTicketStatus(lead._id)).length === 0 && (
                      <p className="text-xs text-orange-600 mt-2 font-bold">
                        ⚠️ All leads are already assigned. No unassigned leads available.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                      Assign To (Employee)
                    </label>
                    <select
                      required
                      value={assignData.employee}
                      onChange={(e) => setAssignData({ ...assignData, employee: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                    >
                      <option value="">Select team member</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp.name}>
                          {emp.name} - {emp.designation || emp.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                        Priority
                      </label>
                      <select
                        value={assignData.priority}
                        onChange={(e) => setAssignData({ ...assignData, priority: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        required
                        value={assignData.dueDate}
                        onChange={(e) => setAssignData({ ...assignData, dueDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Instructions & Preview */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Assignment Context
                  </h3>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                      Task Instructions
                    </label>
                    <textarea
                      required
                      placeholder="Provide details about what the employee needs to do with this lead..."
                      rows="6"
                      value={assignData.description}
                      onChange={(e) => setAssignData({ ...assignData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                    />
                  </div>

                  {selectedLeadForAssign && (
                    <div className="p-4 rounded-xl border-2 border-dashed" style={{ borderColor: themeColors.border }}>
                      <p className="text-xs font-bold uppercase opacity-60 mb-3" style={{ color: themeColors.text }}>Selected Lead Info</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Name:</span>
                          <span className="font-bold">{selectedLeadForAssign.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Phone:</span>
                          <span className="font-bold">{selectedLeadForAssign.phone}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Interest:</span>
                          <span className="font-bold">{selectedLeadForAssign.productInterest || 'General'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg transition"
                >
                  Assign Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
