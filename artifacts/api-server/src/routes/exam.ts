import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  classesTable,
  examSessionsTable,
  roomsTable,
  seatAssignmentsTable,
  seatingGroupsTable,
  studentsTable,
} from "@workspace/db";
import {
  BulkAddStudentsBody,
  BulkAddStudentsParams,
  ConfirmRoomImportBody,
  CreateRoomBody,
  CreateSeatingGroupBody,
  CreateSeatingGroupParams,
  DeleteSeatingGroupParams,
  CreateSessionBody,
  DeleteSessionParams,
  DeleteRoomParams,
  DeleteStudentParams,
  FinalizeSessionParams,
  GenerateSeatingParams,
  GetSessionAssignmentsParams,
  GetSessionAssignmentsQueryParams,
  GetSessionParams,
  AddSessionAssignmentsBody,
  AddSessionAssignmentsParams,
  ListEligibleStudentsParams,
  ListEligibleStudentsQueryParams,
  ListStudentsParams,
  LookupRoomQueryParams,
  LookupStudentQueryParams,
  PreviewRoomImportBody,
  PreviewRosterImportBody,
  ConfirmRosterImportBody,
  SwapAssignmentsBody,
  SwapAssignmentsParams,
  UpdateRoomBody,
  UpdateRoomParams,
  UpdateSessionBody,
  UpdateSessionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const numberId = (value: string) => Number.parseInt(value, 10);
const classLabel = (grade: number, section: string) => `${grade}${section}`;

function roomResponse(room: typeof roomsTable.$inferSelect) {
  return { ...room, type: room.type as "classroom" | "hall", updatedAt: room.updatedAt.toISOString() };
}

async function assignmentResponses(sessionId: number, roomId?: number) {
  const condition = roomId == null
    ? eq(seatAssignmentsTable.sessionId, sessionId)
    : and(eq(seatAssignmentsTable.sessionId, sessionId), eq(seatAssignmentsTable.roomId, roomId));
  const rows = await db.select().from(seatAssignmentsTable).where(condition).orderBy(
    asc(seatAssignmentsTable.roomId),
    asc(seatAssignmentsTable.columnNo),
    asc(seatAssignmentsTable.benchNo),
    asc(seatAssignmentsTable.seatNo),
  );
  if (rows.length === 0) return [];
  const roomIds = [...new Set(rows.map((row) => row.roomId))];
  const classIds = [...new Set(rows.map((row) => row.classId))];
  const studentIds = [...new Set(rows.map((row) => row.studentId))];
  const [rooms, classes, students] = await Promise.all([
    db.select().from(roomsTable).where(inArray(roomsTable.id, roomIds)),
    db.select().from(classesTable).where(inArray(classesTable.id, classIds)),
    db.select().from(studentsTable).where(inArray(studentsTable.id, studentIds)),
  ]);
  const roomMap = new Map(rooms.map((room) => [room.id, room.name]));
  const classMap = new Map(classes.map((item) => [item.id, classLabel(item.grade, item.section)]));
  const studentMap = new Map(students.map((student) => [student.id, student.name]));
  return rows.map((row) => ({
    id: String(row.id),
    sessionId: String(row.sessionId),
    roomId: String(row.roomId),
    roomName: roomMap.get(row.roomId) ?? "Unknown room",
    columnNo: row.columnNo,
    benchNo: row.benchNo,
    seatNo: row.seatNo,
    studentId: String(row.studentId),
    rollNo: row.rollNo,
    classId: String(row.classId),
    classLabel: classMap.get(row.classId) ?? "Unknown class",
    studentName: studentMap.get(row.studentId) ?? null,
  }));
}

function validateRoom(data: { type: string; capacity: number; benches: number; columns: number; seatsPerBench: number }) {
  if (data.columns < 1 || data.capacity < 1 || data.benches < 1 || ![1, 2].includes(data.seatsPerBench)) return "Columns, capacity, and benches must be positive; seats per bench must be 1 or 2.";
  if (data.type === "classroom" && (data.capacity < 25 || data.capacity > 50)) return "Classroom capacity must be between 25 and 50.";
  return null;
}

function calculatedRoomCapacity(data: { benches: number; columns: number; seatsPerBench: number }) {
  return data.benches * data.columns * data.seatsPerBench;
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [roomCount, classCount, studentCount, activeSessionCount, latest] = await Promise.all([
    db.select({ count: count() }).from(roomsTable),
    db.select({ count: count() }).from(classesTable),
    db.select({ count: count() }).from(studentsTable),
    db.select({ count: count() }).from(examSessionsTable).where(eq(examSessionsTable.status, "draft")),
    db.select().from(examSessionsTable).orderBy(desc(examSessionsTable.id)).limit(1),
  ]);
  res.json({
    roomCount: Number(roomCount[0]?.count ?? 0),
    classCount: Number(classCount[0]?.count ?? 0),
    studentCount: Number(studentCount[0]?.count ?? 0),
    activeSessionCount: Number(activeSessionCount[0]?.count ?? 0),
    latestSession: latest[0]
      ? { id: String(latest[0].id), name: latest[0].name, date: latest[0].date, status: latest[0].status }
      : null,
  });
});

