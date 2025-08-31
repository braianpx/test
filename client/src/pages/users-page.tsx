import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { UserForm } from "@/components/users/user-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el usuario: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Sort and filter users
  const filteredAndSortedUsers = users
    ? users
        .filter(
          (user) =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          const fieldA = a[sortField as keyof User];
          const fieldB = b[sortField as keyof User];
          const direction = sortDirection === "asc" ? 1 : -1;

          if (typeof fieldA === "string" && typeof fieldB === "string") {
            return fieldA.localeCompare(fieldB) * direction;
          }

          return 0;
        })
    : [];

  // Handle sort click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  // Handle create new user
  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle form close
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
  };

  // Role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "supervisor":
        return "bg-blue-100 text-blue-800";
      case "surveyor":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <main className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <Header
              title="Gestión de Usuarios"
              subtitle="Administra los usuarios y sus roles en el sistema"
            />

            <Button
              className="mt-4 md:mt-0 bg-primary"
              onClick={handleCreateUser}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </div>

          <Card className="border border-gray-200">
            <CardHeader className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 mb-4 md:mb-0">
                  Todos los Usuarios
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar usuarios"
                    className="pl-8 w-full md:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="w-[250px] cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center">
                          Nombre
                          {sortField === "name" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-1 h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("username")}
                      >
                        <div className="flex items-center">
                          Usuario
                          {sortField === "username" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-1 h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center">
                          Rol
                          {sortField === "role" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-1 h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="flex justify-center">
                            <svg
                              className="animate-spin h-8 w-8 text-primary"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </div>
                          <div className="mt-2 text-gray-600">
                            Cargando usuarios...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAndSortedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="rounded-full bg-gray-100 p-3 w-12 h-12 mx-auto flex items-center justify-center mb-4">
                            <UserPlus className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="text-lg font-medium text-gray-900 mb-1">
                            No se encontraron usuarios
                          </div>
                          <div className="text-gray-600 mb-4">
                            {searchTerm
                              ? "Prueba con otro término de búsqueda o"
                              : "Comienza creando un nuevo usuario."}
                          </div>
                          <Button
                            className="bg-primary"
                            onClick={handleCreateUser}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Crear Usuario
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-primary-100 text-primary flex items-center justify-center mr-2">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              {user.name}
                            </div>
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role.charAt(0).toUpperCase() +
                                user.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                {/* Only allow deletion if not current user */}
                                {currentUser?.id !== user.id && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Create/Edit User Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Editar Usuario" : "Crear Usuario"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? "Actualiza la información y el rol del usuario."
                  : "Agrega un nuevo usuario al sistema."}
              </DialogDescription>
            </DialogHeader>

            <UserForm
              user={selectedUser || undefined}
              onSuccess={handleFormClose}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Eliminar Usuario</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar a{" "}
                {selectedUser?.name}? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  selectedUser && deleteMutation.mutate(selectedUser.id)
                }
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MobileNavigation />
      </div>
    </div>
  );
}
