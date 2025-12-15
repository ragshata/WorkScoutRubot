import { Routes, Route } from "react-router-dom";

import Splash from "../pages/Splash/Splash";
import RoleSelect from "../pages/RoleSelect/RoleSelect";
import RegisterExecutor from "../pages/Register/RegisterExecutor";
import RegisterCustomer from "../pages/Register/RegisterCustomer";
import Welcome from "../pages/Welcome/Welcome";
import Support from "../pages/Support/Support";
import Profile from "../pages/Profile/Profile";
import CreateOrder from "../pages/Orders/CreateOrder";
import CustomerOrders from "../pages/Orders/CustomerOrders";
import ExecutorOrders from "../pages/Orders/ExecutorOrders";
import ExecutorResponses from "../pages/Responses/ExecutorResponses";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import BlockedPage from "../pages/Auth/Blocked";

import TelegramBackButtonManager from "../components/telegram/TelegramBackButtonManager";

export default function AppRoutes() {
  return (
    <>
      <TelegramBackButtonManager />

      <Routes>
        {/* Стартовая страница обязательно должна быть Splash */}
        <Route path="/" element={<Splash />} />

        {/* Далее логика */}
        <Route path="/role" element={<RoleSelect />} />
        <Route path="/reg/executor" element={<RegisterExecutor />} />
        <Route path="/reg/customer" element={<RegisterCustomer />} />
        <Route path="/welcome/:role" element={<Welcome />} />
        <Route path="/support" element={<Support />} />
        <Route path="/executor/profile" element={<Profile />} />
        <Route path="/customer/profile" element={<Profile />} />
        <Route path="/customer/orders/new" element={<CreateOrder />} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/executor/orders" element={<ExecutorOrders />} />
        <Route path="/executor/responses" element={<ExecutorResponses />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/blocked" element={<BlockedPage />} />
      </Routes>
    </>
  );
}