router.get("/rooms", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).orderBy(asc(roomsTable.name));
  res.json(rooms.map(roomResponse));
});

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const validationError = validateRoom(parsed.data);
  if (validationError) { res.status(400).json({ error: validationError }); return; }
  const duplicate = await db.select({ id: roomsTable.id }).from(roomsTable).where(
    or(eq(roomsTable.sno, parsed.data.sno), eq(roomsTable.name, parsed.data.name)),
  );
  if (duplicate.length) { res.status(409).json({ error: "A room with this serial number or name already exists." }); return; }
  const [room] = await db.insert(roomsTable).values({
    ...parsed.data,
    capacity: calculatedRoomCapacity(parsed.data),
  }).returning();
  res.status(201).json(roomResponse(room));
});

router.patch("/rooms/:roomId", async (req, res): Promise<void> => {
  const params = UpdateRoomParams.safeParse(req.params);
  const body = UpdateRoomBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid room data" }); return; }
  const current = await db.select().from(roomsTable).where(eq(roomsTable.id, numberId(params.data.roomId)));
  if (!current[0]) { res.status(404).json({ error: "Room not found" }); return; }
  const merged = { ...current[0], ...body.data };
  merged.capacity = calculatedRoomCapacity(merged);
  const validationError = validateRoom(merged);
  if (validationError) { res.status(400).json({ error: validationError }); return; }
  const [room] = await db.update(roomsTable).set({ ...body.data, capacity: merged.capacity, updatedAt: new Date() }).where(eq(roomsTable.id, numberId(params.data.roomId))).returning();
  res.json(roomResponse(room));
});

router.delete("/rooms/:roomId", async (req, res): Promise<void> => {
  const params = DeleteRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(roomsTable).where(eq(roomsTable.id, numberId(params.data.roomId)));
  res.sendStatus(204);
});

router.post("/rooms/import/preview", async (req, res): Promise<void> => {
  const parsed = PreviewRoomImportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const rows = parsed.data.rows.map((row) => ({ ...row, capacity: calculatedRoomCapacity(row) }));
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const error = validateRoom(row);
    if (error) errors.push(`Row ${index + 1}: ${error}`);
  });
  res.json({ rows, errors });
});

router.post("/rooms/import/confirm", async (req, res): Promise<void> => {
  const parsed = ConfirmRoomImportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const rows = parsed.data.rows.map((row) => ({ ...row, capacity: calculatedRoomCapacity(row) }));
  const errors = rows.map(validateRoom).filter(Boolean);
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }
  const imported = await db.transaction(async (tx) => {
    await tx.delete(roomsTable);
    const created = rows.length ? await tx.insert(roomsTable).values(rows).returning() : [];
    return created.map(roomResponse);
  });
  res.status(201).json(imported);
});

router.get("/classes", async (_req, res): Promise<void> => {
  const classes = await db.select().from(classesTable).orderBy(asc(classesTable.grade), asc(classesTable.section));
  const response = await Promise.all(classes.map(async (item) => {
    const students = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.classId, item.id));
    return { id: String(item.id), grade: item.grade, section: item.section, label: classLabel(item.grade, item.section), studentCount: Number(students[0]?.count ?? 0) };
  }));
  res.json(response);
});

