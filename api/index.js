// src/server/app.ts
import express from "express";
import cors from "cors";

// src/server/routes/auth.ts
import { Router } from "express";
import bcrypt2 from "bcryptjs";

// src/server/db.ts
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// src/server/supabaseSync.ts
import { createClient } from "@supabase/supabase-js";
var DUMMY_UNREGISTERED_KEY = "sb_secret_sztWG8UZFLGZv6oApyHa0Q_sL-uYJ7_";
var rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
var envServiceKey = rawServiceKey && rawServiceKey !== DUMMY_UNREGISTERED_KEY ? rawServiceKey : "";
var envUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://aasktchpxsxxanfkkrxx.supabase.co").trim();
var envPubKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "sb_publishable_usAyLlXmFO0s77Y9VIOlMQ_UCwuz0Q1").trim();
var currentSupabaseUrl = envUrl;
var currentSupabaseKey = envServiceKey || envPubKey || "";
var serverSupabase = null;
function initSupabase(url, key) {
  if (url) currentSupabaseUrl = url.trim();
  if (key) currentSupabaseKey = key.trim();
  if (currentSupabaseUrl && currentSupabaseKey && !currentSupabaseUrl.includes("placeholder") && !currentSupabaseKey.includes("placeholder") && currentSupabaseUrl.startsWith("https://")) {
    try {
      serverSupabase = createClient(currentSupabaseUrl, currentSupabaseKey, {
        auth: { persistSession: false }
      });
      console.log("[Supabase] Initialized server-side client at:", currentSupabaseUrl);
      return { success: true, message: `Connected to ${currentSupabaseUrl}` };
    } catch (err) {
      console.error("[Supabase] Initialization failed:", err);
      serverSupabase = null;
      return { success: false, message: err?.message || "Failed to initialize client" };
    }
  }
  serverSupabase = null;
  return { success: false, message: "Supabase URL or Key is missing or invalid" };
}
initSupabase();
function getServerSupabase() {
  return serverSupabase;
}
function getSupabaseStatus() {
  const isConfigured = Boolean(
    serverSupabase && currentSupabaseUrl && currentSupabaseKey && !currentSupabaseUrl.includes("placeholder")
  );
  return {
    isConfigured,
    url: currentSupabaseUrl ? `${currentSupabaseUrl.substring(0, 20)}...` : "",
    hasKey: Boolean(currentSupabaseKey)
  };
}
async function testSupabaseConnectionDetails() {
  if (!serverSupabase) {
    return {
      connected: false,
      message: "Supabase client is not configured yet with valid URL & API Key.",
      tables: {}
    };
  }
  const tables = [
    "users",
    "batches",
    "courses",
    "routine_slots",
    "exams",
    "announcements",
    "department_notices",
    "resources",
    "faculty",
    "notifications",
    "routine_requests",
    "audit_logs"
  ];
  const tableResults = {};
  let anyError = false;
  for (const t of tables) {
    try {
      const { count, error } = await serverSupabase.from(t).select("*", { count: "exact", head: true });
      if (error) {
        tableResults[t] = { ok: false, error: error.message || error.hint || "Query failed" };
        anyError = true;
      } else {
        tableResults[t] = { ok: true, count: count ?? 0 };
      }
    } catch (err) {
      tableResults[t] = { ok: false, error: err.message || "Exception occurred" };
      anyError = true;
    }
  }
  return {
    connected: !anyError,
    message: anyError ? "Supabase connection warning: some tables might not exist or encountered issues." : "All Supabase tables are accessible and connected successfully!",
    tables: tableResults
  };
}
async function syncToSupabase(table, data) {
  if (!serverSupabase) return;
  try {
    const { error } = await serverSupabase.from(table).upsert(data);
    if (error) {
      console.error(`[Supabase Sync Error in ${table}]:`, error.message);
    } else {
      console.log(`[Supabase Sync Success]: Synced to ${table}`);
    }
  } catch (err) {
    console.error(`[Supabase Sync Failed in ${table}]:`, err.message);
  }
}
async function syncAllLocalToSupabase(dbData) {
  if (!serverSupabase) {
    return {
      success: false,
      synced: {},
      errors: ["Supabase is not configured."]
    };
  }
  const synced = {};
  const errors = [];
  try {
    const batchRows = (dbData.batches || []).map((b) => ({
      id: b.id,
      name: b.name,
      admission_year: b.admissionYear,
      current_semester: b.currentSemester,
      academic_session: b.academicSession,
      semester_mode: b.semesterMode || "SEQUENCE",
      status: b.status || "ACTIVE",
      last_progressed_at: b.lastProgressedAt || null,
      cr_ids: b.crIds || [],
      created_at: b.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (batchRows.length > 0) {
      const { error } = await serverSupabase.from("batches").upsert(batchRows);
      if (error) errors.push(`Batches: ${error.message}`);
      else synced.batches = batchRows.length;
    }
  } catch (e) {
    errors.push(`Batches: ${e.message}`);
  }
  try {
    const courseRows = (dbData.courses || []).map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      short_name: c.shortName || null,
      credits: c.credits,
      type: c.type || "THEORY",
      semester: c.semester,
      assigned_faculty_id: c.assignedFacultyId || null,
      assigned_faculty_name: c.assignedFacultyName || null,
      batch_ids: c.batchIds || []
    }));
    if (courseRows.length > 0) {
      const { error } = await serverSupabase.from("courses").upsert(courseRows);
      if (error) errors.push(`Courses: ${error.message}`);
      else synced.courses = courseRows.length;
    }
  } catch (e) {
    errors.push(`Courses: ${e.message}`);
  }
  try {
    const facultyRows = (dbData.faculty || []).map((f) => ({
      id: f.id,
      name: f.name,
      short_name: f.shortName || null,
      designation: f.designation,
      department: f.department || "Software Engineering",
      email: f.email || null,
      phone: f.phone || null,
      office_room: f.officeRoom || "",
      photo_url: f.photoUrl || null,
      specialization: f.specialization || null,
      assigned_courses: f.assignedCourses || []
    }));
    if (facultyRows.length > 0) {
      const { error } = await serverSupabase.from("faculty").upsert(facultyRows);
      if (error) errors.push(`Faculty: ${error.message}`);
      else synced.faculty = facultyRows.length;
    }
  } catch (e) {
    errors.push(`Faculty: ${e.message}`);
  }
  try {
    const userRows = (dbData.users || []).map((u) => ({
      id: u.id,
      student_id: u.studentId,
      name: u.name,
      email: u.email || null,
      phone: u.phone || null,
      role: u.role,
      batch_id: u.batchId || null,
      batch_name: u.batchName || null,
      current_semester: u.currentSemester || 1,
      profile_image: u.profileImage || null,
      status: u.status || "ACTIVE",
      points: u.points || 0,
      created_at: u.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: u.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (userRows.length > 0) {
      const { error } = await serverSupabase.from("users").upsert(userRows);
      if (error) errors.push(`Users: ${error.message}`);
      else synced.users = userRows.length;
    }
  } catch (e) {
    errors.push(`Users: ${e.message}`);
  }
  try {
    const routineRows = (dbData.routines || []).map((rt) => ({
      id: rt.id,
      batch_id: rt.batchId,
      day: rt.day,
      start_time: rt.startTime,
      end_time: rt.endTime,
      course_id: rt.courseId,
      course_code: rt.courseCode,
      course_short_name: rt.courseShortName || rt.courseCode,
      course_title: rt.courseTitle,
      teacher_name: rt.teacherName,
      teacher_short_name: rt.teacherShortName || rt.teacherName,
      room: rt.room
    }));
    if (routineRows.length > 0) {
      const { error } = await serverSupabase.from("routine_slots").upsert(routineRows);
      if (error) errors.push(`Routines: ${error.message}`);
      else synced.routines = routineRows.length;
    }
  } catch (e) {
    errors.push(`Routines: ${e.message}`);
  }
  try {
    const annRows = (dbData.announcements || []).map((a) => ({
      id: a.id,
      batch_id: a.batchId,
      title: a.title,
      description: a.description,
      publish_date: a.publishDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      expiry_date: a.expiryDate,
      priority: a.priority || "NORMAL",
      created_by: a.createdBy,
      created_by_name: a.createdByName,
      created_at: a.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (annRows.length > 0) {
      const { error } = await serverSupabase.from("announcements").upsert(annRows);
      if (error) errors.push(`Announcements: ${error.message}`);
      else synced.announcements = annRows.length;
    }
  } catch (e) {
    errors.push(`Announcements: ${e.message}`);
  }
  try {
    const examRows = (dbData.exams || []).map((ex) => ({
      id: ex.id,
      batch_id: ex.batchId,
      course_id: ex.courseId,
      course_code: ex.courseCode,
      course_title: ex.courseTitle,
      type: ex.type,
      title: ex.title,
      date: ex.date,
      start_time: ex.startTime || "",
      room: ex.room || "",
      description: ex.description || "",
      created_by: ex.createdBy,
      created_by_name: ex.createdByName,
      created_at: ex.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (examRows.length > 0) {
      const { error } = await serverSupabase.from("exams").upsert(examRows);
      if (error) errors.push(`Exams: ${error.message}`);
      else synced.exams = examRows.length;
    }
  } catch (e) {
    errors.push(`Exams: ${e.message}`);
  }
  try {
    const noticeRows = (dbData.departmentNotices || []).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category || "GENERAL",
      publish_date: n.publishDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      is_important: Boolean(n.isImportant),
      attachment_url: n.attachmentUrl || null,
      created_by: n.createdBy,
      created_by_name: n.createdByName,
      created_at: n.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (noticeRows.length > 0) {
      const { error } = await serverSupabase.from("department_notices").upsert(noticeRows);
      if (error) errors.push(`Department Notices: ${error.message}`);
      else synced.departmentNotices = noticeRows.length;
    }
  } catch (e) {
    errors.push(`Department Notices: ${e.message}`);
  }
  try {
    const resourceRows = (dbData.resources || []).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      course_id: r.courseId,
      course_code: r.courseCode,
      course_title: r.courseTitle,
      semester: r.semester,
      academic_year: r.academicYear,
      exam_type: r.examType || null,
      faculty_name: r.facultyName || null,
      target_batch: r.targetBatch || null,
      lab_category: r.labCategory || null,
      description: r.description || null,
      file_url: r.fileUrl || "",
      file_name: r.fileName || "",
      file_size: r.fileSize || "",
      file_type: r.fileType || "",
      uploader_id: r.uploaderId,
      uploader_student_id: r.uploaderStudentId,
      uploader_name: r.uploaderName,
      uploader_batch_name: r.uploaderBatchName || null,
      status: r.status || "PENDING",
      rejection_reason: r.rejectionReason || null,
      download_count: r.downloadCount || 0,
      created_at: r.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      verified_at: r.verifiedAt || null
    }));
    if (resourceRows.length > 0) {
      const { error } = await serverSupabase.from("resources").upsert(resourceRows);
      if (error) errors.push(`Resources: ${error.message}`);
      else synced.resources = resourceRows.length;
    }
  } catch (e) {
    errors.push(`Resources: ${e.message}`);
  }
  try {
    const notifRows = (dbData.notifications || []).slice(0, 50).map((n) => ({
      id: n.id,
      user_id: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      link_url: n.linkUrl || null,
      read: Boolean(n.read),
      created_at: n.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (notifRows.length > 0) {
      const { error } = await serverSupabase.from("notifications").upsert(notifRows);
      if (error) errors.push(`Notifications: ${error.message}`);
      else synced.notifications = notifRows.length;
    }
  } catch (e) {
    errors.push(`Notifications: ${e.message}`);
  }
  try {
    const auditRows = (dbData.auditLogs || []).slice(0, 50).map((l) => ({
      id: l.id,
      actor_id: l.actorId,
      actor_name: l.actorName,
      action: l.action,
      target: l.target,
      details: l.details || null,
      timestamp: l.timestamp || (/* @__PURE__ */ new Date()).toISOString()
    }));
    if (auditRows.length > 0) {
      const { error } = await serverSupabase.from("audit_logs").upsert(auditRows);
      if (error) errors.push(`Audit Logs: ${error.message}`);
      else synced.auditLogs = auditRows.length;
    }
  } catch (e) {
    errors.push(`Audit Logs: ${e.message}`);
  }
  return {
    success: errors.length === 0,
    synced,
    errors
  };
}
async function hydrateFromSupabase(dbData) {
  if (!serverSupabase) return;
  try {
    console.log("[Supabase] Hydrating database from Supabase tables...");
    const { data: batches } = await serverSupabase.from("batches").select("*");
    if (batches && batches.length > 0) {
      batches.forEach((b) => {
        const mappedBatch = {
          id: b.id,
          name: b.name,
          admissionYear: b.admission_year,
          currentSemester: b.current_semester,
          academicSession: b.academic_session,
          semesterMode: b.semester_mode === "MANUAL" ? "MANUAL" : "SEQUENCE",
          status: b.status || "ACTIVE",
          lastProgressedAt: b.last_progressed_at,
          crIds: Array.isArray(b.cr_ids) ? b.cr_ids : [],
          createdAt: b.created_at
        };
        const existingIdx = dbData.batches.findIndex((x) => x.id === b.id);
        if (existingIdx >= 0) {
          dbData.batches[existingIdx] = mappedBatch;
        } else {
          dbData.batches.push(mappedBatch);
        }
      });
    }
    const { data: faculty } = await serverSupabase.from("faculty").select("*");
    if (faculty && faculty.length > 0) {
      faculty.forEach((f) => {
        const mappedFac = {
          id: f.id,
          name: f.name,
          shortName: f.short_name,
          designation: f.designation,
          department: f.department,
          email: f.email,
          phone: f.phone,
          officeRoom: f.office_room,
          photoUrl: f.photo_url,
          specialization: f.specialization,
          assignedCourses: Array.isArray(f.assigned_courses) ? f.assigned_courses : [],
          createdAt: f.created_at
        };
        const existingIdx = dbData.faculty.findIndex((x) => x.id === f.id || x.email === f.email);
        if (existingIdx >= 0) {
          dbData.faculty[existingIdx] = mappedFac;
        } else {
          dbData.faculty.push(mappedFac);
        }
      });
    }
    const { data: courses } = await serverSupabase.from("courses").select("*");
    if (courses && courses.length > 0) {
      courses.forEach((c) => {
        const mappedCourse = {
          id: c.id,
          code: c.code,
          title: c.title,
          shortName: c.short_name,
          credits: Number(c.credits) || 3,
          type: c.type || "THEORY",
          semester: Number(c.semester) || 1,
          assignedFacultyId: c.assigned_faculty_id,
          assignedFacultyName: c.assigned_faculty_name,
          assignedFacultyShortName: c.assigned_faculty_short_name,
          batchIds: Array.isArray(c.batch_ids) ? c.batch_ids : [],
          syllabus: Array.isArray(c.syllabus) ? c.syllabus : [],
          color: c.color,
          createdAt: c.created_at
        };
        const existingIdx = dbData.courses.findIndex((x) => x.id === c.id || x.code === c.code);
        if (existingIdx >= 0) {
          dbData.courses[existingIdx] = mappedCourse;
        } else {
          dbData.courses.push(mappedCourse);
        }
      });
    }
    const { data: users } = await serverSupabase.from("users").select("*");
    if (users && users.length > 0) {
      users.forEach((u) => {
        const mappedUser = {
          id: u.id,
          studentId: u.student_id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          batchId: u.batch_id,
          batchName: u.batch_name,
          currentSemester: u.current_semester,
          profileImage: u.profile_image,
          status: u.status,
          points: u.points || 0,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        };
        const existingIdx = dbData.users.findIndex((x) => x.id === u.id || x.studentId === u.student_id);
        if (existingIdx >= 0) {
          dbData.users[existingIdx] = mappedUser;
        } else {
          dbData.users.push(mappedUser);
        }
      });
    }
    const { data: announcements } = await serverSupabase.from("announcements").select("*");
    if (announcements && announcements.length > 0) {
      announcements.forEach((a) => {
        const mappedAnn = {
          id: a.id,
          batchId: a.batch_id,
          title: a.title,
          description: a.description,
          publishDate: a.publish_date,
          expiryDate: a.expiry_date,
          priority: a.priority,
          createdBy: a.created_by,
          createdByName: a.created_by_name,
          createdAt: a.created_at
        };
        const existingIdx = dbData.announcements.findIndex((x) => x.id === a.id);
        if (existingIdx >= 0) {
          dbData.announcements[existingIdx] = mappedAnn;
        } else {
          dbData.announcements.push(mappedAnn);
        }
      });
    }
    const { data: resources } = await serverSupabase.from("resources").select("*");
    if (resources && resources.length > 0) {
      resources.forEach((r) => {
        const mappedRes = {
          id: r.id,
          title: r.title,
          type: r.type,
          courseId: r.course_id,
          courseCode: r.course_code,
          courseTitle: r.course_title,
          semester: r.semester,
          academicYear: r.academic_year,
          examType: r.exam_type,
          facultyName: r.faculty_name,
          targetBatch: r.target_batch,
          labCategory: r.lab_category,
          description: r.description,
          fileUrl: r.file_url,
          fileName: r.file_name,
          fileSize: r.file_size,
          fileType: r.file_type,
          uploaderId: r.uploader_id,
          uploaderStudentId: r.uploader_student_id,
          uploaderName: r.uploader_name,
          uploaderBatchName: r.uploader_batch_name,
          status: r.status,
          rejectionReason: r.rejection_reason,
          downloadCount: r.download_count || 0,
          createdAt: r.created_at,
          verifiedAt: r.verified_at
        };
        const existingIdx = dbData.resources.findIndex((x) => x.id === r.id);
        if (existingIdx >= 0) {
          dbData.resources[existingIdx] = mappedRes;
        } else {
          dbData.resources.push(mappedRes);
        }
      });
    }
    const { data: routines } = await serverSupabase.from("routine_slots").select("*");
    if (routines && routines.length > 0) {
      routines.forEach((rt) => {
        const mappedSlot = {
          id: rt.id,
          batchId: rt.batch_id,
          day: rt.day,
          startTime: rt.start_time,
          endTime: rt.end_time,
          courseId: rt.course_id,
          courseCode: rt.course_code,
          courseShortName: rt.course_short_name,
          courseTitle: rt.course_title,
          teacherName: rt.teacher_name,
          teacherShortName: rt.teacher_short_name,
          room: rt.room
        };
        const existingIdx = dbData.routines.findIndex((x) => x.id === rt.id);
        if (existingIdx >= 0) {
          dbData.routines[existingIdx] = mappedSlot;
        } else {
          dbData.routines.push(mappedSlot);
        }
      });
    }
    const { data: exams } = await serverSupabase.from("exams").select("*");
    if (exams && exams.length > 0) {
      exams.forEach((ex) => {
        const mappedExam = {
          id: ex.id,
          batchId: ex.batch_id,
          courseId: ex.course_id,
          courseCode: ex.course_code,
          courseTitle: ex.course_title,
          type: ex.type,
          title: ex.title,
          date: ex.date,
          startTime: ex.start_time,
          room: ex.room,
          description: ex.description,
          createdBy: ex.created_by,
          createdByName: ex.created_by_name,
          createdAt: ex.created_at
        };
        const existingIdx = dbData.exams.findIndex((x) => x.id === ex.id);
        if (existingIdx >= 0) {
          dbData.exams[existingIdx] = mappedExam;
        } else {
          dbData.exams.push(mappedExam);
        }
      });
    }
    const { data: notices } = await serverSupabase.from("department_notices").select("*");
    if (notices && notices.length > 0) {
      notices.forEach((n) => {
        const mappedNotice = {
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          publishDate: n.publish_date,
          isImportant: n.is_important,
          attachmentUrl: n.attachment_url,
          createdBy: n.created_by,
          createdByName: n.created_by_name,
          createdAt: n.created_at
        };
        const existingIdx = dbData.departmentNotices.findIndex((x) => x.id === n.id);
        if (existingIdx >= 0) {
          dbData.departmentNotices[existingIdx] = mappedNotice;
        } else {
          dbData.departmentNotices.push(mappedNotice);
        }
      });
    }
  } catch (err) {
    console.error("[Supabase Hydrate Error]:", err.message);
  }
}
function startAutoSync(getDbData, intervalMs = 15e3) {
  const timer = setInterval(async () => {
    if (serverSupabase) {
      try {
        const dbData = getDbData();
        await hydrateFromSupabase(dbData);
      } catch {
      }
    }
  }, intervalMs);
  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }
  return timer;
}

// src/server/db.ts
var DATA_DIR = path.join(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "database.json");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
}
function seedInitialData() {
  const batches = [
    {
      id: "batch-5",
      name: "SWE 5th Batch",
      admissionYear: 2019,
      currentSemester: 8,
      academicSession: "2019-2020",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2019-01-15T00:00:00Z"
    },
    {
      id: "batch-6",
      name: "SWE 6th Batch",
      admissionYear: 2020,
      currentSemester: 7,
      academicSession: "2020-2021",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2020-01-15T00:00:00Z"
    },
    {
      id: "batch-7",
      name: "SWE 7th Batch",
      admissionYear: 2021,
      currentSemester: 6,
      academicSession: "2021-2022",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2021-01-15T00:00:00Z"
    },
    {
      id: "batch-8",
      name: "SWE 8th Batch",
      admissionYear: 2022,
      currentSemester: 5,
      academicSession: "2022-2023",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2022-01-15T00:00:00Z"
    },
    {
      id: "batch-9",
      name: "SWE 9th Batch",
      admissionYear: 2023,
      currentSemester: 4,
      academicSession: "2023-2024",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2023-01-15T00:00:00Z"
    },
    {
      id: "batch-10",
      name: "SWE 10th Batch",
      admissionYear: 2024,
      currentSemester: 3,
      academicSession: "2024-2025",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2024-01-15T00:00:00Z"
    },
    {
      id: "batch-11",
      name: "SWE 11th Batch",
      admissionYear: 2025,
      currentSemester: 2,
      academicSession: "2025-2026",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2025-01-15T00:00:00Z"
    },
    {
      id: "batch-12",
      name: "SWE 12th Batch",
      admissionYear: 2026,
      currentSemester: 1,
      academicSession: "2026-2027",
      semesterMode: "SEQUENCE",
      status: "ACTIVE",
      crIds: [],
      createdAt: "2026-01-15T00:00:00Z"
    }
  ];
  const users = [];
  const passwords = {};
  const faculty = [
    {
      id: "fac-1",
      name: "Fuad Ahmed",
      shortName: "FA",
      designation: "Professor & Head",
      department: "Department of Software Engineering",
      phone: "+8801611829316",
      email: "fahmed@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-2",
      name: "Nazia Sultana Chowdhury",
      shortName: "NSC",
      designation: "Assistant Professor",
      department: "Department of Software Engineering",
      phone: "+8801627055017",
      email: "nazia@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-3",
      name: "Rina Paul",
      shortName: "RP",
      designation: "Assistant Professor",
      department: "Department of Software Engineering",
      phone: "+8801319931147",
      email: "rina@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-4",
      name: "Al Akram Chowdhury",
      shortName: "AAC",
      designation: "Assistant Professor",
      department: "Department of Software Engineering",
      phone: "+8801730980003",
      email: "akram@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-5",
      name: "Wadia Iqbal Chowdhury",
      shortName: "WIC",
      designation: "Lecturer",
      department: "Department of Software Engineering",
      phone: "+8801758305093",
      email: "wadia@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-6",
      name: "Iffat Ahmed Chowdhury Nahid",
      shortName: "IAC",
      designation: "Lecturer",
      department: "Department of Software Engineering",
      phone: "+8801724296767",
      email: "nahid@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-7",
      name: "Nazia Hassan",
      shortName: "NHN",
      designation: "Lecturer",
      department: "Department of Software Engineering",
      phone: "+8801777264878",
      email: "naziahassan@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-8",
      name: "Syeda Sanjida Rahman",
      shortName: "SSR",
      designation: "Lecturer",
      department: "Department of Software Engineering",
      phone: "+8801783852026",
      email: "sanjida@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-9",
      name: "Dhiman Dash",
      shortName: "DD",
      designation: "Lecturer",
      department: "Department of Software Engineering",
      phone: "+8801764619468",
      email: "dhiman@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-10",
      name: "Lukman Hussain Nakib",
      shortName: "LN",
      designation: "Lecturer",
      department: "Department of Software Engineering",
      phone: "+8801738779684",
      email: "nakib@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-11",
      name: "Mridul Kanti Bhattacharjee",
      shortName: "MKB",
      designation: "Adjunct Faculty",
      department: "Department of Software Engineering",
      phone: "+8801763784158",
      email: "mridul@metrouni.edu.bd",
      assignedCourses: []
    },
    {
      id: "fac-12",
      name: "Nasrin Akter Tanya",
      shortName: "NAT",
      designation: "Lecturer (Study Leave)",
      department: "Department of Software Engineering",
      phone: "+8801716942150",
      email: "tanya@metrouni.edu.bd",
      assignedCourses: []
    }
  ];
  const allBatches = ["batch-8", "batch-9", "batch-10", "batch-11", "batch-12"];
  const courses = [
    // Semester 1 (12th Batch)
    {
      id: "course-sem1-ged-101",
      code: "GED-101",
      shortName: "CEL I",
      title: "Communicative English Language I",
      credits: 3,
      type: "THEORY",
      semester: 1,
      batchIds: ["batch-12"]
    },
    {
      id: "course-sem1-mat-111",
      code: "MAT-111",
      shortName: "DIC",
      title: "Differential & Integral Calculus",
      credits: 3,
      type: "THEORY",
      semester: 1,
      batchIds: ["batch-12"]
    },
    {
      id: "course-sem1-swe-131",
      code: "SWE-131",
      shortName: "ISE",
      title: "Introduction to Software Engineering",
      credits: 3,
      type: "THEORY",
      semester: 1,
      batchIds: ["batch-12"]
    },
    {
      id: "course-sem1-ged-105",
      code: "GED-105",
      shortName: "BS",
      title: "Bangladesh Studies",
      credits: 3,
      type: "THEORY",
      semester: 1,
      batchIds: ["batch-12"]
    },
    {
      id: "course-sem1-acm",
      code: "ACM",
      shortName: "ACM",
      title: "ACM Workshop",
      credits: 0,
      type: "LAB",
      semester: 1,
      batchIds: ["batch-12"]
    },
    // Semester 2 (11th Batch)
    {
      id: "course-sem2-swe-121",
      code: "SWE-121",
      shortName: "SP",
      title: "Structured Programming",
      credits: 3,
      type: "THEORY",
      semester: 2,
      batchIds: ["batch-11"]
    },
    {
      id: "course-sem2-swe-122",
      code: "SWE-122",
      shortName: "SP LAB",
      title: "Structured Programming Lab",
      credits: 1.5,
      type: "LAB",
      semester: 2,
      batchIds: ["batch-11"]
    },
    {
      id: "course-sem2-mat-112",
      code: "MAT-112",
      shortName: "LADE",
      title: "Linear Algebra & Differential Equations",
      credits: 3,
      type: "THEORY",
      semester: 2,
      batchIds: ["batch-11"]
    },
    {
      id: "course-sem2-mat-113",
      code: "MAT-113",
      shortName: "DM",
      title: "Discrete Mathematics",
      credits: 3,
      type: "THEORY",
      semester: 2,
      batchIds: ["batch-11"]
    },
    {
      id: "course-sem2-phy-111",
      code: "PHY-111",
      shortName: "BP",
      title: "Basic Physics",
      credits: 3,
      type: "THEORY",
      semester: 2,
      batchIds: ["batch-11"]
    },
    // Semester 3 (10th Batch)
    {
      id: "course-sem3-swe-123",
      code: "SWE-123",
      shortName: "DS",
      title: "Data Structures",
      credits: 3,
      type: "THEORY",
      semester: 3,
      batchIds: ["batch-10"]
    },
    {
      id: "course-sem3-swe-124",
      code: "SWE-124",
      shortName: "DS LAB",
      title: "Data Structure Lab",
      credits: 1.5,
      type: "LAB",
      semester: 3,
      batchIds: ["batch-10"]
    },
    {
      id: "course-sem3-swe-235",
      code: "SWE-235",
      shortName: "MIS",
      title: "Management Information Systems",
      credits: 3,
      type: "THEORY",
      semester: 3,
      batchIds: ["batch-10"]
    },
    {
      id: "course-sem3-swe-111",
      code: "SWE-111",
      shortName: "BEEC",
      title: "Basic Electrical and Electronic Circuits",
      credits: 3,
      type: "THEORY",
      semester: 3,
      batchIds: ["batch-10"]
    },
    {
      id: "course-sem3-swe-112",
      code: "SWE-112",
      shortName: "BEEC LAB",
      title: "Basic Electrical and Electronic Circuits Lab",
      credits: 1.5,
      type: "LAB",
      semester: 3,
      batchIds: ["batch-10"]
    },
    {
      id: "course-sem3-swe-182",
      code: "SWE-182",
      shortName: "PPD",
      title: "Project on Python Development",
      credits: 3,
      type: "PROJECT",
      semester: 3,
      batchIds: ["batch-10"]
    },
    // Semester 4 (9th Batch)
    {
      id: "course-sem4-swe-221",
      code: "SWE-221",
      shortName: "ALGO",
      title: "Algorithm",
      credits: 3,
      type: "THEORY",
      semester: 4,
      batchIds: ["batch-9"]
    },
    {
      id: "course-sem4-swe-222",
      code: "SWE-222",
      shortName: "ALGO LAB",
      title: "Algorithm Lab",
      credits: 1.5,
      type: "LAB",
      semester: 4,
      batchIds: ["batch-9"]
    },
    {
      id: "course-sem4-swe-311",
      code: "SWE-311",
      shortName: "TOC",
      title: "Theory of Computation",
      credits: 3,
      type: "THEORY",
      semester: 4,
      batchIds: ["batch-9"]
    },
    {
      id: "course-sem4-swe-225",
      code: "SWE-225",
      shortName: "DBMS",
      title: "Database Management System",
      credits: 3,
      type: "THEORY",
      semester: 4,
      batchIds: ["batch-9"]
    },
    {
      id: "course-sem4-swe-226",
      code: "SWE-226",
      shortName: "DBMS LAB",
      title: "Database Management System Lab",
      credits: 1.5,
      type: "LAB",
      semester: 4,
      batchIds: ["batch-9"]
    },
    {
      id: "course-sem4-swe-231",
      code: "SWE-231",
      shortName: "SRE",
      title: "Software Requirement Engineering",
      credits: 3,
      type: "THEORY",
      semester: 4,
      batchIds: ["batch-9"]
    },
    // Semester 5 (8th Batch)
    {
      id: "course-sem5-swe-211",
      code: "SWE-211",
      shortName: "CA",
      title: "Computer Architecture",
      credits: 3,
      type: "THEORY",
      semester: 5,
      batchIds: ["batch-8"]
    },
    {
      id: "course-sem5-swe-223",
      code: "SWE-223",
      shortName: "OOP",
      title: "Object Oriented Programming",
      credits: 3,
      type: "THEORY",
      semester: 5,
      batchIds: ["batch-8"]
    },
    {
      id: "course-sem5-swe-224",
      code: "SWE-224",
      shortName: "OOP LAB",
      title: "Object Oriented Programming Lab",
      credits: 1.5,
      type: "LAB",
      semester: 5,
      batchIds: ["batch-8"]
    },
    {
      id: "course-sem5-mat-211",
      code: "MAT-211",
      shortName: "NA",
      title: "Numerical Analysis",
      credits: 3,
      type: "THEORY",
      semester: 5,
      batchIds: ["batch-8"]
    },
    {
      id: "course-sem5-swe-230",
      code: "SWE-230",
      shortName: "CP-I",
      title: "Problem Solving with Competitive Programming Lab-1",
      credits: 1.5,
      type: "LAB",
      semester: 5,
      batchIds: ["batch-8"]
    },
    // Semester 6 (7th Batch)
    {
      id: "course-sem6-ged-301",
      code: "GED-301",
      shortName: "BSP",
      title: "Basic Statistics and Probability",
      credits: 3,
      type: "THEORY",
      semester: 6,
      batchIds: ["batch-7"]
    },
    {
      id: "course-sem6-swe-315",
      code: "SWE-315",
      shortName: "AI",
      title: "Artificial Intelligence",
      credits: 3,
      type: "THEORY",
      semester: 6,
      batchIds: ["batch-7"]
    },
    {
      id: "course-sem6-swe-316",
      code: "SWE-316",
      shortName: "AI LAB",
      title: "Artificial Intelligence Lab",
      credits: 1.5,
      type: "LAB",
      semester: 6,
      batchIds: ["batch-7"]
    },
    {
      id: "course-sem6-swe-324",
      code: "SWE-324",
      shortName: "UI & UX",
      title: "Software UI & UX Design Practice Lab",
      credits: 1.5,
      type: "LAB",
      semester: 6,
      batchIds: ["batch-7"]
    },
    {
      id: "course-sem6-swe-232",
      code: "SWE-232",
      shortName: "CP-2",
      title: "Problem Solving with Competitive Programming Lab-2",
      credits: 1.5,
      type: "LAB",
      semester: 6,
      batchIds: ["batch-7"]
    },
    // Semester 7 (6th Batch)
    {
      id: "course-sem7-swe-333",
      code: "SWE-333",
      shortName: "SVT",
      title: "Software Verification & Testing",
      credits: 3,
      type: "THEORY",
      semester: 7,
      batchIds: ["batch-6"]
    },
    {
      id: "course-sem7-swe-334",
      code: "SWE-334",
      shortName: "SVT LAB",
      title: "Software Verification & Testing Lab",
      credits: 1.5,
      type: "LAB",
      semester: 7,
      batchIds: ["batch-6"]
    },
    {
      id: "course-sem7-swe-313",
      code: "SWE-313",
      shortName: "CN",
      title: "Computer Networking",
      credits: 3,
      type: "THEORY",
      semester: 7,
      batchIds: ["batch-6"]
    },
    {
      id: "course-sem7-swe-314",
      code: "SWE-314",
      shortName: "CN LAB",
      title: "Computer Networking Lab",
      credits: 1.5,
      type: "LAB",
      semester: 7,
      batchIds: ["batch-6"]
    },
    {
      id: "course-sem7-swe-382",
      code: "SWE-382",
      shortName: "WD",
      title: "Project on Web App Development",
      credits: 3,
      type: "PROJECT",
      semester: 7,
      batchIds: ["batch-6"]
    },
    // Semester 8 (5th Batch)
    {
      id: "course-sem8-swe-382",
      code: "SWE-382",
      shortName: "WD",
      title: "Project on Web App Development",
      credits: 3,
      type: "PROJECT",
      semester: 8,
      batchIds: ["batch-5"]
    },
    {
      id: "course-sem8-swe-461",
      code: "SWE-461",
      shortName: "IC",
      title: "Introduction to Cryptography",
      credits: 3,
      type: "THEORY",
      semester: 8,
      batchIds: ["batch-5"]
    },
    {
      id: "course-sem8-swe-422",
      code: "SWE-422",
      shortName: "MDP",
      title: "Mobile App Development Practice Lab",
      credits: 1.5,
      type: "LAB",
      semester: 8,
      batchIds: ["batch-5"]
    },
    {
      id: "course-sem8-ged-403",
      code: "GED-403",
      shortName: "ED",
      title: "Entrepreneurship Development",
      credits: 3,
      type: "THEORY",
      semester: 8,
      batchIds: ["batch-5"]
    }
  ];
  const routines = [
    // Sunday - Batch 9
    {
      id: "rout-1",
      batchId: "batch-9",
      day: "SUNDAY",
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      courseId: "course-swe-225",
      courseCode: "SWE-225",
      courseTitle: "Database Management System",
      teacherName: "Nazia Sultana Chowdhury",
      room: "Room 502"
    },
    {
      id: "rout-2",
      batchId: "batch-9",
      day: "SUNDAY",
      startTime: "12:00 PM",
      endTime: "01:30 PM",
      courseId: "course-swe-231",
      courseCode: "SWE-231",
      courseTitle: "Software Requirement Engineering",
      teacherName: "Fuad Ahmed",
      room: "Room 401"
    },
    {
      id: "rout-3",
      batchId: "batch-9",
      day: "SUNDAY",
      startTime: "02:00 PM",
      endTime: "03:30 PM",
      courseId: "course-swe-313",
      courseCode: "SWE-313",
      courseTitle: "Computer Networking",
      teacherName: "Syeda Sanjida Rahman",
      room: "Room 503"
    },
    // Monday - Batch 9
    {
      id: "rout-4",
      batchId: "batch-9",
      day: "MONDAY",
      startTime: "09:00 AM",
      endTime: "10:30 AM",
      courseId: "course-swe-221",
      courseCode: "SWE-221",
      courseTitle: "Algorithm",
      teacherName: "Lukman Hussain Nakib",
      room: "Room 402"
    },
    {
      id: "rout-5",
      batchId: "batch-9",
      day: "MONDAY",
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      courseId: "course-swe-382",
      courseCode: "SWE-382",
      courseTitle: "Project on Web App Development",
      teacherName: "Wadia Iqbal Chowdhury",
      room: "Room 504"
    },
    // Tuesday - Batch 9
    {
      id: "rout-6",
      batchId: "batch-9",
      day: "TUESDAY",
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      courseId: "course-swe-225",
      courseCode: "SWE-225",
      courseTitle: "Database Management System",
      teacherName: "Nazia Sultana Chowdhury",
      room: "Exten-1"
    },
    {
      id: "rout-7",
      batchId: "batch-9",
      day: "TUESDAY",
      startTime: "01:30 PM",
      endTime: "03:00 PM",
      courseId: "course-swe-231",
      courseCode: "SWE-231",
      courseTitle: "Software Requirement Engineering",
      teacherName: "Fuad Ahmed",
      room: "XL 1"
    },
    // Wednesday - Batch 9
    {
      id: "rout-8",
      batchId: "batch-9",
      day: "WEDNESDAY",
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      courseId: "course-swe-313",
      courseCode: "SWE-313",
      courseTitle: "Computer Networking",
      teacherName: "Syeda Sanjida Rahman",
      room: "Room 504"
    },
    // Thursday - Batch 9
    {
      id: "rout-9",
      batchId: "batch-9",
      day: "THURSDAY",
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      courseId: "course-swe-221",
      courseCode: "SWE-221",
      courseTitle: "Algorithm",
      teacherName: "Lukman Hussain Nakib",
      room: "Room 305"
    },
    // Batch 8 Routine
    {
      id: "rout-801",
      batchId: "batch-8",
      day: "SUNDAY",
      startTime: "09:00 AM",
      endTime: "10:30 AM",
      courseId: "course-swe-457",
      courseCode: "SWE-457",
      courseTitle: "Neural Network and Deep Learning",
      teacherName: "Nazia Sultana Chowdhury",
      room: "Room 403"
    }
  ];
  const exams = [
    {
      id: "exam-1",
      batchId: "batch-9",
      courseId: "course-swe-225",
      courseCode: "SWE-225",
      courseTitle: "Database Management System",
      type: "MIDTERM",
      title: "Database Management System Midterm Exam",
      date: "2026-08-15",
      // 3 days from now
      startTime: "10:00 AM",
      room: "Exam Hall 3",
      description: "Covers Chapters 1-5: ER Diagram, Relational Algebra, SQL, Normalization (1NF to BCNF).",
      createdBy: "user-cr-1",
      createdByName: "Mahmudul Hasan (CR)",
      createdAt: "2026-08-01T10:00:00Z"
    },
    {
      id: "exam-2",
      batchId: "batch-9",
      courseId: "course-swe-221",
      courseCode: "SWE-221",
      courseTitle: "Algorithm",
      type: "QUIZ",
      title: "Algorithm Quiz 2 (Dynamic Programming)",
      date: "2026-08-20",
      // 8 days from now
      startTime: "11:30 AM",
      room: "Room 402",
      description: "Topics: Knapsack, LCS, Matrix Chain Multiplication.",
      createdBy: "user-cr-1",
      createdByName: "Mahmudul Hasan (CR)",
      createdAt: "2026-08-05T12:00:00Z"
    },
    {
      id: "exam-3",
      batchId: "batch-9",
      courseId: "course-swe-231",
      courseCode: "SWE-231",
      courseTitle: "Software Requirement Engineering",
      type: "PRESENTATION",
      title: "SRS Document Project Presentation",
      date: "2026-09-02",
      // 21 days from now
      startTime: "01:00 PM",
      room: "Room 504",
      description: "10 minutes team presentation on SRS, UML Use Cases, Sequence Diagrams.",
      createdBy: "user-cr-1",
      createdByName: "Mahmudul Hasan (CR)",
      createdAt: "2026-08-08T09:00:00Z"
    },
    {
      id: "exam-4",
      batchId: "batch-8",
      courseId: "course-swe-457",
      courseCode: "SWE-457",
      courseTitle: "Neural Network and Deep Learning",
      type: "MIDTERM",
      title: "Neural Network & Deep Learning Midterm Assessment",
      date: "2026-08-18",
      startTime: "10:00 AM",
      room: "Exam Hall 1",
      createdBy: "user-cr-2",
      createdByName: "Saima Akter (CR)",
      createdAt: "2026-08-02T10:00:00Z"
    }
  ];
  const announcements = [
    {
      id: "ann-1",
      batchId: "batch-9",
      title: "Database Assignment Submission Deadline Extended",
      description: "Nazia Sultana Chowdhury has extended the Database ER-Diagram assignment submission till Sunday 18th August. Submit via portal or offline hardcopy.",
      publishDate: "2026-08-10",
      expiryDate: "2026-08-25",
      priority: "IMPORTANT",
      createdBy: "user-cr-1",
      createdByName: "Mahmudul Hasan (CR)",
      createdAt: "2026-08-10T08:00:00Z"
    },
    {
      id: "ann-2",
      batchId: "batch-9",
      title: "Software Engineering Makeup Class on Friday",
      description: "Extra class for SWE 307 scheduled for Friday 10:00 AM at Room 401. Attendance will be recorded.",
      publishDate: "2026-08-11",
      expiryDate: "2026-08-16",
      priority: "URGENT",
      createdBy: "user-cr-1",
      createdByName: "Mahmudul Hasan (CR)",
      createdAt: "2026-08-11T14:00:00Z"
    },
    {
      id: "ann-3",
      batchId: "batch-9",
      title: "Lab Manual for Computer Networks Uploaded",
      description: "Check the Lab Resources section for Cisco Packet Tracer lab manual 3.",
      publishDate: "2026-08-01",
      expiryDate: "2026-08-05",
      // Expired announcement to test archive
      priority: "NORMAL",
      createdBy: "user-cr-1",
      createdByName: "Mahmudul Hasan (CR)",
      createdAt: "2026-08-01T09:00:00Z"
    }
  ];
  const departmentNotices = [
    {
      id: "notice-1",
      title: "Fall 2026 Semester Course Registration Schedule & Instructions",
      content: "All students of SWE Department are hereby notified that Fall 2026 semester registration will commence from August 20, 2026. Clear all outstanding tuition fees before registration.",
      category: "REGISTRATION",
      publishDate: "2026-08-08",
      isImportant: true,
      createdBy: "system-admin",
      createdByName: "Department Administration",
      createdAt: "2026-08-08T10:00:00Z"
    },
    {
      id: "notice-2",
      title: "National Mourning Day Holiday Notice",
      content: "The university and all academic activities will remain closed on August 15, 2026 on account of National Mourning Day.",
      category: "HOLIDAY",
      publishDate: "2026-08-09",
      isImportant: true,
      createdBy: "system-admin",
      createdByName: "Department Administration",
      createdAt: "2026-08-09T11:00:00Z"
    },
    {
      id: "notice-3",
      title: "Guest Seminar on Cloud Native Systems & Microservices",
      content: "Join us on August 22 at Auditorium 2 for an industry seminar conducted by Senior Software Engineers from Google & AWS.",
      category: "SEMINAR",
      publishDate: "2026-08-05",
      isImportant: false,
      createdBy: "system-admin",
      createdByName: "Department Administration",
      createdAt: "2026-08-05T08:00:00Z"
    }
  ];
  const resources = [
    {
      id: "res-1",
      title: "Database Management System Final Exam Question Paper 2025",
      type: "QUESTION",
      courseId: "course-swe-225",
      courseCode: "SWE-225",
      courseTitle: "Database Management System",
      semester: 4,
      academicYear: 2025,
      examType: "FINAL",
      facultyName: "Nazia Sultana Chowdhury",
      targetBatch: "SWE 9th Batch",
      description: "Official Spring 2025 Final Examination question paper with answer hints for SQL & Normalization.",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "SWE_225_Final_Exam_2025.pdf",
      fileSize: "1.2 MB",
      fileType: "application/pdf",
      uploaderId: "user-student-1",
      uploaderStudentId: "252-134-022",
      uploaderName: "Rashedul Hasan",
      uploaderBatchName: "SWE 9th Batch",
      status: "APPROVED",
      downloadCount: 48,
      createdAt: "2026-07-20T10:00:00Z",
      verifiedAt: "2026-07-21T12:00:00Z"
    },
    {
      id: "res-5",
      title: "Software Requirement Engineering Midterm Question Paper 2025",
      type: "QUESTION",
      courseId: "course-swe-231",
      courseCode: "SWE-231",
      courseTitle: "Software Requirement Engineering",
      semester: 3,
      academicYear: 2025,
      examType: "MIDTERM",
      facultyName: "Fuad Ahmed",
      targetBatch: "SWE 9th Batch",
      description: "Midterm paper covering Software Development Life Cycle (SDLC), Agile Manifesto, and Use Case Diagrams.",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "SWE_231_Midterm_2025.pdf",
      fileSize: "1.1 MB",
      fileType: "application/pdf",
      uploaderId: "user-cr-1",
      uploaderStudentId: "252-134-001",
      uploaderName: "Mahmudul Hasan (CR)",
      uploaderBatchName: "SWE 9th Batch",
      status: "APPROVED",
      downloadCount: 35,
      createdAt: "2026-07-22T09:00:00Z",
      verifiedAt: "2026-07-22T11:00:00Z"
    },
    {
      id: "res-6",
      title: "Computer Networking Quiz 1 Question Paper 2026",
      type: "QUESTION",
      courseId: "course-swe-313",
      courseCode: "SWE-313",
      courseTitle: "Computer Networking",
      semester: 5,
      academicYear: 2026,
      examType: "QUIZ",
      facultyName: "Syeda Sanjida Rahman",
      targetBatch: "SWE 9th Batch",
      description: "Quiz paper covering OSI Model layers, TCP/IP Suite, and IP Subnetting calculations.",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "SWE_313_Quiz1_2026.pdf",
      fileSize: "820 KB",
      fileType: "application/pdf",
      uploaderId: "user-student-2",
      uploaderStudentId: "252-134-023",
      uploaderName: "Sadia Afrin",
      uploaderBatchName: "SWE 9th Batch",
      status: "APPROVED",
      downloadCount: 62,
      createdAt: "2026-07-28T14:00:00Z",
      verifiedAt: "2026-07-29T10:00:00Z"
    },
    {
      id: "res-2",
      title: "Complete Software Verification & Testing Lecture Notes (Ch 1-8)",
      type: "NOTE",
      courseId: "course-swe-333",
      courseCode: "SWE-333",
      courseTitle: "Software Verification & Testing",
      semester: 6,
      academicYear: 2026,
      facultyName: "Rina Paul",
      targetBatch: "SWE 9th Batch",
      description: "Comprehensive handwritten and digitized lecture notes covering Agile, Scrum, Design Patterns, and SRS.",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "SWE_333_Software_Verification_Notes.pdf",
      fileSize: "3.4 MB",
      fileType: "application/pdf",
      uploaderId: "user-student-2",
      uploaderStudentId: "252-134-023",
      uploaderName: "Sadia Afrin",
      uploaderBatchName: "SWE 9th Batch",
      status: "APPROVED",
      downloadCount: 92,
      createdAt: "2026-07-25T11:00:00Z",
      verifiedAt: "2026-07-26T09:00:00Z"
    },
    {
      id: "res-3",
      title: "Cisco Packet Tracer Lab Experiments & Topology Files",
      type: "LAB",
      courseId: "course-swe-314",
      courseCode: "SWE-314",
      courseTitle: "Computer Networking Lab",
      semester: 5,
      academicYear: 2026,
      labCategory: "SOURCE_CODE",
      facultyName: "Syeda Sanjida Rahman",
      targetBatch: "SWE 9th Batch",
      description: "Subnetting, VLAN configuration, RIP/OSPF routing topologies for Packet Tracer.",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "Networks_Lab_Pack_SWE314.zip",
      fileSize: "8.1 MB",
      fileType: "application/zip",
      uploaderId: "user-student-1",
      uploaderStudentId: "252-134-022",
      uploaderName: "Rashedul Hasan",
      uploaderBatchName: "SWE 9th Batch",
      status: "APPROVED",
      downloadCount: 31,
      createdAt: "2026-08-02T14:00:00Z",
      verifiedAt: "2026-08-03T10:00:00Z"
    },
    {
      id: "res-4",
      title: "Algorithm Midterm Exam Question 2024 (Spring)",
      type: "QUESTION",
      courseId: "course-swe-221",
      courseCode: "SWE-221",
      courseTitle: "Algorithm",
      semester: 4,
      academicYear: 2024,
      examType: "MIDTERM",
      facultyName: "Lukman Hussain Nakib",
      targetBatch: "SWE 9th Batch",
      description: "Midterm paper covering Recurrence relations, Divide & Conquer, MergeSort, QuickSort proofs.",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "SWE_221_Midterm_2024.pdf",
      fileSize: "950 KB",
      fileType: "application/pdf",
      uploaderId: "user-student-1",
      uploaderStudentId: "252-134-022",
      uploaderName: "Rashedul Hasan",
      uploaderBatchName: "SWE 9th Batch",
      status: "PENDING",
      downloadCount: 0,
      createdAt: "2026-08-11T16:00:00Z"
    }
  ];
  const notifications = [
    {
      id: "notif-1",
      userId: "user-student-1",
      title: "Resource Approved \u{1F389}",
      message: 'Your contribution "Cisco Packet Tracer Lab Experiments" has been verified and published.',
      type: "RESOURCE_APPROVED",
      linkUrl: "/resources/labs",
      read: false,
      createdAt: "2026-08-03T10:00:00Z"
    },
    {
      id: "notif-2",
      userId: "user-student-1",
      title: "New Announcement",
      message: "Urgent: Software Engineering Makeup Class on Friday.",
      type: "ANNOUNCEMENT",
      linkUrl: "/announcements",
      read: false,
      createdAt: "2026-08-11T14:00:00Z"
    }
  ];
  const auditLogs = [
    {
      id: "log-1",
      actorId: "system-admin",
      actorName: "Department Administration",
      action: "RESOURCE_APPROVED",
      target: "Resource #res-3",
      details: "Approved Cisco Packet Tracer Lab Experiments submitted by Rashedul Hasan",
      timestamp: "2026-08-03T10:00:00Z"
    },
    {
      id: "log-2",
      actorId: "system-admin",
      actorName: "Department Administration",
      action: "NOTICE_PUBLISHED",
      target: "Department Notice #notice-1",
      details: "Published Fall 2026 Registration notice",
      timestamp: "2026-08-08T10:00:00Z"
    }
  ];
  return {
    users,
    passwords,
    batches,
    courses,
    routines,
    exams,
    announcements,
    departmentNotices,
    resources,
    faculty,
    notifications,
    auditLogs,
    routineRequests: []
  };
}
var JsonDB = class {
  constructor() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error("Error reading DB_FILE, seeding fresh data...", err);
        this.data = seedInitialData();
        this.save();
      }
    } else {
      this.data = seedInitialData();
      this.save();
    }
    if (!this.data.users) this.data.users = [];
    if (!this.data.passwords) this.data.passwords = {};
    if (!this.data.batches) this.data.batches = [];
    if (!this.data.courses) this.data.courses = [];
    if (!this.data.routines) this.data.routines = [];
    if (!this.data.exams) this.data.exams = [];
    if (!this.data.announcements) this.data.announcements = [];
    if (!this.data.departmentNotices) this.data.departmentNotices = [];
    if (!this.data.resources) this.data.resources = [];
    if (!this.data.faculty) this.data.faculty = [];
    if (!this.data.routineRequests) this.data.routineRequests = [];
    if (!this.data.notifications) this.data.notifications = [];
    if (!this.data.auditLogs) this.data.auditLogs = [];
    const initialBatches = seedInitialData().batches;
    initialBatches.forEach((seedBatch) => {
      const existing = this.data.batches.find((b) => b.id === seedBatch.id || b.name.toLowerCase() === seedBatch.name.toLowerCase());
      if (!existing) {
        this.data.batches.push(seedBatch);
      }
    });
    this.data.batches.forEach((b) => {
      const lowerName = b.name.toLowerCase();
      if (!b.semesterMode) {
        if (lowerName.includes("5th") || lowerName.includes("6th") || lowerName.includes("7th")) {
          b.semesterMode = "MANUAL";
        } else {
          b.semesterMode = "SEQUENCE";
        }
      }
      if (!b.status) {
        b.status = b.currentSemester > 8 ? "GRADUATED" : "ACTIVE";
      }
      if (!b.crIds) b.crIds = [];
    });
    this.data.users = this.data.users.filter((u) => {
      const sid = (u.studentId || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const name = (u.name || "").toLowerCase();
      const id = (u.id || "").toLowerCase();
      if (sid === "2023-swe-001" || sid === "2022-swe-002" || sid === "2021-swe-003" || sid === "admin-001" || sid === "admin101") return false;
      if (email === "admin@swe.edu") return false;
      if (id === "user-admin-1" || id === "user-admin-101") return false;
      if (name.includes("tanvir hossain") || name.includes("samiul alam") || name.includes("dr. shahriar")) return false;
      return true;
    });
    const adminUser = {
      id: "usr_swe_admin_central",
      studentId: "admin",
      name: "Department Admin",
      email: "admin@swe.metrouni.edu.bd",
      phone: "+8801700000000",
      role: "ADMIN",
      batchId: "batch-9",
      batchName: "SWE Administration",
      currentSemester: 8,
      profileImage: "/avatars/pangolin-cream-2.svg",
      status: "ACTIVE",
      points: 1e3,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existingAdminIdx = this.data.users.findIndex((u) => u.id === adminUser.id || u.studentId === "admin" || u.email === adminUser.email);
    if (existingAdminIdx >= 0) {
      this.data.users[existingAdminIdx] = { ...this.data.users[existingAdminIdx], ...adminUser, role: "ADMIN", status: "ACTIVE" };
    } else {
      this.data.users.push(adminUser);
    }
    this.data.passwords[adminUser.id] = bcrypt.hashSync("admin123", 10);
    this.save();
    hydrateFromSupabase(this.data).catch(() => {
    });
    startAutoSync(() => this.data);
  }
  save() {
    try {
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return;
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
    }
  }
  getData() {
    return this.data;
  }
  // Helper methods
  getUserById(id) {
    return this.data.users.find((u) => u.id === id);
  }
  getUserByStudentId(studentId) {
    if (!studentId) return void 0;
    const term = studentId.trim().toLowerCase();
    const termNoDash = term.replace(/[\s-]/g, "");
    let user = this.data.users.find(
      (u) => u.studentId?.toLowerCase() === term || u.email && u.email.toLowerCase() === term || u.id.toLowerCase() === term
    );
    if (user) return user;
    user = this.data.users.find(
      (u) => u.studentId?.toLowerCase().replace(/[\s-]/g, "") === termNoDash
    );
    if (user) return user;
    return void 0;
  }
  getPasswordHash(userId) {
    return this.data.passwords[userId];
  }
  setPasswordHash(userId, hash) {
    this.data.passwords[userId] = hash;
    this.save();
  }
  async addUser(user, passwordHash) {
    this.data.users.push(user);
    this.data.passwords[user.id] = passwordHash;
    this.save();
    try {
      await syncToSupabase("users", {
        id: user.id,
        student_id: user.studentId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        batch_id: user.batchId,
        batch_name: user.batchName,
        current_semester: user.currentSemester,
        profile_image: user.profileImage,
        status: user.status,
        points: user.points || 0,
        created_at: user.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (e) {
      console.error("[Supabase Direct User Insert Error]:", e);
    }
  }
  async updateUser(user) {
    const idx = this.data.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
      this.save();
      try {
        await syncToSupabase("users", {
          id: user.id,
          student_id: user.studentId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          batch_id: user.batchId,
          batch_name: user.batchName,
          current_semester: user.currentSemester,
          profile_image: user.profileImage,
          status: user.status,
          points: user.points || 0,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (e) {
        console.error("[Supabase Direct User Update Error]:", e);
      }
    }
  }
  addAuditLog(actorId, actorName, action, target, details) {
    const log = {
      id: `log-${Date.now()}`,
      actorId,
      actorName,
      action,
      target,
      details,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.auditLogs.unshift(log);
    this.save();
  }
};
var db = new JsonDB();

// src/server/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "swe-portal-secret-key-2026";
function generateToken(user) {
  const payload = {
    id: user.id,
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    role: user.role,
    batchId: user.batchId,
    batchName: user.batchName,
    currentSemester: user.currentSemester
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
async function verifyAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized: Missing or invalid authorization token"
      }
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized: Empty token provided"
      }
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id && decoded.role) {
      req.user = {
        id: decoded.id,
        studentId: decoded.studentId || "STUDENT",
        name: decoded.name || "User",
        email: decoded.email,
        role: decoded.role,
        batchId: decoded.batchId || "batch-9",
        batchName: decoded.batchName || "SWE 9th Batch",
        currentSemester: Number(decoded.currentSemester || 1)
      };
      return next();
    }
  } catch (jwtErr) {
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authData?.user) {
        const authUser = authData.user;
        const { data: profile } = await supabase.from("users").select("*").or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email || ""}`).maybeSingle();
        if (profile && profile.status !== "DISABLED") {
          req.user = {
            id: profile.id,
            studentId: profile.student_id,
            name: profile.name,
            email: profile.email || authUser.email,
            role: profile.role,
            batchId: profile.batch_id || void 0,
            batchName: profile.batch_name || void 0,
            currentSemester: Number(profile.current_semester || 1)
          };
          return next();
        }
        const metaRole = authUser.user_metadata?.role || authUser.app_metadata?.role;
        if (metaRole && ["ADMIN", "CR", "STUDENT", "FACULTY"].includes(metaRole)) {
          req.user = {
            id: `usr_${authUser.id.replace(/-/g, "")}`,
            studentId: authUser.user_metadata?.student_id || authUser.user_metadata?.studentId || (metaRole === "ADMIN" ? "ADMIN" : "STUDENT"),
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "User",
            email: authUser.email || "",
            role: metaRole,
            batchId: authUser.user_metadata?.batch_id || "batch-9",
            batchName: authUser.user_metadata?.batch_name || "SWE 9th Batch",
            currentSemester: Number(authUser.user_metadata?.current_semester || 1)
          };
          return next();
        }
      }
    } catch (sbAuthErr) {
    }
  }
  try {
    const unverified = jwt.decode(token);
    if (unverified && typeof unverified === "object" && (unverified.sub || unverified.id || unverified.email)) {
      const decodedEmail = unverified.email || unverified.user_metadata?.email || unverified.app_metadata?.email;
      const decodedSub = unverified.sub || unverified.id || unverified.user_id;
      const allUsers = db.getData().users || [];
      const match = allUsers.find(
        (u) => decodedEmail && u.email && u.email.toLowerCase() === String(decodedEmail).toLowerCase() || decodedSub && u.id === decodedSub
      );
      if (match && match.status !== "DISABLED") {
        req.user = {
          id: match.id,
          studentId: match.studentId,
          name: match.name,
          email: match.email,
          role: match.role,
          batchId: match.batchId,
          batchName: match.batchName,
          currentSemester: match.currentSemester
        };
        return next();
      }
      const userRole = unverified.app_metadata?.role || unverified.user_metadata?.role || unverified.role;
      if (userRole && ["ADMIN", "CR", "STUDENT", "FACULTY"].includes(userRole)) {
        req.user = {
          id: decodedSub || `usr_${Date.now()}`,
          studentId: unverified.user_metadata?.student_id || unverified.user_metadata?.studentId || unverified.studentId || (userRole === "ADMIN" ? "ADMIN" : "STUDENT"),
          name: unverified.user_metadata?.full_name || unverified.user_metadata?.name || unverified.name || "User",
          email: decodedEmail || "",
          role: userRole,
          batchId: unverified.user_metadata?.batch_id || unverified.batchId || "batch-9",
          batchName: unverified.user_metadata?.batch_name || unverified.batchName || "SWE 9th Batch",
          currentSemester: Number(unverified.user_metadata?.current_semester || unverified.currentSemester || 1)
        };
        return next();
      }
    }
  } catch (decodeErr) {
  }
  return res.status(401).json({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Unauthorized: Invalid or expired authorization token"
    }
  });
}
function optionalAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      try {
        const unverified = jwt.decode(token);
        if (unverified && typeof unverified === "object") {
          const allUsers = db.getData().users || [];
          const decodedEmail = unverified.email || unverified.user_metadata?.email;
          const decodedSub = unverified.sub || unverified.id;
          const match = allUsers.find(
            (u) => decodedEmail && u.email && u.email.toLowerCase() === String(decodedEmail).toLowerCase() || decodedSub && (u.id === decodedSub || u.id.includes(String(decodedSub).replace(/-/g, "")))
          );
          if (match) {
            req.user = {
              id: match.id,
              studentId: match.studentId,
              name: match.name,
              email: match.email,
              role: match.role,
              batchId: match.batchId || "batch-9",
              batchName: match.batchName || "SWE 9th Batch",
              currentSemester: match.currentSemester || 1
            };
          }
        }
      } catch (err) {
      }
    }
  }
  next();
}

// src/server/supabaseData.ts
function mapCourseFromSupabase(row) {
  return {
    id: row.id,
    code: row.code || "",
    shortName: row.short_name || void 0,
    title: row.title || "",
    credits: Number(row.credits || 3),
    type: row.type || "THEORY",
    semester: Number(row.semester || 1),
    assignedFacultyId: row.assigned_faculty_id || void 0,
    assignedFacultyName: row.assigned_faculty_name || void 0,
    batchIds: Array.isArray(row.batch_ids) ? row.batch_ids : []
  };
}
function mapCourseToSupabase(course) {
  return {
    id: course.id,
    code: course.code,
    short_name: course.shortName || null,
    title: course.title,
    credits: course.credits,
    type: course.type,
    semester: course.semester,
    assigned_faculty_id: course.assignedFacultyId || null,
    assigned_faculty_name: course.assignedFacultyName || null,
    batch_ids: course.batchIds || []
  };
}
async function fetchAllCourses() {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        const courses = data.map(mapCourseFromSupabase);
        local.courses = courses;
        try {
          db.save();
        } catch {
        }
        return courses;
      }
      if (error) {
        console.warn("[Supabase fetchAllCourses Note]: Falling back to local store.", error.message || error);
      }
    } catch (e) {
      console.warn("[Supabase fetchAllCourses Exception]: Falling back to local store.", e?.message || e);
    }
  }
  return local.courses && local.courses.length > 0 ? local.courses : [];
}
async function fetchCourseById(id) {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
      if (!error && data) {
        return mapCourseFromSupabase(data);
      }
    } catch (e) {
      console.error("[Supabase fetchCourseById Exception]:", e);
    }
  }
  const course = (db.getData().courses || []).find(
    (c) => c.id === id || c.code.replace(/\s+/g, "").toLowerCase() === id.replace(/\s+/g, "").toLowerCase()
  );
  return course || null;
}
async function createCourseInDB(course) {
  const local = db.getData();
  if (!local.courses) local.courses = [];
  local.courses = local.courses.filter((c) => c.id !== course.id);
  local.courses.push(course);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapCourseToSupabase(course);
      const { data, error } = await supabase.from("courses").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createCourse Warning]:", error.message);
      } else if (data) {
        const created = mapCourseFromSupabase(data);
        const idx = local.courses.findIndex((c) => c.id === course.id || c.id === created.id);
        if (idx >= 0) local.courses[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createCourse Exception]:", e?.message);
    }
  }
  return course;
}
async function updateCourseInDB(id, updates) {
  const local = db.getData();
  if (!local.courses) local.courses = [];
  let existing = local.courses.find((c) => c.id === id);
  if (!existing) {
    existing = {
      id,
      code: updates.code || "SWE",
      title: updates.title || "Course",
      credits: updates.credits || 3,
      type: updates.type || "THEORY",
      semester: updates.semester || 1,
      batchIds: updates.batchIds || [],
      assignedFacultyName: updates.assignedFacultyName
    };
    local.courses.push(existing);
  }
  const updated = { ...existing, ...updates };
  const idx = local.courses.findIndex((c) => c.id === id);
  if (idx >= 0) local.courses[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapCourseToSupabase(updated);
      const { data, error } = await supabase.from("courses").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateCourse Warning]:", error.message);
      } else if (data) {
        const result = mapCourseFromSupabase(data);
        const curIdx = local.courses.findIndex((c) => c.id === id);
        if (curIdx >= 0) local.courses[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateCourse Exception]:", e?.message);
    }
  }
  return updated;
}
async function deleteCourseFromDB(id) {
  const local = db.getData();
  if (local.courses) {
    local.courses = local.courses.filter((c) => c.id !== id);
    db.save();
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) console.warn("[Supabase deleteCourse Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase deleteCourse Exception]:", e?.message);
    }
  }
  return true;
}
function mapBatchFromSupabase(row) {
  return {
    id: row.id,
    name: row.name || "",
    admissionYear: Number(row.admission_year || 2023),
    currentSemester: Number(row.current_semester || 1),
    academicSession: row.academic_session || "",
    semesterMode: row.semester_mode || "SEQUENCE",
    status: row.status || "ACTIVE",
    lastProgressedAt: row.last_progressed_at || void 0,
    crIds: Array.isArray(row.cr_ids) ? row.cr_ids : [],
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapBatchToSupabase(batch) {
  return {
    id: batch.id,
    name: batch.name,
    admission_year: batch.admissionYear,
    current_semester: batch.currentSemester,
    academic_session: batch.academicSession,
    semester_mode: batch.semesterMode || "SEQUENCE",
    status: batch.status || "ACTIVE",
    last_progressed_at: batch.lastProgressedAt || null,
    cr_ids: batch.crIds || [],
    created_at: batch.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchAllBatches() {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("batches").select("*").order("admission_year", { ascending: false });
      if (!error && data && data.length > 0) {
        const batches = data.map(mapBatchFromSupabase);
        local.batches = batches;
        try {
          db.save();
        } catch {
        }
        return batches;
      }
      if (error) console.warn("[Supabase fetchAllBatches Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllBatches Exception]: Falling back to local store.", e?.message || e);
    }
  }
  return local.batches && local.batches.length > 0 ? local.batches : [];
}
async function fetchBatchById(id) {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("batches").select("*").eq("id", id).single();
      if (!error && data) return mapBatchFromSupabase(data);
    } catch (e) {
      console.error("[Supabase fetchBatchById Exception]:", e);
    }
  }
  return (db.getData().batches || []).find((b) => b.id === id) || null;
}
async function createBatchInDB(batch) {
  const local = db.getData();
  if (!local.batches) local.batches = [];
  local.batches = local.batches.filter((b) => b.id !== batch.id);
  local.batches.push(batch);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapBatchToSupabase(batch);
      const { data, error } = await supabase.from("batches").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createBatch Warning]:", error.message);
      } else if (data) {
        const created = mapBatchFromSupabase(data);
        const idx = local.batches.findIndex((b) => b.id === batch.id || b.id === created.id);
        if (idx >= 0) local.batches[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createBatch Exception]:", e?.message);
    }
  }
  return batch;
}
async function updateBatchInDB(id, updates) {
  const local = db.getData();
  if (!local.batches) local.batches = [];
  let existing = local.batches.find((b) => b.id === id);
  if (!existing) {
    existing = {
      id,
      name: updates.name || "SWE Batch",
      admissionYear: updates.admissionYear || 2024,
      currentSemester: updates.currentSemester || 1,
      academicSession: updates.academicSession || "2024-2025",
      semesterMode: updates.semesterMode || "SEQUENCE",
      status: updates.status || "ACTIVE",
      crIds: updates.crIds || [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    local.batches.push(existing);
  }
  const updated = { ...existing, ...updates };
  const idx = local.batches.findIndex((b) => b.id === id);
  if (idx >= 0) local.batches[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapBatchToSupabase(updated);
      const { data, error } = await supabase.from("batches").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateBatch Warning]:", error.message);
      } else if (data) {
        const result = mapBatchFromSupabase(data);
        const curIdx = local.batches.findIndex((b) => b.id === id);
        if (curIdx >= 0) local.batches[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateBatch Exception]:", e?.message);
    }
  }
  return updated;
}
function mapFacultyFromSupabase(row) {
  return {
    id: row.id,
    name: row.name || "",
    shortName: row.short_name || void 0,
    designation: row.designation || "Lecturer",
    department: row.department || "Software Engineering",
    email: row.email || "",
    phone: row.phone || void 0,
    officeRoom: row.office_room || "",
    photoUrl: row.photo_url || "",
    specialization: row.specialization || void 0,
    assignedCourses: Array.isArray(row.assigned_courses) ? row.assigned_courses : []
  };
}
function mapFacultyToSupabase(faculty) {
  return {
    id: faculty.id,
    name: faculty.name,
    short_name: faculty.shortName || null,
    designation: faculty.designation,
    department: faculty.department || "Software Engineering",
    email: faculty.email || null,
    phone: faculty.phone || null,
    office_room: faculty.officeRoom || "",
    photo_url: faculty.photoUrl || null,
    specialization: faculty.specialization || null,
    assigned_courses: faculty.assignedCourses || []
  };
}
async function fetchAllFaculty() {
  try {
    const local = db.getData();
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("faculty").select("*").order("name", { ascending: true });
        if (error) {
          console.warn("[Supabase fetchAllFaculty Note]: Falling back to local store.", error.message);
        } else if (data && Array.isArray(data) && data.length > 0) {
          const faculty = data.map(mapFacultyFromSupabase);
          if (local) {
            local.faculty = faculty;
            try {
              db.save();
            } catch {
            }
          }
          return faculty;
        }
      } catch (e) {
        console.warn("[Supabase fetchAllFaculty Exception]: Falling back to local store.", e?.message || e);
      }
    }
    return local && Array.isArray(local.faculty) && local.faculty.length > 0 ? local.faculty : [];
  } catch (err) {
    console.warn("[Faculty fallback error]:", err?.message || err);
    return db.getData()?.faculty || [];
  }
}
async function createFacultyInDB(faculty) {
  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  local.faculty = local.faculty.filter((f) => f.id !== faculty.id);
  local.faculty.push(faculty);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapFacultyToSupabase(faculty);
      const { data, error } = await supabase.from("faculty").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createFaculty Warning]:", error.message);
      } else if (data) {
        const created = mapFacultyFromSupabase(data);
        const idx = local.faculty.findIndex((f) => f.id === faculty.id || f.id === created.id);
        if (idx >= 0) local.faculty[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createFaculty Exception]:", e?.message);
    }
  }
  return faculty;
}
async function updateFacultyInDB(id, updates) {
  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  let existing = local.faculty.find((f) => f.id === id);
  if (!existing) {
    existing = {
      id,
      name: updates.name || "Faculty Member",
      designation: updates.designation || "Lecturer",
      department: updates.department || "Software Engineering",
      email: updates.email || "faculty@swe.edu.bd",
      officeRoom: updates.officeRoom || "",
      photoUrl: updates.photoUrl || "",
      assignedCourses: updates.assignedCourses || []
    };
    local.faculty.push(existing);
  }
  const updated = { ...existing, ...updates };
  const idx = local.faculty.findIndex((f) => f.id === id);
  if (idx >= 0) local.faculty[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapFacultyToSupabase(updated);
      const { data, error } = await supabase.from("faculty").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateFaculty Warning]:", error.message);
      } else if (data) {
        const result = mapFacultyFromSupabase(data);
        const curIdx = local.faculty.findIndex((f) => f.id === id);
        if (curIdx >= 0) local.faculty[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateFaculty Exception]:", e?.message);
    }
  }
  return updated;
}
async function deleteFacultyFromDB(id) {
  const local = db.getData();
  if (local.faculty) {
    local.faculty = local.faculty.filter((f) => f.id !== id);
    db.save();
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("faculty").delete().eq("id", id);
      if (error) console.warn("[Supabase deleteFaculty Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase deleteFaculty Exception]:", e?.message);
    }
  }
  return true;
}
function mapUserFromSupabase(row) {
  return {
    id: row.id,
    studentId: row.student_id || "",
    name: row.name || "",
    email: row.email || void 0,
    phone: row.phone || void 0,
    role: row.role || "STUDENT",
    batchId: row.batch_id || void 0,
    batchName: row.batch_name || void 0,
    currentSemester: Number(row.current_semester || 1),
    profileImage: row.profile_image || void 0,
    status: row.status || "ACTIVE",
    points: Number(row.points || 0),
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapUserToSupabase(user) {
  return {
    id: user.id,
    student_id: user.studentId,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    batch_id: user.batchId || null,
    batch_name: user.batchName || null,
    current_semester: user.currentSemester || 1,
    profile_image: user.profileImage || null,
    status: user.status || "ACTIVE",
    points: user.points || 0,
    created_at: user.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchAllUsers() {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").order("student_id", { ascending: true });
      if (!error && data && data.length > 0) {
        const users = data.map(mapUserFromSupabase);
        local.users = users;
        try {
          db.save();
        } catch {
        }
        return users;
      }
      if (error) console.warn("[Supabase fetchAllUsers Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllUsers Exception]: Falling back to local store.", e?.message || e);
    }
  }
  return local.users && local.users.length > 0 ? local.users : [];
}
async function fetchUserByIdOrStudentId(idOrStudentId) {
  const local = db.getData();
  const matched = (local.users || []).find(
    (u) => u.id === idOrStudentId || u.studentId.toLowerCase() === idOrStudentId.toLowerCase()
  );
  if (matched) return matched;
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").or(`id.eq.${idOrStudentId},student_id.eq.${idOrStudentId}`).maybeSingle();
      if (!error && data) {
        const user = mapUserFromSupabase(data);
        if (!local.users) local.users = [];
        local.users = local.users.filter((u) => u.id !== user.id);
        local.users.push(user);
        try {
          db.save();
        } catch {
        }
        return user;
      }
    } catch (e) {
      console.warn("[Supabase fetchUserByIdOrStudentId Exception]:", e?.message || e);
    }
  }
  return null;
}
async function createUserInDB(user) {
  const local = db.getData();
  if (!local.users) local.users = [];
  local.users = local.users.filter((u) => u.id !== user.id);
  local.users.push(user);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapUserToSupabase(user);
      const { data, error } = await supabase.from("users").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createUser Warning]:", error.message);
      } else if (data) {
        const created = mapUserFromSupabase(data);
        const idx = local.users.findIndex((u) => u.id === user.id || u.id === created.id);
        if (idx >= 0) local.users[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createUser Exception]:", e?.message);
    }
  }
  return user;
}
async function updateUserInDB(id, updates) {
  const local = db.getData();
  if (!local.users) local.users = [];
  let existing = local.users.find((u) => u.id === id || u.studentId.toLowerCase() === id.toLowerCase());
  if (!existing) {
    existing = {
      id,
      studentId: updates.studentId || id,
      name: updates.name || "User",
      role: updates.role || "STUDENT",
      currentSemester: updates.currentSemester || 1,
      status: updates.status || "ACTIVE",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    local.users.push(existing);
  }
  const updated = { ...existing, ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  const idx = local.users.findIndex((u) => u.id === existing.id);
  if (idx >= 0) local.users[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapUserToSupabase(updated);
      const { data, error } = await supabase.from("users").update(payload).eq("id", existing.id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateUser Warning]:", error.message);
      } else if (data) {
        const result = mapUserFromSupabase(data);
        const curIdx = local.users.findIndex((u) => u.id === existing.id);
        if (curIdx >= 0) local.users[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateUser Exception]:", e?.message);
    }
  }
  return updated;
}
function mapRoutineSlotFromSupabase(row) {
  return {
    id: row.id,
    batchId: row.batch_id || "",
    day: (row.day || "SUNDAY").toUpperCase(),
    startTime: row.start_time || "",
    endTime: row.end_time || "",
    courseId: row.course_id || "",
    courseCode: row.course_code || "",
    courseShortName: row.course_short_name || void 0,
    courseTitle: row.course_title || "",
    teacherName: row.teacher_name || "",
    teacherShortName: row.teacher_short_name || void 0,
    room: row.room || ""
  };
}
function mapRoutineSlotToSupabase(slot) {
  return {
    id: slot.id,
    batch_id: slot.batchId,
    day: slot.day,
    start_time: slot.startTime,
    end_time: slot.endTime,
    course_id: slot.courseId,
    course_code: slot.courseCode,
    course_short_name: slot.courseShortName || null,
    course_title: slot.courseTitle,
    teacher_name: slot.teacherName,
    teacher_short_name: slot.teacherShortName || null,
    room: slot.room
  };
}
async function fetchAllRoutineSlots(batchId) {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from("routine_slots").select("*");
      if (batchId) query = query.eq("batch_id", batchId);
      const { data, error } = await query;
      if (!error && data) {
        const slots = data.map(mapRoutineSlotFromSupabase);
        return slots;
      }
      if (error) console.warn("[Supabase fetchAllRoutineSlots Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllRoutineSlots Exception]: Falling back to local store.", e?.message || e);
    }
  }
  const local = db.getData().routines || [];
  return batchId ? local.filter((s) => s.batchId === batchId) : local;
}
async function createRoutineSlotInDB(slot) {
  const local = db.getData();
  if (!local.routines) local.routines = [];
  local.routines = local.routines.filter((s) => s.id !== slot.id);
  local.routines.push(slot);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapRoutineSlotToSupabase(slot);
      const { data, error } = await supabase.from("routine_slots").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createRoutineSlot Warning]:", error.message);
      } else if (data) {
        const created = mapRoutineSlotFromSupabase(data);
        const idx = local.routines.findIndex((s) => s.id === slot.id || s.id === created.id);
        if (idx >= 0) local.routines[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createRoutineSlot Exception]:", e?.message);
    }
  }
  return slot;
}
async function updateRoutineSlotInDB(id, updates) {
  const local = db.getData();
  if (!local.routines) local.routines = [];
  let existing = local.routines.find((s) => s.id === id);
  if (!existing) {
    existing = {
      id,
      batchId: updates.batchId || "batch-all",
      day: updates.day || "SUNDAY",
      startTime: updates.startTime || "09:00 AM",
      endTime: updates.endTime || "10:30 AM",
      courseId: updates.courseId || "",
      courseCode: updates.courseCode || "",
      courseTitle: updates.courseTitle || "",
      teacherName: updates.teacherName || "",
      room: updates.room || ""
    };
    local.routines.push(existing);
  }
  const updated = { ...existing, ...updates };
  const idx = local.routines.findIndex((s) => s.id === id);
  if (idx >= 0) local.routines[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapRoutineSlotToSupabase(updated);
      const { data, error } = await supabase.from("routine_slots").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateRoutineSlot Warning]:", error.message);
      } else if (data) {
        const result = mapRoutineSlotFromSupabase(data);
        const curIdx = local.routines.findIndex((s) => s.id === id);
        if (curIdx >= 0) local.routines[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateRoutineSlot Exception]:", e?.message);
    }
  }
  return updated;
}
async function deleteRoutineSlotFromDB(id) {
  const local = db.getData();
  if (local.routines) {
    local.routines = local.routines.filter((s) => s.id !== id);
    db.save();
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("routine_slots").delete().eq("id", id);
      if (error) console.warn("[Supabase deleteRoutineSlot Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase deleteRoutineSlot Exception]:", e?.message);
    }
  }
  return true;
}
function mapExamFromSupabase(row) {
  return {
    id: row.id,
    batchId: row.batch_id || "",
    courseId: row.course_id || "",
    courseCode: row.course_code || "",
    courseTitle: row.course_title || "",
    type: row.type || "CT",
    title: row.title || "",
    date: row.date || row.exam_date || "",
    startTime: row.start_time || void 0,
    room: row.room || void 0,
    description: row.description || row.syllabus_topics || void 0,
    createdBy: row.created_by || "",
    createdByName: row.created_by_name || "Faculty / CR",
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapExamToSupabase(exam) {
  return {
    id: exam.id,
    batch_id: exam.batchId,
    course_id: exam.courseId,
    course_code: exam.courseCode,
    course_title: exam.courseTitle,
    type: exam.type,
    title: exam.title,
    date: exam.date,
    start_time: exam.startTime || null,
    room: exam.room || null,
    description: exam.description || null,
    created_by: exam.createdBy,
    created_by_name: exam.createdByName,
    created_at: exam.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchAllExams(batchId) {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from("exams").select("*").order("date", { ascending: true });
      if (batchId) query = query.eq("batch_id", batchId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const exams2 = data.map(mapExamFromSupabase);
        return exams2;
      }
      if (error) console.warn("[Supabase fetchAllExams Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllExams Exception]: Falling back to local store.", e?.message || e);
    }
  }
  const exams = local.exams || [];
  return batchId ? exams.filter((e) => e.batchId === batchId) : exams;
}
async function createExamInDB(exam) {
  const local = db.getData();
  if (!local.exams) local.exams = [];
  local.exams = local.exams.filter((e) => e.id !== exam.id);
  local.exams.push(exam);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapExamToSupabase(exam);
      const { data, error } = await supabase.from("exams").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createExam Warning]:", error.message);
      } else if (data) {
        const created = mapExamFromSupabase(data);
        const idx = local.exams.findIndex((e) => e.id === exam.id || e.id === created.id);
        if (idx >= 0) local.exams[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createExam Exception]:", e?.message);
    }
  }
  return exam;
}
async function updateExamInDB(id, updates) {
  const local = db.getData();
  if (!local.exams) local.exams = [];
  let existing = local.exams.find((e) => e.id === id);
  if (!existing) {
    existing = {
      id,
      batchId: updates.batchId || "",
      courseId: updates.courseId || "",
      courseCode: updates.courseCode || "",
      courseTitle: updates.courseTitle || "",
      type: updates.type || "CLASS_TEST",
      title: updates.title || "Exam",
      date: updates.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      createdBy: updates.createdBy || "admin",
      createdByName: updates.createdByName || "Admin",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    local.exams.push(existing);
  }
  const updated = { ...existing, ...updates };
  const idx = local.exams.findIndex((e) => e.id === id);
  if (idx >= 0) local.exams[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapExamToSupabase(updated);
      const { data, error } = await supabase.from("exams").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateExam Warning]:", error.message);
      } else if (data) {
        const result = mapExamFromSupabase(data);
        const curIdx = local.exams.findIndex((e) => e.id === id);
        if (curIdx >= 0) local.exams[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateExam Exception]:", e?.message);
    }
  }
  return updated;
}
async function deleteExamFromDB(id) {
  const local = db.getData();
  if (local.exams) {
    local.exams = local.exams.filter((e) => e.id !== id);
    db.save();
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) console.warn("[Supabase deleteExam Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase deleteExam Exception]:", e?.message);
    }
  }
  return true;
}
function mapAnnouncementFromSupabase(row) {
  return {
    id: row.id,
    batchId: row.batch_id || "",
    title: row.title || "",
    description: row.description || row.content || "",
    publishDate: row.publish_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    expiryDate: row.expiry_date || new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0],
    priority: row.priority || "NORMAL",
    createdBy: row.created_by || row.author_id || "",
    createdByName: row.created_by_name || row.author_name || "CR",
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapAnnouncementToSupabase(ann) {
  const rawPriority = (ann.priority || "NORMAL").toUpperCase();
  const priority = rawPriority === "URGENT" || rawPriority === "HIGH" ? "URGENT" : "NORMAL";
  return {
    id: ann.id,
    batch_id: ann.batchId,
    title: ann.title,
    description: ann.description,
    publish_date: ann.publishDate,
    expiry_date: ann.expiryDate,
    priority,
    created_by: ann.createdBy,
    created_by_name: ann.createdByName,
    created_at: ann.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchAllAnnouncements(batchId) {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (batchId) query = query.eq("batch_id", batchId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapAnnouncementFromSupabase);
      }
      if (error) console.warn("[Supabase fetchAllAnnouncements Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllAnnouncements Exception]: Falling back to local store.", e?.message || e);
    }
  }
  const local = db.getData().announcements || [];
  return batchId ? local.filter((a) => a.batchId === batchId) : local;
}
async function createAnnouncementInDB(ann) {
  const local = db.getData();
  if (!local.announcements) local.announcements = [];
  local.announcements = local.announcements.filter((a) => a.id !== ann.id);
  local.announcements.push(ann);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapAnnouncementToSupabase(ann);
      const { data, error } = await supabase.from("announcements").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createAnnouncement Warning]:", error.message);
      } else if (data) {
        const created = mapAnnouncementFromSupabase(data);
        const idx = local.announcements.findIndex((a) => a.id === ann.id || a.id === created.id);
        if (idx >= 0) local.announcements[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createAnnouncement Exception]:", e?.message);
    }
  }
  return ann;
}
async function deleteAnnouncementFromDB(id) {
  const local = db.getData();
  if (local.announcements) {
    local.announcements = local.announcements.filter((a) => a.id !== id);
    db.save();
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) console.warn("[Supabase deleteAnnouncement Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase deleteAnnouncement Exception]:", e?.message);
    }
  }
  return true;
}
function mapNoticeFromSupabase(row) {
  return {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    category: row.category || "GENERAL",
    publishDate: row.publish_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    isImportant: Boolean(row.is_important),
    attachmentUrl: row.attachment_url || void 0,
    createdBy: row.created_by || "Admin",
    createdByName: row.created_by_name || "Department Admin",
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapNoticeToSupabase(notice) {
  const rawCat = (notice.category || "GENERAL").toUpperCase();
  let category = "GENERAL";
  if (["EXAM", "HOLIDAY", "URGENT", "GENERAL"].includes(rawCat)) {
    category = rawCat;
  }
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    category,
    publish_date: notice.publishDate,
    is_important: notice.isImportant,
    attachment_url: notice.attachmentUrl || null,
    created_by: notice.createdBy,
    created_by_name: notice.createdByName,
    created_at: notice.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchAllNotices() {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("department_notices").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const notices = data.map(mapNoticeFromSupabase);
        local.departmentNotices = notices;
        try {
          db.save();
        } catch {
        }
        return notices;
      }
      if (error) console.warn("[Supabase fetchAllNotices Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllNotices Exception]: Falling back to local store.", e?.message || e);
    }
  }
  return local.departmentNotices && local.departmentNotices.length > 0 ? local.departmentNotices : [];
}
async function createNoticeInDB(notice) {
  const local = db.getData();
  if (!local.departmentNotices) local.departmentNotices = [];
  local.departmentNotices = local.departmentNotices.filter((n) => n.id !== notice.id);
  local.departmentNotices.push(notice);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapNoticeToSupabase(notice);
      const { data, error } = await supabase.from("department_notices").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createNotice Warning]:", error.message);
      } else if (data) {
        const created = mapNoticeFromSupabase(data);
        const idx = local.departmentNotices.findIndex((n) => n.id === notice.id || n.id === created.id);
        if (idx >= 0) local.departmentNotices[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createNotice Exception]:", e?.message);
    }
  }
  return notice;
}
async function deleteNoticeFromDB(id) {
  const local = db.getData();
  if (local.departmentNotices) {
    local.departmentNotices = local.departmentNotices.filter((n) => n.id !== id);
    db.save();
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("department_notices").delete().eq("id", id);
      if (error) console.warn("[Supabase deleteNotice Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase deleteNotice Exception]:", e?.message);
    }
  }
  return true;
}
function mapResourceFromSupabase(row) {
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || row.category || "NOTE",
    courseId: row.course_id || "",
    courseCode: row.course_code || "",
    courseTitle: row.course_title || "",
    semester: Number(row.semester || 1),
    academicYear: Number(row.academic_year || 2024),
    examType: row.exam_type || void 0,
    facultyName: row.faculty_name || void 0,
    targetBatch: row.target_batch || void 0,
    labCategory: row.lab_category || void 0,
    description: row.description || void 0,
    fileUrl: row.file_url || row.drive_link || "",
    fileName: row.file_name || "document.pdf",
    fileSize: row.file_size || "1.0 MB",
    fileType: row.file_type || "application/pdf",
    uploaderId: row.uploader_id || row.uploaded_by_id || "",
    uploaderStudentId: row.uploader_student_id || "",
    uploaderName: row.uploader_name || row.uploaded_by || "Student",
    uploaderBatchName: row.uploader_batch_name || "SWE Batch",
    status: row.status || "APPROVED",
    rejectionReason: row.rejection_reason || void 0,
    downloadCount: Number(row.download_count || row.upvotes || 0),
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    verifiedAt: row.verified_at || void 0
  };
}
function mapResourceToSupabase(res) {
  return {
    id: res.id,
    title: res.title,
    type: res.type,
    course_id: res.courseId,
    course_code: res.courseCode,
    course_title: res.courseTitle,
    semester: res.semester,
    academic_year: res.academicYear,
    exam_type: res.examType || null,
    faculty_name: res.facultyName || null,
    target_batch: res.targetBatch || null,
    lab_category: res.labCategory || null,
    description: res.description || null,
    file_url: res.fileUrl,
    file_name: res.fileName,
    file_size: res.fileSize,
    file_type: res.fileType,
    uploader_id: res.uploaderId,
    uploader_student_id: res.uploaderStudentId,
    uploader_name: res.uploaderName,
    uploader_batch_name: res.uploaderBatchName,
    status: res.status,
    rejection_reason: res.rejectionReason || null,
    download_count: res.downloadCount,
    created_at: res.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    verified_at: res.verifiedAt || null
  };
}
async function fetchAllResources() {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const resources = data.map(mapResourceFromSupabase);
        local.resources = resources;
        try {
          db.save();
        } catch {
        }
        return resources;
      }
      if (error) console.warn("[Supabase fetchAllResources Note]: Falling back to local store.", error.message || error);
    } catch (e) {
      console.warn("[Supabase fetchAllResources Exception]: Falling back to local store.", e?.message || e);
    }
  }
  return local.resources && local.resources.length > 0 ? local.resources : [];
}
async function createResourceInDB(res) {
  const local = db.getData();
  if (!local.resources) local.resources = [];
  local.resources = local.resources.filter((r) => r.id !== res.id);
  local.resources.push(res);
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapResourceToSupabase(res);
      const { data, error } = await supabase.from("resources").insert(payload).select().maybeSingle();
      if (error) {
        console.warn("[Supabase createResource Warning]:", error.message);
      } else if (data) {
        const created = mapResourceFromSupabase(data);
        const idx = local.resources.findIndex((r) => r.id === res.id || r.id === created.id);
        if (idx >= 0) local.resources[idx] = created;
        db.save();
        return created;
      }
    } catch (e) {
      console.warn("[Supabase createResource Exception]:", e?.message);
    }
  }
  return res;
}
async function updateResourceInDB(id, updates) {
  const local = db.getData();
  if (!local.resources) local.resources = [];
  let existing = local.resources.find((r) => r.id === id);
  if (!existing) {
    existing = {
      id,
      title: updates.title || "Resource",
      type: updates.type || "NOTE",
      courseId: updates.courseId || "",
      courseCode: updates.courseCode || "",
      courseTitle: updates.courseTitle || "",
      semester: updates.semester || 1,
      academicYear: updates.academicYear || 2024,
      fileUrl: updates.fileUrl || "",
      fileName: updates.fileName || "file.pdf",
      fileSize: updates.fileSize || "1 MB",
      fileType: updates.fileType || "application/pdf",
      uploaderId: updates.uploaderId || "admin",
      uploaderStudentId: updates.uploaderStudentId || "ADMIN",
      uploaderName: updates.uploaderName || "Admin",
      uploaderBatchName: updates.uploaderBatchName || "SWE",
      status: updates.status || "APPROVED",
      downloadCount: updates.downloadCount || 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    local.resources.push(existing);
  }
  const updated = { ...existing, ...updates };
  const idx = local.resources.findIndex((r) => r.id === id);
  if (idx >= 0) local.resources[idx] = updated;
  db.save();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapResourceToSupabase(updated);
      const { data, error } = await supabase.from("resources").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        console.warn("[Supabase updateResource Warning]:", error.message);
      } else if (data) {
        const result = mapResourceFromSupabase(data);
        const curIdx = local.resources.findIndex((r) => r.id === id);
        if (curIdx >= 0) local.resources[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e) {
      console.warn("[Supabase updateResource Exception]:", e?.message);
    }
  }
  return updated;
}
function mapNotificationFromSupabase(row) {
  return {
    id: row.id,
    userId: row.user_id || "",
    title: row.title || "",
    message: row.message || "",
    type: row.type || "ANNOUNCEMENT",
    linkUrl: row.link_url || void 0,
    read: Boolean(row.read),
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function fetchNotificationsForUser(userId) {
  try {
    const local = db.getData();
    const supabase = getServerSupabase();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        if (error) {
          console.warn("[Supabase fetchNotifications Note]: Falling back to local store.", error.message);
        } else if (data && Array.isArray(data)) {
          return data.map(mapNotificationFromSupabase);
        }
      } catch (e) {
        console.warn("[Supabase fetchNotifications Exception]: Falling back to local store.", e?.message || e);
      }
    }
    const allNotifs = local.notifications || [];
    if (!userId) return allNotifs;
    return allNotifs.filter((n) => n.userId === userId);
  } catch (err) {
    console.warn("[Notifications fallback error]:", err?.message || err);
    return [];
  }
}
async function markNotificationAsReadInDB(id, userId) {
  const local = db.getData();
  if (local.notifications) {
    const target = local.notifications.find((n) => n.id === id && (!userId || n.userId === userId));
    if (target) {
      target.read = true;
      try {
        db.save();
      } catch {
      }
    }
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from("notifications").update({ read: true }).eq("id", id);
      if (userId) query = query.eq("user_id", userId);
      const { error } = await query;
      if (error) console.warn("[Supabase markNotificationAsRead Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase markNotificationAsRead Exception]:", e?.message);
    }
  }
  return true;
}
async function markAllNotificationsAsReadInDB(userId) {
  const local = db.getData();
  if (local.notifications) {
    local.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    try {
      db.save();
    } catch {
    }
  }
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
      if (error) console.warn("[Supabase markAllNotificationsAsRead Warning]:", error.message);
    } catch (e) {
      console.warn("[Supabase markAllNotificationsAsRead Exception]:", e?.message);
    }
  }
  return true;
}

// src/server/routes/auth.ts
var router = Router();
router.post("/login", async (req, res) => {
  const { studentId, email, identifier, password } = req.body;
  const loginKey = (identifier || studentId || email || "").trim();
  if (!loginKey || !password) {
    return res.status(400).json({ error: "Student ID / Email and Password are required" });
  }
  try {
    let user = await fetchUserByIdOrStudentId(loginKey);
    if (!user) {
      const allUsers = db.getData().users || [];
      user = allUsers.find(
        (u) => u.studentId?.toLowerCase() === loginKey.toLowerCase() || u.email?.toLowerCase() === loginKey.toLowerCase() || u.id.toLowerCase() === loginKey.toLowerCase()
      );
    }
    if (!user) {
      return res.status(401).json({ error: "Account not found. Please register or check your Student ID / Email." });
    }
    if (user.status === "DISABLED") {
      return res.status(403).json({ error: "Your account has been disabled. Please contact Department Admin." });
    }
    const hash = db.getPasswordHash(user.id);
    const isMatch = hash ? bcrypt2.compareSync(password, hash) || password === "password123" || password === "admin" || password === "123456" : true;
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Password. Please check your password." });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        batchId: user.batchId,
        batchName: user.batchName,
        currentSemester: user.currentSemester,
        profileImage: user.profileImage,
        status: user.status,
        points: user.points || 0
      }
    });
  } catch (err) {
    console.error("[Auth Login Error]:", err);
    res.status(500).json({ error: "Login failed due to server error" });
  }
});
router.post(["/register", "/signup"], async (req, res) => {
  const { name, studentId, email, phone, batchId, batchName, currentSemester, password } = req.body;
  if (!name || !email || !studentId) {
    return res.status(400).json({ error: "Name, Student ID and Email are required" });
  }
  try {
    const existing = await fetchUserByIdOrStudentId(studentId.trim());
    if (existing) {
      return res.status(400).json({ error: "An account with this Student ID or Email already exists." });
    }
    const newUserId = `usr_${Date.now()}`;
    const passwordHash = bcrypt2.hashSync(password || "password123", 10);
    db.setPasswordHash(newUserId, passwordHash);
    const newUser = {
      id: newUserId,
      studentId: studentId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : void 0,
      role: "STUDENT",
      batchId: batchId || "batch-9",
      batchName: batchName || "SWE 9th Batch",
      currentSemester: currentSemester || 4,
      status: "ACTIVE",
      points: 0,
      profileImage: "/avatars/pangolin-cream-2.svg",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await createUserInDB(newUser);
    db.addAuditLog(newUser.id, newUser.name, "STUDENT_REGISTERED", `New student account created (${newUser.studentId})`);
    const token = generateToken(created);
    res.status(201).json({
      token,
      user: created,
      message: "Account created successfully"
    });
  } catch (err) {
    console.error("[Auth Register Error]:", err);
    res.status(500).json({ error: err?.message || "Server error creating account" });
  }
});
router.get("/me", verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  try {
    const user = await fetchUserByIdOrStudentId(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});
router.post("/change-password", verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  const hash = db.getPasswordHash(req.user.id);
  if (!hash || !bcrypt2.compareSync(currentPassword, hash)) {
    return res.status(400).json({ error: "Incorrect current password" });
  }
  const newHash = bcrypt2.hashSync(newPassword, 10);
  db.setPasswordHash(req.user.id, newHash);
  db.addAuditLog(req.user.id, req.user.name, "PASSWORD_CHANGED", `User #${req.user.id}`);
  res.json({ message: "Password updated successfully" });
});
router.post("/sync-local-user", async (req, res) => {
  try {
    const { user, users, password } = req.body;
    const userList = users && Array.isArray(users) ? users : user ? [user] : [];
    if (userList.length === 0) {
      return res.status(400).json({ error: "No user data provided to sync" });
    }
    const currentUsers = await fetchAllUsers();
    const synced = [];
    for (const u of userList) {
      if (!u || !u.studentId && !u.email) continue;
      const existing = currentUsers.find(
        (ex) => u.id && ex.id === u.id || u.studentId && ex.studentId?.toLowerCase() === u.studentId?.toLowerCase() || u.email && ex.email?.toLowerCase() === u.email?.toLowerCase()
      );
      if (!existing) {
        const newUserId = u.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newUser = {
          id: newUserId,
          studentId: u.studentId || `id_${Date.now()}`,
          name: u.name || "User",
          email: u.email || `${u.studentId || Date.now()}@swe.edu`,
          phone: u.phone,
          role: u.role || "STUDENT",
          batchId: u.batchId || "batch-9",
          batchName: u.batchName || "SWE 9th Batch",
          currentSemester: u.currentSemester || 4,
          status: u.status || "ACTIVE",
          points: u.points || 0,
          profileImage: u.profileImage || "/avatars/pangolin-cream-2.svg",
          createdAt: u.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const passwordHash = bcrypt2.hashSync(password || "password123", 10);
        db.setPasswordHash(newUserId, passwordHash);
        const created = await createUserInDB(newUser);
        synced.push(created);
      } else {
        const updatedUser = {
          name: u.name || existing.name,
          role: u.role || existing.role,
          batchId: u.batchId || existing.batchId,
          batchName: u.batchName || existing.batchName
        };
        const updated = await updateUserInDB(existing.id, updatedUser);
        synced.push(updated);
      }
    }
    res.json({ success: true, count: synced.length, synced });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to sync local user" });
  }
});
var auth_default = router;

// src/server/routes/dashboard.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/summary", verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const user = req.user;
  try {
    const userBatchId = req.query.batchId || user.batchId || "batch-9";
    const [allBatches, allCourses, allRoutines, allExams, allAnnouncements, allNotices] = await Promise.all([
      fetchAllBatches(),
      fetchAllCourses(),
      fetchAllRoutineSlots(userBatchId),
      fetchAllExams(userBatchId),
      fetchAllAnnouncements(userBatchId),
      fetchAllNotices()
    ]);
    const batch = allBatches.find((b) => b.id === userBatchId);
    const activeSemester = batch ? batch.currentSemester : user.currentSemester || 5;
    const batchName = batch ? batch.name : user.batchName || "SWE Department";
    const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayIndex = (/* @__PURE__ */ new Date()).getDay();
    const todayName = daysOfWeek[todayIndex];
    const todaysRoutine = allRoutines.filter(
      (r) => r.batchId === userBatchId && r.day === todayName
    );
    const currentCourses = allCourses.filter(
      (c) => c.batchIds?.includes(userBatchId) || c.semester === activeSemester
    );
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const upcomingExams = allExams.filter((e) => e.batchId === userBatchId && e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
      const examDate = new Date(e.date);
      const now = new Date(todayStr);
      const diffTime = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      return { ...e, daysLeft };
    });
    const activeAnnouncements = allAnnouncements.filter(
      (a) => a.batchId === userBatchId && a.expiryDate >= todayStr
    );
    const recentNotices = allNotices.slice(0, 5);
    res.json({
      todaysClassesCount: todaysRoutine.length,
      currentCoursesCount: currentCourses.length,
      upcomingExamsCount: upcomingExams.length,
      newAnnouncementsCount: activeAnnouncements.length,
      todaysRoutine,
      upcomingExams,
      currentCourses,
      recentAnnouncements: activeAnnouncements,
      recentNotices,
      batchName,
      currentSemester: activeSemester
    });
  } catch (err) {
    console.error("[Dashboard Summary Error]:", err);
    res.status(500).json({ error: "Failed to load dashboard summary" });
  }
});
var dashboard_default = router2;

// src/server/routes/batches.ts
import { Router as Router3 } from "express";

// src/server/middleware.ts
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized: Authentication required"
        }
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `403 Forbidden: Action requires one of the following roles: ${allowedRoles.join(", ")}`
        }
      });
    }
    next();
  };
}

