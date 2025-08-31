import { Link, useLocation } from "wouter";
import { BarChart3Icon, ClipboardCheckIcon, UsersIcon, MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const links = [
    {
      href: "/",
      label: "Panel",
      icon: <BarChart3Icon size={20} />,
      active: location === "/",
      roles: ["admin", "supervisor", ],
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

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around p-2 z-10">
      {filteredLinks.map((link) => (
        <Link key={link.href} href={link.href}>
          <a
            className={cn(
              "flex flex-col items-center p-2 rounded",
              link.active ? "text-primary" : "text-gray-600"
            )}
          >
            {link.icon}
            <span className="text-xs mt-1">{link.label}</span>
          </a>
        </Link>
      ))}
    </div>
  );
}
