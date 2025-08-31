import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { updateUserSchema, pointSchema, insertSurveySchema, insertSurveyResponseSchema, insertSurveyorLocationSchema, insertZoneSchema, insertSurveyAssignmentSchema, updateZoneSchema, updateSurveyResponseSchema, updateSurveySchema } from "@shared/schema";
import { respondentInfoSchema } from "@shared/types";

type ClientMessage = {
  type: string;
  data: any;
};

type ServerMessage = {
  type: string;
  data: any;
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);

  // --- WebSocket principal (/ws) ---
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<WebSocket, { userId?: number; role?: string; subscriptions: Set<string> }>();

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Cada cliente tiene su info + suscripciones
    const clientInfo: {
      userId?: number;
      role?: string;
      subscriptions: Set<string>;
    } = { subscriptions: new Set() };
    clients.set(ws, clientInfo);

    ws.on('message', async (message) => {
      try {
        const parsedMessage: ClientMessage = JSON.parse(message.toString());

        // --- Autenticación ---
        if (parsedMessage.type === 'authenticate') {
          const { userId, role, location } = parsedMessage.data;
          clientInfo.userId = userId;
          clientInfo.role = role;

          // 🔹 Marcar como activo al autenticar
          if (userId) {
            await storage.updateSurveyorLocation({ userId, location, isActive: true });
            broadcastToAdmins({
              type: 'surveyor-status',
              data: { userId, isActive: true, timestamp: new Date().toISOString() },
            });
            await broadcastSurveyorLocations();
          }

          console.log(`User ${userId} authenticated with role ${role}`);
          return;
        }

        // --- Suscripción a responses-survey ---
        if (parsedMessage.type === 'subscribe' && parsedMessage.channel === 'responses-survey') {
          console.log('Cliente suscripto a responses-survey');
          clientInfo.subscriptions.add('responses-survey');

          // 🔹 traer todas las respuestas actuales desde DB
          const allResponses = await storage.getAllSurveyResponses();

          // 🔹 mandárselas al cliente que se acaba de suscribir
          ws.send(JSON.stringify({ type: 'responses-survey', data: allResponses }));

          return;
        }

        // --- Suscripción a surveyor-locations ---
        if (parsedMessage.type === 'subscribe' && parsedMessage.channel === 'surveyor-locations') {
          console.log('Cliente suscripto a surveyor-locations');
          clientInfo.subscriptions.add('surveyor-locations');

          const locations = await storage.getActiveSurveyorLocations();
          const detailedLocations = await Promise.all(
            locations.map(async (location) => {
              const user = await storage.getUser(location.userId);
              return {
                ...location,
                user: user
                  ? {
                      id: user.id,
                      name: user.name,
                      username: user.username,
                      role: user.role,
                    }
                  : undefined,
              };
            })
          );

          ws.send(JSON.stringify({ type: 'surveyor-locations', data: detailedLocations }));

          return;
        }

        // --- Otros mensajes ---
        // --- Actualización de ubicación en tiempo real ---
        if (parsedMessage.type === 'subscribe' && parsedMessage.channel === 'updateLocation') {
          const { userId, location } = parsedMessage.data;
          // ✅ Validar coordenadas
          const validLocation = pointSchema.parse(location);

          // ✅ Guardar en DB la nueva ubicación (y mantener activo al usuario)
          await storage.updateSurveyorLocation({ userId, location: validLocation, isActive: true });

          // ✅ Enviar actualización inmediata a administradores
          broadcastToAdmins({
            type: 'locationUpdate',
            data: { userId, location: validLocation, timestamp: new Date().toISOString() },
          });

          // ✅ Actualizar a todos los suscriptores de "surveyor-locations"
          await broadcastSurveyorLocations();
          return;
        }

        if (parsedMessage.type === 'startShift') {
          const { userId } = parsedMessage.data;
          await storage.updateSurveyorLocation({
            userId,
            location: parsedMessage.data.location,
            isActive: true,
          });
          broadcastToAdmins({
            type: 'surveyor-status',
            data: { userId, isActive: true, timestamp: new Date().toISOString() },
          });
          await broadcastSurveyorLocations();
          return;
        }

        if (parsedMessage.type === 'endShift') {
          const { userId, location } = parsedMessage.data;
          await storage.updateSurveyorLocation({ userId, location, isActive: false });
          broadcastToAdmins({
            type: 'surveyor-status',
            data: { userId, isActive: false, timestamp: new Date().toISOString() },
          });
          await broadcastSurveyorLocations();
          return;
        }
      } catch (error) {
        console.error('Error procesando mensaje WS:', error);
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Formato de mensaje inválido' } }));
      }
    });

    ws.on('close', async () => {
      console.log('WebSocket client disconnected');
      if (clientInfo.userId) {
        await storage.updateSurveyorLocation({
          userId: clientInfo.userId,
          location: { lat: 0, lng: 0 },
          isActive: false,
        });
        broadcastToAdmins({
          type: 'surveyor-status',
          data: { userId: clientInfo.userId, isActive: false, timestamp: new Date().toISOString() },
        });
        await broadcastSurveyorLocations();
      }
      clients.delete(ws);
    });
  });

  // --- Funciones de broadcast ---
  function broadcastToAdmins(message: ServerMessage) {
    clients.forEach((client, clientWs) => {
      if (
        clientWs.readyState === WebSocket.OPEN &&
        (client.role === 'admin' || client.role === 'supervisor')
      ) {
        clientWs.send(JSON.stringify(message));
      }
    });
  }

  async function broadcastAllResponses() {
    const allResponses = await storage.getAllSurveyResponses(); // 🔹 consultar DB
    const message: ServerMessage = { type: 'responses-survey', data: allResponses };

    clients.forEach((client, clientWs) => {
      if (
        clientWs.readyState === WebSocket.OPEN &&
        client.subscriptions.has('responses-survey')
      ) {
        clientWs.send(JSON.stringify(message));
      }
    });
  }

  async function broadcastSurveyorLocations() {
  const locations = await storage.getActiveSurveyorLocations();

  const detailedLocations = await Promise.all(
    locations.map(async (location) => {
      const user = await storage.getUser(location.userId);
      if(user?.role === "surveyor"){ 
      return {
        ...location,
        user: user
          ? {
              id: user.id,
              name: user.name,
              username: user.username,
              role: user.role,
            }
          : undefined,
      };
      }
    })
  );
  const locationsFiltered = detailedLocations.filter((loc) => loc?.user && loc?.user?.role === "surveyor");
  const message: ServerMessage = { type: 'surveyor-locations', data: locationsFiltered };

  // ✅ Solo a quienes estén suscritos
  clients.forEach((client, clientWs) => {
    if (
      clientWs.readyState === WebSocket.OPEN &&
      client.subscriptions.has('surveyor-locations')
    ) {
      clientWs.send(JSON.stringify(message));
    }
  });
}

  // === API Routes ===
  // --- Users, Zones, Surveys, Assignments, etc. ---

  // Users API
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({ message: "Access denied" });
    }
    const users = await storage.getUsers();
    res.json(users.map(user => ({ ...user, password: undefined })));
  });
