import { users, type User, type InsertUser, zones, type Zone, type InsertZone, surveys, type Survey, type InsertSurvey, surveyAssignments, type SurveyAssignment, type InsertSurveyAssignment, surveyResponses, type SurveyResponse, type InsertSurveyResponse, surveyorLocations, type SurveyorLocation, type InsertSurveyorLocation } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { PostgresStorage } from "./PostgresStorage";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Zone management
  getZone(id: number): Promise<Zone | undefined>;
  getZones(): Promise<Zone[]>;
  createZone(zone: InsertZone): Promise<Zone>;
  updateZone(id: number, zone: Partial<InsertZone>): Promise<Zone | undefined>;
  deleteZone(id: number): Promise<boolean>;
  
  // Survey management
  getSurvey(id: number): Promise<Survey | undefined>;
  getSurveys(): Promise<Survey[]>;
  getSurveysByZone(zoneId: number): Promise<Survey[]>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  updateSurvey(id: number, survey: Partial<InsertSurvey>): Promise<Survey | undefined>;
  deleteSurvey(id: number): Promise<boolean>;
  
  // Survey assignments
  assignSurvey(assignment: InsertSurveyAssignment): Promise<SurveyAssignment>;
  getSurveyAssignments(surveyId: number): Promise<SurveyAssignment[]>;
  getUserAssignments(userId: number): Promise<SurveyAssignment[]>;
  deleteAssignment(id: number): Promise<boolean>;
  
  // Survey responses
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponses(surveyId: number): Promise<SurveyResponse[]>;
  getUserResponses(userId: number): Promise<SurveyResponse[]>;
  updateSurveyResponse(id: number, data: Partial<InsertSurveyResponse>): Promise<SurveyResponse | undefined>;
  
  // Location tracking
  updateSurveyorLocation(location: InsertSurveyorLocation): Promise<SurveyorLocation>;
  getSurveyorLocation(userId: number): Promise<SurveyorLocation | undefined>;
  getActiveSurveyorLocations(): Promise<SurveyorLocation[]>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private zones: Map<number, Zone>;
  private surveys: Map<number, Survey>;
  private surveyAssignments: Map<number, SurveyAssignment>;
  private surveyResponses: Map<number, SurveyResponse>;
  private surveyorLocations: Map<number, SurveyorLocation>;
  
  currentUserId: number;
  currentZoneId: number;
  currentSurveyId: number;
  currentAssignmentId: number;
  currentResponseId: number;
  currentLocationId: number;
  
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.zones = new Map();
    this.surveys = new Map();
    this.surveyAssignments = new Map();
    this.surveyResponses = new Map();
    this.surveyorLocations = new Map();
    
    this.currentUserId = 1;
    this.currentZoneId = 1;
    this.currentSurveyId = 1;
    this.currentAssignmentId = 1;
    this.currentResponseId = 1;
    this.currentLocationId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with default admin user
    this.createUser({
      username: "admin",
      password: "admin",
      name: "Admin User",
      role: "admin"
    });
    
    // Initialize with default supervisor user
    this.createUser({
      username: "super",
      password: "super",
      name: "Supervisor User",
      role: "supervisor"
    });
    
    // Initialize with default surveyor user
    this.createUser({
      username: "encuesta",
      password: "encuesta",
      name: "Surveyor User",
      role: "surveyor"
    });
    
    // Create default zones
    this.createZone({
      name: "Zone North",
      description: "Northern area of the city",
      coordinates: {
        type: "Polygon",
        coordinates: [
          [
            [-74.01, 40.75],
            [-74.02, 40.76],
            [-74.03, 40.75],
            [-74.02, 40.74],
            [-74.01, 40.75]
          ]
        ]
      }
    });
    
    this.createZone({
      name: "Zone South",
      description: "Southern area of the city",
      coordinates: {
        type: "Polygon",
        coordinates: [
          [
            [-74.01, 40.71],
            [-74.02, 40.72],
            [-74.03, 40.71],
            [-74.02, 40.70],
            [-74.01, 40.71]
          ]
        ]
      }
    });
    
    this.createZone({
      name: "Zone Center",
      description: "Central area of the city",
      coordinates: {
        type: "Polygon",
        coordinates: [
          [
            [-74.01, 40.73],
            [-74.02, 40.74],
            [-74.03, 40.73],
            [-74.02, 40.72],
            [-74.01, 40.73]
          ]
        ]
      }
    });
    
    // Create default surveys
    this.createSurvey({
      name: "Customer Satisfaction",
      description: "Survey to evaluate customer satisfaction with our services",
      questions: [
        {
          id: "q1",
          text: "How satisfied are you with our service?",
          type: "singleChoice",
          required: true,
          options: [
            { id: "o1", text: "Very satisfied" },
            { id: "o2", text: "Satisfied" },
            { id: "o3", text: "Neutral" },
            { id: "o4", text: "Dissatisfied" },
            { id: "o5", text: "Very dissatisfied" }
          ]
        },
        {
          id: "q2",
          text: "What aspects of our service could be improved?",
          type: "multipleChoice",
          required: true,
          options: [
            { id: "o1", text: "Speed" },
            { id: "o2", text: "Quality" },
            { id: "o3", text: "Communication" },
            { id: "o4", text: "Price" },
            { id: "o5", text: "Other" }
          ]
        },
        {
          id: "q3",
          text: "Any additional comments?",
          type: "text",
          required: false
        }
      ],
      zoneId: 1,
      status: "active"
    });
    
    this.createSurvey({
      name: "Service Needs Assessment",
      description: "Identify the needs of customers in specific areas",
      questions: [
        {
          id: "q1",
          text: "Which services are you currently using?",
          type: "multipleChoice",
          required: true,
          options: [
            { id: "o1", text: "Water" },
            { id: "o2", text: "Electricity" },
            { id: "o3", text: "Internet" },
            { id: "o4", text: "Gas" },
            { id: "o5", text: "None" }
          ]
        },
        {
          id: "q2",
          text: "How would you rate the quality of these services?",
          type: "rating",
          required: true
        },
        {
          id: "q3",
          text: "What additional services would you like to see?",
          type: "text",
          required: false
        }
      ],
      zoneId: 3,
      status: "active"
    });
    
    this.createSurvey({
      name: "Community Feedback",
      description: "Gathering feedback from community members",
      questions: [
        {
          id: "q1",
          text: "How long have you lived in this area?",
          type: "singleChoice",
          required: true,
          options: [
            { id: "o1", text: "Less than 1 year" },
            { id: "o2", text: "1-3 years" },
            { id: "o3", text: "3-5 years" },
            { id: "o4", text: "5-10 years" },
            { id: "o5", text: "More than 10 years" }
          ]
        },
        {
          id: "q2",
          text: "What do you like most about your community?",
          type: "text",
          required: true
        },
        {
          id: "q3",
          text: "What improvements would you like to see?",
          type: "text",
          required: true
        }
      ],
      zoneId: 2,
      status: "draft"
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    // Ensure required fields are present
    const role = insertUser.role || "surveyor"; // Default to surveyor if role is not provided
    const user: User = { ...insertUser, id, createdAt: now, role };
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Zone management
  async getZone(id: number): Promise<Zone | undefined> {
    return this.zones.get(id);
  }
  
  async getZones(): Promise<Zone[]> {
    return Array.from(this.zones.values());
  }
  
  async createZone(insertZone: InsertZone): Promise<Zone> {
    const id = this.currentZoneId++;
    const now = new Date();
    // Ensure required fields are present
    const description = insertZone.description ?? null;
    const zone: Zone = { ...insertZone, id, createdAt: now, description };
    this.zones.set(id, zone);
    return zone;
  }
  
  async updateZone(id: number, updateData: Partial<InsertZone>): Promise<Zone | undefined> {
    const zone = await this.getZone(id);
    if (!zone) return undefined;
    
    const updatedZone = { ...zone, ...updateData };
    this.zones.set(id, updatedZone);
    return updatedZone;
  }
  
  async deleteZone(id: number): Promise<boolean> {
    return this.zones.delete(id);
  }
  
  // Survey management
  async getSurvey(id: number): Promise<Survey | undefined> {
    return this.surveys.get(id);
  }
  
  async getSurveys(): Promise<Survey[]> {
    return Array.from(this.surveys.values());
  }
  
  async getSurveysByZone(zoneId: number): Promise<Survey[]> {
    return Array.from(this.surveys.values()).filter(
      (survey) => survey.zoneId === zoneId
    );
  }
  
  async createSurvey(insertSurvey: InsertSurvey): Promise<Survey> {
    const id = this.currentSurveyId++;
    const now = new Date();
    // Set required fields with defaults if needed
    const description = insertSurvey.description ?? null;
    const status = insertSurvey.status ?? "draft";
    const zoneId = insertSurvey.zoneId ?? null;
    
    const survey: Survey = { 
      ...insertSurvey, 
      id, 
      createdAt: now,
      description,
      status,
      zoneId
    };
    
    this.surveys.set(id, survey);
    return survey;
  }
  
  async updateSurvey(id: number, updateData: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const survey = await this.getSurvey(id);
    if (!survey) return undefined;
    
    const updatedSurvey = { ...survey, ...updateData };
    this.surveys.set(id, updatedSurvey);
    return updatedSurvey;
  }
  
  async deleteSurvey(id: number): Promise<boolean> {
    return this.surveys.delete(id);
  }
  
  // Survey assignments
  async assignSurvey(insertAssignment: InsertSurveyAssignment): Promise<SurveyAssignment> {
    const id = this.currentAssignmentId++;
    const now = new Date();
    const assignment: SurveyAssignment = { ...insertAssignment, id, assignedAt: now };
    this.surveyAssignments.set(id, assignment);
    return assignment;
  }
  
  async getSurveyAssignments(surveyId: number): Promise<SurveyAssignment[]> {
    return Array.from(this.surveyAssignments.values()).filter(
      (assignment) => assignment.surveyId === surveyId
    );
  }
  
  async getUserAssignments(userId: number): Promise<SurveyAssignment[]> {
    return Array.from(this.surveyAssignments.values()).filter(
      (assignment) => assignment.userId === userId
    );
  }
  
  async deleteAssignment(id: number): Promise<boolean> {
    return this.surveyAssignments.delete(id);
  }
  
  // Survey responses
  async createSurveyResponse(insertResponse: InsertSurveyResponse): Promise<SurveyResponse> {
    const id = this.currentResponseId++;
    const now = new Date();
    // Ensure required fields
    const location = insertResponse.location ?? {}; // Default empty object for location if not provided
    
    const response: SurveyResponse = { 
      ...insertResponse, 
      id, 
      createdAt: now,
      location
    };
    
    this.surveyResponses.set(id, response);
    return response;
  }
  
  async getSurveyResponses(surveyId: number): Promise<SurveyResponse[]> {
    return Array.from(this.surveyResponses.values()).filter(
      (response) => response.surveyId === surveyId
    );
  }
  
  async getUserResponses(userId: number): Promise<SurveyResponse[]> {
    return Array.from(this.surveyResponses.values()).filter(
      (response) => response.userId === userId
    );
  }
  
// Survey responses
  async updateSurveyResponse(
    id: number,
    updateData: Partial<InsertSurveyResponse>
  ): Promise<SurveyResponse | undefined> {
    const existing = this.surveyResponses.get(id);
    if (!existing) return undefined;

    const updated: SurveyResponse = { ...existing, ...updateData };
    this.surveyResponses.set(id, updated);
    return updated;
  }

  // Location tracking
  async updateSurveyorLocation(insertLocation: InsertSurveyorLocation): Promise<SurveyorLocation> {
    // Check if location exists
    const existingLocation = await this.getSurveyorLocation(insertLocation.userId);
    
    if (existingLocation) {
      // Update existing
      const updatedLocation: SurveyorLocation = {
        ...existingLocation,
        location: insertLocation.location,
        isActive: insertLocation.isActive ?? true, // Default to true if not specified
        updatedAt: new Date()
      };
      this.surveyorLocations.set(existingLocation.id, updatedLocation);
      return updatedLocation;
    } else {
      // Create new
      const id = this.currentLocationId++;
      const now = new Date();
      const location: SurveyorLocation = { 
        ...insertLocation, 
        id, 
        updatedAt: now,
        isActive: insertLocation.isActive ?? true // Default to true if not specified
      };
      this.surveyorLocations.set(id, location);
      return location;
    }
  }
  
  async getSurveyorLocation(userId: number): Promise<SurveyorLocation | undefined> {
    return Array.from(this.surveyorLocations.values()).find(
      (location) => location.userId === userId
    );
  }
  
  async getActiveSurveyorLocations(): Promise<SurveyorLocation[]> {
    return Array.from(this.surveyorLocations.values()).filter(
      (location) => location.isActive
    );
  }
}

export const storage = new PostgresStorage();
