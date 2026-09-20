/* ============================================================
   store.js — Centralised localStorage Data Layer
   All CRUD operations for students, subjects, teachers,
   classes, attendance, and settings.
   ============================================================ */

const Store = (function () {
  "use strict";

  // ── Keys ──────────────────────────────────────────────────────
  const KEYS = {
    students: "ams_students",
    subjects: "ams_subjects",
    teachers: "ams_teachers",
    classes: "ams_classes",
    attendance: "ams_attendance",
    threshold: "ams_threshold",
  };

  // ── Generic helpers ───────────────────────────────────────────
  function _get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }
  function _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ── Students ──────────────────────────────────────────────────
  function getStudents() {
    return _get(KEYS.students, []);
  }
  function setStudents(arr) {
    _set(KEYS.students, arr);
  }
  function addStudent(student) {
    const list = getStudents();
    if (list.some((s) => s.id === student.id)) {
      return { ok: false, error: "A student with this ID already exists." };
    }
    list.push(student);
    setStudents(list);
    return { ok: true };
  }
  function updateStudent(id, data) {
    const list = getStudents();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return { ok: false, error: "Student not found." };
    // If ID is being changed, check for duplicates
    if (data.id && data.id !== id && list.some((s) => s.id === data.id)) {
      return { ok: false, error: "Another student already has this ID." };
    }
    list[idx] = Object.assign({}, list[idx], data);
    setStudents(list);
    return { ok: true };
  }
  function deleteStudent(id) {
    setStudents(getStudents().filter((s) => s.id !== id));
    // Also remove attendance records
    setAttendance(getAttendance().filter((a) => a.studentId !== id));
  }
  function getStudentById(id) {
    return getStudents().find((s) => s.id === id) || null;
  }

  // ── Subjects ──────────────────────────────────────────────────
  function getSubjects() {
    return _get(KEYS.subjects, []);
  }
  function addSubject(subj) {
    const list = getSubjects();
    if (list.some((s) => s.id === subj.id)) {
      return { ok: false, error: "Duplicate subject ID." };
    }
    list.push(subj);
    _set(KEYS.subjects, list);
    return { ok: true };
  }
  function updateSubject(id, data) {
    const list = getSubjects();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return { ok: false, error: "Subject not found." };
    list[idx] = Object.assign({}, list[idx], data);
    _set(KEYS.subjects, list);
    return { ok: true };
  }
  function deleteSubject(id) {
    _set(
      KEYS.subjects,
      getSubjects().filter((s) => s.id !== id)
    );
  }

  // ── Teachers ──────────────────────────────────────────────────
  function getTeachers() {
    return _get(KEYS.teachers, []);
  }
  function addTeacher(teacher) {
    const list = getTeachers();
    if (list.some((t) => t.id === teacher.id)) {
      return { ok: false, error: "Duplicate teacher ID." };
    }
    list.push(teacher);
    _set(KEYS.teachers, list);
    return { ok: true };
  }
  function updateTeacher(id, data) {
    const list = getTeachers();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return { ok: false, error: "Teacher not found." };
    list[idx] = Object.assign({}, list[idx], data);
    _set(KEYS.teachers, list);
    return { ok: true };
  }
  function deleteTeacher(id) {
    _set(
      KEYS.teachers,
      getTeachers().filter((t) => t.id !== id)
    );
  }

  // ── Classes ───────────────────────────────────────────────────
  // Class data model: { id, course, year } (no section, no semester)
  function getClasses() {
    return _get(KEYS.classes, []);
  }
  function addClass(cls) {
    const list = getClasses();
    if (list.some((c) => c.id === cls.id)) {
      return { ok: false, error: "Duplicate class ID." };
    }
    list.push(cls);
    _set(KEYS.classes, list);
    return { ok: true };
  }
  function updateClass(id, data) {
    const list = getClasses();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return { ok: false, error: "Class not found." };
    list[idx] = Object.assign({}, list[idx], data);
    _set(KEYS.classes, list);
    return { ok: true };
  }
  function deleteClass(id) {
    _set(
      KEYS.classes,
      getClasses().filter((c) => c.id !== id)
    );
  }

  // ── Attendance ────────────────────────────────────────────────
  function getAttendance() {
    return _get(KEYS.attendance, []);
  }
  function setAttendance(arr) {
    _set(KEYS.attendance, arr);
  }
  function addAttendanceRecord(record) {
    const list = getAttendance();
    // Overwrite if same student+subject+date exists
    const idx = list.findIndex(
      (a) =>
        a.studentId === record.studentId &&
        a.subjectId === record.subjectId &&
        a.date === record.date
    );
    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    setAttendance(list);
  }
  function addAttendanceBulk(records) {
    const list = getAttendance();
    records.forEach((record) => {
      const idx = list.findIndex(
        (a) =>
          a.studentId === record.studentId &&
          a.subjectId === record.subjectId &&
          a.date === record.date
      );
      if (idx !== -1) {
        list[idx] = record;
      } else {
        list.push(record);
      }
    });
    setAttendance(list);
  }
  function getAttendanceByStudent(studentId) {
    return getAttendance().filter((a) => a.studentId === studentId);
  }
  function getAttendanceByDate(date) {
    return getAttendance().filter((a) => a.date === date);
  }
  function getAttendanceBySubject(subjectId) {
    return getAttendance().filter((a) => a.subjectId === subjectId);
  }
  function getAttendanceFiltered(filters) {
    return getAttendance().filter((a) => {
      if (filters.studentId && a.studentId !== filters.studentId) return false;
      if (filters.subjectId && a.subjectId !== filters.subjectId) return false;
      if (filters.teacherId && a.teacherId !== filters.teacherId) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.dateFrom && a.date < filters.dateFrom) return false;
      if (filters.dateTo && a.date > filters.dateTo) return false;
      return true;
    });
  }

  // ── Threshold ─────────────────────────────────────────────────
  function getThreshold() {
    return parseInt(localStorage.getItem(KEYS.threshold) || "75", 10);
  }
  function setThreshold(val) {
    localStorage.setItem(KEYS.threshold, val);
  }

  // ── Computed helpers ──────────────────────────────────────────
  function getStudentStats(studentId) {
    const records = getAttendanceByStudent(studentId);
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    const leave = records.filter((r) => r.status === "Leave").length;
    const pct = total > 0 ? ((present + late) / total) * 100 : null;
    return { total, present, absent, late, leave, pct };
  }

  function getStudentSubjectStats(studentId, subjectId) {
    const records = getAttendance().filter(
      (a) => a.studentId === studentId && a.subjectId === subjectId
    );
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    const leave = records.filter((r) => r.status === "Leave").length;
    const pct = total > 0 ? ((present + late) / total) * 100 : null;
    return { total, present, absent, late, leave, pct };
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    // Students
    getStudents,
    setStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentById,
    // Subjects
    getSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
    // Teachers
    getTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    // Classes
    getClasses,
    addClass,
    updateClass,
    deleteClass,
    // Attendance
    getAttendance,
    setAttendance,
    addAttendanceRecord,
    addAttendanceBulk,
    getAttendanceByStudent,
    getAttendanceByDate,
    getAttendanceBySubject,
    getAttendanceFiltered,
    // Threshold
    getThreshold,
    setThreshold,
    // Computed
    getStudentStats,
    getStudentSubjectStats,
    // Utils
    generateId: _generateId,
  };
})();