//--
  app.patch("/api/users/:id", async (req, res) => {
  if (
    !req.isAuthenticated() ||
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Validar el body con zod
    const data = updateUserSchema.parse(req.body);

    const userId = Number(req.params.id);
    const updatedUser = await storage.updateUser(userId, data);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Eliminar password antes de devolverlo
    const { password, ...safeUser } = updatedUser;

    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid user data", error });
  }
});

//--
app.delete("/api/users/:id", async (req, res) => {
  if (
    !req.isAuthenticated() ||
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const userId = Number(req.params.id);
    const deleted = await storage.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user", error });
  }
});

  
  // Zones API
    app.get("/api/zones/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { id } = req.params;
    const zones = await storage.getZone(Number(id));
    res.json(zones);
  });
  
  app.get("/api/zones", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const zones = await storage.getZones();
    res.json(zones);
  });
  
  app.post("/api/zones", async (req, res) => {
    if (!req.isAuthenticated() || 
        (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const zoneData = insertZoneSchema.parse(req.body);
      const zone = await storage.createZone(zoneData);
      res.status(201).json(zone);
    } catch (error) {
      res.status(400).json({ message: "Invalid zone data", error });
    }
  });

  app.patch("/api/zones/:id", async (req, res) => {
  if (!req.isAuthenticated() ||
      (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Parse y valida el body
    const data = updateZoneSchema.parse(req.body);

    const updatedZone = await storage.updateZone(Number(req.params.id), data);

    if (!updatedZone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    res.json(updatedZone);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid zone data", error });
  }
  });

  app.delete("/api/zones/:id", async (req, res) => {
    if (!req.isAuthenticated() ||
        (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }

    const zoneId = Number(req.params.id);

    try {
      const deleted = await storage.deleteZone(zoneId);

      if (!deleted) {
        return res.status(404).json({ message: "Zone not found" });
      }

      res.json({ message: "Zone deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting zone", error });
    }
  });

  
  // Surveys API
  app.get("/api/surveys", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const surveysWithQuestions = await storage.getSurveysBySurveyorOrAll(req.user);

      // Mapear cada encuesta para agregar el conteo de respuestas
      const surveysWithCounts = await Promise.all(
        surveysWithQuestions.map(async (survey) => {
          const responses = await storage.getSurveyResponses(survey.id);
          return {
            ...survey,
            responseCount: responses.length, // cantidad de respuestas
          };
        })
      );

      res.json(surveysWithCounts);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
  app.post("/api/surveys", async (req, res) => {
    if (!req.isAuthenticated() || 
        (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const surveyData = insertSurveySchema.parse(req.body);
      const survey = await storage.createSurvey(surveyData);
      res.status(201).json(survey);
    } catch (error) {
      res.status(400).json({ message: "Invalid survey data", error });
    }
  });
  
  app.get("/api/surveys/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const surveyId = parseInt(req.params.id);
    const survey = await storage.getSurvey(surveyId);
    
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }
    
    res.json(survey);
  });

  app.patch("/api/surveys/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = updateSurveySchema.parse(req.body);
      const updated = await storage.updateSurvey(id, data);

      if (!updated) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        message: "Invalid survey data",
        error,
      });
    }
  });

  // Obtener encuestadores asignados a una encuesta