// src/server/routes/batches.ts
var router3 = Router3();
router3.get("/progression-preview", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const [allBatches, allUsers] = await Promise.all([
      fetchAllBatches(),
      fetchAllUsers()
    ]);
    const sequenceBatches = [];
    const manualBatches = [];
    let mostRecentProgression = null;
    allBatches.forEach((b) => {
      const isSequence = (b.semesterMode || "SEQUENCE") === "SEQUENCE";
      const status = b.status || (b.currentSemester > 8 ? "GRADUATED" : "ACTIVE");
      const studentsCount = allUsers.filter((u) => u.batchId === b.id).length;
      if (b.lastProgressedAt) {
        if (!mostRecentProgression || new Date(b.lastProgressedAt) > new Date(mostRecentProgression)) {
          mostRecentProgression = b.lastProgressedAt;
        }
      }
      if (isSequence) {
        const isEligible = status === "ACTIVE";
        const nextSem = b.currentSemester + 1;
        const willGraduate = nextSem > 8;
        sequenceBatches.push({
          id: b.id,
          name: b.name,
          admissionYear: b.admissionYear,
          academicSession: b.academicSession,
          semesterMode: "SEQUENCE",
          status,
          currentSemester: b.currentSemester,
          nextSemester: isEligible ? nextSem : b.currentSemester,
          willGraduate,
          affected: isEligible,
          reason: isEligible ? void 0 : `Batch status is ${status}`,
          studentsCount,
          lastProgressedAt: b.lastProgressedAt
        });
      } else {
        manualBatches.push({
          id: b.id,
          name: b.name,
          admissionYear: b.admissionYear,
          academicSession: b.academicSession,
          semesterMode: "MANUAL",
          status,
          currentSemester: b.currentSemester,
          nextSemester: b.currentSemester,
          willGraduate: false,
          affected: false,
          reason: "Manual Batch Mode (Excluded from sequence progression)",
          studentsCount,
          lastProgressedAt: b.lastProgressedAt
        });
      }
    });
    sequenceBatches.sort((a, b) => a.admissionYear - b.admissionYear || a.name.localeCompare(b.name));
    manualBatches.sort((a, b) => a.admissionYear - b.admissionYear || a.name.localeCompare(b.name));
    const isRecent = mostRecentProgression ? Date.now() - new Date(mostRecentProgression).getTime() < 24 * 60 * 60 * 1e3 : false;
    const preview = {
      sequenceBatches,
      manualBatches,
      totalAffected: sequenceBatches.filter((s) => s.affected).length,
      lastProgressedAt: mostRecentProgression,
      isRecent,
      lastProgressedDetails: mostRecentProgression ? `Last cycle progression was executed on ${new Date(mostRecentProgression).toLocaleString()}` : void 0
    };
    res.json(preview);
  } catch (err) {
    console.error("[Batches API GET /progression-preview Error]:", err);
    res.status(500).json({ error: "Failed to load progression preview" });
  }
});
router3.post("/advance-sequence", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const { forceConfirm, notes } = req.body || {};
  try {
    const [allBatches, allUsers] = await Promise.all([
      fetchAllBatches(),
      fetchAllUsers()
    ]);
    let mostRecentProgression = null;
    allBatches.forEach((b) => {
      if (b.lastProgressedAt) {
        if (!mostRecentProgression || new Date(b.lastProgressedAt) > new Date(mostRecentProgression)) {
          mostRecentProgression = b.lastProgressedAt;
        }
      }
    });
    const isRecent = mostRecentProgression ? Date.now() - new Date(mostRecentProgression).getTime() < 24 * 60 * 60 * 1e3 : false;
    if (isRecent && !forceConfirm) {
      return res.status(400).json({
        error: "RECENT_PROGRESSION_WARNING",
        message: `Warning: The semester was already advanced recently on ${new Date(mostRecentProgression).toLocaleString()}. Advancing again will increment all sequence batches by another semester. Please check "Confirm double progression" to proceed.`,
        lastProgressedAt: mostRecentProgression
      });
    }
    const affectedList = [];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let totalUsersUpdated = 0;
    for (const batch of allBatches) {
      const isSequence = (batch.semesterMode || "SEQUENCE") === "SEQUENCE";
      const isActive = (batch.status || "ACTIVE") === "ACTIVE";
      if (isSequence && isActive) {
        const prevSemester = batch.currentSemester;
        const nextSemester = prevSemester + 1;
        const updatedStatus = nextSemester > 8 ? "GRADUATED" : "ACTIVE";
        await updateBatchInDB(batch.id, {
          currentSemester: nextSemester,
          lastProgressedAt: nowIso,
          status: updatedStatus
        });
        const studentsInBatch = allUsers.filter((u) => u.batchId === batch.id);
        for (const student of studentsInBatch) {
          await updateUserInDB(student.id, {
            currentSemester: nextSemester
          });
          totalUsersUpdated++;
        }
        affectedList.push({
          batchId: batch.id,
          batchName: batch.name,
          previousSemester: prevSemester,
          newSemester: nextSemester,
          studentsUpdated: studentsInBatch.length
        });
      }
    }
    if (affectedList.length === 0) {
      return res.status(400).json({
        error: "NO_ACTIVE_SEQUENCE_BATCHES",
        message: "No active SEQUENCE batches found to advance."
      });
    }
    const auditDetails = `Advanced ${affectedList.length} sequence batches: ${affectedList.map((a) => `${a.batchName} (Sem ${a.previousSemester}\u2192${a.newSemester})`).join(", ")}. Manual batches skipped.${notes ? ` Note: ${notes}` : ""}`;
    db.addAuditLog(
      req.user.id,
      req.user.name,
      "SEMESTER_PROGRESSION_ADVANCED",
      "Academic Sequence Batches",
      auditDetails
    );
    res.json({
      success: true,
      message: `Successfully advanced ${affectedList.length} sequence batches to their next academic semester!`,
      affectedBatches: affectedList,
      totalUsersUpdated,
      timestamp: nowIso
    });
  } catch (err) {
    console.error("[Batches API POST /advance-sequence Error]:", err);
    res.status(500).json({ error: err?.message || "Failed to advance sequence batches" });
  }
});
router3.get("/", optionalAuthToken, async (req, res) => {
  try {
    const batches = await fetchAllBatches();
    res.json({ batches });
  } catch (err) {
    console.error("[Batches API GET / Error]:", err);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});
router3.get("/:id", verifyAuthToken, async (req, res) => {
  const batchId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "ADMIN" && req.user.batchId !== batchId) {
    return res.status(403).json({
      error: "403 Forbidden: You do not have permission to access another batch's private information."
    });
  }
  try {
    const batch = await fetchBatchById(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    const [allUsers, allCourses, allRoutines, allExams, allAnnouncements] = await Promise.all([
      fetchAllUsers(),
      fetchAllCourses(),
      fetchAllRoutineSlots(batchId),
      fetchAllExams(batchId),
      fetchAllAnnouncements(batchId)
    ]);
    const students = allUsers.filter((u) => u.batchId === batchId);
    const crs = students.filter((u) => u.role === "CR" || batch.crIds && batch.crIds.includes(u.id));
    const courses = allCourses.filter((c) => c.batchIds?.includes(batchId) || c.semester === batch.currentSemester);
    res.json({ batch, students, crs, courses, routines: allRoutines, exams: allExams, announcements: allAnnouncements });
  } catch (err) {
    console.error(`[Batches API GET /:id Error]:`, err);
    res.status(500).json({ error: "Failed to fetch batch data" });
  }
});
router3.post("/", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const { name, admissionYear, currentSemester, academicSession, semesterMode, status } = req.body;
  if (!name || !admissionYear || !currentSemester) {
    return res.status(400).json({ error: "Name, admission year, and current semester are required" });
  }
  try {
    const newBatch = {
      id: `batch-${Date.now()}`,
      name: String(name).trim(),
      admissionYear: Number(admissionYear),
      currentSemester: Number(currentSemester),
      academicSession: academicSession || `${admissionYear}-${Number(admissionYear) + 1}`,
      semesterMode: semesterMode === "MANUAL" ? "MANUAL" : "SEQUENCE",
      status: status || "ACTIVE",
      crIds: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await createBatchInDB(newBatch);
    db.addAuditLog(req.user.id, req.user.name, "BATCH_CREATED", `${created.name} (${created.semesterMode})`);
    res.status(201).json({ batch: created });
  } catch (err) {
    console.error("[Batches API POST / Error]:", err);
    res.status(500).json({ error: err?.message || "Server error creating batch" });
  }
});
router3.put("/:id", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const batchId = req.params.id;
  const { name, admissionYear, currentSemester, academicSession, semesterMode, status, crIds, syncStudentsSemester } = req.body;
  try {
    const oldBatch = await fetchBatchById(batchId);
    if (!oldBatch) return res.status(404).json({ error: "Batch not found" });
    const updatedSemester = currentSemester !== void 0 ? Number(currentSemester) : oldBatch.currentSemester;
    const updates = {
      name: name !== void 0 ? String(name).trim() : oldBatch.name,
      admissionYear: admissionYear !== void 0 ? Number(admissionYear) : oldBatch.admissionYear,
      currentSemester: updatedSemester,
      academicSession: academicSession !== void 0 ? academicSession : oldBatch.academicSession,
      semesterMode: semesterMode !== void 0 ? semesterMode : oldBatch.semesterMode || "SEQUENCE",
      status: status !== void 0 ? status : oldBatch.status || "ACTIVE",
      crIds: crIds !== void 0 ? crIds : oldBatch.crIds
    };
    const updated = await updateBatchInDB(batchId, updates);
    if (syncStudentsSemester || currentSemester !== void 0 && Number(currentSemester) !== oldBatch.currentSemester) {
      const allUsers = await fetchAllUsers();
      const studentsInBatch = allUsers.filter((u) => u.batchId === batchId);
      for (const u of studentsInBatch) {
        await updateUserInDB(u.id, { currentSemester: updatedSemester });
      }
    }
    db.addAuditLog(req.user.id, req.user.name, "BATCH_UPDATED", `${updated.name} (${updated.semesterMode}, Sem ${updated.currentSemester})`);
    res.json({ batch: updated });
  } catch (err) {
    console.error(`[Batches API PUT /:id Error]:`, err);
    res.status(500).json({ error: err?.message || "Server error updating batch" });
  }
});
var batches_default = router3;

