import React, { useState, useMemo, useEffect } from 'react';
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
  FaTimes,
  FaFile,
  FaCheck,
  FaClock,
  FaHourglassHalf
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import http from '../apis/http';

export default function AssignTicket() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [tickets, setTickets] = useState([]);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [formData, setFormData] = useState({
    ticketType: 'service_request',
    title: '',
    employee: '',
    priority: 'Medium',
    date: '',
    desc: '',
    serviceRequestId: '',
    orderId: ''
  });

  const [techSearch, setTechSearch] = useState("");
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [srSearch, setSrSearch] = useState("");
  const [showSrDropdown, setShowSrDropdown] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const [serviceRequests, setServiceRequests] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchTickets();
    fetchEmployees();
    fetchServiceRequests();
    fetchOrders();
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

  const fetchServiceRequests = async () => {
    try {
      const { data } = await http.get('/api/assigned-tickets/available-service-requests');
      console.log('Available Service Requests Response:', data);
      setServiceRequests(data || []);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      setServiceRequests([]);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await http.get('/api/assigned-tickets/available-orders');
      console.log('Available Orders Response:', data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data } = await http.get('/api/assigned-tickets');
      const formattedTickets = data.map(ticket => ({
        id: ticket._id,
        ticketType: ticket.ticketType || 'service_request',
        title: ticket.title || 'Service Request',
        employee: ticket.assignedTo || 'Unassigned',
        priority: ticket.priority || 'Medium',
        date: new Date(ticket.dueDate || ticket.createdAt).toISOString().split('T')[0],
        status: ticket.status || 'Pending',
        desc: ticket.description || ticket.notes || 'No description provided.',
        address: ticket.address || 'N/A',
        customerName: ticket.customerName,
        orderId: ticket.orderId?._id || ticket.orderId,
        serviceRequestId: ticket.serviceRequestId?._id || ticket.serviceRequestId,
        completionPhotos: ticket.completionPhotos || [],
        completionRemark: ticket.completionRemark || '',
        completedAt: ticket.completedAt
      }));
      formattedTickets.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTickets(formattedTickets);
    } catch (error) {
      Swal.fire('Error', 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const userData = JSON.parse(localStorage.getItem('admin-data') || '{}');
      const adminName = userData.name || 'Admin';

      const ticketData = {
        ticketType: formData.ticketType,
        title: formData.title,
        assignedTo: formData.employee,
        assignedBy: adminName,
        priority: formData.priority,
        dueDate: formData.date,
        description: formData.desc,
        notes: formData.desc,
        status: 'Pending'
      };

      console.log('Form Data:', formData);
      console.log('Initial Ticket Data:', ticketData);

      if (formData.ticketType === 'service_request' && formData.serviceRequestId) {
        const selectedRequest = serviceRequests.find(req => req._id === formData.serviceRequestId);
        console.log('Selected Service Request:', selectedRequest);
        if (selectedRequest) {
          ticketData.serviceRequestId = selectedRequest._id;
          ticketData.userId = selectedRequest.userId;
          ticketData.amcId = selectedRequest.amcId;
          ticketData.customerName = selectedRequest.customerName;
          ticketData.customerPhone = selectedRequest.customerPhone || selectedRequest.customerMobile;
          ticketData.customerEmail = selectedRequest.customerEmail;
          ticketData.address = selectedRequest.address || 'N/A';
          console.log('Final Ticket Data with Service Request Address:', ticketData.address);
          console.log('Ticket Data with Service Request:', ticketData);
        }
      } else if (formData.ticketType === 'order' && formData.orderId) {
        const selectedOrder = orders.find(order => order._id === formData.orderId);
        console.log('Selected Order:', selectedOrder);
        if (selectedOrder) {
          ticketData.orderId = selectedOrder._id;
          ticketData.userId = selectedOrder.userId;
          ticketData.customerName = selectedOrder.shippingAddress?.name;
          ticketData.customerPhone = selectedOrder.shippingAddress?.phone;
          ticketData.customerEmail = selectedOrder.shippingAddress?.email;
          ticketData.address = `${selectedOrder.shippingAddress?.addressLine1}, ${selectedOrder.shippingAddress?.city}`;
          console.log('Ticket Data with Order:', ticketData);
        }
      }

      console.log('Final Ticket Data before submission:', ticketData);

      if (editingTicket) {
        await http.put(`/api/assigned-tickets/${editingTicket.id}`, ticketData);
        Swal.fire("Success", "Ticket Updated", "success");
      } else {
        const response = await http.post('/api/assigned-tickets', ticketData);
        console.log('Ticket Creation Response:', response.data);
        Swal.fire("Success", "Ticket Created Successfully", "success");
      }
      
      // Add a small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh all lists to update available options
      console.log('Refreshing all lists...');
      await Promise.all([
        fetchTickets(),
        fetchServiceRequests(),
        fetchOrders()
      ]);
      
      handleCloseForm();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Swal.fire("Error", "Failed to save ticket: " + (error.response?.data?.message || error.message), "error");
    }
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      ticketType: ticket.ticketType || 'service_request',
      title: ticket.title,
      employee: ticket.employee,
      priority: ticket.priority,
      date: ticket.date,
      desc: ticket.desc || '',
      serviceRequestId: '',
      orderId: ''
    });
    setIsFormOpen(true);
  };

  const handleView = (ticket) => {
    setViewingTicket(ticket);
    setIsViewOpen(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Ticket?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await http.delete(`/api/assigned-tickets/${id}`);
        setTickets(tickets.filter(t => t.id !== id));
        Swal.fire('Deleted!', 'Ticket has been deleted.', 'success');
      } catch (error) {
        Swal.fire('Error', 'Failed to delete ticket', 'error');
      }
    }
  };

  const handleCloseForm = () => {
    setEditingTicket(null);
    setFormData({ ticketType: 'service_request', title: '', employee: '', priority: 'Medium', date: '', desc: '', serviceRequestId: '', orderId: '' });
    setIsFormOpen(false);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-orange-100 text-orange-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: currentFont.family }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaTicketAlt /> Assigned Tickets
          </h1>
          <p className="text-sm opacity-60 mt-1" style={{ color: themeColors.text }}>
            Manage and track service tasks for your team members
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <FaSearch className="absolute left-3 top-3 opacity-40" style={{ color: themeColors.text }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 rounded-xl border w-full focus:ring-2 focus:ring-blue-500 outline-none"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text
              }}
            />
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg transition whitespace-nowrap"
          >
            <FaPlus /> New Ticket
          </button>
          

        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs uppercase" style={{ backgroundColor: themeColors.background }}>
              <tr>
                <th className="px-6 py-4 text-left font-bold" style={{ color: themeColors.text }}>Task Information</th>
                <th className="px-6 py-4 text-left font-bold" style={{ color: themeColors.text }}>Type</th>
                <th className="px-6 py-4 text-left font-bold" style={{ color: themeColors.text }}>Assigned To</th>
                <th className="px-6 py-4 text-left font-bold" style={{ color: themeColors.text }}>Priority</th>
                <th className="px-6 py-4 text-left font-bold" style={{ color: themeColors.text }}>Deadline</th>
                <th className="px-6 py-4 text-left font-bold" style={{ color: themeColors.text }}>Status</th>
                <th className="px-6 py-4 text-right font-bold" style={{ color: themeColors.text }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center" style={{ color: themeColors.text }}>
                    Loading tickets...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center opacity-50" style={{ color: themeColors.text }}>
                    No tickets found.
                  </td>
                </tr>
              ) : (
                currentItems.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-black/5 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                          <FaFile />
                        </div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: themeColors.text }}>{ticket.title}</div>
                          <div className="text-xs opacity-60 truncate max-w-xs" style={{ color: themeColors.text }}>
                            {ticket.desc || 'No description provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ticket.ticketType === 'service_request' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {ticket.ticketType === 'service_request' ? 'AMC Service' : 'Installation'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                          {ticket.employee.charAt(0)}
                        </div>
                        <span className="text-sm font-medium" style={{ color: themeColors.text }}>{ticket.employee}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm opacity-60" style={{ color: themeColors.text }}>
                        <FaCalendar />
                        {ticket.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleView(ticket)}
                          className="p-2 hover:bg-teal-50 text-teal-600 rounded-lg transition"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEdit(ticket)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                          title="Edit Ticket"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                          title="Delete Ticket"
                        >
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
          <div className="flex justify-between items-center px-6 py-4 border-t" style={{ borderColor: themeColors.border }}>
            <p className="text-sm opacity-60" style={{ color: themeColors.text }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTickets.length)} of {filteredTickets.length} results
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg transition text-sm font-medium ${currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
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
          <div
            className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface }}
          >
            <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    {editingTicket ? <FaEdit /> : <FaPlus />}
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>
                    {editingTicket ? 'Edit Ticket' : 'Assign New Ticket'}
                  </h2>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                  Ticket Type
                </label>
                <select
                  value={formData.ticketType}
                  onChange={(e) => setFormData({ ...formData, ticketType: e.target.value, serviceRequestId: '', orderId: '' })}
                  className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                >
                  <option value="service_request">Service Request (AMC)</option>
                  <option value="order">Order Installation</option>
                </select>
              </div>

              {formData.ticketType === 'service_request' && (
                <div className="relative">
                  <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Select Service Request ({serviceRequests.length} available)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border outline-none cursor-pointer"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                      readOnly
                      placeholder="Choose service request"
                      onClick={() => setShowSrDropdown(!showSrDropdown)}
                      value={
                        formData.serviceRequestId
                          ? serviceRequests.find(req => req._id === formData.serviceRequestId)
                            ? `${serviceRequests.find(req => req._id === formData.serviceRequestId).ticketId} - ${serviceRequests.find(req => req._id === formData.serviceRequestId).customerName}`
                            : formData.serviceRequestId
                          : ''
                      }
                    />
                    {showSrDropdown && (
                      <div className="absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border p-3" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                        <input
                          type="text"
                          placeholder="Search..."
                          autoFocus
                          value={srSearch}
                          onChange={(e) => setSrSearch(e.target.value)}
                          className="w-full p-2 mb-2 rounded-lg border text-sm outline-none"
                          style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {serviceRequests.filter(req => 
                            `${req.ticketId} ${req.customerName} ${req.type}`.toLowerCase().includes(srSearch.toLowerCase())
                          ).map((req) => (
                            <div
                              key={req._id}
                              className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  serviceRequestId: req._id,
                                  title: `${req.type} - ${req.customerName}`
                                });
                                setShowSrDropdown(false);
                                setSrSearch("");
                              }}
                            >
                              <div className="font-bold">{req.ticketId} - {req.customerName}</div>
                              <div className="text-[10px] opacity-60 uppercase">{req.type} (Open)</div>
                            </div>
                          ))}
                          {serviceRequests.filter(req => 
                            `${req.ticketId} ${req.customerName} ${req.type}`.toLowerCase().includes(srSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="p-3 text-center text-xs opacity-50">No service requests found</div>
                          )}
                        </div>
                      </div>
                    )}
                    {showSrDropdown && <div className="fixed inset-0 z-[999]" onClick={() => setShowSrDropdown(false)}></div>}
                  </div>
                </div>
              )}

              {formData.ticketType === 'order' && (
                <div className="relative">
                  <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Select Order ({orders.length} available)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border outline-none cursor-pointer"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                      readOnly
                      placeholder="Choose order"
                      onClick={() => setShowOrderDropdown(!showOrderDropdown)}
                      value={
                        formData.orderId
                          ? orders.find(ord => ord._id === formData.orderId)
                            ? `Order #${orders.find(ord => ord._id === formData.orderId)._id.slice(-6)} - ${orders.find(ord => ord._id === formData.orderId).shippingAddress?.name}`
                            : formData.orderId
                          : ''
                      }
                    />
                    {showOrderDropdown && (
                      <div className="absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border p-3" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                        <input
                          type="text"
                          placeholder="Search..."
                          autoFocus
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full p-2 mb-2 rounded-lg border text-sm outline-none"
                          style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {orders.filter(ord => 
                            `${ord._id} ${ord.shippingAddress?.name}`.toLowerCase().includes(orderSearch.toLowerCase())
                          ).map((ord) => (
                            <div
                              key={ord._id}
                              className="p-2 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  orderId: ord._id,
                                  title: `Order Installation - ${ord.shippingAddress?.name}`
                                });
                                setShowOrderDropdown(false);
                                setOrderSearch("");
                              }}
                            >
                              <div className="font-bold">Order #{ord._id.slice(-6)} - {ord.shippingAddress?.name}</div>
                              <div className="text-[10px] opacity-60">₹{ord.total} (Delivered)</div>
                            </div>
                          ))}
                          {orders.filter(ord => 
                            `${ord._id} ${ord.shippingAddress?.name}`.toLowerCase().includes(orderSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="p-3 text-center text-xs opacity-50">No orders found</div>
                          )}
                        </div>
                      </div>
                    )}
                    {showOrderDropdown && <div className="fixed inset-0 z-[999]" onClick={() => setShowOrderDropdown(false)}></div>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server Maintenance"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

                <div className="relative">
                  <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Assign To (Employee)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border outline-none cursor-pointer"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                      readOnly
                      placeholder="Select team member"
                      onClick={() => setShowTechDropdown(!showTechDropdown)}
                      value={formData.employee}
                    />
                    {showTechDropdown && (
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
                                setFormData({
                                  ...formData,
                                  employee: emp.name
                                });
                                setShowTechDropdown(false);
                                setTechSearch("");
                              }}
                            >
                              <div className="font-bold">{emp.name}</div>
                              <div className="text-[10px] opacity-60 uppercase">{emp.designation || emp.role}</div>
                            </div>
                          ))}
                          {employees.filter(emp => 
                            `${emp.name} ${emp.designation} ${emp.role}`.toLowerCase().includes(techSearch.toLowerCase())
                          ).length === 0 && (
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
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                  Task Instructions
                </label>
                <textarea
                  placeholder="Provide details about the task..."
                  rows="4"
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition"
                >
                  {editingTicket ? 'Update Changes' : 'Assign Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewOpen && viewingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: themeColors.surface }}
          >
            <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                    <FaFile />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>Ticket Details</h2>
                </div>
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Title</p>
                    <p className="font-bold text-lg" style={{ color: themeColors.text }}>{viewingTicket.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Assigned To</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                          {viewingTicket.employee.charAt(0)}
                        </div>
                        <span className="text-sm font-medium" style={{ color: themeColors.text }}>{viewingTicket.employee}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Priority</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${getPriorityColor(viewingTicket.priority)}`}>
                        {viewingTicket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Due Date</p>
                      <div className="flex items-center gap-2 text-sm mt-1" style={{ color: themeColors.text }}>
                        <FaClock className="opacity-60" />
                        {viewingTicket.date}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${viewingTicket.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {viewingTicket.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Location / Address</p>
                    <div className="p-4 rounded-xl border text-sm bg-blue-50/30 flex items-center gap-2" style={{ borderColor: themeColors.border, color: themeColors.text }}>
                      <FaTicketAlt className="opacity-40" />
                      <span className="font-bold">{viewingTicket.address || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Full Description</p>
                    <div
                      className="p-4 rounded-xl border text-sm max-h-40 overflow-y-auto"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                        color: themeColors.text
                      }}
                    >
                      {viewingTicket.desc || 'No additional instructions provided for this task.'}
                    </div>
                  </div>
                </div>

                {/* Right Column: Completion Info */}
                <div className="space-y-6">
                  {viewingTicket.status === 'Completed' ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Completion Remark</p>
                        <div className="p-4 rounded-xl border text-sm italic bg-green-50/30" style={{ borderColor: themeColors.border, color: themeColors.text }}>
                          {viewingTicket.completionRemark || 'No completion remarks provided.'}
                        </div>
                      </div>

                      {viewingTicket.completionPhotos && viewingTicket.completionPhotos.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Completion Photos ({viewingTicket.completionPhotos.length})</p>
                          <div className="grid grid-cols-2 gap-3">
                            {viewingTicket.completionPhotos.map((photo, idx) => (
                              <div key={idx} className="aspect-video rounded-xl overflow-hidden border shadow-sm group relative" style={{ borderColor: themeColors.border }}>
                                <img 
                                  src={photo} 
                                  alt={`Completion ${idx + 1}`} 
                                  className="w-full h-full object-cover cursor-pointer hover:scale-110 transition duration-500"
                                  onClick={() => {
                                    setPreviewImage(photo);
                                    setIsImagePreviewOpen(true);
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <FaEye className="text-white text-xl" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {viewingTicket.completedAt && (
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3 text-xs" style={{ color: themeColors.text }}>
                          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                            <FaCheck />
                          </div>
                          <div>
                            <p className="font-bold text-green-700">Task Completed</p>
                            <p className="opacity-70">{new Date(viewingTicket.completedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <FaHourglassHalf className="text-slate-300 text-2xl animate-pulse" />
                      </div>
                      <p className="font-bold text-slate-400">Waiting for Completion</p>
                      <p className="text-xs text-slate-400 mt-2">Employee has not marked this task as finished yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end" style={{ borderColor: themeColors.border }}>
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-10 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-lg shadow-blue-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Full Screen Image Preview Modal */}
      {isImagePreviewOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={() => setIsImagePreviewOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-300 transform hover:rotate-90"
            onClick={(e) => {
              e.stopPropagation();
              setIsImagePreviewOpen(false);
            }}
          >
            <FaTimes fontSize="24px" />
          </button>
          
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center p-12">
            <img 
              src={previewImage} 
              alt="Full Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