// Ver asignaciones de una encuesta
app.get("/api/surveys/:id/assignments", async (req, res) => {
  if (
    !req.isAuthenticated() ||
    (req.user.role !== "admin" && req.user.role !== "supervisor")
  ) {
    return res.status(403).json({ message: "Access denied" });
  }
  if(!req.params.id) return res.status(401).json({ message: "not id exist" });
  const surveyId = Number(req.params.id);
  const assignments = await storage.getSurveyAssignmentsBySurvey(surveyId);
  res.json(assignments);
});

// Borrar todas las asignaciones de una encuesta
app.delete("/api/surveys/:id/assignments", async (req, res) => {
  if (
    !req.isAuthenticated() ||
    (req.user.role !== "admin" && req.user.role !== "supervisor")
  ) {
    return res.status(403).json({ message: "Access denied" });
  }
  if(!req.params.id) return res.status(401).json({ message: "not id exist" });
  const surveyId = Number(req.params.id);
  const deleted = await storage.deleteSurveyAssignmentsBySurvey(surveyId);
  res.json({ success: deleted });
});



  
  // Survey Assignments API
  app.post("/api/survey-assignments", async (req, res) => {
    if (!req.isAuthenticated() || 
        (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const assignmentData = insertSurveyAssignmentSchema.parse({
        ...req.body,
        assignedBy: req.user.id
      });
      
      const assignment = await storage.assignSurvey(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignment data", error });
    }
  });
  
  app.get("/api/user-assignments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    const assignments = await storage.getUserAssignments(userId);
    
    // For each assignment, get the survey details
    const assignmentDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const survey = await storage.getSurvey(assignment.surveyId);
        return {
          ...assignment,
          survey
        };
      })
    );
    
    res.json(assignmentDetails);
  });
  
  // Survey Responses API
