/* ============================================================
   dashboard.js — Dashboard Page Controller
   Vanilla JavaScript for Student Attendance Management System
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

  /**
   * Calculate and render the 4 summary statistics
   */
  function renderStats() {
    const students = Store.getStudents() || [];
    const threshold = Store.getThreshold();

    // 1. Total Students
    const totalStudentsEl = document.getElementById("stat-total-students");
    if (totalStudentsEl) {
      totalStudentsEl.textContent = students.length;
    }

    // 2. Today's Attendance %
    // Formula: (present + late entries today) / (total entries today) * 100
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

    // 4. Students Below Threshold
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

  /**
   * Render the latest 10 attendance records in the activity feed
   */
  function renderActivityFeed() {
    const feedEl = document.getElementById("activity-feed");
    if (!feedEl) return;

    const attendance = Store.getAttendance() || [];
    if (attendance.length === 0) {
      feedEl.innerHTML =
        '<li class="table-empty" style="list-style: none; text-align: center; padding: 2rem; width: 100%; border-bottom: none;">No data yet.</li>';
      return;
    }

    // Sort: date desc, time desc, reverse-insertion order desc
    const sorted = attendance
      .map((record, index) => ({ record, index }))
      .sort((a, b) => {
        const dateDiff = (b.record.date || "").localeCompare(
          a.record.date || ""
        );
        if (dateDiff !== 0) return dateDiff;
        const timeDiff = (b.record.time || "").localeCompare(
          a.record.time || ""
        );
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
   * Initialize full dashboard
   */
  function initDashboard() {
    updateGreeting();
    renderStats();
    renderActivityFeed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }

  window.addEventListener("pageshow", initDashboard);
})();
