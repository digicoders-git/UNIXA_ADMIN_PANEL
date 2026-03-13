import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFire, FaSun, FaSnowflake, FaEye, FaEdit, FaTrash, FaPlus, FaTicketAlt, FaTimes } from "react-icons/fa";
import http from "../apis/http";
import { createCustomer } from "../apis/customers";
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
  const [isAssigning, setIsAssigning] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null);
  const [isShowModalOpen, setIsShowModalOpen] = useState(false);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState(null);
  const [assignData, setAssignData] = useState({
    employee: '',
    priority: 'Medium',
    dueDate: '',
    description: ''
  });
  const [techSearch, setTechSearch] = useState("");
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
    fetchAssignedTickets();
    setLoading(false);
  }, []);

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
      const leadTickets = data.filter(t => t.ticketType === 'lead');
      setAssignedTickets(Array.isArray(data) ? data : []);
      setTicketsLoaded(true);
    } catch (error) {
      console.error("Error fetching assigned tickets:", error);
      setAssignedTickets([]);
      setTicketsLoaded(true);
    }
  };

  const convertLeadToCustomer = async (lead) => {
    try {
      if (lead.convertedToCustomer) return;
      
      const customerData = {
        name: lead.name,
        mobile: lead.phone,
        email: lead.email || "",
        address: {
          house: "",
          area: lead.address || "",
          city: "",
          pincode: "",
          landmark: ""
        },
        type: "New",
        status: "Active",
        purifiers: [{
          brand: "",
          model: "",
          type: "RO",
          installationDate: "",
          warrantyStatus: "Active",
          amcStatus: "Not Taken"
        }],
        amcDetails: {
          planName: "",
          startDate: "",
          endDate: "",
          amountPaid: "",
          paymentMode: "Cash",
          paymentStatus: "Pending"
        },
        rentalDetails: {
          planId: null,
          planName: "",
          machineModel: "",
          amount: 0,
          status: "Inactive",
          paymentStatus: "Due",
          startDate: "",
          nextDueDate: ""
        }
      };
      await createCustomer(customerData);
      await http.patch(`/api/leads/${lead._id}`, { convertedToCustomer: true });
    } catch (error) {
      console.error("Error converting lead to customer:", error);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (isAssigning) return;
    
    try {
      setIsAssigning(true);
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

      await http.post('/api/assigned-tickets', ticketData);
      await convertLeadToCustomer(selectedLeadForAssign);
      Swal.fire("Success", "Ticket Assigned Successfully & Customer Added", "success");
      setIsAssignModalOpen(false);
      setAssignData({ employee: '', priority: 'Medium', dueDate: '', description: '' });
      setSelectedLeadForAssign(null);
      
      await fetchLeads();
      await fetchAssignedTickets();
    } catch (error) {
      const errorDetail = error.response?.data?.error || error.response?.data?.message || error.message;
      Swal.fire("Error", `Assignment Failed: ${errorDetail}`, "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignModal = (lead) => {
    setSelectedLeadForAssign(lead);
    setIsAssignModalOpen(true);
  };

  const showLeadDetails = async (lead) => {
    try {
      const ticket = assignedTickets.find(t => {
        if (t.ticketType !== 'lead') return false;
        const ticketLeadId = typeof t.leadId === 'object' && t.leadId !== null ? t.leadId._id : t.leadId;
        const ticketLeadIdStr = String(ticketLeadId || '').trim();
        const leadIdStr = String(lead._id || '').trim();
        return ticketLeadIdStr === leadIdStr;
      });
      
      setSelectedLeadDetails({ lead, ticket });
      setIsShowModalOpen(true);
    } catch (error) {
      console.error('Error showing lead details:', error);
      Swal.fire('Error', 'Failed to load lead details', 'error');
    }
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
      if (t.ticketType !== 'lead') return false;
      const ticketLeadId = typeof t.leadId === 'object' && t.leadId !== null ? t.leadId._id : t.leadId;
      const ticketLeadIdStr = String(ticketLeadId || '').trim();
      const leadIdStr = String(leadId || '').trim();
      return ticketLeadIdStr === leadIdStr;
    });

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
          disabled={!ticketsLoaded || leads.filter(lead => !getLeadTicketStatus(lead._id)).length === 0 || isAssigning}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          title={leads.filter(lead => !getLeadTicketStatus(lead._id)).length === 0 ? 'All leads are already assigned' : 'Assign a lead to employee'}
        >
          <FaTicketAlt /> Assign Lead
        </button>
      </div>

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
                          const ticketStatus = getLeadTicketStatus(lead._id);
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
                          <button
                            onClick={() => showLeadDetails(lead)}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition"
                            title="Show Lead Details"
                          >
                            <FaEye size={14} />
                          </button>
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
                  disabled={isAssigning}
                  className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Ticket Details
                  </h3>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                      Select Lead
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border outline-none cursor-pointer disabled:opacity-50"
                        style={{
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                        readOnly
                        disabled={isAssigning}
                        placeholder="Choose a lead to assign"
                        onClick={() => !isAssigning && setShowLeadDropdown(!showLeadDropdown)}
                        value={
                          selectedLeadForAssign
                            ? `${selectedLeadForAssign.name} - ${selectedLeadForAssign.phone}`
                            : ''
                        }
                      />
                      {showLeadDropdown && !isAssigning && (
                        <div className="absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border p-3" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                          <input
                            type="text"
                            placeholder="Search..."
                            autoFocus
                            value={leadSearch}
                            onChange={(e) => setLeadSearch(e.target.value)}
                            className="w-full p-2 mb-2 rounded-lg border text-sm outline-none"
                            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                          />
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {leads
                              .filter(lead => !getLeadTicketStatus(lead._id))
                              .filter(lead => 
                                `${lead.name} ${lead.phone} ${lead.leadStatus}`.toLowerCase().includes(leadSearch.toLowerCase())
                              ).map((lead) => (
                                <div
                                  key={lead._id}
                                  className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors"
                                  onClick={() => {
                                    setSelectedLeadForAssign(lead);
                                    setShowLeadDropdown(false);
                                    setLeadSearch("");
                                  }}
                                >
                                  <div className="font-bold">{lead.name}</div>
                                  <div className="text-[10px] opacity-60 uppercase">{lead.phone} - {lead.leadStatus}</div>
                                </div>
                              ))}
                            {leads.filter(lead => !getLeadTicketStatus(lead._id) && `${lead.name} ${lead.phone} ${lead.leadStatus}`.toLowerCase().includes(leadSearch.toLowerCase())).length === 0 && (
                              <div className="p-3 text-center text-xs opacity-50">No leads found</div>
                            )}
                          </div>
                        </div>
                      )}
                      {showLeadDropdown && <div className="fixed inset-0 z-[999]" onClick={() => setShowLeadDropdown(false)}></div>}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                      Assign To (Employee)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border outline-none cursor-pointer disabled:opacity-50"
                        style={{
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                        readOnly
                        disabled={isAssigning}
                        placeholder="Select team member"
                        onClick={() => !isAssigning && setShowTechDropdown(!showTechDropdown)}
                        value={assignData.employee}
                      />
                      {showTechDropdown && !isAssigning && (
                        <div className="absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border p-3" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                          <input
                            type="text"
                            placeholder="Search employee..."
                            autoFocus
                            value={techSearch}
                            onChange={(e) => setTechSearch(e.target.value)}
                            className="w-full p-2 mb-2 rounded-lg border text-sm outline-none"
                            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                          />
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {employees.filter(emp => 
                              `${emp.name} ${emp.designation} ${emp.role}`.toLowerCase().includes(techSearch.toLowerCase())
                            ).map((emp) => (
                              <div
                                key={emp._id}
                                className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors"
                                onClick={() => {
                                  setAssignData({ ...assignData, employee: emp.name });
                                  setShowTechDropdown(false);
                                  setTechSearch("");
                                }}
                              >
                                <div className="font-bold">{emp.name}</div>
                                <div className="text-[10px] opacity-60 uppercase">{emp.designation || emp.role}</div>
                              </div>
                            ))}
                            {employees.filter(emp => `${emp.name} ${emp.designation} ${emp.role}`.toLowerCase().includes(techSearch.toLowerCase())).length === 0 && (
                              <div className="p-3 text-center text-xs opacity-50">No employees found</div>
                            )}
                          </div>
                        </div>
                      )}
                      {showTechDropdown && <div className="fixed inset-0 z-[999]" onClick={() => setShowTechDropdown(false)}></div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                        Priority
                      </label>
                      <select
                        value={assignData.priority}
                        onChange={(e) => setAssignData({ ...assignData, priority: e.target.value })}
                        disabled={isAssigning}
                        className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                        disabled={isAssigning}
                        className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        style={{
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                      />
                    </div>
                  </div>
                </div>

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
                      disabled={isAssigning}
                      className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
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
                  disabled={isAssigning}
                  className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show Lead Details Modal */}
      {isShowModalOpen && selectedLeadDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface }}
          >
            <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                    <FaEye />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>
                    Lead Details - {selectedLeadDetails.lead.name}
                  </h2>
                </div>
                <button
                  onClick={() => setIsShowModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lead Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>Lead Information</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Name:</span>
                      <span className="font-bold">{selectedLeadDetails.lead.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Phone:</span>
                      <span className="font-bold">{selectedLeadDetails.lead.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Email:</span>
                      <span className="font-bold">{selectedLeadDetails.lead.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Address:</span>
                      <span className="font-bold">{selectedLeadDetails.lead.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Product Interest:</span>
                      <span className="font-bold">{selectedLeadDetails.lead.productInterest || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Lead Status:</span>
                      <span className="font-bold">{selectedLeadDetails.lead.leadStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium opacity-70">Created:</span>
                      <span className="font-bold">{new Date(selectedLeadDetails.lead.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.text }}>Ticket Information</h3>
                  
                  {selectedLeadDetails.ticket ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium opacity-70">Assigned To:</span>
                        <span className="font-bold">{selectedLeadDetails.ticket.assignedTo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium opacity-70">Assigned By:</span>
                        <span className="font-bold">{selectedLeadDetails.ticket.assignedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium opacity-70">Priority:</span>
                        <span className="font-bold">{selectedLeadDetails.ticket.priority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium opacity-70">Status:</span>
                        <span className={`px-3 py-1 bg-${getTicketStatusColor(selectedLeadDetails.ticket.status)}-50 text-${getTicketStatusColor(selectedLeadDetails.ticket.status)}-700 rounded-full text-xs font-bold`}>
                          {selectedLeadDetails.ticket.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium opacity-70">Due Date:</span>
                        <span className="font-bold">{selectedLeadDetails.ticket.dueDate ? new Date(selectedLeadDetails.ticket.dueDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                      
                      {selectedLeadDetails.ticket.status === 'Completed' && (
                        <>
                          <div className="mt-6">
                            <h4 className="font-bold mb-3" style={{ color: themeColors.text }}>Completion Details</h4>
                            
                            {selectedLeadDetails.ticket.completedAt && (
                              <div className="flex justify-between mb-2">
                                <span className="font-medium opacity-70">Completed At:</span>
                                <span className="font-bold">{new Date(selectedLeadDetails.ticket.completedAt).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            
                            {selectedLeadDetails.ticket.completionRemark && (
                              <div className="mb-4">
                                <span className="font-medium opacity-70 block mb-2">Completion Remark:</span>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm">{selectedLeadDetails.ticket.completionRemark}</p>
                                </div>
                              </div>
                            )}
                            
                            {selectedLeadDetails.ticket.employeeFeedback && (
                              <div className="mb-4">
                                <span className="font-medium opacity-70 block mb-2">Employee Feedback:</span>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <p className="text-sm">{selectedLeadDetails.ticket.employeeFeedback}</p>
                                </div>
                              </div>
                            )}
                            
                            {(selectedLeadDetails.ticket.completionPhotos && selectedLeadDetails.ticket.completionPhotos.length > 0) || (selectedLeadDetails.ticket.visitPhotos && selectedLeadDetails.ticket.visitPhotos.length > 0) ? (
                              <div className="mb-4">
                                <span className="font-medium opacity-70 block mb-2">Completion Photos:</span>
                                <div className="grid grid-cols-2 gap-2">
                                  {(selectedLeadDetails.ticket.completionPhotos || selectedLeadDetails.ticket.visitPhotos || []).map((photo, index) => (
                                    <img
                                      key={index}
                                      src={photo}
                                      alt={`Completion ${index + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border"
                                      onClick={() => window.open(photo, '_blank')}
                                      style={{ cursor: 'pointer' }}
                                      onError={(e) => {
                                        console.log('Image load error:', photo);
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}
                      
                      {selectedLeadDetails.ticket.description && (
                        <div className="mt-4">
                          <span className="font-medium opacity-70 block mb-2">Task Description:</span>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm">{selectedLeadDetails.ticket.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No ticket assigned for this lead</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  onClick={() => setIsShowModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold transition"
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
