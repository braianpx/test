// src/components/surveys/survey-responses.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SurveyResults } from "./survey-results";
import { Survey } from "@shared/schema";
import MapView from "@/components/map/MapView";

type RespondentInfo = {
  name: string;
  age?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say"| undefined;
  email?: string;
};

interface SurveyResponse {
  id: number;
  createdAt: Date;
  surveyId: number;
  userId: number;
  responses: any;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  } | null;
  respondentInfo: RespondentInfo;
}

interface ResponsesProps {
  survey: Survey;
}

// gender.ts
export type Gender = "male" | "female" | "other" | "prefer_not_to_say" | undefined;

export const genderTranslations: Record<Exclude<Gender, undefined>, string> = {
  male: "Hombre",
  female: "Mujer",
  other: "Otro",
  prefer_not_to_say: "Prefiere no decirlo",
};

const Responses: React.FC<ResponsesProps> = ({ survey }) => {
  const surveyId = survey?.id || 0;
  const { data: surveyResponses } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses/" + surveyId],
  });

  if (!survey) {
    return <p>Cargando encuesta...</p>;
  } 

  function GenderLabel( gender: Gender ) {
    console.log(gender)
    if (!gender) return "No especificado";
    return genderTranslations[gender];
  }

  return (
    <div className="space-y-6">
      {/* Resultados de la encuesta */}
      <SurveyResults survey={survey} surveyResponses={surveyResponses ?? []} />

      {/* Listado de encuestados */}
      {!surveyResponses || surveyResponses.length === 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="text-center p-6">
            <p className="text-gray-500 italic">Todavía no hubo respuestas.</p>
          </CardContent>
        </Card>
      ) : (
        surveyResponses.map((response) => (
          <Card
            key={response.id}
            className="shadow-md rounded-lg border border-gray-200 overflow-hidden"
          >
            <CardHeader className="bg-primary/10 border-b border-primary p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/30 flex items-center justify-center text-primary font-bold text-lg">
                  {response.respondentInfo.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-primary">
                    {response.respondentInfo.name}
                  </CardTitle>
                  <div className="text-sm text-gray-600 space-x-4">
                    <span>Edad: {response.respondentInfo.age ?? "No especificada"}</span>
                    <span>
                      Género: { GenderLabel(response?.respondentInfo?.gender)?? "prefer_not_to_say" }
                    </span>
                    <span>
                      Email: {response.respondentInfo.email ?? "No especificado"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2 sm:mt-0">
                {new Date(response.createdAt).toLocaleString()}
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="border-2 border-primary bg-primary/10 p-4 rounded-md shadow-sm">
                <strong className="text-base text-primary mb-2 block">
                  Respuestas:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                  {Object.entries(response.responses).map(([question, answerObj]) => {
                    const answerText = Array.isArray(answerObj.answer)
                      ? answerObj.answer.join(", ")
                      : answerObj.answer;
                    return <li key={question}>{answerText}</li>;
                  })}
                </ul>
              </div>

              {/* 🔹 Minimapa con MapView */}
              {response.location?.coordinates && (
                <div className="h-40 w-full rounded-md overflow-hidden border border-gray-300">
                  <MapView
                    height="160px"
                    drawingEnabled={false}
                    responseSurveyor={[{...response, location:{coordinates: [response.location.coordinates[1], response.location.coordinates[0] ], type: "Point"}} || undefined]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default Responses;
