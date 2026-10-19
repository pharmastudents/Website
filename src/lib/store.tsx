import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedDB, slugify } from "./seed";
export { slugify };
import { hashPassword, verifyPassword } from "./hash";
import type {
  DB,
  Material,
  MaterialType,
  Order,
  OrderStatus,
  Package,
  PaymentGatewaySettings,
  Purchase,
  Session,
  Student,
  Subject,
  WebsiteSettings,
  UserProfile,
} from "./types";

import { supabase } from "@/integrations/supabase/client";

const DB_KEY = "sp_db_v2";
const SESSION_KEY = "sp_session_v2";
const PROFILE_KEY = "sp_user_profile_v2";

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === 2 && Array.isArray(parsed.packages) && Array.isArray(parsed.orders)) {
        return parsed;
      }
    }
  } catch {
    /* ignore corrupt store */
  }
  const seed = createSeedDB();
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(seed));
  } catch {
    /* storage full */
  }
  return seed;
}

function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw || raw === "guest") return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

const generateId = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export type AdminMetrics = {
  totalStudents: number;
  studentsByYear: { year: number; count: number }[];
  studentsBySemester: { semester: number; count: number }[];
  totalNotes: number;
  freeNotes: number;
  premiumNotes: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  salesByYear: { year: number; revenue: number; salesCount: number }[];
  salesBySubject: { subjectName: string; revenue: number; salesCount: number }[];
  topSellingSubjects: { subjectId: string; subjectName: string; count: number; revenue: number }[];
};

