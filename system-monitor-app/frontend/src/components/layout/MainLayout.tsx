// frontend/src/components/layout/MainLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import Header from "./Header.tsx";
import { useAppContext } from "../../context/AppContext";

const MainLayout = () => {
  const { state } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={`flex h-screen bg-gray-100 ${state.darkMode ? "dark" : ""}`}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        setIsOpen={setMobileMenuOpen}
        isCollapsed={state.sidebarCollapsed}
      />

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 overflow-hidden ${
          state.sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
