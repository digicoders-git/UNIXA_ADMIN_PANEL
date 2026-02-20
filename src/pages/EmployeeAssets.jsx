import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useNavigate } from "react-router-dom";
import { 
    getAssets, 
    addAsset, 
    updateAsset, 
    deleteAsset, 
    assignAsset, 
    returnAsset 
} from "../apis/employeeAssets";
import { getEmployees } from "../apis/employees";
import {
  FaBox,
  FaSearch,
  FaPlus,
  FaUser,
  FaTools,
  FaLaptop,
  FaCar,
  FaTags,
  FaHistory,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaTable,
  FaThLarge
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function EmployeeAssets() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ assets: [], stats: {} });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeTab, setActiveTab] = useState("All"); // All, Assigned, Available
  const [viewMode, setViewMode] = useState("table"); // table or card

  const [employees, setEmployees] = useState([]);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  // Forms
  const [addForm, setAddForm] = useState({
      assetName: "",
      assetType: "Electronics",
      uniqueId: "",
      modelNumber: "",
      value: "",
      condition: "New",
      notes: ""
  });

  const [assignForm, setAssignForm] = useState({
      employeeId: "",
      assignedDate: new Date().toISOString().split('T')[0],
      notes: ""
  });

  const [returnForm, setReturnForm] = useState({
      returnDate: new Date().toISOString().split('T')[0],
      condition: "Good",
      remarks: ""
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchData();
  }, [search, filterStatus, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = {
          search,
          status: activeTab !== 'All' ? activeTab : filterStatus !== 'All' ? filterStatus : undefined
      };
      const res = await getAssets(filters);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
      try {
          const res = await getEmployees();
          setEmployees(res || []);
      } catch (err) {
          console.error(err);
      }
  };

  const handleAddSubmit = async (e) => {
      e.preventDefault();
      try {
          await addAsset(addForm);
          Swal.fire("Success", "Asset Added Successfully", "success");
          setIsAddModalOpen(false);
          fetchData();
          setAddForm({
            assetName: "",
            assetType: "Electronics",
            uniqueId: "",
            modelNumber: "",
            value: "",
            condition: "New",
            notes: ""
          });
      } catch(err) {
          Swal.fire("Error", err.response?.data?.message || "Failed to add asset", "error");
      }
  };

  const handleAssignSubmit = async (e) => {
      e.preventDefault();
      try {
          await assignAsset(selectedAsset._id, assignForm);
          Swal.fire("Success", "Asset Assigned Successfully", "success");
          setIsAssignModalOpen(false);
          fetchData();
      } catch(err) {
          Swal.fire("Error", err.response?.data?.message || "Failed to assign asset", "error");
      }
  };

  const handleReturnSubmit = async (e) => {
      e.preventDefault();
      try {
          await returnAsset(selectedAsset._id, returnForm);
          Swal.fire("Success", "Asset Returned Successfully", "success");
          setIsReturnModalOpen(false);
          fetchData();
      } catch(err) {
           Swal.fire("Error", err.response?.data?.message || "Failed to return asset", "error");
      }
  };

  const handleDelete = async (id) => {
      const result = await Swal.fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!"
      });

      if (result.isConfirmed) {
          try {
              await deleteAsset(id);
              Swal.fire("Deleted!", "Asset has been deleted.", "success");
              fetchData();
          } catch (err) {
              Swal.fire("Error", "Failed to delete asset", "error");
          }
      }
  };

  const StatCard = ({ title, value, icon: Icon, color, bg }) => (
    <div
      className="p-6 rounded-xl border flex items-center justify-between shadow-sm hover:shadow-md transition"
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
            <FaBox className="text-blue-600" /> Employee Assets
        </h1>
        <div className="flex gap-2">
            <button onClick={() => navigate('/assets-history')} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-md">
                <FaHistory /> View History
            </button>
            <button onClick={()=>setIsAddModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md">
                <FaPlus /> Add New Asset
            </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Assets" value={data.stats.total || 0} icon={FaTags} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/20" />
        <StatCard title="Assigned" value={data.stats.assigned || 0} icon={FaUser} color="text-green-600" bg="bg-green-100 dark:bg-green-900/20" />
        <StatCard title="Available" value={data.stats.available || 0} icon={FaCheckCircle} color="text-yellow-600" bg="bg-yellow-100 dark:bg-yellow-900/20" />
        <StatCard title="In Repair" value={data.stats.repair || 0} icon={FaTools} color="text-red-600" bg="bg-red-100 dark:bg-red-900/20" />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex gap-2 p-1 rounded-lg border bg-opacity-50" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
             {["All", "Assigned", "Available"].map(tab => (
                 <button
                    key={tab}
                    onClick={()=>setActiveTab(tab)}
                    className={`px-4 py-2 text-sm rounded-md transition font-medium`}
                    style={{
                        backgroundColor: activeTab === tab ? themeColors.background : 'transparent',
                        color: activeTab === tab ? themeColors.primary : themeColors.text,
                        opacity: activeTab === tab ? 1 : 0.6
                    }}
                 >
                     {tab}
                 </button>
             ))}
         </div>

         <div className="flex items-center gap-2">
             <div className="relative">
                 <FaSearch className="absolute left-3 top-3 opacity-50" style={{ color: themeColors.text }} />
                 <input
                     type="text"
                     placeholder="Search Asset ID, Name..."
                     value={search}
                     onChange={(e)=>setSearch(e.target.value)}
                     className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                     style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
                 />
             </div>
             <div className="flex items-center rounded-lg overflow-hidden border" style={{ borderColor: themeColors.border }}>
                 <button onClick={() => setViewMode("table")} className={`p-2 transition-all ${viewMode === "table" ? "bg-slate-100 dark:bg-slate-700" : ""}`} style={{ color: themeColors.text }} title="Table View">
                     <FaTable size={18} className="m-1" />
                 </button>
                 <button onClick={() => setViewMode("card")} className={`p-2 border-l transition-all ${viewMode === "card" ? "bg-slate-100 dark:bg-slate-700" : ""}`} style={{ borderColor: themeColors.border, color: themeColors.text }} title="Card View">
                     <FaThLarge size={18} className="m-1" />
                 </button>
             </div>
         </div>
      </div>

      {/* Assets Content */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          {loading ? (
              <div className="p-8 text-center animate-pulse" style={{ color: themeColors.text }}>Loading Assets...</div>
          ) : data.assets.length === 0 ? (
              <div className="p-8 text-center opacity-50" style={{ color: themeColors.text }}>No assets found.</div>
          ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead style={{ backgroundColor: themeColors.background, color: themeColors.text }} className="text-xs uppercase opacity-70 border-b">
                      <tr>
                          <th className="p-4">Asset Details</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Assigned To</th>
                          <th className="p-4">Condition</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                      {data.assets.map(asset => (
                              <tr key={asset._id} className="transition hover:bg-black/5" style={{ color: themeColors.text }}>
                                  <td className="p-4">
                                      <div className="font-bold">{asset.assetName}</div>
                                      <div className="text-xs opacity-60">ID: {asset.uniqueId}</div>
                                  </td>
                                  <td className="p-4">
                                      {asset.assetType === 'Electronics' && <FaLaptop className="inline mr-1 opacity-70" />}
                                      {asset.assetType === 'Vehicle' && <FaCar className="inline mr-1 opacity-70" />}
                                      {asset.assetType}
                                  </td>
                                  <td className="p-4">
                                      {asset.assignedTo ? (
                                          <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                                  {asset.assignedTo.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-medium">{asset.assignedTo.name}</div>
                                                  <div className="text-xs opacity-60 line-clamp-1">{new Date(asset.assignedDate).toLocaleDateString()}</div>
                                              </div>
                                          </div>
                                      ) : <span className="text-xs opacity-50">-</span>}
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-0.5 rounded text-xs border ${
                                          asset.condition === 'New' ? 'border-green-200 text-green-700 bg-green-50' :
                                          asset.condition === 'Good' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                          'border-red-200 text-red-700 bg-red-50'
                                      }`}>
                                          {asset.condition}
                                      </span>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          asset.status === 'Available' ? 'bg-green-100 text-green-700' :
                                          asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                                          'bg-red-100 text-red-700'
                                      }`}>
                                          {asset.status}
                                      </span>
                                  </td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          {asset.status === 'Available' ? (
                                              <button 
                                                onClick={() => { setSelectedAsset(asset); setIsAssignModalOpen(true); }}
                                                className="px-3 py-1 rounded text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                              >
                                                  Assign
                                              </button>
                                          ) : asset.status === 'Assigned' ? (
                                              <button 
                                                onClick={() => { setSelectedAsset(asset); setIsReturnModalOpen(true); }}
                                                className="px-3 py-1 rounded text-xs bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100"
                                              >
                                                  Return
                                              </button>
                                          ) : null}
                                          <button onClick={()=>handleDelete(asset._id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><FaTrash size={12} /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                  </tbody>
              </table>
          </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {data.assets.map(asset => (
                      <div key={asset._id} className="rounded-xl border p-5 flex flex-col gap-4 hover:shadow-lg transition-all" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                      {asset.assetType === 'Electronics' && <FaLaptop size={20} />}
                                      {asset.assetType === 'Vehicle' && <FaCar size={20} />}
                                      {asset.assetType === 'Tools' && <FaTools size={20} />}
                                      {!['Electronics', 'Vehicle', 'Tools'].includes(asset.assetType) && <FaBox size={20} />}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-lg leading-tight">{asset.assetName}</h3>
                                      <p className="text-xs opacity-60">ID: {asset.uniqueId}</p>
                                  </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${asset.status === 'Available' ? 'bg-green-100 text-green-700' : asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                  {asset.status}
                              </span>
                          </div>
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                  <span className="opacity-60">Type:</span>
                                  <span className="font-medium">{asset.assetType}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="opacity-60">Condition:</span>
                                  <span className={`px-2 py-0.5 rounded text-xs border ${asset.condition === 'New' ? 'border-green-200 text-green-700 bg-green-50' : asset.condition === 'Good' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                                      {asset.condition}
                                  </span>
                              </div>
                              {asset.assignedTo && (
                                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: themeColors.border }}>
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                          {asset.assignedTo.name.charAt(0)}
                                      </div>
                                      <div className="flex-1">
                                          <div className="font-medium text-xs">{asset.assignedTo.name}</div>
                                          <div className="text-xs opacity-60">{new Date(asset.assignedDate).toLocaleDateString()}</div>
                                      </div>
                                  </div>
                              )}
                          </div>
                          <div className="pt-3 mt-auto border-t flex justify-between items-center gap-2" style={{ borderColor: themeColors.border }}>
                              {asset.status === 'Available' ? (
                                  <button onClick={() => { setSelectedAsset(asset); setIsAssignModalOpen(true); }} className="px-3 py-1 rounded text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100">
                                      Assign
                                  </button>
                              ) : asset.status === 'Assigned' ? (
                                  <button onClick={() => { setSelectedAsset(asset); setIsReturnModalOpen(true); }} className="px-3 py-1 rounded text-xs bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100">
                                      Return
                                  </button>
                              ) : null}
                              <button onClick={()=>handleDelete(asset._id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><FaTrash size={12} /></button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Add Asset Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
                   <h2 className="text-xl font-bold mb-4 border-b pb-2" style={{ borderColor: themeColors.border }}>Add New Asset</h2>
                   <form onSubmit={handleAddSubmit} className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium mb-1">Asset Name</label>
                               <input type="text" value={addForm.assetName} onChange={e=>setAddForm({...addForm, assetName: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required />
                           </div>
                           <div>
                               <label className="block text-sm font-medium mb-1">Type</label>
                               <select value={addForm.assetType} onChange={e=>setAddForm({...addForm, assetType: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}>
                                   {["Electronics", "Vehicle", "Tools", "Stationery", "Sim Card", "Uniform", "Other"].map(t=><option key={t}>{t}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="block text-sm font-medium mb-1">Unique ID / Serial No</label>
                               <input type="text" value={addForm.uniqueId} onChange={e=>setAddForm({...addForm, uniqueId: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required />
                           </div>
                           <div>
                               <label className="block text-sm font-medium mb-1">Condition</label>
                               <select value={addForm.condition} onChange={e=>setAddForm({...addForm, condition: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}>
                                   {["New", "Good", "Fair", "Damaged", "Under Repair"].map(c=><option key={c}>{c}</option>)}
                               </select>
                           </div>
                            <div>
                               <label className="block text-sm font-medium mb-1">Value (Cost)</label>
                               <input type="number" value={addForm.value} onChange={e=>setAddForm({...addForm, value: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} />
                           </div>
                       </div>
                       
                       <div className="flex justify-end gap-2 mt-6">
                           <button type="button" onClick={()=>setIsAddModalOpen(false)} className="px-4 py-2 rounded border hover:bg-gray-100" style={{ borderColor: themeColors.border, color: themeColors.text }}>Cancel</button>
                           <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add Asset</button>
                       </div>
                   </form>
               </div>
          </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
                   <h2 className="text-xl font-bold mb-4 border-b pb-2" style={{ borderColor: themeColors.border }}>Assign Asset</h2>
                   <div className="mb-4 p-3 rounded bg-blue-50 text-blue-800 text-sm">
                       Assigning <strong>{selectedAsset?.assetName}</strong> ({selectedAsset?.uniqueId})
                   </div>
                   <form onSubmit={handleAssignSubmit} className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium mb-1">Select Employee</label>
                           <select value={assignForm.employeeId} onChange={e=>setAssignForm({...assignForm, employeeId: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required>
                               <option value="">-- Select Employee --</option>
                               {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.designation})</option>)}
                           </select>
                       </div>
                       <div>
                           <label className="block text-sm font-medium mb-1">Assigned Date</label>
                           <input type="date" value={assignForm.assignedDate} onChange={e=>setAssignForm({...assignForm, assignedDate: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required />
                       </div>
                       <div>
                           <label className="block text-sm font-medium mb-1">Notes</label>
                           <textarea value={assignForm.notes} onChange={e=>setAssignForm({...assignForm, notes: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} rows="2"></textarea>
                       </div>
                       <div className="flex justify-end gap-2 mt-6">
                           <button type="button" onClick={()=>setIsAssignModalOpen(false)} className="px-4 py-2 rounded border hover:bg-gray-100" style={{ borderColor: themeColors.border, color: themeColors.text }}>Cancel</button>
                           <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Assign</button>
                       </div>
                   </form>
               </div>
          </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: themeColors.surface, color: themeColors.text }}>
                   <h2 className="text-xl font-bold mb-4 border-b pb-2" style={{ borderColor: themeColors.border }}>Return Asset</h2>
                   <div className="mb-4 p-3 rounded bg-orange-50 text-orange-800 text-sm">
                       Returning <strong>{selectedAsset?.assetName}</strong> from <strong>{selectedAsset?.assignedTo?.name}</strong>
                   </div>
                   <form onSubmit={handleReturnSubmit} className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium mb-1">Return Date</label>
                           <input type="date" value={returnForm.returnDate} onChange={e=>setReturnForm({...returnForm, returnDate: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} required />
                       </div>
                       <div>
                           <label className="block text-sm font-medium mb-1">Condition on Return</label>
                           <select value={returnForm.condition} onChange={e=>setReturnForm({...returnForm, condition: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}>
                                   {["New", "Good", "Fair", "Damaged", "Under Repair"].map(c=><option key={c}>{c}</option>)}
                           </select>
                       </div>
                       <div>
                           <label className="block text-sm font-medium mb-1">Remarks</label>
                           <textarea value={returnForm.remarks} onChange={e=>setReturnForm({...returnForm, remarks: e.target.value})} className="w-full p-2 rounded border" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }} rows="2"></textarea>
                       </div>
                       <div className="flex justify-end gap-2 mt-6">
                           <button type="button" onClick={()=>setIsReturnModalOpen(false)} className="px-4 py-2 rounded border hover:bg-gray-100" style={{ borderColor: themeColors.border, color: themeColors.text }}>Cancel</button>
                           <button type="submit" className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700">Confirm Return</button>
                       </div>
                   </form>
               </div>
          </div>
      )}

    </div>
  );
}
