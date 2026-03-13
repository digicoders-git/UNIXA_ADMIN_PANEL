import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import http from "../apis/http";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaPhone,
  FaMapMarkerAlt,
  FaSync,
  FaUser,
  FaWrench,
  FaThLarge,
  FaList,
  FaEdit,
  FaCheck
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function AmcJobs() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [allAmcs, setAllAmcs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // upcoming, completed, all
  const [viewMode, setViewMode] = useState("table"); // card, table
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsRes = await http.get("/api/amc-jobs/statistics");
      setStatistics(statsRes.data);

      // Fetch upcoming jobs
      const upcomingRes = await http.get("/api/amc-jobs/upcoming-jobs");
      setUpcomingJobs(upcomingRes.data.jobs || []);

      // Fetch all AMCs
      const allRes = await http.get("/api/amc-jobs/all");
      setAllAmcs(allRes.data.amcs || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      Swal.fire("Error", "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServiceDate = async (amcId, newDate) => {
    try {
      await http.put(`/api/amc-jobs/${amcId}/next-service-date`, {
        nextServiceDueDate: newDate
      });
      Swal.fire("Success", "Service date updated", "success");
      setEditingId(null);
      fetchData();
    } catch (err) {
      Swal.fire("Error", "Failed to update service date", "error");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Expired":
        return "bg-red-100 text-red-700";
      case "Cancelled":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const getUrgencyColor = (daysUntilService) => {
    if (daysUntilService <= 0) return "bg-red-50 text-red-700 border-red-200";
    if (daysUntilService <= 3) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-green-50 text-green-700 border-green-200";
  };

  const getUrgencyBadge = (daysUntilService) => {
    if (daysUntilService <= 0) return { text: "OVERDUE", color: "bg-red-100 text-red-700" };
    if (daysUntilService <= 3) return { text: "URGENT", color: "bg-orange-100 text-orange-700" };
    return { text: "NORMAL", color: "bg-green-100 text-green-700" };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div
      className="rounded-xl p-6 flex items-center gap-4 shadow-sm border"
      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
    >
      <div className={`p-4 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase opacity-60">{label}</p>
        <p className="text-2xl font-black">{value || 0}</p>
      </div>
    </div>
  );

  const JobCard = ({ job }) => (
    <div
      className="rounded-xl p-6 border shadow-sm hover:shadow-md transition"
      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">{job.productName}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase">{job.serviceType}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          job.daysUntilService <= 0 ? "bg-red-100 text-red-700" :
          job.daysUntilService <= 3 ? "bg-orange-100 text-orange-700" :
          "bg-green-100 text-green-700"
        }`}>
          {job.daysUntilService <= 0 ? "OVERDUE" : `${job.daysUntilService} days`}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <FaUser size={14} className="text-blue-500" />
          <span className="font-bold">{job.customer?.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FaPhone size={14} className="text-green-500" />
          <span>{job.customer?.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FaMapMarkerAlt size={14} className="text-red-500" />
          <span className="text-xs">{job.customer?.address?.addressLine1 || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FaCalendarAlt size={14} className="text-purple-500" />
          <span>Due: {formatDate(job.nextServiceDueDate)}</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Service Progress</p>
        <div className="flex items-center justify-between">
          <div className="flex-1 bg-slate-200 rounded-full h-2 mr-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(job.servicesUsed / job.servicesTotal) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs font-bold">{job.servicesUsed}/{job.servicesTotal}</span>
        </div>
      </div>

      <button
        onClick={() => Swal.fire("Info", `Service scheduled for ${formatDate(job.nextServiceDueDate)}`, "info")}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
      >
        View Details
      </button>
    </div>
  );

  const JobTable = ({ jobs }) => (
    <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Service Type</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Days Left</th>
              <th className="p-4">Progress</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center opacity-50">No jobs found</td>
              </tr>
            ) : (
              jobs.map(job => {
                const urgency = getUrgencyBadge(job.daysUntilService);
                return (
                  <tr key={job._id} className="hover:bg-black/5 transition">
                    <td className="p-4 font-bold">{job.productName}</td>
                    <td className="p-4">
                      <div className="font-bold">{job.customer?.name}</div>
                      <div className="text-xs opacity-60">{job.customer?.email}</div>
                    </td>
                    <td className="p-4 text-xs">{job.customer?.phone}</td>
                    <td className="p-4 text-xs font-medium">{job.serviceType}</td>
                    <td className="p-4 font-bold">{formatDate(job.nextServiceDueDate)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        job.daysUntilService <= 0 ? "bg-red-100 text-red-700" :
                        job.daysUntilService <= 3 ? "bg-orange-100 text-orange-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {job.daysUntilService <= 0 ? "OVERDUE" : `${job.daysUntilService}d`}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(job.servicesUsed / job.servicesTotal) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold">{job.servicesUsed}/{job.servicesTotal}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${urgency.color}`}>
                        {urgency.text}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setEditingId(job._id);
                          setEditDate(new Date(job.nextServiceDueDate).toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition"
                      >
                        <FaEdit size={12} className="inline mr-1" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const AmcCard = ({ amc }) => (
    <div
      className="rounded-xl p-6 border shadow-sm"
      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">{amc.productName}</h3>
          <p className="text-xs font-bold text-slate-400">{amc.amcPlanName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(amc.status)}`}>
          {amc.status}
        </span>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-slate-600">Duration:</span>
          <span className="font-bold">{amc.durationMonths} months</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Start Date:</span>
          <span className="font-bold">{formatDate(amc.startDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">End Date:</span>
          <span className="font-bold">{formatDate(amc.endDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Services:</span>
          <span className="font-bold">{amc.servicesUsed}/{amc.servicesTotal}</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Customer</p>
        <p className="text-sm font-bold">{amc.customer?.name}</p>
        <p className="text-xs text-slate-600">{amc.customer?.phone}</p>
      </div>
    </div>
  );

  const AmcTable = ({ amcs }) => (
    <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-xs uppercase opacity-70 border-b" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Start Date</th>
              <th className="p-4">End Date</th>
              <th className="p-4">Services</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
            {amcs.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center opacity-50">No AMCs found</td>
              </tr>
            ) : (
              amcs.map(amc => (
                <tr key={amc._id} className="hover:bg-black/5 transition">
                  <td className="p-4 font-bold">{amc.productName}</td>
                  <td className="p-4 text-xs">{amc.amcPlanName}</td>
                  <td className="p-4">
                    <div className="font-bold">{amc.customer?.name}</div>
                    <div className="text-xs opacity-60">{amc.customer?.phone}</div>
                  </td>
                  <td className="p-4 font-bold">{amc.durationMonths}m</td>
                  <td className="p-4 text-xs">{formatDate(amc.startDate)}</td>
                  <td className="p-4 text-xs">{formatDate(amc.endDate)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(amc.servicesUsed / amc.servicesTotal) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold">{amc.servicesUsed}/{amc.servicesTotal}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(amc.status)}`}>
                      {amc.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Edit Modal
  const EditModal = ({ jobId, currentDate, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="rounded-xl shadow-xl max-w-md w-full p-6"
        style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
      >
        <h2 className="text-xl font-bold mb-4">Update Service Date</h2>
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleUpdateServiceDate(jobId, editDate);
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaWrench className="text-blue-600" /> AMC Service Jobs
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("card")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
              viewMode === "card"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <FaThLarge /> Card
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
              viewMode === "table"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <FaList /> Table
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition"
            style={{ color: themeColors.text }}
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FaCheckCircle}
            label="Active AMCs"
            value={statistics.totalActive}
            color="bg-green-500"
          />
          <StatCard
            icon={FaClock}
            label="Upcoming Services"
            value={statistics.upcomingServices}
            color="bg-blue-500"
          />
          <StatCard
            icon={FaExclamationCircle}
            label="Overdue Services"
            value={statistics.overdueServices}
            color="bg-red-500"
          />
          <StatCard
            icon={FaCalendarAlt}
            label="Expired AMCs"
            value={statistics.totalExpired}
            color="bg-gray-500"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {[
          { id: "upcoming", label: "Upcoming Services", icon: FaClock },
          { id: "completed", label: "Completed Services", icon: FaCheckCircle },
          { id: "all", label: "All AMCs", icon: FaWrench }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center animate-pulse">Loading...</div>
      ) : (
        <>
          {activeTab === "upcoming" && (
            <div className="space-y-4">
              {viewMode === "card" ? (
                upcomingJobs.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingJobs.map(job => (
                      <JobCard key={job._id} job={job} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl text-slate-400">
                    No upcoming services scheduled.
                  </div>
                )
              ) : (
                <JobTable jobs={upcomingJobs} />
              )}
            </div>
          )}

          {activeTab === "completed" && (
            <div className="space-y-4">
              {viewMode === "card" ? (
                allAmcs.filter(a => a.servicesUsed >= a.servicesTotal).length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allAmcs
                      .filter(a => a.servicesUsed >= a.servicesTotal)
                      .map(amc => (
                        <AmcCard key={amc._id} amc={amc} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl text-slate-400">
                    No completed services.
                  </div>
                )
              ) : (
                <AmcTable amcs={allAmcs.filter(a => a.servicesUsed >= a.servicesTotal)} />
              )}
            </div>
          )}

          {activeTab === "all" && (
            <div className="space-y-4">
              {viewMode === "card" ? (
                allAmcs.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allAmcs.map(amc => (
                      <AmcCard key={amc._id} amc={amc} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl text-slate-400">
                    No AMCs found.
                  </div>
                )
              ) : (
                <AmcTable amcs={allAmcs} />
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingId && (
        <EditModal
          jobId={editingId}
          currentDate={editDate}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