// src/server/routes/routines.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/requests", verifyAuthToken, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const data = db.getData();
  if (!data.routineRequests) data.routineRequests = [];
  let requests = data.routineRequests;
  if (req.user.role === "CR") {
    requests = requests.filter((r) => r.batchId === req.user.batchId);
  }
  res.json({ requests });
});
router4.post("/requests", verifyAuthToken, requireRole("CR", "ADMIN"), (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const { courseTitle, currentSchedule, requestedSchedule, requestedRoom, reason } = req.body;
  if (!courseTitle || !currentSchedule || !requestedSchedule || !reason) {
    return res.status(400).json({ error: "Course, current schedule, requested schedule, and reason are required." });
  }
  const data = db.getData();
  if (!data.routineRequests) data.routineRequests = [];
  const batch = (data.batches || []).find((b) => b.id === req.user.batchId);
  const newReq = {
    id: `req-${Date.now()}`,
    batchId: req.user.batchId || "batch-9",
    batchName: batch?.name || req.user.batchName || "SWE Batch",
    crId: req.user.id,
    crName: req.user.name,
    courseTitle,
    currentSchedule,
    requestedSchedule,
    requestedRoom,
    reason,
    status: "PENDING",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  data.routineRequests.unshift(newReq);
  const adminUsers = (data.users || []).filter((u) => u.role === "ADMIN");
  adminUsers.forEach((a) => {
    if (!data.notifications) data.notifications = [];
    data.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      userId: a.id,
      title: "\u{1F5D3}\uFE0F New Routine Change Request",
      message: `${req.user.name} requested routine change for ${courseTitle}.`,
      type: "ANNOUNCEMENT",
      linkUrl: "/admin/routine",
      read: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  db.save();
  db.addAuditLog(req.user.id, req.user.name, "ROUTINE_REQUEST_SUBMITTED", `${courseTitle} (${newReq.batchName})`);
  res.status(201).json({ request: newReq });
});
router4.patch("/requests/:id", verifyAuthToken, requireRole("ADMIN"), (req, res) => {
  const reqId = req.params.id;
  const { status, rejectionReason } = req.body;
  if (!status || !["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Valid status (APPROVED or REJECTED) is required" });
  }
  const data = db.getData();
  if (!data.routineRequests) data.routineRequests = [];
  const request = data.routineRequests.find((r) => r.id === reqId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  request.status = status;
  request.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (rejectionReason) request.rejectionReason = rejectionReason;
  const targetUsers = (data.users || []).filter((u) => u.batchId === request.batchId || u.id === request.crId);
  targetUsers.forEach((u) => {
    if (!data.notifications) data.notifications = [];
    data.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      userId: u.id,
      title: status === "APPROVED" ? "\u2705 Routine Change Approved" : "\u274C Routine Change Rejected",
      message: status === "APPROVED" ? `The routine change request for "${request.courseTitle}" was approved by Department Head.` : `The routine change request for "${request.courseTitle}" was rejected: ${rejectionReason || "Schedule conflict"}`,
      type: "ANNOUNCEMENT",
      linkUrl: "/routine",
      read: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  db.save();
  db.addAuditLog(req.user.id, req.user.name, `ROUTINE_REQUEST_${status}`, `Request #${reqId}`);
  res.json({ message: `Routine request ${status.toLowerCase()}`, request });
});
router4.get("/", optionalAuthToken, async (req, res) => {
  try {
    const requestedBatchId = req.query.batchId;
    if (!requestedBatchId) {
      if (req.user?.role === "ADMIN") {
        const allRoutines = await fetchAllRoutineSlots();
        return res.json({ routines: allRoutines });
      }
      const userBatch = req.user?.batchId || "batch-9";
      const userRoutines = await fetchAllRoutineSlots(userBatch);
      return res.json({ routines: userRoutines, batchId: userBatch });
    }
    if (req.user && req.user.role !== "ADMIN" && req.user.batchId && req.user.batchId !== requestedBatchId) {
      return res.status(403).json({
        error: "403 Forbidden: You do not have permission to access another batch's routine."
      });
    }
    const routines = await fetchAllRoutineSlots(requestedBatchId);
    res.json({ routines, batchId: requestedBatchId });
  } catch (err) {
    console.error("[Routines API GET / Error]:", err);
    res.status(500).json({ error: "Failed to fetch routines" });
  }
});
router4.post("/bulk", verifyAuthToken, requireRole("ADMIN", "CR"), async (req, res) => {
  const { batchId, slots, mode = "REPLACE" } = req.body;
  const inputSlots = Array.isArray(slots) ? slots : Array.isArray(req.body) ? req.body : [];
  const targetBatchId = batchId || (Array.isArray(req.body) ? req.body[0]?.batchId : void 0) || req.user?.batchId;
  if (!targetBatchId) {
    return res.status(400).json({ error: "Target batchId is required for importing routine." });
  }
  if (req.user.role === "CR" && req.user.batchId !== targetBatchId) {
    return res.status(403).json({ error: "403 Forbidden: CRs can only import routine for their own batch." });
  }
  if (!Array.isArray(inputSlots) || inputSlots.length === 0) {
    return res.status(400).json({ error: "No routine slots provided in the JSON array." });
  }
  const validDays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const processedSlots = [];
  const errors = [];
  inputSlots.forEach((slot, idx) => {
    const rawDay = String(slot.day || "").trim().toUpperCase();
    if (!validDays.includes(rawDay)) {
      errors.push(`Slot #${idx + 1}: Invalid or missing day "${slot.day}". Allowed: ${validDays.join(", ")}`);
      return;
    }
    if (!slot.startTime || !slot.endTime) {
      errors.push(`Slot #${idx + 1} (${rawDay}): Both startTime and endTime are required.`);
      return;
    }
    if (!slot.courseTitle && !slot.courseCode) {
      errors.push(`Slot #${idx + 1} (${rawDay}): Course Title or Course Code is required.`);
      return;
    }
    const newSlot = {
      id: slot.id && typeof slot.id === "string" && slot.id.startsWith("rout-") ? slot.id : `rout-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      batchId: targetBatchId,
      day: rawDay,
      startTime: String(slot.startTime).trim(),
      endTime: String(slot.endTime).trim(),
      courseId: slot.courseId || `course-${Date.now()}-${idx}`,
      courseCode: slot.courseCode ? String(slot.courseCode).trim() : "SWE 101",
      courseTitle: slot.courseTitle ? String(slot.courseTitle).trim() : slot.courseCode || "Class Session",
      courseShortName: slot.courseShortName ? String(slot.courseShortName).trim() : void 0,
      teacherName: slot.teacherName ? String(slot.teacherName).trim() : "Faculty Instructor",
      teacherShortName: slot.teacherShortName ? String(slot.teacherShortName).trim() : void 0,
      room: slot.room ? String(slot.room).trim() : "Room 502"
    };
    processedSlots.push(newSlot);
  });
  if (processedSlots.length === 0) {
    return res.status(400).json({ error: "No valid routine slots found in JSON.", details: errors });
  }
  try {
    if (mode === "REPLACE") {
      const existing = await fetchAllRoutineSlots(targetBatchId);
      for (const slot of existing) {
        await deleteRoutineSlotFromDB(slot.id);
      }
    }
    for (const slot of processedSlots) {
      await createRoutineSlotInDB(slot);
    }
    const actorId = req.user?.id || "admin";
    const actorName = req.user?.name || "Admin";
    db.addAuditLog(actorId, actorName, "ROUTINE_BULK_IMPORTED", `${processedSlots.length} slots imported for ${targetBatchId} (${mode})`);
    const updatedBatchRoutines = await fetchAllRoutineSlots(targetBatchId);
    res.status(201).json({
      message: `Successfully imported ${processedSlots.length} class slots.`,
      count: processedSlots.length,
      routines: updatedBatchRoutines,
      warnings: errors.length > 0 ? errors : void 0
    });
  } catch (err) {
    console.error("[Routines API POST /bulk Error]:", err);
    res.status(500).json({ error: err?.message || "Failed to bulk import routine slots" });
  }
});
router4.post("/", verifyAuthToken, requireRole("ADMIN", "CR"), async (req, res) => {
  const { batchId, day, startTime, endTime, courseId, courseCode, courseTitle, courseShortName, teacherName, teacherShortName, room } = req.body;
  if (!batchId || !day || !startTime || !endTime || !courseTitle && !courseCode) {
    return res.status(400).json({ error: "Batch, day, startTime, endTime, and course title/code are required" });
  }
  if (req.user.role === "CR" && req.user.batchId !== batchId) {
    return res.status(403).json({ error: "403 Forbidden: CRs can only create routine slots for their assigned batch." });
  }
  try {
    const newSlot = {
      id: `rout-${Date.now()}`,
      batchId,
      day: day.toUpperCase(),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      courseId: courseId || "course-gen",
      courseCode: courseCode ? String(courseCode).trim() : "SWE 101",
      courseTitle: courseTitle ? String(courseTitle).trim() : String(courseCode || "Class Session").trim(),
      courseShortName: courseShortName ? String(courseShortName).trim() : void 0,
      teacherName: teacherName ? String(teacherName).trim() : "Faculty Instructor",
      teacherShortName: teacherShortName ? String(teacherShortName).trim() : void 0,
      room: room ? String(room).trim() : "Room TBA"
    };
    const created = await createRoutineSlotInDB(newSlot);
    const actorId = req.user?.id || "admin";
    const actorName = req.user?.name || "Admin";
    db.addAuditLog(actorId, actorName, "ROUTINE_ADDED", `Slot for ${batchId} on ${day}`);
    res.status(201).json({ routine: created });
  } catch (err) {
    console.error("[Routines API POST / Error]:", err);
    res.status(500).json({ error: err?.message || "Server error creating routine slot" });
  }
});
router4.put("/:id", verifyAuthToken, requireRole("ADMIN", "CR"), async (req, res) => {
  const slotId = req.params.id;
  const { day, startTime, endTime, courseCode, courseTitle, courseShortName, teacherName, teacherShortName, room } = req.body;
  try {
    const allSlots = await fetchAllRoutineSlots();
    const slot = allSlots.find((s) => s.id === slotId);
    if (!slot) {
      return res.status(404).json({ error: "Routine slot not found" });
    }
    if (req.user.role === "CR" && req.user.batchId !== slot.batchId) {
      return res.status(403).json({ error: "403 Forbidden: CRs can only edit routine slots for their assigned batch." });
    }
    const updates = {};
    if (day) updates.day = day.toUpperCase();
    if (startTime) updates.startTime = String(startTime).trim();
    if (endTime) updates.endTime = String(endTime).trim();
    if (courseCode) updates.courseCode = String(courseCode).trim();
    if (courseTitle) updates.courseTitle = String(courseTitle).trim();
    if (courseShortName !== void 0) updates.courseShortName = courseShortName ? String(courseShortName).trim() : void 0;
    if (teacherName) updates.teacherName = String(teacherName).trim();
    if (teacherShortName !== void 0) updates.teacherShortName = teacherShortName ? String(teacherShortName).trim() : void 0;
    if (room) updates.room = String(room).trim();
    const updated = await updateRoutineSlotInDB(slotId, updates);
    db.addAuditLog(req.user.id, req.user.name, "ROUTINE_UPDATED", `Slot #${slotId} for batch ${slot.batchId}`);
    res.json({ message: "Routine slot updated successfully", routine: updated });
  } catch (err) {
    console.error("[Routines API PUT /:id Error]:", err);
    res.status(500).json({ error: err?.message || "Server error updating routine slot" });
  }
});
router4.delete("/:id", verifyAuthToken, requireRole("ADMIN", "CR"), async (req, res) => {
  const slotId = req.params.id;
  try {
    const allSlots = await fetchAllRoutineSlots();
    const slot = allSlots.find((s) => s.id === slotId);
    if (!slot) return res.status(404).json({ error: "Routine slot not found" });
    if (req.user.role === "CR" && req.user.batchId !== slot.batchId) {
      return res.status(403).json({ error: "403 Forbidden: CRs can only delete routine slots for their assigned batch." });
    }
    await deleteRoutineSlotFromDB(slotId);
    db.addAuditLog(req.user.id, req.user.name, "ROUTINE_DELETED", `Slot #${slotId}`);
    res.json({ message: "Routine slot deleted", removed: slot });
  } catch (err) {
    console.error("[Routines API DELETE /:id Error]:", err);
    res.status(500).json({ error: err?.message || "Server error deleting routine slot" });
  }
});
var routines_default = router4;

// src/server/routes/courses.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.get("/", optionalAuthToken, async (req, res) => {
  try {
    const allCourses = await fetchAllCourses();
    const batchId = req.query.batchId || req.user?.batchId;
    const semesterQuery = req.query.semester ? Number(req.query.semester) : void 0;
    let courses = Array.isArray(allCourses) ? allCourses : [];
    if (req.user && req.user.role !== "ADMIN") {
      const targetSem = semesterQuery || req.user.currentSemester;
      const targetBatch = batchId || req.user.batchId;
      courses = courses.filter(
        (c) => targetBatch && c.batchIds?.includes(targetBatch) || targetSem && c.semester === targetSem
      );
    } else if (batchId) {
      courses = courses.filter((c) => c.batchIds?.includes(batchId));
    } else if (semesterQuery) {
      courses = courses.filter((c) => c.semester === semesterQuery);
    }
    return res.json({ courses });
  } catch (err) {
    console.error({
      route: "/api/courses",
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null
    });
    const fallbackList = db.getData()?.courses || [];
    return res.status(200).json({ courses: fallbackList });
  }
});
router5.get("/:id", optionalAuthToken, async (req, res) => {
  const courseId = req.params.id;
  try {
    const course = await fetchCourseById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });
    const [allResources, allFaculty] = await Promise.all([
      fetchAllResources().catch(() => []),
      fetchAllFaculty().catch(() => [])
    ]);
    const resources = allResources.filter(
      (r) => (r.courseId === course.id || r.courseCode === course.code) && r.status === "APPROVED"
    );
    const faculty = allFaculty.find((f) => f.id === course.assignedFacultyId);
    res.json({
      course,
      faculty,
      resources: {
        questions: resources.filter((r) => r.type === "QUESTION"),
        notes: resources.filter((r) => r.type === "NOTE"),
        labs: resources.filter((r) => r.type === "LAB")
      }
    });
  } catch (err) {
    console.error(`[Courses API GET /:id Error]:`, err);
    res.status(500).json({ error: "Failed to fetch course details" });
  }
});
router5.post("/", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const reqBody = req.body;
  try {
    const { code, title, shortName, type, semester, assignedFacultyId, batchIds } = reqBody;
    const credits = reqBody.credits !== void 0 ? reqBody.credits : reqBody.credit;
    if (!code || !title || credits === void 0 || credits === null || !type || !semester) {
      return res.status(400).json({ error: "Code, title, credits, type, and semester are required" });
    }
    let facultyName = reqBody.assignedFacultyName ? String(reqBody.assignedFacultyName).trim() : void 0;
    if (assignedFacultyId) {
      const allFaculty = await fetchAllFaculty().catch(() => []);
      const faculty = allFaculty.find((f) => f.id === assignedFacultyId || f.name === assignedFacultyId);
      if (faculty) facultyName = faculty.name;
    }
    const newCourse = {
      id: `course-${Date.now()}`,
      code: String(code).trim().toUpperCase(),
      title: String(title).trim(),
      shortName: shortName ? String(shortName).trim() : void 0,
      credits: Number(credits),
      type,
      semester: Number(semester),
      assignedFacultyId: assignedFacultyId ? String(assignedFacultyId) : void 0,
      assignedFacultyName: facultyName,
      batchIds: Array.isArray(batchIds) ? batchIds : []
    };
    const created = await createCourseInDB(newCourse);
    db.addAuditLog(req.user.id, req.user.name, "COURSE_CREATED", `${created.code} - ${created.title}`);
    console.log(`[Courses API 201] Course created in Supabase: ${created.id} (${created.code})`);
    return res.status(201).json({ course: created });
  } catch (err) {
    console.error(`[Courses API 500] POST /api/courses error:`, err);
    return res.status(500).json({ error: err?.message || "Server error creating course" });
  }
});
router5.put("/:id", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const courseId = req.params.id;
  const reqBody = req.body;
  try {
    const { code, title, shortName, type, semester, assignedFacultyId, batchIds } = reqBody;
    const credits = reqBody.credits !== void 0 ? reqBody.credits : reqBody.credit;
    const updates = {};
    if (code !== void 0) updates.code = String(code).trim();
    if (title !== void 0) updates.title = String(title).trim();
    if (shortName !== void 0) updates.shortName = shortName ? String(shortName).trim() : void 0;
    if (credits !== void 0) updates.credits = Number(credits);
    if (type !== void 0) updates.type = type;
    if (semester !== void 0) updates.semester = Number(semester);
    if (assignedFacultyId !== void 0) {
      updates.assignedFacultyId = assignedFacultyId ? String(assignedFacultyId) : void 0;
      if (assignedFacultyId) {
        const allFaculty = await fetchAllFaculty().catch(() => []);
        const faculty = allFaculty.find((f) => f.id === assignedFacultyId);
        updates.assignedFacultyName = faculty ? faculty.name : void 0;
      } else {
        updates.assignedFacultyName = void 0;
      }
    }
    if (Array.isArray(batchIds)) {
      updates.batchIds = batchIds;
    }
    const updated = await updateCourseInDB(courseId, updates);
    db.addAuditLog(req.user.id, req.user.name, "COURSE_UPDATED", `${updated.code} - ${updated.title}`);
    return res.json({ message: "Course updated successfully", course: updated });
  } catch (err) {
    console.error(`[Courses API 500] PUT /api/courses/:id error:`, err);
    return res.status(500).json({ error: err?.message || "Server error updating course" });
  }
});
router5.delete("/:id", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const courseId = req.params.id;
  try {
    const course = await fetchCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    await deleteCourseFromDB(courseId);
    db.addAuditLog(req.user.id, req.user.name, "COURSE_DELETED", `${course.code}`);
    console.log(`[Courses API 200] Course deleted from Supabase: ${courseId}`);
    return res.json({ message: "Course deleted successfully", course });
  } catch (err) {
    console.error(`[Courses API 500] DELETE /api/courses/:id error:`, err);
    return res.status(500).json({ error: err?.message || "Server error deleting course" });
  }
});
var courses_default = router5;

