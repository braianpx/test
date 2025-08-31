import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "supervisor", "surveyor"] }).notNull().default("surveyor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  role: z.enum(["admin", "supervisor", "surveyor"]).optional(),
  password: z.string().min(3).optional()
});


// Zone model for geographic areas
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  coordinates: jsonb("coordinates").notNull(), // GeoJSON polygon
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertZoneSchema = createInsertSchema(zones).pick({
  name: true,
  description: true,
  coordinates: true,
});

export const updateZoneSchema = insertZoneSchema.partial();

// Survey model
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects
  zoneId: integer("zone_id").references(() => zones.id),
  status: text("status", { enum: ["draft", "active", "completed"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSurveySchema = createInsertSchema(surveys).pick({
  name: true,
  description: true,
  questions: true,
  zoneId: true,
  status: true,
});

export const updateSurveySchema = insertSurveySchema.partial();

// Survey Assignments
export const surveyAssignments = pgTable("survey_assignments", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertSurveyAssignmentSchema = createInsertSchema(surveyAssignments).pick({
  surveyId: true,
  userId: true,
  assignedBy: true,
});

// Survey responses
export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  responses: jsonb("responses").notNull(), // Array de respuestas
  location: jsonb("location"),
  respondentInfo: jsonb("respondent_info").notNull(), // Aquí guardamos solo las propiedades validadas
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).pick({
  surveyId: true,
  userId: true,
  responses: true,
  location: true,
  respondentInfo: true,
});

// Surveyor location tracking
export const surveyorLocations = pgTable("surveyor_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  location: jsonb("location").notNull().default({ type: "Point", coordinates: [0, 0] }), // GeoJSON point con default
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSurveyorLocationSchema = createInsertSchema(surveyorLocations).pick({
  userId: true,
  location: true,
  isActive: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zones.$inferSelect;

export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;

export type InsertSurveyAssignment = z.infer<typeof insertSurveyAssignmentSchema>;
export type SurveyAssignment = typeof surveyAssignments.$inferSelect;

export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

export type InsertSurveyorLocation = z.infer<typeof insertSurveyorLocationSchema>;
export type SurveyorLocation = typeof surveyorLocations.$inferSelect;

// Define a structure for Questions and Options
export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["text", "singleChoice", "multipleChoice", "rating"]),
  required: z.boolean().default(true),
  options: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),
});

export type Question = z.infer<typeof questionSchema>;

// Define a structure for survey responses
export const responseSchema = z.object({
  questionId: z.string(),
  answer: z.union([z.string(), z.array(z.string()), z.number()]),
});

export type Response = z.infer<typeof responseSchema>;

// GeoJSON types
export const pointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]), // longitude, latitude
});

export type Point = z.infer<typeof pointSchema>;

export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))), // array of rings, each ring is array of points
});

export type Polygon = z.infer<typeof polygonSchema>;
