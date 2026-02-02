import { useEffect, useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
// import { useAuth } from "../context/AuthContext";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../apis/employees";
import {
  FaUserTie,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSyncAlt,
  FaTable,
  FaThLarge,
  FaEye,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "", // Only for creation/reset
  role: "Employee",
  designation: "",
  address: "",
  joiningDate: new Date().toISOString().split("T")[0],
  status: true,
};

export default function Employees() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  // const { isLoggedIn } = useAuth(); // Assuming auth context is available

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Fetch employees
  const fetchEmployeesList = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load employees", error);
      Swal.fire("Error", "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  // Filtered list
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.phone?.includes(q) ||
        emp.designation?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  // Form handlers
  const openAddModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditing(emp);
    setForm({
      ...emp,
      password: "", // Don't show hash
      joiningDate: emp.joiningDate ? emp.joiningDate.split("T")[0] : "",
    });
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      Swal.fire("Error", "Please fill in all required fields", "warning");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        // Update
        const updates = { ...form };
        if (!updates.password) delete updates.password; // Don't send empty password if not changing
        await updateEmployee(editing._id, updates);
        Swal.fire("Success", "Employee updated successfully", "success");
      } else {
        // Create
        if (!form.password) {
          Swal.fire("Error", "Password is required for new employees", "warning");
          setSaving(false);
          return;
        }
        await createEmployee(form);
        Swal.fire("Success", "Employee created successfully", "success");
      }
      setIsModalOpen(false);
      fetchEmployeesList();
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Operation failed",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    const result = await Swal.fire({
      title: `Delete ${emp.name}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteEmployee(emp._id);
        Swal.fire("Deleted!", "Employee has been deleted.", "success");
        fetchEmployeesList();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete employee", "error");
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
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaUserTie className="text-blue-500" />
            Manage Employees
          </h1>
          <p
            className="text-sm opacity-60"
            style={{ color: themeColors.text }}
          >
            View, add, edit and manage your team members.
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
              placeholder="Search employees..."
              className="pl-8 pr-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          <button
            onClick={fetchEmployeesList}
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

          {/* View toggle (Visually present, defaults to Table for now) */}
          <div
            className="flex items-center rounded-lg overflow-hidden border text-sm"
            style={{ borderColor: themeColors.border }}
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 flex items-center justify-center transition-all ${
                viewMode === "table" ? "bg-slate-100 dark:bg-slate-700" : ""
              }`}
              style={{ color: themeColors.text }}
              title="Table View"
            >
              <FaTable size={18} className="m-1" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-2 flex items-center justify-center border-l transition-all ${
                viewMode === "card" ? "bg-slate-100 dark:bg-slate-700" : ""
              }`}
              style={{ borderColor: themeColors.border, color: themeColors.text }}
              title="Card View"
            >
              <FaThLarge size={18} className="m-1" />
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <FaPlus />
            Add Employee
          </button>
        </div>
      </div>

      {/* Content */}
      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div
          className="rounded-xl shadow-sm overflow-hidden border"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center opacity-60">
              No employees found.
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    style={{
                      backgroundColor: themeColors.background,
                      color: themeColors.textSecondary,
                    }}
                    className="text-sm uppercase tracking-wider border-b"
                  >
                    <th className="p-4 font-semibold">Name / Designation</th>
                    <th className="p-4 font-semibold">Contact</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Joining Date</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                  {Array.isArray(filteredEmployees) && filteredEmployees.map((emp) => (
                    <tr
                      key={emp._id}
                      className="hover:bg-opacity-50 transition"
                      style={{
                        backgroundColor: "transparent",
                        ":hover": { backgroundColor: themeColors.background },
                      }}
                    >
                      <td className="p-4">
                        <div className="font-bold">{emp.name}</div>
                        <div className="text-xs opacity-60">{emp.designation || "-"}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm">
                          <FaEnvelope className="opacity-50" /> {emp.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm opacity-80 mt-1">
                          <FaPhone className="opacity-50" /> {emp.phone}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            emp.status
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {emp.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-sm opacity-80">
                        {emp.joiningDate
                          ? new Date(emp.joiningDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewing(emp)}
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Card View
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {Array.isArray(filteredEmployees) && filteredEmployees.map((emp) => (
                <div 
                  key={emp._id} 
                  className="rounded-xl border p-5 flex flex-col gap-4 relative group hover:shadow-lg transition-all"
                  style={{ 
                    borderColor: themeColors.border, 
                    backgroundColor: themeColors.surface 
                  }}
                >
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                           {emp.name.charAt(0)}
                        </div>
                        <div>
                           <h3 className="font-bold text-lg leading-tight">{emp.name}</h3>
                           <p className="text-xs opacity-60">{emp.designation || "No Designation"}</p>
                        </div>
                     </div>
                     <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            emp.status
                              ? "bg-green-50 text-green-600 border border-green-100"
                              : "bg-red-50 text-red-600 border border-red-100"
                          }`}
                        >
                          {emp.status ? "Active" : "Inactive"}
                     </span>
                  </div>

                  <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 opacity-80">
                         <FaEnvelope className="opacity-50" />
                         <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-80">
                         <FaPhone className="opacity-50" />
                         <span>{emp.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-80">
                         <FaMapMarkerAlt className="opacity-50" />
                         <span className="truncate">{emp.address || "No Address"}</span>
                      </div>
                  </div>

                  <div className="pt-3 mt-auto border-t flex justify-between items-center" style={{ borderColor: themeColors.border }}>
                      <span className="text-xs opacity-50 font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                         {emp.role}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewing(emp)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition"
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            style={{
              backgroundColor: themeColors.surface,
              color: themeColors.text,
            }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold">
                {editing ? "Edit Employee" : "Add New Employee"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Email */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Phone */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Role */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                {/* Designation */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Joining Date */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">Joining Date</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={form.joiningDate}
                    onChange={handleChange}
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows="2"
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Password (Only if creating or you want to update) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1">
                    {editing ? "New Password (Optional)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editing ? "Leave blank to keep current" : "Enter secure password"}
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {/* Status */}
                <div className="col-span-1 flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="status"
                      checked={form.status}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Active Account</span>
                  </label>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: themeColors.border }}>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  "Save Employee"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            style={{
              backgroundColor: themeColors.surface,
              color: themeColors.text,
            }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: themeColors.border }}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaUserTie className="text-blue-500" />
                Employee Details
              </h2>
              <button
                onClick={() => {
                  setViewing(null);
                  setShowPassword(false);
                }}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {viewing.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{viewing.name}</h3>
                  <p className="text-sm opacity-60">{viewing.designation || "No Designation"}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${
                      viewing.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {viewing.status ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email - Full Width */}
                <div className="col-span-1 md:col-span-2 p-3 rounded-lg border" style={{ borderColor: themeColors.border }}>
                  <p className="text-xs opacity-60 mb-1">Email Address</p>
                  <div className="flex items-center gap-2 font-medium break-all">
                    <FaEnvelope className="text-blue-500 shrink-0" /> 
                    {viewing.email}
                  </div>
                </div>

                {/* Phone */}
                <div className="p-3 rounded-lg border" style={{ borderColor: themeColors.border }}>
                  <p className="text-xs opacity-60 mb-1">Phone Number</p>
                  <div className="flex items-center gap-2 font-medium">
                    <FaPhone className="text-blue-500 shrink-0" /> {viewing.phone}
                  </div>
                </div>

                {/* Role */}
                <div className="p-3 rounded-lg border" style={{ borderColor: themeColors.border }}>
                  <p className="text-xs opacity-60 mb-1">Role</p>
                  <div className="font-medium">{viewing.role}</div>
                </div>

                {/* Joining Date */}
                <div className="p-3 rounded-lg border" style={{ borderColor: themeColors.border }}>
                  <p className="text-xs opacity-60 mb-1">Joining Date</p>
                  <div className="font-medium">
                    {viewing.joiningDate ? new Date(viewing.joiningDate).toLocaleDateString("en-IN") : "-"}
                  </div>
                </div>

                {/* Password - Toggle Visibility */}
                <div className="p-3 rounded-lg border" style={{ borderColor: themeColors.border }}>
                   <div className="flex justify-between items-center mb-1">
                      <p className="text-xs opacity-60">Password (Hash)</p>
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-blue-500 focus:outline-none"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <FaTimes size={12} /> : <FaEye size={12} />}
                      </button> 
                   </div>
                   <div className={`font-medium text-sm break-all ${showPassword ? "text-gray-700 dark:text-gray-300" : "text-gray-500 tracking-widest"}`}>
                      {showPassword ? (viewing.password || "No Password Set") : "••••••••"}
                   </div>
                </div>

                {/* Address - Full Width */}
                <div className="col-span-1 md:col-span-2 p-3 rounded-lg border" style={{ borderColor: themeColors.border }}>
                  <p className="text-xs opacity-60 mb-1">Address</p>
                  <div className="flex items-start gap-2 font-medium">
                    <FaMapMarkerAlt className="text-blue-500 mt-1 shrink-0" />
                    <span>{viewing.address || "No address provided"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: themeColors.border }}>
              <button
                onClick={() => {
                  setViewing(null);
                  setShowPassword(false);
                  openEditModal(viewing);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2"
              >
                <FaEdit />
                Edit Employee
              </button>
              <button
                onClick={() => {
                  setViewing(null);
                  setShowPassword(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
