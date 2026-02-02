import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getNotifications, sendNotification, deleteNotification } from "../apis/notifications";
import {
  FaBell,
  FaPaperPlane,
  FaTrash,
  FaBullhorn,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaUsers,
  FaSearch
} from "react-icons/fa";
import Swal from "sweetalert2";

export default function Notifications() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
      title: "",
      message: "",
      audience: "All",
      type: "Info"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    try {
        await sendNotification(sendForm);
        Swal.fire("Success", "Notification Sent Successfully", "success");
        setIsSendModalOpen(false);
        setSendForm({ title: "", message: "", audience: "All", type: "Info" });
        fetchData();
    } catch (err) {
        console.log(err);
        Swal.fire("Error", "Failed to send notification", "error");
    }
  };

  const handleDelete = async (id) => {
      const result = await Swal.fire({
          title: "Delete Notification?",
          text: "It will be removed from history.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!"
      });

      if(result.isConfirmed) {
          try {
              await deleteNotification(id);
              fetchData();
              Swal.fire("Deleted!", "Notification removed.", "success");
          } catch(err) {
              console.log(err);
              Swal.fire("Error", "Failed to delete.", "error");
          }
      }
  };

  const getTypeIcon = (type) => {
      switch(type) {
          case 'Success': return <FaCheckCircle className="text-green-500" />;
          case 'Warning': return <FaExclamationTriangle className="text-yellow-500" />;
          case 'Alert': return <FaExclamationCircle className="text-red-500" />;
          default: return <FaInfoCircle className="text-blue-500" />;
      }
  };

  // Filter
  const filteredNotifications = notifications.filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="space-y-6 min-h-screen pb-10"
      style={{ fontFamily: currentFont.family, color: themeColors.text }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaBell className="text-yellow-500" /> Manage Notifications
        </h1>
        <button 
            onClick={() => setIsSendModalOpen(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all transform hover:scale-105"
        >
            <FaPaperPlane /> Send Notification
        </button>
      </div>

      {/* Stats/Overview Row (Optional simple stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border flex items-center justify-between" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60 uppercase">Total Sent</p>
                  <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><FaBullhorn /></div>
          </div>
           <div className="p-4 rounded-lg border flex items-center justify-between" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
              <div>
                  <p className="text-xs opacity-60 uppercase">To All Users</p>
                  <p className="text-2xl font-bold">{notifications.filter(n=>n.audience==='All').length}</p>
              </div>
              <div className="p-3 bg-green-100 text-green-600 rounded-full"><FaUsers /></div>
          </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
          <FaSearch className="absolute left-3 top-3 opacity-50" />
          <input 
            type="text" 
            placeholder="Search history..." 
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            className="w-full md:w-1/3 pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          />
      </div>

      {/* History List */}
      <div className="space-y-3">
          {loading ? (
              <div className="p-8 text-center animate-pulse opacity-60">Loading history...</div>
          ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center opacity-50 border rounded-xl border-dashed" style={{ borderColor: themeColors.border }}>
                  <FaBell size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No notifications sent yet.</p>
              </div>
          ) : (
              filteredNotifications.map(notification => (
                  <div 
                    key={notification._id} 
                    className="p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:shadow-md transition"
                    style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
                  >
                      <div className="flex items-start gap-4">
                          <div className={`mt-1 p-2 rounded-lg bg-opacity-10 dark:bg-opacity-20 flex-shrink-0 text-xl`}>
                            {getTypeIcon(notification.type)}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg mb-1">{notification.title}</h3>
                              <p className="text-sm opacity-70 mb-2">{notification.message}</p>
                              <div className="flex flex-wrap gap-2 text-xs opacity-60">
                                  <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                      <FaUsers size={10} /> {notification.audience}
                                  </span>
                                  <span>•</span>
                                  <span>{new Date(notification.sentAt).toLocaleString()}</span>
                              </div>
                          </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(notification._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Delete"
                      >
                          <FaTrash />
                      </button>
                  </div>
              ))
          )}
      </div>

      {/* Send Modal */}
      {isSendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up" 
                    style={{ backgroundColor: themeColors.surface, color: themeColors.text }}
               >
                   <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2" style={{ borderColor: themeColors.border }}>
                       <FaPaperPlane className="text-blue-500" /> Send BroadCast
                   </h2>
                   
                   <form onSubmit={handleSendSubmit} className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Audience</label>
                           <select 
                                value={sendForm.audience} 
                                onChange={e=>setSendForm({...sendForm, audience: e.target.value})}
                                className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                            >
                               <option value="All">All Users & Customers</option>
                               <option value="Customers">Customers Only</option>
                               <option value="Employees">Employees Only</option>
                           </select>
                       </div>

                       <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Type</label>
                           <div className="flex gap-2">
                               {['Info', 'Success', 'Warning', 'Alert'].map(type => (
                                   <button
                                      key={type}
                                      type="button"
                                      onClick={()=>setSendForm({...sendForm, type})}
                                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                                          sendForm.type === type 
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                            : 'opacity-60 hover:opacity-100'
                                      }`}
                                      style={{ borderColor: sendForm.type === type ? '' : themeColors.border }}
                                   >
                                       {type}
                                   </button>
                               ))}
                           </div>
                       </div>
                       
                       <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Title</label>
                           <input 
                                type="text"
                                required
                                placeholder="Notification Title"
                                value={sendForm.title}
                                onChange={e=>setSendForm({...sendForm, title: e.target.value})}
                                className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           />
                       </div>

                       <div>
                           <label className="block text-sm font-medium mb-1 opacity-80">Message</label>
                           <textarea 
                                required
                                rows="3"
                                placeholder="Write your message here..."
                                value={sendForm.message}
                                onChange={e=>setSendForm({...sendForm, message: e.target.value})}
                                className="w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                           ></textarea>
                       </div>

                       <div className="flex justify-end gap-3 mt-8">
                           <button 
                                type="button" 
                                onClick={()=>setIsSendModalOpen(false)} 
                                className="px-5 py-2.5 rounded-lg border hover:bg-gray-100 font-medium transition"
                                style={{ borderColor: themeColors.border, color: themeColors.text }}
                           >
                               Cancel
                           </button>
                           <button 
                                type="submit" 
                                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition"
                           >
                               Send Now
                           </button>
                       </div>
                   </form>
               </div>
          </div>
      )}
    </div>
  );
}
