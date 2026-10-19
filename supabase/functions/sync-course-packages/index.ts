import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const { courseId, defaultSemesterPrice, courseUpdates } = body;

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: "courseId is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceNum = Number(defaultSemesterPrice);
    if (isNaN(priceNum) || priceNum < 1) {
      return new Response(
        JSON.stringify({ error: "defaultSemesterPrice must be a valid number >= 1." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();

    // 1. Update course row
    const updatePayload: Record<string, any> = {
      default_semester_price: priceNum,
      ...(courseUpdates || {}),
    };
    updatePayload.default_semester_price = priceNum;

    const { error: courseErr } = await supabase
      .from("courses")
      .update(updatePayload)
      .eq("id", courseId);

    if (courseErr) {
      return new Response(
        JSON.stringify({ error: `Failed to update course: ${courseErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Query semesters for this course
    const { data: sems, error: semErr } = await supabase
      .from("semesters")
      .select("id, semester_number, title")
      .eq("course_id", courseId);

    if (semErr) {
      return new Response(
        JSON.stringify({ error: `Course updated, but failed to fetch semesters: ${semErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updatedPackagesCount = 0;
    if (sems && sems.length > 0) {
      const semIds = sems.map((s) => String(s.id));

      // 3. Find which packages already exist for these semesters
      const { data: existingPkgs, error: findPkgErr } = await supabase
        .from("packages")
        .select("id")
        .in("id", semIds);

      if (findPkgErr) {
        return new Response(
          JSON.stringify({ error: `Failed to query existing packages: ${findPkgErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const existingIds = new Set((existingPkgs || []).map((p) => String(p.id)));

      // Update existing semester packages (preserving IDs, purchases, orders, original_price)
      if (existingIds.size > 0) {
        const { error: updatePkgErr } = await supabase
          .from("packages")
          .update({ price: priceNum })
          .in("id", Array.from(existingIds));

        if (updatePkgErr) {
          return new Response(
            JSON.stringify({ error: `Failed to sync package prices: ${updatePkgErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updatedPackagesCount += existingIds.size;
      }

      // Insert any missing packages for semesters that do not yet have a package row
      const missingSems = sems.filter((s) => !existingIds.has(String(s.id)));
      if (missingSems.length > 0) {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("name")
          .eq("id", courseId)
          .maybeSingle();
        const courseName = courseRow?.name || "Course";

        const newPkgs = missingSems.map((s) => ({
          id: String(s.id),
          title: `${courseName} - ${s.title || `Semester ${s.semester_number}`} Complete Study Pack`,
          description: `Complete study package for ${courseName} ${s.title || `Semester ${s.semester_number}`}`,
          price: priceNum,
          original_price: Math.max(799, priceNum * 2),
          semester: s.semester_number,
          type: "semester",
          is_active: true,
          material_ids: [],
          features: [],
        }));

        const { error: insertPkgErr } = await supabase
          .from("packages")
          .insert(newPkgs);

        if (insertPkgErr) {
          return new Response(
            JSON.stringify({ error: `Failed to create missing semester packages: ${insertPkgErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updatedPackagesCount += newPkgs.length;
      }

      // 4. Update semesters table price column if present
      try {
        await supabase
          .from("semesters")
          .update({ price: priceNum } as any)
          .eq("course_id", courseId);
      } catch (err) {
        console.warn("Notice updating semesters.price:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        courseId,
        defaultSemesterPrice: priceNum,
        updatedPackagesCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
