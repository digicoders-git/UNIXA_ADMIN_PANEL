import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import {
  FaTicketAlt,
  FaSearch,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaCalendar,
  FaTimes
} from "react-icons/fa";
import Swal from "sweetalert2";
import { listServiceRequests } from "../apis/serviceRequest";
import { getEmployees } from "../apis/employees";

export default function AssignTicket() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    employee: "",
    priority: "Medium",
    date: "",
    desc: ""
  });

  useEffect(() => {
    fetchTickets();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await listServiceRequests();
      
      const allComplaints = data.map(req => ({
        id: req.ticketId || req.complaintId || req._id,
        title: req.type || "Service Request",
        employee: req.assignedTechnician || "Unassigned",
        priority: req.priority || "Medium",
        date: new Date(req.date).toISOString().split("T")[0],
        status: req.status || "Open",
        desc: req.description || "No description provided.",
        customerName: req.customerName
      }));
      
      allComplaints.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTickets(allComplaints);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Swal.fire("Error", "Failed to load tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTicket) {
      setTickets(tickets.map(t => t.id === editingTicket.id ? { ...t, ...formData } : t));
      Swal.fire("Success", "Ticket Updated", "success");
    } else {
      const newTicket = {
        id: Date.now(),
        ...formData,
        status: "Pending"
      };
      setTickets([newTicket, ...tickets]);
      Swal.fire("Success", "Ticket Created", "success");
    }
    handleCloseForm();
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      employee: ticket.employee,
      priority: ticket.priority,
      date: ticket.date,
      desc: ticket.desc || ""
    });
    setIsFormOpen(true);
  };

  const handleView = (ticket) => {
    setViewingTicket(ticket);
    setIsViewOpen(true);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Delete Ticket?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it"
    }).then((result) => {
      if (result.isConfirmed) {
        setTickets(tickets.filter(t => t.id !== id));
        Swal.fire("Deleted!", "Ticket has been deleted.", "success");
      }
    });
  };

  const handleCloseForm = () => {
    setEditingTicket(null);
    setFormData({ title: "", employee: "", priority: "Medium", date: "", desc: "" });
    setIsFormOpen(false);
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.employee.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-700";
      case "Medium": return "bg-orange-100 text-orange-700";
      case "Low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaTicketAlt className="text-blue-600" /> Assigned Tickets
          </h1>
          <p className="text-sm opacity-60 mt-1">Manage and track service tasks for your team members</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium transition shadow-lg"
        >
          <FaPlus /> New Ticket
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 opacity-40" />
          <input 
            type="text" 
            placeholder="Search tickets..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10 pr-4 py-2 rounded-lg border w-full focus:ring-2 focus:ring-blue-500 outline-none"
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
                <th className="p-4">Task Information</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Deadline</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center">Loading tickets...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center opacity-50">No tickets found.</td></tr>
              ) : (
                currentItems.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-black/5 transition">
                    <td className="p-4">
                      <div className="font-bold">{ticket.title}</div>
                      <div className="text-xs opacity-60 truncate max-w-xs">{ticket.desc}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FaUserTie className="text-blue-600" />
                        <span className="font-medium">{ticket.employee}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-xs opacity-60">
                        <FaCalendar />
                        {ticket.date}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${ticket.status === "Completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleView(ticket)} className="p-2 hover:bg-teal-50 text-teal-600 rounded-lg transition">
                          <FaEye />
                        </button>
                        <button onClick={() => handleEdit(ticket)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(ticket.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t" style={{ borderColor: themeColors.border }}>
            <p className="text-sm opacity-60">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTickets.length)} of {filteredTickets.length} results
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg transition ${currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl shadow-xl max-w-lg w-full p-6" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold">{editingTicket ? "Edit Ticket" : "Assign New Ticket"}</h2>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Task Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Server Maintenance"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Assign To (Employee)</label>
                <select 
                  required
                  value={formData.employee}
                  onChange={(e) => setFormData({...formData, employee: e.target.value})}
                  className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                >
                  <option value="">Select team member</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">Due Date</label>
                  <input 
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Task Instructions</label>
                <textarea 
                  placeholder="Provide details about the task..."
                  rows="3"
                  value={formData.desc}
                  onChange={(e) => setFormData({...formData, desc: e.target.value})}
                  className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button 
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition"
                >
                  {editingTicket ? "Update Changes" : "Assign Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewOpen && viewingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold">Ticket Details</h2>
              <button onClick={() => setIsViewOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <FaTimes />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase opacity-60">Title</p>
                <p className="font-bold text-lg">{viewingTicket.title}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">Assigned To</p>
                  <div className="flex items-center gap-2 mt-1">
                    <FaUserTie className="text-blue-600" />
                    <span className="text-sm">{viewingTicket.employee}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">Priority</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${getPriorityColor(viewingTicket.priority)}`}>
                    {viewingTicket.priority}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">Due Date</p>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    <FaCalendar className="opacity-60" />
                    {viewingTicket.date}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${viewingTicket.status === "Completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {viewingTicket.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase opacity-60">Full Description</p>
                <div className="p-3 bg-gray-50 rounded-lg mt-1 border text-sm" style={{ borderColor: themeColors.border }}>
                  {viewingTicket.desc || "No additional instructions provided for this task."}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsViewOpen(false)}
              className="w-full mt-6 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
