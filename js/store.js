/* ============================================================
   store.js — Centralised localStorage Data Layer
   All CRUD operations for students, classes, attendance,
   and settings.
   ============================================================ */

// Attendance is daily-based (one record per student per day), no subjects or teachers

const Store = (function () {
  "use strict";

  // ── Keys ──────────────────────────────────────────────────────
  const KEYS = {
    students: "ams_students",
    classes: "ams_classes",
    attendance: "ams_attendance",
    threshold: "ams_threshold",
    users: "ams_users",
    session: "ams_session",
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
  // Attendance record: { studentId, classId, date, time, status, remarks }
  function getAttendance() {
    return _get(KEYS.attendance, []);
  }
  function setAttendance(arr) {
    _set(KEYS.attendance, arr);
  }
  function addAttendanceRecord(record) {
    const list = getAttendance();
    // Overwrite if same student+date exists
    const idx = list.findIndex(
      (a) =>
        a.studentId === record.studentId &&
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


  // ── Auth / Users ───────────────────────────────────────────────

  const DEMO_USERS = [
    { username: "admin",   password: "admin123",   role: "admin",   name: "Admin User",   email: "admin@attendtrack.com" },
    { username: "teacher", password: "teacher123", role: "teacher", name: "Demo Teacher", email: "teacher@attendtrack.com" },
    { username: "student", password: "student123", role: "student", name: "Demo Student", email: "student@attendtrack.com" },
  ];

  function seedDemoUsers() {
    const existing = _get(KEYS.users, []);
    if (existing.length === 0) {
      _set(KEYS.users, DEMO_USERS);
    } else {
      // Ensure demo accounts always exist
      DEMO_USERS.forEach(function (demo) {
        if (!existing.some(function (u) { return u.username === demo.username; })) {
          existing.push(demo);
        }
      });
      _set(KEYS.users, existing);
    }
  }

  function getUsers() { return _get(KEYS.users, []); }

  function addUser(user) {
    var list = getUsers();
    if (list.some(function (u) { return u.username === user.username; })) {
      return { ok: false, error: "Username already exists." };
    }
    list.push(user);
    _set(KEYS.users, list);
    return { ok: true };
  }

  function login(username, password) {
    var users = getUsers();
    var user = users.find(function (u) {
      return u.username === username && u.password === password;
    });
    if (!user) return { ok: false, error: "Invalid username or password." };
    var session = {
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.session, JSON.stringify(session));
    return { ok: true, session: session };
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  function getSession() {
    try {
      var s = JSON.parse(localStorage.getItem(KEYS.session));
      return s || null;
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    return getSession() !== null;
  }

  function hasRole(role) {
    var s = getSession();
    return s !== null && s.role === role;
  }

  function getCurrentRole() {
    var s = getSession();
    return s ? s.role : null;
  }

  // Seed demo users on load
  seedDemoUsers();

  // ── Public API ────────────────────────────────────────────────
  return {
    // Students
    getStudents,
    setStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentById,
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
    // Auth
    getUsers,
    addUser,
    login,
    logout,
    getSession,
    isAuthenticated,
    hasRole,
    getCurrentRole,
    seedDemoUsers,
    // Utils
    generateId: _generateId,
  };
})();
