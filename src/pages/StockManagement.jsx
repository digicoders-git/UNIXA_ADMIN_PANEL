import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getStockOverview, updateStock, getStockHistory } from "../apis/stock";
import {
  FaBoxOpen,
  FaSearch,
  FaPlus,
  FaMinus,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle,
  FaDolly,
  FaClipboardList
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function StockManagement() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [updateForm, setUpdateForm] = useState({
      quantity: "",
      type: "Add",
      reason: "",
      note: ""
  });
  const [historyLogs, setHistoryLogs] = useState([]);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getStockOverview({ status: statusFilter, search });
      setProducts(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
      setSearch(e.target.value);
      // Debounce could be added here, but for now direct call or Effect dependency if search is crucial real-time
  };
  
  // Trigger search on enter or button click
  const triggerSearch = () => {
      fetchData();
  };

  const openUpdateModal = (product) => {
      setSelectedProduct(product);
      setUpdateForm({ quantity: "", type: "Add", reason: "", note: "" });
      setIsUpdateModalOpen(true);
  };

  const openHistoryModal = async (product) => {
      setSelectedProduct(product);
      setIsHistoryModalOpen(true);
      try {
          const logs = await getStockHistory(product._id);
          setHistoryLogs(logs || []);
      } catch (err) {
          console.error(err);
      }
  };

  const handleUpdateSubmit = async (e) => {
      e.preventDefault();
      if(!updateForm.quantity || Number(updateForm.quantity) <= 0) {
          Swal.fire("Error", "Please enter a valid quantity", "error");
          return;
      }

      try {
          await updateStock({
              id: selectedProduct._id,
              ...updateForm
          });
          Swal.fire("Success", "Stock updated successfully", "success");
          setIsUpdateModalOpen(false);
          fetchData();
      } catch (err) {
          Swal.fire("Error", err.response?.data?.message || "Failed to update stock", "error");
      }
  };

  const getStockStatus = (stock, threshold) => {
      if (stock === 0) return { label: "Out of Stock", color: "red", icon: <FaExclamationTriangle /> };
      if (stock <= threshold) return { label: "Low Stock", color: "orange", icon: <FaExclamationTriangle /> };
      return { label: "In Stock", color: "green", icon: <FaCheckCircle /> };
  };

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaDolly className="text-blue-600" /> Stock Management
        </h1>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border flex items-center justify-between shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60 uppercase">Total Items</p>
                  <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><FaBoxOpen /></div>
          </div>
          <div className="p-4 rounded-xl border flex items-center justify-between shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60 uppercase">Low Stock Alert</p>
                  <p className="text-2xl font-bold text-orange-600">{products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length}</p>
              </div>
              <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><FaExclamationTriangle /></div>
          </div>
          <div className="p-4 rounded-xl border flex items-center justify-between shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60 uppercase">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{products.filter(p => p.stock === 0).length}</p>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-full"><FaExclamationTriangle /></div>
          </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 p-1 rounded-lg border" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              {["All", "In Stock", "Low Stock", "Out of Stock"].map(s => (
                  <button
                    key={s}
                    onClick={()=>setStatusFilter(s)}
                    className={`px-4 py-2 text-sm rounded-md transition font-medium whitespace-nowrap`}
                    style={{
                        backgroundColor: statusFilter === s ? themeColors.background : 'transparent',
                        color: statusFilter === s ? themeColors.primary : themeColors.text,
                        opacity: statusFilter === s ? 1 : 0.6
                    }}
                  >
                      {s}
                  </button>
              ))}
          </div>

          <div className="relative flex w-full md:w-auto gap-2">
             <div className="relative w-full">
                <FaSearch className="absolute left-3 top-3 opacity-50" />
                <input
                    type="text"
                    placeholder="Search by Product Name..."
                    value={search}
                    onChange={handleSearch}
                    onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
                    className="pl-10 pr-4 py-2 rounded-lg border w-full md:w-72 outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
                />
             </div>
             <button 
                onClick={triggerSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
             >
                 Search
             </button>
          </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead style={{ backgroundColor: themeColors.background, color: themeColors.text }} className="text-xs uppercase opacity-70 border-b">
                      <tr>
                          <th className="p-4">Product</th>
                          <th className="p-4">Price</th>
                          <th className="p-4">Current Stock</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                      {loading ? (
                          <tr><td colSpan="5" className="p-8 text-center animate-pulse" style={{ color: themeColors.text }}>Loading Inventory...</td></tr>
                      ) : products.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center opacity-50" style={{ color: themeColors.text }}>No products found.</td></tr>
                      ) : (
                          products.map(product => {
                              const status = getStockStatus(product.stock, product.lowStockThreshold);
                              return (
                                  <tr key={product._id} className="transition hover:bg-black/5" style={{ color: themeColors.text }}>
                                      <td className="p-4 flex items-center gap-3">
                                          <img 
                                            src={product.mainImage?.url || "https://via.placeholder.com/40"} 
                                            alt={product.name} 
                                            className="w-10 h-10 rounded object-cover border"
                                          />
                                          <div>
                                              <p className="font-bold line-clamp-1">{product.name}</p>
                                              <p className="text-xs opacity-50">SKU: {product._id.slice(-6).toUpperCase()}</p>
                                          </div>
                                      </td>
                                      <td className="p-4 font-mono">₹{product.price}</td>
                                      <td className="p-4">
                                          <div className="flex items-center gap-2">
                                              <span className="text-lg font-bold">{product.stock}</span>
                                              <span className="text-xs opacity-50">units</span>
                                          </div>
                                      </td>
                                      <td className="p-4">
                                          <span className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border transition-colors w-max
                                              ${status.color === 'red' ? 'text-red-600 bg-red-50 border-red-200' : 
                                                status.color === 'orange' ? 'text-orange-600 bg-orange-50 border-orange-200' : 
                                                'text-green-600 bg-green-50 border-green-200'}`
                                          }>
                                              {status.icon} {status.label}
                                          </span>
                                      </td>
                                      <td className="p-4 text-right">
                                          <button 
                                            onClick={() => openHistoryModal(product)}
                                            className="p-2 mr-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                            title="View History"
                                          >
                                              <FaHistory />
                                          </button>
                                          <button 
                                            onClick={() => openUpdateModal(product)}
                                            className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded font-medium text-xs hover:opacity-90 transition"
                                          >
                                              Manage Stock
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

      {/* Update Stock Modal */}
      {isUpdateModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up" 
                    style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
               >
                   <h2 className="text-xl font-bold mb-6 border-b pb-4" style={{ borderColor: themeColors.border }}>
                       Update Stock: <span className="text-blue-600">{selectedProduct.name}</span>
                   </h2>
                   
                   <form onSubmit={handleUpdateSubmit} className="space-y-4">
                       <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                           <button
                               type="button"
                               onClick={()=>setUpdateForm({...updateForm, type: 'Add'})}
                               className={`flex-1 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition ${
                                   updateForm.type === 'Add' 
                                   ? 'bg-green-500 text-white shadow' 
                                   : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                               }`}
                           >
                               <FaPlus /> Add Stock
                           </button>
                           <button
                               type="button"
                               onClick={()=>setUpdateForm({...updateForm, type: 'Remove'})}
                               className={`flex-1 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition ${
                                   updateForm.type === 'Remove' 
                                   ? 'bg-red-500 text-white shadow' 
                                   : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                               }`}
                           >
                               <FaMinus /> Reduce Stock
                           </button>
                       </div>

                       <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Quantity</label>
                           <input 
                                type="number"
                                required
                                min="1"
                                placeholder="Enter quantity"
                                value={updateForm.quantity}
                                onChange={e=>setUpdateForm({...updateForm, quantity: e.target.value})}
                                className="w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           />
                       </div>

                       <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Reason</label>
                           <select 
                                value={updateForm.reason} 
                                onChange={e=>setUpdateForm({...updateForm, reason: e.target.value})}
                                className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            >
                               <option value="">Select Reason...</option>
                               {updateForm.type === 'Add' ? [
                                   "New Shipment", "Return Restock", "Inventory Adjustment", "Other"
                               ].map(r=><option key={r} value={r}>{r}</option>) : [
                                   "Damaged/Expired", "Lost/Stolen", "Inventory Adjustment", "Other"
                               ].map(r=><option key={r} value={r}>{r}</option>)}
                           </select>
                       </div>
                       
                        <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Note (Optional)</label>
                           <textarea 
                                rows="2"
                                placeholder="Any additional details..."
                                value={updateForm.note}
                                onChange={e=>setUpdateForm({...updateForm, note: e.target.value})}
                                className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           ></textarea>
                       </div>

                       <div className="flex justify-end gap-3 mt-6">
                           <button 
                                type="button" 
                                onClick={()=>setIsUpdateModalOpen(false)} 
                                className="px-5 py-2.5 rounded-lg border hover:bg-gray-100 font-medium transition"
                                style={{ borderColor: themeColors.border, color: themeColors.text }}
                           >
                               Cancel
                           </button>
                           <button 
                                type="submit" 
                                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition"
                           >
                               Confirm Update
                           </button>
                       </div>
                   </form>
               </div>
          </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-hidden flex flex-col" 
                    style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
               >
                   <div className="flex justify-between items-center mb-4 border-b pb-4" style={{ borderColor: themeColors.border }}>
                       <h2 className="text-xl font-bold flex items-center gap-2">
                           <FaClipboardList className="text-blue-500" /> Stock History
                           <span className="text-sm font-normal opacity-60 ml-2">({selectedProduct.name})</span>
                       </h2>
                       <button onClick={()=>setIsHistoryModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100">&times;</button>
                   </div>
                   
                   <div className="overflow-y-auto flex-1 pr-2">
                       {historyLogs.length === 0 ? (
                           <div className="text-center py-10 opacity-50">No history available yet.</div>
                       ) : (
                           <div className="space-y-4">
                               {historyLogs.map(log => (
                                   <div key={log._id} className="p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: themeColors.border }}>
                                       <div>
                                           <p className="font-bold text-sm mb-1">{log.reason}</p>
                                           <div className="text-xs opacity-60 flex gap-2">
                                               <span>{new Date(log.createdAt).toLocaleString()}</span>
                                               {log.note && <span>• {log.note}</span>}
                                           </div>
                                       </div>
                                       <div className="text-right">
                                           <p className={`font-bold text-lg ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                               {log.change > 0 ? '+' : ''}{log.change}
                                           </p>
                                           <p className="text-xs opacity-50">
                                               {log.previousStock} ➔ {log.newStock}
                                           </p>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
               </div>
          </div>
      )}
    </div>
  );
}
