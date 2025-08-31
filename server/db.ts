// db.ts
import * as dotenv from "dotenv";
dotenv.config();
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

//creacion de la conexion a la base de datos

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
//exportacion de la variable que tiene la comunicacion con la db
export const db = drizzle(pool, { schema });