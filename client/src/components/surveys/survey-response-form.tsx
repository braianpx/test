import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Survey, Zone, pointSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, User, Send, RefreshCcw } from "lucide-react";
import { MapView } from "@/components/map/MapView";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";

interface SurveyResponseFormProps {
  survey: Survey;
  onSuccess?: () => void;
}

export function SurveyResponseForm({ survey, onSuccess }: SurveyResponseFormProps) {
  const { toast } = useToast();
  const [respondentInfo, setRespondentInfo] = useState({
    name: "",
    age: "",
    gender: "",
    email: "",
  });
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [location, setLocation]= useState<Array<any>>();

  const questions = Array.isArray(survey.questions) ? survey.questions : [];
    const { data: zone  } = useQuery<Zone>({
      queryKey: ["/api/zones/"+survey?.zoneId || 0],
    });
  
  const { user } = useAuth();
  const { surveyorLocations } = useWebSocket();

  useEffect(()=>{
    const getLocation = surveyorLocations.filter(el => el.userId === user?.id);
    setLocation([{...getLocation[0], user:{...user, name:"Tu Ubicacion"}}])
  },[surveyorLocations])

  const formSchema = z.object({
    responses: z.array(
      z.object({
        questionId: z.string(),
        questionType: z.string(),
        answer: z.union([
          z.string().min(1, "Respuesta obligatoria"),
          z.array(z.string().min(1, "Seleccione al menos una opción")),
        ]),
      })
    ),
    respondentName: z.string().min(2, "El nombre del encuestado es obligatorio"),
    respondentInfo: z.object({
      age: z.string().min(1, "La edad es obligatoria"),
      gender: z.string().min(1, "El género es obligatorio"),
      email: z
        .string()
        .min(1, "El email es obligatorio")
        .email("Correo inválido"),
    }),
  });

  type FormValues = z.infer<typeof formSchema>;

  const defaultValues: FormValues = {
    responses: questions.map((question: any) => ({
      questionId: question.id,
      answer: question.type === 'multipleChoice' ? [] : '',
      questionType: question.type,
    })),
    respondentName: "",
    respondentInfo: {
      age: "",
      gender: "",
      email: "",
    },
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

 const 
 getLocation = (retryCount = 0) => {
  setIsGettingLocation(true);
  console.log(location)
  if (location[0]) {
    console.log("paso")
        setCurrentLocation({
          lat: location[0]?.location?.coordinates[0] || 0,
          lng: location[0]?.location?.coordinates[1] || 0,
        });
        setIsGettingLocation(false);

        toast({
          title: "Ubicación capturada",
          description: `Latitud: ${location[0]?.location?.coordinates[0].toFixed(6)}, Longitud: ${location[0]?.location?.coordinates[1].toFixed(6)}`,
        });
        return;
      }
          setIsGettingLocation(false);
          toast({
            title: "Error al obtener la ubicación",
            description: "Por favor revisa los permisos de ubicación e intenta de nuevo",
            variant: "destructive",
          });
        };

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const responseData = {
        surveyId: survey.id,
        responses: data.responses.map(response => ({
          questionId: response.questionId,
          answer: response.answer,
          type: response.questionType,
        })),
        location: currentLocation 
          ? { type: "Point", coordinates: [currentLocation.lng, currentLocation.lat] } 
          : null,
        respondentInfo: {
          name: data.respondentName,
          ...data.respondentInfo,
        },
      };

      const res = await apiRequest("POST", "/api/survey-responses", responseData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Respuesta enviada",
        description: "¡Gracias por completar la encuesta!",
      });
      
      form.reset(defaultValues);

      setCurrentLocation(null);
      
      queryClient.invalidateQueries({
        queryKey: ["/api/survey-responses"],
      });
      
      if (onSuccess) {
        const isResponse = true;
        onSuccess(isResponse);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar la respuesta",
        description: error.message || "Por favor, inténtalo de nuevo",
        variant: "destructive",
      });
    },
  });

const onSubmit = (data: FormValues) => {

  // Validar ubicación (opcional según negocio)
  if (!currentLocation) {
    toast({
      title: "Error",
      description: "Se requiere capturar la ubicación",
      variant: "destructive",
    });
    return;
  }
  mutation.mutate(data);
};
  return (
  <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{survey.name}</CardTitle>
          {survey.description && (
            <CardDescription>{survey.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          
          {/* 🔹 Mini Map con zona + ubicación actual */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">
              Zona: {zone?.name ?? "Sin zona asignada"}
            </h3>
            <div className="h-64 w-full rounded-md overflow-hidden border border-gray-200">
              <MapView
                height="100%"
                zones={[{...zone, name:"Zona de la encuesta"}]}
                surveyors={location ?? []}
              />
            </div>
          </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium mb-4 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Información del encuestado
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <FormField
                  control={form.control}
                  name="respondentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese el nombre del encuestado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Edad */}
                <FormField
                  control={form.control}
                  name="respondentInfo.age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ingrese la edad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="respondentInfo.gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione género" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefiero no decirlo</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="respondentInfo.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ingrese el correo electrónico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium mb-4 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Información de ubicación
              </h3>
              
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={getLocation}
                    disabled={isGettingLocation}
                  >
                    {isGettingLocation ? (
                      <>
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                        Obteniendo ubicación...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        Capturar ubicación actual
                      </>
                    )}
                  </Button>
                  
                  {currentLocation && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Ubicación actual:</span> {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-md">
              <div className="border-b border-gray-200 bg-gray-50 p-4 rounded-t-md">
                <h3 className="text-md font-medium">Preguntas de la encuesta</h3>
              </div>
              
              <div className="p-4 space-y-6">
                {questions.map((question: any, index: number) => (
                  <div 
                    key={question.id} 
                    className="p-4 border border-gray-200 rounded-md"
                  >
                    <div className="flex items-start mb-4">
                      <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-md font-medium">{question.text}</h4>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`responses.${index}.answer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                          <div>
                            {question.type === 'text' && (
                              <Input placeholder="Escriba su respuesta aquí" {...field} />
                            )}
                            
                            {question.type === 'singleChoice' && (
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value as string}
                                className="space-y-2 mt-2"
                              >
                                {question.options?.map((option: any, i: number) => (
                                  <div key={i} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.text} id={`${question.id}-${i}`} />
                                    <label htmlFor={`${question.id}-${i}`} className="cursor-pointer">{option.text}</label>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                            
                            {question.type === 'multipleChoice' && (
                              <div className="space-y-2 mt-2">
                                {question.options?.map((option: any, i: number) => (
                                  <div key={i} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${question.id}-${i}`}
                                      checked={(field.value as string[]).includes(option.text)}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value as string[];
                                        if (checked) {
                                          field.onChange([...currentValue, option.text]);
                                        } else {
                                          field.onChange(currentValue.filter(val => val !== option.text));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`${question.id}-${i}`} className="cursor-pointer">{option.text}</label>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {question.type === 'rating' && (
                              <div className="flex space-x-3 mt-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <Button
                                    key={rating}
                                    type="button"
                                    variant={field.value === rating.toString() ? "default" : "outline"}
                                    className="w-10 h-10 p-0"
                                    onClick={() => field.onChange(rating.toString())}
                                  >
                                    {rating}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-primary" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
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
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Respuesta
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
