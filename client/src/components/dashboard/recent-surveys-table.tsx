import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Survey } from "@shared/schema";
import { Link } from "wouter";
import { ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

interface RecentSurveysTableProps {
  limit?: number;
}
interface Surveys extends Survey {
  responseCount: number;
}

export function RecentSurveysTable({ limit = 5 }: RecentSurveysTableProps) {
  const { data: surveys, isLoading } = useQuery<Surveys[]>({
    queryKey: ["/api/surveys"],
  });

  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    completed: "bg-blue-100 text-blue-800"
  };

  const iconColors = [
    { bg: "bg-purple-100", text: "text-purple-600" },
    { bg: "bg-blue-100", text: "text-blue-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-amber-100", text: "text-amber-600" },
    { bg: "bg-indigo-100", text: "text-indigo-600" },
  ];

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  const visibleSurveys = surveys?.slice(0, limit) || [];
  return (
    <Card className="border border-gray-200 mb-8">
      <CardHeader className="p-4 border-b border-gray-200 flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Encuestas Recientes
        </CardTitle>
        <Link href="/surveys">
          <a className="text-primary hover:text-primary/80 text-sm font-medium">
            Ver Todas
          </a>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre de Encuesta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creada
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Respuestas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-center text-sm text-gray-500">
                    Cargando encuestas...
                  </td>
                </tr>
              ) : visibleSurveys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-center text-sm text-gray-500">
                    No se encontraron encuestas. ¡Crea tu primera encuesta!
                  </td>
                </tr>
              ) : (
                visibleSurveys.map((survey, index) => {
                  const colorIndex = index % iconColors.length;
                  const { bg, text } = iconColors[colorIndex];

                  return (
                    <tr key={survey.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full ${bg} ${text} flex items-center justify-center`}>
                            <ClipboardCheck className="h-4 w-4" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {survey.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {survey?.questions?.length} preguntas
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(survey?.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={colorMap[survey.status]}>
                          {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {survey.status === "draft" ? "—" : survey?.responseCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {survey.zoneId ? `Zona ${survey.zoneId}` : "Todas las Zonas"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/surveys/${survey.id}`}>
                            <a className="text-primary hover:text-primary/80">Ver</a>
                          </Link>
                          <Link href={`/surveys/${survey.id}/edit`}>
                            <a className="text-gray-600 hover:text-gray-900">Editar</a>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
