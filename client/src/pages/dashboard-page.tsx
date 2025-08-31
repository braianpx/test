import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { StatsCard } from "@/components/dashboard/stats-card";
import { MapDisplay } from "@/components/dashboard/map-display";
import { SurveyProgressChart } from "@/components/dashboard/survey-progress-chart";
import { SurveyCompletionWidget } from "@/components/dashboard/survey-completion-widget";
import { RecentSurveysTable } from "@/components/dashboard/recent-surveys-table";
import { Users, ClipboardCheck, BarChart3, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface DashboardStats {
  activeSurveyors: number;
  totalSurveyors: number;
  activeSurveys: number;
  totalSurveys: number;
  responsesToday: number;
  completionRate: number;
  surveyProgress: {
    id: number;
    name: string;
    status: string;
    completionPercentage: number;
  }[];
  weeklyGrowthPercentage: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Obtener estadísticas del dashboard
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <main className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
          <Header 
            title="Panel de Control" 
            subtitle={`Bienvenido a tu sistema de gestión de encuestas, ${user?.name}`} 
          />

          {/* Tarjetas Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Encuestadores Activos"
              value={isLoading ? "..." : `${stats?.activeSurveyors || 0}`}
              icon={<Users className="h-5 w-5" />}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
              trend={stats && {
                value: `${stats.activeSurveyors}/${stats.totalSurveyors}`,
                isPositive: true,
                label: "encuestador" + (stats.totalSurveyors !== 1 ? "es" : "")
              }}
            />
            
            <StatsCard
              title="Encuestas Activas"
              value={isLoading ? "..." : `${stats?.activeSurveys || 0}`}
              icon={<ClipboardCheck className="h-5 w-5" />}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
              trend={stats && {
                value: `${stats.totalSurveys - stats.activeSurveys}`,
                label: "pendientes de aprobación"
              }}
            />
            
            <StatsCard
              title="Respuestas Hoy"
              value={isLoading ? "..." : `${stats?.responsesToday || 0}`}
              icon={<BarChart3 className="h-5 w-5" />}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-600"
              trend={stats && {
                value: `+${stats?.weeklyGrowthPercentage ?? 0}%`,
                isPositive: true,
                label: "respecto a la semana pasada"
              }}
            />
            
            <StatsCard
              title="Tasa de Completitud"
              value={isLoading ? "..." : `${stats?.completionRate || 0}%`}
              icon={<ClipboardList className="h-5 w-5" />}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
              trend={{
                value: "Meta: 85%",
                label: ""
              }}
            />
          </div>

          {/* Sección de Mapa */}
          <MapDisplay />

          {/* Sección de Analíticas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <SurveyProgressChart />
            <SurveyCompletionWidget 
              surveyProgress={stats?.surveyProgress?.map(survey => ({
                id: survey.id,
                name: survey.name,
                percentage: survey.completionPercentage,
                color: survey.status === 'active' 
                  ? 'bg-green-500' 
                  : survey.status === 'draft' 
                    ? 'bg-amber-500' 
                    : 'bg-primary'
              }))}
            />
          </div>
          
          {/* Tabla de Encuestas Recientes */}
          <RecentSurveysTable limit={3} />
        </main>

        {/* Navegación Móvil */}
        <MobileNavigation />
      </div>
    </div>
  );
}