router.post("/classes/import/preview", async (req, res): Promise<void> => {
  const parsed = PreviewRosterImportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const errors: string[] = [];
  const seen = new Set<string>();
  parsed.data.rows.forEach((row, index) => {
    const key = `${row.grade}-${row.section.toUpperCase()}-${row.rollNo}`;
    if (row.grade < 1 || row.grade > 12) errors.push(`Row ${index + 1}: grade must be between 1 and 12.`);
    if (!/^[A-Za-z0-9]+$/.test(row.section)) errors.push(`Row ${index + 1}: section must contain only letters or numbers.`);
    if (row.rollNo < 1) errors.push(`Row ${index + 1}: roll number must be at least 1.`);
    if (seen.has(key)) errors.push(`Row ${index + 1}: duplicate roll number ${row.rollNo} in class ${row.grade}${row.section}.`);
    seen.add(key);
  });
  res.json({ rows: parsed.data.rows, errors });
});

router.post("/classes/import/confirm", async (req, res): Promise<void> => {
  const parsed = ConfirmRosterImportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const errors: string[] = [];
  const seen = new Set<string>();
  parsed.data.rows.forEach((row, index) => {
    const key = `${row.grade}-${row.section.toUpperCase()}-${row.rollNo}`;
    if (row.grade < 1 || row.grade > 12) errors.push(`Row ${index + 1}: grade must be between 1 and 12.`);
    if (!/^[A-Za-z0-9]+$/.test(row.section)) errors.push(`Row ${index + 1}: section must contain only letters or numbers.`);
    if (row.rollNo < 1) errors.push(`Row ${index + 1}: roll number must be at least 1.`);
    if (seen.has(key)) errors.push(`Row ${index + 1}: duplicate roll number ${row.rollNo} in class ${row.grade}${row.section}.`);
    seen.add(key);
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }
  const result = await db.transaction(async (tx) => {
    await tx.delete(studentsTable);
    await tx.delete(classesTable);
    const classKeys = [...new Set(parsed.data.rows.map((row) => `${row.grade}-${row.section.toUpperCase()}`))];
    const classRows = classKeys.map((key) => {
      const [grade, section] = key.split("-");
      return { grade: Number(grade), section };
    });
    const createdClasses = classRows.length ? await tx.insert(classesTable).values(classRows).returning() : [];
    const classMap = new Map(createdClasses.map((item) => [`${item.grade}-${item.section.toUpperCase()}`, item.id]));
    const studentRows = parsed.data.rows.map((row) => ({
      rollNo: row.rollNo,
      classId: classMap.get(`${row.grade}-${row.section.toUpperCase()}`)!,
      name: row.name?.trim() || null,
    }));
    const createdStudents = studentRows.length ? await tx.insert(studentsTable).values(studentRows).returning() : [];
    return { classCount: createdClasses.length, studentCount: createdStudents.length };
  });
  res.status(201).json(result);
});

router.get("/classes/:classId/students", async (req, res): Promise<void> => {
  const parsed = ListStudentsParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const students = await db.select().from(studentsTable).where(eq(studentsTable.classId, numberId(parsed.data.classId))).orderBy(asc(studentsTable.rollNo));
  res.json(students.map((student) => ({ id: String(student.id), rollNo: student.rollNo, name: student.name, classId: String(student.classId) })));
});

router.post("/classes/:classId/students", async (req, res): Promise<void> => {
  const params = BulkAddStudentsParams.safeParse(req.params);
  const body = BulkAddStudentsBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid student range" }); return; }
  if (body.data.to < body.data.from) { res.status(400).json({ error: "The ending roll number must be greater than the starting roll number." }); return; }
  const rows = await db.insert(studentsTable).values(Array.from({ length: body.data.to - body.data.from + 1 }, (_, index) => ({
    rollNo: body.data.from + index,
    classId: numberId(params.data.classId),
    name: body.data.namePrefix ? `${body.data.namePrefix} ${body.data.from + index}` : null,
  }))).returning();
  res.status(201).json(rows.map((student) => ({ id: String(student.id), rollNo: student.rollNo, name: student.name, classId: String(student.classId) })));
});

router.delete("/students/:studentId", async (req, res): Promise<void> => {
  const parsed = DeleteStudentParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.delete(studentsTable).where(eq(studentsTable.id, numberId(parsed.data.studentId)));
  res.sendStatus(204);
});

router.get("/sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(examSessionsTable).orderBy(desc(examSessionsTable.id));
  const response = await Promise.all(sessions.map(async (session) => {
    const assignments = await db.select({ count: count() }).from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, session.id));
    return { id: String(session.id), name: session.name, date: session.date, status: session.status as "draft" | "finalized", assignmentCount: Number(assignments[0]?.count ?? 0) };
  }));
  res.json(response);
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [session] = await db.insert(examSessionsTable).values(parsed.data).returning();
  res.status(201).json({ id: String(session.id), name: session.name, date: session.date, status: "draft", assignmentCount: 0 });
});

