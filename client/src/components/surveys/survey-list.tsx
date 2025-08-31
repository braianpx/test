import { useQuery } from "@tanstack/react-query";
import { Survey } from "@shared/schema";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";

export function SurveyList() {
  const { data: surveys, isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });
  
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredSurveys = surveys?.filter((survey) =>
    survey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (survey.description && survey.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card className="border border-gray-200">
      {/* Header responsive */}
      <CardHeader className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Todas las Encuestas
        </CardTitle>

        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full sm:w-auto gap-2">
          {/* Barra de búsqueda */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar encuestas"
              className="pl-8 w-full sm:w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Botón crear encuesta */}
          <Link href="/surveys/create" className="w-full sm:w-auto">
            <Button className="bg-primary w-full sm:w-auto flex justify-center items-center gap-1">
              <Plus className="h-4 w-4" />
              Nueva Encuesta
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-primary mx-auto"
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
            <p className="mt-4 text-gray-600 text-sm sm:text-base">
              Cargando encuestas...
            </p>
          </div>
        ) : filteredSurveys && filteredSurveys.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="rounded-full bg-gray-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <ClipboardCheck className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No se encontraron encuestas
            </h3>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              {searchTerm
                ? "Prueba con otro término de búsqueda o"
                : "Comienza creando una nueva encuesta"}
            </p>
            <Link href="/surveys/create" className="w-full sm:w-auto">
              <Button className="bg-primary w-full sm:w-auto flex justify-center items-center gap-1">
                <Plus className="h-4 w-4" />
                Crear Encuesta
              </Button>
            </Link>
          </div>
        ) : (
          // Las cards de encuestas NO se tocan
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredSurveys?.map((survey, index) => {
              const colorIndex = index % iconColors.length;
              const { bg, text } = iconColors[colorIndex];

              return (
                <Link key={survey.id} href={`/surveys/${survey.id}`}>
                  <a className="no-underline">
                    <Card className="h-full border border-gray-200 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <div
                            className={`mt-1 h-10 w-10 rounded-full ${bg} ${text} flex items-center justify-center flex-shrink-0`}
                          >
                            <ClipboardCheck className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium text-gray-900">{survey.name}</h3>
                              <Badge className={colorMap[survey.status]}>
                                {survey.status === "active"
                                  ? "Activa"
                                  : survey.status === "draft"
                                  ? "Borrador"
                                  : "Completada"}
                              </Badge>
                            </div>
                            {survey.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                                {survey.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mb-2">
                              {survey.responseCount ?? 0} respuestas
                            </p>
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                              <span>{survey.questions.length} preguntas</span>
                              <span>{format(new Date(survey.createdAt), "d MMM, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
