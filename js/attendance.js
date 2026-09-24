/* ============================================================
   attendance.js — Mark Attendance Page Logic
   Handles session selection, student rendering, 4-way status
   toggles, bulk actions, and attendance persistence.
   ============================================================ */

(function () {
  "use strict";

  // ── DOM References ──────────────────────────────────────────
  const attDateInput = document.getElementById("att-date");
  const attClassSelect = document.getElementById("att-class");

  const attendanceCard = document.getElementById("attendance-card");
  const attendanceBody = document.getElementById("attendance-body");
  const tableWrapper = document.getElementById("table-wrapper");
  const bulkActionsRow = document.getElementById("bulk-actions-row");
  const saveRow = document.getElementById("save-row");
  const btnSave = document.getElementById("btn-save");

  const btnAllPresent = document.getElementById("btn-all-present");
  const btnAllAbsent = document.getElementById("btn-all-absent");
  const btnAllLate = document.getElementById("btn-all-late");
  const btnAllLeave = document.getElementById("btn-all-leave");

  const emptyState = document.getElementById("empty-state");
  const emptyStateMsg = document.getElementById("empty-state-msg");
  const emptyStateActions = document.getElementById("empty-state-actions");
  const configWarning = document.getElementById("config-warning");
  const configWarningText = document.getElementById("config-warning-text");
  const attendanceInfoBadge = document.getElementById("attendance-info-badge");

  const statPresent = document.getElementById("stat-present");
  const statAbsent = document.getElementById("stat-absent");
  const statLate = document.getElementById("stat-late");
  const statLeave = document.getElementById("stat-leave");
  const statTotal = document.getElementById("stat-total");

  // ── Status Constants & Map ──────────────────────────────────
  const STATUS_CLASSES = {
    Present: "active-present",
    Absent: "active-absent",
    Late: "active-late",
    Leave: "active-leave",
  };

  const STATUS_CODES = {
    P: "Present",
    A: "Absent",
    L: "Late",
    Lv: "Leave",
  };

  // ── Helper: Format Class Option Label ───────────────────────
  function formatClassLabel(cls) {
    const parts = [];
    if (cls.course) parts.push(cls.course);
    if (cls.year) parts.push("Year " + cls.year);
    return parts.length > 0 ? parts.join(" - ") : cls.id;
  }

  // ── Helper: Check Configuration Status ──────────────────────
  function checkConfiguration() {
    const classes = Store.getClasses();

    if (classes.length === 0) {
      if (configWarning && configWarningText) {
        configWarning.style.display = "block";
        configWarningText.textContent =
          "Missing configuration: Classes. Please configure them in Settings before taking attendance.";
      }
      return false;
    } else {
      if (configWarning) {
        configWarning.style.display = "none";
      }
      return true;
    }
  }

  // ── Populate Selection Controls ─────────────────────────────
  function populateControls() {
    // 1. Set Date to Today default
    if (!attDateInput.value) {
      attDateInput.value = App.todayISO();
    }

    // 2. Populate Classes
    const classes = Store.getClasses().map((c) => ({
      id: c.id,
      label: formatClassLabel(c),
    }));
    App.populateSelect(
      attClassSelect,
      classes,
      "id",
      "label",
      "Select Class"
    );

    // 3. Preselect from URL params if available
    const paramClass = App.getUrlParam("class");
    const paramDate = App.getUrlParam("date");

    if (paramDate) attDateInput.value = paramDate;
    if (paramClass && classes.some((c) => c.id === paramClass)) {
      attClassSelect.value = paramClass;
    }
  }

  // ── Filter Students by Class ─────────────────────────────────
  function getStudentsForCurrentClass() {
    const allStudents = Store.getStudents();
    const selectedClassId = attClassSelect.value;

    if (!selectedClassId) {
      return allStudents;
    }

    const cls = Store.getClasses().find((c) => c.id === selectedClassId);
    if (!cls) {
      return allStudents;
    }

    // If class has course and student has course, match by course
    if (cls.course) {
      const targetCourse = cls.course.trim().toLowerCase();
      const hasStudentsWithCourse = allStudents.some((s) => !!s.course);

      if (hasStudentsWithCourse) {
        return allStudents.filter(
          (s) => s.course && s.course.trim().toLowerCase() === targetCourse
        );
      }
    }

    return allStudents;
  }

  // ── Load Existing Attendance for Date ───────────────────────
  function getExistingAttendanceMap() {
    const date = attDateInput.value;
    const classId = attClassSelect ? attClassSelect.value : "";

    if (!date) {
      return {};
    }

    const records = Store.getAttendanceFiltered({
      dateFrom: date,
      dateTo: date,
    });

    const map = {};
    records.forEach((rec) => {
      if (!classId || !rec.classId || rec.classId === classId) {
        map[rec.studentId] = rec;
      }
    });
    return map;
  }

  // ── Set Toggle Status ────────────────────────────────────────
  function setToggleStatus(toggleEl, status) {
    if (!toggleEl || !STATUS_CLASSES[status]) return;

    toggleEl.setAttribute("data-status", status);
    const buttons = toggleEl.querySelectorAll("button");
    buttons.forEach((btn) => {
      btn.classList.remove(
        "active-present",
        "active-absent",
        "active-late",
        "active-leave"
      );
      if (btn.getAttribute("data-status-val") === status) {
        btn.classList.add(STATUS_CLASSES[status]);
      }
    });

    updateSummaryStats();
  }

  // ── Bulk Mark Action ─────────────────────────────────────────
  function bulkMark(status) {
    const toggles = attendanceBody.querySelectorAll(".status-toggle");
    toggles.forEach((toggle) => {
      setToggleStatus(toggle, status);
    });
  }

  // ── Update Live Summary Counts ──────────────────────────────
  function updateSummaryStats() {
    const toggles = attendanceBody.querySelectorAll(".status-toggle");
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    toggles.forEach((toggle) => {
      const st = toggle.getAttribute("data-status");
      if (st === "Present") presentCount++;
      else if (st === "Absent") absentCount++;
      else if (st === "Late") lateCount++;
      else if (st === "Leave") leaveCount++;
    });

    statPresent.textContent = "Present: " + presentCount;
    statAbsent.textContent = "Absent: " + absentCount;
    statLate.textContent = "Late: " + lateCount;
    statLeave.textContent = "Leave: " + leaveCount;
    statTotal.textContent = "Total Students: " + toggles.length;
  }

  // ── Render Student Table ─────────────────────────────────────
  function renderStudentTable() {
    const allStudents = Store.getStudents();
    const configOk = checkConfiguration();

    // 1. Check if configuration is missing
    if (!configOk && allStudents.length === 0) {
      showEmptyState(
        "System configuration and student records are missing. Please configure Settings and add students first.",
        '<a href="settings.html" class="btn btn--warning btn--small">⚙️ Go to Settings</a> ' +
        '<a href="add-student.html" class="btn btn--primary btn--small" style="margin-left: 0.5rem;">➕ Add Student</a>'
      );
      return;
    }

    // 2. Check if no students exist in system
    if (allStudents.length === 0) {
      showEmptyState(
        "No students registered yet. Please add students before taking attendance.",
        '<a href="add-student.html" class="btn btn--primary btn--small">➕ Add Student</a>'
      );
      return;
    }

    // 3. Filter students by current class
    const students = getStudentsForCurrentClass();

    if (students.length === 0) {
      showEmptyState(
        "No students found matching the selected Class.",
        '<button type="button" class="btn btn--outline btn--small" id="btn-reset-class">Show All Students</button>'
      );
      const resetBtn = document.getElementById("btn-reset-class");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          attClassSelect.value = "";
          renderStudentTable();
        });
      }
      return;
    }

    // Hide empty state, show table & actions
    emptyState.style.display = "none";
    tableWrapper.style.display = "block";
    bulkActionsRow.style.display = "flex";
    saveRow.style.display = "flex";

    // 4. Check for existing attendance records
    const existingMap = getExistingAttendanceMap();
    const hasSavedRecords = Object.keys(existingMap).length > 0;

    if (hasSavedRecords) {
      attendanceInfoBadge.textContent =
        "ℹ️ Loaded previously saved attendance for this session. Modifying will update records.";
    } else {
      attendanceInfoBadge.textContent =
        "Default status: Present for all students.";
    }

    // 5. Render rows
    let html = "";
    students.forEach((student) => {
      const roll =
        student.rollNo || student.roll || student.admissionNo || student.id;
      const savedRec = existingMap[student.id];
      const status = savedRec ? savedRec.status : "Present";
      const remarks = savedRec && savedRec.remarks ? savedRec.remarks : "";

      const studentMeta = [
        student.course,
        student.year ? "Year " + student.year : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const photoUrl = student.photo || "assets/default-avatar.svg";

      html += `
        <tr data-student-id="${App.esc(student.id)}">
          <td>
            <strong>${App.esc(roll)}</strong>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <img src="${App.esc(photoUrl)}" 
                   alt="${App.esc(student.name)}" 
                   style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #eee; flex-shrink: 0;"
                   onerror="this.src='assets/default-avatar.svg'" />
              <div>
                <div style="font-weight: 600; color: var(--clr-text);">${App.esc(student.name)}</div>
                ${
                  studentMeta
                    ? `<small style="color: var(--clr-text-muted); font-size: 0.78rem;">${App.esc(studentMeta)}</small>`
                    : ""
                }
              </div>
            </div>
          </td>
          <td>
            <div class="status-toggle" data-roll="${App.esc(roll)}" data-status="${App.esc(status)}">
              <button type="button" data-status-val="Present" class="${status === 'Present' ? 'active-present' : ''}" title="Present">P</button>
              <button type="button" data-status-val="Absent" class="${status === 'Absent' ? 'active-absent' : ''}" title="Absent">A</button>
              <button type="button" data-status-val="Late" class="${status === 'Late' ? 'active-late' : ''}" title="Late">L</button>
              <button type="button" data-status-val="Leave" class="${status === 'Leave' ? 'active-leave' : ''}" title="Leave">Lv</button>
            </div>
          </td>
          <td>
            <input type="text" 
                   class="attendance-remarks" 
                   placeholder="Optional remark..." 
                   value="${App.esc(remarks)}" 
                   style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" />
          </td>
        </tr>
      `;
    });

    attendanceBody.innerHTML = html;
    updateSummaryStats();
  }

  // ── Show Empty State Helper ──────────────────────────────────
  function showEmptyState(msg, actionHTML) {
    emptyState.style.display = "block";
    emptyStateMsg.textContent = msg;
    emptyStateActions.innerHTML = actionHTML || "";

    attendanceBody.innerHTML = "";
    tableWrapper.style.display = "none";
    bulkActionsRow.style.display = "none";
    saveRow.style.display = "none";
    attendanceInfoBadge.textContent = "";

    statPresent.textContent = "Present: 0";
    statAbsent.textContent = "Absent: 0";
    statLate.textContent = "Late: 0";
    statLeave.textContent = "Leave: 0";
    statTotal.textContent = "Total Students: 0";
  }

  // ── Save Attendance Handler ──────────────────────────────────
  function handleSave() {
    const date = attDateInput.value;
    if (!date) {
      App.toast("Please select a date.", "error");
      attDateInput.focus();
      return;
    }

    const classId = attClassSelect.value;
    if (!classId) {
      App.toast("Please select a class before saving.", "error");
      attClassSelect.focus();
      return;
    }

    const rows = attendanceBody.querySelectorAll("tr[data-student-id]");
    if (rows.length === 0) {
      App.toast("No students to mark attendance for.", "error");
      return;
    }

    const records = [];
    const currentTime = App.nowTime();

    rows.forEach((row) => {
      const studentId = row.getAttribute("data-student-id");
      const toggle = row.querySelector(".status-toggle");
      const status = toggle
        ? toggle.getAttribute("data-status") || "Present"
        : "Present";
      const remarksInput = row.querySelector(".attendance-remarks");
      const remarks = remarksInput ? remarksInput.value.trim() : "";

      records.push({
        studentId: studentId,
        classId: classId,
        date: date,
        time: currentTime,
        status: status,
        remarks: remarks,
      });
    });

    // Bulk save via Store API
    Store.addAttendanceBulk(records);

    App.toast(
      "Attendance saved successfully for " + records.length + " students!",
      "success"
    );

    attendanceInfoBadge.textContent =
      "✓ Attendance saved at " +
      App.formatTime(currentTime) +
      " (" +
      records.length +
      " records).";
  }

  // ── Event Bindings ───────────────────────────────────────────
  function initEvents() {
    // 1. Status Toggle Click (Event Delegation)
    attendanceBody.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-status-val]");
      if (!btn) return;

      const toggle = btn.closest(".status-toggle");
      if (!toggle) return;

      const newStatus = btn.getAttribute("data-status-val");
      setToggleStatus(toggle, newStatus);
    });

    // 2. Bulk Action Buttons
    if (btnAllPresent) {
      btnAllPresent.addEventListener("click", function () {
        bulkMark("Present");
      });
    }

    if (btnAllAbsent) {
      btnAllAbsent.addEventListener("click", function () {
        bulkMark("Absent");
      });
    }

    if (btnAllLate) {
      btnAllLate.addEventListener("click", function () {
        bulkMark("Late");
      });
    }

    if (btnAllLeave) {
      btnAllLeave.addEventListener("click", function () {
        bulkMark("Leave");
      });
    }

    // 3. Selection Filter Changes
    attClassSelect.addEventListener("change", function () {
      renderStudentTable();
    });

    attDateInput.addEventListener("change", function () {
      renderStudentTable();
    });

    // 4. Save Button
    if (btnSave) {
      btnSave.addEventListener("click", handleSave);
    }
  }

  // ── Initialization ───────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    populateControls();
    initEvents();
    renderStudentTable();
  });
})();