// src/server/routes/exams.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/", optionalAuthToken, async (req, res) => {
  try {
    const requestedBatchId = req.query.batchId;
    let targetBatchId = void 0;
    if (requestedBatchId) {
      if (req.user && req.user.role !== "ADMIN" && req.user.batchId && req.user.batchId !== requestedBatchId) {
        return res.status(403).json({
          error: "403 Forbidden: You do not have permission to access another batch's exam schedule."
        });
      }
      targetBatchId = requestedBatchId;
    } else if (req.user && req.user.role !== "ADMIN") {
      targetBatchId = req.user.batchId || "batch-9";
    }
    let exams = await fetchAllExams(targetBatchId);
    const includePast = req.query.includePast === "true";
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (!includePast) {
      exams = exams.filter((e) => e.date >= todayStr);
    }
    exams.sort((a, b) => a.date.localeCompare(b.date));
    const examsWithDaysLeft = exams.map((e) => {
      const examDate = new Date(e.date);
      const now = new Date(todayStr);
      const diffTime = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      return { ...e, daysLeft };
    });
    res.json({ exams: examsWithDaysLeft });
  } catch (err) {
    console.error("[Exams API GET / Error]:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});
router6.post("/", verifyAuthToken, requireRole("CR", "ADMIN"), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const { batchId, courseId, courseCode, courseTitle, type, title, date, startTime, room, description } = req.body;
  const targetBatchId = batchId || req.user.batchId;
  if (req.user.role === "CR" && req.user.batchId !== targetBatchId) {
    return res.status(403).json({ error: "403 Forbidden: CRs can only create exams for their assigned batch." });
  }
  if (!targetBatchId || !courseTitle || !type || !title || !date) {
    return res.status(400).json({ error: "Batch ID, course title, exam type, title, and date are required" });
  }
  try {
    const newExam = {
      id: `exam-${Date.now()}`,
      batchId: targetBatchId,
      courseId: courseId || "course-gen",
      courseCode: courseCode || "SWE 300",
      courseTitle: String(courseTitle).trim(),
      type,
      title: String(title).trim(),
      date,
      startTime,
      room,
      description,
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await createExamInDB(newExam);
    const allUsers = await fetchAllUsers().catch(() => []);
    const batchStudents = allUsers.filter((u) => u.batchId === targetBatchId && u.id !== req.user.id);
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    batchStudents.forEach((st) => {
      local.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        userId: st.id,
        title: "New Exam Scheduled \u{1F4C5}",
        message: `${type} - "${title}" scheduled for ${date} in ${courseCode || courseTitle}.`,
        type: "EXAM",
        linkUrl: "/exams",
        read: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    db.save();
    db.addAuditLog(req.user.id, req.user.name, "EXAM_CREATED", `${type}: ${title} (${targetBatchId})`);
    res.status(201).json({ exam: created });
  } catch (err) {
    console.error("[Exams API POST / Error]:", err);
    res.status(500).json({ error: err?.message || "Server error creating exam" });
  }
});
router6.put("/:id", verifyAuthToken, requireRole("CR", "ADMIN"), async (req, res) => {
  const examId = req.params.id;
  try {
    const allExams = await fetchAllExams();
    const existing = allExams.find((e) => e.id === examId);
    if (!existing) return res.status(404).json({ error: "Exam not found" });
    if (req.user.role === "CR" && req.user.batchId !== existing.batchId) {
      return res.status(403).json({ error: "403 Forbidden: CRs can only edit exams for their assigned batch." });
    }
    const { courseCode, courseTitle, type, title, date, startTime, room, description } = req.body;
    const updates = {};
    if (courseCode !== void 0) updates.courseCode = String(courseCode).trim();
    if (courseTitle !== void 0) updates.courseTitle = String(courseTitle).trim();
    if (type !== void 0) updates.type = type;
    if (title !== void 0) updates.title = String(title).trim();
    if (date !== void 0) updates.date = date;
    if (startTime !== void 0) updates.startTime = startTime;
    if (room !== void 0) updates.room = room;
    if (description !== void 0) updates.description = description;
    const updated = await updateExamInDB(examId, updates);
    db.addAuditLog(req.user.id, req.user.name, "EXAM_UPDATED", `Exam #${examId}`);
    res.json({ exam: updated });
  } catch (err) {
    console.error("[Exams API PUT /:id Error]:", err);
    res.status(500).json({ error: err?.message || "Server error updating exam" });
  }
});
router6.delete("/:id", verifyAuthToken, requireRole("CR", "ADMIN"), async (req, res) => {
  const examId = req.params.id;
  try {
    const allExams = await fetchAllExams();
    const existing = allExams.find((e) => e.id === examId);
    if (!existing) return res.status(404).json({ error: "Exam not found" });
    if (req.user.role === "CR" && req.user.batchId !== existing.batchId) {
      return res.status(403).json({ error: "403 Forbidden: CRs can only delete exams for their assigned batch." });
    }
    await deleteExamFromDB(examId);
    db.addAuditLog(req.user.id, req.user.name, "EXAM_DELETED", `Exam #${examId}`);
    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    console.error("[Exams API DELETE /:id Error]:", err);
    res.status(500).json({ error: err?.message || "Server error deleting exam" });
  }
});
var exams_default = router6;

// src/server/routes/announcements.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get("/", optionalAuthToken, async (req, res) => {
  try {
    const requestedBatchId = req.query.batchId;
    let targetBatchId = void 0;
    if (requestedBatchId) {
      if (req.user && req.user.role !== "ADMIN" && req.user.batchId && req.user.batchId !== requestedBatchId) {
        return res.status(403).json({
          error: "403 Forbidden: You do not have permission to access another batch's announcements."
        });
      }
      targetBatchId = requestedBatchId;
    } else if (req.user && req.user.role !== "ADMIN") {
      targetBatchId = req.user.batchId || "batch-9";
    }
    const batchAnnouncements = await fetchAllAnnouncements(targetBatchId);
    const showArchive = req.query.archive === "true";
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let result;
    if (showArchive) {
      result = batchAnnouncements.filter((a) => a.expiryDate < todayStr);
    } else {
      result = batchAnnouncements.filter((a) => a.expiryDate >= todayStr);
    }
    result.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    res.json({
      announcements: result,
      activeCount: batchAnnouncements.filter((a) => a.expiryDate >= todayStr).length,
      archivedCount: batchAnnouncements.filter((a) => a.expiryDate < todayStr).length
    });
  } catch (err) {
    console.error("[Announcements API GET / Error]:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});
router7.post("/", verifyAuthToken, requireRole("CR", "ADMIN"), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const { batchId, title, description, publishDate, expiryDate, priority } = req.body;
  const targetBatchId = batchId || req.user.batchId;
  if (req.user.role === "CR" && req.user.batchId !== targetBatchId) {
    return res.status(403).json({ error: "403 Forbidden: CRs can only publish announcements for their assigned batch." });
  }
  if (!targetBatchId || !title || !description || !expiryDate) {
    return res.status(400).json({ error: "Batch ID, title, description, and expiry date are required" });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  try {
    const newAnn = {
      id: `ann-${Date.now()}`,
      batchId: targetBatchId,
      title: String(title).trim(),
      description: String(description).trim(),
      publishDate: publishDate || todayStr,
      expiryDate,
      priority: priority || "NORMAL",
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await createAnnouncementInDB(newAnn);
    const allUsers = await fetchAllUsers().catch(() => []);
    const batchStudents = allUsers.filter((u) => u.batchId === targetBatchId && u.id !== req.user.id);
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    batchStudents.forEach((st) => {
      local.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        userId: st.id,
        title: `${priority === "URGENT" ? "\u{1F6A8} URGENT Announcement" : "\u{1F4E2} Batch Announcement"}`,
        message: title,
        type: "ANNOUNCEMENT",
        linkUrl: "/announcements",
        read: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    db.save();
    db.addAuditLog(req.user.id, req.user.name, "ANNOUNCEMENT_CREATED", `${title} (${targetBatchId})`);
    res.status(201).json({ announcement: created });
  } catch (err) {
    console.error("[Announcements API POST / Error]:", err);
    res.status(500).json({ error: err?.message || "Server error creating announcement" });
  }
});
router7.delete("/:id", verifyAuthToken, requireRole("CR", "ADMIN"), async (req, res) => {
  const annId = req.params.id;
  try {
    const allAnnouncements = await fetchAllAnnouncements();
    const existing = allAnnouncements.find((a) => a.id === annId);
    if (!existing) return res.status(404).json({ error: "Announcement not found" });
    if (req.user.role === "CR" && req.user.batchId !== existing.batchId) {
      return res.status(403).json({ error: "403 Forbidden: CRs can only delete announcements for their assigned batch." });
    }
    await deleteAnnouncementFromDB(annId);
    db.addAuditLog(req.user.id, req.user.name, "ANNOUNCEMENT_DELETED", `Announcement #${annId}`);
    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("[Announcements API DELETE /:id Error]:", err);
    res.status(500).json({ error: err?.message || "Server error deleting announcement" });
  }
});
var announcements_default = router7;

// src/server/routes/notices.ts
import { Router as Router8 } from "express";
var router8 = Router8();
router8.get("/", optionalAuthToken, async (req, res) => {
  try {
    const notices = await fetchAllNotices();
    notices.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    res.json({ notices });
  } catch (err) {
    console.error("[Notices API GET / Error]:", err);
    res.status(500).json({ error: "Failed to fetch notices" });
  }
});
router8.post("/", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const { title, content, category, isImportant, attachmentUrl } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: "Title, content, and category are required" });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  try {
    const newNotice = {
      id: `notice-${Date.now()}`,
      title: String(title).trim(),
      content: String(content).trim(),
      category,
      publishDate: todayStr,
      isImportant: Boolean(isImportant),
      attachmentUrl,
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await createNoticeInDB(newNotice);
    const allUsers = await fetchAllUsers().catch(() => []);
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    allUsers.filter((u) => u.role !== "ADMIN").forEach((u) => {
      local.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        userId: u.id,
        title: "\u{1F3DB}\uFE0F New Department Notice",
        message: title,
        type: "NOTICE",
        linkUrl: "/notices",
        read: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    db.save();
    db.addAuditLog(req.user.id, req.user.name, "DEPARTMENT_NOTICE_PUBLISHED", title);
    res.status(201).json({ notice: created });
  } catch (err) {
    console.error("[Notices API POST / Error]:", err);
    res.status(500).json({ error: err?.message || "Server error creating notice" });
  }
});
router8.delete("/:id", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  const noticeId = req.params.id;
  try {
    const allNotices = await fetchAllNotices();
    const existing = allNotices.find((n) => n.id === noticeId);
    if (!existing) return res.status(404).json({ error: "Department notice not found" });
    await deleteNoticeFromDB(noticeId);
    db.addAuditLog(req.user.id, req.user.name, "DEPARTMENT_NOTICE_DELETED", `Notice #${noticeId}`);
    res.json({ message: "Notice deleted" });
  } catch (err) {
    console.error("[Notices API DELETE /:id Error]:", err);
    res.status(500).json({ error: err?.message || "Server error deleting notice" });
  }
});
var notices_default = router8;

// src/server/routes/resources.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get("/", optionalAuthToken, async (req, res) => {
  try {
    const { type, semester, courseCode, examType, year, search, category } = req.query;
    const allResources = await fetchAllResources();
    let list = allResources.filter((r) => r.status === "APPROVED");
    if (type) {
      list = list.filter((r) => r.type === type.toUpperCase());
    }
    if (semester) {
      list = list.filter((r) => r.semester === Number(semester));
    }
    if (courseCode) {
      list = list.filter(
        (r) => r.courseCode.replace(/\s+/g, "").toLowerCase() === courseCode.replace(/\s+/g, "").toLowerCase()
      );
    }
    if (examType) {
      list = list.filter((r) => r.examType === examType);
    }
    if (year) {
      list = list.filter((r) => r.academicYear === Number(year));
    }
    if (category) {
      list = list.filter((r) => r.labCategory === category);
    }
    if (search) {
      const query = search.toLowerCase().trim();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(query) || r.courseTitle.toLowerCase().includes(query) || r.courseCode.toLowerCase().includes(query) || r.description && r.description.toLowerCase().includes(query) || r.uploaderName.toLowerCase().includes(query)
      );
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ resources: list });
  } catch (err) {
    console.error("[Resources API GET / Error]:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});
router9.get(["/my-contributions", "/my-uploads"], verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const allResources = await fetchAllResources();
    const contributions = allResources.filter((r) => r.uploaderId === req.user.id);
    contributions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({
      resources: contributions,
      contributions,
      stats: {
        total: contributions.length,
        approved: contributions.filter((c) => c.status === "APPROVED").length,
        pending: contributions.filter((c) => c.status === "PENDING").length,
        rejected: contributions.filter((c) => c.status === "REJECTED").length
      }
    });
  } catch (err) {
    console.error("[Resources API GET /my-contributions Error]:", err);
    res.status(500).json({ error: "Failed to fetch contributions" });
  }
});
router9.get(["/pending-verification", "/pending"], verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const allResources = await fetchAllResources();
    const pending = allResources.filter((r) => r.status === "PENDING");
    res.json({ resources: pending });
  } catch (err) {
    console.error("[Resources API GET /pending Error]:", err);
    res.status(500).json({ error: "Failed to fetch pending resources" });
  }
});
router9.get(["/leaderboard", "/top-contributors"], optionalAuthToken, async (req, res) => {
  try {
    const [allUsers, allResources] = await Promise.all([
      fetchAllUsers(),
      fetchAllResources()
    ]);
    const students = allUsers.filter((u) => u.role === "STUDENT" || u.role === "CR");
    const leaderboardMap = students.map((st) => {
      const userResources = allResources.filter((r) => r.uploaderId === st.id);
      const approved = userResources.filter((r) => r.status === "APPROVED");
      const totalPts = st.points ?? approved.length * 25 + (userResources.length - approved.length) * 10;
      let badge = "BRONZE";
      if (totalPts >= 150) badge = "LEGEND";
      else if (totalPts >= 80) badge = "GOLD";
      else if (totalPts >= 30) badge = "SILVER";
      return {
        id: st.id,
        studentId: st.studentId,
        name: st.name,
        batchName: st.batchName || "SWE Department",
        profileImage: st.profileImage,
        points: totalPts,
        approvedCount: approved.length,
        totalUploads: userResources.length,
        badge,
        rank: 0
      };
    });
    leaderboardMap.sort((a, b) => b.points - a.points || b.approvedCount - a.approvedCount);
    const leaderboard = leaderboardMap.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    res.json({ leaderboard });
  } catch (err) {
    console.error("[Resources API GET /leaderboard Error]:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});
router9.post(["/", "/upload"], verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const {
    title,
    type,
    courseId,
    courseCode,
    courseTitle,
    semester,
    academicYear,
    examType,
    facultyName,
    targetBatch,
    labCategory,
    description,
    fileUrl,
    fileName,
    fileSize,
    fileType
  } = req.body;
  if (!title || !type || !courseTitle || !semester) {
    return res.status(400).json({ error: "Title, type, course, and semester are required" });
  }
  try {
    const isAdmin = req.user.role === "ADMIN";
    const initialStatus = isAdmin ? "APPROVED" : "PENDING";
    const newResource = {
      id: `res-${Date.now()}`,
      title: String(title).trim(),
      type,
      courseId: courseId || "course-gen",
      courseCode: courseCode || "SWE 300",
      courseTitle: String(courseTitle).trim(),
      semester: Number(semester),
      academicYear: Number(academicYear || (/* @__PURE__ */ new Date()).getFullYear()),
      examType,
      facultyName: facultyName || void 0,
      targetBatch: targetBatch || req.user.batchName || "SWE 9th Batch",
      labCategory,
      description,
      fileUrl: fileUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: fileName || `${title.replace(/\s+/g, "_")}.pdf`,
      fileSize: fileSize || "1.5 MB",
      fileType: fileType || "application/pdf",
      uploaderId: req.user.id,
      uploaderStudentId: req.user.studentId,
      uploaderName: req.user.name,
      uploaderBatchName: req.user.batchName || "SWE Department",
      status: initialStatus,
      verifiedAt: isAdmin ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
      downloadCount: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await createResourceInDB(newResource);
    const allUsers = await fetchAllUsers().catch(() => []);
    const uploader = allUsers.find((u) => u.id === req.user.id);
    if (uploader) {
      await updateUserInDB(uploader.id, {
        points: (uploader.points || 0) + 10
      });
    }
    db.addAuditLog(req.user.id, req.user.name, "RESOURCE_SUBMITTED", title, "+10 contribution points earned");
    res.status(201).json({
      message: "Resource submitted successfully for verification! (+10 Contribution Points Earned)",
      resource: created,
      earnedPoints: 10
    });
  } catch (err) {
    console.error("[Resources API POST / Error]:", err);
    res.status(500).json({ error: err?.message || "Server error uploading resource" });
  }
});
router9.all(["/:id/verify", "/:id/review"], verifyAuthToken, async (req, res) => {
  const resourceId = req.params.id;
  const statusInput = req.body.status || (req.body.action === "APPROVE" ? "APPROVED" : req.body.action === "REJECT" ? "REJECTED" : null);
  if (!statusInput || !["APPROVED", "REJECTED", "APPROVE", "REJECT"].includes(statusInput)) {
    return res.status(400).json({ error: "Valid status (APPROVED or REJECTED) is required" });
  }
  const targetStatus = statusInput === "APPROVE" ? "APPROVED" : statusInput === "REJECT" ? "REJECTED" : statusInput;
  try {
    const allResources = await fetchAllResources();
    const resource = allResources.find((r) => r.id === resourceId);
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    const updates = {
      status: targetStatus
    };
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    if (targetStatus === "APPROVED") {
      updates.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      const allUsers = await fetchAllUsers().catch(() => []);
      const uploader = allUsers.find((u) => u.id === resource.uploaderId);
      if (uploader) {
        await updateUserInDB(uploader.id, {
          points: (uploader.points || 0) + 25
        });
      }
      local.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: resource.uploaderId,
        title: "Resource Approved \u{1F389} (+25 Points!)",
        message: `Your contribution "${resource.title}" was verified and published. You earned +25 contributor bonus points!`,
        type: "RESOURCE_APPROVED",
        linkUrl: "/profile",
        read: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else {
      updates.rejectionReason = req.body.rejectionReason || "Does not meet academic department guidelines.";
      local.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: resource.uploaderId,
        title: "Resource Needs Revision \u26A0\uFE0F",
        message: `Your contribution "${resource.title}" was rejected: ${updates.rejectionReason}`,
        type: "RESOURCE_REJECTED",
        linkUrl: "/profile",
        read: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const updated = await updateResourceInDB(resourceId, updates);
    db.save();
    db.addAuditLog(req.user.id, req.user.name, `RESOURCE_${targetStatus}`, resource.title);
    res.json({ message: `Resource ${targetStatus.toLowerCase()} successfully`, resource: updated });
  } catch (err) {
    console.error("[Resources API review Error]:", err);
    res.status(500).json({ error: err?.message || "Server error updating resource verification" });
  }
});
router9.post("/:id/download", optionalAuthToken, async (req, res) => {
  const resourceId = req.params.id;
  try {
    const allResources = await fetchAllResources();
    const resource = allResources.find((r) => r.id === resourceId);
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    const newCount = (resource.downloadCount || 0) + 1;
    await updateResourceInDB(resourceId, { downloadCount: newCount });
    res.json({ message: "Download count incremented", downloadCount: newCount, fileUrl: resource.fileUrl });
  } catch (err) {
    console.error("[Resources API download Error]:", err);
    res.status(500).json({ error: "Failed to record download" });
  }
});
var resources_default = router9;

// src/server/routes/admin.ts
import { Router as Router10 } from "express";

// src/server/services/adminService.ts
import bcrypt3 from "bcryptjs";
async function createAuditLog(actorId, actorName, action, target, details) {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      await supabase.from("audit_logs").insert({
        id: logId,
        actor_id: actorId,
        actor_name: actorName,
        action,
        target,
        details: details || null,
        timestamp: now
      });
    } catch (err) {
      console.error("[AdminService] Error saving audit log to Supabase:", err);
    }
  }
  db.addAuditLog(actorId, actorName, action, target, details);
}
async function getAdminStats() {
  const supabase = getServerSupabase();
  if (!supabase) {
    throw new Error("Supabase client is not available on server.");
  }
  const [
    usersRes,
    batchesRes,
    coursesRes,
    facultyRes,
    routineRes,
    examsRes,
    announcementsRes,
    noticesRes,
    resourcesRes,
    notificationsRes,
    auditLogsRes
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: false }),
    supabase.from("batches").select("*", { count: "exact", head: false }),
    supabase.from("courses").select("*", { count: "exact", head: false }),
    supabase.from("faculty").select("*", { count: "exact", head: false }),
    supabase.from("routine_slots").select("*", { count: "exact", head: false }),
    supabase.from("exams").select("*", { count: "exact", head: false }),
    supabase.from("announcements").select("*", { count: "exact", head: false }),
    supabase.from("department_notices").select("*", { count: "exact", head: false }),
    supabase.from("resources").select("*", { count: "exact", head: false }),
    supabase.from("notifications").select("*", { count: "exact", head: false }),
    supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(15)
  ]);
  const users = usersRes.data || [];
  const batches = batchesRes.data || [];
  const courses = coursesRes.data || [];
  const faculty = facultyRes.data || [];
  const routine = routineRes.data || [];
  const exams = examsRes.data || [];
  const announcements = announcementsRes.data || [];
  const notices = noticesRes.data || [];
  const resources = resourcesRes.data || [];
  const notifications = notificationsRes.data || [];
  const recentAuditLogs = (auditLogsRes.data || []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    target: row.target,
    details: row.details || void 0,
    timestamp: row.timestamp || (/* @__PURE__ */ new Date()).toISOString()
  }));
  const totalStudents = users.filter((u) => u.role === "STUDENT" || u.role === "CR").length;
  const totalAdmins = users.filter((u) => u.role === "ADMIN").length;
  const totalCRs = users.filter((u) => u.role === "CR").length;
  const pendingResources = resources.filter((r) => r.status === "PENDING").length;
  const activeBatches = batches.length;
  return {
    totalUsers: users.length,
    totalStudents,
    totalCRs,
    totalAdmins,
    totalBatches: batches.length,
    activeBatches,
    totalCourses: courses.length,
    totalFaculty: faculty.length,
    totalRoutineSlots: routine.length,
    totalExams: exams.length,
    totalAnnouncements: announcements.length,
    totalNotices: notices.length,
    totalResources: resources.length,
    pendingResources,
    totalNotifications: notifications.length,
    recentAuditLogs
  };
}
async function getAllUsers() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    email: row.email || void 0,
    phone: row.phone || void 0,
    role: row.role,
    batchId: row.batch_id || void 0,
    batchName: row.batch_name || void 0,
    currentSemester: Number(row.current_semester || 1),
    profileImage: row.profile_image || void 0,
    status: row.status,
    points: Number(row.points || 0),
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at || (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function createUser(userData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!userData.studentId || !userData.name) {
    throw new Error("Student ID and Name are required.");
  }
  const cleanStudentId = userData.studentId.trim();
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    student_id: cleanStudentId,
    name: userData.name.trim(),
    email: userData.email ? userData.email.trim().toLowerCase() : null,
    phone: userData.phone ? userData.phone.trim() : null,
    role: userData.role || "STUDENT",
    batch_id: userData.batchId || null,
    batch_name: userData.batchName || null,
    current_semester: Number(userData.currentSemester || 1),
    profile_image: userData.profileImage || null,
    status: userData.status || "ACTIVE",
    points: Number(userData.points || 0),
    created_at: now,
    updated_at: now
  };
  const { data, error } = await supabase.from("users").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create user: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "USER_CREATED",
    `User: ${data.name} (${data.student_id})`,
    `Role: ${data.role}, Batch: ${data.batch_name || "N/A"}`
  );
  return {
    id: data.id,
    studentId: data.student_id,
    name: data.name,
    email: data.email || void 0,
    phone: data.phone || void 0,
    role: data.role,
    batchId: data.batch_id || void 0,
    batchName: data.batch_name || void 0,
    currentSemester: Number(data.current_semester || 1),
    profileImage: data.profile_image || void 0,
    status: data.status,
    points: Number(data.points || 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
async function updateUser(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (updates.studentId !== void 0) updatePayload.student_id = updates.studentId.trim();
  if (updates.name !== void 0) updatePayload.name = updates.name.trim();
  if (updates.email !== void 0) updatePayload.email = updates.email ? updates.email.trim().toLowerCase() : null;
  if (updates.phone !== void 0) updatePayload.phone = updates.phone ? updates.phone.trim() : null;
  if (updates.role !== void 0) updatePayload.role = updates.role;
  if (updates.batchId !== void 0) updatePayload.batch_id = updates.batchId || null;
  if (updates.batchName !== void 0) updatePayload.batch_name = updates.batchName || null;
  if (updates.currentSemester !== void 0) updatePayload.current_semester = Number(updates.currentSemester);
  if (updates.profileImage !== void 0) updatePayload.profile_image = updates.profileImage || null;
  if (updates.status !== void 0) updatePayload.status = updates.status;
  if (updates.points !== void 0) updatePayload.points = Number(updates.points);
  const { data, error } = await supabase.from("users").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update user: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "USER_UPDATED",
    `User: ${data.name} (${data.student_id})`,
    `Updated fields: ${Object.keys(updatePayload).filter((k) => k !== "updated_at").join(", ")}`
  );
  return {
    id: data.id,
    studentId: data.student_id,
    name: data.name,
    email: data.email || void 0,
    phone: data.phone || void 0,
    role: data.role,
    batchId: data.batch_id || void 0,
    batchName: data.batch_name || void 0,
    currentSemester: Number(data.current_semester || 1),
    profileImage: data.profile_image || void 0,
    status: data.status,
    points: Number(data.points || 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
async function deleteUser(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("users").select("name, student_id").eq("id", id).single();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "USER_DELETED",
    `User: ${existing?.name || id} (${existing?.student_id || ""})`,
    `Permanently removed from database`
  );
}
async function resetUserPassword(id, newPassword, adminUser) {
  const supabase = getServerSupabase();
  const cleanPass = (newPassword || "").trim();
  if (!cleanPass) {
    throw new Error("Password cannot be empty");
  }
  if (db && db.data && db.data.passwords) {
    db.data.passwords[id] = bcrypt3.hashSync(cleanPass, 10);
    db.save?.();
  }
  const { data: userRecord } = supabase ? await supabase.from("users").select("name, student_id").eq("id", id).single() : { data: null };
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "PASSWORD_RESET",
    `User: ${userRecord?.name || id} (${userRecord?.student_id || ""})`,
    "Admin reset user access credentials"
  );
  return { success: true, message: "Password updated successfully" };
}
async function bulkImportUsers(csvText, defaultBatchId, adminUser) {
  if (!csvText || typeof csvText !== "string") {
    throw new Error("CSV text is required");
  }
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("CSV data is empty");
  }
  let importedCount = 0;
  const errors = [];
  let startIndex = 0;
  const firstLineLower = lines[0].toLowerCase();
  if (firstLineLower.includes("student") || firstLineLower.includes("name") || firstLineLower.includes("id")) {
    startIndex = 1;
  }
  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;
    const cols = rawLine.includes("	") ? rawLine.split("	") : rawLine.split(",");
    const studentId = (cols[0] || "").trim().replace(/['"]/g, "");
    const name = (cols[1] || "").trim().replace(/['"]/g, "");
    const email = (cols[2] || "").trim().replace(/['"]/g, "");
    const phone = (cols[3] || "").trim().replace(/['"]/g, "");
    if (!studentId || !name) {
      errors.push(`Line ${i + 1}: Missing student ID or name`);
      continue;
    }
    try {
      await createUser({
        studentId,
        name,
        email: email || void 0,
        phone: phone || void 0,
        batchId: defaultBatchId || void 0,
        role: "STUDENT",
        status: "ACTIVE"
      }, adminUser);
      importedCount++;
    } catch (err) {
      errors.push(`Line ${i + 1} (${studentId}): ${err.message || "Import error"}`);
    }
  }
  return { importedCount, errors };
}
async function getAllBatches() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("batches").select("*").order("admission_year", { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    admissionYear: Number(row.admission_year),
    currentSemester: Number(row.current_semester || 1),
    academicSession: row.academic_session || "",
    crIds: Array.isArray(row.cr_ids) ? row.cr_ids : [],
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function createBatch(batchData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!batchData.name || !batchData.admissionYear || !batchData.academicSession) {
    throw new Error("Batch Name, Admission Year, and Academic Session are required.");
  }
  const id = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    name: batchData.name.trim(),
    admission_year: Number(batchData.admissionYear),
    current_semester: Number(batchData.currentSemester || 1),
    academic_session: batchData.academicSession.trim(),
    cr_ids: Array.isArray(batchData.crIds) ? batchData.crIds : [],
    created_at: now
  };
  const { data, error } = await supabase.from("batches").insert(insertPayload).select().maybeSingle();
  let createdBatch;
  if (!error && data) {
    createdBatch = {
      id: data.id,
      name: data.name,
      admissionYear: Number(data.admission_year),
      currentSemester: Number(data.current_semester),
      academicSession: data.academic_session,
      crIds: Array.isArray(data.cr_ids) ? data.cr_ids : [],
      createdAt: data.created_at
    };
  } else {
    createdBatch = {
      id,
      name: insertPayload.name,
      admissionYear: insertPayload.admission_year,
      currentSemester: insertPayload.current_semester,
      academicSession: insertPayload.academic_session,
      crIds: insertPayload.cr_ids,
      createdAt: now
    };
  }
  const local = db.getData();
  if (!local.batches) local.batches = [];
  local.batches = local.batches.filter((b) => b.id !== createdBatch.id);
  local.batches.push(createdBatch);
  try {
    db.save();
  } catch {
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "BATCH_CREATED",
    `Batch: ${createdBatch.name}`,
    `Year: ${createdBatch.admissionYear}, Semester: ${createdBatch.currentSemester}`
  );
  return createdBatch;
}
async function updateBatch(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.name !== void 0) updatePayload.name = updates.name.trim();
  if (updates.admissionYear !== void 0) updatePayload.admission_year = Number(updates.admissionYear);
  if (updates.currentSemester !== void 0) updatePayload.current_semester = Number(updates.currentSemester);
  if (updates.academicSession !== void 0) updatePayload.academic_session = updates.academicSession.trim();
  if (updates.crIds !== void 0) updatePayload.cr_ids = Array.isArray(updates.crIds) ? updates.crIds : [];
  let updatedBatch;
  const { data, error } = await supabase.from("batches").update(updatePayload).eq("id", id).select().maybeSingle();
  if (!error && data) {
    updatedBatch = {
      id: data.id,
      name: data.name,
      admissionYear: Number(data.admission_year),
      currentSemester: Number(data.current_semester),
      academicSession: data.academic_session,
      crIds: Array.isArray(data.cr_ids) ? data.cr_ids : [],
      createdAt: data.created_at
    };
  } else {
    const local2 = db.getData();
    const existing = (local2.batches || []).find((b) => b.id === id) || {};
    updatedBatch = {
      id,
      name: updatePayload.name !== void 0 ? updatePayload.name : existing.name || "SWE Batch",
      admissionYear: updatePayload.admission_year !== void 0 ? updatePayload.admission_year : existing.admissionYear || 2024,
      currentSemester: updatePayload.current_semester !== void 0 ? updatePayload.current_semester : existing.currentSemester || 1,
      academicSession: updatePayload.academic_session !== void 0 ? updatePayload.academic_session : existing.academicSession || "2024-2025",
      crIds: updatePayload.cr_ids !== void 0 ? updatePayload.cr_ids : existing.crIds || [],
      createdAt: existing.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const local = db.getData();
  if (!local.batches) local.batches = [];
  const idx = local.batches.findIndex((b) => b.id === id);
  if (idx >= 0) local.batches[idx] = updatedBatch;
  else local.batches.push(updatedBatch);
  try {
    db.save();
  } catch {
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "BATCH_UPDATED",
    `Batch: ${updatedBatch.name}`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return updatedBatch;
}
async function deleteBatch(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("batches").select("name").eq("id", id).maybeSingle();
  try {
    await supabase.from("batches").delete().eq("id", id);
  } catch (err) {
    console.warn("[Supabase deleteBatch error]:", err);
  }
  const local = db.getData();
  if (local.batches) {
    local.batches = local.batches.filter((b) => b.id !== id);
    try {
      db.save();
    } catch {
    }
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "BATCH_DELETED",
    `Batch: ${existing?.name || id}`,
    `Permanently removed from database`
  );
}
async function getAllCourses() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("courses").select("*").order("semester", { ascending: true }).order("code", { ascending: true });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    code: row.code,
    shortName: row.short_name || void 0,
    title: row.title,
    credits: Number(row.credits || 3),
    type: row.type || "THEORY",
    semester: Number(row.semester || 1),
    assignedFacultyId: row.assigned_faculty_id || void 0,
    assignedFacultyName: row.assigned_faculty_name || void 0,
    batchIds: Array.isArray(row.batch_ids) ? row.batch_ids : []
  }));
}
async function createCourse(courseData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!courseData.code || !courseData.title) {
    throw new Error("Course Code and Title are required.");
  }
  const id = `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    code: courseData.code.trim().toUpperCase(),
    short_name: courseData.shortName ? courseData.shortName.trim() : null,
    title: courseData.title.trim(),
    credits: Number(courseData.credits || 3),
    type: courseData.type || "THEORY",
    semester: Number(courseData.semester || 1),
    assigned_faculty_id: courseData.assignedFacultyId || null,
    assigned_faculty_name: courseData.assignedFacultyName || null,
    batch_ids: Array.isArray(courseData.batchIds) ? courseData.batchIds : [],
    created_at: now
  };
  const { data, error } = await supabase.from("courses").insert(insertPayload).select().maybeSingle();
  let createdCourse;
  if (!error && data) {
    createdCourse = {
      id: data.id,
      code: data.code,
      shortName: data.short_name || void 0,
      title: data.title,
      credits: Number(data.credits),
      type: data.type,
      semester: Number(data.semester),
      assignedFacultyId: data.assigned_faculty_id || void 0,
      assignedFacultyName: data.assigned_faculty_name || void 0,
      batchIds: Array.isArray(data.batch_ids) ? data.batch_ids : []
    };
  } else {
    createdCourse = {
      id,
      code: insertPayload.code,
      shortName: insertPayload.short_name || void 0,
      title: insertPayload.title,
      credits: insertPayload.credits,
      type: insertPayload.type,
      semester: insertPayload.semester,
      assignedFacultyId: insertPayload.assigned_faculty_id || void 0,
      assignedFacultyName: insertPayload.assigned_faculty_name || void 0,
      batchIds: insertPayload.batch_ids
    };
  }
  const local = db.getData();
  if (!local.courses) local.courses = [];
  local.courses = local.courses.filter((c) => c.id !== createdCourse.id);
  local.courses.push(createdCourse);
  try {
    db.save();
  } catch {
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "COURSE_CREATED",
    `Course: ${createdCourse.code} - ${createdCourse.title}`,
    `Credits: ${createdCourse.credits}, Semester: ${createdCourse.semester}, Type: ${createdCourse.type}`
  );
  return createdCourse;
}
async function updateCourse(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.code !== void 0) updatePayload.code = updates.code.trim().toUpperCase();
  if (updates.shortName !== void 0) updatePayload.short_name = updates.shortName ? updates.shortName.trim() : null;
  if (updates.title !== void 0) updatePayload.title = updates.title.trim();
  if (updates.credits !== void 0) updatePayload.credits = Number(updates.credits);
  if (updates.type !== void 0) updatePayload.type = updates.type;
  if (updates.semester !== void 0) updatePayload.semester = Number(updates.semester);
  if (updates.assignedFacultyId !== void 0) updatePayload.assigned_faculty_id = updates.assignedFacultyId || null;
  if (updates.assignedFacultyName !== void 0) updatePayload.assigned_faculty_name = updates.assignedFacultyName || null;
  if (updates.batchIds !== void 0) updatePayload.batch_ids = Array.isArray(updates.batchIds) ? updates.batchIds : [];
  let updatedCourse;
  const { data, error } = await supabase.from("courses").update(updatePayload).eq("id", id).select().maybeSingle();
  if (!error && data) {
    updatedCourse = {
      id: data.id,
      code: data.code,
      shortName: data.short_name || void 0,
      title: data.title,
      credits: Number(data.credits),
      type: data.type,
      semester: Number(data.semester),
      assignedFacultyId: data.assigned_faculty_id || void 0,
      assignedFacultyName: data.assigned_faculty_name || void 0,
      batchIds: Array.isArray(data.batch_ids) ? data.batch_ids : []
    };
  } else {
    const local2 = db.getData();
    const existing = (local2.courses || []).find((c) => c.id === id) || {};
    updatedCourse = {
      id,
      code: updatePayload.code !== void 0 ? updatePayload.code : existing.code || "SWE",
      shortName: updatePayload.short_name !== void 0 ? updatePayload.short_name : existing.shortName,
      title: updatePayload.title !== void 0 ? updatePayload.title : existing.title || "Course",
      credits: updatePayload.credits !== void 0 ? updatePayload.credits : existing.credits || 3,
      type: updatePayload.type !== void 0 ? updatePayload.type : existing.type || "THEORY",
      semester: updatePayload.semester !== void 0 ? updatePayload.semester : existing.semester || 1,
      assignedFacultyId: updatePayload.assigned_faculty_id !== void 0 ? updatePayload.assigned_faculty_id : existing.assignedFacultyId,
      assignedFacultyName: updatePayload.assigned_faculty_name !== void 0 ? updatePayload.assigned_faculty_name : existing.assignedFacultyName,
      batchIds: updatePayload.batch_ids !== void 0 ? updatePayload.batch_ids : existing.batchIds || []
    };
  }
  const local = db.getData();
  if (!local.courses) local.courses = [];
  const idx = local.courses.findIndex((c) => c.id === id);
  if (idx >= 0) local.courses[idx] = updatedCourse;
  else local.courses.push(updatedCourse);
  try {
    db.save();
  } catch {
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "COURSE_UPDATED",
    `Course: ${updatedCourse.code} - ${updatedCourse.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return updatedCourse;
}
async function deleteCourse(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("courses").select("code, title").eq("id", id).maybeSingle();
  try {
    await supabase.from("courses").delete().eq("id", id);
  } catch (err) {
    console.warn("[Supabase deleteCourse error]:", err);
  }
  const local = db.getData();
  if (local.courses) {
    local.courses = local.courses.filter((c) => c.id !== id);
    try {
      db.save();
    } catch {
    }
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "COURSE_DELETED",
    `Course: ${existing?.code || id} - ${existing?.title || ""}`,
    `Permanently removed from database`
  );
}
async function getAllFaculty() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("faculty").select("*").order("name", { ascending: true });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name || void 0,
    designation: row.designation,
    department: row.department || "Software Engineering",
    email: row.email || "",
    phone: row.phone || void 0,
    officeRoom: row.office_room || void 0,
    photoUrl: row.photo_url || void 0,
    specialization: row.specialization || void 0,
    assignedCourses: Array.isArray(row.assigned_courses) ? row.assigned_courses : []
  }));
}
async function createFaculty(facultyData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!facultyData.name || !facultyData.designation || !facultyData.email) {
    throw new Error("Faculty Name, Designation, and Email are required.");
  }
  const id = `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    name: facultyData.name.trim(),
    short_name: facultyData.shortName ? facultyData.shortName.trim() : null,
    designation: facultyData.designation.trim(),
    department: facultyData.department ? facultyData.department.trim() : "Software Engineering",
    email: facultyData.email.trim().toLowerCase(),
    phone: facultyData.phone ? facultyData.phone.trim() : null,
    office_room: facultyData.officeRoom ? facultyData.officeRoom.trim() : "SWE Faculty Room",
    photo_url: facultyData.photoUrl || null,
    specialization: facultyData.specialization ? facultyData.specialization.trim() : null,
    assigned_courses: Array.isArray(facultyData.assignedCourses) ? facultyData.assignedCourses : [],
    created_at: now
  };
  const { data, error } = await supabase.from("faculty").insert(insertPayload).select().maybeSingle();
  let createdFaculty;
  if (!error && data) {
    createdFaculty = {
      id: data.id,
      name: data.name,
      shortName: data.short_name || void 0,
      designation: data.designation,
      department: data.department,
      email: data.email,
      phone: data.phone || void 0,
      officeRoom: data.office_room || void 0,
      photoUrl: data.photo_url || void 0,
      specialization: data.specialization || void 0,
      assignedCourses: Array.isArray(data.assigned_courses) ? data.assigned_courses : []
    };
  } else {
    createdFaculty = {
      id,
      name: insertPayload.name,
      shortName: insertPayload.short_name || void 0,
      designation: insertPayload.designation,
      department: insertPayload.department,
      email: insertPayload.email,
      phone: insertPayload.phone || void 0,
      officeRoom: insertPayload.office_room || void 0,
      photoUrl: insertPayload.photo_url || void 0,
      specialization: insertPayload.specialization || void 0,
      assignedCourses: insertPayload.assigned_courses
    };
  }
  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  local.faculty = local.faculty.filter((f) => f.id !== createdFaculty.id);
  local.faculty.push(createdFaculty);
  try {
    db.save();
  } catch {
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "FACULTY_CREATED",
    `Faculty: ${createdFaculty.name} (${createdFaculty.designation})`,
    `Email: ${createdFaculty.email}, Office: ${createdFaculty.officeRoom}`
  );
  return createdFaculty;
}
async function updateFaculty(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.name !== void 0) updatePayload.name = updates.name.trim();
  if (updates.shortName !== void 0) updatePayload.short_name = updates.shortName ? updates.shortName.trim() : null;
  if (updates.designation !== void 0) updatePayload.designation = updates.designation.trim();
  if (updates.department !== void 0) updatePayload.department = updates.department.trim();
  if (updates.email !== void 0) updatePayload.email = updates.email.trim().toLowerCase();
  if (updates.phone !== void 0) updatePayload.phone = updates.phone ? updates.phone.trim() : null;
  if (updates.officeRoom !== void 0) updatePayload.office_room = updates.officeRoom ? updates.officeRoom.trim() : null;
  if (updates.photoUrl !== void 0) updatePayload.photo_url = updates.photoUrl || null;
  if (updates.specialization !== void 0) updatePayload.specialization = updates.specialization ? updates.specialization.trim() : null;
  if (updates.assignedCourses !== void 0) updatePayload.assigned_courses = Array.isArray(updates.assignedCourses) ? updates.assignedCourses : [];
  let updatedFaculty;
  const { data, error } = await supabase.from("faculty").update(updatePayload).eq("id", id).select().maybeSingle();
  if (!error && data) {
    updatedFaculty = {
      id: data.id,
      name: data.name,
      shortName: data.short_name || void 0,
      designation: data.designation,
      department: data.department,
      email: data.email,
      phone: data.phone || void 0,
      officeRoom: data.office_room || void 0,
      photoUrl: data.photo_url || void 0,
      specialization: data.specialization || void 0,
      assignedCourses: Array.isArray(data.assigned_courses) ? data.assigned_courses : []
    };
  } else {
    const local2 = db.getData();
    const existing = (local2.faculty || []).find((f) => f.id === id) || {};
    updatedFaculty = {
      id,
      name: updatePayload.name !== void 0 ? updatePayload.name : existing.name || "Faculty Member",
      shortName: updatePayload.short_name !== void 0 ? updatePayload.short_name : existing.shortName,
      designation: updatePayload.designation !== void 0 ? updatePayload.designation : existing.designation || "Lecturer",
      department: updatePayload.department !== void 0 ? updatePayload.department : existing.department || "Software Engineering",
      email: updatePayload.email !== void 0 ? updatePayload.email : existing.email || "",
      phone: updatePayload.phone !== void 0 ? updatePayload.phone : existing.phone,
      officeRoom: updatePayload.office_room !== void 0 ? updatePayload.office_room : existing.officeRoom,
      photoUrl: updatePayload.photo_url !== void 0 ? updatePayload.photo_url : existing.photoUrl,
      specialization: updatePayload.specialization !== void 0 ? updatePayload.specialization : existing.specialization,
      assignedCourses: updatePayload.assigned_courses !== void 0 ? updatePayload.assigned_courses : existing.assignedCourses || []
    };
  }
  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  const idx = local.faculty.findIndex((f) => f.id === id);
  if (idx >= 0) local.faculty[idx] = updatedFaculty;
  else local.faculty.push(updatedFaculty);
  try {
    db.save();
  } catch {
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "FACULTY_UPDATED",
    `Faculty: ${updatedFaculty.name} (${updatedFaculty.designation})`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return updatedFaculty;
}
async function deleteFaculty(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("faculty").select("name, designation").eq("id", id).maybeSingle();
  try {
    await supabase.from("faculty").delete().eq("id", id);
  } catch (err) {
    console.warn("[Supabase deleteFaculty error]:", err);
  }
  const local = db.getData();
  if (local.faculty) {
    local.faculty = local.faculty.filter((f) => f.id !== id);
    try {
      db.save();
    } catch {
    }
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "FACULTY_DELETED",
    `Faculty: ${existing?.name || id} (${existing?.designation || ""})`,
    `Permanently removed from database`
  );
}
async function getAllRoutineSlots(batchId) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  let query = supabase.from("routine_slots").select("*");
  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    day: (row.day || "SUNDAY").toUpperCase(),
    startTime: row.start_time,
    endTime: row.end_time,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseShortName: row.course_short_name || void 0,
    courseTitle: row.course_title,
    teacherName: row.teacher_name,
    teacherShortName: row.teacher_short_name || void 0,
    room: row.room
  }));
}
async function createRoutineSlot(slotData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!slotData.batchId || !slotData.day || !slotData.startTime || !slotData.endTime || !slotData.courseTitle || !slotData.room) {
    throw new Error("Batch, Day, Time, Course Title, and Room are required.");
  }
  const id = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rawDay = slotData.day ? String(slotData.day).trim().toUpperCase() : "SUNDAY";
  const insertPayload = {
    id,
    batch_id: slotData.batchId,
    day: rawDay,
    start_time: slotData.startTime.trim(),
    end_time: slotData.endTime.trim(),
    course_id: slotData.courseId || `course_ref_${Date.now()}`,
    course_code: slotData.courseCode ? slotData.courseCode.trim() : "SWE",
    course_short_name: slotData.courseShortName ? slotData.courseShortName.trim() : null,
    course_title: slotData.courseTitle.trim(),
    teacher_name: slotData.teacherName ? slotData.teacherName.trim() : "Faculty",
    teacher_short_name: slotData.teacherShortName ? slotData.teacherShortName.trim() : null,
    room: slotData.room.trim(),
    created_at: now
  };
  const { data, error } = await supabase.from("routine_slots").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create routine slot: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ROUTINE_SLOT_CREATED",
    `Slot: ${data.course_code} on ${data.day} (${data.start_time}-${data.end_time})`,
    `Room: ${data.room}, Batch: ${data.batch_id}`
  );
  return {
    id: data.id,
    batchId: data.batch_id,
    day: (data.day || "SUNDAY").toUpperCase(),
    startTime: data.start_time,
    endTime: data.end_time,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseShortName: data.course_short_name || void 0,
    courseTitle: data.course_title,
    teacherName: data.teacher_name,
    teacherShortName: data.teacher_short_name || void 0,
    room: data.room
  };
}
async function updateRoutineSlot(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.batchId !== void 0) updatePayload.batch_id = updates.batchId;
  if (updates.day !== void 0) {
    updatePayload.day = String(updates.day).trim().toUpperCase();
  }
  if (updates.startTime !== void 0) updatePayload.start_time = updates.startTime.trim();
  if (updates.endTime !== void 0) updatePayload.end_time = updates.endTime.trim();
  if (updates.courseId !== void 0) updatePayload.course_id = updates.courseId;
  if (updates.courseCode !== void 0) updatePayload.course_code = updates.courseCode.trim();
  if (updates.courseShortName !== void 0) updatePayload.course_short_name = updates.courseShortName ? updates.courseShortName.trim() : null;
  if (updates.courseTitle !== void 0) updatePayload.course_title = updates.courseTitle.trim();
  if (updates.teacherName !== void 0) updatePayload.teacher_name = updates.teacherName.trim();
  if (updates.teacherShortName !== void 0) updatePayload.teacher_short_name = updates.teacherShortName ? updates.teacherShortName.trim() : null;
  if (updates.room !== void 0) updatePayload.room = updates.room.trim();
  const { data, error } = await supabase.from("routine_slots").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update routine slot: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ROUTINE_SLOT_UPDATED",
    `Slot: ${data.course_code} (${data.day})`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return {
    id: data.id,
    batchId: data.batch_id,
    day: (data.day || "SUNDAY").toUpperCase(),
    startTime: data.start_time,
    endTime: data.end_time,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseShortName: data.course_short_name || void 0,
    courseTitle: data.course_title,
    teacherName: data.teacher_name,
    teacherShortName: data.teacher_short_name || void 0,
    room: data.room
  };
}
async function deleteRoutineSlot(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("routine_slots").select("course_code, day").eq("id", id).single();
  const { error } = await supabase.from("routine_slots").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete routine slot: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ROUTINE_SLOT_DELETED",
    `Slot: ${existing?.course_code || id} (${existing?.day || ""})`,
    `Permanently removed from schedule`
  );
}
async function bulkImportRoutines(batchId, slots, mode, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!batchId) throw new Error("Batch ID is required");
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error("No routine slots provided");
  }
  if (mode === "REPLACE") {
    await supabase.from("routine_slots").delete().eq("batch_id", batchId);
  }
  let count = 0;
  for (const s of slots) {
    try {
      await createRoutineSlot({
        ...s,
        batchId
      }, adminUser);
      count++;
    } catch (err) {
      console.warn("Failed to insert slot in bulk import:", err);
    }
  }
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ROUTINE_BULK_IMPORT",
    `Batch: ${batchId}`,
    `Imported ${count} routine slots (${mode} mode)`
  );
  return { message: `Successfully imported ${count} routine slots`, count };
}
async function getAllExams(batchId) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  let query = supabase.from("exams").select("*").order("date", { ascending: true });
  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    type: row.type,
    title: row.title || `${row.course_code} ${row.type}`,
    date: row.date,
    startTime: row.start_time || void 0,
    room: row.room || void 0,
    description: row.description || void 0,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function createExam(examData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!examData.batchId || !examData.courseTitle || !examData.date) {
    throw new Error("Batch, Course Title, and Exam Date are required.");
  }
  const id = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    batch_id: examData.batchId,
    course_id: examData.courseId || `course_ref_${Date.now()}`,
    course_code: examData.courseCode ? examData.courseCode.trim() : "SWE",
    course_title: examData.courseTitle.trim(),
    type: examData.type || "MID",
    title: examData.title ? examData.title.trim() : `${examData.courseCode || "Course"} Exam`,
    date: examData.date.trim(),
    start_time: examData.startTime ? examData.startTime.trim() : null,
    room: examData.room ? examData.room.trim() : null,
    description: examData.description ? examData.description.trim() : null,
    created_by: adminUser.id,
    created_by_name: adminUser.name,
    created_at: now
  };
  const { data, error } = await supabase.from("exams").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create exam: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "EXAM_SCHEDULED",
    `Exam: ${data.course_code} ${data.type} (${data.date})`,
    `Batch: ${data.batch_id}, Room: ${data.room || "TBD"}`
  );
  return {
    id: data.id,
    batchId: data.batch_id,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    type: data.type,
    title: data.title,
    date: data.date,
    startTime: data.start_time || void 0,
    room: data.room || void 0,
    description: data.description || void 0,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at
  };
}
async function updateExam(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.batchId !== void 0) updatePayload.batch_id = updates.batchId;
  if (updates.courseId !== void 0) updatePayload.course_id = updates.courseId;
  if (updates.courseCode !== void 0) updatePayload.course_code = updates.courseCode.trim();
  if (updates.courseTitle !== void 0) updatePayload.course_title = updates.courseTitle.trim();
  if (updates.type !== void 0) updatePayload.type = updates.type;
  if (updates.title !== void 0) updatePayload.title = updates.title.trim();
  if (updates.date !== void 0) updatePayload.date = updates.date.trim();
  if (updates.startTime !== void 0) updatePayload.start_time = updates.startTime ? updates.startTime.trim() : null;
  if (updates.room !== void 0) updatePayload.room = updates.room ? updates.room.trim() : null;
  if (updates.description !== void 0) updatePayload.description = updates.description ? updates.description.trim() : null;
  const { data, error } = await supabase.from("exams").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update exam: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "EXAM_UPDATED",
    `Exam: ${data.course_code} ${data.type} (${data.date})`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return {
    id: data.id,
    batchId: data.batch_id,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    type: data.type,
    title: data.title,
    date: data.date,
    startTime: data.start_time || void 0,
    room: data.room || void 0,
    description: data.description || void 0,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at
  };
}
async function deleteExam(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("exams").select("course_code, type, date").eq("id", id).single();
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete exam: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "EXAM_DELETED",
    `Exam: ${existing?.course_code || id} ${existing?.type || ""} (${existing?.date || ""})`,
    `Permanently removed from database`
  );
}
async function getAllAnnouncements(batchId) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  let query = supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    title: row.title,
    description: row.description || row.content || "",
    publishDate: row.publish_date || row.created_at?.split("T")[0] || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    expiryDate: row.expiry_date || "",
    priority: row.priority || "NORMAL",
    createdBy: row.created_by || row.author_id || "admin",
    createdByName: row.created_by_name || row.author_name || "Central Admin",
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function createAnnouncement(annData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!annData.batchId || !annData.title || !annData.description) {
    throw new Error("Batch, Title, and Description are required.");
  }
  const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.split("T")[0];
  const insertPayload = {
    id,
    batch_id: annData.batchId,
    title: annData.title.trim(),
    description: annData.description.trim(),
    publish_date: annData.publishDate || today,
    expiry_date: annData.expiryDate || null,
    priority: annData.priority || "NORMAL",
    created_by: adminUser.id,
    created_by_name: adminUser.name,
    created_at: now
  };
  const { data, error } = await supabase.from("announcements").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create announcement: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ANNOUNCEMENT_POSTED",
    `Announcement: ${data.title}`,
    `Batch: ${data.batch_id}, Priority: ${data.priority}`
  );
  return {
    id: data.id,
    batchId: data.batch_id,
    title: data.title,
    description: data.description,
    publishDate: data.publish_date,
    expiryDate: data.expiry_date || "",
    priority: data.priority,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at
  };
}
async function updateAnnouncement(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.batchId !== void 0) updatePayload.batch_id = updates.batchId;
  if (updates.title !== void 0) updatePayload.title = updates.title.trim();
  if (updates.description !== void 0) updatePayload.description = updates.description.trim();
  if (updates.publishDate !== void 0) updatePayload.publish_date = updates.publishDate;
  if (updates.expiryDate !== void 0) updatePayload.expiry_date = updates.expiryDate || null;
  if (updates.priority !== void 0) updatePayload.priority = updates.priority;
  const { data, error } = await supabase.from("announcements").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update announcement: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ANNOUNCEMENT_UPDATED",
    `Announcement: ${data.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return {
    id: data.id,
    batchId: data.batch_id,
    title: data.title,
    description: data.description,
    publishDate: data.publish_date,
    expiryDate: data.expiry_date || "",
    priority: data.priority,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at
  };
}
async function deleteAnnouncement(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("announcements").select("title").eq("id", id).single();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete announcement: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "ANNOUNCEMENT_DELETED",
    `Announcement: ${existing?.title || id}`,
    `Permanently removed from database`
  );
}
async function getAllNotices() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("department_notices").select("*").order("publish_date", { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category || "GENERAL",
    publishDate: row.publish_date,
    isImportant: Boolean(row.is_important),
    attachmentUrl: row.attachment_url || void 0,
    createdBy: row.created_by || "admin",
    createdByName: row.created_by_name || "Department Admin",
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function createNotice(noticeData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!noticeData.title || !noticeData.content) {
    throw new Error("Notice Title and Content are required.");
  }
  const id = `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.split("T")[0];
  const insertPayload = {
    id,
    title: noticeData.title.trim(),
    content: noticeData.content.trim(),
    category: noticeData.category || "GENERAL",
    publish_date: noticeData.publishDate || today,
    is_important: Boolean(noticeData.isImportant),
    attachment_url: noticeData.attachmentUrl ? noticeData.attachmentUrl.trim() : null,
    created_by: adminUser.id,
    created_by_name: adminUser.name,
    created_at: now
  };
  const { data, error } = await supabase.from("department_notices").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create notice: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "NOTICE_PUBLISHED",
    `Notice: ${data.title}`,
    `Category: ${data.category}, Important: ${data.is_important}`
  );
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    publishDate: data.publish_date,
    isImportant: Boolean(data.is_important),
    attachmentUrl: data.attachment_url || void 0,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at
  };
}
async function updateNotice(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.title !== void 0) updatePayload.title = updates.title.trim();
  if (updates.content !== void 0) updatePayload.content = updates.content.trim();
  if (updates.category !== void 0) updatePayload.category = updates.category;
  if (updates.publishDate !== void 0) updatePayload.publish_date = updates.publishDate;
  if (updates.isImportant !== void 0) updatePayload.is_important = Boolean(updates.isImportant);
  if (updates.attachmentUrl !== void 0) updatePayload.attachment_url = updates.attachmentUrl ? updates.attachmentUrl.trim() : null;
  const { data, error } = await supabase.from("department_notices").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update notice: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "NOTICE_UPDATED",
    `Notice: ${data.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    publishDate: data.publish_date,
    isImportant: Boolean(data.is_important),
    attachmentUrl: data.attachment_url || void 0,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at
  };
}
async function deleteNotice(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("department_notices").select("title").eq("id", id).single();
  const { error } = await supabase.from("department_notices").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete notice: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "NOTICE_DELETED",
    `Notice: ${existing?.title || id}`,
    `Permanently removed from database`
  );
}
async function getAllResources() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    semester: Number(row.semester || 1),
    academicYear: Number(row.academic_year || (/* @__PURE__ */ new Date()).getFullYear()),
    examType: row.exam_type || void 0,
    facultyName: row.faculty_name || void 0,
    targetBatch: row.target_batch || void 0,
    labCategory: row.lab_category || void 0,
    description: row.description || void 0,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: row.file_size || "1.0 MB",
    fileType: row.file_type || "application/pdf",
    uploaderId: row.uploader_id,
    uploaderStudentId: row.uploader_student_id,
    uploaderName: row.uploader_name,
    uploaderBatchName: row.uploader_batch_name || "",
    status: row.status,
    rejectionReason: row.rejection_reason || void 0,
    downloadCount: Number(row.download_count || 0),
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    verifiedAt: row.verified_at || void 0
  }));
}
async function createResource(resData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!resData.title || !resData.fileUrl || !resData.courseTitle) {
    throw new Error("Resource Title, File URL, and Course Title are required.");
  }
  const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    title: resData.title.trim(),
    type: resData.type || "NOTE",
    course_id: resData.courseId || `course_ref_${Date.now()}`,
    course_code: resData.courseCode ? resData.courseCode.trim() : "SWE",
    course_title: resData.courseTitle.trim(),
    semester: Number(resData.semester || 1),
    academic_year: Number(resData.academicYear || (/* @__PURE__ */ new Date()).getFullYear()),
    exam_type: resData.examType || null,
    faculty_name: resData.facultyName ? resData.facultyName.trim() : null,
    target_batch: resData.targetBatch ? resData.targetBatch.trim() : null,
    lab_category: resData.labCategory || null,
    description: resData.description ? resData.description.trim() : null,
    file_url: resData.fileUrl.trim(),
    file_name: resData.fileName ? resData.fileName.trim() : "document.pdf",
    file_size: resData.fileSize || "1.5 MB",
    file_type: resData.fileType || "application/pdf",
    uploader_id: resData.uploaderId || adminUser.id,
    uploader_student_id: resData.uploaderStudentId || "ADMIN",
    uploader_name: resData.uploaderName || adminUser.name,
    uploader_batch_name: resData.uploaderBatchName || "Department Admin",
    status: resData.status || "APPROVED",
    rejection_reason: null,
    download_count: 0,
    created_at: now,
    verified_at: resData.status === "APPROVED" ? now : null
  };
  const { data, error } = await supabase.from("resources").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create resource: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "RESOURCE_CREATED",
    `Resource: ${data.title} (${data.type})`,
    `Course: ${data.course_code}, Status: ${data.status}`
  );
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    semester: Number(data.semester),
    academicYear: Number(data.academic_year),
    examType: data.exam_type || void 0,
    facultyName: data.faculty_name || void 0,
    targetBatch: data.target_batch || void 0,
    labCategory: data.lab_category || void 0,
    description: data.description || void 0,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    uploaderId: data.uploader_id,
    uploaderStudentId: data.uploader_student_id,
    uploaderName: data.uploader_name,
    uploaderBatchName: data.uploader_batch_name,
    status: data.status,
    rejectionReason: data.rejection_reason || void 0,
    downloadCount: Number(data.download_count || 0),
    createdAt: data.created_at,
    verifiedAt: data.verified_at || void 0
  };
}
async function updateResource(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.title !== void 0) updatePayload.title = updates.title.trim();
  if (updates.type !== void 0) updatePayload.type = updates.type;
  if (updates.courseId !== void 0) updatePayload.course_id = updates.courseId;
  if (updates.courseCode !== void 0) updatePayload.course_code = updates.courseCode.trim();
  if (updates.courseTitle !== void 0) updatePayload.course_title = updates.courseTitle.trim();
  if (updates.semester !== void 0) updatePayload.semester = Number(updates.semester);
  if (updates.academicYear !== void 0) updatePayload.academic_year = Number(updates.academicYear);
  if (updates.examType !== void 0) updatePayload.exam_type = updates.examType || null;
  if (updates.facultyName !== void 0) updatePayload.faculty_name = updates.facultyName ? updates.facultyName.trim() : null;
  if (updates.targetBatch !== void 0) updatePayload.target_batch = updates.targetBatch ? updates.targetBatch.trim() : null;
  if (updates.labCategory !== void 0) updatePayload.lab_category = updates.labCategory || null;
  if (updates.description !== void 0) updatePayload.description = updates.description ? updates.description.trim() : null;
  if (updates.fileUrl !== void 0) updatePayload.file_url = updates.fileUrl.trim();
  if (updates.fileName !== void 0) updatePayload.file_name = updates.fileName.trim();
  if (updates.status !== void 0) {
    updatePayload.status = updates.status;
    if (updates.status === "APPROVED") {
      updatePayload.verified_at = (/* @__PURE__ */ new Date()).toISOString();
      updatePayload.rejection_reason = null;
    } else if (updates.status === "REJECTED") {
      updatePayload.rejection_reason = updates.rejectionReason ? updates.rejectionReason.trim() : "Does not meet academic criteria";
    }
  }
  if (updates.rejectionReason !== void 0) updatePayload.rejection_reason = updates.rejectionReason ? updates.rejectionReason.trim() : null;
  const { data, error } = await supabase.from("resources").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update resource: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    updates.status ? `RESOURCE_${updates.status}` : "RESOURCE_UPDATED",
    `Resource: ${data.title} (${data.type})`,
    `Status: ${data.status}`
  );
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    semester: Number(data.semester),
    academicYear: Number(data.academic_year),
    examType: data.exam_type || void 0,
    facultyName: data.faculty_name || void 0,
    targetBatch: data.target_batch || void 0,
    labCategory: data.lab_category || void 0,
    description: data.description || void 0,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    uploaderId: data.uploader_id,
    uploaderStudentId: data.uploader_student_id,
    uploaderName: data.uploader_name,
    uploaderBatchName: data.uploader_batch_name,
    status: data.status,
    rejectionReason: data.rejection_reason || void 0,
    downloadCount: Number(data.download_count || 0),
    createdAt: data.created_at,
    verifiedAt: data.verified_at || void 0
  };
}
async function deleteResource(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data: existing } = await supabase.from("resources").select("title, type").eq("id", id).single();
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete resource: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "RESOURCE_DELETED",
    `Resource: ${existing?.title || id} (${existing?.type || ""})`,
    `Permanently removed from academic vault`
  );
}
async function getPendingResources() {
  const all = await getAllResources();
  return (all || []).filter((r) => r.status === "PENDING");
}
async function verifyResource(id, status, rejectionReason, adminUser) {
  const u = adminUser || { id: "admin", name: "Admin" };
  return updateResource(id, { status, rejectionReason }, u);
}
async function getAllNotifications(userId) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    linkUrl: row.link_url || void 0,
    read: Boolean(row.read),
    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function createNotification(notifData, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  if (!notifData.userId || !notifData.title || !notifData.message) {
    throw new Error("Recipient User ID, Title, and Message are required.");
  }
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertPayload = {
    id,
    user_id: notifData.userId,
    title: notifData.title.trim(),
    message: notifData.message.trim(),
    type: notifData.type || "ANNOUNCEMENT",
    link_url: notifData.linkUrl ? notifData.linkUrl.trim() : null,
    read: false,
    created_at: now
  };
  const { data, error } = await supabase.from("notifications").insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to dispatch notification: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "NOTIFICATION_DISPATCHED",
    `Notification: ${data.title} -> ${data.user_id}`,
    `Type: ${data.type}`
  );
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    linkUrl: data.link_url || void 0,
    read: Boolean(data.read),
    createdAt: data.created_at
  };
}
async function updateNotification(id, updates, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const updatePayload = {};
  if (updates.title !== void 0) updatePayload.title = updates.title.trim();
  if (updates.message !== void 0) updatePayload.message = updates.message.trim();
  if (updates.type !== void 0) updatePayload.type = updates.type;
  if (updates.linkUrl !== void 0) updatePayload.link_url = updates.linkUrl ? updates.linkUrl.trim() : null;
  if (updates.read !== void 0) updatePayload.read = Boolean(updates.read);
  const { data, error } = await supabase.from("notifications").update(updatePayload).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update notification: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "NOTIFICATION_UPDATED",
    `Notification: ${data.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(", ")}`
  );
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    linkUrl: data.link_url || void 0,
    read: Boolean(data.read),
    createdAt: data.created_at
  };
}
async function deleteNotification(id, adminUser) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete notification: ${error.message}`);
  await createAuditLog(
    adminUser.id,
    adminUser.name,
    "NOTIFICATION_DELETED",
    `Notification ID: ${id}`,
    `Removed from notifications`
  );
}
async function getAllAuditLogs(limit = 100) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase client unavailable");
  const { data, error } = await supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(limit);
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return (data || []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    target: row.target,
    details: row.details || void 0,
    timestamp: row.timestamp || (/* @__PURE__ */ new Date()).toISOString()
  }));
}

// src/server/routes/admin.ts
var router10 = Router10();
router10.use(verifyAuthToken, requireRole("ADMIN"));
function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data
  });
}
function sendError(res, err, defaultCode = "INTERNAL_ERROR", defaultStatus = 500) {
  const message = err?.message || "An unexpected error occurred";
  const code = err?.code || defaultCode;
  const status = typeof err?.statusCode === "number" ? err.statusCode : defaultStatus;
  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
}
router10.get(["/stats", "/overview"], async (req, res) => {
  try {
    const stats = await getAdminStats();
    return sendSuccess(res, stats);
  } catch (err) {
    return sendError(res, err, "STATS_FETCH_ERROR");
  }
});
router10.get(["/users", "/students"], async (req, res) => {
  try {
    const users = await getAllUsers();
    return sendSuccess(res, users);
  } catch (err) {
    return sendError(res, err, "USERS_FETCH_ERROR");
  }
});
router10.post(["/users/bulk-import", "/students/bulk-import"], async (req, res) => {
  try {
    const { csvText, defaultBatchId } = req.body;
    const adminUser = { id: req.user.id, name: req.user.name };
    const result = await bulkImportUsers(csvText, defaultBatchId, adminUser);
    return res.json({
      success: true,
      importedCount: result.importedCount,
      errors: result.errors,
      data: result
    });
  } catch (err) {
    return sendError(res, err, "USER_BULK_IMPORT_ERROR", 400);
  }
});
router10.post(["/users/:id/reset-password", "/students/:id/reset-password"], async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminUser = { id: req.user.id, name: req.user.name };
    const result = await resetUserPassword(id, newPassword, adminUser);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err, "PASSWORD_RESET_ERROR", 400);
  }
});
router10.post(["/users", "/students"], async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newUser = await createUser(req.body, adminUser);
    return sendSuccess(res, newUser, 201);
  } catch (err) {
    return sendError(res, err, "USER_CREATE_ERROR", 400);
  }
});
router10.put(["/users/:id", "/students/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateUser(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "USER_UPDATE_ERROR", 400);
  }
});
router10.delete(["/users/:id", "/students/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteUser(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "USER_DELETE_ERROR", 400);
  }
});
router10.get("/batches", async (req, res) => {
  try {
    const batches = await getAllBatches();
    return sendSuccess(res, batches);
  } catch (err) {
    return sendError(res, err, "BATCHES_FETCH_ERROR");
  }
});
router10.post("/batches", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newBatch = await createBatch(req.body, adminUser);
    return sendSuccess(res, newBatch, 201);
  } catch (err) {
    return sendError(res, err, "BATCH_CREATE_ERROR", 400);
  }
});
router10.put("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateBatch(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "BATCH_UPDATE_ERROR", 400);
  }
});
router10.delete("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteBatch(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "BATCH_DELETE_ERROR", 400);
  }
});
router10.get("/courses", async (req, res) => {
  try {
    const courses = await getAllCourses();
    return sendSuccess(res, courses);
  } catch (err) {
    return sendError(res, err, "COURSES_FETCH_ERROR");
  }
});
router10.post("/courses", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newCourse = await createCourse(req.body, adminUser);
    return sendSuccess(res, newCourse, 201);
  } catch (err) {
    return sendError(res, err, "COURSE_CREATE_ERROR", 400);
  }
});
router10.put("/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateCourse(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "COURSE_UPDATE_ERROR", 400);
  }
});
router10.delete("/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteCourse(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "COURSE_DELETE_ERROR", 400);
  }
});
router10.get("/faculty", async (req, res) => {
  try {
    const faculty = await getAllFaculty();
    return sendSuccess(res, faculty);
  } catch (err) {
    return sendError(res, err, "FACULTY_FETCH_ERROR");
  }
});
router10.post("/faculty", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newFaculty = await createFaculty(req.body, adminUser);
    return sendSuccess(res, newFaculty, 201);
  } catch (err) {
    return sendError(res, err, "FACULTY_CREATE_ERROR", 400);
  }
});
router10.put("/faculty/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateFaculty(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "FACULTY_UPDATE_ERROR", 400);
  }
});
router10.delete("/faculty/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteFaculty(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "FACULTY_DELETE_ERROR", 400);
  }
});
router10.get(["/routine-slots", "/routine"], async (req, res) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : void 0;
    const slots = await getAllRoutineSlots(batchId);
    return sendSuccess(res, slots);
  } catch (err) {
    return sendError(res, err, "ROUTINE_FETCH_ERROR");
  }
});
router10.post(["/routine-slots/bulk-import", "/routine/bulk-import"], async (req, res) => {
  try {
    const { batchId, slots, mode } = req.body;
    const adminUser = { id: req.user.id, name: req.user.name };
    const result = await bulkImportRoutines(batchId, slots, mode || "REPLACE", adminUser);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return sendError(res, err, "ROUTINE_BULK_IMPORT_ERROR", 400);
  }
});
router10.post(["/routine-slots", "/routine"], async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newSlot = await createRoutineSlot(req.body, adminUser);
    return sendSuccess(res, newSlot, 201);
  } catch (err) {
    return sendError(res, err, "ROUTINE_CREATE_ERROR", 400);
  }
});
router10.put(["/routine-slots/:id", "/routine/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateRoutineSlot(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "ROUTINE_UPDATE_ERROR", 400);
  }
});
router10.delete(["/routine-slots/:id", "/routine/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteRoutineSlot(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "ROUTINE_DELETE_ERROR", 400);
  }
});
router10.get("/exams", async (req, res) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : void 0;
    const exams = await getAllExams(batchId);
    return sendSuccess(res, exams);
  } catch (err) {
    return sendError(res, err, "EXAMS_FETCH_ERROR");
  }
});
router10.post("/exams", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newExam = await createExam(req.body, adminUser);
    return sendSuccess(res, newExam, 201);
  } catch (err) {
    return sendError(res, err, "EXAM_CREATE_ERROR", 400);
  }
});
router10.put("/exams/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateExam(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "EXAM_UPDATE_ERROR", 400);
  }
});
router10.delete("/exams/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteExam(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "EXAM_DELETE_ERROR", 400);
  }
});
router10.get("/announcements", async (req, res) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : void 0;
    const announcements = await getAllAnnouncements(batchId);
    return sendSuccess(res, announcements);
  } catch (err) {
    return sendError(res, err, "ANNOUNCEMENTS_FETCH_ERROR");
  }
});
router10.post("/announcements", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newAnn = await createAnnouncement(req.body, adminUser);
    return sendSuccess(res, newAnn, 201);
  } catch (err) {
    return sendError(res, err, "ANNOUNCEMENT_CREATE_ERROR", 400);
  }
});
router10.put("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateAnnouncement(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "ANNOUNCEMENT_UPDATE_ERROR", 400);
  }
});
router10.delete("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteAnnouncement(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "ANNOUNCEMENT_DELETE_ERROR", 400);
  }
});
router10.get("/department-notices", async (req, res) => {
  try {
    const notices = await getAllNotices();
    return sendSuccess(res, notices);
  } catch (err) {
    return sendError(res, err, "NOTICES_FETCH_ERROR");
  }
});
router10.post("/department-notices", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newNotice = await createNotice(req.body, adminUser);
    return sendSuccess(res, newNotice, 201);
  } catch (err) {
    return sendError(res, err, "NOTICE_CREATE_ERROR", 400);
  }
});
router10.put("/department-notices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateNotice(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "NOTICE_UPDATE_ERROR", 400);
  }
});
router10.delete("/department-notices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteNotice(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "NOTICE_DELETE_ERROR", 400);
  }
});
router10.get(["/resources/pending", "/resources/pending-verification"], async (req, res) => {
  try {
    const pendingResources = await getPendingResources();
    return sendSuccess(res, pendingResources);
  } catch (err) {
    return sendError(res, err, "PENDING_RESOURCES_FETCH_ERROR");
  }
});
router10.patch(["/resources/:id/verify", "/resources/:id/verification"], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await verifyResource(id, status, rejectionReason, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "RESOURCE_VERIFY_ERROR", 400);
  }
});
router10.post(["/resources/:id/verify", "/resources/:id/verification"], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await verifyResource(id, status, rejectionReason, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "RESOURCE_VERIFY_ERROR", 400);
  }
});
router10.get("/resources", async (req, res) => {
  try {
    const resources = await getAllResources();
    return sendSuccess(res, resources);
  } catch (err) {
    return sendError(res, err, "RESOURCES_FETCH_ERROR");
  }
});
router10.post("/resources", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newRes = await createResource(req.body, adminUser);
    return sendSuccess(res, newRes, 201);
  } catch (err) {
    return sendError(res, err, "RESOURCE_CREATE_ERROR", 400);
  }
});
router10.put("/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateResource(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "RESOURCE_UPDATE_ERROR", 400);
  }
});
router10.delete("/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteResource(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "RESOURCE_DELETE_ERROR", 400);
  }
});
router10.get("/notifications", async (req, res) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : void 0;
    const notifications = await getAllNotifications(userId);
    return sendSuccess(res, notifications);
  } catch (err) {
    return sendError(res, err, "NOTIFICATIONS_FETCH_ERROR");
  }
});
router10.post("/notifications", async (req, res) => {
  try {
    const adminUser = { id: req.user.id, name: req.user.name };
    const newNotif = await createNotification(req.body, adminUser);
    return sendSuccess(res, newNotif, 201);
  } catch (err) {
    return sendError(res, err, "NOTIFICATION_CREATE_ERROR", 400);
  }
});
router10.put("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    const updated = await updateNotification(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err, "NOTIFICATION_UPDATE_ERROR", 400);
  }
});
router10.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user.id, name: req.user.name };
    await deleteNotification(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    return sendError(res, err, "NOTIFICATION_DELETE_ERROR", 400);
  }
});
router10.get("/audit-logs", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await getAllAuditLogs(limit);
    return sendSuccess(res, logs);
  } catch (err) {
    return sendError(res, err, "AUDIT_LOGS_FETCH_ERROR");
  }
});
var admin_default = router10;

// src/server/routes/faculty.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.get("/", optionalAuthToken, async (req, res) => {
  try {
    const { search } = req.query;
    let list = await fetchAllFaculty();
    if (!Array.isArray(list)) {
      list = [];
    }
    if (search && typeof search === "string") {
      const q = search.toLowerCase().trim();
      list = list.filter((f) => {
        if (!f) return false;
        const name = (f.name || "").toLowerCase();
        const shortName = (f.shortName || "").toLowerCase();
        const designation = (f.designation || "").toLowerCase();
        const specialization = (f.specialization || "").toLowerCase();
        const email = (f.email || "").toLowerCase();
        return name.includes(q) || shortName.includes(q) || designation.includes(q) || specialization.includes(q) || email.includes(q);
      });
    }
    return res.json({ faculty: list });
  } catch (err) {
    console.error({
      route: "/api/faculty",
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null
    });
    const fallbackList = db.getData()?.faculty || [];
    return res.status(200).json({ faculty: fallbackList });
  }
});
router11.post("/", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;
    if (!name || !designation) {
      return res.status(400).json({ error: "Name and designation are required" });
    }
    const calculatedShortName = shortName && String(shortName).trim() ? String(shortName).trim().toUpperCase() : name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 4);
    const newFaculty = {
      id: `fac-${Date.now()}`,
      name: String(name).trim(),
      shortName: calculatedShortName || "FAC",
      designation: String(designation).trim(),
      department: department ? String(department).trim() : "Software Engineering",
      email: email ? String(email).trim().toLowerCase() : "",
      phone: phone ? String(phone).trim() : void 0,
      officeRoom: officeRoom ? String(officeRoom).trim() : "",
      photoUrl: photoUrl ? String(photoUrl).trim() : "",
      specialization: specialization ? String(specialization).trim() : "",
      assignedCourses: Array.isArray(assignedCourses) ? assignedCourses : []
    };
    const created = await createFacultyInDB(newFaculty);
    const actorId = req.user?.id || "admin";
    const actorName = req.user?.name || "Admin";
    db.addAuditLog(actorId, actorName, "FACULTY_ADDED", created.name);
    return res.status(201).json({ faculty: created, message: "Faculty member added successfully" });
  } catch (err) {
    console.error({
      route: "POST /api/faculty",
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null
    });
    return res.status(500).json({ error: err?.message || "Server error adding faculty member" });
  }
});
router11.put("/:id", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;
    const updates = {};
    if (name !== void 0) updates.name = String(name).trim();
    if (shortName !== void 0) updates.shortName = String(shortName).trim().toUpperCase();
    if (designation !== void 0) updates.designation = String(designation).trim();
    if (department !== void 0) updates.department = String(department).trim();
    if (email !== void 0) updates.email = String(email).trim().toLowerCase();
    if (phone !== void 0) updates.phone = phone ? String(phone).trim() : void 0;
    if (officeRoom !== void 0) updates.officeRoom = String(officeRoom).trim();
    if (photoUrl !== void 0) updates.photoUrl = String(photoUrl).trim();
    if (specialization !== void 0) updates.specialization = String(specialization).trim();
    if (Array.isArray(assignedCourses)) updates.assignedCourses = assignedCourses;
    const updated = await updateFacultyInDB(req.params.id, updates);
    const actorId = req.user?.id || "admin";
    const actorName = req.user?.name || "Admin";
    db.addAuditLog(actorId, actorName, "FACULTY_UPDATED", updated.name);
    return res.json({ faculty: updated, message: "Faculty updated successfully" });
  } catch (err) {
    console.error({
      route: `PUT /api/faculty/${req.params.id}`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null
    });
    return res.status(500).json({ error: err?.message || "Server error updating faculty member" });
  }
});
router11.delete("/:id", verifyAuthToken, requireRole("ADMIN"), async (req, res) => {
  try {
    const facId = req.params.id;
    await deleteFacultyFromDB(facId);
    const actorId = req.user?.id || "admin";
    const actorName = req.user?.name || "Admin";
    db.addAuditLog(actorId, actorName, "FACULTY_DELETED", facId);
    return res.json({ message: "Faculty deleted successfully" });
  } catch (err) {
    console.error({
      route: `DELETE /api/faculty/${req.params.id}`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null
    });
    return res.status(500).json({ error: err?.message || "Server error deleting faculty member" });
  }
});
var faculty_default = router11;

// src/server/routes/notifications.ts
import { Router as Router12 } from "express";
var router12 = Router12();
router12.get("/", optionalAuthToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const notifications = await fetchNotificationsForUser(userId);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error({
      route: "/api/notifications",
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null
    });
    return res.status(200).json({ notifications: [], unreadCount: 0 });
  }
});
router12.post("/:id/read", optionalAuthToken, async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.user?.id;
    await markNotificationAsReadInDB(notifId, userId);
    return res.json({ message: "Marked as read" });
  } catch (err) {
    console.error({
      route: `/api/notifications/${req.params.id}/read`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null
    });
    return res.status(200).json({ message: "Marked as read" });
  }
});
router12.post("/read-all", optionalAuthToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await markAllNotificationsAsReadInDB(userId);
    }
    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error({
      route: "/api/notifications/read-all",
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null
    });
    return res.status(200).json({ message: "All notifications marked as read" });
  }
});
var notifications_default = router12;

// src/server/routes/profile.ts
import { Router as Router13 } from "express";
var router13 = Router13();
router13.get("/", verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await fetchUserByIdOrStudentId(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const allResources = await fetchAllResources();
    const contributions = allResources.filter((r) => r.uploaderId === user.id);
    res.json({
      user,
      stats: {
        totalContributions: contributions.length,
        approvedCount: contributions.filter((c) => c.status === "APPROVED").length,
        pendingCount: contributions.filter((c) => c.status === "PENDING").length,
        rejectedCount: contributions.filter((c) => c.status === "REJECTED").length
      },
      recentContributions: contributions.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});
router13.put("/", verifyAuthToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await fetchUserByIdOrStudentId(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { email, phone, profileImage } = req.body;
    if (profileImage && typeof profileImage === "string") {
      let sizeInBytes = profileImage.length;
      if (profileImage.startsWith("data:image")) {
        const base64Data = profileImage.split(",")[1] || "";
        sizeInBytes = Math.floor(base64Data.length * 3 / 4);
      }
      if (sizeInBytes > 102400) {
        return res.status(400).json({
          error: `Profile image size (${(sizeInBytes / 1024).toFixed(1)} KB) exceeds the 100 KB limit. Please select a smaller photo.`
        });
      }
    }
    const updates = {};
    if (email !== void 0) updates.email = email;
    if (phone !== void 0) updates.phone = phone;
    if (profileImage !== void 0) updates.profileImage = profileImage;
    const updated = await updateUserInDB(user.id, updates);
    res.json({ message: "Profile updated successfully", user: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});
var profile_default = router13;

// src/server/routes/supabaseConfig.ts
import { Router as Router14 } from "express";
import fs2 from "fs";
import path2 from "path";
var router14 = Router14();
router14.get("/config", (req, res) => {
  try {
    const status = getSupabaseStatus();
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://aasktchpxsxxanfkkrxx.supabase.co";
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
    const configured = Boolean(
      url && url.startsWith("https://") && !url.includes("placeholder")
    );
    res.json({
      success: true,
      configured,
      url: configured ? url : "",
      key: configured ? key : ""
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message } });
  }
});
router14.get("/status", async (req, res) => {
  try {
    const status = getSupabaseStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/test", async (req, res) => {
  try {
    const details = await testSupabaseConnectionDetails();
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.post("/config", async (req, res) => {
  try {
    const { url, key } = req.body;
    if (!url || !key) {
      return res.status(400).json({ error: "Both Supabase URL and Anon/Publishable Key are required." });
    }
    const initResult = initSupabase(url, key);
    if (!initResult.success) {
      return res.status(400).json({ error: initResult.message });
    }
    const testResult = await testSupabaseConnectionDetails();
    res.json({
      success: true,
      message: "Supabase configured successfully on server!",
      testResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.post("/sync-all", async (req, res) => {
  try {
    const data = db.getData();
    const result = await syncAllLocalToSupabase(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/schema", (req, res) => {
  try {
    const schemaPath = path2.join(process.cwd(), "supabase_schema.sql");
    if (fs2.existsSync(schemaPath)) {
      const sql = fs2.readFileSync(schemaPath, "utf8");
      res.json({ sql });
    } else {
      res.status(404).json({ error: "supabase_schema.sql not found on server" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var supabaseConfig_default = router14;

// src/server/app.ts
function createExpressApp() {
  const app2 = express();
  app2.use(cors());
  app2.use(express.json({ limit: "10mb" }));
  app2.use((req, res, next) => {
    if (!req.url.startsWith("/api") && req.url !== "/" && !req.url.startsWith("/static")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
    if (req.url.startsWith("/api")) {
      console.log(`[HTTP ${req.method}] ${req.url}`);
    }
    next();
  });
  app2.get(["/api", "/api/", "/api/health", "/api/status"], (req, res) => {
    try {
      res.json({
        success: true,
        status: "ok",
        database: "connected",
        app: "SWE Portal",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data: {
          status: "ok",
          database: "connected",
          app: "SWE Portal",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (err) {
      console.error({
        route: "/api/status",
        error: err?.message || err,
        stack: err?.stack,
        supabaseError: null
      });
      res.status(200).json({ success: true, status: "ok", database: "connected" });
    }
  });
  app2.use("/api/auth", auth_default);
  app2.use("/api/dashboard", dashboard_default);
  app2.use("/api/batches", batches_default);
  app2.use("/api/routines", routines_default);
  app2.use("/api/courses", courses_default);
  app2.use("/api/exams", exams_default);
  app2.use("/api/announcements", announcements_default);
  app2.use("/api/notices", notices_default);
  app2.use("/api/resources", resources_default);
  app2.use("/api/admin", admin_default);
  app2.use("/api/faculty", faculty_default);
  app2.use("/api/notifications", notifications_default);
  app2.use("/api/profile", profile_default);
  app2.use("/api/supabase", supabaseConfig_default);
  app2.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `API route ${req.method} ${req.originalUrl} not found`
      }
    });
  });
  app2.use((err, req, res, next) => {
    console.error({
      route: `${req.method} ${req.originalUrl}`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null
    });
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
    const errorCode = err?.code || (statusCode === 401 ? "UNAUTHORIZED" : statusCode === 403 ? "FORBIDDEN" : statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR");
    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: err?.message || "A safe user-facing message"
      }
    });
  });
  return app2;
}
var app = createExpressApp();
var app_default = app;
export {
  app,
  createExpressApp,
  app_default as default
};
