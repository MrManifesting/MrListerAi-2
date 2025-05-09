import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Store,
  LayoutDashboard,
  Archive,
  ShoppingCart,
  LineChart,
  DollarSign,
  Heart,
  Settings,
  Crown,
  X,
} from "lucide-react";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, href, isActive, onClick }: NavItemProps) => (
  <Link 
    href={href}
    onClick={onClick}
    className={cn(
      "flex items-center px-3 py-2.5 text-sm font-medium rounded-md",
      isActive
        ? "bg-primary-50 text-primary-700"
        : "text-gray-700 hover:bg-gray-100"
    )}
  >
    <span
      className={cn(
        "text-lg mr-3",
        isActive ? "text-primary" : "text-gray-500"
      )}
    >
      {icon}
    </span>
    {label}
  </Link>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const [isMobileView, setIsMobileView] = useState(false);

  // Get user subscription data
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItemProps = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      href: "/",
      isActive: location === "/",
    },
    {
      icon: <Archive size={20} />,
      label: "Inventory",
      href: "/inventory",
      isActive: location === "/inventory",
    },
    {
      icon: <ShoppingCart size={20} />,
      label: "Marketplaces",
      href: "/marketplaces",
      isActive: location === "/marketplaces",
    },
    {
      icon: <LineChart size={20} />,
      label: "Analytics",
      href: "/analytics",
      isActive: location === "/analytics",
    },
    {
      icon: <Store size={20} />,
      label: "Stores",
      href: "/stores",
      isActive: location === "/stores",
    },
    {
      icon: <DollarSign size={20} />,
      label: "Payments",
      href: "/payments",
      isActive: location === "/payments",
    },
    {
      icon: <Heart size={20} />,
      label: "Donations",
      href: "/donations",
      isActive: location === "/donations",
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      href: "/settings",
      isActive: location === "/settings",
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 transition duration-300 ease-in-out md:relative md:translate-x-0",
        isMobileView ? (isOpen ? "translate-x-0" : "-translate-x-full") : ""
      )}
    >
      {/* Logo and App Name */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-primary rounded-md">
            <Store className="text-xl text-white" size={20} />
          </div>
          <span className="text-lg font-semibold text-gray-900">Mr. Lister</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 rounded-md hover:bg-gray-100 md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-2 space-y-1">
        {navItemProps.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            onClick={isMobileView ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Subscription Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-md p-1.5">
              <Crown className="text-primary-600" size={18} />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                {user?.subscription === "premium"
                  ? "Premium Plan"
                  : user?.subscription === "manager"
                  ? "Manager Plan"
                  : "Basic Plan"}
              </h3>
              <p className="text-xs text-gray-500">
                Valid until{" "}
                {new Date(
                  user?.subscriptionValidUntil || new Date()
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
          {user?.subscription !== "manager" && (
            <div className="mt-3">
              <Button
                variant="link"
                className="text-sm font-medium text-primary hover:text-primary-700 p-0"
              >
                Upgrade to Manager →
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
