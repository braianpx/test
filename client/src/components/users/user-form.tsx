import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { insertUserSchema, User, updateUserSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, SaveIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserFormProps {
  user?: User;
  onSuccess?: (user: User) => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = user
    ? updateUserSchema
    : insertUserSchema.extend({
        username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
        name: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
        password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
        role: z.enum(["admin", "supervisor", "surveyor"]),
      });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      password: "",
      role: user?.role || "surveyor",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (user) {
        if (!data.password) {
          const { password, ...rest } = data;
          const res = await apiRequest("PATCH", `/api/users/${user.id}`, rest);
          return res.json();
        }
        const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: (newUser: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: user ? "Usuario actualizado" : "Usuario creado",
        description: `Se ${user ? "actualizó" : "creó"} correctamente "${newUser.name}".`,
      });
      if (onSuccess) onSuccess(newUser);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo ${user ? "actualizar" : "crear"} el usuario: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center mb-6">
          <div className="h-10 w-10 rounded-full bg-primary-100 text-primary flex items-center justify-center mr-3">
            <UserPlus className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold">
            {user ? "Actualizar Usuario" : "Crear Nuevo Usuario"}
          </h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el nombre de usuario" {...field} />
                    </FormControl>
                    <FormDescription>
                      El nombre de usuario debe ser único y se usará para iniciar sesión.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{user ? "Nueva Contraseña (opcional)" : "Contraseña"}</FormLabel>
                    <div className="flex relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder={user ? "Dejar en blanco para mantener la actual" : "Ingrese la contraseña"} 
                          {...field} 
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                    {user && (
                      <FormDescription>
                        Dejar en blanco para mantener la contraseña actual.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="surveyor">Encuestador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Esto determina las acciones que puede realizar el usuario en el sistema.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSuccess?.(user as User)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-primary">
                {mutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4 mr-1" />
                    {user ? "Actualizar Usuario" : "Crear Usuario"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
