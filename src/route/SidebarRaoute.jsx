import { lazy } from "react";
import {
  FaCoins,
  FaUsers,
  FaBox,
  FaTachometerAlt,
  FaShoppingCart,
  FaEnvelopeOpenText,
  FaImages,
  FaKey,
  FaBlog,
  FaUserTie,
  FaShieldAlt,
  FaArchive,
  FaBell,
  FaUndo,
  FaDolly,
  FaWrench,
  FaTicketAlt,
} from "react-icons/fa";

// pages
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Categories = lazy(() => import("../pages/Categories"));
const Products = lazy(() => import("../pages/Products"));
const Offers = lazy(() => import("../pages/Offers"));
const Orders = lazy(() => import("../pages/Orders"));
const OfflineOrders = lazy(() => import("../pages/OfflineOrders")); // New
const Enquiries = lazy(() => import("../pages/Enquiries"));
const Sliders = lazy(() => import("../pages/Sliders"));
const Blogs = lazy(() => import("../pages/Blogs"));
const Transactions = lazy(() => import("../pages/Transactions"));
const ChangePassword = lazy(() => import("../pages/ChangePassword"));
const Employees = lazy(() => import("../pages/Employees"));
const Customers = lazy(() => import("../pages/Customers"));
const AMCManagement = lazy(() => import("../pages/AMCManagement"));
const AmcPlans = lazy(() => import("../pages/AmcPlans"));
const ServiceRequests = lazy(() => import("../pages/ServiceRequests"));
const EmployeeAssets = lazy(() => import("../pages/EmployeeAssets"));
const AssetsHistory = lazy(() => import("../pages/AssetsHistory"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Refunds = lazy(() => import("../pages/Refunds"));
const Certificates = lazy(() => import("../pages/Certificates"));
const Reviews = lazy(() => import("../pages/Reviews"));
const StockManagement = lazy(() => import("../pages/StockManagement"));
const ROParts = lazy(() => import("../pages/ROParts"));
const RentalPlanManagement = lazy(() => import("../pages/RentalPlanManagement"));
const AssignTicket = lazy(() => import("../pages/AssignTicket"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },
  { path: "/categories", component: Categories, name: "Categories", icon: FaBox },
  { path: "/products", component: Products, name: "Products", icon: FaBox },
  { path: "/ro-parts", component: ROParts, name: "RO Parts", icon: FaWrench },
  { path: "/rental-plans", component: RentalPlanManagement, name: "Rental Plans", icon: FaBox },
  { path: "/stock", component: StockManagement, name: "Stock Management", icon: FaDolly },
  { path: "/offers", component: Offers, name: "Offers", icon: FaCoins },
  
  // Orders Group
  {
    name: "Orders",
    icon: FaShoppingCart,
    children: [
       { path: "/orders", component: Orders, name: "Online Orders", icon: FaShoppingCart },
       { path: "/offline-orders", component: OfflineOrders, name: "Offline Orders", icon: FaShoppingCart },
    ]
  },

  { path: "/transactions", component: Transactions, name: "Transactions", icon: FaCoins },
  { path: "/enquiries", component: Enquiries, name: "Enquiries", icon: FaEnvelopeOpenText },
  { path: "/sliders", component: Sliders, name: "Sliders", icon: FaImages },
  { path: "/certificates", component: Certificates, name: "Certificates", icon: FaShieldAlt },
  { path: "/reviews", component: Reviews, name: "Reviews", icon: FaBlog },
  { path: "/blogs", component: Blogs, name: "Blogs", icon: FaBlog },
  { path: "/employees", component: Employees, name: "Employees", icon: FaUserTie },
  { path: "/employee-assets", component: EmployeeAssets, name: "Employee Assets", icon: FaArchive },
  { path: "/assets-history", component: AssetsHistory, name: "Assets History", icon: FaArchive },
  { path: "/customers", component: Customers, name: "Customers", icon: FaUsers },
  { path: "/amc-plans", component: AmcPlans, name: "AMC Plans", icon: FaShieldAlt },
  { path: "/amc", component: AMCManagement, name: "AMC Management", icon: FaShieldAlt },
  { path: "/service-requests", component: ServiceRequests, name: "Service Requests", icon: FaWrench },
  { path: "/assign-ticket", component: AssignTicket, name: "Assign Tickets", icon: FaTicketAlt },
  { path: "/notifications", component: Notifications, name: "Notifications", icon: FaBell },
  { path: "/refunds", component: Refunds, name: "Refund Requests", icon: FaUndo },
  { path: "/change-password", component: ChangePassword, name: "Change Password", icon: FaKey },
];

export default routes;
