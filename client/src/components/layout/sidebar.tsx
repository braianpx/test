import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  BellIcon, 
  BarChart3Icon, 
  UsersIcon, 
  MapIcon, 
  ClipboardCheckIcon, 
  LogOutIcon,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const links = [
    {
      href: "/",
      label: "Panel",
      icon: <BarChart3Icon size={20} />,
      active: location === "/",
      roles: ["admin", "supervisor"],
    },
    {
      href: "/surveys",
      label: "Encuestas",
      icon: <ClipboardCheckIcon size={20} />,
      active: location.startsWith("/surveys"),
      roles: ["admin", "supervisor", "surveyor"],
    },
    {
      href: "/users",
      label: "Usuarios",
      icon: <UsersIcon size={20} />,
      active: location.startsWith("/users"),
      roles: ["admin"],
    },
    {
      href: "/zones",
      label: "Zonas",
      icon: <MapIcon size={20} />,
      active: location.startsWith("/zones"),
      roles: ["admin", "supervisor"],
    },
  ];

  const filteredLinks = links.filter(link => link.roles.includes(user.role));

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">Sistema de Encuestas</h1>
      </div>
      
      <div className="overflow-y-auto overflow-x-hidden flex-grow">
        <div className="py-4 px-4">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary mb-4">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>

        <ul className="space-y-1 py-2">
          {filteredLinks.map((link) => (
            <li key={link.href} className="px-2">
              <Link href={link.href}>
                <a
                  className={cn(
                    "flex items-center p-2 rounded-lg hover:bg-gray-100",
                    link.active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700"
                  )}
                >
                  <span className={cn(link.active ? "text-primary" : "text-gray-600")}>
                    {link.icon}
                  </span>
                  <span className="ml-3">{link.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center text-gray-700 p-2 rounded-lg hover:bg-gray-100 w-full"
          >
            <LogOutIcon size={20} className="text-gray-600" />
            <span className="ml-3">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );

const MobileMenuButton = () => (
  <>
    <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between shadow-sm z-50">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <Menu size={24} />
        </Button>
        <h1 className="ml-3 text-lg font-bold text-primary">Sistema de Encuestas</h1>
      </div>
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
          <BellIcon size={20} />
        </Button>
        <Badge className="ml-1 bg-primary">{user.role}</Badge>
      </div>
    </div>

    {/* Este div "espaciador" evita que el contenido quede debajo del header */}
    <div className="md:hidden h-16"></div>
  </>
);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="bg-white shadow-lg border-r border-gray-200 hidden md:flex md:flex-col md:w-64 transition-all duration-300 ease-in-out">
        <SidebarContent />
      </div>

      {/* Mobile Header */}
      <MobileMenuButton />

      {/* Mobile Menu Dialog */}
      <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DialogContent className="p-0 w-3/4 max-w-xs rounded-r-none rounded-l-lg h-full ml-0 mr-auto">
          <div className="h-full flex flex-col">
            <SidebarContent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