router.delete("/sessions/:sessionId", async (req, res): Promise<void> => {
  const parsed = DeleteSessionParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const sessionId = numberId(parsed.data.sessionId);
  const session = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
  if (!session[0]) { res.status(404).json({ error: "Session not found" }); return; }
  db.transaction((tx) => {
    tx.delete(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, sessionId)).run();
    tx.delete(seatingGroupsTable).where(eq(seatingGroupsTable.sessionId, sessionId)).run();
    tx.delete(examSessionsTable).where(eq(examSessionsTable.id, sessionId)).run();
  });
  res.sendStatus(204);
});

router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const parsed = GetSessionParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const sessionId = numberId(parsed.data.sessionId);
  const [session, groups] = await Promise.all([
    db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId)),
    db.select().from(seatingGroupsTable).where(eq(seatingGroupsTable.sessionId, sessionId)),
  ]);
  if (!session[0]) { res.status(404).json({ error: "Session not found" }); return; }
  const assignments = await db.select({ count: count() }).from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, sessionId));
  res.json({
    id: String(session[0].id), name: session[0].name, date: session[0].date, status: session[0].status,
    assignmentCount: Number(assignments[0]?.count ?? 0),
    groups: groups.map((group) => ({ id: String(group.id), sessionId: String(group.sessionId), name: group.name, classIds: group.classIds.map(String), roomIds: group.roomIds.map(String) })),
  });
});

router.patch("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  const body = UpdateSessionBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid session data" }); return; }
  const [session] = await db.update(examSessionsTable).set(body.data).where(eq(examSessionsTable.id, numberId(params.data.sessionId))).returning();
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  const assignments = await db.select({ count: count() }).from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, session.id));
  res.json({ id: String(session.id), name: session.name, date: session.date, status: session.status, assignmentCount: Number(assignments[0]?.count ?? 0) });
});

router.post("/sessions/:sessionId/groups", async (req, res): Promise<void> => {
  const params = CreateSeatingGroupParams.safeParse(req.params);
  const body = CreateSeatingGroupBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: body.success ? "Invalid session ID" : body.error.issues.map((issue) => issue.message).join(" ") });
    return;
  }
  const sessionId = numberId(params.data.sessionId);
  const session = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
  if (!session[0]) { res.status(404).json({ error: "Session not found. Return to the session list and open an active session." }); return; }
  const [group] = await db.insert(seatingGroupsTable).values({
    sessionId,
    name: body.data.name,
    classIds: body.data.classIds.map(numberId),
    roomIds: body.data.roomIds.map(numberId),
  }).returning();
  res.status(201).json({ id: String(group.id), sessionId: String(group.sessionId), name: group.name, classIds: group.classIds.map(String), roomIds: group.roomIds.map(String) });
});

