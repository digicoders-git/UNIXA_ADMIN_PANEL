import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getAMCDashboard, renewAMC, getCustomers } from "../apis/customers";
import { createAmcPlan, listAmcPlans } from "../apis/amcPlans";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  FaShieldAlt,
  FaSearch,
  FaSyncAlt,
  FaFileContract,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaRupeeSign,
  FaCalendarAlt,
  FaPlus,
  FaEye,
  FaUserCog,
  FaChartPie
} from "react-icons/fa";
import Swal from "sweetalert2";
import http from "../apis/http";

export default function AMCManagement() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, customers: [], productStats: [] });
  const [amcPlans, setAmcPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  
  // Modals
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Forms controls
  const [renewForm, setRenewForm] = useState({});
  const [createForm, setCreateForm] = useState({
      planName: "Gold Plan",
      planType: "Gold",
      amcType: "Paid",
      durationMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      amount: "",
      servicesTotal: 3,
      partsIncluded: false,
      notes: ""
  });
  
  // Customer Search for Create Modal
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);

  useEffect(() => {
    fetchAmcPlans();
  }, [filterType, search]); // Re-fetch on filter change if backend handles it well, or client side logic

  // Debounced search for customers in Create Modal
  useEffect(() => {
      if(isCreateModalOpen && customerSearch.length > 2) {
          const timer = setTimeout(async ()=> {
              const res = await getCustomers(customerSearch);
              setCustomerOptions(res || []);
          }, 500);
          return () => clearTimeout(timer);
      }
  }, [customerSearch, isCreateModalOpen]);

  // Load all customers when modal opens
  useEffect(() => {
      if(isCreateModalOpen) {
          getCustomers("").then(res => setAllCustomers(res || []));
      }
  }, [isCreateModalOpen]);

  const fetchData = async () => {
    // This function is kept for customer AMC data if needed in future
    // Currently not used as we're showing AMC Plans instead
  };

  const fetchAmcPlans = async () => {
    setLoading(true);
    try {
      const plans = await listAmcPlans();
      console.log('Fetched AMC Plans:', plans);
      let filteredPlans = plans || [];
      
      // Apply filters
      if (filterType === 'Active') {
        filteredPlans = filteredPlans.filter(p => p.isActive);
      } else if (filterType === 'Inactive') {
        filteredPlans = filteredPlans.filter(p => !p.isActive);
      } else if (filterType === 'Free') {
        filteredPlans = filteredPlans.filter(p => p.amcType === 'Free');
      } else if (filterType === 'Paid') {
        filteredPlans = filteredPlans.filter(p => p.amcType === 'Paid');
      }
      
      // Apply search
      if (search) {
        filteredPlans = filteredPlans.filter(p => 
          p.name?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      setAmcPlans(filteredPlans);
      
      // Calculate stats from all plans (not filtered)
      const allPlans = plans || [];
      const stats = {
        total: allPlans.length,
        active: allPlans.filter(p => p.isActive).length,
        inactive: allPlans.filter(p => !p.isActive).length,
        revenue: allPlans.reduce((sum, p) => sum + (p.price || 0), 0)
      };
      
      console.log('Calculated Stats:', stats);
      setData(prev => ({ ...prev, stats }));
    } catch (err) {
      console.error('Error fetching AMC plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const openRenewModal = (customer) => {
    setSelectedCustomer(customer);
    setRenewForm({
      planName: customer.amcDetails.planName || "Gold Plan",
      planType: customer.amcDetails.planType || "Gold",
      startDate: new Date().toISOString().split("T")[0], 
      durationMonths: 12,
      amount: customer.amcDetails.amount || "", 
      amountPaid: "",
      paymentStatus: "Pending",
      paymentMode: "Cash",
      servicesTotal: 3,
      partsIncluded: false
    });
    setIsRenewModalOpen(true);
  };

  const openViewModal = (customer) => {
      setSelectedCustomer(customer);
      setIsViewModalOpen(true);
  };

  const handleEditPlan = (plan) => {
    // TODO: Implement edit functionality
    Swal.fire("Info", "Edit functionality coming soon", "info");
  };

  const handleDeletePlan = async (planId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await http.delete(`/api/amc-plans/${planId}`);
        Swal.fire('Deleted!', 'AMC Plan has been deleted.', 'success');
        fetchAmcPlans();
      } catch (err) {
        Swal.fire('Error', 'Failed to delete plan', 'error');
      }
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await renewAMC(selectedCustomer._id, renewForm);
      Swal.fire("Success", "AMC Renewed Successfully", "success");
      setIsRenewModalOpen(false);
      fetchAmcPlans();
    } catch (err) {
      Swal.fire("Error", "Failed to renew AMC", "error");
    }
  };

  const handleCreateSubmit = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              name: createForm.planName,
              amcType: createForm.amcType,
              price: createForm.amount,
              durationMonths: createForm.durationMonths,
              servicesIncluded: createForm.servicesTotal,
              partsIncluded: createForm.partsIncluded,
              features: createForm.notes ? [createForm.notes] : [],
              isActive: true
          };
          await createAmcPlan(payload);
          Swal.fire("Success", "New AMC Plan Created", "success");
          setIsCreateModalOpen(false);
          fetchAmcPlans();
          setCreateForm({
                planName: "Gold Plan",
                planType: "Gold",
                amcType: "Paid",
                durationMonths: 12,
                startDate: new Date().toISOString().split('T')[0],
                amount: "",
                servicesTotal: 3,
                partsIncluded: false,
                notes: ""
          }); 
      } catch(err) {
          Swal.fire("Error", err.response?.data?.message || "Failed to create AMC Plan", "error");
      }
  };

  const StatCard = ({ title, value, icon: Icon, color, bg }) => (
    <div
      className="p-6 rounded-xl border flex items-center justify-between shadow-sm transition hover:shadow-md"
      style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
    >
      <div>
        <p className="text-sm opacity-70 mb-1" style={{ color: themeColors.text }}>{title}</p>
        <h3 className="text-2xl font-bold" style={{ color: themeColors.text }}>{value}</h3>
      </div>
      <div className={`p-4 rounded-full ${bg} ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  );

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaShieldAlt className="text-green-600" /> AMC Management
        </h1>
        <button 
            onClick={()=>setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md"
        >
            <FaPlus /> Create New AMC
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Plans"
          value={data.stats.total || 0}
          icon={FaFileContract}
          color="text-blue-600"
          bg="bg-blue-100 dark:bg-blue-900/20"
        />
        <StatCard
          title="Active Plans"
          value={data.stats.active || 0}
          icon={FaCheckCircle}
          color="text-green-600"
          bg="bg-green-100 dark:bg-green-900/20"
        />
        <StatCard
          title="Inactive Plans"
          value={data.stats.inactive || 0}
          icon={FaExclamationCircle}
          color="text-red-600"
          bg="bg-red-100 dark:bg-red-900/20"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${data.stats.revenue?.toLocaleString() || 0}`}
          icon={FaRupeeSign}
          color="text-purple-600"
          bg="bg-purple-100 dark:bg-purple-900/20"
        />
      </div>

      {/* Charts Section - AMC Plans Distribution */}
      {!loading && amcPlans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AMC Type Distribution */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaChartPie className="text-blue-600" /> AMC Type Distribution
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'pie', backgroundColor: 'transparent', height: 300 },
                title: { text: '' },
                credits: { enabled: false },
                plotOptions: {
                  pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                      enabled: true,
                      format: '<b>{point.name}</b>: {point.y}'
                    }
                  }
                },
                series: [{
                  name: 'Plans',
                  colorByPoint: true,
                  data: [
                    { name: 'Paid', y: amcPlans.filter(p => p.amcType === 'Paid').length, color: '#3b82f6' },
                    { name: 'Free', y: amcPlans.filter(p => p.amcType === 'Free').length, color: '#10b981' }
                  ]
                }]
              }}
            />
          </div>

          {/* Plans Status Overview */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaShieldAlt className="text-green-600" /> Plans Status Overview
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'column', backgroundColor: 'transparent', height: 300 },
                title: { text: '' },
                credits: { enabled: false },
                xAxis: {
                  categories: ['Active', 'Inactive'],
                  labels: { style: { color: themeColors.text } }
                },
                yAxis: {
                  min: 0,
                  title: { text: 'Count', style: { color: themeColors.text } },
                  labels: { style: { color: themeColors.text } }
                },
                legend: { enabled: false },
                series: [{
                  name: 'Plans',
                  data: [
                    { y: amcPlans.filter(p => p.isActive).length, color: '#10b981' },
                    { y: amcPlans.filter(p => !p.isActive).length, color: '#ef4444' }
                  ]
                }]
              }}
            />
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div 
            className="flex gap-2 p-1 rounded-lg border overflow-x-auto max-w-full" 
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          {["All", "Active", "Inactive", "Free", "Paid"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 text-sm rounded-md transition font-medium whitespace-nowrap`}
              style={{
                  backgroundColor: filterType === type ? themeColors.background : 'transparent',
                  color: filterType === type ? themeColors.primary : themeColors.text,
                  opacity: filterType === type ? 1 : 0.6
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-auto">
          <FaSearch className="absolute left-3 top-3 opacity-50" style={{ color: themeColors.text }} />
          <input
            type="text"
            placeholder="Search plan name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            style={{ 
                backgroundColor: themeColors.surface, 
                borderColor: themeColors.border, 
                color: themeColors.text 
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead 
                style={{ backgroundColor: themeColors.background, color: themeColors.text }} 
                className="text-xs uppercase opacity-70 border-b"
            >
              <tr>
                <th className="p-4">Plan Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Price</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Services</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center animate-pulse" style={{ color: themeColors.text }}>
                    Loading AMC Plans...
                  </td>
                </tr>
              ) : amcPlans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center opacity-50" style={{ color: themeColors.text }}>
                    No AMC plans found.
                  </td>
                </tr>
              ) : (
                amcPlans.map((plan) => (
                  <tr 
                    key={plan._id} 
                    className="transition hover:bg-black/5"
                    style={{ color: themeColors.text }}
                  >
                    <td className="p-4">
                      <div className="font-bold">{plan.name}</div>
                      {plan.isPopular && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-1 inline-block">Popular</span>}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${plan.amcType === 'Free' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                        {plan.amcType || 'Paid'}
                      </span>
                    </td>
                    <td className="p-4 font-bold">₹{plan.price}</td>
                    <td className="p-4">{plan.durationMonths} Months</td>
                    <td className="p-4 font-semibold">{plan.servicesIncluded || 0}</td>
                    <td className="p-4">
                      {plan.isActive ? 
                        <span className="px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-bold">Active</span> : 
                        <span className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-bold">Inactive</span>
                      }
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditPlan(plan)}
                          className="p-2 hover:bg-blue-50 rounded text-blue-600 transition" 
                          title="Edit Plan"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan._id)}
                          className="p-2 hover:bg-red-50 rounded text-red-600 transition" 
                          title="Delete Plan"
                        >
                          <FaTimesCircle />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {isViewModalOpen && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                className="rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0 border"
                style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
              >
                  <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
                      <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                              {selectedCustomer.amcDetails.planName}
                              <span className={`px-2 py-0.5 rounded text-xs border ${
                                  selectedCustomer.amcDetails.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                  {selectedCustomer.amcDetails.status}
                              </span>
                          </h2>
                          <div className="text-sm opacity-60">AMC ID: {selectedCustomer.amcDetails.amcId}</div>
                      </div>
                      <button onClick={()=>setIsViewModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full"><FaTimesCircle size={24} className="opacity-50 hover:opacity-100" /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* Customer Info Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 rounded-lg border bg-opacity-50" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                              <h3 className="font-semibold mb-3 flex items-center gap-2 border-b pb-2 opacity-80" style={{ borderColor: themeColors.border }}>
                                  <FaUserCog /> Customer Details
                              </h3>
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                      <span className="opacity-60">Name:</span>
                                      <span className="font-medium">{selectedCustomer.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="opacity-60">Mobile:</span>
                                      <span className="font-medium">{selectedCustomer.mobile}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="opacity-60">City/Area:</span>
                                      <span className="font-medium text-right">{selectedCustomer.address?.area}, {selectedCustomer.address?.city}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="p-4 rounded-lg border bg-opacity-50" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                              <h3 className="font-semibold mb-3 flex items-center gap-2 border-b pb-2 opacity-80" style={{ borderColor: themeColors.border }}>
                                  <FaShieldAlt /> Plan & Financials
                              </h3>
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                      <span className="opacity-60">Plan Type:</span>
                                      <span className="font-medium">{selectedCustomer.amcDetails.planType}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="opacity-60">Duration:</span>
                                      <span className="font-medium">{selectedCustomer.amcDetails.durationMonths} Months</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="opacity-60">Valid From:</span>
                                      <span className="font-medium">{new Date(selectedCustomer.amcDetails.startDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="opacity-60">Valid To:</span>
                                      <span className="font-medium">{new Date(selectedCustomer.amcDetails.endDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t mt-2" style={{ borderColor: themeColors.border }}>
                                      <span className="opacity-60">Amount:</span>
                                      <span className="font-bold">₹{selectedCustomer.amcDetails.amount}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Service Usage Section */}
                      <div>
                          <h3 className="font-semibold mb-3 opacity-90">Service Progress</h3>
                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                             <div 
                                className="bg-blue-600 h-full transition-all duration-500" 
                                style={{ width: `${(selectedCustomer.amcDetails.servicesUsed / selectedCustomer.amcDetails.servicesTotal) * 100}%` }}
                             ></div>
                          </div>
                          <div className="flex justify-between text-sm opacity-70">
                              <span>Used: {selectedCustomer.amcDetails.servicesUsed} Services</span>
                              <span>Total Allowed: {selectedCustomer.amcDetails.servicesTotal} Services</span>
                          </div>
                      </div>

                     {/* History Section */}
                     {selectedCustomer.amcHistory && selectedCustomer.amcHistory.length > 0 && (
                         <div className="mt-4">
                             <h3 className="font-semibold mb-3 opacity-90 border-b pb-1" style={{ borderColor: themeColors.border }}>AMC History</h3>
                             <div className="space-y-2">
                                 {selectedCustomer.amcHistory.map((hist, idx) => (
                                     <div key={idx} className="flex justify-between items-center p-3 rounded border text-sm opacity-80" style={{ borderColor: themeColors.border }}>
                                         <div>
                                             <div className="font-medium">{hist.planName}</div>
                                             <div className="text-xs opacity-60">{new Date(hist.startDate).toLocaleDateString()} - {new Date(hist.endDate).toLocaleDateString()}</div>
                                         </div>
                                         <span className="px-2 py-1 bg-gray-100 rounded text-xs dark:bg-gray-700">{hist.status}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}

                      <div className="flex justify-end pt-4 gap-2">
                          <button 
                            onClick={()=>setIsViewModalOpen(false)} 
                            className="px-4 py-2 rounded border bg-transparent hover:bg-black/5 transition"
                            style={{ borderColor: themeColors.border, color: themeColors.text }}
                          >
                            Close
                          </button>
                          <button 
                            onClick={()=>{
                                setIsViewModalOpen(false);
                                openRenewModal(selectedCustomer);
                            }}
                            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center gap-2"
                          >
                              <FaSyncAlt size={12} /> Renew Plan
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Renew Modal */}
      {isRenewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
                style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
              >
                  <h2 className="text-xl font-bold mb-4 border-b pb-2" style={{ borderColor: themeColors.border }}>Renew AMC Contract</h2>
                  <form onSubmit={handleRenewSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Plan Name</label>
                           <input 
                                type="text" 
                                value={renewForm.planName} 
                                onChange={e=>setRenewForm({...renewForm, planName: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Plan Type</label>
                           <select 
                                value={renewForm.planType} 
                                onChange={e=>setRenewForm({...renewForm, planType: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           >
                               <option>Silver</option>
                               <option>Gold</option>
                               <option>Platinum</option>
                           </select>
                        </div>
                        <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Start Date</label>
                              <input 
                                    type="date" 
                                    value={renewForm.startDate} 
                                    onChange={e=>setRenewForm({...renewForm, startDate: e.target.value})} 
                                    className="w-full p-2 rounded border"
                                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                                    required 
                              />
                        </div>
                        <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Duration (Months)</label>
                              <select 
                                    value={renewForm.durationMonths} 
                                    onChange={e=>setRenewForm({...renewForm, durationMonths: e.target.value})} 
                                    className="w-full p-2 rounded border"
                                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                              >
                                  <option value={6}>6 Months</option>
                                  <option value={12}>1 Year</option>
                                  <option value={24}>2 Years</option>
                                  <option value={36}>3 Years</option>
                              </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Total AMC Cost</label>
                            <input 
                                type="number" 
                                value={renewForm.amount} 
                                onChange={e=>setRenewForm({...renewForm, amount: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Amount Paid Now</label>
                            <input 
                                type="number" 
                                value={renewForm.amountPaid} 
                                onChange={e=>setRenewForm({...renewForm, amountPaid: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Services Included</label>
                            <input 
                                type="number" 
                                value={renewForm.servicesTotal} 
                                onChange={e=>setRenewForm({...renewForm, servicesTotal: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input 
                                type="checkbox" 
                                checked={renewForm.partsIncluded} 
                                onChange={e=>setRenewForm({...renewForm, partsIncluded: e.target.checked})} 
                                id="partsRenew" 
                                className="rounded w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor="partsRenew" className="text-sm font-medium cursor-pointer" style={{ color: themeColors.text }}>Include Free Parts?</label>
                        </div>
                     </div>
                      
                      <div className="flex justify-end gap-2 mt-6 border-t pt-4" style={{ borderColor: themeColors.border }}>
                          <button type="button" onClick={()=>setIsRenewModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
                          <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Confirm Renewal</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Create AMC Modal */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
                style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
              >
                  <h2 className="text-xl font-bold mb-4 border-b pb-2" style={{ borderColor: themeColors.border }}>Create New AMC</h2>
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Plan Name</label>
                           <input 
                                type="text" 
                                value={createForm.planName} 
                                onChange={e=>setCreateForm({...createForm, planName: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                                placeholder="e.g. Gold Plan" 
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>AMC Type</label>
                           <select 
                                value={createForm.amcType} 
                                onChange={e=>setCreateForm({...createForm, amcType: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           >
                               <option value="Paid">Paid</option>
                               <option value="Free">Free</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Plan Type</label>
                           <select 
                                value={createForm.planType} 
                                onChange={e=>setCreateForm({...createForm, planType: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           >
                               <option>Silver</option>
                               <option>Gold</option>
                               <option>Platinum</option>
                           </select>
                        </div>
                        <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Start Date</label>
                              <input 
                                    type="date" 
                                    value={createForm.startDate} 
                                    onChange={e=>setCreateForm({...createForm, startDate: e.target.value})} 
                                    className="w-full p-2 rounded border"
                                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                                    required 
                              />
                        </div>
                        <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Duration (Months)</label>
                              <select 
                                    value={createForm.durationMonths} 
                                    onChange={e=>setCreateForm({...createForm, durationMonths: e.target.value})} 
                                    className="w-full p-2 rounded border"
                                    style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                              >
                                  <option value={6}>6 Months</option>
                                  <option value={12}>1 Year</option>
                                  <option value={24}>2 Years</option>
                                  <option value={36}>3 Years</option>
                              </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Total AMC Cost</label>
                            <input 
                                type="number" 
                                value={createForm.amount} 
                                onChange={e=>setCreateForm({...createForm, amount: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Services Included</label>
                            <input 
                                type="number" 
                                value={createForm.servicesTotal} 
                                onChange={e=>setCreateForm({...createForm, servicesTotal: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input 
                                type="checkbox" 
                                checked={createForm.partsIncluded} 
                                onChange={e=>setCreateForm({...createForm, partsIncluded: e.target.checked})} 
                                id="partsCreate" 
                                className="rounded w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor="partsCreate" className="text-sm font-medium cursor-pointer" style={{ color: themeColors.text }}>Include Free Parts?</label>
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Technician (Optional)</label>
                            <input 
                                type="text" 
                                value={createForm.assignedTechnician} 
                                onChange={e=>setCreateForm({...createForm, assignedTechnician: e.target.value})} 
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            />
                        </div>
                     </div>
                      
                      <div className="flex justify-end gap-2 mt-6 border-t pt-4" style={{ borderColor: themeColors.border }}>
                          <button type="button" onClick={()=>setIsCreateModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
                          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Create AMC</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
