import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      
      <div className="flex items-center mt-4 md:mt-0">
        <Button variant="ghost" size="icon" className="mr-2">
          <BellIcon className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary flex items-center justify-center mr-2">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium mr-2 hidden md:inline">{user?.name}</span>
          <Badge variant="outline" className="bg-primary text-white">
            {user?.role}
          </Badge>
        </div>
      </div>
    </div>
  );
}
