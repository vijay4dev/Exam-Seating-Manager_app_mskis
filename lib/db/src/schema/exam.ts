import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

export const roomsTable = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sno: integer("sno").notNull().unique(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  benches: integer("benches").notNull().default(1),
  columns: integer("columns").notNull().default(3),
  seatsPerBench: integer("seats_per_bench").notNull().default(2),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const classesTable = sqliteTable("classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grade: integer("grade").notNull(),
  section: text("section").notNull(),
});

export const studentsTable = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rollNo: integer("roll_no").notNull(),
  classId: integer("class_id").notNull(),
  name: text("name"),
});

export const examSessionsTable = sqliteTable("exam_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("draft"),
});

export const seatingGroupsTable = sqliteTable("seating_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  name: text("name").notNull(),
  classIds: text("class_ids", { mode: "json" }).$type<number[]>().notNull(),
  roomIds: text("room_ids", { mode: "json" }).$type<number[]>().notNull(),
});

export const seatAssignmentsTable = sqliteTable("seat_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  roomId: integer("room_id").notNull(),
  columnNo: integer("column_no").notNull(),
  benchNo: integer("bench_no").notNull(),
  seatNo: integer("seat_no").notNull(),
  studentId: integer("student_id").notNull(),
  rollNo: integer("roll_no").notNull(),
  classId: integer("class_id").notNull(),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, updatedAt: true });
export type InsertRoom = {
  sno: number;
  name: string;
  type: string;
  capacity: number;
  benches: number;
  columns?: number;
  seatsPerBench?: number;
};
export type Room = typeof roomsTable.$inferSelect;
export type Class = typeof classesTable.$inferSelect;
export type Student = typeof studentsTable.$inferSelect;
export type ExamSession = typeof examSessionsTable.$inferSelect;
export type SeatingGroup = typeof seatingGroupsTable.$inferSelect;
export type SeatAssignment = typeof seatAssignmentsTable.$inferSelect;