app.post("/api/survey-responses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });

    try {
      const validatedInfo = respondentInfoSchema.parse(req.body.respondentInfo);  
      const responseData = insertSurveyResponseSchema.parse({ ...req.body, userId: req.user.id, respondentInfo: validatedInfo, });
      const response = await storage.createSurveyResponse(responseData);

      // Emitir automáticamente la nueva respuesta
       await broadcastAllResponses();

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({ message: "Invalid response data", error });
    }
  });
  
  app.get("/api/survey-responses", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }
    const responses = await storage.getAllSurveyResponses();
    res.json(responses);
  });
  
  app.get("/api/survey-responses/:surveyId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }
    const id = req.params.surveyId;
    if(!id) return res.status(404).json({ message: "not found"})
    const surveyId = parseInt(req?.params?.surveyId);
    const responses = await storage.getSurveyResponses(surveyId);
    res.json(responses);
  });
  
  
  // Location Tracking API
  app.get("/api/surveyor-locations", async (req, res) => {
    if (!req.isAuthenticated() || 
        (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const locations = await storage.getActiveSurveyorLocations();
    
    // Get user details for each location
    const detailedLocations = await Promise.all(
      locations.map(async (location) => {
        const user = await storage.getUser(location.userId);
        return {
          ...location,
          user: user ? { 
            id: user.id, 
            name: user.name, 
            username: user.username, 
            role: user.role 
          } : undefined
        };
      })
    );
    res.json(detailedLocations);
  });
  
  // Statistics API
app.get("/api/stats", async (req, res) => {
  if (
    !req.isAuthenticated() ||
    (req.user.role !== "admin" && req.user.role !== "supervisor")
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const [users, surveys, responses, activeLocations] = await Promise.all([
    storage.getUsers(),
    storage.getSurveys(),
    Promise.all(
      (await storage.getSurveys()).map((s) =>
        storage.getSurveyResponses(s.id)
      )
    ),
    storage.getActiveSurveyorLocations(),
  ]);

  const activeSurveyors = activeLocations.filter(u => u.role === "surveyor").length;
  const totalSurveyors = users.filter((u) => u.role === "surveyor").length;
  const activeSurveys = surveys.filter((s) => s.status === "active").length;
  const totalSurveys = surveys.length;

  // ---- FECHAS EN ARG ----
  const now = new Date();
  const offsetMs = 3 * 60 * 60 * 1000; // UTC-3
  const argNow = new Date(now.getTime() - offsetMs);

  // HOY ARG
  const startOfTodayArg = new Date(
    argNow.getFullYear(),
    argNow.getMonth(),
    argNow.getDate(),
    0, 0, 0
  );

  const responsesToday = responses
    .flat()
    .filter((r) => {
      const created = new Date(r.createdAt);
      const createdArg = new Date(created.getTime() - offsetMs);
      return createdArg >= startOfTodayArg;
    }).length;

  // ---- RESPUESTAS SEMANALES ----
  // Semana actual (lunes 00:00 ARG hasta ahora)
  const dayOfWeek = argNow.getDay(); // 0=domingo, 1=lunes...
  const diffToMonday = (dayOfWeek + 6) % 7; // días a restar hasta lunes
  const startOfWeekArg = new Date(argNow);
  startOfWeekArg.setDate(argNow.getDate() - diffToMonday);
  startOfWeekArg.setHours(0, 0, 0, 0);

  // Semana pasada (lunes anterior 00:00 ARG hasta inicio de esta semana)
  const startOfLastWeekArg = new Date(startOfWeekArg);
  startOfLastWeekArg.setDate(startOfLastWeekArg.getDate() - 7);

  const endOfLastWeekArg = new Date(startOfWeekArg);

  const responsesThisWeek = responses
    .flat()
    .filter((r) => {
      const created = new Date(r.createdAt);
      const createdArg = new Date(created.getTime() - offsetMs);
      return createdArg >= startOfWeekArg;
    }).length;

  const responsesLastWeek = responses
    .flat()
    .filter((r) => {
      const created = new Date(r.createdAt);
      const createdArg = new Date(created.getTime() - offsetMs);
      return createdArg >= startOfLastWeekArg && createdArg < endOfLastWeekArg;
    }).length;

  let weeklyGrowthPercentage: number | null = null;

  if (responsesThisWeek > responsesLastWeek) {
    if (responsesLastWeek === 0) {
      // Si la semana pasada fue 0 y esta semana hay respuestas,
      // el crecimiento es "100%" en relación a que antes no había nada
      weeklyGrowthPercentage = Math.round(
        (responsesThisWeek  / 1) * 100
      );
    } else {
      weeklyGrowthPercentage = Math.round(
        ((responsesThisWeek - responsesLastWeek) / responsesLastWeek) * 100
      );
    }
  }

  // ---- COMPLETION RATE ----
  const totalResponses = responses.flat().length;
  const expectedResponses = Math.max(1, activeSurveyors * activeSurveys);
  const completionRate = Math.round(
    (totalResponses / expectedResponses) * 100
  );

  const surveyProgress = surveys.map((survey, index) => {
    const surveyResponses = responses[index] || [];
    const totalAssignments = surveyResponses.length;
    const completionPercentage =
      totalAssignments > 0
        ? Math.round((surveyResponses.length / totalAssignments) * 100)
        : 0;

    return {
      id: survey.id,
      name: survey.name,
      status: survey.status,
      completionPercentage,
    };
  });

  res.json({
    activeSurveyors,
    totalSurveyors,
    activeSurveys,
    totalSurveys,
    responsesToday,
    completionRate,
    surveyProgress,
    responsesThisWeek,
    responsesLastWeek,
    weeklyGrowthPercentage, // solo tiene valor si hubo crecimiento
  });
});

  return httpServer;
}
