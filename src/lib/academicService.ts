import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  name: string;
  code: string;
  type?: string | null;
  description?: string | null;
  duration_years: number;
  total_semesters: number;
  default_semester_price?: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  materials_count?: number;
  purchased_count?: number;
}

export interface Semester {
  id: string;
  course_id: string;
  academic_year_id?: string | null;
  semester_number: number;
  title: string;
  is_active: boolean;
  created_at?: string;
  subjects_count?: number;
  materials_count?: number;
  purchased_count?: number;
}

export interface SubjectItem {
  id: string;
  course_id: string;
  semester_id: string;
  semester_number: number;
  semester?: number;
  year?: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  units_count?: number;
  materials_count?: number;
  purchased_count?: number;
  thumbnail_url?: string | null;
  price?: number;
  is_premium?: boolean;
}

export interface UnitItem {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  materials_count?: number;
  purchased_count?: number;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | string | null;
  is_premium?: boolean;
}

export interface SecuritySettings {
  allow_download: boolean;
  allow_print: boolean;
  allow_screenshot: boolean;
  watermark_pdf: boolean;
  online_preview_only: boolean;
  visible_to: "all" | "purchased" | "batches";
  publication_status: "Published" | "Draft";
}

export interface MaterialItem {
  id: string;
  course_id?: string | undefined;
  semester_id?: string | undefined;
  subject_id: string;
  unit_id: string;
  unit_number?: number | undefined;
  unit_label?: string | undefined;
  year?: number | undefined;
  semester?: number | undefined;
  title: string;
  description?: string | null | undefined;
  material_type: string;
  is_premium: boolean;
  price: number;
  file_url?: string | null | undefined;
  file_name?: string | null | undefined;
  file_size?: number | string | null | undefined;
  drive_url?: string | null | undefined;
  thumbnail_url?: string | null | undefined;
  cover_image_url?: string | null | undefined;
  status: "Published" | "Draft" | "Inactive";
  downloads_count: number;
  students_count?: number | undefined;
  display_order?: number | undefined;
  created_at: string;
  security?: SecuritySettings | undefined;
}

export interface DependencyCheckResult {
  hasDependencies: boolean;
  semestersCount: number;
  subjectsCount: number;
  unitsCount: number;
  materialsCount: number;
  purchasesCount: number;
  canHardDelete: boolean;
  warningMessage: string;
}

export interface AcademicDataStore {
  courses: Course[];
  semesters: Semester[];
  subjects: SubjectItem[];
  units: UnitItem[];
  materials: MaterialItem[];
  registeredStudentsCount: number;
  totalPurchasedCount: number;
}

// Local cache key strictly for offline / resilience recovery
const LOCAL_CACHE_KEY = "ps_academic_real_cache_v3";

function loadLocalCache(): AcademicDataStore {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.courses)) return parsed;
    }
  } catch { }
  return {
    courses: [],
    semesters: [],
    subjects: [],
    units: [],
    materials: [],
    registeredStudentsCount: 0,
    totalPurchasedCount: 0,
  };
}

function saveLocalCache(data: AcademicDataStore) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  } catch { }
}