router.delete("/sessions/:sessionId/groups/:groupId", async (req, res): Promise<void> => {
  const parsed = DeleteSeatingGroupParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const sessionId = numberId(parsed.data.sessionId);
  const groupId = numberId(parsed.data.groupId);
  const group = await db.select().from(seatingGroupsTable).where(
    and(eq(seatingGroupsTable.id, groupId), eq(seatingGroupsTable.sessionId, sessionId)),
  );
  if (!group[0]) { res.status(404).json({ error: "Seating group not found" }); return; }
  await db.transaction(async (tx) => {
    await tx.delete(seatingGroupsTable).where(eq(seatingGroupsTable.id, groupId));
    const remainingGroups = await tx.select({ roomIds: seatingGroupsTable.roomIds })
      .from(seatingGroupsTable)
      .where(eq(seatingGroupsTable.sessionId, sessionId));
    const protectedRoomIds = new Set(remainingGroups.flatMap((item) => item.roomIds));
    const removableRoomIds = group[0].roomIds.filter((roomId) => !protectedRoomIds.has(roomId));
    if (removableRoomIds.length) {
      await tx.delete(seatAssignmentsTable).where(and(
        eq(seatAssignmentsTable.sessionId, sessionId),
        inArray(seatAssignmentsTable.roomId, removableRoomIds),
      ));
    }
  });
  res.sendStatus(204);
});

router.post("/sessions/:sessionId/generate", async (req, res): Promise<void> => {
  const parsed = GenerateSeatingParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const sessionId = numberId(parsed.data.sessionId);
  const groups = await db.select().from(seatingGroupsTable).where(eq(seatingGroupsTable.sessionId, sessionId));
  if (groups.length === 0) { res.status(400).json({ error: "Create at least one seating group first." }); return; }
  const existingAssignments = await db.select().from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, sessionId));
  const assignedStudentIds = new Set(existingAssignments.map((assignment) => assignment.studentId));
  const occupiedRoomIds = new Set(existingAssignments.map((assignment) => assignment.roomId));
  for (const group of groups) {
    const classes = await db.select().from(classesTable).where(inArray(classesTable.id, group.classIds));
    const studentsByClass = new Map<number, typeof studentsTable.$inferSelect[]>();
    for (const item of classes) {
      const students = await db.select().from(studentsTable).where(eq(studentsTable.classId, item.id)).orderBy(asc(studentsTable.rollNo));
      studentsByClass.set(item.id, students.filter((student) => !assignedStudentIds.has(student.id)));
    }
    const rooms = await db.select().from(roomsTable).where(inArray(roomsTable.id, group.roomIds));
    const roomMap = new Map(rooms.map((room) => [room.id, room]));
    const rotation = [...group.classIds];
    let rotationPointer = 0;
    for (const roomId of group.roomIds) {
      if (occupiedRoomIds.has(roomId)) continue;
      const room = roomMap.get(roomId);
      if (!room) continue;
      const seats: Array<{ columnNo: number; benchNo: number; seatNo: number }> = [];
      for (let columnNo = 1; columnNo <= room.columns; columnNo += 1) {
        for (let benchNo = 1; benchNo <= room.benches; benchNo += 1) {
          for (let seatNo = 1; seatNo <= room.seatsPerBench; seatNo += 1) {
            seats.push({ columnNo, benchNo, seatNo });
          }
        }
      }
      for (let seatIndex = 0; seatIndex < seats.length; seatIndex += room.seatsPerBench) {
        const remainingStudents = [...studentsByClass.values()].reduce((total, students) => total + students.length, 0);
        if (remainingStudents < room.seatsPerBench) break;
        for (const seat of seats.slice(seatIndex, seatIndex + room.seatsPerBench)) {
        let chosenClassId: number | undefined;
        for (let attempt = 0; attempt < rotation.length; attempt += 1) {
          const candidate = rotation[(rotationPointer + attempt) % rotation.length];
          if ((studentsByClass.get(candidate)?.length ?? 0) > 0) {
            chosenClassId = candidate;
            rotationPointer = (rotation.indexOf(candidate) + 1) % rotation.length;
            break;
          }
        }
        if (chosenClassId == null) break;
        const student = studentsByClass.get(chosenClassId)?.shift();
        if (!student) break;
        assignedStudentIds.add(student.id);
        await db.insert(seatAssignmentsTable).values({
          sessionId, roomId: room.id, columnNo: seat.columnNo, benchNo: seat.benchNo, seatNo: seat.seatNo,
          studentId: student.id, rollNo: student.rollNo, classId: chosenClassId,
        });
        occupiedRoomIds.add(room.id);
      }
    }
  }
  }
  const assignments = await assignmentResponses(sessionId);
  const totalStudents = await db.select({ count: count() }).from(studentsTable);
  res.json({ assignments, assignedCount: assignments.length, unassignedCount: Math.max(0, Number(totalStudents[0]?.count ?? 0) - assignments.length) });
});

