import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { FaArrowLeft, FaUser, FaPhone, FaShieldAlt, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaBox, FaSync, FaTools } from "react-icons/fa";
import http from "../apis/http";
import Swal from "sweetalert2";

export default function UserAMCHistory() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();
  const { phone } = useParams();

  const [user, setUser] = useState(null);
  const [amcs, setAmcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAMCHistory();
  }, [phone]);

  const fetchUserAMCHistory = async () => {
    try {
      setLoading(true);
      const { data } = await http.get(`/api/my-amcs/admin/user/${phone}`);
      setUser(data.user);
      setAmcs(data.amcs || []);
    } catch (error) {
      console.error("Error fetching user AMC history:", error);
      Swal.fire("Error", "Failed to load user AMC history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = async (amc) => {
    // Check eligibility
    const startDate = new Date(amc.startDate);
    const now = new Date();
    const monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());

    if (monthsElapsed < 4) {
      Swal.fire('Not Eligible', `This AMC is only ${monthsElapsed} months old. Service can be booked after 4 months.`, 'info');
      return;
    }

    // Show ticket assignment form
    // Show ticket assignment form with searchable dropdown
    const { value: employeeName } = await Swal.fire({
      title: 'Assign Service Ticket',
      html: `
        <div class="text-left">
          <p class="text-sm mb-2 opacity-70">Assigning service for <b>${user.firstName} ${user.lastName}</b> - ${amc.productName}</p>
          <div class="relative">
            <input 
              id="swal-tech-search" 
              type="text" 
              placeholder="Search technician..." 
              class="w-full p-2 border rounded-lg mb-2"
              autocomplete="off"
            />
            <div id="swal-tech-list" class="max-h-48 overflow-y-auto border rounded-lg bg-white">
              <div class="p-4 text-center text-xs opacity-50">Loading employees...</div>
            </div>
          </div>
        </div>
      `,
      didOpen: () => {
        const input = document.getElementById('swal-tech-search');
        const listContainer = document.getElementById('swal-tech-list');
        let employees = [];

        const renderList = (filter = '') => {
          const filtered = employees.filter(emp => 
            emp.role !== 'Manager' && 
            (emp.name.toLowerCase().includes(filter.toLowerCase()) || 
             (emp.designation || emp.role).toLowerCase().includes(filter.toLowerCase()))
          );

          if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="p-4 text-center text-xs opacity-50">No technician found</div>';
            return;
          }

          listContainer.innerHTML = filtered.map(emp => `
            <div class="p-2 hover:bg-black/5 cursor-pointer border-b last:border-0 tech-item" data-name="${emp.name}">
              <div class="font-bold text-sm text-gray-800">${emp.name}</div>
              <div class="text-[10px] opacity-60 uppercase font-bold">${emp.designation || emp.role}</div>
            </div>
          `).join('');

          // Add click listeners
          document.querySelectorAll('.tech-item').forEach(item => {
            item.onclick = () => {
              input.value = item.dataset.name;
              Swal.clickConfirm();
            };
          });
        };

        // Initial fetch
        http.get('/api/employees').then(({ data }) => {
          employees = data || [];
          renderList();
        }).catch(() => {
          listContainer.innerHTML = '<div class="p-4 text-center text-red-500 text-xs">Failed to load employees</div>';
        });

        // Search listener
        input.oninput = (e) => renderList(e.target.value);
      },
      showCancelButton: true,
      confirmButtonText: 'Assign',
      preConfirm: () => {
        const name = document.getElementById('swal-tech-search').value;
        if (!name) return Swal.showValidationMessage('Please select a technician');
        return name;
      }
    });

    if (employeeName) {
      try {
        const adminData = JSON.parse(localStorage.getItem('admin-data') || '{}');
        const primaryAddress = user.addresses?.find(addr => addr.isDefault || addr.isPrimary) || user.addresses?.[0];
        const addressString = primaryAddress
          ? `${primaryAddress.addressLine1 || ''}, ${primaryAddress.city || ''}, ${primaryAddress.state || ''} ${primaryAddress.pincode || ''}`.trim()
          : 'N/A';

        await http.post('/api/assigned-tickets', {
          title: `AMC Service - ${user.firstName} ${user.lastName}`,
          ticketType: 'service_request',
          customerName: `${user.firstName} ${user.lastName}`,
          customerPhone: user.phone,
          customerEmail: user.email,
          address: addressString,
          description: `AMC Service for ${amc.productName} (${amc.amcPlanName}).`,
          priority: 'Medium',
          status: 'Pending',
          assignedBy: adminData.name || 'Admin',
          assignedTo: employeeName,
          amcId: amc._id,
          userId: user._id,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        Swal.fire('Success', 'Service ticket assigned successfully', 'success');
        fetchUserAMCHistory(); // Refresh history
      } catch (error) {
        console.error('Error assigning ticket:', error);
        Swal.fire('Error', 'Failed to assign ticket', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg font-bold mb-4">User not found</p>
          <button
            onClick={() => navigate("/user-amc")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-50 p-6 border-b shadow-lg"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/user-amc")}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FaArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FaUser className="text-purple-500" />
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-xs opacity-60 mt-1">AMC & Product History</p>
            </div>
          </div>
          <button
            onClick={fetchUserAMCHistory}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 hover:bg-opacity-80 transition"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* User Info */}
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: themeColors.background + "50", borderColor: themeColors.border }}
        >
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <FaUser size={14} /> User Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="opacity-60 text-xs">Name</p>
              <p className="font-bold">{user.firstName} {user.lastName}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs">Phone</p>
              <p className="font-bold flex items-center gap-1">
                <FaPhone size={12} /> {user.phone}
              </p>
            </div>
            <div>
              <p className="opacity-60 text-xs">Email</p>
              <p className="font-bold text-xs">{user.email || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* AMCs & Products */}
        <div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FaShieldAlt className="text-green-600" /> AMCs & Products ({amcs.length})
          </h3>

          {amcs.length === 0 ? (
            <div
              className="p-8 rounded-lg text-center opacity-60"
              style={{ backgroundColor: themeColors.background + "50" }}
            >
              No AMCs found for this user
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[11px] uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background + "50" }}>
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">AMC Plan</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Start Date</th>
                      <th className="p-4">End Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Services</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                    {amcs.map((amc, idx) => {
                      const now = new Date();
                      const endDate = new Date(amc.endDate);
                      const isExpired = endDate < now;
                      const servicesRemaining = (amc.servicesTotal || 4) - (amc.servicesUsed || 0);

                      return (
                        <tr key={idx} className="hover:bg-black/5 transition-colors">
                          <td className="p-4 font-bold">{amc.productName}</td>
                          <td className="p-4 font-bold text-blue-600">{amc.amcPlanName}</td>
                          <td className="p-4 font-bold text-green-600">₹{amc.amcPlanPrice?.toLocaleString()}</td>
                          <td className="p-4">{amc.durationMonths} Months</td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <FaCalendarAlt className="text-green-500" size={12} />
                              {new Date(amc.startDate).toLocaleDateString("en-IN")}
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <FaCalendarAlt className="text-red-500" size={12} />
                              {new Date(amc.endDate).toLocaleDateString("en-IN")}
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                                amc.status === "Active" && !isExpired
                                  ? "bg-green-100 text-green-700"
                                  : amc.status === "Expired" || isExpired
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {isExpired ? "Expired" : amc.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-bold">
                              {amc.servicesUsed || 0} / {amc.servicesTotal || 4}
                            </div>
                            <div className="text-[10px] opacity-60">Visits</div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleBookService(amc)}
                              disabled={amc.status !== 'Active' || isExpired || servicesRemaining === 0}
                              className={`p-2 rounded-lg transition ${
                                amc.status !== 'Active' || isExpired || servicesRemaining === 0
                                  ? 'text-gray-300'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title="Book Service"
                            >
                              <FaTools size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
