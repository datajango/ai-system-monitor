// frontend/src/components/layout/Sidebar.tsx
import { Fragment } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import {
  X,
  Home,
  Database,
  BarChart,
  Settings,
  MenuIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import { useAppContext } from "../../context/AppContext";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Snapshots", href: "/snapshots", icon: Database },
  { name: "Analysis", href: "/analysis", icon: BarChart },
  { name: "Configuration", href: "/config", icon: Settings },
];

const Sidebar = ({ isOpen, setIsOpen, isCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { dispatch } = useAppContext();

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleSidebar = () => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  };

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 md:hidden"
          onClose={setIsOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex flex-col flex-1 w-full max-w-xs pt-5 pb-4 bg-primary-800">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 pt-2 -mr-12">
                    <button
                      type="button"
                      className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={closeSidebar}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="w-6 h-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>

                <div className="flex items-center flex-shrink-0 px-4">
                  <h1 className="text-xl font-bold text-white">
                    System Monitor
                  </h1>
                </div>

                <div className="flex-1 h-0 mt-5 overflow-y-auto">
                  <nav className="px-2 space-y-1">
                    {navigation.map((item) => {
                      const isActive =
                        location.pathname === item.href ||
                        (item.href !== "/" &&
                          location.pathname.startsWith(item.href));

                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={closeSidebar}
                          className={({ isActive }) =>
                            clsx(
                              isActive
                                ? "bg-primary-900 text-white"
                                : "text-gray-300 hover:bg-primary-700 hover:text-white",
                              "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                            )
                          }
                        >
                          <item.icon
                            className={clsx(
                              isActive
                                ? "text-white"
                                : "text-gray-400 group-hover:text-gray-300",
                              "mr-4 h-6 w-6 flex-shrink-0"
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </NavLink>
                      );
                    })}
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div
        className={clsx(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-primary-800 transition-all duration-300",
          isCollapsed ? "md:w-16" : "md:w-64"
        )}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between flex-shrink-0 h-16 px-4">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-white">System Monitor</h1>
            )}
            <button
              type="button"
              className="text-gray-300 hover:text-white focus:outline-none"
              onClick={toggleSidebar}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex flex-col flex-1 overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/" &&
                    location.pathname.startsWith(item.href));

                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      clsx(
                        isActive
                          ? "bg-primary-900 text-white"
                          : "text-gray-300 hover:bg-primary-700 hover:text-white",
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        isCollapsed && "justify-center"
                      )
                    }
                    title={item.name}
                  >
                    <item.icon
                      className={clsx(
                        isActive
                          ? "text-white"
                          : "text-gray-400 group-hover:text-gray-300",
                        isCollapsed ? "w-6 h-6" : "mr-3 h-5 w-5 flex-shrink-0"
                      )}
                      aria-hidden="true"
                    />
                    {!isCollapsed && item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