router.post("/sessions/:sessionId/finalize", async (req, res): Promise<void> => {
  const parsed = FinalizeSessionParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [session] = await db.update(examSessionsTable).set({ status: "finalized" }).where(eq(examSessionsTable.id, numberId(parsed.data.sessionId))).returning();
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  const assignments = await db.select({ count: count() }).from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, session.id));
  res.json({ id: String(session.id), name: session.name, date: session.date, status: "finalized", assignmentCount: Number(assignments[0]?.count ?? 0) });
});

router.get("/sessions/:sessionId/assignments", async (req, res): Promise<void> => {
  const params = GetSessionAssignmentsParams.safeParse(req.params);
  const query = GetSessionAssignmentsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) { res.status(400).json({ error: "Invalid assignment lookup" }); return; }
  res.json(await assignmentResponses(numberId(params.data.sessionId), query.data.roomId ? numberId(query.data.roomId) : undefined));
});

router.get("/sessions/:sessionId/eligible-students", async (req, res): Promise<void> => {
  const params = ListEligibleStudentsParams.safeParse(req.params);
  const query = ListEligibleStudentsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) { res.status(400).json({ error: "Invalid eligible student lookup" }); return; }
  const sessionId = numberId(params.data.sessionId);
  const classIds = query.data.classIds.split(",").map(numberId).filter((id) => Number.isFinite(id));
  if (!classIds.length) { res.json([]); return; }
  const assigned = await db.select({ studentId: seatAssignmentsTable.studentId }).from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, sessionId));
  const assignedIds = new Set(assigned.map((row) => row.studentId));
  const students = await db.select().from(studentsTable).where(inArray(studentsTable.classId, classIds)).orderBy(asc(studentsTable.classId), asc(studentsTable.rollNo));
  res.json(students.filter((student) => !assignedIds.has(student.id)).map((student) => ({ id: String(student.id), rollNo: student.rollNo, name: student.name, classId: String(student.classId) })));
});

router.post("/sessions/:sessionId/assignments", async (req, res): Promise<void> => {
  const params = AddSessionAssignmentsParams.safeParse(req.params);
  const body = AddSessionAssignmentsBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid manual assignment data" }); return; }
  const sessionId = numberId(params.data.sessionId);
  const roomId = numberId(body.data.roomId);
  const [session, room] = await Promise.all([
    db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId)),
    db.select().from(roomsTable).where(eq(roomsTable.id, roomId)),
  ]);
  if (!session[0] || !room[0]) { res.status(404).json({ error: "Session or room not found" }); return; }
  if (session[0].status === "finalized") { res.status(409).json({ error: "Finalized sessions cannot be edited." }); return; }
  const existing = await db.select().from(seatAssignmentsTable).where(eq(seatAssignmentsTable.sessionId, sessionId));
  const roomAssignmentCount = existing.filter((row) => row.roomId === roomId).length;
  if (roomAssignmentCount + body.data.assignments.length > room[0].capacity) {
    res.status(409).json({ error: `Room ${room[0].name} is full. No more students can be assigned.` }); return;
  }
  const existingStudents = new Set(existing.map((row) => row.studentId));
  const existingSeats = new Set(existing.filter((row) => row.roomId === roomId).map((row) => `${row.columnNo}-${row.benchNo}-${row.seatNo}`));
  const seatsPerColumn = Math.ceil(room[0].capacity / room[0].columns);
  const rowsPerColumn = Math.ceil(seatsPerColumn / room[0].seatsPerBench);
  const requestedStudents = new Set<number>();
  const requestedSeats = new Set<string>();
  const students = await db.select().from(studentsTable).where(inArray(studentsTable.id, body.data.assignments.map((item) => numberId(item.studentId))));
  const studentMap = new Map(students.map((student) => [student.id, student]));
  for (const item of body.data.assignments) {
    const studentId = numberId(item.studentId);
    const seatKey = `${item.columnNo}-${item.benchNo}-${item.seatNo}`;
    if (!studentMap.has(studentId)) { res.status(400).json({ error: `Student ${item.studentId} was not found.` }); return; }
    if (existingStudents.has(studentId) || requestedStudents.has(studentId)) { res.status(409).json({ error: "A student is already assigned in this session." }); return; }
    if (existingSeats.has(seatKey) || requestedSeats.has(seatKey)) { res.status(409).json({ error: "A selected seat is already occupied." }); return; }
    const seatOffset = (item.columnNo - 1) * seatsPerColumn + (item.benchNo - 1) * room[0].seatsPerBench + (item.seatNo - 1);
    if (item.columnNo > room[0].columns || item.benchNo > rowsPerColumn || item.seatNo > room[0].seatsPerBench || seatOffset >= room[0].capacity) { res.status(400).json({ error: "Selected seat is outside this room's layout." }); return; }
    requestedStudents.add(studentId);
    requestedSeats.add(seatKey);
  }
  db.transaction((tx) => {
    for (const item of body.data.assignments) {
      const student = studentMap.get(numberId(item.studentId))!;
      tx.insert(seatAssignmentsTable).values({ sessionId, roomId, columnNo: item.columnNo, benchNo: item.benchNo, seatNo: item.seatNo, studentId: student.id, rollNo: student.rollNo, classId: student.classId }).run();
    }
  });
  res.status(201).json(await assignmentResponses(sessionId));
});

