import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaSearch, FaUser, FaPhone, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaEye, FaClock, FaSms, FaTools, FaHistory, FaClipboardList, FaCheck, FaBan, FaRocket } from "react-icons/fa";
import http from "../apis/http";
import Swal from "sweetalert2";

export default function UserAMCManagement() {
  const { themeColors } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'enquiries'
  const [loading, setLoading] = useState(true);
  const [userAmcs, setUserAmcs] = useState([]);
  const [dueAmcs, setDueAmcs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revenue: 0, expiringSoon: 0, dueServices: 0 });
  const [employees, setEmployees] = useState([]);

  // Enquiries state
  const [enquiries, setEnquiries] = useState([]);
  const [enquiryFilter, setEnquiryFilter] = useState('All');
  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [expandedEnquiry, setExpandedEnquiry] = useState(null);
  const [customerHistoryMap, setCustomerHistoryMap] = useState({});
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedAmcForBooking, setSelectedAmcForBooking] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [bookingForm, setBookingForm] = useState({
      employeeName: "",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchUserAmcs();
    fetchDueAmcs();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
      try {
          const { data } = await http.get('/api/employees');
          setEmployees(data.filter(emp => emp.role !== 'Manager'));
      } catch (err) {
          console.error("Error fetching employees:", err);
      }
  };

  const fetchUserAmcs = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/api/my-amcs/admin/all");
      console.log('User AMCs Response:', data);
      const amcs = data.amcs || [];
      setUserAmcs(amcs);

      // Calculate stats with proper status logic
      const now = new Date();
      const activeCount = amcs.filter(a => {
        const endDate = new Date(a.endDate);
        const isDateExpired = endDate < now;
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        return a.status === 'Active' && !isDateExpired && !isServicesExhausted;
      }).length;

      const expiredCount = amcs.filter(a => {
        const endDate = new Date(a.endDate);
        const isDateExpired = endDate < now;
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        return a.status === 'Expired' || (a.status === 'Active' && (isDateExpired || isServicesExhausted));
      }).length;

      const expiringSoonCount = amcs.filter(a => {
        const endDate = new Date(a.endDate);
        const isDateExpired = endDate < now;
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        
        if (a.status !== 'Active' || isDateExpired || isServicesExhausted) return false;
        
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        const servicesRemaining = (a.servicesTotal || 4) - (a.servicesUsed || 0);

        const isDateExpiringSoon = daysLeft > 0 && daysLeft <= 120;
        const isServicesExpiringSoon = servicesRemaining === 1;

        return isDateExpiringSoon || isServicesExpiringSoon;
      }).length;

      const renewedCount = amcs.filter(a => a.status === 'Renewed').length;

      setStats(prev => ({
        ...prev,
        total: amcs.length,
        active: activeCount,
        expired: expiredCount,
        renewed: renewedCount,
        revenue: amcs.reduce((sum, a) => sum + (a.amcPlanPrice || 0), 0),
        expiringSoon: expiringSoonCount
      }));
    } catch (err) {
      console.error("Error fetching user AMCs:", err);
      Swal.fire("Error", "Failed to load AMC data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchDueAmcs = async () => {
    try {
      const { data } = await http.get("/api/my-amcs/admin/due");
      setDueAmcs(data.amcs || []);
      setStats(prev => ({
        ...prev,
        dueServices: (data.amcs || []).length
      }));
    } catch (err) {
      console.error("Error fetching due AMCs:", err);
    }
  };

  const fetchEnquiries = async () => {
    setEnquiryLoading(true);
    try {
      const { data } = await http.get(`/api/amc-enquiries/admin?status=${enquiryFilter}`);
      setEnquiries(data.enquiries || []);
    } catch (err) {
      console.error('Error fetching enquiries:', err);
    } finally {
      setEnquiryLoading(false);
    }
  };

  const fetchCustomerHistory = async (phone) => {
    try {
      const { data } = await http.get(`/api/amc-enquiries/admin/customer/${phone}`);
      return data;
    } catch { return null; }
  };

  useEffect(() => { if (activeTab === 'enquiries') fetchEnquiries(); }, [activeTab, enquiryFilter]);

  const handleVerifyEnquiry = async (enq) => {
    const { value: notes } = await Swal.fire({
      title: 'Verify Enquiry',
      input: 'textarea',
      inputLabel: 'Admin Notes (optional)',
      inputPlaceholder: 'Add verification notes...',
      showCancelButton: true,
      confirmButtonText: 'Verify',
      confirmButtonColor: '#2563eb',
    });
    if (notes === undefined) return;
    try {
      await http.put(`/api/amc-enquiries/admin/${enq._id}/verify`, { adminNotes: notes });
      Swal.fire('Verified!', 'Enquiry marked as verified.', 'success');
      fetchEnquiries();
    } catch (err) { Swal.fire('Error', 'Failed to verify', 'error'); }
  };

  const handleRejectEnquiry = async (enq) => {
    const { value: notes } = await Swal.fire({
      title: 'Reject Enquiry',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#dc2626',
    });
    if (notes === undefined) return;
    try {
      await http.put(`/api/amc-enquiries/admin/${enq._id}/reject`, { adminNotes: notes });
      Swal.fire('Rejected', 'Enquiry has been rejected.', 'info');
      fetchEnquiries();
    } catch (err) { Swal.fire('Error', 'Failed to reject', 'error'); }
  };

  const handleActivateAmc = async (enq) => {
    // Fetch AMC plans for dropdown
    let amcPlans = [];
    try { const { data } = await http.get('/api/amc-plans'); amcPlans = data.plans || []; } catch {}

    const planOptions = amcPlans.map(p => `<option value="${p._id}" data-name="${p.name}" data-services="${p.servicesIncluded || 4}">${p.name}</option>`).join('');

    const result = await Swal.fire({
      title: 'Activate AMC',
      width: 600,
      html: `
        <div class="text-left space-y-3 text-sm">
          <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p class="font-bold text-blue-800">${enq.name} &bull; ${enq.phone}</p>
            <p class="text-blue-600 text-xs mt-0.5">${enq.amcPlanName}${enq.productName ? ' — ' + enq.productName : ''}${enq.duration ? ' (' + enq.duration + ')' : ''}</p>
            ${enq.price ? '<p class="text-green-700 font-bold text-xs mt-0.5">Requested Price: ₹' + enq.price + '</p>' : ''}
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold mb-1">Product Name *</label>
              <input id="act-product" type="text" value="${enq.productName || ''}" placeholder="e.g. RO Purifier" class="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Start Date *</label>
              <input id="act-start" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Duration (Months) *</label>
              <select id="act-duration" class="w-full p-2 border rounded text-sm">
                <option value="12">1 Year (12 months)</option>
                <option value="24">2 Years (24 months)</option>
                <option value="36">3 Years (36 months)</option>
                <option value="6">6 Months</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Services Included *</label>
              <input id="act-services" type="number" value="4" min="1" class="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Amount Paid (₹) *</label>
              <input id="act-amount" type="number" value="${enq.price || 0}" min="0" class="w-full p-2 border rounded text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Payment Mode *</label>
              <select id="act-paymode" class="w-full p-2 border rounded text-sm">
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Free">Free</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Payment Status</label>
              <select id="act-paystatus" class="w-full p-2 border rounded text-sm">
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '✅ Activate AMC',
      confirmButtonColor: '#059669',
      preConfirm: () => ({
        productName: document.getElementById('act-product').value || enq.productName || 'Product',
        startDate: document.getElementById('act-start').value,
        durationMonths: parseInt(document.getElementById('act-duration').value),
        servicesTotal: parseInt(document.getElementById('act-services').value) || 4,
        amountPaid: parseFloat(document.getElementById('act-amount').value) || 0,
        paymentMode: document.getElementById('act-paymode').value,
        paymentStatus: document.getElementById('act-paystatus').value,
        userId: enq.userId?._id || null,
        customerPhone: enq.phone,
      })
    });
    if (!result.isConfirmed) return;
    try {
      await http.post(`/api/amc-enquiries/admin/${enq._id}/activate`, result.value);
      Swal.fire('AMC Activated!', `AMC for ${result.value.productName} is now active.`, 'success');
      fetchEnquiries();
      fetchUserAmcs();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to activate', 'error');
    }
  };

  const checkServiceEligibility = (amc) => {
    const now = new Date();
    let dueDate;
    if (amc.nextServiceDueDate) {
      dueDate = new Date(amc.nextServiceDueDate);
    } else {
      dueDate = new Date(amc.startDate);
      dueDate.setMonth(dueDate.getMonth() + ((amc.servicesUsed + 1) * 4));
    }
    if (dueDate > now) {
      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      Swal.fire('Not Eligible', `Next service is due on ${dueDate.toLocaleDateString('en-IN')}. Please wait ${daysLeft} more day(s).`, 'info');
      return false;
    }
    return true;
  };

  const openBookingModal = (amc) => {
    const dueData = dueAmcs.find(d => d._id === amc._id);
    setSelectedAmcForBooking(dueData || amc);
    setBookingForm({
      employeeName: "",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsBookingModalOpen(true);
  };

  const handleBookService = (amc) => {
    if (!checkServiceEligibility(amc)) return;
    openBookingModal(amc);
  };

  const createServiceTicket = (amc) => {
    if (!checkServiceEligibility(amc)) return;
    openBookingModal(amc);
  };

  const handleBookingSubmit = async (e) => {
      e.preventDefault();
      if (!bookingForm.employeeName) {
          Swal.fire("Error", "Please select an employee", "error");
          return;
      }

      try {
          const adminData = JSON.parse(localStorage.getItem('admin-data') || '{}');
          const primaryAddress = selectedAmcForBooking.userId?.addresses?.find(addr => addr.isDefault || addr.isPrimary) || selectedAmcForBooking.userId?.addresses?.[0];
          const addressString = primaryAddress
            ? `${primaryAddress.addressLine1 || ''}, ${primaryAddress.city || ''}, ${primaryAddress.state || ''} ${primaryAddress.pincode || ''}`.trim()
            : [selectedAmcForBooking.userId?.address, selectedAmcForBooking.userId?.city, selectedAmcForBooking.userId?.state, selectedAmcForBooking.userId?.pincode].filter(Boolean).join(', ') || 'N/A';

          await http.post('/api/assigned-tickets', {
            title: `AMC Service #${selectedAmcForBooking.nextServiceNumber || (selectedAmcForBooking.servicesUsed || 0) + 1} - ${selectedAmcForBooking.userId?.firstName} ${selectedAmcForBooking.userId?.lastName}`,
            ticketType: 'service_request',
            customerName: `${selectedAmcForBooking.userId?.firstName || ''} ${selectedAmcForBooking.userId?.lastName || ''}`.trim() || selectedAmcForBooking.customerPhone || 'Customer',
            customerPhone: selectedAmcForBooking.userId?.phone || selectedAmcForBooking.customerPhone,
            customerEmail: selectedAmcForBooking.userId?.email || 'N/A',
            address: addressString,
            description: `AMC Mandatory Service #${selectedAmcForBooking.nextServiceNumber || (selectedAmcForBooking.servicesUsed || 0) + 1} for ${selectedAmcForBooking.productName} (${selectedAmcForBooking.amcPlanName}). Customer: ${selectedAmcForBooking.userId?.firstName || ''} ${selectedAmcForBooking.userId?.lastName || ''}, Phone: ${selectedAmcForBooking.userId?.phone || selectedAmcForBooking.customerPhone}, Address: ${addressString}`,
            priority: 'High',
            status: 'Pending',
            assignedBy: adminData.name || 'Admin',
            assignedTo: bookingForm.employeeName,
            amcId: selectedAmcForBooking._id,
            userId: selectedAmcForBooking.userId?._id,
            dueDate: bookingForm.dueDate,
            visitType: 'AMC_REMINDER',
            assignedByRole: 'Admin'
          });
          Swal.fire('Success', 'Service ticket assigned successfully', 'success');
          setIsBookingModalOpen(false);
          fetchUserAmcs();
          fetchDueAmcs();
      } catch (error) {
          console.error('Error assigning ticket:', error);
          Swal.fire('Error', 'Failed to assign ticket', 'error');
      }
  };

  const handleNotifyUser = async (amc) => {
    const servicesRemaining = (amc.servicesTotal || 4) - (amc.servicesUsed || 0);
    const isServicesExhausted = servicesRemaining === 0;
    const daysLeft = Math.ceil((new Date(amc.endDate) - new Date()) / (1000 * 60 * 60 * 24));

    let defaultMessage = '';
    if (amc.nextServiceNumber) {
      defaultMessage = `Dear ${amc.userId?.firstName}, your scheduled AMC Service visit #${amc.nextServiceNumber} for ${amc.productName} is now due. Our technician will contact you shortly for the site visit.`;
    } else if (isServicesExhausted) {
      defaultMessage = `Dear ${amc.userId?.firstName}, your AMC for ${amc.productName} has exhausted all ${amc.servicesTotal} services. Please renew to continue enjoying our services. Contact us for renewal.`;
    } else if (servicesRemaining === 1) {
      defaultMessage = `Dear ${amc.userId?.firstName}, your AMC for ${amc.productName} has only 1 service remaining out of ${amc.servicesTotal}. Consider renewing soon to avoid service interruption.`;
    } else if (daysLeft <= 30) {
      defaultMessage = `Dear ${amc.userId?.firstName}, your AMC for ${amc.productName} is expiring in ${daysLeft} days. Renew now to continue uninterrupted service.`;
    }

    const result = await Swal.fire({
      title: 'Notify Customer',
      html: `
        <div class="text-left mb-4">
          <p class="text-sm mb-2"><strong>Customer:</strong> ${amc.userId?.firstName} ${amc.userId?.lastName}</p>
          <p class="text-sm mb-2"><strong>Phone:</strong> ${amc.userId?.phone}</p>
          <p class="text-sm mb-2"><strong>Product:</strong> ${amc.productName}</p>
          <p class="text-sm mb-4"><strong>Services:</strong> ${amc.servicesUsed}/${amc.servicesTotal} used (${servicesRemaining} left)</p>
        </div>
        <textarea 
          id="notify-message" 
          class="w-full p-3 border border-gray-300 rounded-lg text-sm"
          rows="5"
          placeholder="Enter notification message..."
        >${defaultMessage}</textarea>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="fas fa-sms"></i> Send SMS',
      denyButtonText: '<i class="fas fa-phone"></i> Call Customer',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#3b82f6',
      preConfirm: () => {
        const message = document.getElementById('notify-message').value;
        if (!message) {
          Swal.showValidationMessage('Please enter a message');
        }
        return { message, action: 'sms' };
      },
      preDeny: () => {
        return { action: 'call' };
      }
    });

    if (result.isConfirmed) {
      // Send SMS
      try {
        await http.post('/api/sms/send', {
          mobile: amc.userId?.phone,
          message: result.value.message
        });

        // Create notification for user
        await http.post('/api/notifications/user-notifications', {
          userId: amc.userId?._id,
          title: 'AMC Renewal Reminder',
          message: result.value.message,
          type: 'AMC'
        });

        Swal.fire('Sent!', 'SMS and notification sent successfully', 'success');
      } catch (err) {
        console.error('Failed to send notification:', err);
        Swal.fire('Error', 'Failed to send notification: ' + (err.response?.data?.message || 'Server Error'), 'error');
      }
    } else if (result.isDenied) {
      // Call customer
      window.location.href = `tel:${amc.userId?.phone}`;
      Swal.fire({
        title: 'Calling...',
        text: `Calling ${amc.userId?.firstName} at ${amc.userId?.phone}`,
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleRenewAmc = async (amc) => {
    const result = await Swal.fire({
      title: 'Renew AMC Subscription',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-gray-50 p-3 rounded border">
            <p class="text-sm font-bold text-gray-700 mb-2">Current AMC Details:</p>
            <p class="text-sm"><strong>Customer:</strong> ${amc.userId?.firstName} ${amc.userId?.lastName}</p>
            <p class="text-sm"><strong>Product:</strong> ${amc.productName}</p>
            <p class="text-sm"><strong>Plan:</strong> ${amc.amcPlanName}</p>
            <p class="text-sm"><strong>Original Price:</strong> ₹${amc.amcPlanPrice}</p>
          </div>
          <div class="space-y-2 mt-4">
            <label class="block text-xs font-bold text-gray-700">Duration (Months)</label>
            <input id="renew-duration" type="number" value="12" min="1" max="60" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">Total Services</label>
            <input id="renew-services" type="number" value="${amc.servicesTotal || 4}" min="1" max="20" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">Renewal Price</label>
            <input id="renew-price" type="number" value="${amc.amcPlanPrice || 0}" min="0" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">Start Date</label>
            <input id="renew-start" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="text-xs text-red-600 mt-2">
            <strong>Note:</strong> This will create a new AMC record and mark the current one as expired.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirm Renewal',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const duration = parseInt(document.getElementById('renew-duration').value);
        const services = parseInt(document.getElementById('renew-services').value);
        const price = parseFloat(document.getElementById('renew-price').value);
        const startDate = document.getElementById('renew-start').value;
        
        if (!duration || duration < 1) {
          Swal.showValidationMessage('Duration must be at least 1 month');
          return false;
        }
        if (!services || services < 1) {
          Swal.showValidationMessage('Services must be at least 1');
          return false;
        }
        if (!price || price < 0) {
          Swal.showValidationMessage('Price must be a valid amount');
          return false;
        }
        if (!startDate) {
          Swal.showValidationMessage('Start date is required');
          return false;
        }
        
        return {
          durationMonths: duration,
          servicesTotal: services,
          pricePaid: price,
          startDate: startDate
        };
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await http.post(`/api/my-amcs/admin/renew/${amc._id}`, result.value);
        
        // Show detailed success message
        await Swal.fire({
          title: 'AMC Renewed Successfully!',
          html: `
            <div class="text-left space-y-2">
              <p class="text-sm"><strong>Customer:</strong> ${amc.userId?.firstName} ${amc.userId?.lastName}</p>
              <p class="text-sm"><strong>Product:</strong> ${amc.productName}</p>
              <p class="text-sm"><strong>New Duration:</strong> ${result.value.durationMonths} months</p>
              <p class="text-sm"><strong>Services:</strong> ${result.value.servicesTotal} visits</p>
              <p class="text-sm"><strong>Amount:</strong> ₹${result.value.pricePaid}</p>
              <div class="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                <strong>Note:</strong> A new AMC record has been created. The previous AMC has been marked as expired.
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#059669'
        });
        
        fetchUserAmcs(); // Refresh the list
        fetchDueAmcs(); // Refresh due services
      } catch (err) {
        console.error('Renewal error:', err);
        Swal.fire('Error', 'Failed to renew AMC: ' + (err.response?.data?.message || 'Server error'), 'error');
      }
    }
  };

  const createRenewalTicket = async (amc) => {
    // ...
  };

  const filteredAmcs = (() => {
    if (statusFilter === "Due for Service") return dueAmcs;

    return userAmcs.filter(amc => {
      // Calculate actual status based on current conditions
      const now = new Date();
      const endDate = new Date(amc.endDate);
      const isDateExpired = endDate < now;
      const isServicesExhausted = (amc.servicesUsed || 0) >= (amc.servicesTotal || 4);
      
      // Determine actual status (override database status if needed)
      let actualStatus = amc.status;
      if (amc.status === 'Active' && (isDateExpired || isServicesExhausted)) {
        actualStatus = 'Expired';
      }

      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      const servicesRemaining = (amc.servicesTotal || 4) - (amc.servicesUsed || 0);

      // Expiring soon logic
      const isDateExpiringSoon = actualStatus === 'Active' && daysLeft > 0 && daysLeft <= 120;
      const isServicesExpiringSoon = actualStatus === 'Active' && servicesRemaining === 1;
      const isExpiringSoon = isDateExpiringSoon || isServicesExpiringSoon;

      // Filter by status
      let matchesStatus = false;
      if (statusFilter === "All") {
        matchesStatus = true;
      } else if (statusFilter === "Expiring Soon") {
        matchesStatus = isExpiringSoon;
      } else {
        matchesStatus = actualStatus === statusFilter;
      }

      // Filter by search
      const matchesSearch =
        amc.productName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.amcPlanName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.userId?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.userId?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.userId?.phone?.includes(search) ||
        amc.customerPhone?.includes(search);
        
      return matchesStatus && matchesSearch;
    });
  })();

  // Grouping logic
  const groupedAmcs = (() => {
    const groups = {};
    filteredAmcs.forEach(amc => {
      const phone = amc.userId?.phone || amc.customerPhone || 'Unknown';
      if (!groups[phone]) {
        const firstName = amc.userId?.firstName || 'Offline Customer';
        const lastName = amc.userId?.lastName || '';
        const displayPhone = amc.userId?.phone || amc.customerPhone || '';
        groups[phone] = {
          user: amc.userId || { firstName, lastName, phone: displayPhone },
          items: []
        };
      }
      groups[phone].items.push(amc);
    });
    return Object.values(groups);
  })();

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="p-6 rounded-xl border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-70 mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <Icon size={32} className={color} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ color: themeColors.text }}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaShieldAlt className="text-green-600" /> User AMC Subscriptions
        </h1>
        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <button onClick={() => setActiveTab('subscriptions')} className={`px-4 py-2 text-sm rounded-md font-bold transition flex items-center gap-2 ${activeTab === 'subscriptions' ? 'bg-blue-600 text-white' : ''}`}>
            <FaShieldAlt size={12} /> Subscriptions
          </button>
          <button onClick={() => setActiveTab('enquiries')} className={`px-4 py-2 text-sm rounded-md font-bold transition flex items-center gap-2 ${activeTab === 'enquiries' ? 'bg-blue-600 text-white' : ''}`}>
            <FaClipboardList size={12} /> AMC Enquiries
            {enquiries.filter(e => e.status === 'Pending').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{enquiries.filter(e => e.status === 'Pending').length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      {activeTab === 'subscriptions' && (<>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Total AMCs" value={stats.total} icon={FaShieldAlt} color="text-blue-600" />
        <StatCard title="Active" value={stats.active} icon={FaCheckCircle} color="text-emerald-600" />
        <StatCard title="Expired" value={stats.expired} icon={FaTimesCircle} color="text-red-600" />
        <StatCard title="Due Service" value={stats.dueServices} icon={FaClock} color="text-orange-600" />
        <StatCard title="Renewed" value={stats.renewed || 0} icon={FaCheckCircle} color="text-blue-600" />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={FaClock} color="text-yellow-600" />
        <StatCard title="Revenue" value={`\u20b9${stats.revenue.toLocaleString()}`} icon={FaCalendarAlt} color="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          {["All", "Active", "Due for Service", "Expiring Soon", "Expired", "Renewed", "Cancelled"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm rounded-md transition ${statusFilter === status ? 'bg-blue-600 text-white' : ''}`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative">
          <FaSearch className="absolute left-3 top-3 opacity-50" />
          <input
            type="text"
            placeholder="Search by name, phone, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-96"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background }}>
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Product</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Price</th>
                <th className="p-4">Start Date</th>
                <th className="p-4">End Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Services</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr><td colSpan="9" className="p-8 text-center">Loading...</td></tr>
              ) : groupedAmcs.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center opacity-50">No AMC subscriptions found</td></tr>
              ) : (
                groupedAmcs.map((group, gIdx) => (
                  <tr key={group.user.phone || gIdx} className="hover:bg-black/5" style={{ verticalAlign: 'top' }}>
                    {/* Customer Column - Merged for the whole row */}
                    <td className="p-4 align-top border-r" style={{ borderColor: themeColors.border }}>
                      <div className="flex items-center gap-2 sticky top-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                          {group.user.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-base">{group.user.firstName} {group.user.lastName}</div>
                          <div className="text-sm opacity-70 flex items-center gap-1 mt-1">
                            <FaPhone size={12} className="text-blue-600" /> 
                            <span className="font-semibold">{group.user.phone}</span>
                          </div>
                          {group.items.length > 1 && (
                            <div className="mt-2">
                              <span className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded-full font-bold shadow-sm">
                                {group.items.length} ACTIVE PRODUCTS
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* All other columns - Sub-rows for each AMC */}
                    <td colSpan="8" className="p-0">
                      <table className="w-full border-collapse">
                        <tbody>
                          {group.items.map((amc, idx) => {
                            const now = new Date();
                            const endDate = new Date(amc.endDate);
                            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                            const servicesRemaining = (amc.servicesTotal || 4) - (amc.servicesUsed || 0);

                            const isDateExpired = endDate < now;
                            const isServicesExhausted = (amc.servicesUsed || 0) >= (amc.servicesTotal || 4);
                            const displayStatus = (amc.status === 'Active' && (isDateExpired || isServicesExhausted)) ? 'Expired' : amc.status;

                            const isDateExpiringSoon = displayStatus === 'Active' && daysLeft > 0 && daysLeft <= 30;
                            const isServicesExpiringSoon = displayStatus === 'Active' && servicesRemaining === 1;
                            const isDueForService = dueAmcs.some(d => d._id === amc._id);

                            return (
                              <tr key={amc._id} className={`${idx > 0 ? 'border-t' : ''} hover:bg-blue-50/10 transition-colors`} style={{ borderColor: themeColors.border }}>
                                <td className="p-4 w-[12%]">
                                  <div className="font-bold text-gray-800">{amc.productName}</div>
                                  <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold">{amc.productType || 'Product'}</div>
                                </td>
                                <td className="p-4 w-[12%]">
                                  <div className="font-bold text-blue-700">{amc.amcPlanName}</div>
                                  {isDueForService && (
                                    <div className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold mt-1 w-fit">
                                      SERVICE DUE
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 w-[10%] font-bold text-green-600">₹{amc.amcPlanPrice?.toLocaleString()}</td>
                                <td className="p-4 w-[10%] whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <FaCalendarAlt className="text-green-500" size={12} />
                                    {new Date(amc.startDate).toLocaleDateString('en-IN')}
                                  </div>
                                </td>
                                <td className="p-4 w-[10%] whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <FaCalendarAlt className="text-red-500" size={12} />
                                    {new Date(amc.endDate).toLocaleDateString('en-IN')}
                                  </div>
                                </td>
                                <td className="p-4 w-[12%]">
                                  <div className="flex flex-col gap-1">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold flex items-center gap-1 w-fit uppercase tracking-tight ${
                                      displayStatus === 'Active' ? 'bg-green-100 text-green-700 shadow-sm' :
                                      displayStatus === 'Expired' ? 'bg-red-100 text-red-700 shadow-sm' :
                                      displayStatus === 'Renewed' ? 'bg-blue-100 text-blue-700 shadow-sm' :
                                      'bg-yellow-100 text-yellow-700 shadow-sm'
                                    }`}>
                                      {displayStatus === 'Active' ? <FaCheckCircle /> : displayStatus === 'Renewed' ? <FaCheckCircle /> : <FaTimesCircle />}
                                      {displayStatus}
                                    </span>
                                    {(isDateExpiringSoon || isServicesExpiringSoon) && displayStatus === 'Active' && (
                                      <div className="text-[10px] text-orange-600 font-bold flex items-center gap-1 animate-pulse">
                                        <FaClock size={10} />
                                        {isServicesExpiringSoon ? 'LAST SERVICE' : `${daysLeft}D LEFT`}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 w-[10%]">
                                  <div className={`text-sm font-bold ${servicesRemaining <= 1 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {amc.servicesUsed || 0} / {amc.servicesTotal || 4}
                                  </div>
                                  <div className="text-[10px] opacity-60 font-bold uppercase">Used</div>
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-wrap gap-1.5 min-w-[140px]">
                                    <button
                                      onClick={() => navigate(`/user-amc-history/${amc.userId?.phone}`)}
                                      className="p-1.5 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-600 hover:text-white transition shadow-sm border border-purple-100"
                                      title="History"
                                    >
                                      <FaHistory size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleBookService(amc)}
                                      className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition shadow-sm border border-green-100"
                                      title="Book Service"
                                    >
                                      <FaTools size={14} />
                                    </button>
                                    {isDueForService && (
                                      <button
                                        onClick={() => createServiceTicket(amc)}
                                        className="p-1.5 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-600 hover:text-white transition shadow-sm border border-orange-100"
                                        title="Assign Service"
                                      >
                                        <FaClock size={14} />
                                      </button>
                                    )}
                                    {displayStatus !== 'Renewed' && (isServicesExhausted || servicesRemaining === 1 || isDateExpiringSoon || displayStatus === 'Expired') && (
                                      <>
                                        <button
                                          onClick={() => handleNotifyUser(amc)}
                                          className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-100"
                                          title="Notify User"
                                        >
                                          <FaSms size={14} />
                                        </button>
                                        {(displayStatus === 'Expired' || servicesRemaining === 0) && (
                                          <button
                                            onClick={() => handleRenewAmc(amc)}
                                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition shadow-sm border border-emerald-100"
                                            title="Renew AMC"
                                          >
                                            <FaShieldAlt size={14} />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* AMC Enquiries Tab */}
      {activeTab === 'enquiries' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-wrap gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              {['All','Pending','Verified','Activated','Rejected'].map(s => (
                <button key={s} onClick={() => setEnquiryFilter(s)} className={`px-4 py-2 text-sm rounded-md transition font-medium ${enquiryFilter === s ? 'bg-blue-600 text-white' : ''}`}>{s}</button>
              ))}
            </div>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 opacity-50" />
              <input type="text" placeholder="Search name, phone, product..." value={enquirySearch} onChange={e => setEnquirySearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-80"
                style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }} />
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background }}>
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Product / Brand</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Purchased?</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                  {enquiryLoading ? (
                    <tr><td colSpan="8" className="p-8 text-center">Loading...</td></tr>
                  ) : enquiries.filter(e =>
                      !enquirySearch ||
                      e.name?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
                      e.phone?.includes(enquirySearch) ||
                      e.productName?.toLowerCase().includes(enquirySearch.toLowerCase())
                    ).length === 0 ? (
                    <tr><td colSpan="8" className="p-8 text-center opacity-50">No enquiries found</td></tr>
                  ) : enquiries.filter(e =>
                      !enquirySearch ||
                      e.name?.toLowerCase().includes(enquirySearch.toLowerCase()) ||
                      e.phone?.includes(enquirySearch) ||
                      e.productName?.toLowerCase().includes(enquirySearch.toLowerCase())
                    ).map(enq => (
                    <>
                      <tr key={enq._id} className="hover:bg-black/5 cursor-pointer" onClick={async () => {
                        const newId = expandedEnquiry === enq._id ? null : enq._id;
                        setExpandedEnquiry(newId);
                        if (newId && !customerHistoryMap[enq.phone]) {
                          const hist = await fetchCustomerHistory(enq.phone);
                          if (hist) setCustomerHistoryMap(prev => ({ ...prev, [enq.phone]: hist }));
                        }
                      }}>
                        <td className="p-4">
                          <div className="font-bold">{enq.name}</div>
                          <div className="text-xs opacity-60 flex items-center gap-1 mt-0.5"><FaPhone size={10} /> {enq.phone}</div>
                          {enq.email && <div className="text-xs opacity-50">{enq.email}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-bold">{enq.productName || <span className="opacity-40 text-xs">Not specified</span>}</div>
                          <div className="text-xs opacity-60">{enq.amcPlanId?.name || enq.amcPlanName}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-blue-700">{enq.amcPlanName}</div>
                          <div className="text-xs opacity-60">{enq.duration}</div>
                        </td>
                        <td className="p-4 font-bold text-green-600">₹{enq.price}</td>
                        <td className="p-4">
                          {enq.hasPurchasedFromUs
                            ? <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200">✅ Yes</span>
                            : <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded border border-orange-200">⚠️ No</span>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            enq.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            enq.status === 'Verified' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            enq.status === 'Activated' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>{enq.status}</span>
                        </td>
                        <td className="p-4 text-xs opacity-60">{new Date(enq.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="p-4">
                          <div className="flex gap-1.5">
                            {enq.status === 'Pending' && (
                              <>
                                <button onClick={e => { e.stopPropagation(); handleVerifyEnquiry(enq); }} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition" title="Verify"><FaCheck size={12} /></button>
                                <button onClick={e => { e.stopPropagation(); handleRejectEnquiry(enq); }} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-600 hover:text-white transition" title="Reject"><FaBan size={12} /></button>
                              </>
                            )}
                            {enq.status === 'Verified' && (
                              <button onClick={e => { e.stopPropagation(); handleActivateAmc(enq); }} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-600 hover:text-white transition flex items-center gap-1 text-xs font-bold px-3" title="Activate AMC">
                                <FaRocket size={11} /> Activate
                              </button>
                            )}
                            {enq.status === 'Activated' && (
                              <span className="text-xs text-green-600 font-bold">AMC Active</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedEnquiry === enq._id && (
                        <tr key={enq._id + '-detail'} style={{ backgroundColor: themeColors.background }}>
                          <td colSpan="8" className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-bold text-sm mb-3 opacity-70 uppercase tracking-wider">Customer Details</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="opacity-50">Name:</span> <strong>{enq.name}</strong></p>
                                  <p><span className="opacity-50">Phone:</span> <strong>{enq.phone}</strong></p>
                                  {enq.email && <p><span className="opacity-50">Email:</span> {enq.email}</p>}
                                  {enq.address && <p><span className="opacity-50">Address:</span> {enq.address}</p>}
                                  {enq.notes && <p className="mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-100"><strong>Notes:</strong> {enq.notes}</p>}
                                  {enq.adminNotes && <p className="mt-2 p-2 bg-yellow-50 rounded text-xs border border-yellow-200"><strong>Admin Notes:</strong> {enq.adminNotes}</p>}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-bold text-sm mb-3 opacity-70 uppercase tracking-wider">
                                  Delivered Orders ({customerHistoryMap[enq.phone]?.orders?.length || 0})
                                </h4>
                                {!customerHistoryMap[enq.phone] ? (
                                  <p className="text-xs opacity-50">Loading...</p>
                                ) : customerHistoryMap[enq.phone]?.orders?.length > 0 ? (
                                  <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {customerHistoryMap[enq.phone].orders.map((o, oi) => (
                                      <div key={oi} className="p-3 rounded-xl border text-xs" style={{ borderColor: themeColors.border }}>
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="font-black text-blue-700">#{o._id?.toString().slice(-6).toUpperCase()}</span>
                                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                            o.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                                          }`}>{o.status}</span>
                                        </div>
                                        {o.items?.map((item, ii) => (
                                          <div key={ii} className="font-bold text-slate-700 mb-1">{item.productName}</div>
                                        ))}
                                        <div className="text-slate-400 space-y-0.5 mt-2">
                                          <p>📅 Ordered: {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                                          {o.deliveredAt && <p>✅ Delivered: {new Date(o.deliveredAt).toLocaleDateString('en-IN')}</p>}
                                          <p>📍 {o.shippingAddress?.addressLine1}, {o.shippingAddress?.city}, {o.shippingAddress?.state} - {o.shippingAddress?.pincode}</p>
                                          <p>💰 ₹{o.total?.toLocaleString()}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs opacity-50 p-3 bg-slate-50 rounded-xl border border-slate-100">No delivered orders found for this phone number.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && selectedAmcForBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                className="rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
                style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
              >
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: themeColors.border }}>
                      <FaTools className="text-blue-600" /> Assign Service Ticket
                  </h2>
                  
                  <div className="p-3 bg-blue-50 rounded-lg text-sm mb-4 border border-blue-100">
                      <p className="font-bold text-blue-800 mb-1 leading-tight">
                          {selectedAmcForBooking.nextServiceNumber ? `Service #${selectedAmcForBooking.nextServiceNumber}` : "Manual Service Booking"}
                      </p>
                      <p className="text-blue-700 opacity-90">
                          {selectedAmcForBooking.userId?.firstName} {selectedAmcForBooking.userId?.lastName} - {selectedAmcForBooking.productName}
                      </p>
                  </div>

                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                      <div className="relative">
                          <label className="block text-xs font-bold uppercase opacity-60 mb-1">Select Technician</label>
                          <div className="relative">
                              <input
                                  type="text"
                                  className="w-full border rounded-lg p-3 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
                                  readOnly
                                  placeholder="-- Select Technician --"
                                  style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                                  onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                                  value={bookingForm.employeeName}
                              />
                              {showEmployeeDropdown && (
                                  <div className="absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border p-3 animate-in fade-in slide-in-from-top-2 duration-200" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
                                      <div className="relative mb-2">
                                          <FaSearch className="absolute left-3 top-3 opacity-40" />
                                          <input
                                              type="text"
                                              placeholder="Search technician..."
                                              autoFocus
                                              className="w-full pl-9 p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                              style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                                              value={employeeSearch}
                                              onChange={e => setEmployeeSearch(e.target.value)}
                                          />
                                      </div>
                                      <div className="max-h-60 overflow-y-auto space-y-1">
                                          {employees.filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase())).map(emp => (
                                              <div 
                                                  key={emp._id}
                                                  className="p-3 hover:bg-black/5 cursor-pointer rounded-lg text-sm transition-colors flex justify-between items-center"
                                                  onClick={() => {
                                                      setBookingForm({...bookingForm, employeeName: emp.name});
                                                      setShowEmployeeDropdown(false);
                                                      setEmployeeSearch("");
                                                  }}
                                              >
                                                  <span className="font-bold">{emp.name}</span>
                                                  <span className="text-[10px] opacity-60 uppercase font-bold bg-gray-100 px-2 py-0.5 rounded">{emp.designation || emp.role}</span>
                                              </div>
                                          ))}
                                          {employees.filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                              <div className="p-3 text-center text-xs opacity-50">No technicians found</div>
                                          )}
                                      </div>
                                  </div>
                              )}
                              {showEmployeeDropdown && <div className="fixed inset-0 z-[999]" onClick={() => setShowEmployeeDropdown(false)}></div>}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase opacity-60 mb-1">Due Date</label>
                          <input 
                              type="date"
                              value={bookingForm.dueDate}
                              onChange={e => setBookingForm({...bookingForm, dueDate: e.target.value})}
                              className="w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }}
                          />
                      </div>

                      <div className="flex gap-3 mt-6">
                          <button 
                            type="button" 
                            onClick={() => setIsBookingModalOpen(false)} 
                            className="flex-1 px-4 py-3 rounded-lg border font-bold hover:bg-gray-100 transition"
                            style={{ borderColor: themeColors.border }}
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition"
                          >
                              Assign Now
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}
