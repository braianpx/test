import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { SurveyList } from "@/components/surveys/survey-list";
import { SurveyForm } from "@/components/surveys/survey-form";
import { SurveyResponseForm } from "@/components/surveys/survey-response-form";
import { useQuery } from "@tanstack/react-query";
import { Survey } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, ClipboardCheck, ListChecks } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Responses from "@/components/surveys/survey-responses";

export default function SurveysPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isSurveyor = user?.role === "surveyor";
  const [ isResultsView, setIsResultsView ] = useState<boolean>(false)

  // Comprobar si estamos en modo crear, ver, editar o completar encuesta
  const isCreateMode = location === "/surveys/create";
  const viewMatch = /\/surveys\/(\d+)$/.exec(location);
  const editMatch = /\/surveys\/(\d+)\/edit$/.exec(location);
  const takeSurveyMatch = /\/surveys\/(\d+)\/take$/.exec(location);

  const surveyId = viewMatch
    ? parseInt(viewMatch[1])
    : editMatch
      ? parseInt(editMatch[1])
      : takeSurveyMatch
        ? parseInt(takeSurveyMatch[1])
        : null;

  let isViewMode = !!viewMatch;
  const isEditMode = !!editMatch;
  const isTakeSurveyMode = !!takeSurveyMatch;

  // Obtener detalles de la encuesta si estamos en ver, editar o completar
  const { data: survey } = useQuery<Survey>({
    queryKey: [`/api/surveys/${surveyId}`],
    enabled: !!surveyId,
  });

  // Obtener todas las encuestas
  const { data: surveys } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  // Manejar éxito del formulario
  const handleSuccess = (isResponse?: boolean) => {
    if(!isResponse) setLocation("/surveys");
  };

  // Obtener el título de la página según el modo y el rol
  const getPageTitle = () => {
    if (isSurveyor) {
      if (isTakeSurveyMode) return "Completar Encuesta";
      return "Encuestas Disponibles";
    } else {
      if (isCreateMode) return "Crear Encuesta";
      if (isEditMode) return "Editar Encuesta";
      if (isViewMode) return "Detalles de la Encuesta";
      return "Encuestas";
    }
  };

  // Obtener el subtítulo de la página según el modo y el rol
  const getPageSubtitle = () => {
    if (isSurveyor) {
      if (isTakeSurveyMode) return `Completando "${survey?.name}"`;
      return "Encuestas asignadas para la recolección de datos";
    } else {
      if (isCreateMode) return "Crea una nueva encuesta para recopilar datos";
      if (isEditMode) return `Editando "${survey?.name}"`;
      if (isViewMode) return `Viendo "${survey?.name}"`;
      return "Gestiona tus encuestas y visualiza las respuestas";
    }
  };

  // Si el usuario es encuestador, redirigir desde modo crear/editar a la vista de lista
  useEffect(() => {
    if (isSurveyor && (isCreateMode || isEditMode)) {
      setLocation("/surveys");
    }
  }, [isSurveyor, isCreateMode, isEditMode, setLocation]);

  //funcion para entrar en vista de resultados
  const viewResultOn = () => {
    setIsResultsView(true);
    isViewMode = false;
  }

  const viewResultsOf = () =>{
    setIsResultsView(false);
  }
  
  const ArrowLeftFunc = () => {
    isResultsView ? viewResultsOf() : setLocation("/surveys");
  }
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <main className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            {(isCreateMode || isEditMode || isViewMode || isTakeSurveyMode) && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 md:mb-0 self-start"
                onClick={ArrowLeftFunc}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Encuestas
              </Button>
            )}

            <Header
              title={getPageTitle()}
              subtitle={getPageSubtitle()}
            />

            {!isCreateMode && !isEditMode && !isViewMode && !isTakeSurveyMode && !isSurveyor && (
              <Link href="/surveys/create">
                <Button className="hidden md:flex mt-4 md:mt-0 bg-primary">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Encuesta
                </Button>
              </Link>
            )}
          </div>

          {/* Vista de Administrador y Supervisor */}
          {!isSurveyor && (
            <>
              { isResultsView && (
                 <Responses survey={survey} />
              )}

              {isCreateMode && (
                <SurveyForm onSuccess={handleSuccess} />
              )}

              {(isEditMode) && survey && !isResultsView && (
                <SurveyForm
                  survey={survey}
                  onSuccess={handleSuccess}
                  viewMode={viewResultOn}
                />
              )}
              {(!isEditMode && isViewMode) && survey && !isResultsView && (
                  <SurveyForm
                    viewMode={viewResultOn}
                    survey={survey}
                  />
                )}
              {!isCreateMode && !isEditMode && !isViewMode && (
                <SurveyList />
              )}
            </>
          )}

          {/* Vista de Encuestador */}
          {isSurveyor && (
            <>
              {isTakeSurveyMode && survey && (
                <SurveyResponseForm survey={survey} onSuccess={handleSuccess} />
              )}

              {!isTakeSurveyMode && (
                <Card className="border border-gray-200">
                  <CardHeader className="p-4 border-b border-gray-200">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Encuestas Disponibles
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {surveys && surveys.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {surveys
                          .filter(survey => survey.status === "active")
                          .map((survey, index) => {
                            const iconColors = [
                              { bg: "bg-purple-100", text: "text-purple-600" },
                              { bg: "bg-blue-100", text: "text-blue-600" },
                              { bg: "bg-pink-100", text: "text-pink-600" },
                              { bg: "bg-amber-100", text: "text-amber-600" },
                              { bg: "bg-indigo-100", text: "text-indigo-600" },
                            ];
                            const colorIndex = index % iconColors.length;
                            const { bg, text } = iconColors[colorIndex];

                            return (
                              <Link key={survey.id} href={`/surveys/${survey.id}/take`}>
                                <div className="no-underline">
                                  <Card className="h-full border border-gray-200 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                                    <CardContent className="p-4">
                                      <div className="flex items-start space-x-4">
                                        <div className={`mt-1 h-10 w-10 rounded-full ${bg} ${text} flex items-center justify-center flex-shrink-0`}>
                                          <ClipboardCheck className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-medium text-gray-900">{survey.name}</h3>
                                            <Badge className="bg-green-100 text-green-800">
                                              Activa
                                            </Badge>
                                          </div>
                                          {survey.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{survey.description}</p>
                                          )}
                                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                                            <span>{survey?.questions?.length} preguntas</span>
                                            <span>{format(new Date(survey.createdAt), "MMM d, yyyy")}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </Link>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="rounded-full bg-gray-100 p-3 w-12 h-12 mx-auto flex items-center justify-center mb-4">
                          <ListChecks className="h-6 w-6 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No hay encuestas activas</h3>
                        <p className="text-gray-600 mb-4">
                          No tienes encuestas activas asignadas en este momento
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>

        {/* Navegación móvil */}
        <MobileNavigation />
      </div>
    </div>
  );
}
