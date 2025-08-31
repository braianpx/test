import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, UserPlus, LogIn } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

 // Esquema del formulario de inicio de sesión
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(1, "El nombre de usuario es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// Esquema del formulario de registro
const registerSchema = insertUserSchema.extend({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  role: z.enum(["admin", "supervisor", "surveyor"]).default("surveyor"),
});

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "surveyor",
    },
  });

  // Handle login submit
  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Handle registration submit
  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  // Login with demo accounts
  const loginWithDemo = (account: string) => {
    let credentials = { username: "", password: "" };
    
    switch(account) {
      case "admin":
        credentials = { username: "admin", password: "admin" };
        break;
      case "supervisor":
        credentials = { username: "super", password: "super" };
        break;
      case "surveyor":
        credentials = { username: "encuesta", password: "encuesta" };
        break;
    }
    
    loginMutation.mutate(credentials);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Lado izquierdo - Marca e Información */}
      <div className="md:w-1/2 bg-primary p-8 flex flex-col justify-center items-center text-white">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center mb-8">
            <ClipboardCheck className="h-12 w-12 mr-2" />
            <h1 className="text-3xl font-bold">Sistema de Encuestas</h1>
          </div>
          <h2 className="text-xl font-semibold mb-4">Gestión Inteligente de Encuestas</h2>
          <p className="mb-6">
            Un sistema integral para crear encuestas, gestionar equipos de campo y recolectar datos con seguimiento en tiempo real y análisis avanzados.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Seguimiento en Tiempo Real</h3>
              <p className="text-sm text-white/80">Monitorea equipos de campo con localización GPS en tiempo real</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Encuestas Personalizadas</h3>
              <p className="text-sm text-white/80">Crea y asigna encuestas personalizadas a zonas geográficas específicas</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Soporte Offline</h3>
              <p className="text-sm text-white/80">Trabaja sin internet y sincroniza cuando vuelvas a estar conectado</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Análisis Avanzados</h3>
              <p className="text-sm text-white/80">Obtén análisis detallados y visualizaciones de los datos recolectados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado derecho - Formularios de autenticación */}
      <div className="md:w-1/2 bg-gray-50 p-8 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {activeTab === "login" ? "Iniciar sesión en tu cuenta" : "Crear una nueva cuenta"}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === "login"
                ? "Ingresa tus credenciales para acceder al sistema"
                : "Completa tus datos para crear una cuenta"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              {/* Formulario de inicio de sesión */}
              <TabsContent value="login" className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuario</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingresa tu usuario" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Ingresa tu contraseña"
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-primary"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                          {/* ... mismo ícono de carga ... */}
                        </svg>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Iniciar Sesión
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 px-2 text-gray-500">O accede con cuentas de prueba</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => loginWithDemo("admin")}>
                    Admin
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loginWithDemo("supervisor")}>
                    Supervisor
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loginWithDemo("surveyor")}>
                    Encuestador
                  </Button>
                </div>
              </TabsContent>

              {/* Formulario de registro */}
              <TabsContent value="register" className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuario</FormLabel>
                          <FormControl>
                            <Input placeholder="Elige un nombre de usuario" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingresa tu nombre completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Crea una contraseña"
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-primary"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                          {/* ... mismo ícono de carga ... */}
                        </svg>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Crear Cuenta
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-600">
            {activeTab === "login" ? (
              <p className="w-full">
                ¿No tienes una cuenta?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setActiveTab("register")}
                >
                  Regístrate ahora
                </button>
              </p>
            ) : (
              <p className="w-full">
                ¿Ya tienes una cuenta?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setActiveTab("login")}
                >
                  Inicia sesión
                </button>
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

