import { useEffect, useState } from "react";
import { getRentalPlans, createRentalPlan, updateRentalPlan, deleteRentalPlan } from "../apis/rentalPlans";
import { FaEdit, FaTrash, FaPlus, FaImage, FaCheck, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";

export default function RentalPlanManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    planName: "",
    price: "",
    tag: "",
    installationCost: "Free",
    deposit: "None",
    features: "", // We'll handle this as newline separated string for input simplicity
    image: null, 
    isActive: true,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getRentalPlans();
      setPlans(data || []);
    } catch (error) {
      console.error("Failed to fetch plans", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({
      planName: "",
      price: "",
      tag: "",
      installationCost: "Free",
      deposit: "None",
      features: "",
      image: null,
      isActive: true,
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setModalMode("edit");
    setSelectedPlanId(plan._id);
    setFormData({
      planName: plan.planName,
      price: plan.price,
      tag: plan.tag || "",
      installationCost: plan.installationCost || "Free",
      deposit: plan.deposit || "None",
      features: plan.features ? plan.features.join("\n") : "",
      image: null, // Keep null unless changing
      isActive: plan.isActive,
    });
    setImagePreview(plan.image?.url || null);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare FormData
    const submissionData = new FormData();
    submissionData.append("planName", formData.planName);
    submissionData.append("price", formData.price);
    submissionData.append("tag", formData.tag);
    submissionData.append("installationCost", formData.installationCost);
    submissionData.append("deposit", formData.deposit);
    submissionData.append("isActive", formData.isActive);

    // Convert newline features specific string back to JSON string array for backend processing
    const featuresArray = formData.features.split("\n").filter(f => f.trim() !== "");
    submissionData.append("features", JSON.stringify(featuresArray));

    if (formData.image) {
      submissionData.append("image", formData.image);
    }

    try {
      if (modalMode === "create") {
         await createRentalPlan(submissionData);
         Swal.fire("Success", "Rental Plan Created", "success");
      } else {
         await updateRentalPlan(selectedPlanId, submissionData);
         Swal.fire("Success", "Rental Plan Updated", "success");
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Operation Failed", "error");
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
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteRentalPlan(id);
        Swal.fire("Deleted!", "Plan has been deleted.", "success");
        fetchPlans();
      } catch (error) {
        Swal.fire("Error", "Failed to delete plan.", "error");
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rental Plans Management</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <FaPlus /> Add New Plan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group">
              {/* Status Badge */}
               <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${plan.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {plan.isActive ? "Active" : "Inactive"}
               </div>

              {/* Tag Badge */}
              {plan.tag && (
                 <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 uppercase">
                    {plan.tag}
                 </div>
              )}

              <div className="h-48 overflow-hidden bg-gray-100">
                <img
                  src={plan.image?.url}
                  alt={plan.planName}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.planName}</h3>
                <div className="text-2xl font-black text-blue-600 mb-4">₹{plan.price}<span className="text-sm text-gray-400 font-normal">/mo</span></div>
                
                <div className="space-y-2 mb-4">
                   <div className="flex justify-between text-sm text-gray-600 border-b border-gray-50 pb-1">
                      <span>Deposit</span>
                      <span className="font-semibold">{plan.deposit}</span>
                   </div>
                   <div className="flex justify-between text-sm text-gray-600 border-b border-gray-50 pb-1">
                      <span>Installation</span>
                      <span className="font-semibold">{plan.installationCost}</span>
                   </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Features</p>
                  <ul className="grid grid-cols-1 gap-1">
                    {plan.features.slice(0, 3).map((feat, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-center gap-1.5">
                             <FaCheck className="text-green-500 text-[10px]" /> {feat}
                        </li>
                    ))}
                    {plan.features.length > 3 && (
                        <li className="text-xs text-blue-500 font-medium">+ {plan.features.length - 3} more</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan._id)}
                    className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {modalMode === "create" ? "Add New Plan" : "Edit Plan"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Basic Info */}
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                        <input
                        type="text"
                        name="planName"
                        value={formData.planName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Premium RO"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (₹)</label>
                        <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="499"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag (Optional)</label>
                        <input
                        type="text"
                        name="tag"
                        value={formData.tag}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Most Popular"
                        />
                    </div>
                 </div>

                 {/* Costs */}
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Installation Cost</label>
                        <input
                        type="text"
                        name="installationCost"
                        value={formData.installationCost}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Free or ₹500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Refundable Deposit</label>
                        <input
                        type="text"
                        name="deposit"
                        value={formData.deposit}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. ₹1000 Refundable"
                        />
                    </div>

                     <div className="flex items-center gap-2 pt-6">
                        <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 select-none">Plan is Active</label>
                    </div>
                 </div>
              </div>

              {/* Features - Text Area for simplicity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features (One per line)
                </label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  placeholder="Free Installation&#10;Unlimited Service&#10;Lifetime Warranty"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {imagePreview ? (
                        <div className="relative w-full max-w-xs mx-auto h-48 rounded-lg overflow-hidden shadow-sm">
                             <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400">
                            <FaImage className="text-4xl mb-2" />
                            <span className="text-sm font-medium">Click to upload image</span>
                        </div>
                    )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
                >
                  {modalMode === "create" ? "Create Plan" : "Update Plan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
