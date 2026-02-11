import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import {
  getCustomers,
  getCustomerById, 
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addServiceToCustomer,
  addComplaintToCustomer,
} from "../apis/customers";
import {
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSyncAlt,
  FaFilter,
  FaTint,
  FaTools,
  FaHistory,
  FaMoneyBillWave,
  FaEye,
  FaExclamationTriangle,
  FaCalendarCheck,
} from "react-icons/fa";
import Swal from "sweetalert2";


const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  address: {
    house: "",
    area: "",
    city: "",
    pincode: "",
    landmark: "",
  },
  type: "New",
  status: "Active",
  purifiers: [
    {
      brand: "",
      model: "",
      type: "RO",
      installationDate: "",
      warrantyStatus: "Active",
      amcStatus: "Not Taken",
    },
  ],
  amcDetails: {
    planName: "",
    startDate: "",
    endDate: "",
    amountPaid: "",
    paymentMode: "Cash",
    paymentStatus: "Pending",
  },
  rentalDetails: {
    planId: null,
    planName: "",
    machineModel: "",
    amount: 0,
    status: "Inactive",
    paymentStatus: "Due",
    startDate: "",
    nextDueDate: ""
  }
};

export default function Customers() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("basic"); // basic, purifier, amc

  // Action States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [serviceForm, setServiceForm] = useState({
      date: new Date().toISOString().split('T')[0],
      type: "Regular Service",
      technicianName: "",
      notes: "",
      nextDueDate: ""
  });
  const [complaintForm, setComplaintForm] = useState({
      type: "No Water",
      description: "",
      priority: "Medium",
      assignedTechnician: ""
  });

  // Fetch customers
  const fetchCustomersList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCustomers(search);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomersList();
  }, [search, fetchCustomersList]); // Auto-search on type

  const refreshViewingCustomer = async () => {
      if(viewing) {
         try {
             const updated = await getCustomerById(viewing._id);
             setViewing(updated);
             setCustomers(prev => prev.map(c => c._id === updated._id ? updated : c));
         } catch(err) {
             console.error("Failed to refresh customer", err);
         }
      }
  };

  // Form handlers
  const openAddModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const openEditModal = (cust) => {
    setEditing(cust);
    // Ensure nested objects exist to avoid crashes
    setForm({
      ...cust,
      address: cust.address || emptyForm.address,
      purifiers: cust.purifiers?.length ? cust.purifiers : emptyForm.purifiers,
      amcDetails: cust.amcDetails || emptyForm.amcDetails,
      rentalDetails: cust.rentalDetails || emptyForm.rentalDetails,
    });
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
        const [parent, child] = name.split(".");
        setForm(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [child]: value }
        }));
    } else {
        setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePurifierChange = (index, field, value) => {
    const newPurifiers = [...form.purifiers];
    newPurifiers[index] = { ...newPurifiers[index], [field]: value };
    setForm(prev => ({ ...prev, purifiers: newPurifiers }));
  };

  const handleAmcChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
        ...prev,
        amcDetails: { ...prev.amcDetails, [name]: value }
    }));
  };

  const handleRentalChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
        ...prev,
        rentalDetails: { ...prev.rentalDetails, [name]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile) {
      Swal.fire("Error", "Name and Mobile are required", "warning");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await updateCustomer(editing._id, form);
        Swal.fire("Success", "Customer updated successfully", "success");
      } else {
        await createCustomer(form);
        Swal.fire("Success", "Customer created successfully", "success");
      }
      setIsModalOpen(false);
      fetchCustomersList();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", error?.response?.data?.message || "Operation failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleServiceSubmit = async (e) => {
      e.preventDefault();
      if(!viewing) return;
      try {
          setSaving(true);
          await addServiceToCustomer(viewing._id, serviceForm);
          Swal.fire("Success", "Service logged successfully", "success");
          setIsServiceModalOpen(false);
          refreshViewingCustomer(); // Update UI
          setServiceForm({ date: new Date().toISOString().split('T')[0], type: "Regular Service", technicianName: "", notes: "", nextDueDate: "" });
      } catch (err) {
          console.error(err);
          Swal.fire("Error", "Failed to log service", "error");
      } finally {
          setSaving(false);
      }
  };

  const handleComplaintSubmit = async (e) => {
      e.preventDefault();
      if(!viewing) return;
      try {
          setSaving(true);
          await addComplaintToCustomer(viewing._id, complaintForm);
          Swal.fire("Success", "Complaint logged successfully", "success");
          setIsComplaintModalOpen(false);
          refreshViewingCustomer(); // Update UI
          setComplaintForm({ type: "No Water", description: "", priority: "Medium", assignedTechnician: "" });
      } catch (err) {
          console.error(err);
          Swal.fire("Error", "Failed to log complaint", "error");
      } finally {
          setSaving(false);
      }
  };

  const handleDelete = async (cust) => {
    const result = await Swal.fire({
      title: `Delete ${cust.name}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteCustomer(cust._id);
        Swal.fire("Deleted!", "Customer has been deleted.", "success");
        fetchCustomersList();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete customer", "error");
      }
    }
  };

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaUsers className="text-blue-500" />
            Manage Customers
          </h1>
          <p className="text-sm opacity-60" style={{ color: themeColors.text }}>
            View and manage customer profiles, AMC, and service history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs opacity-50">
              <FaSearch style={{ color: themeColors.text }} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchCustomersList}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 hover:bg-opacity-80 transition"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <FaPlus />
            Add Customer
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div
          className="rounded-xl shadow-sm overflow-hidden border"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          {customers.length === 0 ? (
            <div className="p-8 text-center opacity-60">No customers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    style={{ backgroundColor: themeColors.background + "50", color: themeColors.text }}
                    className="text-[11px] font-bold uppercase tracking-widest border-b"
                  >
                    <th className="p-4">Customer Info</th>
                    <th className="p-4">Unit Details</th>
                    <th className="p-4">Status & Type</th>
                    <th className="p-4">Next Service</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                  {customers.map((cust) => (
                    <tr
                      key={cust._id}
                      className="hover:bg-slate-50/50 transition-colors group"
                      style={{ borderBottom: `1px solid ${themeColors.border}40` }}
                    >
                      <td className="p-4">
                        <div className="font-bold text-sm" style={{ color: themeColors.text }}>
                           {cust.name}
                        </div>
                        <div className="text-[10px] opacity-60 flex items-center gap-2 mt-0.5" style={{ color: themeColors.text }}>
                            <span className="flex items-center gap-1"><FaPhone size={8} className="text-blue-500"/> {cust.mobile}</span>
                            {cust.address?.city && <span className="flex items-center gap-1 opacity-70"> • {cust.address.city}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                         {cust.purifiers && cust.purifiers.length > 0 ? (
                             <div className="text-xs">
                                 <div className="font-bold" style={{ color: themeColors.text }}>{cust.purifiers[0].brand} {cust.purifiers[0].model}</div>
                                 <div className="text-[10px] opacity-50 uppercase tracking-tighter mt-0.5">{cust.purifiers[0].type} System</div>
                             </div>
                         ) : (
                             <span className="text-[10px] opacity-40 italic">No Unit Registered</span>
                         )}
                      </td>
                      <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                             <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                 cust.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                             }`}>
                                 {cust.status}
                             </span>
                             {cust.rentalDetails?.status === 'Pending' && (
                                 <span className="animate-pulse px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
                                     Rental Request
                                 </span>
                             )}
                             <span className="text-[10px] font-bold opacity-60 px-2 py-0.5 bg-slate-100 rounded mt-0.5">{cust.type}</span>
                         </div>
                      </td>
                      <td className="p-4">
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                <FaCalendarCheck size={12}/>
                              </div>
                              <div>
                                  <div className="text-xs font-bold" style={{ color: themeColors.text }}>
                                      {cust.serviceHistory?.length > 0 && cust.serviceHistory[cust.serviceHistory.length-1].nextDueDate
                                       ? new Date(cust.serviceHistory[cust.serviceHistory.length-1].nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                       : "Not Set"}
                                  </div>
                                  <div className="text-[9px] opacity-50 uppercase">Due Date</div>
                              </div>
                          </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setViewing(cust); setShowHistory(false); }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                            title="View Full Profile"
                          >
                            <FaEye size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(cust)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cust)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div
            className="w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
          >
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold">{editing ? "Edit Customer" : "New Customer"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><FaTimes /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: themeColors.border }}>
                {['basic', 'purifier', 'amc', 'rental'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                        {tab === 'rental' ? 'Rental Info' : tab.charAt(0).toUpperCase() + tab.slice(1) + ' Details'}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto">
                {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                            <input type="text" name="name" value={form.name} onChange={handleBasicChange} className="w-full p-2 rounded border" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mobile *</label>
                            <input type="text" name="mobile" value={form.mobile} onChange={handleBasicChange} className="w-full p-2 rounded border" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" name="email" value={form.email} onChange={handleBasicChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Customer Type</label>
                             <select name="type" value={form.type} onChange={handleBasicChange} className="w-full p-2 rounded border">
                                 <option value="New">New</option>
                                 <option value="Existing">Existing</option>
                                 <option value="AMC Customer">AMC Customer</option>
                             </select>
                        </div>
                        <div className="col-span-2">
                             <h4 className="font-semibold mb-2 border-b pb-1 opacity-70">Address details</h4>
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">House / Flat No.</label>
                             <input type="text" name="address.house" value={form.address.house} onChange={handleBasicChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Area / Colony</label>
                             <input type="text" name="address.area" value={form.address.area} onChange={handleBasicChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">City</label>
                             <input type="text" name="address.city" value={form.address.city} onChange={handleBasicChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Pincode</label>
                             <input type="text" name="address.pincode" value={form.address.pincode} onChange={handleBasicChange} className="w-full p-2 rounded border" />
                        </div>
                    </div>
                )}

                {activeTab === 'purifier' && (
                    <div className="space-y-6">
                         <div className="p-4 rounded border bg-blue-50 dark:bg-blue-900/10 border-blue-100">
                             <h4 className="font-semibold flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-300">
                                 <FaTint /> Primary Purifier
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Brand Name</label>
                                    <input type="text" value={form.purifiers[0].brand} onChange={(e) => handlePurifierChange(0, 'brand', e.target.value)} className="w-full p-2 rounded border" placeholder="e.g. Kent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Model Name/No</label>
                                    <input type="text" value={form.purifiers[0].model} onChange={(e) => handlePurifierChange(0, 'model', e.target.value)} className="w-full p-2 rounded border" placeholder="e.g. Grand Plus" />
                                </div>
                                <div>
                                     <label className="block text-sm font-medium mb-1">Type</label>
                                     <select value={form.purifiers[0].type} onChange={(e) => handlePurifierChange(0, 'type', e.target.value)} className="w-full p-2 rounded border">
                                         <option value="RO">RO</option>
                                         <option value="UV">UV</option>
                                         <option value="UF">UF</option>
                                         <option value="RO+UV">RO + UV</option>
                                         <option value="Other">Other</option>
                                     </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Installation Date</label>
                                    <input type="date" value={form.purifiers[0].installationDate ? form.purifiers[0].installationDate.split('T')[0] : ''} onChange={(e) => handlePurifierChange(0, 'installationDate', e.target.value)} className="w-full p-2 rounded border" />
                                </div>
                                <div>
                                     <label className="block text-sm font-medium mb-1">Warranty Status</label>
                                     <select value={form.purifiers[0].warrantyStatus} onChange={(e) => handlePurifierChange(0, 'warrantyStatus', e.target.value)} className="w-full p-2 rounded border">
                                         <option value="Active">Active</option>
                                         <option value="Expired">Expired</option>
                                     </select>
                                </div>
                             </div>
                         </div>
                    </div>
                )}

                {activeTab === 'amc' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">AMC Plan Name</label>
                            <input type="text" name="planName" value={form.amcDetails.planName} onChange={handleAmcChange} className="w-full p-2 rounded border" placeholder="e.g. Gold Plan" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount Paid</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 opacity-50">₹</span>
                                <input type="number" name="amountPaid" value={form.amcDetails.amountPaid} onChange={handleAmcChange} className="w-full pl-8 p-2 rounded border" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input type="date" name="startDate" value={form.amcDetails.startDate ? form.amcDetails.startDate.split('T')[0] : ''} onChange={handleAmcChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input type="date" name="endDate" value={form.amcDetails.endDate ? form.amcDetails.endDate.split('T')[0] : ''} onChange={handleAmcChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Payment Status</label>
                             <select name="paymentStatus" value={form.amcDetails.paymentStatus} onChange={handleAmcChange} className="w-full p-2 rounded border">
                                 <option value="Pending">Pending</option>
                                 <option value="Paid">Paid</option>
                             </select>
                        </div>
                    </div>
                )}

                {activeTab === 'rental' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2 p-3 bg-amber-50 rounded text-xs text-amber-800 border border-amber-100">
                            <strong>Note:</strong> Set status to <strong>Active</strong> to make it visible as a subscription in user panel.
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Rental Plan Name</label>
                            <input type="text" name="planName" value={form.rentalDetails.planName} onChange={handleRentalChange} className="w-full p-2 rounded border" placeholder="e.g. Basic RO Rental" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Machine Model</label>
                            <input type="text" name="machineModel" value={form.rentalDetails.machineModel} onChange={handleRentalChange} className="w-full p-2 rounded border" placeholder="e.g. Kent Grand+" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Monthly Rent</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 opacity-50">₹</span>
                                <input type="number" name="amount" value={form.rentalDetails.amount} onChange={handleRentalChange} className="w-full pl-8 p-2 rounded border" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Status</label>
                             <select name="status" value={form.rentalDetails.status} onChange={handleRentalChange} className="w-full p-2 rounded border">
                                 <option value="Inactive">Inactive</option>
                                 <option value="Pending">Pending (Requested)</option>
                                 <option value="Active">Active</option>
                                 <option value="Cancelled">Cancelled</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Start Date</label>
                             <input type="date" name="startDate" value={form.rentalDetails.startDate ? form.rentalDetails.startDate.split('T')[0] : ''} onChange={handleRentalChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Next Payment Due</label>
                             <input type="date" name="nextDueDate" value={form.rentalDetails.nextDueDate ? form.rentalDetails.nextDueDate.split('T')[0] : ''} onChange={handleRentalChange} className="w-full p-2 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Payment Status</label>
                             <select name="paymentStatus" value={form.rentalDetails.paymentStatus} onChange={handleRentalChange} className="w-full p-2 rounded border">
                                 <option value="Paid">Paid</option>
                                 <option value="Due">Due</option>
                                 <option value="Overdue">Overdue</option>
                             </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: themeColors.border }}>
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
                  <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                       {saving && <FaSyncAlt className="animate-spin" />}
                       {editing ? "Update Customer" : "Save Customer"}
                  </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {viewing && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
             <div className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 overflow-y-auto">
                 <div className="flex justify-between items-center mb-6 border-b pb-4">
                     <h2 className="text-xl font-bold flex items-center gap-2"><FaUsers /> {viewing.name}</h2>
                     <button onClick={() => setViewing(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-black"><FaTimes /></button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-6 mb-6">
                     <div className="col-span-2 md:col-span-1 space-y-3">
                         <h3 className="font-bold opacity-70 uppercase text-xs">Contact Details</h3>
                         <p className="flex items-center gap-2"><FaPhone className="text-blue-500"/> {viewing.mobile}</p>
                         <p className="flex items-center gap-2"><FaEnvelope className="text-blue-500"/> {viewing.email || "No Email"}</p>
                         <p className="flex items-start gap-2"><FaMapMarkerAlt className="text-blue-500 mt-1"/> {viewing.address?.house} {viewing.address?.area} {viewing.address?.city} - {viewing.address?.pincode}</p>
                     </div>
                     <div className="col-span-2 md:col-span-1 space-y-3">
                         <h3 className="font-bold opacity-70 uppercase text-xs">Purifier Details</h3>
                         {viewing.purifiers?.[0] ? (
                             <>
                                <p className="font-semibold">{viewing.purifiers[0].brand} {viewing.purifiers[0].model}</p>
                                <p className="text-sm opacity-80">Type: {viewing.purifiers[0].type}</p>
                                <span className={`text-xs px-2 py-0.5 rounded ${viewing.purifiers[0].warrantyStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    Warranty: {viewing.purifiers[0].warrantyStatus}
                                </span>
                             </>
                         ) : viewing.rentalDetails?.planName ? (
                             <>
                                <p className="font-semibold text-amber-600">Rental: {viewing.rentalDetails.planName}</p>
                                <p className="text-sm opacity-80">Model: {viewing.rentalDetails.machineModel}</p>
                                <span className={`text-xs px-2 py-0.5 rounded ${viewing.rentalDetails.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    Status: {viewing.rentalDetails.status}
                                </span>
                             </>
                         ) : (
                             <p className="text-sm opacity-50">No details available</p>
                         )}
                     </div>
                 </div>

                 {/* History Toggle */}
                 {showHistory && (
                     <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                         <h3 className="font-bold text-sm mb-3 flex justify-between items-center">
                             Service History
                             <button onClick={()=>setShowHistory(false)} className="text-xs text-blue-500 hover:underline">Hide</button>
                         </h3>
                         {viewing.serviceHistory?.length > 0 ? (
                             <div className="space-y-2 mb-4">
                                 {viewing.serviceHistory.map((svc, i) => (
                                     <div key={i} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 flex justify-between">
                                          <div>
                                              <p className="font-semibold">{svc.type} - {new Date(svc.date).toLocaleDateString()}</p>
                                              <p className="opacity-70">{svc.notes}</p>
                                          </div>
                                          <div className="text-right">
                                              <p className="opacity-70">Tech: {svc.technicianName}</p>
                                          </div>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <p className="text-xs opacity-50 mb-4">No service records found.</p>
                         )}

                         <h3 className="font-bold text-sm mb-3">Complaints</h3>
                         {viewing.complaints?.length > 0 ? (
                             <div className="space-y-2">
                                 {viewing.complaints.map((cmp, i) => (
                                      <div key={i} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                                          <div className="flex justify-between font-semibold">
                                              <span>{cmp.type}</span>
                                              <span className={`px-2 rounded-full ${cmp.status==='Open'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{cmp.status}</span>
                                          </div>
                                          <p className="opacity-70 mt-1">{cmp.description}</p>
                                          <p className="opacity-50 mt-1 text-[10px]">{new Date(cmp.date).toLocaleDateString()}</p>
                                      </div>
                                 ))}
                             </div>
                         ) : (
                             <p className="text-xs opacity-50">No complaints found.</p>
                         )}
                     </div>
                 )}

                 {/* Action Buttons */}
                 <div className="border-t pt-4 flex flex-wrap gap-3 justify-center">
                     <button 
                        onClick={() => setIsServiceModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                     >
                         <FaTools /> Add Service
                     </button>
                     <button 
                        onClick={() => setIsComplaintModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                     >
                         <FaExclamationTriangle /> Log Complaint
                     </button>
                     <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${showHistory ? 'bg-green-100 text-green-700' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                     >
                         <FaHistory /> {showHistory ? 'Hide History' : 'View History'}
                     </button>
                 </div>
             </div>
           </div>
      )}

      {/* Add Service Modal */}
      {isServiceModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
             <div className="w-full max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg p-6">
                 <h3 className="text-lg font-bold mb-4">Add Service Record</h3>
                 <form onSubmit={handleServiceSubmit}>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium mb-1">Service Date</label>
                             <input type="date" value={serviceForm.date} onChange={e => setServiceForm({...serviceForm, date: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600" required />
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Service Type</label>
                             <select value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600">
                                 <option>Installation</option>
                                 <option>Repair</option>
                                 <option>Regular Service</option>
                                 <option>Filter Change</option>
                                 <option>Other</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Technician Name</label>
                             <input type="text" value={serviceForm.technicianName} onChange={e => setServiceForm({...serviceForm, technicianName: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Next Due Date</label>
                             <input type="date" value={serviceForm.nextDueDate} onChange={e => setServiceForm({...serviceForm, nextDueDate: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Notes</label>
                             <textarea value={serviceForm.notes} onChange={e => setServiceForm({...serviceForm, notes: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600" rows="3"></textarea>
                         </div>
                     </div>
                     <div className="flex justify-end gap-2 mt-6">
                         <button type="button" onClick={()=>setIsServiceModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
                         <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">submit</button>
                     </div>
                 </form>
             </div>
          </div>
      )}

      {/* Log Complaint Modal */}
      {isComplaintModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
             <div className="w-full max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg p-6">
                 <h3 className="text-lg font-bold mb-4">Log New Complaint</h3>
                 <form onSubmit={handleComplaintSubmit}>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium mb-1">Complaint Type</label>
                             <select value={complaintForm.type} onChange={e => setComplaintForm({...complaintForm, type: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600">
                                 <option>No Water</option>
                                 <option>Bad Taste</option>
                                 <option>Leakage</option>
                                 <option>Noise</option>
                                 <option>Other</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Priority</label>
                             <select value={complaintForm.priority} onChange={e => setComplaintForm({...complaintForm, priority: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600">
                                 <option>Low</option>
                                 <option>Medium</option>
                                 <option>High</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Technician</label>
                             <input type="text" value={complaintForm.assignedTechnician} onChange={e => setComplaintForm({...complaintForm, assignedTechnician: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600" placeholder="Optional" />
                         </div>
                         <div>
                             <label className="block text-sm font-medium mb-1">Description</label>
                             <textarea value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600" rows="3" required></textarea>
                         </div>
                     </div>
                     <div className="flex justify-end gap-2 mt-6">
                         <button type="button" onClick={()=>setIsComplaintModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
                         <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Log Complaint</button>
                     </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
}
