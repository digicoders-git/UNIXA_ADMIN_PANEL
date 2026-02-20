import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getAMCDashboard, createAMC, renewAMC, getCustomers } from "../apis/customers"; // Added getCustomers for Create search
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

export default function AMCManagement() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, customers: [], productStats: [] });
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
      customerId: "",
      planName: "Gold Plan",
      planType: "Gold",
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
    fetchData();
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
    setLoading(true);
    try {
      const filters = {
          status: filterType,
          search: search
      };
      const res = await getAMCDashboard(filters);
      console.log('AMC Dashboard Data:', res);
      console.log('Product Stats:', res.productStats);
      
      // Fallback for testing if no product stats
      if (!res.productStats || res.productStats.length === 0) {
        console.warn('No product stats found. Charts will not be displayed.');
      }
      
      setData(res);
    } catch (err) {
      console.error('Error fetching AMC data:', err);
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

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await renewAMC(selectedCustomer._id, renewForm);
      Swal.fire("Success", "AMC Renewed Successfully", "success");
      setIsRenewModalOpen(false);
      fetchData();
    } catch (err) {
      Swal.fire("Error", "Failed to renew AMC", "error");
    }
  };

  const handleCreateSubmit = async (e) => {
      e.preventDefault();
      if(!createForm.customerId) {
          Swal.fire("Error", "Please select a customer", "warning");
          return;
      }
      try {
          await createAMC(createForm);
          Swal.fire("Success", "New AMC Created", "success");
          setIsCreateModalOpen(false);
          fetchData();
          setCreateForm({
                customerId: "",
                planName: "Gold Plan",
                planType: "Gold",
                durationMonths: 12,
                startDate: new Date().toISOString().split('T')[0],
                amount: "",
                servicesTotal: 3,
                partsIncluded: false,
                notes: ""
          }); 
      } catch(err) {
          Swal.fire("Error", err.response?.data?.message || "Failed to create AMC", "error");
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
          title="Total AMCs"
          value={data.stats.total || 0}
          icon={FaFileContract}
          color="text-blue-600"
          bg="bg-blue-100 dark:bg-blue-900/20"
        />
        <StatCard
          title="Active AMCs"
          value={data.stats.active || 0}
          icon={FaCheckCircle}
          color="text-green-600"
          bg="bg-green-100 dark:bg-green-900/20"
        />
        <StatCard
          title="Expiring Soon"
          value={data.stats.expiringSoon || 0}
          icon={FaExclamationCircle}
          color="text-yellow-600"
          bg="bg-yellow-100 dark:bg-yellow-900/20"
        />
        <StatCard
          title="Revenue"
          value={`₹${data.stats.revenue?.toLocaleString() || 0}`}
          icon={FaRupeeSign}
          color="text-purple-600"
          bg="bg-purple-100 dark:bg-purple-900/20"
        />
      </div>

      {/* Charts Section */}
      {!loading && data.productStats && data.productStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product-wise AMC Distribution */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaChartPie className="text-blue-600" /> Product-wise AMC Distribution
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
                  name: 'AMCs',
                  colorByPoint: true,
                  data: data.productStats.map(p => ({ name: p.productName, y: p.count }))
                }]
              }}
            />
          </div>

          {/* AMC Status by Product */}
          <div
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <FaShieldAlt className="text-green-600" /> AMC Status Overview
            </h3>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: { type: 'column', backgroundColor: 'transparent', height: 300 },
                title: { text: '' },
                credits: { enabled: false },
                xAxis: {
                  categories: data.productStats.map(p => p.productName),
                  labels: { style: { color: themeColors.text } }
                },
                yAxis: {
                  min: 0,
                  title: { text: 'Count', style: { color: themeColors.text } },
                  labels: { style: { color: themeColors.text } },
                  stackLabels: { enabled: true }
                },
                legend: { itemStyle: { color: themeColors.text } },
                plotOptions: {
                  column: {
                    stacking: 'normal',
                    dataLabels: { enabled: true }
                  }
                },
                series: [
                  { name: 'Active', data: data.productStats.map(p => p.active || 0), color: '#10b981' },
                  { name: 'Expiring', data: data.productStats.map(p => p.expiring || 0), color: '#f59e0b' },
                  { name: 'Expired', data: data.productStats.map(p => p.expired || 0), color: '#ef4444' }
                ]
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
          {["All", "Active", "Expiring Soon", "Expired"].map((type) => (
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
            placeholder="Search Name, ID, Mobile..."
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
                <th className="p-4">AMC ID / Customer</th>
                <th className="p-4">Product / Plan</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Usage</th>
                <th className="p-4">Days Left</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center animate-pulse" style={{ color: themeColors.text }}>
                    Loading AMC Data...
                  </td>
                </tr>
              ) : data.customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center opacity-50" style={{ color: themeColors.text }}>
                    No records found.
                  </td>
                </tr>
              ) : (
                data.customers.map((cust) => {
                    const endDate = new Date(cust.amcDetails.endDate);
                    const startDate = new Date(cust.amcDetails.startDate);
                    const today = new Date();
                    const isExpired = endDate < today;
                    const daysLeft = Math.ceil((endDate - today)/(1000*60*60*24));
                    const totalDays = Math.ceil((endDate - startDate)/(1000*60*60*24));
                    const daysUsed = totalDays - daysLeft;
                    const timeProgress = (daysUsed / totalDays) * 100;

                    return (
                        <tr 
                            key={cust._id} 
                            className="transition hover:bg-black/5"
                            style={{ color: themeColors.text }}
                        >
                        <td className="p-4">
                            <div className="font-mono text-xs opacity-50 mb-1">{cust.amcDetails.amcId}</div>
                            <div className="font-bold">{cust.name}</div>
                            <div className="text-xs opacity-60 flex items-center gap-1"><FaUserCog size={10} /> {cust.amcDetails.assignedTechnician || 'Unassigned'}</div>
                        </td>
                        <td className="p-4">
                            <div className="font-medium text-blue-600">
                                {cust.purifiers?.[0]?.brand} {cust.purifiers?.[0]?.model}
                            </div>
                            <span className="text-xs opacity-70 block mt-1">{cust.amcDetails.planName}</span>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col text-xs opacity-90">
                                <span className="font-semibold">{new Date(cust.amcDetails.startDate).toLocaleDateString()}</span>
                                <span className="opacity-60">to</span>
                                <span className="font-semibold">{new Date(cust.amcDetails.endDate).toLocaleDateString()}</span>
                            </div>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex justify-between w-24">
                                    <span>Services:</span>
                                    <span className="font-bold">{cust.amcDetails.servicesUsed}/{cust.amcDetails.servicesTotal}</span>
                                </div>
                                <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full" 
                                        style={{ width: `${(cust.amcDetails.servicesUsed/cust.amcDetails.servicesTotal)*100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col gap-1 text-xs">
                                <span className="font-bold">{isExpired ? 'Expired' : `${daysLeft} days`}</span>
                                <div className="w-20 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${isExpired ? 'bg-red-500' : daysLeft <= 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(timeProgress, 100)}%` }}
                                    ></div>
                                </div>
                                <span className="opacity-60">{Math.round(timeProgress)}% used</span>
                            </div>
                        </td>
                        <td className="p-4">
                            {isExpired ? (
                                <span className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-bold">Expired</span>
                            ) : daysLeft <= 30 ? (
                                <span className="px-2 py-1 rounded border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-bold">Expiring</span>
                            ) : (
                                <span className="px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-bold">Active</span>
                            )}
                        </td>
                        <td className="p-4 text-right">
                         <div className="flex justify-end gap-2">
                             <button 
                                onClick={() => openViewModal(cust)}
                                className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition" 
                                title="View Details"
                             >
                                 <FaEye />
                             </button>
                             <button 
                                onClick={() => openRenewModal(cust)}
                                className="px-3 py-1.5 rounded text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition flex items-center gap-1"
                            >
                                <FaSyncAlt /> Renew
                            </button>
                         </div>
                        </td>
                        </tr>
                    )
                })
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
                     
                     {/* Customer Search Section */}
                     <div className="relative">
                         <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Select Customer *</label>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="Type to search customer..." 
                                value={customerSearch}
                                onChange={(e)=>{
                                    setCustomerSearch(e.target.value);
                                    if(createForm.customerId) setCreateForm({...createForm, customerId: ""});
                                    setShowCustomerDropdown(false);
                                }}
                                className="flex-1 p-2 rounded border"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                             />
                             <button
                                type="button"
                                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                                className="px-4 py-2 rounded border hover:bg-slate-100 transition"
                                style={{ borderColor: themeColors.border, color: themeColors.text }}
                             >
                                 {showCustomerDropdown ? '▲' : '▼'}
                             </button>
                         </div>
                         {((customerOptions.length > 0 && customerSearch.length > 2) || (showCustomerDropdown && allCustomers.length > 0)) && (
                             <div 
                                className="absolute z-10 w-full border shadow-lg max-h-60 overflow-y-auto mt-1 rounded"
                                style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                             >
                                 {(customerSearch.length > 2 ? customerOptions : allCustomers).map(c => (
                                     <div 
                                        key={c._id} 
                                        onClick={() => {
                                            setCreateForm({...createForm, customerId: c._id});
                                            setCustomerSearch(`${c.name} (${c.mobile})`);
                                            setCustomerOptions([]);
                                            setShowCustomerDropdown(false);
                                        }}
                                        className="p-2 cursor-pointer text-sm border-b hover:bg-slate-100 transition"
                                        style={{ borderColor: themeColors.border, color: themeColors.text }}
                                     >
                                         <div className="font-bold">{c.name}</div>
                                         <div className="text-xs opacity-70">{c.mobile} - {c.address?.city}</div>
                                     </div>
                                 ))}
                             </div>
                         )}
                         {createForm.customerId && <div className="text-xs text-green-600 mt-1">✓ Customer Selected</div>}
                     </div>

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
