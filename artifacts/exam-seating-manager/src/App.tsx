import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, Route, Switch, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  DoorOpen,
  Download,
  FileSpreadsheet,
  Filter,
  Grid2X2,
  LayoutDashboard,
  Loader2,
  MapPin,
  Menu,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  getGetDashboardQueryKey,
  getGetSessionAssignmentsQueryKey,
  getGetSessionQueryKey,
  getListClassesQueryKey,
  getListRoomsQueryKey,
  getListSessionsQueryKey,
  getListStudentsQueryKey,
  getListEligibleStudentsQueryKey,
  getLookupRoomQueryKey,
  getLookupStudentQueryKey,
  useConfirmRoomImport,
  useCreateRoom,
  useCreateSeatingGroup,
  useCreateSession,
  useDeleteRoom,
  useDeleteSession,
  useDeleteSeatingGroup,
  useDeleteStudent,
  useAddSessionAssignments,
  useListEligibleStudents,
  useFinalizeSession,
  useGenerateSeating,
  useGetDashboard,
  useGetSession,
  useGetSessionAssignments,
  useHealthCheck,
  useListClasses,
  useListRooms,
  useListSessions,
  useListStudents,
  useLookupRoom,
  useLookupStudent,
  usePreviewRoomImport,
  usePreviewRosterImport,
  useConfirmRosterImport,
  useSwapAssignments,
  useUpdateRoom,
  useUpdateSession,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth } from "@/lib/firebase";
import NotFound from "@/pages/not-found";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import "./index.css";

const qc = new QueryClient();
const today = new Date().toISOString().slice(0, 10);

