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
  FaClock
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import http from '../apis/http';

export default function AssignTicket() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [tickets, setTickets] = useState([]);
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

  const [serviceRequests, setServiceRequests] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      await fetchTickets();
      await fetchEmployees();
      await fetchServiceRequests();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (tickets.length >= 0) {
      fetchOrders();
    }
  }, [tickets]);

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
      const response = await http.get('/api/admin/service-requests');
      console.log('Service Requests Response:', response);
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('Service Requests Data:', data);
      const openRequests = data.filter(req => req.status === 'Open');
      console.log('Open Service Requests:', openRequests);
      setServiceRequests(openRequests);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      setServiceRequests([]);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await http.get('/api/orders');
      let data = response.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.orders || data.data || [];
      }
      const ordersArray = Array.isArray(data) ? data : [];
      
      // Get all assigned order IDs
      const assignedOrderIds = tickets
        .filter(t => t.ticketType === 'order' && t.orderId)
        .map(t => t.orderId);
      
      // Filter: delivered orders that are NOT yet assigned for installation
      const availableOrders = ordersArray.filter(order => 
        order.status === 'delivered' && !assignedOrderIds.includes(order._id)
      );
      
      setOrders(availableOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
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
        desc: ticket.description || 'No description provided.',
        customerName: ticket.customerName,
        orderId: ticket.orderId?._id || ticket.orderId,
        serviceRequestId: ticket.serviceRequestId?._id || ticket.serviceRequestId
      }));

      formattedTickets.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTickets(formattedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Swal.fire('Error', 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form Data:', formData);
    console.log('Service Requests:', serviceRequests);
    console.log('Orders:', orders);
    
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
        status: 'Pending'
      };

      if (formData.ticketType === 'service_request' && formData.serviceRequestId) {
        const selectedRequest = serviceRequests.find(req => req._id === formData.serviceRequestId);
        console.log('Selected Service Request:', selectedRequest);
        if (selectedRequest) {
          ticketData.serviceRequestId = selectedRequest._id;
          ticketData.userId = selectedRequest.userId;
          ticketData.amcId = selectedRequest.amcId;
          ticketData.customerName = selectedRequest.customerName;
          ticketData.customerPhone = selectedRequest.customerPhone;
          ticketData.customerEmail = selectedRequest.customerEmail;
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
        }
      }

      console.log('Ticket Data to Submit:', ticketData);

      if (editingTicket) {
        await http.put(`/api/assigned-tickets/${editingTicket.id}`, ticketData);
        Swal.fire("Success", "Ticket Updated", "success");
      } else {
        await http.post('/api/assigned-tickets', ticketData);
        Swal.fire("Success", "Ticket Created", "success");
      }
      fetchTickets();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving ticket:', error);
      Swal.fire("Error", "Failed to save ticket", "error");
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
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Select Service Request ({serviceRequests.length} available)
                  </label>
                  <select
                    required
                    value={formData.serviceRequestId}
                    onChange={(e) => {
                      const selected = serviceRequests.find(req => req._id === e.target.value);
                      console.log('Selected Request:', selected);
                      setFormData({ 
                        ...formData, 
                        serviceRequestId: e.target.value,
                        title: selected ? `${selected.type} - ${selected.customerName}` : ''
                      });
                    }}
                    className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  >
                    <option value="">Choose service request</option>
                    {serviceRequests.length === 0 ? (
                      <option disabled>No open service requests</option>
                    ) : (
                      serviceRequests.map(req => (
                        <option key={req._id} value={req._id}>
                          {req.ticketId} - {req.customerName} - {req.type}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {formData.ticketType === 'order' && (
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                    Select Order ({orders.length} available)
                  </label>
                  <select
                    required
                    value={formData.orderId}
                    onChange={(e) => {
                      const selected = orders.find(order => order._id === e.target.value);
                      console.log('Selected Order:', selected);
                      setFormData({ 
                        ...formData, 
                        orderId: e.target.value,
                        title: selected ? `Order Installation - ${selected.shippingAddress?.name}` : ''
                      });
                    }}
                    className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  >
                    <option value="">Choose order</option>
                    {orders.length === 0 ? (
                      <option disabled>No confirmed orders</option>
                    ) : (
                      orders.map(order => (
                        <option key={order._id} value={order._id}>
                          Order #{order._id.slice(-6)} - {order.shippingAddress?.name} - ₹{order.total}
                        </option>
                      ))
                    )}
                  </select>
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

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>
                  Assign To (Employee)
                </label>
                <select
                  required
                  value={formData.employee}
                  onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
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
            className="rounded-2xl shadow-2xl max-w-lg w-full"
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

            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Title</p>
                <p className="font-bold text-lg" style={{ color: themeColors.text }}>{viewingTicket.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: themeColors.text }}>Assigned To</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
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
                <p className="text-xs font-bold uppercase opacity-60 mb-2" style={{ color: themeColors.text }}>Full Description</p>
                <div
                  className="p-4 rounded-xl border text-sm"
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

            <div className="p-6 border-t" style={{ borderColor: themeColors.border }}>
              <button
                onClick={() => setIsViewOpen(false)}
                className="w-full px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
