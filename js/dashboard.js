/* ============================================================
   dashboard.js — Dashboard Page Controller
   Vanilla JavaScript for Student Attendance Management System
   Shows role-specific dashboards:
   - Admin/Teacher: Overview stats + recent activity
   - Student: Personal profile + own attendance info
   ============================================================ */

(function () {
  "use strict";

  /**
   * Determine and render greeting based on client time of day
   */
  function updateGreeting() {
    const greetingEl = document.getElementById("dashboard-greeting");
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour >= 5 && hour < 12) {
      greeting = "Good morning";
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
    }

    greetingEl.textContent = `— ${greeting}`;
  }

  // ── Student Dashboard ─────────────────────────────────────────
  function renderStudentDashboard() {
    const session = Store.getSession();
    if (!session || !session.studentId) return;

    const student = Store.getStudentById(session.studentId);
    if (!student) return;

    const stats = Store.getStudentStats(student.id);
    const threshold = Store.getThreshold();
    const belowThreshold = stats.pct !== null && stats.pct < threshold;

    const pageEl = document.querySelector(".page");
    if (!pageEl) return;

    const pctText = stats.pct !== null ? Math.round(stats.pct) + "%" : "N/A";
    const pctClass = App.pctBadgeClass(stats.pct);
    const photoSrc = student.photo || "assets/default-avatar.svg";

    let html = `
      <h1 class="page-title">
        My Dashboard <small id="dashboard-greeting">— Good evening</small>
      </h1>

      <!-- Student Profile Card -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; padding: 0.5rem 0;">
          <img src="${App.esc(photoSrc)}" alt="${App.esc(student.name)}"
               style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--clr-primary-light); background: #eee; flex-shrink: 0;"
               onerror="this.src='assets/default-avatar.svg'" />
          <div style="flex: 1; min-width: 200px;">
            <h2 style="margin: 0; font-size: 1.35rem; color: var(--clr-text);">${App.esc(student.name)}</h2>
            <p style="margin: 0.3rem 0 0; font-size: 0.88rem; color: var(--clr-text-muted);">
              <strong>Roll No:</strong> ${App.esc(student.id)}
              &bull; <strong>Course:</strong> ${App.esc(student.course || "—")}
              &bull; <strong>Year:</strong> ${App.esc(student.year || "—")}
            </p>
            <p style="margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--clr-text-muted);">
              ${student.department ? `<strong>Dept:</strong> ${App.esc(student.department)} &bull; ` : ""}
              <strong>Batch:</strong> ${App.esc(student.batch || "—")}
            </p>
          </div>
        </div>
      </div>

      <!-- Attendance Stats Grid -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-card__value"><span class="pct-badge ${pctClass}" style="font-size: 1.5rem; padding: 0.35rem 0.85rem;">${pctText}</span></div>
          <div class="stat-card__label">Overall Attendance</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value" style="color: var(--clr-success);">${stats.present}</div>
          <div class="stat-card__label">Days Present</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value" style="color: var(--clr-danger);">${stats.absent}</div>
          <div class="stat-card__label">Days Absent</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value" style="color: var(--clr-warning);">${stats.late + stats.leave}</div>
          <div class="stat-card__label">Late / Leave</div>
        </div>
      </div>

      ${belowThreshold ? `
      <div style="background: var(--clr-danger-light); color: var(--clr-danger); border: 1px solid var(--clr-danger); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1.5rem; font-size: 0.88rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>⚠️</span>
        <span><strong>Low Attendance Warning:</strong> Your attendance is below the required ${threshold}% threshold. Please ensure regular attendance.</span>
      </div>` : ""}

      <!-- Personal Details -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card__header"><h2 class="card__title">Personal Information</h2></div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; padding-top: 0.5rem;">
          <div>
            <h4 style="margin: 0 0 0.65rem; font-size: 0.92rem; color: var(--clr-primary); border-bottom: 2px solid var(--clr-primary-light); padding-bottom: 0.25rem;">Contact Details</h4>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
              <div><span style="color: var(--clr-text-muted);">Mobile:</span> <strong>${App.esc(student.mobile || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Email:</span> <strong>${App.esc(student.email || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Address:</span> <strong>${App.esc(student.address || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">City:</span> <strong>${App.esc(student.city || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">State:</span> <strong>${App.esc(student.state || "—")}</strong></div>
            </div>
          </div>
          <div>
            <h4 style="margin: 0 0 0.65rem; font-size: 0.92rem; color: var(--clr-primary); border-bottom: 2px solid var(--clr-primary-light); padding-bottom: 0.25rem;">Parent / Guardian</h4>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
              <div><span style="color: var(--clr-text-muted);">Father/Guardian:</span> <strong>${App.esc(student.fatherName || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Mother:</span> <strong>${App.esc(student.motherName || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Parent Mobile:</span> <strong>${App.esc(student.parentMobile || "—")}</strong></div>
              ${student.parentEmail ? `<div><span style="color: var(--clr-text-muted);">Parent Email:</span> <strong>${App.esc(student.parentEmail)}</strong></div>` : ""}
            </div>
          </div>
          <div>
            <h4 style="margin: 0 0 0.65rem; font-size: 0.92rem; color: var(--clr-primary); border-bottom: 2px solid var(--clr-primary-light); padding-bottom: 0.25rem;">Academic Details</h4>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
              <div><span style="color: var(--clr-text-muted);">DOB:</span> <strong>${student.dob ? App.formatDate(student.dob) : "—"}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Gender:</span> <strong>${App.esc(student.gender || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Admission No:</span> <strong>${App.esc(student.admissionNo || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Admission Date:</span> <strong>${student.admissionDate ? App.formatDate(student.admissionDate) : "—"}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance History -->
      <div class="card">
        <div class="card__header"><h2 class="card__title">Recent Attendance History</h2></div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody id="student-attendance-history"></tbody>
          </table>
        </div>
        <div id="no-history" class="table-empty" style="display: none;">
          <p>No attendance records found yet.</p>
        </div>
      </div>
    `;

    pageEl.innerHTML = html;
    updateGreeting();

    // Populate attendance history
    const records = Store.getAttendanceByStudent(student.id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const historyBody = document.getElementById("student-attendance-history");
    const noHistory = document.getElementById("no-history");

    if (records.length === 0) {
      noHistory.style.display = "block";
    } else {
      const recent = records.slice(0, 30);
      let tableHtml = "";
      recent.forEach((rec) => {
        tableHtml += `
          <tr>
            <td>${App.formatDate(rec.date)}</td>
            <td>${App.statusPillHTML(rec.status)}</td>
            <td>${App.esc(rec.remarks || "—")}</td>
          </tr>
        `;
      });
      historyBody.innerHTML = tableHtml;
    }
  }

  // ── Admin/Teacher Dashboard ───────────────────────────────────
  function renderStats() {
    const students = Store.getStudents() || [];
    const threshold = Store.getThreshold();

    const totalStudentsEl = document.getElementById("stat-total-students");
    if (totalStudentsEl) {
      totalStudentsEl.textContent = students.length;
    }

    const today = App.todayISO();
    const todayRecords = Store.getAttendanceByDate(today) || [];
    const todayAttendanceEl =
      document.getElementById("stat-today-attendance") ||
      document.getElementById("stat-today-pct");

    if (todayAttendanceEl) {
      if (todayRecords.length > 0) {
        const attended = todayRecords.filter(
          (r) => r.status === "Present" || r.status === "Late"
        ).length;
        const pct = Math.round((attended / todayRecords.length) * 100);
        todayAttendanceEl.textContent = `${pct}%`;
      } else {
        todayAttendanceEl.textContent = "0%";
      }
    }

    const belowThresholdEl = document.getElementById("stat-below-threshold");
    if (belowThresholdEl) {
      let belowCount = 0;
      students.forEach((student) => {
        const stats = Store.getStudentStats(student.id);
        if (stats && stats.pct !== null && stats.pct < threshold) {
          belowCount++;
        }
      });
      belowThresholdEl.textContent = belowCount;
    }
  }

  function renderActivityFeed() {
    const feedEl = document.getElementById("activity-feed");
    if (!feedEl) return;

    const attendance = Store.getAttendance() || [];
    if (attendance.length === 0) {
      feedEl.innerHTML =
        '<li class="table-empty" style="list-style: none; text-align: center; padding: 2rem; width: 100%; border-bottom: none;">No data yet.</li>';
      return;
    }

    const sorted = attendance
      .map((record, index) => ({ record, index }))
      .sort((a, b) => {
        const dateDiff = (b.record.date || "").localeCompare(a.record.date || "");
        if (dateDiff !== 0) return dateDiff;
        const timeDiff = (b.record.time || "").localeCompare(a.record.time || "");
        if (timeDiff !== 0) return timeDiff;
        return b.index - a.index;
      })
      .slice(0, 10);

    feedEl.innerHTML = "";

    sorted.forEach(({ record }) => {
      const student = Store.getStudentById(record.studentId);
      const studentName = student
        ? student.name
        : record.studentId || "Unknown Student";
      const status = record.status || "Present";
      const statusLower = status.toLowerCase();

      const formattedDate = App.formatDate(record.date);
      const formattedTime = record.time ? App.formatTime(record.time) : "";

      const li = document.createElement("li");
      li.innerHTML = `
        <span class="activity-dot activity-dot--${statusLower}"></span>
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span style="font-weight: 600; color: var(--clr-text);">${App.esc(studentName)}</span>
            <div style="font-size: 0.78rem; color: var(--clr-text-muted); margin-top: 2px;">
              ${App.esc(formattedDate)}${formattedTime ? " at " + App.esc(formattedTime) : ""}
            </div>
          </div>
          <div>
            ${App.statusPillHTML(status)}
          </div>
        </div>
      `;
      feedEl.appendChild(li);
    });
  }

  /**
   * Initialize dashboard based on role
   */
  function initDashboard() {
    const session = Store.getSession();

    // Student role: render personalized student dashboard
    if (session && session.role === "student" && session.studentId) {
      renderStudentDashboard();
      return;
    }

    // Admin/Teacher: render normal dashboard
    updateGreeting();
    renderStats();
    renderActivityFeed();

    // Hide admin-only quick actions for teacher
    if (session && session.role !== "admin") {
      const qaAdd = document.getElementById("qa-add-student");
      const qaSettings = document.getElementById("qa-settings");
      if (qaAdd) qaAdd.style.display = "none";
      if (qaSettings) qaSettings.style.display = "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }

  window.addEventListener("pageshow", initDashboard);
})();
