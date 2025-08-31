import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { User, Zone } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";
import { RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapView } from "@/components/map/MapView";
import { navigate } from "wouter/use-browser-location";
import { useAuth } from "@/hooks/use-auth";

interface SurveyorLocation {
  id: number;
  userId: number;
  user?: Pick<User, "id" | "name" | "username" | "role">;
  location: { type: "Point"; coordinates: [number, number] };
  isActive: boolean;
  updatedAt: string;
}

interface SurveyorResponse {
  id: number;
  surveyId: number;
  userId: number;
  createdAt: string;
}

interface Survey {
  id: number;
  title: string;
}

export function MapDisplay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { responsesSurvey, surveyorLocations } = useWebSocket();
  const [surveyors, setSurveyors] = useState<SurveyorLocation[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);

  const { data: surveys } = useQuery<Survey[]>({ queryKey: ["/api/surveys"] });
  const { data: surveyorsLength } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "surveyor"),
  });
  const { data: zones } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });

  useEffect(()=>{
    const lengthResponses = responsesSurvey.length;
    setAllResponses(responsesSurvey[lengthResponses-1] || []);
  },[responsesSurvey])
  // Actualiza surveyors en tiempo real
  useEffect(() => {
    if (surveyorLocations) setSurveyors(surveyorLocations);
  }, [surveyorLocations]);

  const handleRefresh = () => {
    toast({
      title: "Actualizado",
      description: "Se han actualizado las ubicaciones de los encuestadores.",
    });
  };

  const getRelativeTime = (timestamp: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / (1000 * 60));
    if (minutes < 1) return "justo ahora";
    if (minutes === 1) return "hace 1 minuto";
    if (minutes < 60) return `hace ${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "hace 1 hora";
    if (hours < 24) return `hace ${hours} horas`;
    return "hace más de un día";
  };

  return (
    <Card className="border border-gray-200 mb-8">
      <CardHeader className="border-b border-gray-200 flex-row justify-between items-center p-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Encuestadores en Terreno
        </CardTitle>
        <div className="flex space-x-2">
          <Button size="sm" className="text-sm bg-primary text-white" onClick={handleRefresh}>
            <RefreshCw size={16} className="mr-1" />
            Actualizar
          </Button>
        </div>
      </CardHeader>

      <div className="h-[500px] w-full">
        <MapView surveyors={surveyors} zones={zones || []} responseSurveyor={responsesSurvey} />
      </div>

      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2 sm:mb-0">
            Encuestadores Activos (
            {surveyors.filter(s => s.isActive && s.user?.role === "surveyor").length}
            /{surveyorsLength?.length || "-"})
          </h4>
          {user?.role === "admin" && (
            <div className="flex space-x-2">
              <Button size="sm" className="text-sm bg-primary text-white" onClick={() => navigate("/users")}>
                <Plus size={16} className="mr-1" />
                Agregar Encuestador
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Encuestador</TableHead>
                <TableHead>Última Encuesta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Respuestas Hoy</TableHead>
                <TableHead>Última Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveyors.map(surveyor => {
                if (surveyor.user?.role !== "surveyor") return null;

                // Última encuesta respondida

                const lastResponse = allResponses
                  .filter(r => r.userId === surveyor.userId)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                const lastSurveyName = lastResponse
                  ? surveys?.find(s => s.id === lastResponse.surveyId)?.name || "Sin título"
                  : "Sin respuestas";

                // Filtrar respuestas de hoy del encuestador
                const now = new Date();
                const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

                const responsesToday = allResponses
                  .filter(r => r.userId === surveyor.userId)
                  .filter(r => new Date(r.createdAt) >= startOfTodayUTC);

                return (
                  <TableRow key={surveyor.userId}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary flex items-center justify-center">
                          {surveyor.user?.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{surveyor.user?.name || "Desconocido"}</div>
                          <div className="text-xs text-gray-500">ID: S-{surveyor.userId}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{lastSurveyName}</TableCell>

                    <TableCell>
                      <Badge className={surveyor.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {surveyor.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>

                    <TableCell>{responsesToday?.length}</TableCell>

                    <TableCell>{getRelativeTime(surveyor.updatedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
