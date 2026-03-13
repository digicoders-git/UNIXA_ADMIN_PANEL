import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getConversations, getHistory, replyToSMS, simulateIncoming } from "../apis/sms";
import { FaPaperPlane, FaUserCircle, FaSearch, FaCommentDots, FaClock, FaCheckDouble } from "react-icons/fa";
import Swal from "sweetalert2";

const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
};
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
};

export default function SMSMessages() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { if (selectedConvo) fetchHistory(selectedConvo.phoneNumber); }, [selectedConvo]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      if (data.length > 0 && !selectedConvo) setSelectedConvo(data[0]);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async (number) => {
    setLoading(true);
    try { const data = await getHistory(number); setMessages(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvo) return;
    try {
      const resp = await replyToSMS({ phoneNumber: selectedConvo.phoneNumber, message: replyText });
      setMessages([...messages, resp]);
      setReplyText("");
      fetchConversations();
    } catch (err) { Swal.fire("Error", "Failed to send SMS", "error"); }
  };

  const handleSimulate = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Simulate Incoming SMS',
      html: '<input id="swal-input1" class="swal2-input" placeholder="Phone Number"><input id="swal-input2" class="swal2-input" placeholder="Message">',
      focusConfirm: false,
      preConfirm: () => [document.getElementById('swal-input1').value, document.getElementById('swal-input2').value]
    });
    if (formValues) {
      const [phone, msg] = formValues;
      if (!phone || !msg) return;
      try {
        await simulateIncoming({ phoneNumber: phone, message: msg });
        fetchConversations();
        if (selectedConvo && selectedConvo.phoneNumber === phone) fetchHistory(phone);
        Swal.fire("Success", "SMS Received!", "success");
      } catch (e) { Swal.fire("Error", "Simulation failed", "error"); }
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="flex bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100" style={{ fontFamily: currentFont, height: "calc(100vh - 140px)" }}>
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2" style={{ color: themeColors?.primary || '#3b82f6' }}>
            <FaCommentDots /> SMS Center
          </h2>
          <div className="relative">
            <input type="text" placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all" />
            <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
          </div>
          <button onClick={handleSimulate} className="mt-3 w-full py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors">
            + SIMULATE INCOMING
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((convo) => (
            <div key={convo.phoneNumber} onClick={() => setSelectedConvo(convo)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-all border-b border-gray-100/50 ${selectedConvo?.phoneNumber === convo.phoneNumber ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 uppercase font-black text-lg">
                {convo.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-sm text-gray-800 truncate">{convo.name}</span>
                  <span className="text-[10px] text-gray-400">{formatTime(convo.lastDate)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{convo.lastMessage}</p>
              </div>
              {convo.unreadCount > 0 && (
                <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">{convo.unreadCount}</div>
              )}
            </div>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
              <FaCommentDots className="text-4xl opacity-20" /><p>No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConvo ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FaUserCircle size={24} /></div>
                <div>
                  <h3 className="font-bold text-gray-800 leading-none">{selectedConvo.name}</h3>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{selectedConvo.phoneNumber}</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black tracking-tighter">CONNECTED</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex flex-col gap-4">
                {messages.map((msg, idx) => (
                  <div key={msg._id || idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%]">
                      <div className={`p-4 rounded-3xl shadow-sm text-sm transition-all hover:shadow-md ${msg.direction === 'outbound'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none'
                        : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'}`}>
                        {msg.message}
                        <div className={`flex items-center gap-1 mt-2 text-[9px] font-medium opacity-60 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <FaClock /> {formatDate(msg.createdAt)}
                          {msg.direction === 'outbound' && <FaCheckDouble className="text-blue-300 ml-1" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div></div>}
                <div ref={chatEndRef} />
              </div>
            </div>
            <form onSubmit={handleReply} className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
              <input type="text" placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" />
              <button type="submit" disabled={!replyText.trim()}
                className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all disabled:opacity-50">
                <FaPaperPlane />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-gray-50/30">
            <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <FaCommentDots className="text-6xl text-blue-300" />
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">SMS Center</h3>
            <p className="text-gray-400 max-w-sm">Select a conversation to view and reply to customer messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
