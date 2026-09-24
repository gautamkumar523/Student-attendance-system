/* ============================================================
   student-profile.js — Student Profile Page Controller
   Vanilla JavaScript for Student Attendance Management System
   Handles student header, tabs, personal info display,
   attendance summary, and history filter.
   ============================================================ */

(function () {
  "use strict";

  const DEFAULT_AVATAR = "assets/default-avatar.svg";

  // ── Show Error if Student Not Found ──────────────────────────
  function showNotFoundError(message) {
    const profileContent = document.getElementById("student-profile-content");
    const notFoundCard = document.getElementById("student-not-found");
    const errorMsgEl = document.getElementById("error-message");

    if (profileContent) {
      profileContent.style.display = "none";
    }
    if (notFoundCard) {
      notFoundCard.style.display = "block";
    }
    if (errorMsgEl && message) {
      errorMsgEl.textContent = message;
    }
    App.toast(message || "Student not found.", "error");
  }

  // ── Tab Switching ─────────────────────────────────────────────
  function initTabs() {
    const tabBtns = document.querySelectorAll(".tabs .tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTabId = btn.getAttribute("data-tab");

        tabBtns.forEach((b) => {
          b.classList.remove("tab-btn--active");
          b.setAttribute("aria-selected", "false");
        });
        tabPanels.forEach((p) => {
          p.classList.remove("tab-panel--active");
        });

        btn.classList.add("tab-btn--active");
        btn.setAttribute("aria-selected", "true");

        const targetPanel = document.getElementById(targetTabId);
        if (targetPanel) {
          targetPanel.classList.add("tab-panel--active");
        }
      });
    });
  }

  // ── Populate Profile Header ───────────────────────────────────
  function populateProfileHeader(student) {
    const photoEl = document.getElementById("profile-photo");
    const nameEl = document.getElementById("profile-name");
    const idEl = document.getElementById("profile-id");
    const courseEl = document.getElementById("profile-course");
    const pctEl = document.getElementById("profile-pct");
    const editBtn = document.getElementById("btn-edit-profile");

    // Photo
    if (photoEl) {
      const src = student.photo && student.photo.trim() ? student.photo : DEFAULT_AVATAR;
      photoEl.src = src;
      photoEl.alt = student.name ? `${student.name}'s Photo` : "Student Photo";
      photoEl.onerror = function () {
        this.onerror = null;
        this.src = DEFAULT_AVATAR;
      };
    }

    // Name
    if (nameEl) {
      nameEl.textContent = student.name || "Unnamed Student";
    }

    // Roll No / ID
    const rollNo = student.rollNo || student.admissionNo || student.roll || student.id || "—";
    if (idEl) {
      idEl.textContent = `Roll No: ${rollNo}`;
      idEl.dataset.id = student.id || "";
    }

    // Course
    if (courseEl) {
      courseEl.textContent = student.course || "—";
    }

    // Overall Attendance % Badge
    const stats = Store.getStudentStats(student.id);
    if (pctEl) {
      if (stats && stats.pct !== null) {
        const pctFormatted = Number.isInteger(stats.pct) ? `${stats.pct}%` : `${stats.pct.toFixed(1)}%`;
        pctEl.textContent = pctFormatted;
        pctEl.className = `pct-badge ${App.pctBadgeClass(stats.pct)}`;
      } else {
        pctEl.textContent = "No Attendance";
        pctEl.className = "pct-badge";
        pctEl.style.background = "#e9ecef";
        pctEl.style.color = "#6c757d";
      }
    }

    // Edit button link
    if (editBtn) {
      editBtn.href = `add-student.html?edit=${encodeURIComponent(student.id)}`;
    }
  }

  // ── Tab 1: Personal Info ──────────────────────────────────────
  function renderPersonalInfo(student) {
    const container = document.getElementById("personal-info-container");
    if (!container) return;

    const groups = [
      {
        title: "Basic Details",
        fields: [
          { key: "id", label: "Student ID / Roll Number" },
          { key: "name", label: "Full Name" },
          { key: "dob", label: "Date of Birth", format: App.formatDate },
          { key: "gender", label: "Gender" },
        ],
      },
      {
        title: "Academic Details",
        fields: [
          { key: "course", label: "Course / Class" },
          { key: "year", label: "Year" },
          { key: "department", label: "Department" },
          { key: "batch", label: "Batch / Session" },
          { key: "admissionNo", label: "Admission Number" },
          { key: "admissionDate", label: "Admission Date", format: App.formatDate },
        ],
      },
      {
        title: "Contact Details",
        fields: [
          { key: "mobile", label: "Mobile Number" },
          { key: "email", label: "Email Address" },
          { key: "address", label: "Address", fullWidth: true },
          { key: "city", label: "City" },
          { key: "state", label: "State" },
        ],
      },
      {
        title: "Parent / Guardian Details",
        fields: [
          { key: "fatherName", label: "Father's / Guardian's Name" },
          { key: "motherName", label: "Mother's Name" },
          { key: "parentMobile", label: "Parent Mobile" },
          { key: "parentEmail", label: "Parent Email" },
        ],
      },
    ];

    let html = "";
    groups.forEach((group) => {
      const nonEmpty = group.fields.filter((f) => {
        const val = student[f.key];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });

      html += `
        <div class="info-group">
          <h3 class="info-group__title">${group.title}</h3>
          ${
            nonEmpty.length > 0
              ? `<div class="form-grid">
                  ${nonEmpty
                    .map((f) => {
                      const rawVal = student[f.key];
                      const displayVal = f.format ? f.format(rawVal) : String(rawVal);
                      return `
                        <div class="form-group ${f.fullWidth ? "form-group--full" : ""}">
                          <span class="form-label">${f.label}</span>
                          <div class="info-value">${App.esc(displayVal)}</div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>`
              : `<p style="color: var(--clr-text-muted); font-size: 0.88rem; font-style: italic; margin-top: 0.25rem;">No details provided.</p>`
          }
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ── Tab 2: Attendance Summary ─────────────────────────────────
  function renderAttendanceSummary(studentId) {
    const stats = Store.getStudentStats(studentId);
    const threshold = Store.getThreshold();

    // Mini stats values
    const presentEl = document.getElementById("stat-present");
    const absentEl = document.getElementById("stat-absent");
    const lateEl = document.getElementById("stat-late");
    const leaveEl = document.getElementById("stat-leave");
    const totalEl = document.getElementById("stat-total");
    const pctEl = document.getElementById("stat-pct");
    const pctCard = document.getElementById("stat-pct-card");

    if (presentEl) presentEl.textContent = stats.present;
    if (absentEl) absentEl.textContent = stats.absent;
    if (lateEl) lateEl.textContent = stats.late;
    if (leaveEl) leaveEl.textContent = stats.leave;
    if (totalEl) totalEl.textContent = stats.total;

    if (pctEl && pctCard) {
      if (stats.pct !== null) {
        const pctFormatted = Number.isInteger(stats.pct) ? `${stats.pct}%` : `${stats.pct.toFixed(1)}%`;
        pctEl.textContent = pctFormatted;
        if (stats.pct >= threshold) {
          pctCard.className = "stat-card stat-card--success";
        } else if (stats.pct >= 50) {
          pctCard.className = "stat-card stat-card--warning";
        } else {
          pctCard.className = "stat-card stat-card--danger";
        }
      } else {
        pctEl.textContent = "—";
        pctCard.className = "stat-card";
      }
    }
  }

  // ── Tab 3: Attendance History ─────────────────────────────────
  function initHistory(studentId) {
    const tbody = document.getElementById("hist-table-body");
    if (!tbody) return;

    const threshold = Store.getThreshold();

    // Set default date to today
    const specificDate = document.getElementById("hist-specific-date");
    if (specificDate) specificDate.value = App.todayISO();

    // Set default month to current month
    const monthPicker = document.getElementById("hist-month-picker");
    if (monthPicker) monthPicker.value = App.todayISO().substring(0, 7);

    // ── View mode toggle ──
    let currentMode = "day";
    const viewToggle = document.getElementById("hist-view-toggle");
    const dayFilter = document.getElementById("hist-day-filter");
    const monthFilter = document.getElementById("hist-month-filter");
    const totalFilter = document.getElementById("hist-total-filter");

    if (viewToggle) {
      viewToggle.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentMode = btn.dataset.mode;
          viewToggle.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          if (dayFilter) dayFilter.style.display = currentMode === "day" ? "" : "none";
          if (monthFilter) monthFilter.style.display = currentMode === "month" ? "" : "none";
          if (totalFilter) totalFilter.style.display = currentMode === "total" ? "" : "none";
          renderTable();
        });
      });
    }

    // ── Render table based on current mode ──
    function renderTable() {
      let records = Store.getAttendanceByStudent(studentId);

      if (currentMode === "day") {
        const dateVal = specificDate ? specificDate.value : "";
        if (dateVal) records = records.filter((r) => r.date === dateVal);
      } else if (currentMode === "month") {
        const monthVal = monthPicker ? monthPicker.value : "";
        if (monthVal) {
          const range = App.getMonthRange(monthVal);
          if (range) records = records.filter((r) => r.date >= range.start && r.date <= range.end);
        }
      }

      // Sort descending
      records.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.time || "").localeCompare(a.time || "");
      });

      // Render summary
      renderHistSummary(records);

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No attendance records found for this view.</td></tr>';
        return;
      }

      tbody.innerHTML = records.map((rec) => {
        return `<tr>
          <td>${App.formatDate(rec.date)}</td>
          <td>${App.formatTime(rec.time)}</td>
          <td>${App.statusPillHTML(rec.status)}</td>
          <td>${App.esc(rec.remarks || "—")}</td>
        </tr>`;
      }).join("");
    }

    function renderHistSummary(records) {
      const summaryEl = document.getElementById("hist-summary");
      if (!summaryEl) return;
      const total = records.length;
      const present = records.filter((r) => r.status === "Present").length;
      const absent = records.filter((r) => r.status === "Absent").length;
      const late = records.filter((r) => r.status === "Late").length;
      const leave = records.filter((r) => r.status === "Leave").length;
      const pct = total > 0 ? ((present + late) / total * 100) : null;
      const pctStr = pct !== null ? pct.toFixed(1) + "%" : "—";
      const belowThreshold = pct !== null && pct < threshold;

      summaryEl.innerHTML = `
        <div class="stat-card stat-card--success" style="border:1px solid var(--clr-border);padding:0.75rem;">
          <div class="stat-card__value" style="font-size:1.3rem;">${present}</div>
          <div class="stat-card__label">Present</div>
        </div>
        <div class="stat-card stat-card--danger" style="border:1px solid var(--clr-border);padding:0.75rem;">
          <div class="stat-card__value" style="font-size:1.3rem;">${absent}</div>
          <div class="stat-card__label">Absent</div>
        </div>
        <div class="stat-card stat-card--warning" style="border:1px solid var(--clr-border);padding:0.75rem;">
          <div class="stat-card__value" style="font-size:1.3rem;">${late}</div>
          <div class="stat-card__label">Late</div>
        </div>
        <div class="stat-card" style="border:1px solid var(--clr-border);padding:0.75rem;">
          <div class="stat-card__value" style="font-size:1.3rem;color:var(--clr-leave)">${leave}</div>
          <div class="stat-card__label">Leave</div>
        </div>
        <div class="stat-card" style="border:1px solid var(--clr-border);padding:0.75rem;">
          <div class="stat-card__value" style="font-size:1.3rem;">${total}</div>
          <div class="stat-card__label">Total</div>
        </div>
        <div class="stat-card ${belowThreshold ? 'stat-card--danger' : ''}" style="border:1px solid var(--clr-border);padding:0.75rem;${belowThreshold ? 'background:var(--clr-danger-light);' : ''}">
          <div class="stat-card__value" style="font-size:1.3rem;${belowThreshold ? 'color:var(--clr-danger);' : ''}">${pctStr}</div>
          <div class="stat-card__label">${belowThreshold ? '⚠️ Below ' + threshold + '%' : 'Attendance %'}</div>
        </div>
      `;
    }

    // ── Event listeners for all filter modes ──
    const filterBtn = document.getElementById("hist-filter-btn");
    const resetBtn = document.getElementById("hist-reset-btn");
    const monthFilterBtn = document.getElementById("hist-month-filter-btn");
    const monthResetBtn = document.getElementById("hist-month-reset-btn");
    const totalFilterBtn = document.getElementById("hist-total-filter-btn");

    if (filterBtn) filterBtn.addEventListener("click", renderTable);
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (specificDate) specificDate.value = App.todayISO();
      renderTable();
    });
    if (monthFilterBtn) monthFilterBtn.addEventListener("click", renderTable);
    if (monthResetBtn) monthResetBtn.addEventListener("click", () => {
      if (monthPicker) monthPicker.value = App.todayISO().substring(0, 7);
      renderTable();
    });
    if (totalFilterBtn) totalFilterBtn.addEventListener("click", renderTable);

    // Auto-filter on change
    if (specificDate) specificDate.addEventListener("change", renderTable);
    if (monthPicker) monthPicker.addEventListener("change", renderTable);

    // Initial render
    renderTable();
  }

  // ── Initialization ───────────────────────────────────────────
  function init() {
    const studentId = App.getUrlParam("id");
    if (!studentId) {
      showNotFoundError("No student ID specified in the URL. Please select a student from the directory.");
      return;
    }

    const student = Store.getStudentById(studentId);
    if (!student) {
      showNotFoundError(`Student with ID "${studentId}" was not found.`);
      return;
    }

    initTabs();
    populateProfileHeader(student);
    renderPersonalInfo(student);
    renderAttendanceSummary(student.id);
    initHistory(student.id);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
