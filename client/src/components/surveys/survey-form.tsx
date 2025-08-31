import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertSurveySchema, Survey, Zone, User, SurveyResponse } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, SaveIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MapView } from "../map/MapView";
import { SurveyResults } from "./survey-results";

interface SurveyFormProps {
  survey?: Survey;
  onSuccess?: (survey: Survey) => void;
  viewMode?: () => void;
}

export function SurveyForm({ survey, onSuccess, viewMode = () => {} }: SurveyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [questions, setQuestions] = useState(survey?.questions || []);
  const [selectedSurveyors, setSelectedSurveyors] = useState<number[]>([]);

  const { data: responsesAnswerd } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses/" + survey?.id],
    enabled: !!survey,
  });

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" || user?.role === "supervisor",
  });

  const { data: assignments } = useQuery({
    queryKey: ["/api/surveys/" + survey?.id + "/assignments"],
    enabled: !!survey?.id,
  });

  // 🔹 Cargar encuestadores seleccionados en edición
  useEffect(() => {
    if (assignments) {
      setSelectedSurveyors(assignments.map((a: any) => Number(a.userId)));
    }
  }, [assignments]);

  const formSchema = insertSurveySchema.extend({
    name: z.string().min(3, "El nombre de la encuesta debe tener al menos 3 caracteres"),
    description: z.string().optional(),
    questions: z.array(z.any()).min(1, "Se requiere al menos una pregunta"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: survey?.name || "",
      description: survey?.description || "",
      zoneId: survey?.zoneId,
      status: survey?.status || "draft",
      questions: survey?.questions || [],
    },
  });

  useEffect(() => {
    if (survey) {
      form.reset({
        name: survey.name,
        description: survey.description,
        zoneId: survey.zoneId,
        status: survey.status,
        questions: survey.questions,
      });
      setQuestions(survey.questions);
    }
  }, [survey, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      let res;
      if (survey) {
        res = await apiRequest("PATCH", `/api/surveys/${survey.id}`, data);
      } else {
        res = await apiRequest("POST", "/api/surveys", data);
      }
      const newSurvey: Survey = await res.json();

      if (survey) {
        await apiRequest("DELETE", `/api/surveys/${survey.id}/assignments`);
      }

      if (selectedSurveyors.length > 0) {
        await Promise.all(
          selectedSurveyors.map((surveyorId) =>
            apiRequest("POST", "/api/survey-assignments", {
              surveyId: newSurvey.id,
              userId: surveyorId,
            })
          )
        );
      }

      return newSurvey;
    },
    onSuccess: async (newSurvey: Survey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${newSurvey.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${newSurvey.id}/assignments`] });

      toast({
        title: survey ? "Encuesta Actualizada" : "Encuesta Creada",
        description: `Se ${survey ? "actualizó" : "creó"} correctamente "${newSurvey.name}"`,
      });

      if (onSuccess) onSuccess(newSurvey);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo ${survey ? "actualizar" : "crear"} la encuesta: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const addQuestion = () => {
    const newQuestion = {
      id: uuidv4(),
      text: "",
      type: "singleChoice",
      required: true,
      options: [
        { id: uuidv4(), text: "Opción 1" },
        { id: uuidv4(), text: "Opción 2" },
      ],
    };
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    form.setValue("questions", updatedQuestions);
  };

  const removeQuestion = (questionId: string) => {
    const updatedQuestions = questions.filter((q) => q.id !== questionId);
    setQuestions(updatedQuestions);
    form.setValue("questions", updatedQuestions);
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId ? { ...q, [field]: value } : q
    );
    setQuestions(updatedQuestions);
    form.setValue("questions", updatedQuestions);
  };

  const addOption = (questionId: string) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId
        ? { ...q, options: [...(q.options || []), { id: uuidv4(), text: `Opción ${(q.options?.length || 0) + 1}` }] }
        : q
    );
    setQuestions(updatedQuestions);
    form.setValue("questions", updatedQuestions);
  };

  const removeOption = (questionId: string, optionId: string) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId
        ? { ...q, options: q.options?.filter((o) => o.id !== optionId) || [] }
        : q
    );
    setQuestions(updatedQuestions);
    form.setValue("questions", updatedQuestions);
  };

  const updateOption = (questionId: string, optionId: string, value: string) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            options: q.options?.map((o) => (o.id === optionId ? { ...o, text: value } : o)),
          }
        : q
    );
    setQuestions(updatedQuestions);
    form.setValue("questions", updatedQuestions);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (questions.length === 0) {
      toast({ title: "Error", description: "Se requiere al menos una pregunta", variant: "destructive" });
      return;
    }

    if (!survey && selectedSurveyors.length === 0) {
      toast({ title: "Error", description: "Se requiere seleccionar al menos 1 encuestador", variant: "destructive" });
      return;
    }

    data.questions = questions;
    mutation.mutate(data);
  };

  const surveyors = users?.filter((u) => u.role === "surveyor") || [];

  return (
    <>      
    {
      survey&&
    <SurveyResults survey={survey} surveyResponses={responsesAnswerd} viewMode={viewMode} />
    }
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Encuesta</FormLabel>
                <FormControl>
                  <Input placeholder="Ingrese el nombre de la encuesta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el estado de la encuesta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ingrese una descripción para la encuesta"
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
          name="zoneId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zona de la Encuesta</FormLabel>
              <MapView 
                zones={zones || []}
              />
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una zona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {zones?.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel className="block mb-3">Preguntas de la Encuesta</FormLabel>
          <div className="space-y-3">
            {questions?.map((question, index) => (
              <Card key={question.id} className="bg-gray-50 border border-gray-200">
                <CardContent className="p-3">
                  <div className="flex justify-between mb-2">
                    <div className="text-sm font-medium">Pregunta {index + 1}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(question.id)}
                      className="h-8 w-8 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, "text", e.target.value)}
                    placeholder="Ingrese el texto de la pregunta"
                    className="mb-2"
                  />

                  <div className="text-xs text-gray-500 mb-2">Tipo de respuesta</div>
                  <Select
                    value={question.type}
                    onValueChange={(value) => updateQuestion(question.id, "type", value)}
                  >
                    <SelectTrigger className="mb-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="singleChoice">Opción Única</SelectItem>
                      <SelectItem value="multipleChoice">Opción Múltiple</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="rating">Calificación</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center mb-2">
                    <Checkbox
                      id={`required-${question.id}`}
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(question.id, "required", !!checked)}
                    />
                    <label
                      htmlFor={`required-${question.id}`}
                      className="ml-2 text-sm font-medium text-gray-700"
                    >
                      Pregunta obligatoria
                    </label>
                  </div>

                  {(question.type === "singleChoice" || question.type === "multipleChoice") && (
                    <div className="mt-2 space-y-2">
                      {question.options?.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <Input
                            value={option.text}
                            onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(question.id, option.id)}
                            className="ml-2 h-8 w-8 text-gray-500 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(question.id)}
                        className="text-primary"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Opción
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full py-6 border-2 border-dashed"
              onClick={addQuestion}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar Pregunta
            </Button>
          </div>
        </div>
         <div>
            <FormLabel className="block mb-3">Asignar Encuestadores</FormLabel>
            <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
              {surveyors.length === 0 ? (
                <p className="text-sm text-gray-500">No hay encuestadores disponibles</p>
              ) : (
                surveyors.map((surveyor) => (
                  <div key={surveyor.id} className="flex items-center">
                    <Checkbox
                      id={`surveyor-${surveyor.id}`}
                      checked={selectedSurveyors.includes(surveyor.id)}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setSelectedSurveyors((prev) =>
                          isChecked ? [...prev, surveyor.id] : prev.filter((id) => id !== surveyor.id)
                        );
                      }}
                    />
                    <label htmlFor={`surveyor-${surveyor.id}`} className="ml-2 block text-sm text-gray-700">
                      {surveyor.name} ({zones?.find((z) => z.id === survey?.zoneId)?.name || "Sin asignar"})
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => onSuccess?.(survey as Survey)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Procesando..." : survey ? "Actualizar Encuesta" : "Crear Encuesta"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}