import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { Class, Dashboard, ExamSession, GetSessionAssignmentsParams, HealthStatus, ListEligibleStudentsParams, LookupResult, LookupRoomParams, LookupStudentParams, ManualAssignmentsInput, Room, RoomChart, RoomImportConfirm, RoomImportInput, RoomImportPreview, RoomInput, RoomUpdate, RosterImportConfirm, RosterImportInput, RosterImportPreview, RosterImportResult, SeatAssignment, SeatingGroup, SeatingGroupInput, SeatingPreview, SessionDetail, SessionInput, SessionUpdate, Student, StudentBulkInput, SwapInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDashboardUrl: () => string;
/**
 * @summary Get dashboard summary
 */
export declare const getDashboard: (options?: Parameters<typeof customFetch>[1]) => Promise<Dashboard>;
export declare const getGetDashboardQueryKey: () => readonly ["/api/dashboard"];
export declare const getGetDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;
export type GetDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard summary
 */
export declare function useGetDashboard<TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListRoomsUrl: () => string;
/**
 * @summary List rooms
 */
export declare const listRooms: (options?: Parameters<typeof customFetch>[1]) => Promise<Room[]>;
export declare const getListRoomsQueryKey: () => readonly ["/api/rooms"];
export declare const getListRoomsQueryOptions: <TData = Awaited<ReturnType<typeof listRooms>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRooms>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRooms>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRoomsQueryResult = NonNullable<Awaited<ReturnType<typeof listRooms>>>;
export type ListRoomsQueryError = ErrorType<unknown>;
/**
 * @summary List rooms
 */
export declare function useListRooms<TData = Awaited<ReturnType<typeof listRooms>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRooms>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateRoomUrl: () => string;
/**
 * @summary Create a room
 */
export declare const createRoom: (roomInput: RoomInput, options?: Parameters<typeof customFetch>[1]) => Promise<Room>;
export declare const getCreateRoomMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRoom>>, TError, {
        data: BodyType<RoomInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRoom>>, TError, {
    data: BodyType<RoomInput>;
}, TContext>;
export type CreateRoomMutationResult = NonNullable<Awaited<ReturnType<typeof createRoom>>>;
export type CreateRoomMutationBody = BodyType<RoomInput>;
export type CreateRoomMutationError = ErrorType<unknown>;
/**
* @summary Create a room
*/
export declare const useCreateRoom: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRoom>>, TError, {
        data: BodyType<RoomInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRoom>>, TError, {
    data: BodyType<RoomInput>;
}, TContext>;
export declare const getUpdateRoomUrl: (roomId: string) => string;
/**
 * @summary Update a room
 */
export declare const updateRoom: (roomId: string, roomUpdate: RoomUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Room>;
export declare const getUpdateRoomMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRoom>>, TError, {
        roomId: string;
        data: BodyType<RoomUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateRoom>>, TError, {
    roomId: string;
    data: BodyType<RoomUpdate>;
}, TContext>;
export type UpdateRoomMutationResult = NonNullable<Awaited<ReturnType<typeof updateRoom>>>;
export type UpdateRoomMutationBody = BodyType<RoomUpdate>;
export type UpdateRoomMutationError = ErrorType<unknown>;
/**
* @summary Update a room
*/
export declare const useUpdateRoom: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRoom>>, TError, {
        roomId: string;
        data: BodyType<RoomUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateRoom>>, TError, {
    roomId: string;
    data: BodyType<RoomUpdate>;
}, TContext>;
export declare const getDeleteRoomUrl: (roomId: string) => string;
/**
 * @summary Delete a room
 */
export declare const deleteRoom: (roomId: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteRoomMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRoom>>, TError, {
        roomId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteRoom>>, TError, {
    roomId: string;
}, TContext>;
export type DeleteRoomMutationResult = NonNullable<Awaited<ReturnType<typeof deleteRoom>>>;
export type DeleteRoomMutationError = ErrorType<unknown>;
/**
* @summary Delete a room
*/
export declare const useDeleteRoom: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRoom>>, TError, {
        roomId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteRoom>>, TError, {
    roomId: string;
}, TContext>;
export declare const getPreviewRoomImportUrl: () => string;
/**
 * @summary Preview bulk room rows
 */
export declare const previewRoomImport: (roomImportInput: RoomImportInput, options?: Parameters<typeof customFetch>[1]) => Promise<RoomImportPreview>;
export declare const getPreviewRoomImportMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewRoomImport>>, TError, {
        data: BodyType<RoomImportInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewRoomImport>>, TError, {
    data: BodyType<RoomImportInput>;
}, TContext>;
export type PreviewRoomImportMutationResult = NonNullable<Awaited<ReturnType<typeof previewRoomImport>>>;
export type PreviewRoomImportMutationBody = BodyType<RoomImportInput>;
export type PreviewRoomImportMutationError = ErrorType<unknown>;
/**
* @summary Preview bulk room rows
*/
export declare const usePreviewRoomImport: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewRoomImport>>, TError, {
        data: BodyType<RoomImportInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewRoomImport>>, TError, {
    data: BodyType<RoomImportInput>;
}, TContext>;
export declare const getConfirmRoomImportUrl: () => string;
/**
 * @summary Save previewed room rows
 */
export declare const confirmRoomImport: (roomImportConfirm: RoomImportConfirm, options?: Parameters<typeof customFetch>[1]) => Promise<Room[]>;
export declare const getConfirmRoomImportMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirmRoomImport>>, TError, {
        data: BodyType<RoomImportConfirm>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof confirmRoomImport>>, TError, {
    data: BodyType<RoomImportConfirm>;
}, TContext>;
export type ConfirmRoomImportMutationResult = NonNullable<Awaited<ReturnType<typeof confirmRoomImport>>>;
export type ConfirmRoomImportMutationBody = BodyType<RoomImportConfirm>;
export type ConfirmRoomImportMutationError = ErrorType<unknown>;
/**
* @summary Save previewed room rows
*/
export declare const useConfirmRoomImport: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirmRoomImport>>, TError, {
        data: BodyType<RoomImportConfirm>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof confirmRoomImport>>, TError, {
    data: BodyType<RoomImportConfirm>;
}, TContext>;
export declare const getListClassesUrl: () => string;
/**
 * @summary List imported classes
 */
export declare const listClasses: (options?: Parameters<typeof customFetch>[1]) => Promise<Class[]>;
export declare const getListClassesQueryKey: () => readonly ["/api/classes"];
export declare const getListClassesQueryOptions: <TData = Awaited<ReturnType<typeof listClasses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListClassesQueryResult = NonNullable<Awaited<ReturnType<typeof listClasses>>>;
export type ListClassesQueryError = ErrorType<unknown>;
/**
 * @summary List imported classes
 */
export declare function useListClasses<TData = Awaited<ReturnType<typeof listClasses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getPreviewRosterImportUrl: () => string;
/**
 * @summary Preview an uploaded roll-number list
 */
export declare const previewRosterImport: (rosterImportInput: RosterImportInput, options?: Parameters<typeof customFetch>[1]) => Promise<RosterImportPreview>;
export declare const getPreviewRosterImportMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewRosterImport>>, TError, {
        data: BodyType<RosterImportInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewRosterImport>>, TError, {
    data: BodyType<RosterImportInput>;
}, TContext>;
export type PreviewRosterImportMutationResult = NonNullable<Awaited<ReturnType<typeof previewRosterImport>>>;
export type PreviewRosterImportMutationBody = BodyType<RosterImportInput>;
export type PreviewRosterImportMutationError = ErrorType<unknown>;
/**
* @summary Preview an uploaded roll-number list
*/
export declare const usePreviewRosterImport: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewRosterImport>>, TError, {
        data: BodyType<RosterImportInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewRosterImport>>, TError, {
    data: BodyType<RosterImportInput>;
}, TContext>;
export declare const getConfirmRosterImportUrl: () => string;
/**
 * @summary Replace the current roster with uploaded rows
 */
export declare const confirmRosterImport: (rosterImportConfirm: RosterImportConfirm, options?: Parameters<typeof customFetch>[1]) => Promise<RosterImportResult>;
export declare const getConfirmRosterImportMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirmRosterImport>>, TError, {
        data: BodyType<RosterImportConfirm>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof confirmRosterImport>>, TError, {
    data: BodyType<RosterImportConfirm>;
}, TContext>;
export type ConfirmRosterImportMutationResult = NonNullable<Awaited<ReturnType<typeof confirmRosterImport>>>;
export type ConfirmRosterImportMutationBody = BodyType<RosterImportConfirm>;
export type ConfirmRosterImportMutationError = ErrorType<unknown>;
/**
* @summary Replace the current roster with uploaded rows
*/
export declare const useConfirmRosterImport: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirmRosterImport>>, TError, {
        data: BodyType<RosterImportConfirm>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof confirmRosterImport>>, TError, {
    data: BodyType<RosterImportConfirm>;
}, TContext>;
export declare const getListStudentsUrl: (classId: string) => string;
/**
 * @summary List students in a class
 */
export declare const listStudents: (classId: string, options?: Parameters<typeof customFetch>[1]) => Promise<Student[]>;
export declare const getListStudentsQueryKey: (classId: string) => readonly [`/api/classes/${string}/students`];
export declare const getListStudentsQueryOptions: <TData = Awaited<ReturnType<typeof listStudents>>, TError = ErrorType<unknown>>(classId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listStudents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListStudentsQueryResult = NonNullable<Awaited<ReturnType<typeof listStudents>>>;
export type ListStudentsQueryError = ErrorType<unknown>;
/**
 * @summary List students in a class
 */
export declare function useListStudents<TData = Awaited<ReturnType<typeof listStudents>>, TError = ErrorType<unknown>>(classId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getBulkAddStudentsUrl: (classId: string) => string;
/**
 * @summary Add students to a class
 */
export declare const bulkAddStudents: (classId: string, studentBulkInput: StudentBulkInput, options?: Parameters<typeof customFetch>[1]) => Promise<Student[]>;
export declare const getBulkAddStudentsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof bulkAddStudents>>, TError, {
        classId: string;
        data: BodyType<StudentBulkInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof bulkAddStudents>>, TError, {
    classId: string;
    data: BodyType<StudentBulkInput>;
}, TContext>;
export type BulkAddStudentsMutationResult = NonNullable<Awaited<ReturnType<typeof bulkAddStudents>>>;
export type BulkAddStudentsMutationBody = BodyType<StudentBulkInput>;
export type BulkAddStudentsMutationError = ErrorType<unknown>;
/**
* @summary Add students to a class
*/
export declare const useBulkAddStudents: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof bulkAddStudents>>, TError, {
        classId: string;
        data: BodyType<StudentBulkInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof bulkAddStudents>>, TError, {
    classId: string;
    data: BodyType<StudentBulkInput>;
}, TContext>;
export declare const getDeleteStudentUrl: (studentId: string) => string;
/**
 * @summary Remove a student
 */
export declare const deleteStudent: (studentId: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteStudentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStudent>>, TError, {
        studentId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteStudent>>, TError, {
    studentId: string;
}, TContext>;
export type DeleteStudentMutationResult = NonNullable<Awaited<ReturnType<typeof deleteStudent>>>;
export type DeleteStudentMutationError = ErrorType<unknown>;
/**
* @summary Remove a student
*/
export declare const useDeleteStudent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStudent>>, TError, {
        studentId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteStudent>>, TError, {
    studentId: string;
}, TContext>;
export declare const getListSessionsUrl: () => string;
/**
 * @summary List exam sessions
 */
export declare const listSessions: (options?: Parameters<typeof customFetch>[1]) => Promise<ExamSession[]>;
export declare const getListSessionsQueryKey: () => readonly ["/api/sessions"];
export declare const getListSessionsQueryOptions: <TData = Awaited<ReturnType<typeof listSessions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSessionsQueryResult = NonNullable<Awaited<ReturnType<typeof listSessions>>>;
export type ListSessionsQueryError = ErrorType<unknown>;
/**
 * @summary List exam sessions
 */
export declare function useListSessions<TData = Awaited<ReturnType<typeof listSessions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSessionUrl: () => string;
/**
 * @summary Create an exam session
 */
export declare const createSession: (sessionInput: SessionInput, options?: Parameters<typeof customFetch>[1]) => Promise<ExamSession>;
export declare const getCreateSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSession>>, TError, {
        data: BodyType<SessionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSession>>, TError, {
    data: BodyType<SessionInput>;
}, TContext>;
export type CreateSessionMutationResult = NonNullable<Awaited<ReturnType<typeof createSession>>>;
export type CreateSessionMutationBody = BodyType<SessionInput>;
export type CreateSessionMutationError = ErrorType<unknown>;
/**
* @summary Create an exam session
*/
export declare const useCreateSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSession>>, TError, {
        data: BodyType<SessionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSession>>, TError, {
    data: BodyType<SessionInput>;
}, TContext>;
export declare const getGetSessionUrl: (sessionId: string) => string;
/**
 * @summary Get an exam session
 */
export declare const getSession: (sessionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<SessionDetail>;
export declare const getGetSessionQueryKey: (sessionId: string) => readonly [`/api/sessions/${string}`];
export declare const getGetSessionQueryOptions: <TData = Awaited<ReturnType<typeof getSession>>, TError = ErrorType<unknown>>(sessionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSession>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSession>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSessionQueryResult = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type GetSessionQueryError = ErrorType<unknown>;
/**
 * @summary Get an exam session
 */
export declare function useGetSession<TData = Awaited<ReturnType<typeof getSession>>, TError = ErrorType<unknown>>(sessionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSession>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateSessionUrl: (sessionId: string) => string;
/**
 * @summary Update an exam session
 */
export declare const updateSession: (sessionId: string, sessionUpdate: SessionUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<ExamSession>;
export declare const getUpdateSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSession>>, TError, {
        sessionId: string;
        data: BodyType<SessionUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSession>>, TError, {
    sessionId: string;
    data: BodyType<SessionUpdate>;
}, TContext>;
export type UpdateSessionMutationResult = NonNullable<Awaited<ReturnType<typeof updateSession>>>;
export type UpdateSessionMutationBody = BodyType<SessionUpdate>;
export type UpdateSessionMutationError = ErrorType<unknown>;
/**
* @summary Update an exam session
*/
export declare const useUpdateSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSession>>, TError, {
        sessionId: string;
        data: BodyType<SessionUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSession>>, TError, {
    sessionId: string;
    data: BodyType<SessionUpdate>;
}, TContext>;
export declare const getDeleteSessionUrl: (sessionId: string) => string;
/**
 * @summary Delete an exam session and its seating data
 */
export declare const deleteSession: (sessionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSession>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSession>>, TError, {
    sessionId: string;
}, TContext>;
export type DeleteSessionMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSession>>>;
export type DeleteSessionMutationError = ErrorType<unknown>;
/**
* @summary Delete an exam session and its seating data
*/
export declare const useDeleteSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSession>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSession>>, TError, {
    sessionId: string;
}, TContext>;
export declare const getCreateSeatingGroupUrl: (sessionId: string) => string;
/**
 * @summary Create a multi-class seating group
 */
export declare const createSeatingGroup: (sessionId: string, seatingGroupInput: SeatingGroupInput, options?: Parameters<typeof customFetch>[1]) => Promise<SeatingGroup>;
export declare const getCreateSeatingGroupMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSeatingGroup>>, TError, {
        sessionId: string;
        data: BodyType<SeatingGroupInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSeatingGroup>>, TError, {
    sessionId: string;
    data: BodyType<SeatingGroupInput>;
}, TContext>;
export type CreateSeatingGroupMutationResult = NonNullable<Awaited<ReturnType<typeof createSeatingGroup>>>;
export type CreateSeatingGroupMutationBody = BodyType<SeatingGroupInput>;
export type CreateSeatingGroupMutationError = ErrorType<unknown>;
/**
* @summary Create a multi-class seating group
*/
export declare const useCreateSeatingGroup: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSeatingGroup>>, TError, {
        sessionId: string;
        data: BodyType<SeatingGroupInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSeatingGroup>>, TError, {
    sessionId: string;
    data: BodyType<SeatingGroupInput>;
}, TContext>;
export declare const getDeleteSeatingGroupUrl: (sessionId: string, groupId: string) => string;
/**
 * @summary Delete a seating group and its room assignments
 */
export declare const deleteSeatingGroup: (sessionId: string, groupId: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteSeatingGroupMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSeatingGroup>>, TError, {
        sessionId: string;
        groupId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSeatingGroup>>, TError, {
    sessionId: string;
    groupId: string;
}, TContext>;
export declare const useDeleteSeatingGroup: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSeatingGroup>>, TError, {
        sessionId: string;
        groupId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSeatingGroup>>, TError, {
    sessionId: string;
    groupId: string;
}, TContext>;
export declare const getGenerateSeatingUrl: (sessionId: string) => string;
/**
 * @summary Generate seating for all groups in a session
 */
export declare const generateSeating: (sessionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<SeatingPreview>;
export declare const getGenerateSeatingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateSeating>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateSeating>>, TError, {
    sessionId: string;
}, TContext>;
export type GenerateSeatingMutationResult = NonNullable<Awaited<ReturnType<typeof generateSeating>>>;
export type GenerateSeatingMutationError = ErrorType<unknown>;
/**
* @summary Generate seating for all groups in a session
*/
export declare const useGenerateSeating: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateSeating>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateSeating>>, TError, {
    sessionId: string;
}, TContext>;
export declare const getFinalizeSessionUrl: (sessionId: string) => string;
/**
 * @summary Finalize an exam session
 */
export declare const finalizeSession: (sessionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<ExamSession>;
export declare const getFinalizeSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof finalizeSession>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof finalizeSession>>, TError, {
    sessionId: string;
}, TContext>;
export type FinalizeSessionMutationResult = NonNullable<Awaited<ReturnType<typeof finalizeSession>>>;
export type FinalizeSessionMutationError = ErrorType<unknown>;
/**
* @summary Finalize an exam session
*/
export declare const useFinalizeSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof finalizeSession>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof finalizeSession>>, TError, {
    sessionId: string;
}, TContext>;
export declare const getGetSessionAssignmentsUrl: (sessionId: string, params?: GetSessionAssignmentsParams) => string;
/**
 * @summary List assignments for a session
 */
export declare const getSessionAssignments: (sessionId: string, params?: GetSessionAssignmentsParams, options?: Parameters<typeof customFetch>[1]) => Promise<SeatAssignment[]>;
export declare const getGetSessionAssignmentsQueryKey: (sessionId: string, params?: GetSessionAssignmentsParams) => readonly [`/api/sessions/${string}/assignments`, ...GetSessionAssignmentsParams[]];
export declare const getGetSessionAssignmentsQueryOptions: <TData = Awaited<ReturnType<typeof getSessionAssignments>>, TError = ErrorType<unknown>>(sessionId: string, params?: GetSessionAssignmentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSessionAssignments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSessionAssignments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSessionAssignmentsQueryResult = NonNullable<Awaited<ReturnType<typeof getSessionAssignments>>>;
export type GetSessionAssignmentsQueryError = ErrorType<unknown>;
/**
 * @summary List assignments for a session
 */
export declare function useGetSessionAssignments<TData = Awaited<ReturnType<typeof getSessionAssignments>>, TError = ErrorType<unknown>>(sessionId: string, params?: GetSessionAssignmentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSessionAssignments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddSessionAssignmentsUrl: (sessionId: string) => string;
/**
 * @summary Add manually selected students to room seats
 */
export declare const addSessionAssignments: (sessionId: string, manualAssignmentsInput: ManualAssignmentsInput, options?: Parameters<typeof customFetch>[1]) => Promise<SeatAssignment[]>;
export declare const getAddSessionAssignmentsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addSessionAssignments>>, TError, {
        sessionId: string;
        data: BodyType<ManualAssignmentsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addSessionAssignments>>, TError, {
    sessionId: string;
    data: BodyType<ManualAssignmentsInput>;
}, TContext>;
export type AddSessionAssignmentsMutationResult = NonNullable<Awaited<ReturnType<typeof addSessionAssignments>>>;
export type AddSessionAssignmentsMutationBody = BodyType<ManualAssignmentsInput>;
export type AddSessionAssignmentsMutationError = ErrorType<unknown>;
/**
* @summary Add manually selected students to room seats
*/
export declare const useAddSessionAssignments: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addSessionAssignments>>, TError, {
        sessionId: string;
        data: BodyType<ManualAssignmentsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addSessionAssignments>>, TError, {
    sessionId: string;
    data: BodyType<ManualAssignmentsInput>;
}, TContext>;
export declare const getListEligibleStudentsUrl: (sessionId: string, params: ListEligibleStudentsParams) => string;
/**
 * @summary List students not yet seated in a session
 */
export declare const listEligibleStudents: (sessionId: string, params: ListEligibleStudentsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Student[]>;
export declare const getListEligibleStudentsQueryKey: (sessionId: string, params?: ListEligibleStudentsParams) => readonly [`/api/sessions/${string}/eligible-students`, ...ListEligibleStudentsParams[]];
export declare const getListEligibleStudentsQueryOptions: <TData = Awaited<ReturnType<typeof listEligibleStudents>>, TError = ErrorType<unknown>>(sessionId: string, params: ListEligibleStudentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEligibleStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listEligibleStudents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListEligibleStudentsQueryResult = NonNullable<Awaited<ReturnType<typeof listEligibleStudents>>>;
export type ListEligibleStudentsQueryError = ErrorType<unknown>;
/**
 * @summary List students not yet seated in a session
 */
export declare function useListEligibleStudents<TData = Awaited<ReturnType<typeof listEligibleStudents>>, TError = ErrorType<unknown>>(sessionId: string, params: ListEligibleStudentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEligibleStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSwapAssignmentsUrl: (sessionId: string) => string;
/**
 * @summary Swap two occupied seats
 */
export declare const swapAssignments: (sessionId: string, swapInput: SwapInput, options?: Parameters<typeof customFetch>[1]) => Promise<SeatAssignment[]>;
export declare const getSwapAssignmentsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof swapAssignments>>, TError, {
        sessionId: string;
        data: BodyType<SwapInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof swapAssignments>>, TError, {
    sessionId: string;
    data: BodyType<SwapInput>;
}, TContext>;
export type SwapAssignmentsMutationResult = NonNullable<Awaited<ReturnType<typeof swapAssignments>>>;
export type SwapAssignmentsMutationBody = BodyType<SwapInput>;
export type SwapAssignmentsMutationError = ErrorType<unknown>;
/**
* @summary Swap two occupied seats
*/
export declare const useSwapAssignments: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof swapAssignments>>, TError, {
        sessionId: string;
        data: BodyType<SwapInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof swapAssignments>>, TError, {
    sessionId: string;
    data: BodyType<SwapInput>;
}, TContext>;
export declare const getLookupStudentUrl: (params: LookupStudentParams) => string;
/**
 * @summary Find a student's seat
 */
export declare const lookupStudent: (params: LookupStudentParams, options?: Parameters<typeof customFetch>[1]) => Promise<LookupResult>;
export declare const getLookupStudentQueryKey: (params?: LookupStudentParams) => readonly ["/api/lookup/student", ...LookupStudentParams[]];
export declare const getLookupStudentQueryOptions: <TData = Awaited<ReturnType<typeof lookupStudent>>, TError = ErrorType<unknown>>(params: LookupStudentParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof lookupStudent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof lookupStudent>>, TError, TData> & {
    queryKey: QueryKey;
};
export type LookupStudentQueryResult = NonNullable<Awaited<ReturnType<typeof lookupStudent>>>;
export type LookupStudentQueryError = ErrorType<unknown>;
/**
 * @summary Find a student's seat
 */
export declare function useLookupStudent<TData = Awaited<ReturnType<typeof lookupStudent>>, TError = ErrorType<unknown>>(params: LookupStudentParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof lookupStudent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getLookupRoomUrl: (params: LookupRoomParams) => string;
/**
 * @summary Get a room chart
 */
export declare const lookupRoom: (params: LookupRoomParams, options?: Parameters<typeof customFetch>[1]) => Promise<RoomChart>;
export declare const getLookupRoomQueryKey: (params?: LookupRoomParams) => readonly ["/api/lookup/room", ...LookupRoomParams[]];
export declare const getLookupRoomQueryOptions: <TData = Awaited<ReturnType<typeof lookupRoom>>, TError = ErrorType<unknown>>(params: LookupRoomParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof lookupRoom>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof lookupRoom>>, TError, TData> & {
    queryKey: QueryKey;
};
export type LookupRoomQueryResult = NonNullable<Awaited<ReturnType<typeof lookupRoom>>>;
export type LookupRoomQueryError = ErrorType<unknown>;
/**
 * @summary Get a room chart
 */
export declare function useLookupRoom<TData = Awaited<ReturnType<typeof lookupRoom>>, TError = ErrorType<unknown>>(params: LookupRoomParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof lookupRoom>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map