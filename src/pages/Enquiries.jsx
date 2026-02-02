// src/pages/Enquiries.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import { listEnquiries, updateEnquiry } from "../apis/enquiry";
import {
  FaEnvelopeOpenText,
  FaSyncAlt,
  FaSearch,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaCheck,
  FaClock,
  FaFilter,
  FaInbox
} from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

// Possible enquiry statuses (assumption)
const STATUS_OPTIONS = ["new", "in-progress", "resolved", "closed"];

export default function Enquiries() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { isLoggedIn } = useAuth();

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selected, setSelected] = useState(null); // detail view right panel

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await listEnquiries();
      setEnquiries(list);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load enquiries."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleUpdate = async (enquiry, extra = {}) => {
    if (!isLoggedIn) {
      setError("You must be logged in as admin to update enquiries.");
      return;
    }

    const id = enquiry._id || enquiry.id;
    if (!id) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        status: enquiry.status,
        isRead: enquiry.isRead,
        ...extra,
      };

      await updateEnquiry(id, payload);

      setEnquiries((prev) =>
        prev.map((e) =>
          (e._id || e.id) === id ? { ...e, ...payload } : e
        )
      );

      if (selected && (selected._id || selected.id) === id) {
        setSelected((prev) => ({ ...prev, ...payload }));
      }

      setSuccess("Enquiry updated successfully.");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update enquiry.";
      setError(msg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (enquiry, newStatus) => {
    if (newStatus === enquiry.status) return;
    await handleUpdate(enquiry, { status: newStatus });
  };

  const handleMarkReadToggle = async (enquiry) => {
    await handleUpdate(enquiry, { isRead: !enquiry.isRead });
  };

  const filteredEnquiries = useMemo(() => {
    let list = enquiries;

    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }

    if (showUnreadOnly) {
      list = list.filter((e) => !e.isRead);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();

    return list.filter((e) => {
      const name = (e.name || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      const phone = (e.phone || "").toLowerCase();
      const subject = (e.subject || "").toLowerCase();
      const message = (e.message || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        subject.includes(q) ||
        message.includes(q)
      );
    });
  }, [enquiries, search, statusFilter, showUnreadOnly]);

  const statusBadgeStyle = (status) => {
    const base = {
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    };

    switch (status) {
      case "in-progress":
        return {
          ...base,
          backgroundColor: "#f9731620",
          color: "#f97316",
        };
      case "resolved":
        return {
          ...base,
          backgroundColor:
            (themeColors.success || themeColors.primary) + "20",
          color: themeColors.success || themeColors.primary,
        };
      case "closed":
        return {
          ...base,
          backgroundColor: themeColors.border,
          color: themeColors.text,
        };
      default: // new
        return {
          ...base,
          backgroundColor: "#0ea5e920",
          color: "#0ea5e9",
        };
    }
  };

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: currentFont.family }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaInbox />
            Customer Enquiries
          </h1>
          <p
            className="text-sm opacity-60"
            style={{ color: themeColors.text }}
          >
            Manage and track customer feedback from the contact form.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-1.5" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
            <FaFilter size={12} className="opacity-40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 outline-none"
              style={{ color: themeColors.text }}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Unread only */}
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
              showUnreadOnly 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            style={!showUnreadOnly ? { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text } : {}}
          >
            <div className={`w-4 h-4 rounded flex items-center justify-center border ${showUnreadOnly ? 'bg-white' : 'bg-slate-50 border-slate-200'}`}>
              {showUnreadOnly && <FaCheck size={10} className="text-blue-600" />}
            </div>
            Unread only
          </button>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs opacity-50">
              <FaSearch style={{ color: themeColors.text }} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search enquiries..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchEnquiries}
            className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors hover:bg-slate-50"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                backgroundColor: themeColors.danger + "15",
                borderColor: themeColors.danger + "50",
                color: themeColors.danger,
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                backgroundColor:
                  (themeColors.success || themeColors.primary) +
                  "15",
                borderColor:
                  (themeColors.success || themeColors.primary) +
                  "50",
                color:
                  themeColors.success || themeColors.primary,
              }}
            >
              {success}
            </div>
          )}
        </div>
      )}

      {/* Layout: Table + Detail panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table side */}
        <div
          className="xl:col-span-2 p-6 rounded-xl border"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center justify-between"
            style={{ color: themeColors.text }}
          >
            <span className="flex items-center gap-2">
              <FaEnvelopeOpenText />
              Enquiry List
            </span>
            <span className="text-xs opacity-70">
              {filteredEnquiries.length} of {enquiries.length} shown
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: themeColors.background + "30",
                  }}
                >
                  {[
                    "Name",
                    "Contact",
                    "Subject",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: themeColors.text }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: themeColors.border }}
              >
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: themeColors.text }}
                    >
                      Loading enquiries...
                    </td>
                  </tr>
                ) : filteredEnquiries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: themeColors.text }}
                    >
                      No enquiries found.
                    </td>
                  </tr>
                ) : (
                  filteredEnquiries.map((e) => {
                    const id = e._id || e.id || "-";
                    const isSelected =
                      selected && (selected._id || selected.id) === id;

                    return (
                      <tr
                        key={id}
                        className="group cursor-pointer transition-all hover:bg-slate-50 border-b last:border-0"
                        onClick={() => setSelected(e)}
                        style={{
                          backgroundColor: isSelected
                            ? (themeColors.primary || "#3b82f6") + "08"
                            : "transparent",
                          borderColor: themeColors.border
                        }}
                      >
                        {/* 1. Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-white shadow-sm overflow-hidden">
                                {e.name ? e.name.charAt(0).toUpperCase() : <FaUser size={14} />}
                              </div>
                              {!e.isRead && (
                                <span
                                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                                  style={{
                                    backgroundColor: themeColors.primary || "#3b82f6",
                                  }}
                                />
                              )}
                            </div>
                            <div className={`text-sm font-bold ${!e.isRead ? 'text-slate-900' : 'text-slate-600'}`} style={{ color: themeColors.text }}>
                              {e.name || "Anonymous"}
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact */}
                        <td className="px-6 py-4">
                           <div className="text-[11px] opacity-70 flex flex-col gap-1" style={{ color: themeColors.text }}>
                              {e.email ? <span className="flex items-center gap-1.5"><FaEnvelope size={10} className="opacity-50" /> {e.email}</span> : <span className="opacity-40">-</span>}
                              {e.phone ? <span className="flex items-center gap-1.5"><FaPhone size={10} className="opacity-50" /> {e.phone}</span> : <span className="opacity-40">-</span>}
                           </div>
                        </td>

                        {/* 3. Subject */}
                        <td className="px-6 py-4 max-w-[200px]">
                          <div className={`text-sm tracking-tight mb-0.5 ${!e.isRead ? 'font-bold text-slate-900' : 'text-slate-600'}`} style={{ color: themeColors.text }}>
                            {e.subject || "No Subject"}
                          </div>
                          <div 
                            className="text-xs opacity-50 truncate" 
                            style={{ color: themeColors.text }} 
                            title={e.message}
                          >
                            {e.message ? (e.message.length > 40 ? e.message.substring(0, 40) + "..." : e.message) : ""}
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <div style={statusBadgeStyle(e.status || "new")}>
                              {e.status || "new"}
                            </div>
                            <select
                              value={e.status || "new"}
                              disabled={!isLoggedIn || saving}
                              onClick={(ev) => ev.stopPropagation()}
                              onChange={(ev) => handleStatusChange(e, ev.target.value)}
                              className="text-[10px] font-bold bg-slate-50 rounded-lg px-2 py-1 outline-none border-transparent focus:border-slate-300 transition-colors cursor-pointer"
                              style={{ color: themeColors.text }}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* 5. Created */}
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-xs opacity-60 flex items-center gap-1.5" style={{ color: themeColors.text }}>
                             <FaClock size={11} className="opacity-50" />
                             {fmtDateTime(e.createdAt)}
                           </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            disabled={!isLoggedIn || saving}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleMarkReadToggle(e);
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              e.isRead 
                                ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                            title={e.isRead ? "Mark as unread" : "Mark as read"}
                          >
                            <FaEnvelopeOpenText size={16} />
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

        {/* Detail panel */}
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaEnvelopeOpenText />
            Enquiry Details
          </h2>

          {!selected ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale">
               <FaEnvelopeOpenText size={64} className="mb-4 text-slate-300" />
               <p className="text-sm font-bold text-slate-400">Select an enquiry to view details</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl shadow-sm">
                  {selected.name ? selected.name.charAt(0).toUpperCase() : <FaUser />}
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 leading-none mb-2" style={{ color: themeColors.text }}>
                     {selected.name || "Anonymous"}
                   </h3>
                   <div className="flex items-center gap-2">
                      <div style={statusBadgeStyle(selected.status || "new")}>{selected.status}</div>
                      <div className="text-[10px] font-black uppercase text-slate-300 tracking-tighter">ID: {selected._id?.slice(-6).toUpperCase()}</div>
                   </div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100 space-y-4 shadow-sm" style={{ backgroundColor: themeColors.background + '30' }}>
                 <div className="grid grid-cols-1 gap-4">
                   {selected.email && (
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0"><FaEnvelope size={14} /></div>
                       <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email Address</p>
                         <p className="text-sm font-bold text-slate-700 break-all" style={{ color: themeColors.text }}>{selected.email}</p>
                       </div>
                     </div>
                   )}
                   {selected.phone && (
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm"><FaPhone size={14} /></div>
                       <div>
                         <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Phone Number</p>
                         <p className="text-sm font-bold text-slate-700" style={{ color: themeColors.text }}>{selected.phone}</p>
                       </div>
                     </div>
                   )}
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm"><FaClock size={14} /></div>
                     <div>
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Received On</p>
                       <p className="text-sm font-bold text-slate-700" style={{ color: themeColors.text }}>{fmtDateTime(selected.createdAt)}</p>
                     </div>
                   </div>
                 </div>
              </div>

              {/* Message Content */}
              <div className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-400">
                    <div className="h-px bg-slate-100 flex-1"></div>
                    <span className="text-[10px] uppercase font-black tracking-widest">Message Content</span>
                    <div className="h-px bg-slate-100 flex-1"></div>
                 </div>
                 <h4 className="text-lg font-bold text-slate-800 tracking-tight px-1" style={{ color: themeColors.text }}>
                    {selected.subject || "No Subject Provided"}
                 </h4>
                 <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-md relative min-h-[150px] overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-full opacity-10 group-hover:opacity-100 transition-opacity"></div>
                    <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap" style={{ color: themeColors.text + 'cc' }}>
                       {selected.message || "No message content was provided by the customer."}
                    </p>
                 </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                 <button
                   onClick={() => handleMarkReadToggle(selected)}
                   className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                     selected.isRead 
                       ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                       : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                   }`}
                 >
                   <FaEnvelopeOpenText /> {selected.isRead ? "Unread" : "Mark Read"}
                 </button>
                 
                 <div className="flex-1 min-w-[140px] relative">
                    <select
                      value={selected.status || "new"}
                      disabled={!isLoggedIn || saving}
                      onChange={(e) => handleStatusChange(selected, e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm font-bold focus:ring-0 border-none appearance-none outline-none cursor-pointer"
                      style={{ color: themeColors.text }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>SET TO {s.toUpperCase()}</option>
                      ))}
                    </select>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
