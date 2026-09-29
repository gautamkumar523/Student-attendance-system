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

  // ── 20 Pre-seeded Students ────────────────────────────────────
  const SEED_STUDENTS = [
    { id: "BCA101", name: "Aarav Sharma",    dob: "2005-03-15", gender: "Male",   course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-001", admissionDate: "2024-07-01", mobile: "9876543210", email: "aarav@email.com",    address: "12 MG Road",       city: "Delhi",    state: "Delhi",          fatherName: "Rajesh Sharma",    motherName: "Sunita Sharma",   parentMobile: "9876543200", parentEmail: "rajesh@email.com", photo: "" },
    { id: "BCA102", name: "Priya Patel",     dob: "2005-06-22", gender: "Female", course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-002", admissionDate: "2024-07-01", mobile: "9876543211", email: "priya@email.com",    address: "45 Park Street",   city: "Mumbai",   state: "Maharashtra",    fatherName: "Vikram Patel",     motherName: "Meena Patel",     parentMobile: "9876543201", parentEmail: "", photo: "" },
    { id: "BCA103", name: "Rohit Kumar",     dob: "2005-01-10", gender: "Male",   course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-003", admissionDate: "2024-07-02", mobile: "9876543212", email: "rohit@email.com",    address: "78 Lajpat Nagar",  city: "Delhi",    state: "Delhi",          fatherName: "Suresh Kumar",     motherName: "Kavita Kumar",    parentMobile: "9876543202", parentEmail: "", photo: "" },
    { id: "BCA104", name: "Sneha Gupta",     dob: "2005-09-05", gender: "Female", course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-004", admissionDate: "2024-07-02", mobile: "9876543213", email: "sneha@email.com",    address: "23 Civil Lines",   city: "Jaipur",   state: "Rajasthan",      fatherName: "Anil Gupta",       motherName: "Pooja Gupta",     parentMobile: "9876543203", parentEmail: "", photo: "" },
    { id: "BCA105", name: "Arjun Singh",     dob: "2005-11-18", gender: "Male",   course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-005", admissionDate: "2024-07-03", mobile: "9876543214", email: "arjun@email.com",    address: "56 Sector 15",     city: "Noida",    state: "Uttar Pradesh",  fatherName: "Manpreet Singh",   motherName: "Gurpreet Kaur",   parentMobile: "9876543204", parentEmail: "", photo: "" },
    { id: "BCA106", name: "Ananya Mishra",   dob: "2005-04-30", gender: "Female", course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-006", admissionDate: "2024-07-03", mobile: "9876543215", email: "ananya@email.com",   address: "89 Gandhi Road",   city: "Lucknow",  state: "Uttar Pradesh",  fatherName: "Ramesh Mishra",    motherName: "Asha Mishra",     parentMobile: "9876543205", parentEmail: "", photo: "" },
    { id: "BCA107", name: "Vikash Yadav",    dob: "2005-07-14", gender: "Male",   course: "BCA", year: "1st Year", department: "Computer Science", batch: "2024-2027", admissionNo: "ADM-2024-007", admissionDate: "2024-07-04", mobile: "9876543216", email: "vikash@email.com",   address: "34 Station Road",  city: "Patna",    state: "Bihar",          fatherName: "Krishna Yadav",    motherName: "Savita Yadav",    parentMobile: "9876543206", parentEmail: "", photo: "" },
    { id: "BCA201", name: "Neha Verma",      dob: "2004-02-20", gender: "Female", course: "BCA", year: "2nd Year", department: "Computer Science", batch: "2023-2026", admissionNo: "ADM-2023-001", admissionDate: "2023-07-01", mobile: "9876543217", email: "neha@email.com",     address: "67 Mall Road",     city: "Dehradun", state: "Uttarakhand",    fatherName: "Sanjay Verma",     motherName: "Rita Verma",      parentMobile: "9876543207", parentEmail: "", photo: "" },
    { id: "BCA202", name: "Rahul Joshi",     dob: "2004-05-12", gender: "Male",   course: "BCA", year: "2nd Year", department: "Computer Science", batch: "2023-2026", admissionNo: "ADM-2023-002", admissionDate: "2023-07-01", mobile: "9876543218", email: "rahul@email.com",    address: "90 Tilak Road",    city: "Pune",     state: "Maharashtra",    fatherName: "Deepak Joshi",     motherName: "Seema Joshi",     parentMobile: "9876543208", parentEmail: "", photo: "" },
    { id: "BCA203", name: "Kavita Reddy",    dob: "2004-08-25", gender: "Female", course: "BCA", year: "2nd Year", department: "Computer Science", batch: "2023-2026", admissionNo: "ADM-2023-003", admissionDate: "2023-07-02", mobile: "9876543219", email: "kavita@email.com",   address: "12 Banjara Hills", city: "Hyderabad",state: "Telangana",      fatherName: "Venkat Reddy",     motherName: "Lakshmi Reddy",   parentMobile: "9876543209", parentEmail: "", photo: "" },
    { id: "BCA204", name: "Amit Tiwari",     dob: "2004-12-03", gender: "Male",   course: "BCA", year: "2nd Year", department: "Computer Science", batch: "2023-2026", admissionNo: "ADM-2023-004", admissionDate: "2023-07-02", mobile: "9876543220", email: "amit@email.com",     address: "45 Hazratganj",    city: "Lucknow",  state: "Uttar Pradesh",  fatherName: "Manoj Tiwari",     motherName: "Anita Tiwari",    parentMobile: "9876543210", parentEmail: "", photo: "" },
    { id: "BCA205", name: "Divya Nair",      dob: "2004-10-17", gender: "Female", course: "BCA", year: "2nd Year", department: "Computer Science", batch: "2023-2026", admissionNo: "ADM-2023-005", admissionDate: "2023-07-03", mobile: "9876543221", email: "divya@email.com",    address: "78 MG Road",       city: "Kochi",    state: "Kerala",         fatherName: "Gopinath Nair",    motherName: "Radha Nair",      parentMobile: "9876543211", parentEmail: "", photo: "" },
    { id: "BCA206", name: "Saurabh Pandey",  dob: "2004-03-08", gender: "Male",   course: "BCA", year: "2nd Year", department: "Computer Science", batch: "2023-2026", admissionNo: "ADM-2023-006", admissionDate: "2023-07-03", mobile: "9876543222", email: "saurabh@email.com",  address: "56 Ashok Marg",    city: "Bhopal",   state: "Madhya Pradesh", fatherName: "Dinesh Pandey",    motherName: "Shanti Pandey",   parentMobile: "9876543212", parentEmail: "", photo: "" },
    { id: "BCA301", name: "Pooja Saxena",    dob: "2003-01-27", gender: "Female", course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-001", admissionDate: "2022-07-01", mobile: "9876543223", email: "pooja@email.com",    address: "34 Connaught Place",city: "Delhi",    state: "Delhi",          fatherName: "Arvind Saxena",    motherName: "Mala Saxena",     parentMobile: "9876543213", parentEmail: "", photo: "" },
    { id: "BCA302", name: "Kunal Mehta",     dob: "2003-06-19", gender: "Male",   course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-002", admissionDate: "2022-07-01", mobile: "9876543224", email: "kunal@email.com",    address: "89 SG Highway",    city: "Ahmedabad",state: "Gujarat",        fatherName: "Pramod Mehta",     motherName: "Nisha Mehta",     parentMobile: "9876543214", parentEmail: "", photo: "" },
    { id: "BCA303", name: "Riya Chauhan",    dob: "2003-09-11", gender: "Female", course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-003", admissionDate: "2022-07-02", mobile: "9876543225", email: "riya@email.com",     address: "23 University Road",city: "Chandigarh",state: "Chandigarh",    fatherName: "Bharat Chauhan",   motherName: "Geeta Chauhan",   parentMobile: "9876543215", parentEmail: "", photo: "" },
    { id: "BCA304", name: "Deepak Rawat",    dob: "2003-04-06", gender: "Male",   course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-004", admissionDate: "2022-07-02", mobile: "9876543226", email: "deepak@email.com",   address: "67 Rajpur Road",   city: "Dehradun", state: "Uttarakhand",    fatherName: "Mohan Rawat",      motherName: "Saroj Rawat",     parentMobile: "9876543216", parentEmail: "", photo: "" },
    { id: "BCA305", name: "Simran Kaur",     dob: "2003-11-23", gender: "Female", course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-005", admissionDate: "2022-07-03", mobile: "9876543227", email: "simran@email.com",   address: "12 Model Town",    city: "Ludhiana", state: "Punjab",         fatherName: "Harpreet Singh",   motherName: "Jaspreet Kaur",   parentMobile: "9876543217", parentEmail: "", photo: "" },
    { id: "BCA306", name: "Manish Agarwal",  dob: "2003-08-14", gender: "Male",   course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-006", admissionDate: "2022-07-03", mobile: "9876543228", email: "manish@email.com",   address: "45 Mahatma Gandhi Rd",city: "Indore", state: "Madhya Pradesh", fatherName: "Sunil Agarwal",    motherName: "Rekha Agarwal",   parentMobile: "9876543218", parentEmail: "", photo: "" },
    { id: "BCA307", name: "Tanya Bhatt",     dob: "2003-02-09", gender: "Female", course: "BCA", year: "3rd Year", department: "Computer Science", batch: "2022-2025", admissionNo: "ADM-2022-007", admissionDate: "2022-07-04", mobile: "9876543229", email: "tanya@email.com",    address: "78 Lake Road",     city: "Nainital", state: "Uttarakhand",    fatherName: "Rakesh Bhatt",     motherName: "Swati Bhatt",     parentMobile: "9876543219", parentEmail: "", photo: "" },

    // ── BBA Students (20) ──────────────────────────────────────────
    // 1st Year (7)
    { id: "BBA101", name: "Ishaan Malhotra",  dob: "2005-05-12", gender: "Male",   course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-101", admissionDate: "2024-07-01", mobile: "9871110001", email: "ishaan.m@email.com",  address: "15 Rajouri Garden",  city: "Delhi",     state: "Delhi",          fatherName: "Vivek Malhotra",   motherName: "Nisha Malhotra",   parentMobile: "9871110101", parentEmail: "", photo: "" },
    { id: "BBA102", name: "Meera Kapoor",     dob: "2005-08-28", gender: "Female", course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-102", admissionDate: "2024-07-01", mobile: "9871110002", email: "meera.k@email.com",   address: "32 Juhu Beach Road", city: "Mumbai",    state: "Maharashtra",    fatherName: "Ravi Kapoor",      motherName: "Smita Kapoor",     parentMobile: "9871110102", parentEmail: "", photo: "" },
    { id: "BBA103", name: "Aditya Choudhury", dob: "2005-02-14", gender: "Male",   course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-103", admissionDate: "2024-07-02", mobile: "9871110003", email: "aditya.c@email.com",  address: "67 Salt Lake",       city: "Kolkata",   state: "West Bengal",    fatherName: "Subir Choudhury",  motherName: "Ruma Choudhury",   parentMobile: "9871110103", parentEmail: "", photo: "" },
    { id: "BBA104", name: "Nikita Bansal",    dob: "2005-10-03", gender: "Female", course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-104", admissionDate: "2024-07-02", mobile: "9871110004", email: "nikita.b@email.com",  address: "11 Civil Lines",     city: "Agra",      state: "Uttar Pradesh",  fatherName: "Pawan Bansal",     motherName: "Rina Bansal",      parentMobile: "9871110104", parentEmail: "", photo: "" },
    { id: "BBA105", name: "Karan Thakur",     dob: "2005-01-20", gender: "Male",   course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-105", admissionDate: "2024-07-03", mobile: "9871110005", email: "karan.t@email.com",   address: "45 Mall Road",       city: "Shimla",    state: "Himachal Pradesh",fatherName: "Naresh Thakur",    motherName: "Suman Thakur",     parentMobile: "9871110105", parentEmail: "", photo: "" },
    { id: "BBA106", name: "Shruti Jain",      dob: "2005-07-09", gender: "Female", course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-106", admissionDate: "2024-07-03", mobile: "9871110006", email: "shruti.j@email.com",  address: "23 Vaishali Nagar",  city: "Jaipur",    state: "Rajasthan",      fatherName: "Hemant Jain",      motherName: "Usha Jain",        parentMobile: "9871110106", parentEmail: "", photo: "" },
    { id: "BBA107", name: "Siddharth Dubey",  dob: "2005-12-17", gender: "Male",   course: "BBA", year: "1st Year", department: "Business Administration", batch: "2024-2027", admissionNo: "ADM-2024-107", admissionDate: "2024-07-04", mobile: "9871110007", email: "sid.d@email.com",     address: "78 Gomti Nagar",     city: "Lucknow",   state: "Uttar Pradesh",  fatherName: "Ashok Dubey",      motherName: "Neelam Dubey",     parentMobile: "9871110107", parentEmail: "", photo: "" },
    // 2nd Year (7)
    { id: "BBA201", name: "Ritika Sinha",     dob: "2004-04-18", gender: "Female", course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-101", admissionDate: "2023-07-01", mobile: "9871110008", email: "ritika.s@email.com",  address: "90 Boring Road",     city: "Patna",     state: "Bihar",          fatherName: "Alok Sinha",       motherName: "Madhuri Sinha",    parentMobile: "9871110108", parentEmail: "", photo: "" },
    { id: "BBA202", name: "Varun Khanna",     dob: "2004-06-25", gender: "Male",   course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-102", admissionDate: "2023-07-01", mobile: "9871110009", email: "varun.k@email.com",   address: "12 Sector 22",       city: "Chandigarh",state: "Chandigarh",     fatherName: "Rajiv Khanna",     motherName: "Manju Khanna",     parentMobile: "9871110109", parentEmail: "", photo: "" },
    { id: "BBA203", name: "Ankita Roy",       dob: "2004-09-01", gender: "Female", course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-103", admissionDate: "2023-07-02", mobile: "9871110010", email: "ankita.r@email.com",  address: "34 Park Circus",     city: "Kolkata",   state: "West Bengal",    fatherName: "Tapan Roy",        motherName: "Mita Roy",         parentMobile: "9871110110", parentEmail: "", photo: "" },
    { id: "BBA204", name: "Harsh Goyal",      dob: "2004-11-14", gender: "Male",   course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-104", admissionDate: "2023-07-02", mobile: "9871110011", email: "harsh.g@email.com",   address: "56 Nehru Place",     city: "Delhi",     state: "Delhi",          fatherName: "Rajan Goyal",      motherName: "Priti Goyal",      parentMobile: "9871110111", parentEmail: "", photo: "" },
    { id: "BBA205", name: "Palak Arora",      dob: "2004-03-22", gender: "Female", course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-105", admissionDate: "2023-07-03", mobile: "9871110012", email: "palak.a@email.com",   address: "89 GT Road",         city: "Amritsar",  state: "Punjab",         fatherName: "Sandeep Arora",    motherName: "Kamal Arora",      parentMobile: "9871110112", parentEmail: "", photo: "" },
    { id: "BBA206", name: "Rohan Deshmukh",   dob: "2004-08-07", gender: "Male",   course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-106", admissionDate: "2023-07-03", mobile: "9871110013", email: "rohan.d@email.com",   address: "23 FC Road",         city: "Pune",      state: "Maharashtra",    fatherName: "Sachin Deshmukh",  motherName: "Swati Deshmukh",   parentMobile: "9871110113", parentEmail: "", photo: "" },
    { id: "BBA207", name: "Nandini Pillai",   dob: "2004-01-30", gender: "Female", course: "BBA", year: "2nd Year", department: "Business Administration", batch: "2023-2026", admissionNo: "ADM-2023-107", admissionDate: "2023-07-04", mobile: "9871110014", email: "nandini.p@email.com", address: "67 Beach Road",      city: "Chennai",   state: "Tamil Nadu",     fatherName: "Suresh Pillai",    motherName: "Lata Pillai",      parentMobile: "9871110114", parentEmail: "", photo: "" },
    // 3rd Year (6)
    { id: "BBA301", name: "Tushar Saxena",    dob: "2003-05-16", gender: "Male",   course: "BBA", year: "3rd Year", department: "Business Administration", batch: "2022-2025", admissionNo: "ADM-2022-101", admissionDate: "2022-07-01", mobile: "9871110015", email: "tushar.s@email.com",  address: "45 Janpath",         city: "Delhi",     state: "Delhi",          fatherName: "Prakash Saxena",   motherName: "Renu Saxena",      parentMobile: "9871110115", parentEmail: "", photo: "" },
    { id: "BBA302", name: "Isha Chauhan",     dob: "2003-07-22", gender: "Female", course: "BBA", year: "3rd Year", department: "Business Administration", batch: "2022-2025", admissionNo: "ADM-2022-102", admissionDate: "2022-07-01", mobile: "9871110016", email: "isha.c@email.com",    address: "12 Haldwani Road",   city: "Nainital",  state: "Uttarakhand",    fatherName: "Lalit Chauhan",    motherName: "Kamla Chauhan",    parentMobile: "9871110116", parentEmail: "", photo: "" },
    { id: "BBA303", name: "Pranav Kulkarni",  dob: "2003-10-09", gender: "Male",   course: "BBA", year: "3rd Year", department: "Business Administration", batch: "2022-2025", admissionNo: "ADM-2022-103", admissionDate: "2022-07-02", mobile: "9871110017", email: "pranav.k@email.com",  address: "78 Koregaon Park",   city: "Pune",      state: "Maharashtra",    fatherName: "Mohan Kulkarni",   motherName: "Sunanda Kulkarni", parentMobile: "9871110117", parentEmail: "", photo: "" },
    { id: "BBA304", name: "Diya Menon",       dob: "2003-02-28", gender: "Female", course: "BBA", year: "3rd Year", department: "Business Administration", batch: "2022-2025", admissionNo: "ADM-2022-104", admissionDate: "2022-07-02", mobile: "9871110018", email: "diya.m@email.com",    address: "34 Indiranagar",     city: "Bangalore", state: "Karnataka",      fatherName: "Krishna Menon",    motherName: "Radha Menon",      parentMobile: "9871110118", parentEmail: "", photo: "" },
    { id: "BBA305", name: "Aman Rajput",      dob: "2003-12-04", gender: "Male",   course: "BBA", year: "3rd Year", department: "Business Administration", batch: "2022-2025", admissionNo: "ADM-2022-105", admissionDate: "2022-07-03", mobile: "9871110019", email: "aman.r@email.com",    address: "56 MI Road",         city: "Jaipur",    state: "Rajasthan",      fatherName: "Vijay Rajput",     motherName: "Mamta Rajput",     parentMobile: "9871110119", parentEmail: "", photo: "" },
    { id: "BBA306", name: "Swati Tripathi",   dob: "2003-06-11", gender: "Female", course: "BBA", year: "3rd Year", department: "Business Administration", batch: "2022-2025", admissionNo: "ADM-2022-106", admissionDate: "2022-07-03", mobile: "9871110020", email: "swati.t@email.com",   address: "89 Hazratganj",      city: "Lucknow",   state: "Uttar Pradesh",  fatherName: "Girish Tripathi",  motherName: "Anuradha Tripathi",parentMobile: "9871110120", parentEmail: "", photo: "" },

    // ── MBA Students (14) ──────────────────────────────────────────
    // 1st Year (7)
    { id: "MBA101", name: "Aakash Mehra",     dob: "2001-03-10", gender: "Male",   course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-201", admissionDate: "2024-07-01", mobile: "9872220001", email: "aakash.m@email.com",  address: "10 Residency Road",  city: "Bangalore", state: "Karnataka",      fatherName: "Sudhir Mehra",     motherName: "Aarti Mehra",      parentMobile: "9872220101", parentEmail: "", photo: "" },
    { id: "MBA102", name: "Fatima Sheikh",    dob: "2001-06-18", gender: "Female", course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-202", admissionDate: "2024-07-01", mobile: "9872220002", email: "fatima.s@email.com",  address: "34 Bandra West",     city: "Mumbai",    state: "Maharashtra",    fatherName: "Irfan Sheikh",     motherName: "Rukhsar Sheikh",   parentMobile: "9872220102", parentEmail: "", photo: "" },
    { id: "MBA103", name: "Gaurav Bhardwaj",  dob: "2001-09-25", gender: "Male",   course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-203", admissionDate: "2024-07-02", mobile: "9872220003", email: "gaurav.b@email.com",  address: "56 Laxmi Nagar",     city: "Delhi",     state: "Delhi",          fatherName: "Hari Bhardwaj",    motherName: "Pushpa Bhardwaj",  parentMobile: "9872220103", parentEmail: "", photo: "" },
    { id: "MBA104", name: "Lakshmi Iyer",     dob: "2001-12-02", gender: "Female", course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-204", admissionDate: "2024-07-02", mobile: "9872220004", email: "lakshmi.i@email.com", address: "78 Anna Nagar",      city: "Chennai",   state: "Tamil Nadu",     fatherName: "Ramesh Iyer",      motherName: "Saraswati Iyer",   parentMobile: "9872220104", parentEmail: "", photo: "" },
    { id: "MBA105", name: "Nikhil Oberoi",    dob: "2001-04-14", gender: "Male",   course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-205", admissionDate: "2024-07-03", mobile: "9872220005", email: "nikhil.o@email.com",  address: "23 Sector 44",       city: "Gurgaon",   state: "Haryana",        fatherName: "Ajay Oberoi",      motherName: "Deepti Oberoi",    parentMobile: "9872220105", parentEmail: "", photo: "" },
    { id: "MBA106", name: "Tanvi Desai",      dob: "2001-07-30", gender: "Female", course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-206", admissionDate: "2024-07-03", mobile: "9872220006", email: "tanvi.d@email.com",   address: "45 CG Road",         city: "Ahmedabad", state: "Gujarat",        fatherName: "Nilesh Desai",     motherName: "Hetal Desai",      parentMobile: "9872220106", parentEmail: "", photo: "" },
    { id: "MBA107", name: "Rajat Bhatia",     dob: "2001-11-08", gender: "Male",   course: "MBA", year: "1st Year", department: "Management Studies", batch: "2024-2026", admissionNo: "ADM-2024-207", admissionDate: "2024-07-04", mobile: "9872220007", email: "rajat.b@email.com",   address: "67 Phase 5",         city: "Mohali",    state: "Punjab",         fatherName: "Harish Bhatia",    motherName: "Poonam Bhatia",    parentMobile: "9872220107", parentEmail: "", photo: "" },
    // 2nd Year (7)
    { id: "MBA201", name: "Sonal Agarwal",    dob: "2000-02-15", gender: "Female", course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-201", admissionDate: "2023-07-01", mobile: "9872220008", email: "sonal.a@email.com",   address: "90 Ashram Road",     city: "Ahmedabad", state: "Gujarat",        fatherName: "Mukesh Agarwal",   motherName: "Neeta Agarwal",    parentMobile: "9872220108", parentEmail: "", photo: "" },
    { id: "MBA202", name: "Vivek Rathore",    dob: "2000-05-21", gender: "Male",   course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-202", admissionDate: "2023-07-01", mobile: "9872220009", email: "vivek.r@email.com",   address: "12 Hawa Mahal Road", city: "Jaipur",    state: "Rajasthan",      fatherName: "Bhupendra Rathore",motherName: "Kiran Rathore",    parentMobile: "9872220109", parentEmail: "", photo: "" },
    { id: "MBA203", name: "Aditi Sharma",     dob: "2000-08-09", gender: "Female", course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-203", admissionDate: "2023-07-02", mobile: "9872220010", email: "aditi.s@email.com",   address: "34 Sector 18",       city: "Noida",     state: "Uttar Pradesh",  fatherName: "Yogesh Sharma",    motherName: "Archana Sharma",   parentMobile: "9872220110", parentEmail: "", photo: "" },
    { id: "MBA204", name: "Sameer Hussain",   dob: "2000-10-27", gender: "Male",   course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-204", admissionDate: "2023-07-02", mobile: "9872220011", email: "sameer.h@email.com",  address: "56 Charminar Road",  city: "Hyderabad", state: "Telangana",      fatherName: "Nasir Hussain",    motherName: "Shabana Hussain",  parentMobile: "9872220111", parentEmail: "", photo: "" },
    { id: "MBA205", name: "Prerna Mathur",    dob: "2000-01-13", gender: "Female", course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-205", admissionDate: "2023-07-03", mobile: "9872220012", email: "prerna.m@email.com",  address: "78 Tonk Road",       city: "Jaipur",    state: "Rajasthan",      fatherName: "Rajendra Mathur",  motherName: "Sarla Mathur",     parentMobile: "9872220112", parentEmail: "", photo: "" },
    { id: "MBA206", name: "Dhruv Sethi",      dob: "2000-06-06", gender: "Male",   course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-206", admissionDate: "2023-07-03", mobile: "9872220013", email: "dhruv.s@email.com",   address: "23 Rajendra Place",  city: "Delhi",     state: "Delhi",          fatherName: "Vikram Sethi",     motherName: "Ritu Sethi",       parentMobile: "9872220113", parentEmail: "", photo: "" },
    { id: "MBA207", name: "Keerthi Nambiar",  dob: "2000-09-19", gender: "Female", course: "MBA", year: "2nd Year", department: "Management Studies", batch: "2023-2025", admissionNo: "ADM-2023-207", admissionDate: "2023-07-04", mobile: "9872220014", email: "keerthi.n@email.com", address: "45 MG Road",         city: "Trivandrum",state: "Kerala",         fatherName: "Gopan Nambiar",    motherName: "Jayashree Nambiar",parentMobile: "9872220114", parentEmail: "", photo: "" },
  ];

  const SEED_CLASSES = [
    { id: "bca-1st-year", course: "BCA", year: "1st Year" },
    { id: "bca-2nd-year", course: "BCA", year: "2nd Year" },
    { id: "bca-3rd-year", course: "BCA", year: "3rd Year" },
    { id: "bba-1st-year", course: "BBA", year: "1st Year" },
    { id: "bba-2nd-year", course: "BBA", year: "2nd Year" },
    { id: "bba-3rd-year", course: "BBA", year: "3rd Year" },
    { id: "mba-1st-year", course: "MBA", year: "1st Year" },
    { id: "mba-2nd-year", course: "MBA", year: "2nd Year" },
  ];

  // Generate sample attendance for last 10 days
  function _generateSeedAttendance() {
    var records = [];
    var statuses = ["Present", "Present", "Present", "Present", "Absent", "Late", "Leave"];
    var today = new Date();
    for (var d = 1; d <= 10; d++) {
      var dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      // Skip weekends
      if (dt.getDay() === 0 || dt.getDay() === 6) continue;
      var dateStr = dt.toISOString().split("T")[0];
      SEED_STUDENTS.forEach(function (s) {
        var classId = (s.course + "-" + s.year).toLowerCase().replace(/\s+/g, "-");
        records.push({
          studentId: s.id,
          classId: classId,
          date: dateStr,
          time: "09:00",
          status: statuses[Math.floor(Math.random() * statuses.length)],
          remarks: "",
        });
      });
    }
    return records;
  }

  function seedDemoUsers() {
    var existing = _get(KEYS.users, []);
    if (existing.length === 0) {
      _set(KEYS.users, DEMO_USERS);
    } else {
      DEMO_USERS.forEach(function (demo) {
        if (!existing.some(function (u) { return u.username === demo.username; })) {
          existing.push(demo);
        }
      });
      _set(KEYS.users, existing);
    }

    // Create user accounts for all seed students (username = student ID, password = student ID)
    var users = _get(KEYS.users, []);
    SEED_STUDENTS.forEach(function (s) {
      if (!users.some(function (u) { return u.username === s.id; })) {
        users.push({
          username: s.id,
          password: s.id,
          role: "student",
          name: s.name,
          email: s.email || "",
          studentId: s.id,
        });
      }
    });
    _set(KEYS.users, users);
  }

  // Seed students and classes data if not present
  function seedData() {
    // Seed classes
    var existingClasses = _get(KEYS.classes, []);
    if (existingClasses.length === 0) {
      _set(KEYS.classes, SEED_CLASSES);
    }

    // Seed students
    var existingStudents = _get(KEYS.students, []);
    if (existingStudents.length === 0) {
      _set(KEYS.students, SEED_STUDENTS);
    }

    // Seed attendance
    var existingAttendance = _get(KEYS.attendance, []);
    if (existingAttendance.length === 0) {
      _set(KEYS.attendance, _generateSeedAttendance());
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
      studentId: user.studentId || null,
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

  // Seed demo users and data on load
  seedDemoUsers();
  seedData();

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
    seedData,
    // Utils
    generateId: _generateId,
  };
})();
