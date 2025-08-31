import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { navigate } from "wouter/use-browser-location";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Inicio de sesión exitoso",
        description: `¡Bienvenido de nuevo, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Usuario o contraseña incorrectos.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registro exitoso",
        description: `¡Bienvenido, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar usuario",
        description: error.message || "No se pudo crear la cuenta.",
        variant: "destructive",
      });
    },
  });

const logoutMutation = useMutation({
  mutationFn: async () => {
    await apiRequest("POST", "/api/logout");
  },
  onSuccess: () => {
    // Limpiar cache de queries
    queryClient.clear();

    // Limpiar datos del usuario
    queryClient.setQueryData(["/api/user"], null);

    // Limpiar localStorage/sessionStorage si tienes token
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");

    // Mensaje de éxito
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });

    // Redireccionar a login si usas react-router
    navigate("/auth");
  },
  onError: (error: Error) => {
    toast({
      title: "Error al cerrar sesión",
      description: error.message,
      variant: "destructive",
    });
  },
});


  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
