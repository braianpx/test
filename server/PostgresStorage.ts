import { db } from "./db";
import { eq, inArray } from "drizzle-orm";
import {
  users,
  zones,
  surveys,
  surveyAssignments,
  surveyResponses,
  surveyorLocations,
  type InsertUser,
  type User,
  type InsertZone,
  type Zone,
  type InsertSurvey,
  type Survey,
  type InsertSurveyAssignment,
  type SurveyAssignment,
  type InsertSurveyResponse,
  type SurveyResponse,
  type InsertSurveyorLocation,
  type SurveyorLocation
} from "@shared/schema";
import { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  sessionStore = null;

  // USERS
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // ZONES
  async getZones(): Promise<Zone[]> {
    return await db.select().from(zones);
  }

  async getZone(id: number): Promise<Zone | undefined> {
    const result = await db.select().from(zones).where(eq(zones.id, id));
    return result[0];
  }

  async createZone(data: InsertZone): Promise<Zone> {
    const result = await db.insert(zones).values(data).returning();
    return result[0];
  }

  async updateZone(id: number, data: Partial<InsertZone>): Promise<Zone | undefined> {
    const result = await db.update(zones).set(data).where(eq(zones.id, id)).returning();
    return result[0];
  }

  async deleteZone(id: number): Promise<boolean> {
    const result = await db.delete(zones).where(eq(zones.id, id)).returning();
    return result.length > 0;
  }

  // SURVEYS
  async getSurveys(): Promise<Survey[]> {
    return await db.select().from(surveys);
  }

  async getSurvey(id: number): Promise<Survey | undefined> {
    const result = await db.select().from(surveys).where(eq(surveys.id, id));
    return result[0];
  }

  async createSurvey(data: InsertSurvey): Promise<Survey> {
    const result = await db.insert(surveys).values(data).returning();
    return result[0];
  }

  async updateSurvey(id: number, data: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const result = await db.update(surveys).set(data).where(eq(surveys.id, id)).returning();
    return result[0];
  }

  async deleteSurvey(id: number): Promise<boolean> {
    const result = await db.delete(surveys).where(eq(surveys.id, id)).returning();
    return result.length > 0;
  }

  async getSurveysByZone(zoneId: number): Promise<Survey[]> {
    return await db.select().from(surveys).where(eq(surveys.zoneId, zoneId));
  }

  async getSurveysBySurveyorOrAll(user: { id: number; role: string }): Promise<Survey[]> {
    let surveysList: Survey[];

    if (user.role === "surveyor") {
      const assignments = await db
        .select()
        .from(surveyAssignments)
        .where(eq(surveyAssignments.userId, user.id));

      const surveyIds = assignments.map(a => a.surveyId);

      if (surveyIds.length === 0) return []; // ningún survey asignado

      surveysList = await db
        .select()
        .from(surveys)
        .where(inArray(surveys.id, surveyIds)); // ✅ usar inArray
    } else {
      surveysList = await db.select().from(surveys);
    }

    return surveysList.map(s => ({
      ...s,
      questions: s.questions || [],
    }));
  }

  async updateSurveyResponse(
    id: number,
    data: Partial<InsertSurveyResponse>
  ): Promise<SurveyResponse | undefined> {
    if (Object.keys(data).length === 0) {
      // No hay nada que actualizar, simplemente devolvemos la actual
      console.log("entro", data)
      return await this.getSurveyResponse(id);
    }
    console.log("no entro")
    const result = await db
      .update(surveyResponses)
      .set(data)
      .where(eq(surveyResponses.id, id))
      .returning();

    return result[0];
  }

  // ASSIGNMENTS
  // Obtener asignaciones de una encuesta
async getSurveyAssignmentsBySurvey(surveyId: number): Promise<SurveyAssignment[]> {
  return await db
    .select()
    .from(surveyAssignments)
    .where(eq(surveyAssignments.surveyId, surveyId));
}

// Borrar todas las asignaciones de una encuesta
async deleteSurveyAssignmentsBySurvey(surveyId: number): Promise<boolean> {
  const result = await db
    .delete(surveyAssignments)
    .where(eq(surveyAssignments.surveyId, surveyId))
    .returning();
  return result.length > 0;
}

  async assignSurvey(data: InsertSurveyAssignment): Promise<SurveyAssignment> {
    const result = await db.insert(surveyAssignments).values(data).returning();
    return result[0];
  }

  async getSurveyAssignments(): Promise<SurveyAssignment[]> {
    return await db.select().from(surveyAssignments);
  }

  async getUserAssignments(userId: number): Promise<SurveyAssignment[]> {
    return await db.select().from(surveyAssignments).where(eq(surveyAssignments.userId, userId));
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await db.delete(surveyAssignments).where(eq(surveyAssignments.id, id)).returning();
    return result.length > 0;
  }

  // RESPONSES
  async createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse> {
    const result = await db.insert(surveyResponses).values(data).returning();
    return result[0];
  }

  async getSurveyResponses(surveyId: number): Promise<SurveyResponse[]> {
    return await db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, surveyId));
  }

  async getUserResponses(userId: number): Promise<SurveyResponse[]> {
    return await db.select().from(surveyResponses).where(eq(surveyResponses.userId, userId));
  }

  async getSurveyResponse(id: number): Promise<SurveyResponse | undefined> {
    const result = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.id, id));
    return result[0];
  }

  async getAllSurveyResponses(): Promise<SurveyResponse[]> {
  return await db.select().from(surveyResponses);
  }

  // LOCATIONS
  async updateSurveyorLocation(data: InsertSurveyorLocation): Promise<SurveyorLocation> {
    const existing = await db.select().from(surveyorLocations).where(eq(surveyorLocations.userId, data.userId));
    if (existing.length > 0) {
      const result = await db.update(surveyorLocations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(surveyorLocations.userId, data.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(surveyorLocations)
        .values({ ...data, updatedAt: new Date() })
        .returning();
      return result[0];
    }
  }

  async getSurveyorLocation(userId: number): Promise<SurveyorLocation | undefined> {
    const result = await db.select().from(surveyorLocations).where(eq(surveyorLocations.userId, userId));
    return result[0];
  }

  async getActiveSurveyorLocations(): Promise<SurveyorLocation[]> {
    const defaultLocation = { type: "Point", coordinates: [0, 0] }; // lat/lng por defecto

    const locations = await db
      .select()
      .from(surveyorLocations)
      .where(eq(surveyorLocations.isActive, true));

    // Reemplazar null por coordenadas por defecto
    return locations.map(loc => ({
      ...loc,
      location: loc.location ?? defaultLocation
    }));
  }
}