function splitCsvLine(line: string) {
  return line
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

function derivedRoomRows(capacity: number, columns: number, seatsPerBench: number) {
  if (capacity < 1 || columns < 1 || seatsPerBench < 1) return 0;
  return Math.ceil(Math.ceil(capacity / columns) / seatsPerBench);
}

function roomCapacity(benches: number, columns: number, seatsPerBench: number) {
  if (benches < 1 || columns < 1 || seatsPerBench < 1) return 0;
  return benches * columns * seatsPerBench;
}

async function readCsvFile(file: File) {
  const lines = (await file.text())
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2)
    throw new Error(
      "The file must include a header row and at least one data row.",
    );
  const headers = splitCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/[\s_-]/g, ""),
  );
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function romanGrade(value: string) {
  const numerals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  const text = value.toUpperCase();
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = numerals[text[index]] || 0;
    const next = numerals[text[index + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total;
}

function normalizeSpreadsheetHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseRosterClass(classValue: unknown, sectionValue: unknown) {
  const text = String(classValue ?? "").trim();
  const match = text.match(/^(?:class\s*)?(\d{1,2}|[IVXL]+)(?:(?:\s*[-/]\s*|\s+)(.+)|([A-Z0-9]+))?$/i);
  if (!match) return null;
  const grade = /^\d+$/.test(match[1]) ? Number(match[1]) : romanGrade(match[1]);
  const explicitSection = String(sectionValue ?? "").trim();
  const classQualifier = String(match[2] ?? match[3] ?? "")
    .trim()
    .replace(/[\s_-]+/g, " ");
  const normalizedQualifier = classQualifier.toUpperCase();
  const normalizedSection = explicitSection.toUpperCase();
  const department = !explicitSection
    ? classQualifier
    : normalizedQualifier === normalizedSection
      ? ""
      : normalizedQualifier.endsWith(` ${normalizedSection}`)
        ? classQualifier.slice(0, -explicitSection.length).trim()
        : classQualifier;
  const normalizedDepartment = department
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  const section = [normalizedDepartment, explicitSection.toUpperCase()]
    .filter(Boolean)
    .join(" ")
    .trim()
    .replace(/\s+/g, " ");
  if (grade < 1 || grade > 12 || !/^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(section)) return null;
  return { grade, section };
}

async function readRosterExcelFile(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
  const rows: { grade: number; section: string; rollNo: number; name: string }[] = [];
  const errors: string[] = [];
  let foundHeader = false;

  workbook.SheetNames.forEach((sheetName) => {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const headerIndex = sheetRows.findIndex((row) => {
      const headers = row.map(normalizeSpreadsheetHeader);
      return (
        headers.some((header) => ["rollno", "rollnumber"].includes(header)) &&
        headers.some((header) => ["studentname", "name"].includes(header)) &&
        headers.some((header) => ["class", "grade"].includes(header)) &&
        headers.some((header) => ["sec", "section"].includes(header))
      );
    });
    if (headerIndex < 0) return;
    foundHeader = true;

    const headers = sheetRows[headerIndex].map(normalizeSpreadsheetHeader);
    const indexOf = (names: string[]) => headers.findIndex((header) => names.includes(header));
    const snoIndex = indexOf(["sno", "serialno", "serialnumber"]);
    const rollIndex = indexOf(["rollno", "rollnumber"]);
    const nameIndex = indexOf(["studentname", "name"]);
    const classIndex = indexOf(["class", "grade"]);
    const sectionIndex = indexOf(["sec", "section"]);
    let lastClass = "";
    let lastSection = "";

    sheetRows.slice(headerIndex + 1).forEach((row, rowIndex) => {
      const rollText = String(row[rollIndex] ?? "").trim();
      const name = String(row[nameIndex] ?? "").trim();
      const classText = String(row[classIndex] ?? "").trim() || lastClass;
      const sectionText = String(row[sectionIndex] ?? "").trim() || lastSection;
      if (!rollText && !name && !classText && !sectionText) return;
      if (classText) lastClass = classText;
      if (sectionText) lastSection = sectionText;

      const rowNumber = String(row[snoIndex] ?? rowIndex + 1).trim();
      const classInfo = parseRosterClass(classText, sectionText);
      const seniorRoll = rollText.match(/^(\d{1,2})([A-Z])\s*[- ]?\s*(\d+)$/i);
      const standardRoll = rollText.match(/^(\d+)$/);
      const rollNo = Number(seniorRoll?.[3] || standardRoll?.[1]);
      if (!classInfo || !Number.isFinite(rollNo) || rollNo < 1 || !name) {
        errors.push(`SNo ${rowNumber}: could not read a valid roll number, student name, class, or section.`);
        return;
      }
      if (
        seniorRoll &&
        Number(seniorRoll[1]) !== classInfo.grade
      ) {
        errors.push(`SNo ${rowNumber}: roll number grade does not match class ${classInfo.grade}.`);
        return;
      }
      rows.push({ ...classInfo, rollNo, name });
    });
  });

  if (!foundHeader) {
    errors.push("Could not find columns for Roll No, Student Name, Class, and Sec in this workbook.");
  }
  rows.sort((left, right) => left.grade - right.grade || left.section.localeCompare(right.section) || left.rollNo - right.rollNo);
  return { rows, errors };
}

function Button({ children, variant = "dark", className = "", ...props }: any) {
  const styles: Record<string, string> = {
    dark: "bg-primary text-primary-foreground hover:opacity-90",
    yellow: "bg-accent text-accent-foreground hover:brightness-95",
    quiet: "bg-secondary text-secondary-foreground hover:bg-muted",
    outline:
      "bg-card text-foreground border border-border hover:border-primary/40 hover:bg-secondary/60",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    ghost:
      "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
  };
  return (
    <button
      data-testid={props["data-testid"] || "button-action"}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
function Card({ children, className = "", ...props }: any) {
  return (
    <section
      className={`rounded-xl border border-card-border bg-card shadow-[var(--shadow-sm)] ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}
function Empty({ icon: Icon = ClipboardList, title, copy, action }: any) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
      <div className="mb-3 rounded-xl border border-border bg-secondary p-3 text-muted-foreground">
        <Icon size={22} />
      </div>
      <h3 className="font-extrabold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
      <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-destructive">
        <RefreshCw size={21} />
      </div>
      <h3 className="font-extrabold">The control room is offline</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        We could not load this view. Try again in a moment.
      </p>
      {retry && (
        <Button variant="outline" className="mt-4" onClick={retry}>
          <RefreshCw size={14} /> Retry
        </Button>
      )}
    </div>
  );
}
function Field({ label, className = "", type, onChange, onKeyDown, ...props }: any) {
  const handleChange = (event: any) => {
    if (type === "number") {
      event.currentTarget.value = event.currentTarget.value.replace(/[^0-9]/g, "");
    }
    onChange?.(event);
  };
  const handleKeyDown = (event: any) => {
    if (type === "number" && [".", ",", "e", "E", "+", "-"].includes(event.key)) {
      event.preventDefault();
    }
    onKeyDown?.(event);
  };
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </span>
      <input
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent/40"
        type={type}
        step={type === "number" ? 1 : undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </label>
  );
}
function SelectField({ label, children, className = "", ...props }: any) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </span>
      <select
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent/40"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
function Status({ children, tone = "yellow" }: any) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${tone === "green" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : tone === "red" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-accent/35 text-accent-foreground"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
function PageHeader({ eyebrow, title, copy, action }: any) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[.2em] text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
          {title}
        </h1>
        {copy && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: any) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (authError: any) {
      setError(
        authError?.code === "auth/invalid-credential"
          ? "That email or password is not recognised."
          : "We could not sign you in. Check the account details and try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary text-accent">
            <Grid2X2 size={22} />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
            Seatline / admin access
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage rooms, rosters, and exam seating plans.
          </p>
        </div>
        <Card className="p-6 sm:p-7">
          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Admin email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event: any) => setEmail(event.target.value)}
              placeholder="you@school.org"
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event: any) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <Button className="w-full" variant="yellow" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <ShieldCheck size={15} />
              )}{" "}
              Sign in
            </Button>
          </form>
          <div className="mt-5 border-t border-dashed border-border pt-4 text-center text-[11px] text-muted-foreground">
            Lookup remains available without an account.
          </div>
        </Card>
      </div>
    </div>
  );
}

function AuthBoundary({ children }: { children: any }) {
  const [location] = useLocation();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(firebaseAuth, setUser), []);

  if (user === undefined) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }
  if (!user && location !== "/lookup") return <LoginPage />;
  return children;
}

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/classes", label: "Classes & students", icon: BookOpen },
  { href: "/sessions", label: "Exam sessions", icon: CalendarDays },
  { href: "/lookup", label: "Public lookup", icon: Search },
];
function Shell({ children }: { children: any }) {
  const [loc, setLoc] = useLocation();
  const [open, setOpen] = useState(false);
  useHealthCheck({ query: { queryKey: ["health"] } });
  const current =
    nav.find((n) => n.href === loc)?.label ||
    (loc.startsWith("/sessions/")
      ? "Session builder"
      : loc.startsWith("/print/")
        ? "Print center"
        : "Control room");
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6">
          <Link
            href="/"
            data-testid="link-brand"
            className="flex items-center gap-3"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Grid2X2 size={19} strokeWidth={2.5} />
            </span>
            <span>
              <strong className="block text-[15px] tracking-[-.03em]">
                Seatline
              </strong>
              <small className="font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/55">
                exam operations
              </small>
            </span>
          </Link>
          <button
            className="text-sidebar-foreground/60 md:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 px-3 py-7">
          <div className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/45">
            Workspace
          </div>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-nav-${label.toLowerCase().replace(/\W/g, "-")}`}
              onClick={() => setOpen(false)}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition ${loc === href ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
            >
              <Icon size={17} />
              {label}
              {href === "/lookup" && (
                <span className="ml-auto rounded bg-sidebar-foreground/10 px-1.5 py-0.5 font-mono text-[9px]">
                  PUBLIC
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/55 p-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-primary font-mono text-[10px] font-bold text-sidebar-primary-foreground">
                AO
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold">
                  {firebaseAuth.currentUser?.email || "Assessment office"}
                </div>
                <div className="font-mono text-[9px] text-sidebar-foreground/50">
                  ADMIN ACCESS
                </div>
              </div>
              <button
                aria-label="Sign out"
                onClick={() => signOut(firebaseAuth)}
                className="ml-auto rounded p-1 text-sidebar-foreground/50 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div className="md:pl-[248px]">
        <header className="no-print sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-secondary md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">
                Seatline / {current}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All
                systems operational
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              data-testid="button-notifications"
            >
              <Bell size={17} />
            </button>
            <button
              className="hidden rounded-lg border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground sm:block"
              data-testid="button-settings"
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 sm:p-8">
          <div className="page-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const q = useGetDashboard();
  const rooms = useListRooms();
  const classes = useListClasses();
  const sessions = useListSessions();
  if (q.isLoading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  if (q.isError) return <ErrorState retry={() => q.refetch()} />;
  const d: any = q.data || {
    roomCount: 0,
    classCount: 0,
    studentCount: 0,
    activeSessionCount: 0,
    latestSession: null,
  };
  const stats = [
    {
      label: "Rooms ready",
      value: d.roomCount,
      icon: DoorOpen,
      tint: "text-chart-2",
    },
    {
      label: "Classes",
      value: d.classCount,
      icon: BookOpen,
      tint: "text-chart-3",
    },
    {
      label: "Students",
      value: d.studentCount,
      icon: Users,
      tint: "text-chart-5",
    },
    {
      label: "Active sessions",
      value: d.activeSessionCount,
      icon: Zap,
      tint: "text-destructive",
    },
  ];
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Tuesday · 08 October 2024"
        title="Good morning, assessment office."
        copy="The room is set. Here is your exam-day pulse."
        action={
          <Link
            href="/sessions/new"
            data-testid="link-start-session"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} /> New session
          </Link>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <Card
            key={label}
            className="group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"
          >
            <div className="mb-5 flex items-start justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                {label}
              </span>
              <Icon className={`${tint} opacity-80`} size={18} />
            </div>
            <div className="font-mono text-3xl font-medium tracking-[-.08em]">
              {value.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {label === "Active sessions"
                ? "Needs attention today"
                : "Across your workspace"}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <Card className="data-grid overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-card/85 px-5 py-4">
            <div>
              <h2 className="font-extrabold tracking-tight">
                Today at a glance
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A quick read on your operating capacity.
              </p>
            </div>
            <Link
              href="/rooms"
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              View rooms <ArrowRight size={13} className="ml-1 inline" />
            </Link>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <div className="bg-card/95 p-5">
              <div className="mb-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Capacity
              </div>
              <div className="flex items-end gap-2">
                <strong className="font-mono text-3xl">
                  {rooms.data?.reduce(
                    (n: number, r: any) => n + r.capacity,
                    0,
                  ) || 0}
                </strong>
                <span className="mb-1 text-xs text-muted-foreground">
                  seats
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded bg-muted">
                <div className="h-full w-[72%] rounded bg-accent" />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Upload rooms to set capacity
              </div>
            </div>
            <div className="bg-card/95 p-5">
              <div className="mb-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Roll coverage
              </div>
              <div className="flex items-end gap-2">
                <strong className="font-mono text-3xl">
                  {classes.data?.length || 0}
                </strong>
                <span className="mb-1 text-xs text-muted-foreground">
                  imported sections
                </span>
              </div>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded ${classes.data?.length && i <= Math.min(classes.data.length, 7) ? "bg-chart-3" : "bg-muted"}`}
                  />
                ))}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Upload a roll list to begin
              </div>
            </div>
            <div className="bg-card/95 p-5">
              <div className="mb-5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Sessions
              </div>
              <div className="flex items-end gap-2">
                <strong className="font-mono text-3xl">
                  {sessions.data?.length || 0}
                </strong>
                <span className="mb-1 text-xs text-muted-foreground">
                  on record
                </span>
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">
                Most recent: {d.latestSession?.name || "No session yet"}
              </div>
              <Link
                href="/sessions"
                className="mt-2 inline-block text-[11px] font-bold text-chart-2"
              >
                Open session list →
              </Link>
            </div>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-extrabold tracking-tight">Recent session</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your last seating plan.
              </p>
            </div>
            <CalendarDays size={17} className="text-muted-foreground" />
          </div>
          {d.latestSession ? (
            <div className="p-5">
              <Status
                tone={
                  d.latestSession.status === "finalized" ? "green" : "yellow"
                }
              >
                {d.latestSession.status}
              </Status>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight">
                {d.latestSession.name}
              </h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {d.latestSession.date}
              </p>
              <div className="my-6 border-t border-dashed border-border" />
              <Link
                href={`/sessions/${d.latestSession.id}`}
                data-testid="link-latest-session"
                className="flex items-center justify-between rounded-lg bg-secondary px-3.5 py-3 text-xs font-bold hover:bg-muted"
              >
                Review seating plan <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <Empty
              icon={CalendarDays}
              title="No sessions yet"
              copy="Create your first exam session to start building a seating plan."
              action={
                <Link
                  href="/sessions/new"
                  className="text-xs font-bold underline"
                >
                  Create session
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function Rooms() {
  const q = useListRooms();
  const classes = useListClasses();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const update = useUpdateRoom();
  const create = useCreateRoom();
  const remove = useDeleteRoom();
  const preview = usePreviewRoomImport();
  const confirmImport = useConfirmRoomImport();
  const [modal, setModal] = useState<"room" | "create" | "import" | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [createForm, setCreateForm] = useState<any>({
    sno: "",
    classId: "",
    type: "classroom",
    capacity: "0",
    benches: "",
    columns: "3",
    seatsPerBench: "2",
  });
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const updateLayoutField = (setter: any, field: string, value: string) => {
    setter((current: any) => {
      const next = { ...current, [field]: value };
      next.capacity = String(
        roomCapacity(
          Number(next.benches),
          Number(next.columns),
          Number(next.seatsPerBench),
        ),
      );
      return next;
    });
  };
  const save = (e: any) => {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...form,
      sno: Number(form.sno),
      capacity: Number(form.capacity),
      benches: Number(form.benches),
      columns: Number(form.columns),
      seatsPerBench: Number(form.seatsPerBench) as 1 | 2,
    };
    update.mutate(
      { roomId: editing.id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          q.refetch();
          setModal(null);
        },
      },
    );
  };
  const saveNew = (e: any) => {
    e.preventDefault();
    const selectedClass = classes.data?.find((item: any) => item.id === createForm.classId);
    if (!selectedClass) return;
    create.mutate(
      {
        data: {
          ...createForm,
          sno: Number(createForm.sno),
          name: selectedClass.label,
          capacity: Number(createForm.capacity),
          benches: Number(createForm.benches),
          columns: Number(createForm.columns),
          seatsPerBench: Number(createForm.seatsPerBench) as 1 | 2,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          setModal(null);
          setCreateForm({
            sno: "",
            classId: "",
            type: "classroom",
            capacity: "0",
            benches: "",
            columns: "3",
            seatsPerBench: "2",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Room could not be added",
            description: error?.message || "Check the serial number and room name.",
          });
        },
      },
    );
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r, capacity: String(r.capacity) });
    setModal("room");
  };
  const parseImport = async () => {
    if (!roomFile) return;
    try {
      const sourceRows = await readCsvFile(roomFile);
      const rows = sourceRows.map((row: any, index: number) => {
        const columns = Number(row.columns) || 3;
        const seatsPerBench = Number(row.seatsperbench) === 1 ? 1 : 2;
        const requestedCapacity = Number(row.capacity);
        const benches =
          Number(row.benches) ||
          Math.max(
            1,
            Math.ceil(
              (Number.isFinite(requestedCapacity) ? requestedCapacity : 0) /
                (columns * seatsPerBench),
            ),
          );
        return {
          sno: Number(row.sno) || index + 1,
          name: row.name,
          type: row.type === "hall" ? "hall" : "classroom",
          capacity:
            Number.isFinite(requestedCapacity) && requestedCapacity > 0
              ? requestedCapacity
              : roomCapacity(benches, columns, seatsPerBench),
          benches,
          columns,
          seatsPerBench,
        };
      });
      preview.mutate(
        { data: { fileName: roomFile.name, rows } as any },
        { onSuccess: setPreviewData },
      );
    } catch (error: any) {
      setPreviewData({ rows: [], errors: [error.message] });
    }
  };
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Workspace / infrastructure"
        title="Rooms"
        copy="Add rooms manually or upload a room-and-capacity file."
        action={
          <div className="flex gap-2">
            <Button variant="yellow" onClick={() => setModal("create")}>
              <Plus size={15} /> Add room
            </Button>
            <Button variant="outline" onClick={() => setModal("import")}>
              <FileSpreadsheet size={15} /> Upload room file
            </Button>
          </div>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-extrabold">
              All rooms{" "}
              <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">
                {q.data?.length || 0}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <input
                className="h-9 w-48 rounded-lg border border-input bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
                placeholder="Find a room"
              />
            </div>
            <Button variant="ghost" className="px-2.5">
              <Filter size={15} />
            </Button>
          </div>
        </div>
        {q.isLoading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.length ? (
          <Empty
            icon={DoorOpen}
            title="No rooms in the register"
            copy="Upload a room-and-capacity CSV file to begin."
            action={
              <Button variant="yellow" onClick={() => setModal("import")}>
                <FileSpreadsheet size={15} /> Upload room file
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/55 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">Layout</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((r: any) => (
                  <tr
                    key={r.id}
                    data-testid={`row-room-${r.id}`}
                    className="border-t border-border/70 transition hover:bg-secondary/35"
                  >
                    <td className="px-5 py-4 font-bold">{r.name}</td>
                    <td className="px-5 py-4">
                      <span className="rounded bg-secondary px-2 py-1 text-[11px] font-bold capitalize">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {r.capacity}{" "}
                      <span className="text-xs text-muted-foreground">
                        seats
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {r.columns} cols · {r.seatsPerBench}/bench
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {r.updatedAt
                        ? new Date(r.updatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={() => openEdit(r)}
                          data-testid={`button-edit-room-${r.id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="rounded p-2 text-muted-foreground hover:bg-red-100 hover:text-destructive"
                          onClick={() => {
                            if (confirm("Remove this room from the register?"))
                              remove.mutate(
                                { roomId: r.id },
                                {
                                  onSuccess: () =>
                                    queryClient.invalidateQueries({
                                      queryKey: getListRoomsQueryKey(),
                                    }),
                                },
                              );
                          }}
                          data-testid={`button-delete-room-${r.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {modal === "room" && form && (
        <Modal title="Edit room" onClose={() => setModal(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field
              label="Room name"
              required
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Serial number"
                type="number"
                min="1"
                required
                value={form.sno}
                onChange={(e: any) => setForm({ ...form, sno: e.target.value })}
              />
              <Field
                label="Rows / benches"
                type="number"
                min="1"
                required
                value={form.benches}
                onChange={(e: any) =>
                  updateLayoutField(setForm, "benches", e.target.value)
                }
              />
              <Field
                label="Total room capacity"
                type="number"
                min="1"
                max={roomCapacity(Number(form.benches), Number(form.columns), Number(form.seatsPerBench))}
                required
                value={form.capacity}
                onChange={(e: any) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <div className="rounded-lg border border-dashed border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider">Layout maximum</span>
              <span className="font-mono text-sm text-foreground">
                {roomCapacity(Number(form.benches), Number(form.columns), Number(form.seatsPerBench))} seats
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Columns"
                type="number"
                min="1"
                required
                value={form.columns}
                onChange={(e: any) =>
                  updateLayoutField(setForm, "columns", e.target.value)
                }
              />
              <SelectField
                label="Seats/bench"
                value={form.seatsPerBench}
                onChange={(e: any) =>
                  updateLayoutField(setForm, "seatsPerBench", e.target.value)
                }
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </SelectField>
            </div>
            <Button className="w-full" disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Check size={15} />
              )}{" "}
              Save changes
            </Button>
          </form>
        </Modal>
      )}
      {modal === "create" && (
        <Modal title="Add room manually" onClose={() => setModal(null)}>
          <form onSubmit={saveNew} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Serial number"
                type="number"
                min="1"
                required
                value={createForm.sno}
                onChange={(e: any) =>
                  setCreateForm({ ...createForm, sno: e.target.value })
                }
              />
              <SelectField
                label="Class / room group"
                required
                value={createForm.classId}
                onChange={(e: any) => {
                  const classId = e.target.value;
                  const studentCount = classes.data?.find((item: any) => item.id === classId)?.studentCount || 0;
                  setCreateForm({
                    ...createForm,
                    classId,
                    benches: String(derivedRoomRows(studentCount, Number(createForm.columns), Number(createForm.seatsPerBench))),
                    capacity: String(roomCapacity(
                      derivedRoomRows(studentCount, Number(createForm.columns), Number(createForm.seatsPerBench)),
                      Number(createForm.columns),
                      Number(createForm.seatsPerBench),
                    )),
                  });
                }}
              >
                <option value="">Choose imported class</option>
                {classes.data?.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.studentCount} students
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Total room capacity"
                type="number"
                min="1"
                max={roomCapacity(Number(createForm.benches), Number(createForm.columns), Number(createForm.seatsPerBench))}
                required
                value={createForm.capacity}
                onChange={(e: any) => setCreateForm({ ...createForm, capacity: e.target.value })}
              />
              <div className="rounded-lg border border-dashed border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider">Layout maximum</span>
                <span className="font-mono text-sm text-foreground">
                  {roomCapacity(Number(createForm.benches), Number(createForm.columns), Number(createForm.seatsPerBench)) || "—"} seats
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Rows / benches"
                type="number"
                min="1"
                required
                value={createForm.benches}
                onChange={(e: any) =>
                  updateLayoutField(setCreateForm, "benches", e.target.value)
                }
              />
              <Field
                label="Columns"
                type="number"
                min="1"
                required
                value={createForm.columns}
                onChange={(e: any) =>
                  updateLayoutField(setCreateForm, "columns", e.target.value)
                }
              />
              <SelectField
                label="Seats per bench"
                value={createForm.seatsPerBench}
                onChange={(e: any) =>
                  updateLayoutField(setCreateForm, "seatsPerBench", e.target.value)
                }
              >
                <option value="1">1 seat</option>
                <option value="2">2 seats</option>
              </SelectField>
            </div>
            <Button
              className="w-full"
              variant="yellow"
              disabled={create.isPending}
            >
              {create.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Plus size={15} />
              )}{" "}
              Add room
            </Button>
          </form>
        </Modal>
      )}
      {modal === "import" && (
        <Modal
          title="Upload rooms"
          onClose={() => {
            setModal(null);
            setRoomFile(null);
            setPreviewData(null);
          }}
          wide
        >
          <div className="mb-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">CSV columns:</span>{" "}
            name,type,capacity,columns,seatsPerBench
          </div>
          {!previewData ? (
            <>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e: any) => {
                  setRoomFile(e.target.files?.[0] || null);
                  setPreviewData(null);
                }}
                className="block w-full rounded-lg border border-dashed border-input bg-background p-4 text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Uploading a file replaces the current room register.
              </p>
              <Button
                className="mt-4 w-full"
                variant="yellow"
                onClick={parseImport}
                disabled={!roomFile || preview.isPending}
              >
                {preview.isPending ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <FileSpreadsheet size={15} />
                )}{" "}
                Preview file
              </Button>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold">
                  {previewData.rows?.length || 0} rows ready
                </div>
                {previewData.errors?.length > 0 && (
                  <Status tone="red">{previewData.errors.length} errors</Status>
                )}
              </div>
              <div className="max-h-56 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {previewData.rows?.map((r: any, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2 font-bold">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.type}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.capacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewData(null)}
                >
                  Back
                </Button>
                <Button
                  variant="yellow"
                  className="flex-1"
                  onClick={() =>
                    confirmImport.mutate(
                      { data: { rows: previewData.rows } },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: getListRoomsQueryKey(),
                          });
                          setModal(null);
                          setRoomFile(null);
                          setPreviewData(null);
                        },
                      },
                    )
                  }
                  disabled={
                    confirmImport.isPending || !!previewData.errors?.length
                  }
                >
                  <Check size={15} /> Replace rooms
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function RosterImportControl({ hasRoster, onRosterChanged }: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const preview = usePreviewRosterImport();
  const confirmImport = useConfirmRosterImport();
  const [open, setOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const parse = async () => {
    if (!file) return;
    try {
      const parsed = await readRosterExcelFile(file);
      const { rows } = parsed;
      if (!rows.length)
        throw new Error(
          parsed.errors[0] || "No student rows were found in this workbook.",
        );
      preview.mutate(
        {
          data: {
            fileName: file.name,
            rows,
          },
        },
        {
          onSuccess: (result) =>
            setPreviewData({
              ...result,
              errors: [...parsed.errors, ...result.errors],
            }),
        },
      );
    } catch (error: any) {
      setPreviewData({ rows: [], errors: [error.message] });
    }
  };
  const close = () => {
    setOpen(false);
    setFile(null);
    setPreviewData(null);
  };
  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <FileSpreadsheet size={15} /> Upload roster Excel
        </Button>
        {hasRoster && (
          <Button variant="danger" onClick={() => setClearOpen(true)}>
            <Trash2 size={15} /> Remove current roster
          </Button>
        )}
      </div>
      {open && (
        <Modal title="Upload student roster Excel" onClose={close} wide>
          <div className="mb-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            The workbook should contain SNo, Roll No, Student Name, Class, and
            Sec columns. Students will be grouped by class and section.
          </div>
          {!previewData ? (
            <>
              <input
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e: any) => {
                  setFile(e.target.files?.[0] || null);
                  setPreviewData(null);
                }}
                className="block w-full rounded-lg border border-dashed border-input bg-background p-4 text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {file?.name || "Select one Excel workbook containing the full roster."}
              </p>
              <Button
                className="mt-4 w-full"
                variant="yellow"
                onClick={parse}
                disabled={!file || preview.isPending}
              >
                {preview.isPending ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <FileSpreadsheet size={15} />
                )}{" "}
                Preview roster
              </Button>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold">
                  {previewData.rows?.length || 0} rows ready
                </div>
                {previewData.errors?.length > 0 && (
                  <Status tone="red">{previewData.errors.length} errors</Status>
                )}
              </div>
              {!!previewData.errors?.length && (
                <div className="mb-3 max-h-24 overflow-auto rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {previewData.errors.slice(0, 8).map((error: string, index: number) => (
                    <div key={index}>{error}</div>
                  ))}
                  {previewData.errors.length > 8 && (
                    <div>And {previewData.errors.length - 8} more errors.</div>
                  )}
                </div>
              )}
              <div className="max-h-56 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {previewData.rows
                      ?.slice(0, 100)
                      .map((row: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-3 py-2 font-bold">
                            Class {row.grade} {row.section}
                          </td>
                          <td className="px-3 py-2 font-mono">{row.rollNo}</td>
                          <td className="px-3 py-2">{row.name || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewData(null)}
                >
                  Back
                </Button>
                <Button
                  variant="yellow"
                  className="flex-1"
                  onClick={() =>
                    confirmImport.mutate(
                      { data: { rows: previewData.rows } },
                      {
                        onSuccess: async () => {
                          close();
                          onRosterChanged?.();
                          await queryClient.invalidateQueries({
                            queryKey: getListClassesQueryKey(),
                          });
                          toast({
                            title: "Import successful",
                            description: `${previewData.rows.length} students imported across ${new Set(previewData.rows.map((row: any) => `${row.grade}${row.section}`)).size} classes.`,
                          });
                        },
                        onError: (error: any) =>
                          toast({
                            title: "Roster import failed",
                            description: error.message || "The roster could not be saved.",
                            variant: "destructive",
                          }),
                      },
                    )
                  }
                  disabled={confirmImport.isPending || !!previewData.errors?.length}
                >
                  <Check size={15} /> Replace roster
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
      {clearOpen && (
        <Modal title="Remove current roster?" onClose={() => setClearOpen(false)}>
          <p className="text-sm text-muted-foreground">
            This permanently removes all imported classes and students. Seating groups that use these classes will need to be set up again.
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setClearOpen(false)}
              disabled={confirmImport.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={confirmImport.isPending}
              onClick={() =>
                confirmImport.mutate(
                  { data: { rows: [] } },
                  {
                    onSuccess: async () => {
                      setClearOpen(false);
                      onRosterChanged?.();
                      await queryClient.invalidateQueries({
                        queryKey: getListClassesQueryKey(),
                      });
                      toast({
                        title: "Roster removed",
                        description: "All imported classes and students were removed.",
                      });
                    },
                    onError: (error: any) =>
                      toast({
                        title: "Could not remove roster",
                        description: error.message || "The roster could not be removed.",
                        variant: "destructive",
                      }),
                  },
                )
              }
            >
              {confirmImport.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Trash2 size={15} />
              )}
              Remove roster
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Classes() {
  const q = useListClasses();
  const totalStudents = q.data?.reduce(
    (total: number, item: any) => total + item.studentCount,
    0,
  );
  const [selected, setSelected] = useState<any>(null);
  const students = useListStudents(selected?.id || "", {
    query: {
      enabled: !!selected,
      queryKey: getListStudentsQueryKey(selected?.id || ""),
    },
  });
  const remove = useDeleteStudent();
  const queryClient = useQueryClient();
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Workspace / people"
        title={
          <>
            Classes & students
            {totalStudents != null && (
              <span className="ml-2 inline-block whitespace-nowrap align-baseline text-sm font-bold text-muted-foreground">
                · {totalStudents} students
              </span>
            )}
          </>
        }
        copy="Upload an Excel roster to define classes, sections, and students."
        action={
          <RosterImportControl
            hasRoster={!!q.data?.length}
            onRosterChanged={() => setSelected(null)}
          />
        }
      />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Class register</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {q.data?.length || 0} sections
              </span>
            </div>
            <div className="relative mt-3">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <input
                className="h-9 w-full rounded-lg border border-input bg-background pl-8 text-xs outline-none focus:border-primary"
                placeholder="Search grade or section"
              />
            </div>
          </div>
          {q.isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !q.data?.length ? (
            <Empty
              icon={BookOpen}
              title="No classes found"
              copy="Upload a roster Excel workbook to create the class register."
            />
          ) : (
            <div className="p-2">
              {q.data.map((c: any) => (
                <button
                  key={c.id}
                  data-testid={`button-class-${c.id}`}
                  onClick={() => setSelected(c)}
                  className={`mb-1 flex w-full items-center justify-between rounded-lg p-3 text-left transition ${selected?.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <div>
                    <div className="text-sm font-extrabold">{c.label}</div>
                    <div
                      className={`mt-1 font-mono text-[10px] ${selected?.id === c.id ? "text-primary-foreground/65" : "text-muted-foreground"}`}
                    >
                      Grade {c.grade} · Section {c.section}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs ${selected?.id === c.id ? "text-accent" : "text-muted-foreground"}`}
                  >
                    {c.studentCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
        <Card className="overflow-hidden" style={{ height: "-webkit-fit-content" }}>
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Selected section
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold">
                    {selected.label}
                  </h2>
                </div>
                <Status tone="green">
                  {students.data?.length || selected.studentCount} students
                </Status>
              </div>
              {students.isLoading ? (
                <div className="space-y-2 p-5">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-11" />
                  ))}
                </div>
              ) : !students.data?.length ? (
                <Empty
                  icon={Users}
                  title="No students assigned"
                  copy="Upload a new roll-number list to populate this section."
                />
              ) : (
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-card font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3">Roll</th>
                        <th className="px-5 py-3">Student name</th>
                        <th className="px-5 py-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.data.map((s: any) => (
                        <tr
                          key={s.id}
                          className="border-t border-border/70 hover:bg-secondary/30"
                        >
                          <td className="px-5 py-3 font-mono font-medium">
                            {String(s.rollNo).padStart(2, "0")}
                          </td>
                          <td className="px-5 py-3 font-medium">
                            {s.name || (
                              <span className="italic text-muted-foreground">
                                Not named
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-destructive"
                              onClick={() =>
                                remove.mutate(
                                  { studentId: s.id },
                                  {
                                    onSuccess: () =>
                                      queryClient.invalidateQueries({
                                        queryKey: getListStudentsQueryKey(
                                          selected.id,
                                        ),
                                      }),
                                  },
                                )
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <Empty
              icon={BookOpen}
              title="Choose a class"
              copy="Select a section to inspect its uploaded students."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function Sessions() {
  const q = useListSessions();
  const create = useCreateSession();
  const remove = useDeleteSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", date: today });
  const [location, setLoc] = useLocation();
  const [open, setOpen] = useState(location === "/sessions/new");
  const save = (e: any) => {
    e.preventDefault();
    create.mutate(
      { data: form },
      {
        onSuccess: (s: any) => {
          queryClient.invalidateQueries({
            queryKey: getListSessionsQueryKey(),
          });
          setLoc(`/sessions/${s.id}`);
        },
      },
    );
  };
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Workspace / scheduling"
        title="Exam sessions"
        copy="One session, one source of truth for every room chart."
        action={
          <Button variant="yellow" onClick={() => setOpen(true)}>
            <Plus size={16} /> Create session
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.length ? (
          <Empty
            icon={CalendarDays}
            title="No exam sessions"
            copy="Create a session for your next assessment window."
            action={
              <Button variant="yellow" onClick={() => setOpen(true)}>
                <Plus size={15} /> Create session
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {q.data.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-secondary/40"
              >
                <Link href={`/sessions/${s.id}`} data-testid={`link-session-${s.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs font-bold text-chart-2">
                    {new Date(s.date)
                      .toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                      })
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold">
                      {s.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      <span>{s.assignmentCount} assignments</span>
                      <span>·</span>
                      <span>{s.date}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <Status tone={s.status === "finalized" ? "green" : "yellow"}>
                    {s.status}
                  </Status>
                  <button
                    aria-label={`Delete ${s.name}`}
                    className="rounded p-2 text-muted-foreground hover:bg-red-100 hover:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this session and its seating plan?")) {
                        remove.mutate({ sessionId: s.id }, {
                          onSuccess: () =>
                            queryClient.invalidateQueries({
                              queryKey: getListSessionsQueryKey(),
                            }),
                        });
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {open && (
        <Modal title="Create exam session" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <Field
              label="Session name"
              required
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Midterm · Mathematics"
            />
            <Field
              label="Exam date"
              type="date"
              required
              value={form.date}
              onChange={(e: any) => setForm({ ...form, date: e.target.value })}
            />
            <Button
              className="w-full"
              variant="yellow"
              disabled={create.isPending}
            >
              {create.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <ArrowRight size={15} />
              )}{" "}
              Continue to seating plan
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SessionBuilder() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const detail = useGetSession(sessionId, {
    query: { queryKey: getGetSessionQueryKey(sessionId) },
  });
  const assignments = useGetSessionAssignments(sessionId, undefined, {
    query: { queryKey: getGetSessionAssignmentsQueryKey(sessionId) },
  });
  const rooms = useListRooms();
  const classes = useListClasses();
  const createGroup = useCreateSeatingGroup();
  const deleteGroup = useDeleteSeatingGroup();
  const generate = useGenerateSeating();
  const finalize = useFinalizeSession();
  const remove = useDeleteSession();
  const swap = useSwapAssignments();
  const update = useUpdateSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLoc] = useLocation();
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("Main seating group");
  const [selectedSeat, setSelectedSeat] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [assignmentRoomId, setAssignmentRoomId] = useState("all");
  const s: any = detail.data;
  const groupClassIds = new Set(
    (s?.groups || []).flatMap((group: any) => group.classIds.map(String)),
  );
  const totalGroupStudents = (classes.data || [])
    .filter((item: any) => groupClassIds.has(String(item.id)))
    .reduce((total: number, item: any) => total + item.studentCount, 0);
  const remainingStudents = Math.max(
    0,
    totalGroupStudents - (assignments.data?.length || 0),
  );
  const assignedByClass = new Map<string, number>();
  (assignments.data || []).forEach((assignment: any) => {
    const classId = String(assignment.classId);
    assignedByClass.set(classId, (assignedByClass.get(classId) || 0) + 1);
  });
  const visibleAssignments = assignmentRoomId === "all"
    ? assignments.data || []
    : (assignments.data || []).filter((assignment: any) => assignment.roomId === assignmentRoomId);
  const availableRooms = (rooms.data || []).filter((room: any) => {
    const assignedCount = (assignments.data || []).filter(
      (assignment: any) => String(assignment.roomId) === String(room.id),
    ).length;
    return assignedCount < room.capacity;
  });
  const toggle = (arr: any[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: getGetSessionQueryKey(sessionId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetSessionAssignmentsQueryKey(sessionId),
    });
  };
  if (detail.isLoading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-36" />
        <Skeleton className="h-96" />
      </div>
    );
  if (detail.isError || !s)
    return <ErrorState retry={() => detail.refetch()} />;
  return (
    <div className="stagger">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
            Session builder / {s.date}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-[-.04em]">
              {s.name}
            </h1>
            <Status tone={s.status === "finalized" ? "green" : "yellow"}>
              {s.status}
            </Status>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/print/${sessionId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold hover:bg-secondary"
          >
            <Printer size={14} /> Print center
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Delete this session and its seating plan?")) {
                remove.mutate(
                  { sessionId },
                  {
                    onSuccess: () => {
                      queryClient.invalidateQueries({
                        queryKey: getListSessionsQueryKey(),
                      });
                      setLoc("/sessions");
                    },
                  },
                );
              }
            }}
            disabled={remove.isPending}
          >
            <Trash2 size={15} /> Delete session
          </Button>
          {s.status !== "finalized" && (
            <Button
              variant="yellow"
              onClick={() =>
                finalize.mutate({ sessionId }, { onSuccess: refresh })
              }
              disabled={finalize.isPending || !assignments.data?.length}
            >
              <ShieldCheck size={15} /> Finalize session
            </Button>
          )}
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="text-[11px] font-bold text-muted-foreground">
            Remaining students
          </div>
          <div className="mt-2 font-mono text-2xl">{remainingStudents}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-bold text-muted-foreground">
            Groups
          </div>
          <div className="mt-2 font-mono text-2xl">{s.groups?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-bold text-muted-foreground">
            Assigned seats
          </div>
          <div className="mt-2 font-mono text-2xl">
            {assignments.data?.length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-bold text-muted-foreground">
            Rooms in plan
          </div>
          <div className="mt-2 font-mono text-2xl">
            {new Set((assignments.data || []).map((a: any) => a.roomId)).size}
          </div>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Build a seating group</h2>
              <Sparkles size={16} className="text-chart-5" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Combine classes and distribute across ordered rooms.
            </p>
          </div>
          <div className="space-y-5 p-5">
            <Field
              label="Group name"
              value={groupName}
              onChange={(e: any) => setGroupName(e.target.value)}
            />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
                  Classes
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {selectedClassIds.length} selected
                </span>
              </div>
              <div className="max-h-44 space-y-1 overflow-auto pr-1">
                {classes.data?.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedClassIds(toggle(selectedClassIds, String(c.id)))
                    }
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${selectedClassIds.includes(String(c.id)) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    <span className="font-bold">{c.label}</span>
                    <span className="text-right font-mono text-[10px] opacity-70">
                      <span className="block">{c.studentCount} total</span>
                      {groupClassIds.has(String(c.id)) && (
                        <span className="block">
                          {Math.max(0, c.studentCount - (assignedByClass.get(String(c.id)) || 0))} remaining
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
                  Rooms
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {selectedRoomIds.length} selected
                </span>
              </div>
              <div className="max-h-44 space-y-1 overflow-auto pr-1">
                {availableRooms.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      setSelectedRoomIds(toggle(selectedRoomIds, String(r.id)))
                    }
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition ${selectedRoomIds.includes(String(r.id)) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded font-mono text-[10px] ${selectedRoomIds.includes(String(r.id)) ? "bg-accent text-accent-foreground" : "bg-secondary"}`}
                    >
                      {selectedRoomIds.includes(String(r.id)) ? <Check size={12} /> : "—"}
                    </span>
                    <span className="font-bold">{r.name}</span>
                    <span className="ml-auto font-mono opacity-65">
                      {r.capacity}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              variant="yellow"
              disabled={
                !selectedClassIds.length ||
                !selectedRoomIds.length ||
                createGroup.isPending
              }
              onClick={() =>
                createGroup.mutate(
                  {
                    sessionId,
                    data: {
                      name: groupName,
                      classIds: selectedClassIds,
                      roomIds: availableRooms
                        .filter((room: any) => selectedRoomIds.includes(String(room.id)))
                        .map((room: any) => String(room.id)),
                    },
                  },
                  {
                    onSuccess: () => {
                      setSelectedClassIds([]);
                      setSelectedRoomIds([]);
                      refresh();
                    },
                    onError: (error: any) => {
                      toast({
                        title: "Could not add group",
                        description: error?.message || "Check the selected classes and rooms.",
                      });
                    },
                  },
                )
              }
            >
              {createGroup.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Plus size={15} />
              )}{" "}
              Add group
            </Button>
            {s.groups?.length > 0 && (
              <div className="border-t border-dashed border-border pt-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Groups in this session
                </div>
                {s.groups.map((g: any) => (
                  <div
                    key={g.id}
                    className="mb-2 overflow-hidden rounded-lg bg-secondary/70"
                  >
                    <div className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        {g.roomIds.map((roomId: string) => {
                      const room = rooms.data?.find((item: any) => String(item.id) === String(roomId));
                      const classNames = g.classIds
                        .map((classId: string) => classes.data?.find((item: any) => String(item.id) === String(classId))?.label)
                        .filter(Boolean);
                      return (
                        <div key={roomId} className="mb-2 last:mb-0">
                          <div className="text-xs font-extrabold">
                            Room {room?.sno ?? room?.name ?? roomId}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {classNames.length ? classNames.join(" · ") : "No classes selected"}
                          </div>
                        </div>
                      );
                        })}
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete seating group ${g.id}`}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-destructive"
                        onClick={() => {
                          if (!confirm("Delete this seating group and its room assignments?")) return;
                          deleteGroup.mutate(
                            { sessionId, groupId: g.id },
                            {
                              onSuccess: () => {
                                refresh();
                              },
                              onError: (error: any) => {
                                toast({
                                  title: "Could not delete group",
                                  description: error?.message || "Try again.",
                                });
                              },
                            },
                          );
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-extrabold">Seat assignments</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {assignments.data?.length
                  ? "Select two students to swap seats."
                  : "Generate once your groups and rooms are ready."}
              </p>
            </div>
            <div className="flex gap-2">
              {assignments.data?.length ? (
                <SelectField
                  label=""
                  value={assignmentRoomId}
                  onChange={(e: any) => setAssignmentRoomId(e.target.value)}
                  className="min-w-36"
                >
                  <option value="all">All rooms</option>
                  {[...new Map((assignments.data || []).map((item: any) => [item.roomId, item.roomName])).entries()].map(([roomId, roomName]) => (
                    <option key={roomId} value={roomId}>{roomName}</option>
                  ))}
                </SelectField>
              ) : null}
              {assignments.data?.length ? (
                <Button variant="outline" onClick={() => setEditing(!editing)}>
                  <Pencil size={14} />
                  {editing ? "Done" : "Review"}
                </Button>
              ) : null}
              <Button
                variant="dark"
                onClick={() =>
                  generate.mutate({ sessionId }, { onSuccess: refresh })
                }
                disabled={!s.groups?.length || generate.isPending}
              >
                {generate.isPending ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <Zap size={15} />
                )}{" "}
                Generate seating
              </Button>
            </div>
          </div>
          {assignments.isLoading ? (
            <div className="space-y-2 p-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !assignments.data?.length ? (
            <Empty
              icon={Grid2X2}
              title="No assignments yet"
              copy="Add at least one seating group, then generate a room-by-room plan."
            />
          ) : (
            <>
            <SeatingCharts
              assignments={visibleAssignments}
              rooms={rooms.data || []}
              editing={editing}
              selectedSeat={selectedSeat}
              onSelect={(assignment: any) =>
                editing &&
                setSelectedSeat(selectedSeat?.id === assignment.id ? null : assignment)
              }
            />
            <div>
              {!visibleAssignments.length && (
                <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
                  No assignments have been generated for this room yet.
                </div>
              )}
              {selectedSeat && (
                <div className="flex items-center justify-between border-t border-border bg-accent/15 px-4 py-3 text-xs">
                  <span>
                    Selected{" "}
                    <strong>
                      {selectedSeat.studentName ||
                        `Roll ${selectedSeat.rollNo}`}
                    </strong>
                    . Choose another row to swap.
                  </span>
                  <Button variant="ghost" onClick={() => setSelectedSeat(null)}>
                    <X size={14} /> Clear
                  </Button>
                </div>
              )}
            </div>
            <div className="border-t border-border p-4">
              <PrintPlanSummary
                assignments={assignments.data || []}
                rooms={rooms.data || []}
              />
            </div>
            </>
          )}
        </Card>
      </div>
      <ManualSeatPicker
        sessionId={sessionId}
        rooms={rooms.data || []}
        classes={classes.data || []}
        assignments={assignments.data || []}
        refresh={refresh}
      />
      {selectedSeat && editing && (
        <SwapWatcher
          selected={selectedSeat}
          assignments={assignments.data || []}
          onSwap={(second: any) => {
            swap.mutate(
              {
                sessionId,
                data: {
                  firstAssignmentId: selectedSeat.id,
                  secondAssignmentId: second.id,
                },
              },
              {
                onSuccess: () => {
                  setSelectedSeat(null);
                  refresh();
                },
              },
            );
          }}
        />
      )}
    </div>
  );
}
function SeatingCharts({ assignments, rooms, editing, selectedSeat, onSelect }: any) {
  const roomIds = [...new Set(assignments.map((assignment: any) => String(assignment.roomId)))];
  const assignmentMap = new Map<string, any>(assignments.map((assignment: any) => [`${assignment.roomId}-${assignment.columnNo}-${assignment.benchNo}-${assignment.seatNo}`, assignment]));
  return <div className="max-h-[620px] overflow-auto bg-secondary/25 p-4 sm:p-5">
    {roomIds.map((roomId: string) => {
      const room = rooms.find((item: any) => String(item.id) === roomId);
      if (!room) return null;
      const seatsPerColumn = Math.ceil(room.capacity / room.columns);
      const rowsPerColumn = Math.ceil(seatsPerColumn / room.seatsPerBench);
      return <section key={roomId} className="mb-6 last:mb-0 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-sm)] w-fit">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-3">
          <div><h3 className="font-extrabold">Room {room.name}</h3><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{room.columns} columns · {rowsPerColumn} rows · {room.seatsPerBench} seats per bench</p></div>
          <span className="font-mono text-xs text-muted-foreground">Capacity: {room.capacity} seats · {assignments.filter((item: any) => String(item.roomId) === roomId).length} occupied</span>
        </div>
        <div className="flex min-w-max gap-5">
          {Array.from({ length: room.columns }, (_, columnIndex) => <div key={columnIndex} className="w-[148px] shrink-0 border-r border-dashed border-border pr-5 last:border-0">
            <div className="mb-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Column {columnIndex + 1}</div>
            <div className="space-y-2">
              {Array.from({ length: rowsPerColumn }, (_, benchIndex) => <div key={benchIndex} className="flex gap-1.5 rounded-md border border-border bg-secondary/45 p-1.5">
                {Array.from({ length: room.seatsPerBench }, (_, seatIndex) => {
                  const seatOffset = columnIndex * seatsPerColumn + benchIndex * room.seatsPerBench + seatIndex;
                  if (seatOffset >= room.capacity) return null;
                  const assignment = assignmentMap.get(`${roomId}-${columnIndex + 1}-${benchIndex + 1}-${seatIndex + 1}`);
                  return <button key={seatIndex} type="button" title={assignment ? `${assignment.studentName || `Roll ${assignment.rollNo}`} · Roll ${assignment.rollNo} · ${assignment.classLabel}` : "Empty seat"} onClick={() => assignment && onSelect(assignment)} className={`group relative grid h-11 min-w-0 flex-1 place-items-center rounded border text-[10px] font-bold transition ${assignment ? selectedSeat?.id === assignment.id ? "border-primary bg-accent text-accent-foreground" : "border-primary/20 bg-primary text-primary-foreground hover:bg-primary/85" : "border-dashed border-border bg-background text-muted-foreground/40"} ${editing && assignment ? "cursor-pointer" : "cursor-default"}`}><span className="truncate px-1 font-mono">{assignment ? assignment.rollNo : "—"}</span>{assignment && <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-36 -translate-x-1/2 rounded-md bg-primary px-2 py-1.5 text-left text-[10px] font-medium text-primary-foreground shadow-lg group-hover:block"><span className="block font-bold">{assignment.studentName || `Roll ${assignment.rollNo}`}</span><span className="block opacity-75">Roll {assignment.rollNo} · {assignment.classLabel}</span></span>}</button>;
                })}
              </div>)}
            </div>
          </div>)}
        </div>
      </section>;
    })}
  </div>;
}
function ManualSeatPicker({
  sessionId,
  rooms,
  classes,
  assignments,
  refresh,
}: any) {
  const add = useAddSessionAssignments();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [columnNo, setColumnNo] = useState("1");
  const [benchNo, setBenchNo] = useState("1");
  const [seatNo, setSeatNo] = useState("1");
  const room = rooms.find((item: any) => String(item.id) === roomId);
  const roomRows = room
    ? Math.ceil(Math.ceil(room.capacity / room.columns) / room.seatsPerBench)
    : 1;
  const eligible = useListEligibleStudents(
    sessionId,
    { classIds: classId },
    {
      query: {
        enabled: !!classId,
        queryKey: getListEligibleStudentsQueryKey(sessionId, {
          classIds: classId,
        }),
      },
    },
  );
  const occupied = new Set(
    assignments
      .filter((item: any) => String(item.roomId) === roomId)
      .map((item: any) => `${item.columnNo}-${item.benchNo}-${item.seatNo}`),
  );
  const roomAssignmentCount = assignments.filter(
    (item: any) => String(item.roomId) === roomId,
  ).length;
  const roomFull = !!room && roomAssignmentCount >= room.capacity;
  if (!rooms.length || !classes.length) return null;
  return (
    <Card className="mt-5 overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-extrabold">Assign students manually</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Students already seated in this session are removed from the list
          automatically.
        </p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-6">
        <SelectField
          label="Room"
          value={roomId}
          onChange={(e: any) => {
            setRoomId(e.target.value);
            setStudentId("");
          }}
        >
          <option value="">Choose room</option>
          {rooms.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.capacity} seats
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Class"
          value={classId}
          onChange={(e: any) => {
            setClassId(e.target.value);
            setStudentId("");
          }}
        >
          <option value="">Choose class</option>
          {classes.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Student"
          value={studentId}
          onChange={(e: any) => setStudentId(e.target.value)}
        >
          <option value="">Choose student</option>
          {eligible.data?.map((item: any) => (
            <option key={item.id} value={item.id}>
              Roll {item.rollNo} · {item.name || "Unnamed"}
            </option>
          ))}
        </SelectField>
        <Field
          label="Column"
          type="number"
          min="1"
          max={room?.columns || 1}
          value={columnNo}
          onChange={(e: any) => setColumnNo(e.target.value)}
        />
        <Field
          label="Bench"
          type="number"
          min="1"
          max={roomRows}
          value={benchNo}
          onChange={(e: any) => setBenchNo(e.target.value)}
        />
        <Field
          label="Seat"
          type="number"
          min="1"
          max={room?.seatsPerBench || 1}
          value={seatNo}
          onChange={(e: any) => setSeatNo(e.target.value)}
        />
        <Button
          className="sm:col-span-2 lg:col-span-6"
          variant="yellow"
          disabled={
            !roomId ||
            !studentId ||
            add.isPending
          }
          onClick={() => {
            if (roomFull) {
              toast({
                title: "Room is full",
                description: `${room.name} has no available seats for another student. Choose another room.`,
              });
              return;
            }
            if (occupied.has(`${columnNo}-${benchNo}-${seatNo}`)) {
              toast({
                title: "Seat is occupied",
                description: `The selected seat in ${room.name} is already assigned. Choose another seat.`,
              });
              return;
            }
            add.mutate(
              {
                sessionId,
                data: {
                  roomId,
                  assignments: [
                    {
                      studentId,
                      columnNo: Number(columnNo),
                      benchNo: Number(benchNo),
                      seatNo: Number(seatNo),
                    },
                  ],
                },
              },
              {
                onSuccess: () => {
                  setStudentId("");
                  refresh();
                  eligible.refetch();
                },
                onError: (error: any) => {
                  toast({
                    title: "Could not assign student",
                    description: error?.message || "The room or seat may already be occupied.",
                  });
                },
              },
            );
          }}
        >
          {roomFull ? "Room full" : <><Plus size={15} /> Assign to seat</>}
        </Button>
        {room && (
          <div className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-6">
            {roomFull
              ? `${room.name} is full. Choose another room.`
              : `${roomAssignmentCount} of ${room.capacity} seats occupied · ${room.capacity - roomAssignmentCount} seats available`}
          </div>
        )}
      </div>
    </Card>
  );
}
function SwapWatcher({ selected, assignments, onSwap }: any) {
  const [armed, setArmed] = useState(true);
  if (!armed) return null;
  const second = assignments.find((a: any) => a.id !== selected.id);
  return second ? (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl border border-primary/20 bg-card p-4 shadow-[var(--shadow-lg)]">
      <div className="text-xs font-extrabold">Swap seats</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Select a second row in the table to swap. Quick action shown for the
        next available seat.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="yellow"
          className="flex-1"
          onClick={() => onSwap(second)}
        >
          Swap with {second.studentName || `roll ${second.rollNo}`}
        </Button>
        <Button variant="ghost" onClick={() => setArmed(false)}>
          <X size={14} />
        </Button>
      </div>
    </div>
  ) : null;
}

function Lookup() {
  const classes = useListClasses();
  const rooms = useListRooms();
  const sessions = useListSessions();
  const [tab, setTab] = useState<"student" | "room">("student");
  const [studentParams, setStudentParams] = useState<any>(null);
  const [roomParams, setRoomParams] = useState<any>(null);
  const student = useLookupStudent(
    studentParams || { rollNo: 0, classId: "", sessionId: "" },
    {
      query: {
        enabled: !!studentParams,
        queryKey: getLookupStudentQueryKey(studentParams || undefined),
      },
    },
  );
  const room = useLookupRoom(roomParams || { roomId: "", sessionId: "" }, {
    query: {
      enabled: !!roomParams,
      queryKey: getLookupRoomQueryKey(roomParams || undefined),
    },
  });
  const [roll, setRoll] = useState("");
  const [classId, setClassId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [sessionId, setSessionId] = useState("");
  return (
    <div className="mx-auto max-w-5xl page-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary text-accent">
          <Search size={21} />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          Seatline / public desk
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">
          Find your exam seat.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A clear answer for teachers, invigilators, and students. No account
          needed.
        </p>
      </div>
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="grid grid-cols-2 border-b border-border">
          <button
            className={`px-5 py-4 text-sm font-extrabold ${tab === "student" ? "border-b-2 border-primary bg-secondary/40" : "text-muted-foreground"}`}
            onClick={() => setTab("student")}
            data-testid="button-lookup-student"
          >
            Find a student
          </button>
          <button
            className={`px-5 py-4 text-sm font-extrabold ${tab === "room" ? "border-b-2 border-primary bg-secondary/40" : "text-muted-foreground"}`}
            onClick={() => setTab("room")}
            data-testid="button-lookup-room"
          >
            View room chart
          </button>
        </div>
        <div className="p-5 sm:p-7">
          {tab === "student" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStudentParams({ rollNo: Number(roll), classId, sessionId });
              }}
              className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1.4fr_auto] sm:items-end"
            >
              <Field
                label="Roll number"
                type="number"
                min="1"
                required
                value={roll}
                onChange={(e: any) => setRoll(e.target.value)}
                placeholder="e.g. 18"
              />
              <SelectField
                label="Class"
                required
                value={classId}
                onChange={(e: any) => setClassId(e.target.value)}
              >
                <option value="">Choose class</option>
                {classes.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Exam session"
                required
                value={sessionId}
                onChange={(e: any) => setSessionId(e.target.value)}
              >
                <option value="">Choose session</option>
                {sessions.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
              <Button
                className="h-10"
                variant="yellow"
                disabled={student.isFetching}
              >
                <Search size={15} /> Find seat
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRoomParams({ roomId, sessionId });
              }}
              className="grid gap-3 sm:grid-cols-[1.4fr_1.4fr_auto] sm:items-end"
            >
              <SelectField
                label="Room"
                required
                value={roomId}
                onChange={(e: any) => setRoomId(e.target.value)}
              >
                <option value="">Choose room</option>
                {rooms.data?.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Exam session"
                required
                value={sessionId}
                onChange={(e: any) => setSessionId(e.target.value)}
              >
                <option value="">Choose session</option>
                {sessions.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
              <Button
                className="h-10"
                variant="yellow"
                disabled={room.isFetching}
              >
                <Grid2X2 size={15} /> Show chart
              </Button>
            </form>
          )}
          {studentParams && (
            <LookupResult
              data={student.data}
              loading={student.isFetching}
              error={student.isError}
            />
          )}
          {roomParams && (
            <RoomResult
              data={room.data}
              loading={room.isFetching}
              error={room.isError}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
function LookupResult({ data, loading, error }: any) {
  return (
    <div className="mt-7 border-t border-dashed border-border pt-6">
      {loading ? (
        <Skeleton className="h-28" />
      ) : error ? (
        <ErrorState />
      ) : data ? (
        <div className="rounded-xl border border-accent/50 bg-accent/15 p-5 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Seat located
          </div>
          <div className="mt-2 text-xl font-extrabold">{data.roomName}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {data.classLabel} · Roll {data.rollNo}
          </div>
          <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2">
            <span className="rounded-lg bg-primary px-4 py-3 font-mono text-sm text-primary-foreground">
              Column {data.columnNo}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="rounded-lg bg-primary px-4 py-3 font-mono text-sm text-primary-foreground">
              Bench {data.benchNo}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="rounded-lg bg-primary px-4 py-3 font-mono text-sm text-primary-foreground">
              Seat {data.seatNo}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function RoomResult({ data, loading, error }: any) {
  return (
    <div className="mt-7 border-t border-dashed border-border pt-6">
      {loading ? (
        <Skeleton className="h-40" />
      ) : error ? (
        <ErrorState />
      ) : data ? (
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Room chart
              </div>
              <h3 className="mt-1 text-xl font-extrabold">{data.room.name}</h3>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {data.assignments.length} occupied
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.assignments.map((a: any) => (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-secondary/50 p-3"
              >
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    C{a.columnNo} · B{a.benchNo} · S{a.seatNo}
                  </span>
                  <span className="font-mono text-[10px]">{a.rollNo}</span>
                </div>
                <div className="mt-2 text-xs font-bold">
                  {a.studentName || a.classLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PrintPage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const detail = useGetSession(sessionId, {
    query: { queryKey: getGetSessionQueryKey(sessionId) },
  });
  const assignments = useGetSessionAssignments(sessionId, undefined, {
    query: { queryKey: getGetSessionAssignmentsQueryKey(sessionId) },
  });
  const rooms = useListRooms();
  const grouped = useMemo(() => {
    const m: any = {};
    (assignments.data || []).forEach((a: any) => (m[a.roomId] ??= []).push(a));
    return m;
  }, [assignments.data]);
  return (
    <div className="mx-auto max-w-[1100px] page-in">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link
          href={`/sessions/${sessionId}`}
          className="text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          ← Back to session
        </Link>
        <Button variant="yellow" onClick={() => window.print()}>
          <Printer size={15} /> Print this plan
        </Button>
      </div>
      <div className="mb-8 border-b-2 border-primary pb-5">
        <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          Seatline / official room chart
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">
          {detail.data?.name || "Exam session"}
        </h1>
        <div className="mt-2 flex gap-5 font-mono text-xs text-muted-foreground">
          <span>{detail.data?.date}</span>
          <span>{assignments.data?.length || 0} assignments</span>
          <span>Generated seating plan</span>
        </div>
      </div>
      {assignments.isLoading ? (
        <Skeleton className="h-72" />
      ) : !assignments.data?.length ? (
        <Empty
          icon={Printer}
          title="Nothing to print yet"
          copy="Generate seating assignments first."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([roomId, list]: any) => (
            <section key={roomId} className="break-inside-avoid">
              <div className="mb-3 flex items-end justify-between border-b border-border pb-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Room chart
                  </div>
                  <h2 className="text-xl font-extrabold">{list[0].roomName}</h2>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Classes: {[...new Set(list.map((assignment: any) => assignment.classLabel))].join(", ")}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  Capacity: {rooms.data?.find((room: any) => String(room.id) === String(roomId))?.capacity ?? "—"} seats · {list.length} occupied
                </span>
              </div>
              <PrintSeatingChart
                assignments={list}
                room={rooms.data?.find((room: any) => String(room.id) === String(roomId))}
              />
              <PrintRoomSummary
                assignments={list}
                room={rooms.data?.find((room: any) => String(room.id) === String(roomId))}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
function PrintSeatingChart({ assignments, room }: any) {
  if (!room) return null;
  const seatsPerColumn = Math.ceil(room.capacity / room.columns);
  const rowsPerColumn = Math.ceil(seatsPerColumn / room.seatsPerBench);
  const assignmentMap = new Map<string, any>(assignments.map((assignment: any) => [
    `${assignment.columnNo}-${assignment.benchNo}-${assignment.seatNo}`,
    assignment,
  ]));
  return <div className="print-seating-grid flex gap-3 rounded border border-border p-3">
    {Array.from({ length: room.columns }, (_, columnIndex) => <div key={columnIndex} className="min-w-0 flex-1 border-r border-dashed border-border pr-3 last:border-0">
      <div className="mb-2 text-center font-mono text-[9px] font-bold uppercase tracking-wider">Column {columnIndex + 1}</div>
      <div className="space-y-1.5">
        {Array.from({ length: rowsPerColumn }, (_, benchIndex) => <div key={benchIndex} className="flex gap-1 rounded border border-border p-1">
          {Array.from({ length: room.seatsPerBench }, (_, seatIndex) => {
            const offset = columnIndex * seatsPerColumn + benchIndex * room.seatsPerBench + seatIndex;
            if (offset >= room.capacity) return null;
            const assignment = assignmentMap.get(`${columnIndex + 1}-${benchIndex + 1}-${seatIndex + 1}`);
            return <div key={seatIndex} className={`min-h-12 min-w-0 flex-1 rounded border p-1 text-center ${assignment ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-border text-muted-foreground"}`}>
              <div className="font-mono text-sm font-bold">{assignment?.rollNo || "—"}</div>
              {assignment && <><div className="mt-1 truncate text-[8px] font-bold">{assignment.studentName || "—"}</div><div className="font-mono text-[8px] opacity-75">{assignment.classLabel}</div></>}
            </div>;
          })}
        </div>)}
      </div>
    </div>)}
  </div>;
}
function PrintPlanSummary({ assignments, rooms }: any) {
  const classes = new Map<string, { count: number; from: number; to: number }>();
  assignments.forEach((assignment: any) => {
    const current = classes.get(assignment.classLabel);
    const rollNo = Number(assignment.rollNo);
    classes.set(assignment.classLabel, {
      count: (current?.count || 0) + 1,
      from: current ? Math.min(current.from, rollNo) : rollNo,
      to: current ? Math.max(current.to, rollNo) : rollNo,
    });
  });
  const roomIds = new Set(assignments.map((assignment: any) => String(assignment.roomId)));
  const capacity = rooms
    .filter((room: any) => roomIds.has(String(room.id)))
    .reduce((total: number, room: any) => total + room.capacity, 0);
  return (
    <div className="break-inside-avoid rounded border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider">
          Consolidated seating summary
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {assignments.length} / {capacity} occupied · {Math.max(0, capacity - assignments.length)} available
        </span>
      </div>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-1.5 pr-3">Class</th>
            <th className="py-1.5 pr-3 text-right">Students seated</th>
            <th className="py-1.5 pr-3 text-right">Roll from</th>
            <th className="py-1.5 text-right">Roll to</th>
          </tr>
        </thead>
        <tbody>
          {[...classes.entries()].map(([classLabel, data]) => (
            <tr key={classLabel} className="border-b border-border/60 last:border-0">
              <td className="py-1.5 pr-3 font-bold">{classLabel}</td>
              <td className="py-1.5 pr-3 text-right font-mono">{data.count}</td>
              <td className="py-1.5 pr-3 text-right font-mono">{data.from}</td>
              <td className="py-1.5 text-right font-mono">{data.to}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="pt-2">Total</td>
            <td className="pt-2 text-right font-mono">{assignments.length}</td>
            <td className="pt-2" />
            <td className="pt-2" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function PrintRoomSummary({ assignments, room }: any) {
  const classes = new Map<string, { count: number; from: number; to: number }>();
  assignments.forEach((assignment: any) => {
    const current = classes.get(assignment.classLabel);
    const rollNo = Number(assignment.rollNo);
    classes.set(assignment.classLabel, {
      count: (current?.count || 0) + 1,
      from: current ? Math.min(current.from, rollNo) : rollNo,
      to: current ? Math.max(current.to, rollNo) : rollNo,
    });
  });
  const occupied = assignments.length;
  if (!room) return null;
  return (
    <div className="mt-3 break-inside-avoid rounded border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider">
          Consolidated room summary
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {occupied} / {room.capacity} occupied · {Math.max(0, room.capacity - occupied)} available
        </span>
      </div>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-1.5 pr-3">Class</th>
            <th className="py-1.5 pr-3 text-right">Students seated</th>
            <th className="py-1.5 pr-3 text-right">Roll from</th>
            <th className="py-1.5 text-right">Roll to</th>
          </tr>
        </thead>
        <tbody>
          {[...classes.entries()].map(([classLabel, data]) => (
            <tr key={classLabel} className="border-b border-border/60 last:border-0">
              <td className="py-1.5 pr-3 font-bold">{classLabel}</td>
              <td className="py-1.5 pr-3 text-right font-mono">{data.count}</td>
              <td className="py-1.5 pr-3 text-right font-mono">{data.from}</td>
              <td className="py-1.5 text-right font-mono">{data.to}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="pt-2">Total</td>
            <td className="pt-2 text-right font-mono">{occupied}</td>
            <td className="pt-2" />
            <td className="pt-2" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function Modal({ title, onClose, children, wide = false }: any) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-lg)] page-in sm:p-6`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/classes" component={Classes} />
      <Route path="/sessions/new" component={Sessions} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/sessions/:sessionId" component={SessionBuilder} />
      <Route path="/lookup" component={Lookup} />
      <Route path="/print/:sessionId" component={PrintPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={qc}>
      <ErrorBoundary>
        <AuthBoundary>
          <Shell>
            <Router />
          </Shell>
        </AuthBoundary>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
}
export default App;