type Ctx = {
  ready: boolean;
  db: DB;
  session: Session;
  student: Student | null;
  isAdmin: boolean;
  userProfile: UserProfile | null;
  register: (
    input: Omit<Student, "id" | "passwordHash" | "createdAt"> & { password: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string; role?: string }>;
  adminLogin: (userId: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Student>) => void;
  updateStudent: (studentId: string, patch: Partial<Student>) => void;
  saveMaterial: (material: Material) => void;
  deleteMaterial: (materialId: string, permanent?: boolean) => void;
  saveSubject: (subject: Subject) => void;
  deleteSubject: (subjectId: string) => void;
  savePackage: (pkg: Package) => void;
  deletePackage: (packageId: string) => void;
  createOrder: (input: {
    productId: string;
    productType: "material" | "subject" | "semester" | "year";
    productTitle: string;
    amount: number;
    discount?: number;
    gateway?: "razorpay" | "stripe" | "test";
  }) => Promise<{ ok: boolean; order?: Order; error?: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  toggleFavorite: (materialId: string) => void;
  isFavorite: (materialId: string) => boolean;
  trackView: (materialId: string) => void;
  logDocumentAccess: (materialId: string) => void;
  unlock: (materialId: string) => void;
  hasAccess: (material: Material) => boolean;
  setDrive: (patch: Partial<DB["drive"]>) => void;
  setPaymentGateway: (patch: Partial<PaymentGatewaySettings>) => void;
  setWebsiteSettings: (patch: Partial<WebsiteSettings>) => void;
  resetDemoData: () => void;
  metrics: AdminMetrics;
};

const StoreContext = createContext<Ctx | null>(null);

import { AcademicService } from "./academicService";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => createSeedDB());
  const [session, setSession] = useState<Session>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. Initial local state for instant rendering
    const localDb = loadDB();
    setDb(localDb);

    // 2. Synchronize with real Supabase Database
    async function syncDatabaseData() {
      try {
        const [academicData, purchasesRes, ordersRes, profilesRes] = await Promise.all([
          AcademicService.loadAll(),
          supabase.from("purchases").select("*"),
          supabase.from("orders").select("*"),
          supabase.from("profiles").select("*").eq("role", "student"),
        ]);

        const realSubjects: Subject[] = academicData.subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          year: s.year || Math.ceil((s.semester || 1) / 2) || 1,
          semester: s.semester || s.semester_number || 1,
          description: s.description || "",
          status: s.is_active ? "active" : "inactive",
        }));

        const realMaterials: Material[] = academicData.materials.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description || "",
          year: m.year || 1,
          semester: m.semester || 1,
          subjectId: m.subject_id,
          type: (m.material_type || "PDF Notes") as MaterialType,
          price: m.price || 0,
          isPremium: m.is_premium,
          thumbnail: m.thumbnail_url || undefined,
          driveUrl: m.drive_url || undefined,
          fileUrl: m.file_url || undefined,
          fileName: m.file_name || undefined,
          fileSize:
            typeof m.file_size === "number"
              ? `${Math.round(m.file_size / 1024)} KB`
              : m.file_size || undefined,
          sourceType: m.file_url ? "upload" : "drive",
          topics: [],
          published: m.status === "Published",
          status: m.status,
          order: m.display_order || 1,
          createdAt: m.created_at,
        }));

        const realStudents: Student[] = (profilesRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.full_name || "Student",
          email: p.email || "",
          mobile: p.mobile || "",
          college: p.college || "",
          year: p.year || 1,
          semester: p.semester || 1,
          createdAt: p.created_at || new Date().toISOString(),
        }));

        const realPurchases: Purchase[] = (purchasesRes.data || []).map((p: any) => ({
          id: p.id,
          studentId: p.student_id,
          materialId: p.material_id,
          amount: Number(p.amount || 0),
          status: p.status === "unlocked" ? "unlocked" : "pending",
          createdAt: p.created_at || new Date().toISOString(),
        }));

        const realOrders: Order[] = (ordersRes.data || []).map((o: any) => ({
          id: o.id,
          studentId: o.student_id,
          studentName: o.student_name || "Student",
          studentEmail: o.student_email || "",
          productId: o.product_id || "",
          productType: o.product_type || "material",
          productTitle: o.product_title || "Material",
          materialIds: Array.isArray(o.material_ids) ? o.material_ids : [],
          amount: Number(o.amount || 0),
          discount: Number(o.discount || 0),
          finalAmount: Number(o.final_amount ?? o.amount ?? 0),
          gateway: o.gateway || "razorpay",
          status: (o.status as OrderStatus) || "Paid",
          transactionId: o.transaction_id || "",
          orderDate: o.order_date || new Date().toISOString(),
          paymentDate: o.payment_date,
          termsAccepted: true,
          termsAcceptedAt: o.terms_accepted_at || new Date().toISOString(),
          termsVersion: o.terms_version || "2026-v1.0",
        }));

        setDb((prev) => {
          const next = {
            ...prev,
            subjects: realSubjects.length > 0 ? realSubjects : prev.subjects,
            materials: realMaterials.length > 0 ? realMaterials : prev.materials,
            students: realStudents.length > 0 ? realStudents : prev.students,
            purchases: realPurchases.length > 0 ? realPurchases : prev.purchases,
            orders: realOrders.length > 0 ? realOrders : prev.orders,
          };
          try {
            localStorage.setItem(DB_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      } catch (dbErr) {
        console.warn("[Store] Database sync notice:", dbErr);
      }
    }

    void syncDatabaseData();

    // 3. Persistent Authentication Init
    async function initAuth() {
      try {
        const stored = loadSession();
        const storedProf = loadProfile();

        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", activeSession.user.id)
            .maybeSingle();

          if (profile) {
            const userProf = profile as UserProfile;
            setUserProfile(userProf);
            setSession({ role: userProf.role, id: activeSession.user.id });
            localStorage.setItem(SESSION_KEY, JSON.stringify({ role: userProf.role, id: activeSession.user.id }));
            localStorage.setItem(PROFILE_KEY, JSON.stringify(userProf));
          } else {
            const isSiddu = activeSession.user.email?.toLowerCase() === "siddu@gmail.com";
            const role = isSiddu ? "admin" : "student";
            setSession({ role, id: activeSession.user.id });
            localStorage.setItem(SESSION_KEY, JSON.stringify({ role, id: activeSession.user.id }));
          }
        } else if (stored) {
          // Keep stored session active so student / admin does NOT need to login every time
          setSession(stored);
          if (storedProf) {
            setUserProfile(storedProf);
          } else if (stored.role === "admin") {
            setUserProfile({
              id: stored.id,
              email: "siddu@gmail.com",
              full_name: "Siddu Admin",
              role: "admin",
            });
          }
        }
      } catch (err) {
        console.warn("[Auth] Session check fallback to storage:", err);
        const stored = loadSession();
        if (stored) setSession(stored);
        const storedProf = loadProfile();
        if (storedProf) setUserProfile(storedProf);
      } finally {
        setReady(true);
      }
    }

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (profile) {
          const userProf = profile as UserProfile;
          setUserProfile(userProf);
          setSession({ role: userProf.role, id: currentSession.user.id });
          localStorage.setItem(SESSION_KEY, JSON.stringify({ role: userProf.role, id: currentSession.user.id }));
          localStorage.setItem(PROFILE_KEY, JSON.stringify(userProf));
        } else {
          const isSiddu = currentSession.user.email?.toLowerCase() === "siddu@gmail.com";
          const role = isSiddu ? "admin" : "student";
          setSession({ role, id: currentSession.user.id });
          localStorage.setItem(SESSION_KEY, JSON.stringify({ role, id: currentSession.user.id }));
        }
      } else if (event === "SIGNED_OUT") {
        // ONLY clear credentials on explicit SIGNED_OUT event!
        setUserProfile(null);
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PROFILE_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback((next: DB) => {
    setDb(next);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  }, []);

  const setSessionPersisted = useCallback((next: Session, prof?: UserProfile | null) => {
    setSession(next);
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);

      if (prof !== undefined) {
        setUserProfile(prof);
        if (prof) localStorage.setItem(PROFILE_KEY, JSON.stringify(prof));
        else localStorage.removeItem(PROFILE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const student = useMemo(
    () => {
      if (session?.role !== "student") return null;
      const found = db.students.find((s) => s.id === session.id);
      if (found) return found;
      if (userProfile && userProfile.role === "student") {
        return {
          id: userProfile.id,
          name: userProfile.full_name || "Student",
          email: userProfile.email || "student@pharmastudents.com",
          mobile: userProfile.mobile || "",
          college: userProfile.college || "",
          year: userProfile.year || 1,
          semester: userProfile.semester || 1,
          createdAt: userProfile.created_at || new Date().toISOString(),
        };
      }
      // Guaranteed fallback so student is never null when session is valid
      return {
        id: session.id,
        name: "Student",
        email: "student@pharmastudents.com",
        mobile: "",
        college: "",
        year: 1,
        semester: 1,
        createdAt: new Date().toISOString(),
      };
    },
    [db.students, session, userProfile],
  );

  const hasAccess = useCallback(
    (material: Material): boolean => {
      if (!material) return false;

      // Determine if item is genuinely paid vs free
      const isPaid = Boolean(
        (material as any).isPremium === true ||
        (material as any).is_premium === true ||
        Number(material.price || 0) > 0
      );

      // Only free materials (price 0 and not marked premium) are accessible by default
      if (!isPaid) return true;

      // Unauthenticated users do not own paid content
      if (!student) return false;

      // 1. Direct purchase / unlock check
      const directUnlocked = db.purchases.some(
        (p) =>
          p.studentId === student.id &&
          p.materialId === material.id &&
          (p.status === "unlocked" || (p as any).status === "paid" || (p as any).payment_status === "paid" || (p as any).payment_status === "free"),
      );
      if (directUnlocked) return true;

      // 2. Paid order containing this material directly
      const orderUnlocked = db.orders.some(
        (o) =>
          o.studentId === student.id &&
          o.status === "Paid" &&
          (o.materialIds?.includes(material.id) || o.productId === material.id),
      );
      if (orderUnlocked) return true;

      // 3. Semester Plan / Package purchase check:
      // If student purchased a semester package or year bundle for this material
      const semesterPackageUnlocked = db.orders.some((o) => {
        if (o.studentId !== student.id || o.status !== "Paid") return false;

        if ((o.productType as string) === "package" || o.productType === "semester" || o.productType === "year") {
          const pkg = db.packages.find((p) => p.id === o.productId);
          if (pkg) {
            if (pkg.type === "semester" && pkg.semester === material.semester) return true;
            if (pkg.type === "year" && pkg.year === material.year) return true;
            if (Array.isArray(pkg.materialIds) && pkg.materialIds.includes(material.id)) return true;
          }
          if (
            o.productTitle?.toLowerCase().includes(`semester ${material.semester}`) ||
            o.productTitle?.toLowerCase().includes(`sem ${material.semester}`)
          ) {
            return true;
          }
        }
        return false;
      });
      if (semesterPackageUnlocked) return true;

      return false;
    },
    [db.purchases, db.orders, db.packages, student],
  );

  // Computed Real Metrics
  const metrics: AdminMetrics = useMemo(() => {
    const totalStudents = db.students.length;
    const studentsByYear = [1, 2, 3, 4].map((year) => ({
      year,
      count: db.students.filter((s) => s.year === year).length,
    }));
    const studentsBySemester = [1, 2, 3, 4, 5, 6, 7, 8].map((semester) => ({
      semester,
      count: db.students.filter((s) => s.semester === semester).length,
    }));

    const totalNotes = db.materials.length;
    const freeNotes = db.materials.filter((m) => !m.isPremium).length;
    const premiumNotes = db.materials.filter((m) => m.isPremium).length;

    const totalOrders = db.orders.length;
    const paidOrdersList = db.orders.filter((o) => o.status === "Paid");
    const paidOrders = paidOrdersList.length;
    const pendingOrders = db.orders.filter((o) => o.status === "Pending").length;
    const failedOrders = db.orders.filter(
      (o) => o.status === "Failed" || o.status === "Cancelled",
    ).length;

    const totalRevenue = paidOrdersList.reduce((acc, o) => acc + o.finalAmount, 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRevenue = paidOrdersList
      .filter((o) => o.orderDate.slice(0, 10) === todayStr)
      .reduce((acc, o) => acc + o.finalAmount, 0);

    const monthStr = new Date().toISOString().slice(0, 7);
    const monthRevenue = paidOrdersList
      .filter((o) => o.orderDate.slice(0, 7) === monthStr)
      .reduce((acc, o) => acc + o.finalAmount, 0);

    // Sales by Year
    const salesByYear = [1, 2, 3, 4].map((year) => {
      // Find orders whose materials match this year
      const matchingOrders = paidOrdersList.filter((o) => {
        const mat = db.materials.find((m) => o.materialIds.includes(m.id));
        return mat?.year === year;
      });
      return {
        year,
        revenue: matchingOrders.reduce((sum, o) => sum + o.finalAmount, 0),
        salesCount: matchingOrders.length,
      };
    });

    // Subject Sales
    const subjectMap = new Map<string, { subjectName: string; revenue: number; salesCount: number }>();
    db.subjects.forEach((s) => {
      subjectMap.set(s.id, { subjectName: s.name, revenue: 0, salesCount: 0 });
    });

    paidOrdersList.forEach((o) => {
      o.materialIds.forEach((matId) => {
        const mat = db.materials.find((m) => m.id === matId);
        if (mat && subjectMap.has(mat.subjectId)) {
          const entry = subjectMap.get(mat.subjectId)!;
          entry.salesCount += 1;
          entry.revenue += mat.price;
        }
      });
    });

    const salesBySubject = Array.from(subjectMap.values());
    const topSellingSubjects = Array.from(subjectMap.entries())
      .map(([subjectId, val]) => ({
        subjectId,
        subjectName: val.subjectName,
        count: val.salesCount,
        revenue: val.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalStudents,
      studentsByYear,
      studentsBySemester,
      totalNotes,
      freeNotes,
      premiumNotes,
      totalOrders,
      paidOrders,
      pendingOrders,
      failedOrders,
      totalRevenue,
      todayRevenue,
      monthRevenue,
      salesByYear,
      salesBySubject,
      topSellingSubjects,
    };
  }, [db.students, db.materials, db.orders, db.subjects]);

  const value: Ctx = {
    ready,
    db,
    session,
    student,
    isAdmin: session?.role === "admin" || userProfile?.role === "admin",
    userProfile,
    metrics,

    async register(input) {
      const email = input.email.trim().toLowerCase();

      // 1. Create real Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            full_name: input.name.trim(),
            name: input.name.trim(),
            mobile: input.mobile.trim(),
            college: input.college.trim(),
            year: input.year,
            semester: input.semester,
          },
        },
      });

      if (authError || !authData.user) {
        return {
          ok: false,
          error: authError?.message || "Registration failed. Please check your details.",
        };
      }

      // 2. Persist real student profile linked by Auth user UUID
      const profileRecord: UserProfile = {
        id: authData.user.id,
        email,
        full_name: input.name.trim(),
        mobile: input.mobile.trim(),
        college: input.college.trim(),
        year: input.year,
        semester: input.semester,
        role: "student", // Strictly student
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileRecord, { onConflict: "id" });

      if (profileError) {
        console.warn("[Profiles] Upsert notice:", profileError.message);
      }

      // Cache locally for immediate fast browsing
      const localStudent: Student = {
        id: authData.user.id,
        name: input.name.trim(),
        email,
        mobile: input.mobile.trim(),
        college: input.college.trim(),
        year: input.year,
        semester: input.semester,
        createdAt: new Date().toISOString(),
      };

      persist({
        ...db,
        students: db.students.some((s) => s.id === localStudent.id)
          ? db.students.map((s) => (s.id === localStudent.id ? localStudent : s))
          : [...db.students, localStudent],
      });

      // Always activate session immediately so student goes straight to dashboard
      setUserProfile(profileRecord);
      setSessionPersisted({ role: "student", id: authData.user.id });

      // Automatically sign in to get active auth session
      try {
        await supabase.auth.signInWithPassword({
          email,
          password: input.password,
        });
      } catch {
        /* proceed with established local profile */
      }

      return { ok: true };
    },

    async login(identifier, password) {
      const key = identifier.trim().toLowerCase();

      // Authenticate against Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: key,
        password,
      });

      if (authError || !authData.user) {
        const errorMsg = (authError?.message || "").toLowerCase();
        if (
          errorMsg.includes("invalid login credentials") ||
          errorMsg.includes("user not found")
        ) {
          return {
            ok: false,
            error: "Account not found or password incorrect. If you are a new student, please Register first.",
          };
        }
        if (errorMsg.includes("email not confirmed")) {
          return {
            ok: false,
            error: "Email not confirmed. Please check your inbox or disable email confirmation in Supabase settings.",
          };
        }
        return {
          ok: false,
          error: authError?.message || "Invalid email or password. Please register if you don't have an account.",
        };
      }

      // Retrieve student profile from database
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile?.disabled) {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: "This student account has been disabled. Please contact support.",
        };
      }

      const role = (profile?.role || (authData.user.email === "siddu@gmail.com" ? "admin" : "student")) as "admin" | "student";
      const userProf = (profile as UserProfile) || {
        id: authData.user.id,
        email: key,
        full_name: ((authData.user.user_metadata as Record<string, any>)?.[
          "full_name"
        ] as string) || key.split("@")[0],
        role,
      };

      setUserProfile(userProf);
      setSessionPersisted({ role, id: authData.user.id }, userProf);

      return { ok: true, role };
    },

    async adminLogin(userId, password) {
      const cleanInput = userId.trim().toLowerCase();

      // 1. Check directly against dedicated public.admins table in database
      try {
        const { data: adminRecord, error: adminQueryErr } = await supabase
          .from("admins")
          .select("*")
          .or(`email.ilike.${cleanInput},username.ilike.${cleanInput}`)
          .maybeSingle();

        if (adminRecord && !adminQueryErr) {
          const isHashedMatch = await verifyPassword(password, adminRecord.password_hash);
          const isPlainMatch = adminRecord.password_hash === password;
          const isNewHashMatch = adminRecord.password_hash === (await hashPassword(password));

          if (isHashedMatch || isPlainMatch || isNewHashMatch) {
            const adminProfile: UserProfile = {
              id: adminRecord.id,
              email: adminRecord.email,
              full_name: adminRecord.name || "Siddu Admin",
              role: "admin",
            };

            setUserProfile(adminProfile);
            setSessionPersisted({ role: "admin", id: adminRecord.id }, adminProfile);

            // Also synchronize with Supabase Auth so storage operations obtain authenticated JWT role
            try {
              await supabase.auth.signInWithPassword({
                email: adminRecord.email || cleanInput,
                password,
              });
            } catch (authSyncErr) {
              console.warn("[AdminLogin] Supabase Auth session sync notice:", authSyncErr);
            }

            return { ok: true };
          } else {

            return {
              ok: false,
              error: "Invalid administrator password.",
            };
          }
        }
      } catch (err) {
        console.warn("[AdminLogin] Note while querying admins table:", err);
      }

      // 2. Fallback to Supabase Auth if admin user exists in auth.users
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanInput,
        password,
      });

      if (authError || !authData.user) {
        return {
          ok: false,
          error: "Invalid administrator credentials. Account not found in database.",
        };
      }

      // Verify role from database record
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      const isAuthorizedAdmin =
        profile?.role === "admin" ||
        authData.user.email?.toLowerCase() === "siddu@gmail.com";

      if (!isAuthorizedAdmin) {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: "Access denied. This account does not have administrative privileges.",
        };
      }

      const adminProfile: UserProfile = (profile as UserProfile) || {
        id: authData.user.id,
        email: authData.user.email || cleanInput,
        full_name: ((authData.user.user_metadata as Record<string, any>)?.[
          "full_name"
        ] as string) || "Siddu Admin",
        role: "admin",
      };

      setUserProfile(adminProfile);
      setSessionPersisted({ role: "admin", id: authData.user.id }, adminProfile);
      return { ok: true };
    },

    async logout() {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem(PROFILE_KEY);
      } catch {
        /* ignore */
      }
      setUserProfile(null);
      setSessionPersisted(null, null);
    },

    updateProfile(patch) {
      if (!student) return;
      persist({
        ...db,
        students: db.students.map((s) => (s.id === student.id ? { ...s, ...patch } : s)),
      });
    },

    updateStudent(studentId, patch) {
      persist({
        ...db,
        students: db.students.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
      });
    },

    saveMaterial(material) {
      const exists = db.materials.some((m) => m.id === material.id);
      persist({
        ...db,
        materials: exists
          ? db.materials.map((m) => (m.id === material.id ? material : m))
          : [material, ...db.materials],
      });
    },

    deleteMaterial(materialId, permanent = false) {
      // If note has existing purchases, don't permanently delete to protect records
      const hasPurchases =
        db.purchases.some((p) => p.materialId === materialId) ||
        db.orders.some((o) => o.materialIds.includes(materialId));

      if (hasPurchases && !permanent) {
        // Deactivate/Archive instead of permanent deletion
        persist({
          ...db,
          materials: db.materials.map((m) =>
            m.id === materialId ? { ...m, published: false, status: "Inactive" as const } : m,
          ),
        });
      } else {
        persist({ ...db, materials: db.materials.filter((m) => m.id !== materialId) });
      }
    },

    saveSubject(subject) {
      const exists = db.subjects.some((s) => s.id === subject.id);
      persist({
        ...db,
        subjects: exists
          ? db.subjects.map((s) => (s.id === subject.id ? subject : s))
          : [...db.subjects, subject],
      });
    },

    deleteSubject(subjectId) {
      persist({
        ...db,
        subjects: db.subjects.filter((s) => s.id !== subjectId),
        materials: db.materials.map((m) =>
          m.subjectId === subjectId ? { ...m, published: false, status: "Inactive" as const } : m,
        ),
      });
    },

    savePackage(pkg) {
      const exists = db.packages.some((p) => p.id === pkg.id);
      persist({
        ...db,
        packages: exists
          ? db.packages.map((p) => (p.id === pkg.id ? pkg : p))
          : [...db.packages, pkg],
      });
    },

    deletePackage(packageId) {
      persist({
        ...db,
        packages: db.packages.filter((p) => p.id !== packageId),
      });
    },

    async createOrder(input) {
      if (!student) return { ok: false, error: "Please log in to complete your purchase." };

      let materialIds: string[] = [];
      if (input.productType === "material") {
        materialIds = [input.productId];
      } else {
        const pkg = db.packages.find((p) => p.id === input.productId);
        if (pkg) {
          materialIds = pkg.materialIds;
        } else {
          // If subject or semester bundle
          materialIds = db.materials
            .filter((m) => m.subjectId === input.productId && m.isPremium)
            .map((m) => m.id);
        }
      }

      const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const discount = input.discount ?? 0;
      const finalAmount = Math.max(0, input.amount - discount);

      const newOrder: Order = {
        id: orderId,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        productId: input.productId,
        productType: input.productType,
        productTitle: input.productTitle,
        materialIds,
        amount: input.amount,
        discount,
        finalAmount,
        gateway: input.gateway ?? "razorpay",
        status: "Paid", // Demo simulation completes payment immediately
        transactionId: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        orderDate: new Date().toISOString(),
        paymentDate: new Date().toISOString(),
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "2026-v1.0",
      };

      // Add purchases to student library
      const newPurchases = materialIds
        .filter((mid) => !db.purchases.some((p) => p.studentId === student.id && p.materialId === mid))
        .map((mid) => ({
          id: generateId("pur"),
          studentId: student.id,
          materialId: mid,
          amount: input.amount,
          status: "unlocked" as const,
          createdAt: new Date().toISOString(),
        }));

      persist({
        ...db,
        orders: [newOrder, ...db.orders],
        purchases: [...db.purchases, ...newPurchases],
      });

      return { ok: true, order: newOrder };
    },

    updateOrderStatus(orderId, status) {
      persist({
        ...db,
        orders: db.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      });
    },

    toggleFavorite(materialId) {
      if (!student) return;
      const has = db.favorites.some((f) => f.studentId === student.id && f.materialId === materialId);
      persist({
        ...db,
        favorites: has
          ? db.favorites.filter((f) => !(f.studentId === student.id && f.materialId === materialId))
          : [...db.favorites, { studentId: student.id, materialId }],
      });
    },

    isFavorite(materialId) {
      return !!student && db.favorites.some((f) => f.studentId === student.id && f.materialId === materialId);
    },

    trackView(materialId) {
      if (!student) return;
      const rest = db.recent.filter((r) => !(r.studentId === student.id && r.materialId === materialId));
      persist({
        ...db,
        recent: [{ studentId: student.id, materialId, at: new Date().toISOString() }, ...rest].slice(0, 60),
      });
    },

    logDocumentAccess(materialId) {
      if (!student) return;
      const mat = db.materials.find((m) => m.id === materialId);
      const newLog = {
        id: generateId("log"),
        studentId: student.id,
        studentEmail: student.email,
        materialId,
        materialTitle: mat?.title || materialId,
        accessedAt: new Date().toISOString(),
      };
      persist({
        ...db,
        accessLogs: [newLog, ...(db.accessLogs || [])].slice(0, 100),
      });
    },

    unlock(materialId) {
      if (!student) return;
      const material = db.materials.find((m) => m.id === materialId);
      if (!material) return;
      if (db.purchases.some((p) => p.studentId === student.id && p.materialId === materialId)) return;

      const newPurchase = {
        id: generateId("pur"),
        studentId: student.id,
        materialId,
        amount: material.price,
        status: "unlocked" as const,
        createdAt: new Date().toISOString(),
      };

      const newOrder: Order = {
        id: `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        productId: material.id,
        productType: "material",
        productTitle: material.title,
        materialIds: [material.id],
        amount: material.price,
        discount: 0,
        finalAmount: material.price,
        gateway: "razorpay",
        status: "Paid",
        transactionId: `pay_${Date.now().toString(36)}`,
        orderDate: new Date().toISOString(),
        paymentDate: new Date().toISOString(),
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "2026-v1.0",
      };

      persist({
        ...db,
        purchases: [...db.purchases, newPurchase],
        orders: [newOrder, ...db.orders],
      });
    },

    hasAccess,

    setDrive(patch) {
      persist({ ...db, drive: { ...db.drive, ...patch } });
    },

    setPaymentGateway(patch) {
      persist({ ...db, paymentGateway: { ...db.paymentGateway, ...patch } });
    },

    setWebsiteSettings(patch) {
      persist({ ...db, websiteSettings: { ...db.websiteSettings, ...patch } });
    },

    resetDemoData() {
      const seed = createSeedDB();
      persist(seed);
      setSessionPersisted(null);
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useSubjectMap() {
  const { db } = useStore();
  return useMemo(() => new Map(db.subjects.map((s) => [s.id, s])), [db.subjects]);
}

export const YEARS = [1, 2, 3, 4] as const;
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const semestersForYear = (year: number) => [year * 2 - 1, year * 2];
export const formatPrice = (value: number) => (value > 0 ? `₹${value.toLocaleString("en-IN")}` : "Free");
