import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SurveyResponse, surveyResponses } from "@shared/schema";

interface SurveyResultsProps {
  survey: any;
  surveyResponses?: SurveyResponse[];
  viewMode?: () => {};
}

interface OptionCount {
  option: string;
  count: number;
  percentage: number;
}

export function SurveyResults({ survey, surveyResponses, viewMode }: SurveyResultsProps) {
  const [, navigate] = useLocation();

  const results = useMemo(() => {
    if (!survey || !survey.questions) return [];

    return survey?.questions?.map((question: any) => {
      const optionCounts: Record<string, number> = {};

      surveyResponses?.forEach((response) => {
        const answerObj = response?.responses?.find((r: any) => r.questionId === question.id);
        if (!answerObj) return;

        if (Array.isArray(answerObj?.answer)) {
          answerObj?.answer?.forEach((ans: string) => {
            optionCounts[ans] = (optionCounts[ans] || 0) + 1;
          });
        } else {
          optionCounts[answerObj.answer] = (optionCounts[answerObj.answer] || 0) + 1;
        }
      });

      const total = Object.values(optionCounts).reduce((a, b) => a + b, 0);
      const optionPercentages: OptionCount[] = Object.entries(optionCounts).map(
        ([option, count]) => ({
          option,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        })
      );

      optionPercentages.sort((a, b) => b.percentage - a.percentage);

      return {
        questionId: question.id,
        questionText: question.text,
        options: optionPercentages,
        totalResponses: total,
      };
    });
  }, [survey, surveyResponses]);

  return (
    <div className="mt-6 mb-10">
    {/* Título general de resultados */}
    <h2 className="text-xl font-bold mb-4 text-gray-900">Resultados de la encuesta</h2>

    {results.length === 0 ? (
      <Card className="p-6 text-center border border-gray-200 shadow-sm">
        <p className="text-gray-500">Todavía no hubo respuestas.</p>
      </Card>
    ) : (
      results.map((q) => (
        <Card key={q.questionId} className="border-gray-200 shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-200 p-4">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {q.questionText}{" "}
              <span className="text-sm text-gray-500 font-normal">
                ({q.totalResponses} respuestas)
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 p-4">
            {q.options.length > 0 ? (
              q.options.map((opt) => (
                <div key={opt.option} className="space-y-1">
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                    <span>{opt.option}</span>
                    <span className="text-gray-600">
                      {opt.count} votos ({opt.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-4 bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${opt.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">
                No hay respuestas aún o hay empate entre opciones.
              </p>
            )}
          </CardContent>

          {viewMode && (
            <div className="flex justify-end p-4 border-t border-gray-200">
              <Button
                onClick={() => viewMode()}
                variant="outline"
                className="hover:bg-primary/5"
              >
                Ver más
              </Button>
            </div>
          )}
        </Card>
      ))
    )}
  </div>
  );
}
export default surveyResponses