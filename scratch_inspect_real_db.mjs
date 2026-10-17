import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tfganiacycmmnorfyqam.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZ2FuaWFjeWNtbW5vcmZ5cWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjE4NzcsImV4cCI6MjEwNzI5Nzg3N30.h5AZR1rSUnStPzIYur9Iz5YawmI30Gdx5eqDL5ClpXw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probeTable(table, candidateCols) {
  const valid = [];
  for (const c of candidateCols) {
    const { error } = await supabase.from(table).select(c).limit(1);
    if (!error) {
      valid.push(c);
    }
  }
  console.log(`[${table}] valid:`, valid.join(', '));
}

async function main() {
  await probeTable('courses', ['id', 'name', 'code', 'type', 'description', 'duration_years', 'total_semesters', 'is_active', 'display_order', 'created_at']);
  await probeTable('semesters', ['id', 'course_id', 'academic_year_id', 'semester_number', 'title', 'is_active', 'created_at']);
  await probeTable('subjects', ['id', 'course_id', 'semester_id', 'semester_number', 'year', 'semester', 'name', 'code', 'description', 'is_active', 'display_order', 'created_at']);
  await probeTable('units', ['id', 'subject_id', 'unit_number', 'title', 'description', 'is_active', 'display_order', 'created_at']);
  await probeTable('materials', [
    'id', 'course_id', 'semester_id', 'subject_id', 'unit_id', 'title', 'description', 
    'type', 'material_type', 'price', 'is_premium', 'status', 'published', 'file_url', 
    'drive_url', 'thumbnail_url', 'security', 'downloads_count', 'created_at', 'updated_at'
  ]);
}

main();
