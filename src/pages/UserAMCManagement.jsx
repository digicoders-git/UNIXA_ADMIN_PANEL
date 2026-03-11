import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { FaShieldAlt, FaSearch, FaUser, FaPhone, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaEye, FaClock, FaSms } from "react-icons/fa";
import http from "../apis/http";
import Swal from "sweetalert2";

export default function UserAMCManagement() {
  const { themeColors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userAmcs, setUserAmcs] = useState([]);
  const [dueAmcs, setDueAmcs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revenue: 0, expiringSoon: 0, dueServices: 0 });

  useEffect(() => {
    fetchUserAmcs();
    fetchDueAmcs();
  }, []);

  const fetchUserAmcs = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/api/my-amcs/admin/all");
      console.log('User AMCs Response:', data);
      const amcs = data.amcs || [];
      setUserAmcs(amcs);

      // Calculate stats
      const activeCount = amcs.filter(a => {
        const isDateExpired = new Date(a.endDate) < new Date();
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        return a.status === 'Active' && !isDateExpired && !isServicesExhausted;
      }).length;

      const expiredCount = amcs.filter(a => {
        const isDateExpired = new Date(a.endDate) < new Date();
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        return a.status === 'Expired' || isDateExpired || isServicesExhausted;
      }).length;

      const expiringSoonCount = amcs.filter(a => {
        const isDateExpired = new Date(a.endDate) < new Date();
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        const daysLeft = Math.ceil((new Date(a.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        const servicesRemaining = (a.servicesTotal || 4) - (a.servicesUsed || 0);

        // Expiring soon if: date within 120 days OR only 1 service remaining
        const isDateExpiringSoon = daysLeft > 0 && daysLeft <= 120;
        const isServicesExpiringSoon = servicesRemaining === 1;

        return a.status === 'Active' && !isDateExpired && !isServicesExhausted && (isDateExpiringSoon || isServicesExpiringSoon);
      }).length;

      setStats(prev => ({
        ...prev,
        total: amcs.length,
        active: activeCount,
        expired: expiredCount,
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

  const createServiceTicket = async (amc) => {
    const { value: employeeName } = await Swal.fire({
      title: 'Assign Service Ticket',
      text: `Assigning service #${amc.nextServiceNumber} for ${amc.userId?.firstName}`,
      input: 'select',
      inputOptions: async () => {
        try {
          const { data } = await http.get('/api/employees');
          const options = {};
          data.forEach(emp => {
            if (emp.role !== 'Manager') {
              options[emp.name] = `${emp.name} (${emp.designation || emp.role})`;
            }
          });
          return options;
        } catch (error) {
          return { '': 'Failed to load employees' };
        }
      },
      inputPlaceholder: 'Select an employee',
      showCancelButton: true,
      confirmButtonText: 'Assign',
      showLoaderOnConfirm: true,
    });

    if (employeeName) {
      try {
        const adminData = JSON.parse(localStorage.getItem('admin-data') || '{}');

        // Get user's primary address
        const primaryAddress = amc.userId?.addresses?.find(addr => addr.isDefault || addr.isPrimary) || amc.userId?.addresses?.[0];
        const addressString = primaryAddress
          ? `${primaryAddress.addressLine1 || ''}, ${primaryAddress.city || ''}, ${primaryAddress.state || ''} ${primaryAddress.pincode || ''}`.trim()
          : 'N/A';

        await http.post('/api/assigned-tickets', {
          title: `AMC Service - ${amc.userId?.firstName} ${amc.userId?.lastName}`,
          ticketType: 'service_request',
          customerName: `${amc.userId?.firstName} ${amc.userId?.lastName}`,
          customerPhone: amc.userId?.phone,
          customerEmail: amc.userId?.email,
          address: addressString,
          description: `Regular AMC Service #${amc.nextServiceNumber} for ${amc.productName}.`,
          priority: 'Medium',
          status: 'Pending',
          assignedBy: adminData.name || 'Admin',
          assignedTo: employeeName,
          amcId: amc._id,
          userId: amc.userId?._id,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        Swal.fire('Success', 'Service ticket assigned successfully', 'success');
        fetchDueAmcs(); // Refresh due list
      } catch (error) {
        console.error('Error assigning ticket:', error);
        Swal.fire('Error', 'Failed to assign ticket', 'error');
      }
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
          <p class="text-sm"><strong>Customer:</strong> ${amc.userId?.firstName} ${amc.userId?.lastName}</p>
          <p class="text-sm"><strong>Product:</strong> ${amc.productName}</p>
          <div class="space-y-2 mt-4">
            <label class="block text-xs font-bold text-gray-700">Duration (Months)</label>
            <input id="renew-duration" type="number" value="12" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">Total Services</label>
            <input id="renew-services" type="number" value="${amc.servicesTotal || 4}" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">Renewal Price (Optional)</label>
            <input id="renew-price" type="number" placeholder="${amc.amcPlanPrice || 0}" class="w-full p-2 border rounded text-sm" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">Start Date</label>
            <input id="renew-start" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-2 border rounded text-sm" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirm Renewal',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        return {
          durationMonths: parseInt(document.getElementById('renew-duration').value),
          servicesTotal: parseInt(document.getElementById('renew-services').value),
          pricePaid: parseFloat(document.getElementById('renew-price').value || amc.amcPlanPrice || 0),
          startDate: document.getElementById('renew-start').value
        };
      }
    });

    if (result.isConfirmed) {
      try {
        await http.post(`/api/my-amcs/admin/renew/${amc._id}`, result.value);
        Swal.fire('Renewed!', 'AMC subscription has been renewed successfully.', 'success');
        fetchUserAmcs();
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
      const isDateExpired = new Date(amc.endDate) < new Date();
      const isServicesExhausted = (amc.servicesUsed || 0) >= (amc.servicesTotal || 4);
      const actualStatus = (isDateExpired || isServicesExhausted) ? 'Expired' : amc.status;

      const daysLeft = Math.ceil((new Date(amc.endDate) - new Date()) / (1000 * 60 * 60 * 24));
      const servicesRemaining = (amc.servicesTotal || 4) - (amc.servicesUsed || 0);

      // Expiring soon if: date within 120 days OR only 1 service remaining
      const isDateExpiringSoon = daysLeft > 0 && daysLeft <= 120;
      const isServicesExpiringSoon = servicesRemaining === 1;
      const isExpiringSoon = actualStatus === 'Active' && (isDateExpiringSoon || isServicesExpiringSoon);

      let matchesStatus = false;
      if (statusFilter === "All") {
        matchesStatus = true;
      } else if (statusFilter === "Expiring Soon") {
        matchesStatus = isExpiringSoon;
      } else {
        matchesStatus = actualStatus === statusFilter;
      }

      const matchesSearch =
        amc.productName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.amcPlanName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.userId?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.userId?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        amc.userId?.phone?.includes(search);
      return matchesStatus && matchesSearch;
    });
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Total AMCs" value={stats.total} icon={FaShieldAlt} color="text-blue-600" />
        <StatCard title="Active" value={stats.active} icon={FaCheckCircle} color="text-emerald-600" />
        <StatCard title="Expired" value={stats.expired} icon={FaTimesCircle} color="text-red-600" />
        <StatCard title="Due Service" value={stats.dueServices} icon={FaClock} color="text-orange-600" />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={FaClock} color="text-yellow-600" />
        <StatCard title="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={FaCalendarAlt} color="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          {["All", "Active", "Due for Service", "Expiring Soon", "Expired", "Cancelled"].map(status => (
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
              ) : filteredAmcs.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center opacity-50">No AMC subscriptions found</td></tr>
              ) : (
                filteredAmcs.map(amc => {
                  const daysLeft = Math.ceil((new Date(amc.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const servicesRemaining = (amc.servicesTotal || 4) - (amc.servicesUsed || 0);
                  const isDateExpiringSoon = daysLeft > 0 && daysLeft <= 30;
                  const isServicesExpiringSoon = servicesRemaining === 1;
                  const isDateExpired = new Date(amc.endDate) < new Date();
                  const isServicesExhausted = (amc.servicesUsed || 0) >= (amc.servicesTotal || 4);
                  const displayStatus = (isDateExpired || isServicesExhausted) ? 'Expired' : amc.status;

                  const isDueForService = dueAmcs.some(d => d._id === amc._id);

                  return (
                    <tr key={amc._id} className="hover:bg-black/5">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FaUser className="text-blue-600" />
                          <div>
                            <div className="font-bold">{amc.userId?.firstName} {amc.userId?.lastName}</div>
                            <div className="text-xs opacity-60 flex items-center gap-1">
                              <FaPhone size={10} /> {amc.userId?.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{amc.productName}</div>
                        <div className="text-xs opacity-60">{amc.productType || 'Product'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-blue-600">{amc.amcPlanName}</div>
                        <div className="text-xs opacity-60 text-red-500">
                          {isDueForService ? `Next Due: ${new Date(dueAmcs.find(d => d._id === amc._id).nextServiceDueDate).toLocaleDateString()}` : ''}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-green-600">₹{amc.amcPlanPrice?.toLocaleString()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs">
                          <FaCalendarAlt className="text-green-600" />
                          {new Date(amc.startDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs">
                          <FaCalendarAlt className="text-red-600" />
                          {new Date(amc.endDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${displayStatus === 'Active' ? 'bg-green-50 text-green-700' :
                          displayStatus === 'Expired' ? 'bg-red-50 text-red-700' :
                            displayStatus === 'Cancelled' ? 'bg-gray-50 text-gray-700' :
                              'bg-yellow-50 text-yellow-700'
                          }`}>
                          {displayStatus === 'Active' ? <FaCheckCircle /> : <FaTimesCircle />}
                          {displayStatus}
                        </span>
                        {(isDateExpiringSoon || isServicesExpiringSoon) && displayStatus === 'Active' && (
                          <div className="text-xs text-orange-600 font-bold mt-1 flex items-center gap-1">
                            <FaTimesCircle size={10} />
                            {isServicesExpiringSoon ? 'Last Service!' : `${daysLeft}d left`}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className={`font-bold ${servicesRemaining === 1 ? 'text-orange-600' : servicesRemaining === 0 ? 'text-red-600' : ''}`}>
                          {amc.servicesUsed || 0}/{amc.servicesTotal || 4}
                        </div>
                        <div className={`text-xs ${servicesRemaining === 1 ? 'text-orange-600 font-bold' : servicesRemaining === 0 ? 'text-red-600 font-bold' : 'opacity-60'}`}>
                          {servicesRemaining} left
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          {isDueForService && (
                            <button
                              onClick={() => createServiceTicket(amc)}
                              className="px-3 py-1 bg-orange-600 text-white rounded text-xs font-bold hover:bg-orange-700 transition"
                            >
                              Assign Service
                            </button>
                          )}
                          {(isServicesExhausted || servicesRemaining === 1 || isDateExpiringSoon || displayStatus === 'Expired') && (
                            <>
                              <button
                                onClick={() => handleNotifyUser(amc)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1 justify-center"
                              >
                                <FaSms size={10} /> Notify
                              </button>
                              {(displayStatus === 'Expired' || servicesRemaining === 0) && (
                                <button
                                  onClick={() => handleRenewAmc(amc)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 justify-center"
                                >
                                  <FaShieldAlt size={10} /> Renew AMC
                                </button>
                              )}
                            </>
                          )}
                          {!isDueForService && amc.status === 'Active' && !isServicesExhausted && servicesRemaining > 1 && !isDateExpiringSoon && (
                            <span className="text-xs opacity-40 italic">Next service later</span>
                          )}
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
    </div>
  );
}
