import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Equal } from "lucide-react";

interface SurveyProgress {
  id: number;
  name: string;
  percentage: number;
  color?: string;
}

interface RecentActivity {
  id: number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  text: string;
  time: string;
}

interface SurveyCompletionWidgetProps {
  surveyProgress?: SurveyProgress[];
  recentActivity?: RecentActivity[];
}

export function SurveyCompletionWidget({ 
  surveyProgress, 
  recentActivity 
}: SurveyCompletionWidgetProps) {
  // Datos por defecto si no se pasan props
  const defaultSurveyProgress: SurveyProgress[] = [
    {
      id: 1,
      name: "Encuesta de Satisfacción",
      percentage: 68,
      color: "bg-green-500"
    },
    {
      id: 2,
      name: "Encuesta de Necesidades de Servicio",
      percentage: 42,
      color: "bg-amber-500"
    },
    {
      id: 3,
      name: "Opinión de la Comunidad",
      percentage: 89,
      color: "bg-primary"
    }
  ];
  
  const defaultRecentActivity: RecentActivity[] = [
    {
      id: 1,
      icon: <Check className="h-4 w-4" />,
      iconBgColor: "bg-green-100",
      iconColor: "text-green-600",
      text: "La encuesta Opinión de la Comunidad fue completada por María S.",
      time: "hace 15 minutos"
    },
    {
      id: 2,
      icon: <Equal className="h-4 w-4" />,
      iconBgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      text: "Se asignó una nueva zona a Alex R.",
      time: "hace 43 minutos"
    }
  ];
  
  const progressData = surveyProgress || defaultSurveyProgress;
  const activityData = recentActivity || defaultRecentActivity;
  
  return (
    <Card className="border border-gray-200">
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Avance de Encuestas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-4">
          {progressData.map((survey) => (
            <div key={survey.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {survey.name}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {survey.percentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${survey.color || "bg-primary"} rounded-full`}
                  style={{ width: `${survey.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Actividad Reciente
            </h4>
            <div className="space-y-3">
              {activityData.map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className={`h-8 w-8 rounded-full ${activity.iconBgColor} ${activity.iconColor} flex items-center justify-center flex-shrink-0`}>
                    {activity.icon}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-800">{activity.text}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