router.post("/sessions/:sessionId/assignments/swap", async (req, res): Promise<void> => {
  const params = SwapAssignmentsParams.safeParse(req.params);
  const body = SwapAssignmentsBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid seat swap" }); return; }
  const sessionId = numberId(params.data.sessionId);
  const [first, second] = await Promise.all([
    db.select().from(seatAssignmentsTable).where(and(eq(seatAssignmentsTable.id, numberId(body.data.firstAssignmentId)), eq(seatAssignmentsTable.sessionId, sessionId))),
    db.select().from(seatAssignmentsTable).where(and(eq(seatAssignmentsTable.id, numberId(body.data.secondAssignmentId)), eq(seatAssignmentsTable.sessionId, sessionId))),
  ]);
  if (!first[0] || !second[0]) { res.status(404).json({ error: "Both assignments must exist in this session." }); return; }
  await db.update(seatAssignmentsTable).set({ studentId: second[0].studentId, rollNo: second[0].rollNo, classId: second[0].classId }).where(eq(seatAssignmentsTable.id, first[0].id));
  await db.update(seatAssignmentsTable).set({ studentId: first[0].studentId, rollNo: first[0].rollNo, classId: first[0].classId }).where(eq(seatAssignmentsTable.id, second[0].id));
  res.json(await assignmentResponses(sessionId));
});

router.get("/lookup/student", async (req, res): Promise<void> => {
  const parsed = LookupStudentQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const classId = numberId(parsed.data.classId);
  const sessionId = numberId(parsed.data.sessionId);
  const rows = await db.select().from(seatAssignmentsTable).where(and(eq(seatAssignmentsTable.sessionId, sessionId), eq(seatAssignmentsTable.classId, classId), eq(seatAssignmentsTable.rollNo, parsed.data.rollNo)));
  if (!rows[0]) { res.status(404).json({ error: "No seat found for that student." }); return; }
  const [room, item] = await Promise.all([
    db.select().from(roomsTable).where(eq(roomsTable.id, rows[0].roomId)),
    db.select().from(classesTable).where(eq(classesTable.id, classId)),
  ]);
  res.json({ rollNo: rows[0].rollNo, classLabel: item[0] ? classLabel(item[0].grade, item[0].section) : "Unknown class", roomName: room[0]?.name ?? "Unknown room", columnNo: rows[0].columnNo, benchNo: rows[0].benchNo, seatNo: rows[0].seatNo });
});

router.get("/lookup/room", async (req, res): Promise<void> => {
  const parsed = LookupRoomQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const roomId = numberId(parsed.data.roomId);
  const room = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room[0]) { res.status(404).json({ error: "Room not found" }); return; }
  res.json({ room: roomResponse(room[0]), assignments: await assignmentResponses(numberId(parsed.data.sessionId), roomId) });
});

export default router;