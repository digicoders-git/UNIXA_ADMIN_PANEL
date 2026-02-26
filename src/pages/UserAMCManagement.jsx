import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { FaShieldAlt, FaSearch, FaUser, FaPhone, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaEye } from "react-icons/fa";
import http from "../apis/http";
import Swal from "sweetalert2";

export default function UserAMCManagement() {
  const { themeColors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userAmcs, setUserAmcs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revenue: 0 });

  useEffect(() => {
    fetchUserAmcs();
  }, []);

  const fetchUserAmcs = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/api/my-amcs/admin/all");
      console.log('User AMCs Response:', data);
      const amcs = data.amcs || [];
      setUserAmcs(amcs);

      // Calculate stats
      const expiredCount = amcs.filter(a => {
        const isDateExpired = new Date(a.endDate) < new Date();
        const isServicesExhausted = (a.servicesUsed || 0) >= (a.servicesTotal || 4);
        return a.status === 'Expired' || isDateExpired || isServicesExhausted;
      }).length;

      setStats({
        total: amcs.length,
        active: amcs.filter(a => a.status === 'Active').length,
        expired: expiredCount,
        revenue: amcs.reduce((sum, a) => sum + (a.amcPlanPrice || 0), 0)
      });
    } catch (err) {
      console.error("Error fetching user AMCs:", err);
      Swal.fire("Error", "Failed to load AMC data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredAmcs = userAmcs.filter(amc => {
    const matchesStatus = statusFilter === "All" || amc.status === statusFilter;
    const matchesSearch =
      amc.productName?.toLowerCase().includes(search.toLowerCase()) ||
      amc.amcPlanName?.toLowerCase().includes(search.toLowerCase()) ||
      amc.userId?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      amc.userId?.phone?.includes(search);
    return matchesStatus && matchesSearch;
  });

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total AMCs" value={stats.total} icon={FaShieldAlt} color="text-blue-600" />
        <StatCard title="Active" value={stats.active} icon={FaCheckCircle} color="text-green-600" />
        <StatCard title="Expired" value={stats.expired} icon={FaTimesCircle} color="text-red-600" />
        <StatCard title="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={FaCalendarAlt} color="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          {["All", "Active", "Expired", "Cancelled"].map(status => (
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
                <th className="p-4">Duration</th>
                <th className="p-4">Start Date</th>
                <th className="p-4">End Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Services</th>
                <th className="p-4">Days Left</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr><td colSpan="10" className="p-8 text-center">Loading...</td></tr>
              ) : filteredAmcs.length === 0 ? (
                <tr><td colSpan="10" className="p-8 text-center opacity-50">No AMC subscriptions found</td></tr>
              ) : (
                filteredAmcs.map(amc => {
                  const daysLeft = Math.ceil((new Date(amc.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;

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
                        <div className="text-xs opacity-60">{amc.durationMonths || 12} months</div>
                      </td>
                      <td className="p-4 font-bold text-green-600">₹{amc.amcPlanPrice?.toLocaleString()}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">
                          {amc.durationMonths || 12}M
                        </span>
                      </td>
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
                        <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${amc.status === 'Active' ? 'bg-green-50 text-green-700' :
                            amc.status === 'Expired' ? 'bg-red-50 text-red-700' :
                              amc.status === 'Cancelled' ? 'bg-gray-50 text-gray-700' :
                                'bg-yellow-50 text-yellow-700'
                          }`}>
                          {amc.status === 'Active' ? <FaCheckCircle /> : <FaTimesCircle />}
                          {amc.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{amc.servicesUsed || 0}/{amc.servicesTotal || 4}</div>
                        <div className="text-xs opacity-60">{(amc.servicesTotal || 4) - (amc.servicesUsed || 0)} left</div>
                      </td>
                      <td className="p-4">
                        {amc.status === 'Active' ? (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${isExpiringSoon ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                            {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                          </span>
                        ) : (
                          <span className="text-xs opacity-50">-</span>
                        )}
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