export const AcademicService = {
  // 1. Load All Academic Data directly from Supabase
  async loadAll(): Promise<AcademicDataStore> {
    try {
      // Fetch in parallel directly from Supabase
      const [
        coursesRes,
        semestersRes,
        subjectsRes,
        unitsRes,
        materialsRes,
        purchasesRes,
        profilesRes,
      ] = await Promise.all([
        supabase.from("courses").select("*").order("display_order", { ascending: true }),
        supabase.from("semesters").select("*").order("semester_number", { ascending: true }),
        supabase.from("subjects").select("*").order("display_order", { ascending: true }),
        supabase.from("units").select("*").order("unit_number", { ascending: true }),
        supabase.from("materials").select("*").order("created_at", { ascending: false }),
        supabase.from("purchases").select("id, material_id, student_id, amount, status"),
        supabase.from("profiles").select("id, role").neq("role", "admin"),
      ]);

      const rawCourses = coursesRes.data || [];
      const rawSemesters = semestersRes.data || [];
      const rawSubjects = subjectsRes.data || [];
      const rawUnits = unitsRes.data || [];
      const rawMaterials = materialsRes.data || [];
      const rawPurchases = purchasesRes.data || [];
      const registeredStudentsCount = profilesRes.data?.length || 0;

      // Map purchases count per material
      const purchasesByMaterial: Record<string, number> = {};
      rawPurchases.forEach((p) => {
        if (p.material_id) {
          purchasesByMaterial[p.material_id] = (purchasesByMaterial[p.material_id] || 0) + 1;
        }
      });

      // Construct Units
      const units: UnitItem[] = rawUnits.map((u: any) => {
        const uMats = rawMaterials.filter((m) => m.unit_id === u.id);
        const uPurchases = uMats.reduce((acc, m) => acc + (purchasesByMaterial[m.id] || 0), 0);
        const uFileUrl = u.file_url || (uMats.length > 0 ? uMats[0].file_url : null);
        const uFileName = u.file_name || (uMats.length > 0 ? uMats[0].file_name : null);
        const uFileSize = u.file_size || (uMats.length > 0 ? uMats[0].file_size : null);
        const uIsPrem = u.is_premium === true || uMats.some((m: any) => m.is_premium === true || (typeof m.price === "number" && m.price > 0));
        return {
          id: u.id,
          subject_id: u.subject_id,
          unit_number: u.unit_number,
          title: u.title,
          description: u.description || "",
          is_active: u.is_active ?? true,
          display_order: (u as any).display_order ?? u.unit_number,
          created_at: u.created_at,
          materials_count: uMats.length,
          purchased_count: uPurchases,
          file_url: uFileUrl,
          file_name: uFileName,
          file_size: uFileSize,
          is_premium: Boolean(uIsPrem),
        };
      });

      // Construct Subjects
      const subjects: SubjectItem[] = rawSubjects.map((sub) => {
        const subUnits = units.filter((u) => u.subject_id === sub.id);
        const subMats = rawMaterials.filter((m) => m.subject_id === sub.id);
        const subPurchases = subMats.reduce((acc, m) => acc + (purchasesByMaterial[m.id] || 0), 0);
        const semNum = sub.semester || sub.year || 1;
        const calcYear = sub.year || Math.ceil(semNum / 2) || 1;
        const isPrem = sub.is_premium === true || Boolean(sub.is_premium) || (Number(sub.price) > 0);
        const subPrice = sub.price !== null && sub.price !== undefined ? Number(sub.price) : 0;
        return {
          id: sub.id,
          course_id: sub.course_id || "",
          semester_id: sub.semester_id || "",
          semester_number: semNum,
          semester: semNum,
          year: calcYear,
          name: sub.name,
          code: sub.code || "",
          description: sub.description || "",
          is_active: sub.is_active ?? true,
          display_order: sub.display_order ?? 1,
          created_at: sub.created_at,
          units_count: subUnits.length,
          materials_count: subMats.length,
          purchased_count: subPurchases,
          thumbnail_url: sub.thumbnail_url || null,
          price: subPrice,
          is_premium: isPrem,
        };
      });

      // Construct Materials
      const materials: MaterialItem[] = rawMaterials.map((m) => {
        const parentSubject = subjects.find((s) => s.id === m.subject_id);
        const parentUnit = units.find((u) => u.id === m.unit_id);
        const pCount = purchasesByMaterial[m.id] || 0;
        const uNum = (m as any).unit_number ?? parentUnit?.unit_number ?? 1;
        const uLabel = (m as any).unit_label ?? (parentUnit ? `Unit ${parentUnit.unit_number}` : `Unit ${uNum}`);
        return {
          id: m.id,
          course_id: (m as any).course_id || parentSubject?.course_id || "",
          semester_id: (m as any).semester_id || parentSubject?.semester_id || "",
          subject_id: m.subject_id || "",
          unit_id: m.unit_id || "",
          unit_number: uNum,
          unit_label: uLabel,
          year: (m as any).year || parentSubject?.year || 1,
          semester: (m as any).semester || parentSubject?.semester || 1,
          title: m.title,
          description: m.description || "",
          material_type: m.material_type || m.type || "Notes",
          is_premium: m.is_premium ?? (m.price > 0),
          price: Number(m.price || 0),
          file_url: (m as any).file_url || "",
          file_name: (m as any).file_name || null,
          file_size: (m as any).file_size || null,
          drive_url: (m as any).drive_url || "",
          cover_image_url: (m as any).cover_image_url || null,
          status: (m.status as "Published" | "Draft" | "Inactive") || ((m as any).published ? "Published" : "Draft"),
          downloads_count: (m as any).downloads_count || 0,
          students_count: pCount,
          display_order: 1,
          created_at: m.created_at,
          security: {
            allow_download: (m as any).allow_download ?? true,
            allow_print: (m as any).allow_print ?? false,
            allow_screenshot: false,
            watermark_pdf: (m as any).add_watermark ?? true,
            online_preview_only: !(m as any).allow_download,
            visible_to: ((m as any).visible_to as "all" | "purchased") || "all",
            publication_status: m.published ? "Published" : "Draft",
          },
        };
      });

      // Construct Semesters
      const semesters: Semester[] = rawSemesters.map((s) => {
        const semSubs = subjects.filter((sub) => sub.semester_id === s.id);
        const semMats = materials.filter(
          (m) => m.semester_id === s.id || semSubs.some((sub) => sub.id === m.subject_id),
        );
        const semPurchases = semMats.reduce((acc, m) => acc + (m.students_count || 0), 0);
        return {
          id: s.id,
          course_id: s.course_id,
          academic_year_id: s.academic_year_id,
          semester_number: s.semester_number,
          title: s.title || `Semester ${s.semester_number}`,
          is_active: s.is_active ?? true,
          created_at: s.created_at,
          subjects_count: semSubs.length,
          materials_count: semMats.length,
          purchased_count: semPurchases,
        };
      });

      // Construct Courses
      const courses: Course[] = rawCourses.map((c) => {
        const cSems = semesters.filter((s) => s.course_id === c.id);
        const cSubs = subjects.filter((sub) => sub.course_id === c.id || cSems.some((s) => s.id === sub.semester_id));
        const cMats = materials.filter(
          (m) => m.course_id === c.id || cSubs.some((sub) => sub.id === m.subject_id),
        );
        const cPurchases = cMats.reduce((acc, m) => acc + (m.students_count || 0), 0);
        return {
          id: c.id,
          name: c.name,
          code: c.code,
          type: c.type || "Degree",
          description: c.description || "",
          duration_years: c.duration_years || 4,
          total_semesters: cSems.length || (c.duration_years || 4) * 2,
          default_semester_price: Number((c as any).default_semester_price ?? cSems[0]?.price ?? 399),
          is_active: c.is_active ?? true,
          display_order: c.display_order ?? 1,
          created_at: c.created_at,
          materials_count: cMats.length,
          purchased_count: cPurchases,
        };
      });

      const totalPurchasedCount = Object.values(purchasesByMaterial).reduce((a, b) => a + b, 0);

      const store: AcademicDataStore = {
        courses,
        semesters,
        subjects,
        units,
        materials,
        registeredStudentsCount,
        totalPurchasedCount,
      };

      saveLocalCache(store);
      return store;
    } catch (err) {
      console.warn("[AcademicService.loadAll] Error querying Supabase, using cache:", err);
      return loadLocalCache();
    }
  },

  // 2. Add Course (Persist to Supabase & Auto-generate N Semesters)
  async addCourse(course: {
    name: string;
    code?: string | undefined;
    duration_years: number;
    total_semesters: number;
    description?: string | undefined;
    default_semester_price?: number | undefined;
    is_active?: boolean | undefined;
    display_order?: number | undefined;
  }): Promise<Course & { course: Course; semesters: Semester[] }> {
    const cleanCode =
      course.code ||
      course.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10) ||
      "CRS";

    const courseId = crypto.randomUUID();
    const coursePayload: any = {
      id: courseId,
      name: course.name,
      code: cleanCode,
      description: course.description || `${course.name} Course`,
      duration_years: course.duration_years,
      is_active: course.is_active ?? true,
      display_order: course.display_order ?? 1,
    };
    if (course.default_semester_price !== undefined) {
      coursePayload.default_semester_price = course.default_semester_price;
    }

    // Step 1: Insert the course and retrieve its id
    const { data: dbCourse, error: cErr } = await supabase
      .from("courses")
      .insert(coursePayload)
      .select()
      .single();

    if (cErr) {
      console.error("Supabase insert course error:", cErr);
      throw new Error(`Failed to create course: ${cErr.message}`);
    }

    try {
      // Step 2: Create academic-year records based on the selected course duration
      const yearRecords = [];
      const yearMap = new Map<number, string>();

      for (let y = 1; y <= course.duration_years; y++) {
        const yearId = crypto.randomUUID();
        yearMap.set(y, yearId);
        yearRecords.push({
          id: yearId,
          course_id: courseId,
          year_number: y,
          title: `Year ${y}`,
          is_active: true,
        });
      }

      const { data: dbYears, error: yErr } = await supabase
        .from("academic_years")
        .insert(yearRecords)
        .select();

      if (yErr) {
        console.error("Supabase insert academic_years error:", yErr);
        throw new Error(`Failed to create academic years: ${yErr.message}`);
      }

      // Step 3: Retrieve each academic year's id
      if (dbYears && dbYears.length > 0) {
        dbYears.forEach((item: any) => {
          yearMap.set(item.year_number, item.id);
        });
      }

      // Step 4: Insert each semester with course_id, academic_year_id, semester_number, and title
      const semsPerYear = Math.max(1, Math.ceil(course.total_semesters / course.duration_years));
      const semInserts = [];
      const semPrice = Number(course.default_semester_price || 399);

      for (let i = 1; i <= course.total_semesters; i++) {
        const yearNum = Math.min(course.duration_years, Math.ceil(i / semsPerYear));
        const academicYearId = yearMap.get(yearNum) || yearRecords[0]?.id;

        semInserts.push({
          id: crypto.randomUUID(),
          course_id: courseId,
          academic_year_id: academicYearId || null,
          semester_number: i,
          title: `Semester ${i}`,
          is_active: true,
        });
      }

      const { data: dbSems, error: sErr } = await supabase
        .from("semesters")
        .insert(semInserts)
        .select();

      if (sErr) {
        console.error("Supabase insert semesters error:", sErr);
        throw new Error(`Failed to create semesters: ${sErr.message}`);
      }

      // Auto-create Packages for checkout/orders and sync pricing safely
      const packagesPayload = (dbSems || []).map((s: any) => ({
        id: s.id,
        course_id: courseId,
        semester: s.semester_number,
        title: `${dbCourse.name} - ${s.title}`,
        description: `Complete semester study package for ${dbCourse.name} ${s.title}`,
        price: semPrice,
        original_price: semPrice * 2,
        type: "semester",
        is_active: true,
      }));

      try {
        await supabase.from("packages").upsert(packagesPayload, { onConflict: "id" });
      } catch (pkgErr) {
        console.warn("Packages upsert notice:", pkgErr);
      }

      // Try updating semesters.price safely if column exists
      try {
        await supabase
          .from("semesters")
          .update({ price: semPrice, original_price: semPrice * 2 } as any)
          .eq("course_id", courseId);
      } catch { }

      const createdSemesters: Semester[] = (dbSems || []).map((s) => ({
        id: s.id,
        course_id: courseId,
        academic_year_id: s.academic_year_id,
        semester_number: s.semester_number,
        title: s.title,
        price: semPrice,
        original_price: semPrice * 2,
        is_active: s.is_active,
        created_at: s.created_at,
        subjects_count: 0,
        materials_count: 0,
        purchased_count: 0,
      }));

      const createdCourse: Course = {
        id: dbCourse.id,
        name: dbCourse.name,
        code: dbCourse.code,
        duration_years: dbCourse.duration_years,
        total_semesters: createdSemesters.length,
        default_semester_price: semPrice,
        description: dbCourse.description || "",
        is_active: dbCourse.is_active ?? true,
        display_order: dbCourse.display_order ?? 1,
        materials_count: 0,
        purchased_count: 0,
        created_at: dbCourse.created_at,
      };

      // Step 5: Show success only after all operations complete
      return Object.assign(createdCourse, {
        course: createdCourse,
        semesters: createdSemesters,
      });
    } catch (stepErr: any) {
      // Step 5: Handle errors without leaving partial records
      console.error("Course creation failed during dependent records setup, rolling back:", stepErr);
      await supabase.from("packages").delete().eq("course_id", courseId);
      await supabase.from("semesters").delete().eq("course_id", courseId);
      await supabase.from("academic_years").delete().eq("course_id", courseId);
      await supabase.from("courses").delete().eq("id", courseId);
      throw new Error(stepErr?.message || "Course creation failed.");
    }
  },

  // 3. Edit Course
  async updateCourse(
    id: string,
    updates: Partial<Pick<Course, "name" | "description" | "duration_years" | "is_active" | "default_semester_price">>,
  ): Promise<{ success: boolean; error?: string }> {
    const semPrice = updates.default_semester_price;
    const coursePayload: any = { ...updates };

    const { error } = await supabase
      .from("courses")
      .update(coursePayload)
      .eq("id", id);
    if (error) {
      console.error("Supabase updateCourse error:", error);
      return { success: false, error: error.message };
    }

    // Sync updated semester package pricing if provided
    if (semPrice !== undefined && semPrice >= 0) {
      try {
        const { data: sems } = await supabase.from("semesters").select("id").eq("course_id", id);
        if (sems && sems.length > 0) {
          const semIds = sems.map((s) => s.id);
          await supabase.from("packages").update({ price: semPrice, original_price: semPrice * 2 }).in("id", semIds);
          try {
            await supabase.from("semesters").update({ price: semPrice, original_price: semPrice * 2 } as any).eq("course_id", id);
          } catch { }
        }
      } catch (pkgErr) {
        console.warn("Could not sync updated semester prices:", pkgErr);
      }
    }

    return { success: true };
  },

  // 4. Delete Course (Safe with Dependency Checking)
  async deleteCourse(id: string): Promise<{ success: boolean; error?: string }> {
    // 1. Check if course materials have student purchases
    const deps = this.checkCourseDependencies(id);
    if (deps.purchasesCount > 0) {
      return {
        success: false,
        error: `Cannot delete: Course materials have active student purchases (${deps.purchasesCount} orders). Please keep the course active to preserve student library history.`,
      };
    }

    // 2. Cascade delete dependent materials, units, subjects, semesters, academic_years
    const cache = loadLocalCache();
    const semIds = cache.semesters.filter((s) => s.course_id === id).map((s) => s.id);
    const subIds = cache.subjects
      .filter((sub) => sub.course_id === id || semIds.includes(sub.semester_id))
      .map((sub) => sub.id);

    if (subIds.length > 0) {
      await supabase.from("materials").delete().in("subject_id", subIds);
      await supabase.from("units").delete().in("subject_id", subIds);
      await supabase.from("subjects").delete().in("id", subIds);
    }

    if (semIds.length > 0) {
      await supabase.from("packages").delete().in("id", semIds);
      await supabase.from("semesters").delete().in("id", semIds);
    }

    // Also delete academic_years for this course
    await supabase.from("academic_years").delete().eq("course_id", id);

    // 3. Delete course
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      console.error("Supabase deleteCourse error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // 5. Add Subject (No Manual Units Required)
  async addSubject(params: {
    course_id: string;
    semester_id: string;
    semester_number: number;
    year?: number;
    name: string;
    code?: string;
    description?: string;
    thumbnail_url?: string | null;
    price?: number;
    is_premium?: boolean;
  }): Promise<SubjectItem> {
    const cleanCode =
      params.code?.trim().toUpperCase() ||
      (() => {
        const words = params.name.split(/\s+/).filter(Boolean);
        const initials = words.map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 4);
        return `BP${params.semester_number}0${words.length}${initials ? initials : "T"}`;
      })();

    const subId = crypto.randomUUID();
    const calculatedYear = params.year ?? (Math.ceil(params.semester_number / 2) || 1);
    const isPaid = params.is_premium === true || (Number(params.price) > 0);
    const finalPrice = isPaid ? (Number(params.price) || 0) : 0;

    const subPayload = {
      id: subId,
      course_id: params.course_id,
      semester_id: params.semester_id,
      semester: params.semester_number,
      year: calculatedYear,
      name: params.name,
      code: cleanCode,
      description: params.description || "",
      is_active: true,
      display_order: 1,
      thumbnail_url: params.thumbnail_url || null,
      price: finalPrice,
      is_premium: isPaid,
    };

    const { data: dbSub, error: sErr } = await supabase
      .from("subjects")
      .insert(subPayload)
      .select()
      .single();

    if (sErr) {
      console.error("Supabase addSubject error:", sErr);
      throw new Error(`Failed to create subject in database: ${sErr.message}`);
    }

    return {
      id: dbSub.id,
      course_id: params.course_id,
      semester_id: params.semester_id,
      semester_number: params.semester_number,
      semester: params.semester_number,
      year: calculatedYear,
      name: params.name,
      code: cleanCode,
      description: params.description || "",
      is_active: true,
      display_order: 1,
      units_count: 0,
      materials_count: 0,
      purchased_count: 0,
      created_at: dbSub.created_at || new Date().toISOString(),
      thumbnail_url: dbSub.thumbnail_url || null,
      price: Number(dbSub.price) || 0,
      is_premium: Boolean(dbSub.is_premium),
    };
  },

  // 6. Edit Subject
  async updateSubject(
    id: string,
    updates: Partial<SubjectItem> & { semester?: number; year?: number },
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const payload: any = { ...updates };
    if (payload.semester_number !== undefined && payload.semester === undefined) {
      payload.semester = payload.semester_number;
    }
    if (payload.semester !== undefined && payload.year === undefined) {
      payload.year = Math.ceil(payload.semester / 2) || 1;
    }
    delete payload.semester_number;
    delete payload.units_count;
    delete payload.materials_count;
    delete payload.purchased_count;

    // Strict boolean and numeric sanitization for price & is_premium
    if (payload.is_premium !== undefined) {
      payload.is_premium = Boolean(payload.is_premium);
      if (!payload.is_premium) {
        payload.price = 0;
      }
    }
    if (payload.price !== undefined) {
      payload.price = Number(payload.price) || 0;
      if (payload.price > 0 && payload.is_premium === undefined) {
        payload.is_premium = true;
      }
    }

    const { data, error } = await supabase
      .from("subjects")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase updateSubject error:", error);
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: false, error: "Subject not found or update not permitted." };
    }
    return { success: true, data: data[0] };
  },

  // 7. Delete Subject (Safe)
  async deleteSubject(id: string): Promise<{ success: boolean; error?: string }> {
    const cache = loadLocalCache();
    const subMats = cache.materials.filter((m) => m.subject_id === id);
    const purchasesCount = subMats.reduce((acc, m) => acc + (m.students_count || 0), 0);
    if (purchasesCount > 0) {
      return {
        success: false,
        error: `Cannot delete: Subject materials have active student purchases (${purchasesCount} orders). Please keep the subject active to preserve student purchases.`,
      };
    }

    // Delete dependent materials & units
    await supabase.from("materials").delete().eq("subject_id", id);
    await supabase.from("units").delete().eq("subject_id", id);

    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) {
      console.error("Supabase deleteSubject error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // 8. Add Unit (Saves to units and links material record)
  async addUnit(params: {
    subject_id: string;
    unit_number: number;
    title: string;
    description?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number | string;
    is_premium?: boolean;
  }): Promise<UnitItem> {
    if (!params.subject_id) {
      throw new Error("Subject ID is required to create a unit.");
    }
    if (!params.title?.trim()) {
      throw new Error("Unit title is required.");
    }

    const unitId = crypto.randomUUID();
    const isPaid = Boolean(params.is_premium);

    const unitPayload = {
      id: unitId,
      subject_id: params.subject_id,
      unit_number: params.unit_number || 1,
      title: params.title.trim(),
      description: params.description?.trim() || `Unit ${params.unit_number || 1} study materials`,
      display_order: params.unit_number || 1,
      is_active: true,
      file_url: params.file_url || null,
      file_name: params.file_name || null,
      file_size: params.file_size ? String(params.file_size) : null,
      is_premium: isPaid,
    };

    const { data: dbUnit, error: uErr } = await supabase
      .from("units")
      .insert(unitPayload)
      .select()
      .single();

    if (uErr) {
      console.error("Supabase addUnit error:", uErr);
      throw new Error(`Failed to create unit in database: ${uErr.message}`);
    }

    // Link/create corresponding study material in materials table
    try {
      const { data: sub } = await supabase
        .from("subjects")
        .select("id, course_id, semester_id, semester, year")
        .eq("id", params.subject_id)
        .maybeSingle();

      const matId = crypto.randomUUID();
      await supabase.from("materials").insert({
        id: matId,
        course_id: sub?.course_id || null,
        semester_id: sub?.semester_id || null,
        subject_id: params.subject_id,
        unit_id: unitId,
        unit_number: params.unit_number || 1,
        unit_label: `Unit ${params.unit_number || 1}`,
        year: sub?.year || 1,
        semester: sub?.semester || 1,
        title: params.title.trim(),
        description: params.description?.trim() || `Study notes for ${params.title.trim()}`,
        type: "PDF Notes",
        material_type: "PDF Notes",
        price: isPaid ? 79 : 0,
        is_premium: isPaid,
        status: "Published",
        published: true,
        file_url: params.file_url || null,
        file_name: params.file_name || null,
        file_size: params.file_size ? String(params.file_size) : null,
        downloads_count: 0,
        display_order: params.unit_number || 1,
      });
    } catch (matErr) {
      console.warn("Could not create linked material record for unit:", matErr);
    }

    return {
      id: dbUnit.id,
      subject_id: dbUnit.subject_id,
      unit_number: dbUnit.unit_number,
      title: dbUnit.title,
      description: dbUnit.description || "",
      is_active: dbUnit.is_active ?? true,
      display_order: dbUnit.display_order ?? dbUnit.unit_number,
      created_at: dbUnit.created_at,
      materials_count: params.file_url ? 1 : 0,
      purchased_count: 0,
      file_url: dbUnit.file_url || null,
      file_name: dbUnit.file_name || null,
      file_size: dbUnit.file_size || null,
      is_premium: Boolean(dbUnit.is_premium),
    };
  },

  // 9. Edit Unit Title / Description / Files (Updates units and syncs linked materials)
  async updateUnit(
    id: string,
    updates: Partial<UnitItem>,
  ): Promise<{ success: boolean; error?: string }> {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.is_premium !== undefined) payload.is_premium = Boolean(updates.is_premium);
    if (updates.file_url !== undefined) payload.file_url = updates.file_url;
    if (updates.file_name !== undefined) payload.file_name = updates.file_name;
    if (updates.file_size !== undefined) payload.file_size = updates.file_size ? String(updates.file_size) : null;

    const { error } = await supabase
      .from("units")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Supabase updateUnit error:", error);
      return { success: false, error: error.message };
    }

    // Sync corresponding materials
    try {
      const matUpdates: any = {};
      if (updates.title !== undefined) matUpdates.title = updates.title.trim();
      if (updates.is_premium !== undefined) {
        matUpdates.is_premium = Boolean(updates.is_premium);
        matUpdates.price = updates.is_premium ? 79 : 0;
      }
      if (updates.file_url !== undefined) matUpdates.file_url = updates.file_url;
      if (updates.file_name !== undefined) matUpdates.file_name = updates.file_name;
      if (updates.file_size !== undefined) matUpdates.file_size = updates.file_size;

      if (Object.keys(matUpdates).length > 0) {
        await supabase
          .from("materials")
          .update(matUpdates)
          .eq("unit_id", id);
      }
    } catch (e) {
      console.warn("Could not sync material updates for unit:", e);
    }

    return { success: true };
  },

  // 10. Delete Unit (Safe)
  async deleteUnit(id: string): Promise<{ success: boolean; error?: string }> {
    // Check if material has active purchases
    const { data: mats } = await supabase.from("materials").select("id").eq("unit_id", id);
    if (mats && mats.length > 0) {
      const matIds = mats.map((m) => m.id);
      const { data: purch } = await supabase.from("purchases").select("id").in("material_id", matIds);
      if (purch && purch.length > 0) {
        return {
          success: false,
          error: `Cannot delete unit: Students have active purchases for materials in this unit (${purch.length} orders).`,
        };
      }
    }

    // Delete dependent materials
    await supabase.from("materials").delete().eq("unit_id", id);

    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Extract Google Drive File ID from standard sharing/view/preview links
  extractGoogleDriveId(url: string | null | undefined): string | null {
    if (!url || typeof url !== "string") return null;
    const clean = url.trim();
    const match1 = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1?.[1]) return match1[1];
    const match2 = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2?.[1]) return match2[1];
    const match3 = clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match3?.[1]) return match3[1];
    return null;
  },

  // Upload file to Supabase storage with fine-grained real-time progress & abort support
  async uploadStorageWithProgress(params: {
    bucket: string;
    path: string;
    file: File;
    onProgress?: ((percent: number, loaded: number, total: number) => void) | undefined;
    abortSignal?: AbortSignal | undefined;
  }): Promise<string> {
    const { bucket, path, file, onProgress, abortSignal } = params;

    if (abortSignal?.aborted) {
      throw new DOMException("Upload aborted by user", "AbortError");
    }

    onProgress?.(2, 0, file.size);

    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://tfganiacycmmnorfyqam.supabase.co";
    const supabaseKey =
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const { data: sessionData } = await supabase.auth.getSession();
    const bearerToken = sessionData?.session?.access_token || supabaseKey;

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(cleanPath)}`;

      xhr.open("POST", url, true);
      xhr.setRequestHeader("apikey", supabaseKey);
      xhr.setRequestHeader("Authorization", `Bearer ${bearerToken}`);
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
      xhr.setRequestHeader("x-upsert", "false");

      const handleAbort = () => {
        xhr.abort();
        reject(new DOMException("Upload cancelled by user", "AbortError"));
      };

      if (abortSignal) {
        abortSignal.addEventListener("abort", handleAbort, { once: true });
      }

      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
            onProgress?.(percent, e.loaded, e.total);
          }
        };
      }

      xhr.onload = () => {
        if (abortSignal) {
          abortSignal.removeEventListener("abort", handleAbort);
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100, file.size, file.size);
          resolve(path);
        } else {
          let errMsg = `Upload failed with status ${xhr.status}`;
          try {
            const res = JSON.parse(xhr.responseText);
            if (res?.message || res?.error) errMsg = res.message || res.error;
          } catch { }
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        if (abortSignal) {
          abortSignal.removeEventListener("abort", handleAbort);
        }
        reject(new Error("Network error during file upload. Check your internet connection."));
      };

      xhr.onabort = () => {
        if (abortSignal) {
          abortSignal.removeEventListener("abort", handleAbort);
        }
        reject(new DOMException("Upload cancelled by user", "AbortError"));
      };

      xhr.send(file);
    });
  },

  // 10. Add Material with PDF Upload to Supabase Storage & Database Persistence
  async addMaterial(mat: {
    course_id?: string | undefined;
    semester_id?: string | undefined;
    subject_id: string;
    unit_number: number; // 1 to 10
    year?: number | undefined;
    semester?: number | undefined;
    title: string;
    description?: string | undefined;
    material_type: string;
    price: number;
    is_premium?: boolean | undefined;
    status: "Published" | "Draft";
    file?: File | undefined;
    file_url?: string | undefined;
    file_name?: string | undefined;
    file_size?: number | string | undefined;
    drive_url?: string | undefined;
    cover_image_url?: string | undefined;
    allow_download?: boolean | undefined;
    allow_print?: boolean | undefined;
    add_watermark?: boolean | undefined;
    visible_to?: string | undefined;
    onProgress?: ((percent: number, loaded: number, total: number) => void) | undefined;
    abortSignal?: AbortSignal | undefined;
  }): Promise<MaterialItem> {
    // 1. Validation
    if (!mat.title.trim()) {
      throw new Error("Please enter a valid material title.");
    }
    if (!mat.subject_id) {
      throw new Error("Please select a subject.");
    }
    const isPaid = Number(mat.price) > 0;
    const finalPrice = isPaid ? Number(mat.price) : 0;

    // 2. Query and verify subject & derive relationships
    let derivedYear = mat.year;
    let derivedSem = mat.semester;
    let resolvedCourseId = mat.course_id;
    let resolvedSemId = mat.semester_id;

    const { data: subRec, error: subErr } = await supabase
      .from("subjects")
      .select("id, course_id, semester_id, semester, year")
      .eq("id", mat.subject_id)
      .maybeSingle();

    if (subErr || !subRec) {
      throw new Error("Selected subject not found in database.");
    }

    if (mat.course_id && subRec.course_id && mat.course_id !== subRec.course_id) {
      throw new Error("Selected subject does not belong to the selected course.");
    }
    if (mat.semester_id && subRec.semester_id && mat.semester_id !== subRec.semester_id) {
      throw new Error("Selected subject does not belong to the selected semester.");
    }

    resolvedCourseId = resolvedCourseId || subRec.course_id || undefined;
    resolvedSemId = resolvedSemId || subRec.semester_id || undefined;
    derivedSem = derivedSem || subRec.semester || 1;
    derivedYear = derivedYear || subRec.year || Math.ceil(derivedSem / 2) || 1;

    // 3. Handle PDF file upload to private 'notes' bucket
    let uploadedStoragePath: string | null = null;
    let fileName: string | null = mat.file_name || null;
    let fileSize: number | string | null = mat.file_size || null;

    if (mat.file) {
      // Validate PDF format
      const isPdf =
        mat.file.type === "application/pdf" ||
        mat.file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        throw new Error("Invalid file format. Only PDF files (.pdf) are permitted.");
      }
      // Enforce 50MB file size limit
      if (mat.file.size > 52428800) {
        throw new Error("File size exceeds the 50 MB limit.");
      }

      const cleanFileName = mat.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${resolvedCourseId || "course"}/${resolvedSemId || "sem"}/${mat.subject_id}/unit-${mat.unit_number}/${Date.now()}_${cleanFileName}`;

      try {
        await this.uploadStorageWithProgress({
          bucket: "notes",
          path: storagePath,
          file: mat.file,
          onProgress: mat.onProgress,
          abortSignal: mat.abortSignal,
        });
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          throw err;
        }
        // Fallback to standard Supabase client upload if XHR encountered network error
        const { error: upErr } = await supabase.storage
          .from("notes")
          .upload(storagePath, mat.file, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (upErr) {
          console.error("Storage upload to 'notes' failed:", upErr);
          throw new Error(`Storage upload failed: ${upErr.message}`);
        }
      }

      uploadedStoragePath = storagePath;
      fileName = mat.file.name;
      fileSize = mat.file.size;
    }

    // 4. Ensure a unit record exists for this subject and unit_number in units table
    let unitId = "";
    const { data: existingUnit } = await supabase
      .from("units")
      .select("id")
      .eq("subject_id", mat.subject_id)
      .eq("unit_number", mat.unit_number)
      .maybeSingle();

    if (existingUnit) {
      unitId = existingUnit.id;
    } else {
      const newUnitId = crypto.randomUUID();
      const { data: newUnit } = await supabase
        .from("units")
        .insert({
          id: newUnitId,
          subject_id: mat.subject_id,
          unit_number: mat.unit_number,
          title: `Unit ${mat.unit_number}`,
          description: `Topics for Unit ${mat.unit_number}`,
          is_active: true,
          display_order: mat.unit_number,
        })
        .select("id")
        .maybeSingle();

      unitId = newUnit?.id || newUnitId;
    }

    // 5. Insert material metadata into public.materials
    const matId = crypto.randomUUID();
    const payload: any = {
      id: matId,
      course_id: resolvedCourseId,
      semester_id: resolvedSemId,
      subject_id: mat.subject_id,
      unit_id: unitId,
      unit_number: mat.unit_number,
      unit_label: `Unit ${mat.unit_number}`,
      year: derivedYear,
      semester: derivedSem,
      title: mat.title.trim(),
      description: mat.description?.trim() || "",
      type: mat.material_type || "PDF Notes",
      material_type: mat.material_type || "Notes",
      price: finalPrice,
      is_premium: isPaid,
      status: mat.status || "Published",
      published: mat.status === "Published",
      file_url: uploadedStoragePath || mat.file_url || null,
      file_name: fileName,
      file_size: fileSize,
      drive_url: mat.drive_url?.trim() || null,
      downloads_count: 0,
      allow_download: mat.allow_download ?? true,
      allow_print: mat.allow_print ?? false,
      add_watermark: mat.add_watermark ?? true,
      visible_to: mat.visible_to || "all",
      cover_image_url: mat.cover_image_url || null,
      display_order: 1,
    };

    const { error: insErr } = await supabase
      .from("materials")
      .insert(payload);

    if (insErr) {
      console.error("Supabase insert material failed:", insErr);
      // Clean up newly uploaded storage file to prevent orphaned files
      if (uploadedStoragePath) {
        await supabase.storage.from("notes").remove([uploadedStoragePath]);
      }
      throw new Error(`Failed to save material to database: ${insErr.message}`);
    }

    return {
      id: matId,
      course_id: resolvedCourseId,
      semester_id: resolvedSemId,
      subject_id: mat.subject_id,
      unit_id: unitId,
      unit_number: mat.unit_number,
      unit_label: `Unit ${mat.unit_number}`,
      year: derivedYear,
      semester: derivedSem,
      title: mat.title.trim(),
      description: mat.description?.trim() || "",
      material_type: mat.material_type || "Notes",
      price: finalPrice,
      is_premium: isPaid,
      file_url: uploadedStoragePath || mat.file_url || "",
      file_name: fileName,
      file_size: fileSize,
      drive_url: mat.drive_url || "",
      cover_image_url: mat.cover_image_url || null,
      status: mat.status,
      downloads_count: 0,
      students_count: 0,
      created_at: new Date().toISOString(),
      security: {
        allow_download: mat.allow_download ?? true,
        allow_print: mat.allow_print ?? false,
        allow_screenshot: false,
        watermark_pdf: mat.add_watermark ?? true,
        online_preview_only: !(mat.allow_download ?? true),
        visible_to: (mat.visible_to as "all" | "purchased") || "all",
        publication_status: mat.status,
      },
    };
  },

  // 11. Edit Material (Supports replacing PDF file in Storage)
  async updateMaterial(
    id: string,
    updates: Partial<MaterialItem> & {
      file?: File | undefined;
      allow_download?: boolean | undefined;
      allow_print?: boolean | undefined;
      add_watermark?: boolean | undefined;
      visible_to?: string | undefined;
      onProgress?: ((percent: number, loaded: number, total: number) => void) | undefined;
      abortSignal?: AbortSignal | undefined;
    },
  ): Promise<{ success: boolean; error?: string }> {
    let newStoragePath: string | null = null;
    let oldStoragePath: string | null = null;

    try {
      // 1. If replacement file is provided, upload it first
      if (updates.file) {
        const isPdf =
          updates.file.type === "application/pdf" ||
          updates.file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          return { success: false, error: "Only PDF files are permitted." };
        }
        if (updates.file.size > 52428800) {
          return { success: false, error: "File size exceeds the 50 MB limit." };
        }

        // Fetch existing material to get old path
        const { data: existing } = await (supabase.from("materials") as any)
          .select("course_id, semester_id, subject_id, unit_number, file_url")
          .eq("id", id)
          .maybeSingle();

        oldStoragePath = existing?.file_url || null;

        const cleanName = updates.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const cId = updates.course_id || existing?.course_id || "course";
        const sId = updates.semester_id || existing?.semester_id || "sem";
        const subId = updates.subject_id || existing?.subject_id || "sub";
        const uNum = updates.unit_number || existing?.unit_number || 1;
        newStoragePath = `${cId}/${sId}/${subId}/unit-${uNum}/${Date.now()}_${cleanName}`;

        try {
          await this.uploadStorageWithProgress({
            bucket: "notes",
            path: newStoragePath,
            file: updates.file,
            onProgress: updates.onProgress,
            abortSignal: updates.abortSignal,
          });
        } catch (err) {
          if ((err as any)?.name === "AbortError") {
            throw err;
          }
          const { error: upErr } = await supabase.storage
            .from("notes")
            .upload(newStoragePath, updates.file, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (upErr) {
            return { success: false, error: `File replacement failed: ${upErr.message}` };
          }
        }

        updates.file_url = newStoragePath;
        updates.file_name = updates.file.name;
        updates.file_size = updates.file.size;
      }

      // 2. Prepare payload
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.material_type !== undefined) {
        payload.type = updates.material_type;
        payload.material_type = updates.material_type;
      }
      if (updates.price !== undefined) {
        payload.price = updates.price;
        payload.is_premium = updates.price > 0;
      }
      if (updates.status !== undefined) {
        payload.status = updates.status;
        payload.published = updates.status === "Published";
      }
      if (updates.file_url !== undefined) payload.file_url = updates.file_url;
      if (updates.file_name !== undefined) payload.file_name = updates.file_name;
      if (updates.file_size !== undefined) payload.file_size = updates.file_size;
      if (updates.drive_url !== undefined) payload.drive_url = updates.drive_url;
      if (updates.allow_download !== undefined) payload.allow_download = updates.allow_download;
      if (updates.allow_print !== undefined) payload.allow_print = updates.allow_print;
      if (updates.add_watermark !== undefined) payload.add_watermark = updates.add_watermark;
      if (updates.visible_to !== undefined) payload.visible_to = updates.visible_to;

      const { error } = await supabase
        .from("materials")
        .update(payload)
        .eq("id", id);

      if (error) {
        // Roll back newly uploaded file
        if (newStoragePath) {
          await supabase.storage.from("notes").remove([newStoragePath]);
        }
        return { success: false, error: error.message };
      }

      // 3. Remove old storage file if replaced and it was inside 'notes'
      if (newStoragePath && oldStoragePath && oldStoragePath !== newStoragePath) {
        const cleanOld = oldStoragePath.replace(/^notes\//, "");
        if (!cleanOld.startsWith("http://") && !cleanOld.startsWith("https://")) {
          await supabase.storage.from("notes").remove([cleanOld]);
        }
      }

      return { success: true };
    } catch (err: any) {
      if (newStoragePath) {
        await supabase.storage.from("notes").remove([newStoragePath]);
      }
      return { success: false, error: err?.message || "Failed to update material." };
    }
  },

  // 12. Toggle Publish / Draft
  async togglePublish(materialId: string, currentStatus: "Published" | "Draft" | "Inactive"): Promise<"Published" | "Draft"> {
    const nextStatus = currentStatus === "Published" ? "Draft" : "Published";
    const { error } = await supabase
      .from("materials")
      .update({
        status: nextStatus,
        published: nextStatus === "Published",
      })
      .eq("id", materialId);

    if (error) console.error("Supabase togglePublish error:", error);
    return nextStatus;
  },

  // 13. Delete Material (Cleans up Supabase Storage file)
  async deleteMaterial(id: string): Promise<{ success: boolean; error?: string }> {
    // Check if material has student purchases
    const { data: purch } = await supabase
      .from("purchases")
      .select("id")
      .eq("material_id", id);

    if (purch && purch.length > 0) {
      return {
        success: false,
        error: `Cannot delete: Material has ${purch.length} student purchases. Archiving or unpublishing preserves student purchase history.`,
      };
    }

    // Get file_url before delete to remove from storage
    const { data: matData } = await supabase
      .from("materials")
      .select("file_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) {
      console.error("Supabase deleteMaterial error:", error);
      return { success: false, error: error.message };
    }

    // Remove file from storage bucket 'notes'
    if (matData?.file_url) {
      const cleanPath = matData.file_url.replace(/^notes\//, "");
      if (!cleanPath.startsWith("http://") && !cleanPath.startsWith("https://")) {
        await supabase.storage.from("notes").remove([cleanPath]);
      }
    }

    return { success: true };
  },

  // 14. Secure Material Access (Signed URL & Direct Blob Access with Entitlement Verification)
  async getMaterialAccess(
    materialId: string,
    user?: { id?: string; role?: string } | null,
    entitlementOverride?: boolean,
  ): Promise<{ url?: string; storagePath?: string; error?: string }> {
    const { data: mat, error: mErr } = await supabase
      .from("materials")
      .select("*")
      .eq("id", materialId)
      .maybeSingle();

    if (mErr || !mat) {
      return { error: "Study material not found." };
    }

    const isFree = !mat.is_premium || Number(mat.price) === 0;
    const isAdmin = user?.role === "admin";

    // Entitlement Check for paid materials
    if (!isFree && !isAdmin && !entitlementOverride) {
      if (!user?.id) {
        return { error: "Please sign in to access this study material." };
      }

      // Check direct purchase
      const { data: purchase } = await supabase
        .from("purchases")
        .select("id")
        .eq("student_id", user.id)
        .eq("material_id", materialId)
        .maybeSingle();

      if (!purchase) {
        // Check package order access
        const { data: orders } = await supabase
          .from("orders")
          .select("id, status, material_ids")
          .eq("student_id", user.id)
          .ilike("status", "paid");

        const hasPackageAccess = (orders || []).some((o: any) =>
          Array.isArray(o.material_ids) && o.material_ids.includes(materialId),
        );

        if (!hasPackageAccess) {
          return { error: "Access restricted. Please purchase this study material to unlock full access." };
        }
      }
    }

    // Storage object resolution
    const storagePath = mat.file_url;
    if (storagePath) {
      if (
        !storagePath.startsWith("http://") &&
        !storagePath.startsWith("https://") &&
        !storagePath.startsWith("blob:")
      ) {
        const cleanPath = storagePath.replace(/^notes\//, "");
        const { data, error: signErr } = await supabase.storage
          .from("notes")
          .createSignedUrl(cleanPath, 3600); // 1 hour validity

        if (!signErr && data?.signedUrl) {
          return { url: data.signedUrl, storagePath: cleanPath };
        }
        return { storagePath: cleanPath };
      } else {
        return { url: storagePath };
      }
    }

    if (mat.drive_url) {
      return { url: mat.drive_url };
    }

    return { error: "No document file is attached to this study material." };
  },

  // Dependency Checking Helpers
  checkCourseDependencies(courseId: string): DependencyCheckResult {
    const cache = loadLocalCache();
    const semesters = cache.semesters.filter((s) => s.course_id === courseId);
    const subjects = cache.subjects.filter((sub) => sub.course_id === courseId || semesters.some((s) => s.id === sub.semester_id));
    const materials = cache.materials.filter((m) => m.course_id === courseId || subjects.some((sub) => sub.id === m.subject_id));
    const purchasesCount = materials.reduce((acc, m) => acc + (m.students_count || 0), 0);
    const units = cache.units.filter((u) => subjects.some((sub) => sub.id === u.subject_id));

    return {
      hasDependencies: semesters.length > 0 || subjects.length > 0 || materials.length > 0,
      semestersCount: semesters.length,
      subjectsCount: subjects.length,
      unitsCount: units.length,
      materialsCount: materials.length,
      purchasesCount,
      canHardDelete: purchasesCount === 0,
      warningMessage: purchasesCount > 0
        ? `This course contains materials purchased by ${purchasesCount} students. Hard deletion will break their library.`
        : `Deleting will remove ${semesters.length} semesters, ${subjects.length} subjects, and ${materials.length} materials.`,
    };
  },
};
