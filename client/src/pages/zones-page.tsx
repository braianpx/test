import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Zone, insertZoneSchema } from "@shared/schema";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Map,
} from "lucide-react";
import { MapView } from "../components/map/MapView";

export default function ZonesPage() {
  const { toast } = useToast();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: zones, isLoading, refetch  } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  const refreshZones = () => {
   queryClient.refetchQueries({ queryKey: ["/api/zones"] });
   refetch();
  }

  const formSchema = z.object({
    name: z.string().min(2, "El nombre de la zona debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    coordinatesJson: z.string().min(1, "Las coordenadas son obligatorias"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: selectedZone?.name || "",
      description: selectedZone?.description || "",
      coordinatesJson: selectedZone
        ? JSON.stringify(selectedZone.coordinates, null, 2)
        : JSON.stringify({
            type: "Polygon",
            coordinates: [
              [
                [-74.01, 40.73],
                [-74.02, 40.74],
                [-74.03, 40.73],
                [-74.02, 40.72],
                [-74.01, 40.73],
              ],
            ],
          }, null, 2),
    },
  });

  useEffect(() => {
    if (selectedZone) {
      form.reset({
        name: selectedZone.name,
        description: selectedZone.description || "",
        coordinatesJson: JSON.stringify(selectedZone.coordinates, null, 2),
      });
    } else {
      form.reset({
        name: "",
        description: "",
        coordinatesJson: JSON.stringify({
          type: "Polygon",
          coordinates: [
            [
              [-74.01, 40.73],
              [-74.02, 40.74],
              [-74.03, 40.73],
              [-74.02, 40.72],
              [-74.01, 40.73],
            ],
          ],
        }, null, 2),
      });
    }
  }, [selectedZone]);

const zoneMutation = useMutation({
  mutationFn: async (data: {
    name: string;
    description?: string;
    coordinates: any;
  }) => {
    if (selectedZone) {
      const res = await apiRequest("PATCH", `/api/zones/${selectedZone.id}`, data);
      return res.json();
    } else {
      const res = await apiRequest("POST", "/api/zones", data);
      return res.json();
    }
  },
    onSuccess: () => {
      refreshZones();
      toast({
        title: selectedZone ? "Zona actualizada" : "Zona creada",
        description: `La zona ha sido ${selectedZone ? "actualizada" : "creada"}.`,
      });
      setIsFormOpen(false);
      setSelectedZone(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al ${selectedZone ? "actualizar" : "crear"} la zona: ${error.message}`,
        variant: "destructive",
      });
      console.log(error)
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (zoneId: number) => {
      await apiRequest("DELETE", `/api/zones/${zoneId}`);
    },
    onSuccess: () => {
      refreshZones();
      toast({
        title: "Zona eliminada",
        description: "La zona ha sido eliminada.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedZone(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al eliminar la zona: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateZone = () => {
    setSelectedZone(null);
    setIsFormOpen(true);
  };

  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    setIsFormOpen(true);
  };

  const handleDeleteZone = (zone: Zone) => {
    setSelectedZone(zone);
    setIsDeleteDialogOpen(true);
  };

const handleZoneGeoJSON = (geojson: GeoJSON.Feature | null) => {
  if (!geojson) return;
  
  // 1. Actualizar formulario (ya lo haces)
  form.setValue("coordinatesJson", JSON.stringify(geojson.geometry, null, 2));
  
  // 2. Actualizar estado de selectedZone para que tenga las nuevas coordenadas
  if (selectedZone) {
    setSelectedZone({
      ...selectedZone,
      coordinates: geojson.geometry as Zone["coordinates"],
    });
  }
};


const onSubmit = (data: z.infer<typeof formSchema>) => {
  try {
    const coordinates = JSON.parse(data.coordinatesJson);
    zoneMutation.mutate({
      name: data.name,
      description: data.description,
      coordinates,
    });
  } catch (error) {
    toast({
      title: "JSON inválido",
      description: "Las coordenadas deben tener un formato GeoJSON válido.",
      variant: "destructive",
    });
  }
};

  const getZoneColor = (zoneName: string) => {
    const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500"];
    let sum = 0;
    for (let i = 0; i < zoneName.length; i++) {
      sum += zoneName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <main className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <Header
              title="Gestión de Zonas"
              subtitle="Crea y administra zonas geográficas para encuestas"
            />

            <Button
              className="mt-4 md:mt-0 bg-primary"
              onClick={handleCreateZone}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Zona
            </Button>
          </div>

          <Card className="mb-6 border border-gray-200">
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Mapa interactivo de zonas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <MapView
                    zones={zones || []}
                  />
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="p-4 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Todas las zonas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Nombre de la zona</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha de creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          </div>
                          <div className="mt-2 text-gray-600">Cargando zonas...</div>
                        </TableCell>
                      </TableRow>
                    ) : zones && zones.length > 0 ? (
                      zones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${getZoneColor(zone.name)} bg-opacity-20`}
                              >
                                <MapPin className={`h-4 w-4 ${getZoneColor(zone.name).replace("bg-", "text-")}`} />
                              </div>
                              {zone.name}
                            </div>
                          </TableCell>
                          <TableCell>{zone.description || "—"}</TableCell>
                          <TableCell>{new Date(zone.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditZone(zone)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteZone(zone)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="rounded-full bg-gray-100 p-3 w-12 h-12 mx-auto flex items-center justify-center mb-4">
                            <Map className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="text-lg font-medium text-gray-900 mb-1">No se encontraron zonas</div>
                          <div className="text-gray-600 mb-4">
                            Comenzá creando una nueva zona.
                          </div>
                          <Button
                            className="bg-primary"
                            onClick={handleCreateZone}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Zona
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedZone ? "Editar Zona" : "Crear Zona"}</DialogTitle>
              <DialogDescription>
                {selectedZone
                  ? "Actualizá la información y las coordenadas de la zona."
                  : "Agregá una nueva zona geográfica al sistema."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la zona</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresá el nombre de la zona" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ingresá una descripción de la zona"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coordinatesJson"
                  render={({ field }) => (
                    <FormItem>
                     <FormLabel>Seleccioná la zona en el mapa</FormLabel>
                      <MapView
                        drawingEnabled={true}
                        handleZoneGeoJSON={handleZoneGeoJSON}
                        zones={selectedZone ? [selectedZone] : []}
                      />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary"
                    disabled={zoneMutation.isPending}
                  >
                    {zoneMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : selectedZone ? (
                      "Actualizar zona"
                    ) : (
                      "Crear zona"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Eliminar zona</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que querés eliminar {selectedZone?.name}? Esta acción no se puede deshacer.
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
                onClick={() => selectedZone && deleteMutation.mutate(selectedZone.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MobileNavigation />
      </div>
    </div>
  );
}
