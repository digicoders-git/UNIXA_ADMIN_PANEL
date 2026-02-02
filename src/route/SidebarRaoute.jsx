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
} from "react-icons/fa";

// pages
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Categories = lazy(() => import("../pages/Categories"));
const Products = lazy(() => import("../pages/Products"));
const Offers = lazy(() => import("../pages/Offers"));
const Orders = lazy(() => import("../pages/Orders"));
const Enquiries = lazy(() => import("../pages/Enquiries"));
const Sliders = lazy(() => import("../pages/Sliders"));
const Blogs = lazy(() => import("../pages/Blogs"));
const Transactions = lazy(() => import("../pages/Transactions"));
const ChangePassword = lazy(() => import("../pages/ChangePassword"));
const Employees = lazy(() => import("../pages/Employees"));
const Customers = lazy(() => import("../pages/Customers"));
const AMCManagement = lazy(() => import("../pages/AMCManagement"));
const EmployeeAssets = lazy(() => import("../pages/EmployeeAssets"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Refunds = lazy(() => import("../pages/Refunds"));
const StockManagement = lazy(() => import("../pages/StockManagement"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },
  { path: "/categories", component: Categories, name: "Categories", icon: FaBox },
  { path: "/products", component: Products, name: "Products", icon: FaBox },
  { path: "/stock", component: StockManagement, name: "Stock Management", icon: FaDolly },
  { path: "/offers", component: Offers, name: "Offers", icon: FaCoins },
  { path: "/orders", component: Orders, name: "Orders", icon: FaShoppingCart },
  { path: "/transactions", component: Transactions, name: "Transactions", icon: FaCoins },
  { path: "/enquiries", component: Enquiries, name: "Enquiries", icon: FaEnvelopeOpenText },
  { path: "/sliders", component: Sliders, name: "Sliders", icon: FaImages },
  { path: "/blogs", component: Blogs, name: "Blogs", icon: FaBlog },
  { path: "/employees", component: Employees, name: "Employees", icon: FaUserTie },
  { path: "/employee-assets", component: EmployeeAssets, name: "Employee Assets", icon: FaArchive },
  { path: "/customers", component: Customers, name: "Customers", icon: FaUsers },
  { path: "/amc", component: AMCManagement, name: "AMC Management", icon: FaShieldAlt },
  { path: "/notifications", component: Notifications, name: "Notifications", icon: FaBell },
  { path: "/refunds", component: Refunds, name: "Refund Requests", icon: FaUndo },
  { path: "/change-password", component: ChangePassword, name: "Change Password", icon: FaKey },
];

export default routes;
