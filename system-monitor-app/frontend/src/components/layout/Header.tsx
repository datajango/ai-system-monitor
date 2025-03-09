// frontend/src/components/layout/Header.tsx
import { Menu, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const Header = ({ mobileMenuOpen, setMobileMenuOpen }: HeaderProps) => {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState("");
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    // Set page title based on current route
    const path = location.pathname;

    if (path === "/") {
      setPageTitle("Dashboard");
    } else if (path.startsWith("/snapshots") && path.length > 10) {
      setPageTitle("Snapshot Details");
    } else if (path.startsWith("/snapshots")) {
      setPageTitle("System Snapshots");
    } else if (path.startsWith("/analysis")) {
      setPageTitle("Analysis Results");
    } else if (path.startsWith("/config")) {
      setPageTitle("Configuration");
    } else {
      setPageTitle("System Monitor");
    }
  }, [location]);

  const toggleDarkMode = () => {
    dispatch({ type: "TOGGLE_DARK_MODE" });
  };

  return (
    <header className="bg-white shadow-sm z-10 dark:bg-gray-800 dark:text-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            <h1 className="ml-2 md:ml-0 text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              onClick={toggleDarkMode}
            >
              {state.darkMode ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="sr-only">
                {state.darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
