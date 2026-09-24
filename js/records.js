/* ============================================================
   records.js — Attendance Records Controller
   Handles filtering, sorting, summary calculations,
   and CSV export of attendance records.
   ============================================================ */

(function () {
  "use strict";

  // ── DOM Elements ──────────────────────────────────────────────
  const filterFrom = document.getElementById("filter-from");
  const filterTo = document.getElementById("filter-to");
  const filterStudent = document.getElementById("filter-student");
  const filterStatus = document.getElementById("filter-status");

  const btnFilter = document.getElementById("btn-filter");
  const btnClear = document.getElementById("btn-clear");
  const btnExport = document.getElementById("btn-export");

  const summaryRow = document.getElementById("summary-row");
  const recordsBody = document.getElementById("records-body");
  const recordCount = document.getElementById("record-count");
  const sortableHeaders = document.querySelectorAll("#records-table th.sortable");

  // ── State ─────────────────────────────────────────────────────
  let sortColumn = "date";
  let sortDirection = "desc";
  let currentFilteredRecords = [];
  let currentResolvedRecords = [];

  // ── Pre-fill Filters from URL Query Params ────────────────────
  function initFromUrlParams() {
    const paramStudent = App.getUrlParam("student") || App.getUrlParam("studentId") || App.getUrlParam("id");
    const paramStatus = App.getUrlParam("status");
    const paramDateFrom = App.getUrlParam("dateFrom") || App.getUrlParam("from");
    const paramDateTo = App.getUrlParam("dateTo") || App.getUrlParam("to");
    const paramDate = App.getUrlParam("date");

    if (paramStudent && filterStudent) {
      filterStudent.value = paramStudent;
    }
    if (paramStatus && filterStatus) {
      filterStatus.value = paramStatus;
    }
    if (paramDate) {
      if (filterFrom) filterFrom.value = paramDate;
      if (filterTo) filterTo.value = paramDate;
    } else {
      if (paramDateFrom && filterFrom) filterFrom.value = paramDateFrom;
      if (paramDateTo && filterTo) filterTo.value = paramDateTo;
    }
  }

  // ── Resolve Record Details ────────────────────────────────────
  function resolveRecord(rec) {
    const student = Store.getStudentById(rec.studentId);
    const studentName = student && student.name ? student.name : (rec.studentId || "—");
    const rollNo = (student && (student.rollNo || student.admissionNo || student.id)) || rec.studentId || "—";
    const studentPhoto = student && student.photo ? student.photo : "assets/default-avatar.svg";

    return {
      raw: rec,
      studentId: rec.studentId || "",
      student,
      studentName,
      rollNo,
      studentPhoto,
      date: rec.date || "",
      time: rec.time || "",
      status: rec.status || "",
      remarks: rec.remarks || "",
    };
  }

  // ── Summary Row Renderer ──────────────────────────────────────
  function renderSummary(records) {
    if (!summaryRow) return;

    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    const leave = records.filter((r) => r.status === "Leave").length;

    const presentPct = total > 0 ? (present / total) * 100 : 0;
    const absentPct = total > 0 ? (absent / total) * 100 : 0;
    const latePct = total > 0 ? (late / total) * 100 : 0;
    const leavePct = total > 0 ? (leave / total) * 100 : 0;

    function formatPct(val) {
      if (total === 0) return "0%";
      return Number.isInteger(val) ? val + "%" : val.toFixed(1) + "%";
    }

    summaryRow.innerHTML = `
      <div class="stat-card">
        <div class="stat-card__value" id="summary-total">${total}</div>
        <div class="stat-card__label">Total Records</div>
      </div>
      <div class="stat-card stat-card--success">
        <div class="stat-card__value" id="summary-present">${formatPct(presentPct)}</div>
        <div class="stat-card__label">Present (${present})</div>
      </div>
      <div class="stat-card stat-card--danger">
        <div class="stat-card__value" id="summary-absent">${formatPct(absentPct)}</div>
        <div class="stat-card__label">Absent (${absent})</div>
      </div>
      <div class="stat-card stat-card--warning">
        <div class="stat-card__value" id="summary-late">${formatPct(latePct)}</div>
        <div class="stat-card__label">Late (${late})</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value" id="summary-leave" style="color: var(--clr-leave);">${formatPct(leavePct)}</div>
        <div class="stat-card__label">Leave (${leave})</div>
      </div>
    `;
  }

  // ── Update Sort Header Indicators ─────────────────────────────
  function updateSortIndicators() {
    sortableHeaders.forEach((th) => {
      const col = th.getAttribute("data-col");
      const icon = th.querySelector(".sort-icon");
      if (col === sortColumn) {
        if (icon) icon.textContent = sortDirection === "asc" ? " ▲" : " ▼";
        th.setAttribute("aria-sort", sortDirection === "asc" ? "ascending" : "descending");
      } else {
        if (icon) icon.textContent = "";
        th.removeAttribute("aria-sort");
      }
    });
  }

  // ── Table Renderer ────────────────────────────────────────────
  function renderTable() {
    if (!recordsBody) return;

    updateSortIndicators();

    // Sort resolved records
    currentResolvedRecords.sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case "date":
          valA = a.date;
          valB = b.date;
          break;
        case "time":
          valA = a.time;
          valB = b.time;
          break;
        case "student":
          valA = a.studentName;
          valB = b.studentName;
          break;
        case "rollNo":
          valA = a.rollNo;
          valB = b.rollNo;
          break;
        case "status":
          valA = a.status;
          valB = b.status;
          break;
        case "remarks":
          valA = a.remarks;
          valB = b.remarks;
          break;
        default:
          valA = a.date;
          valB = b.date;
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
        sensitivity: "base",
      });

      if (cmp !== 0) {
        return sortDirection === "asc" ? cmp : -cmp;
      }

      // Secondary sort: newest date & time first
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.time || "").localeCompare(a.time || "");
    });

    // Update count display
    const totalAll = Store.getAttendance().length;
    if (recordCount) {
      if (currentResolvedRecords.length === totalAll) {
        recordCount.textContent = `Showing all ${totalAll} record${totalAll === 1 ? "" : "s"}`;
      } else {
        recordCount.textContent = `Showing ${currentResolvedRecords.length} of ${totalAll} record${totalAll === 1 ? "" : "s"}`;
      }
    }

    // Render table rows or empty state
    if (currentResolvedRecords.length === 0) {
      recordsBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">
            <div style="padding: 2.5rem 1rem; text-align: center;">
              <div style="font-size: 2.5rem; line-height: 1; margin-bottom: 0.75rem;">📋</div>
              <div style="font-size: 1.05rem; font-weight: 600; color: var(--clr-text); margin-bottom: 0.35rem;">
                No attendance records found
              </div>
              <div style="font-size: 0.85rem; color: var(--clr-text-muted);">
                Try adjusting your filter criteria or record attendance first.
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const rowsHTML = currentResolvedRecords.map((item) => {
      const formattedDate = App.formatDate(item.date);
      const formattedTime = App.formatTime(item.time);
      const statusPill = App.statusPillHTML(item.status);

      return `
        <tr>
          <td>${App.esc(formattedDate)}</td>
          <td>${App.esc(formattedTime)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <img
                src="${App.esc(item.studentPhoto)}"
                alt=""
                style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #e9ecef;"
                onerror="this.src='assets/default-avatar.svg'"
              />
              <span style="font-weight: 500;">${App.esc(item.studentName)}</span>
            </div>
          </td>
          <td><span style="font-weight: 500;">${App.esc(item.rollNo)}</span></td>
          <td>${statusPill}</td>
          <td>${App.esc(item.remarks || "—")}</td>
        </tr>
      `;
    }).join("");

    recordsBody.innerHTML = rowsHTML;
  }

  // ── Apply Filters ─────────────────────────────────────────────
  function applyFilters() {
    const dateFrom = filterFrom ? filterFrom.value : "";
    const dateTo = filterTo ? filterTo.value : "";
    const status = filterStatus ? filterStatus.value : "";
    const studentQuery = filterStudent ? filterStudent.value.trim().toLowerCase() : "";

    if (dateFrom && dateTo && dateFrom > dateTo) {
      App.toast("'Date From' cannot be later than 'Date To'.", "warning");
    }

    // Prepare Store filters
    const filterParams = {};
    if (dateFrom) filterParams.dateFrom = dateFrom;
    if (dateTo) filterParams.dateTo = dateTo;
    if (status) filterParams.status = status;

    let records = Store.getAttendanceFiltered(filterParams);

    // Client-side student name / ID / roll number matching
    if (studentQuery) {
      records = records.filter((r) => {
        const student = Store.getStudentById(r.studentId);
        const sid = (r.studentId || "").toLowerCase();
        const sname = (student && student.name ? student.name : "").toLowerCase();
        const sroll = (student && (student.rollNo || student.admissionNo || student.id)
          ? String(student.rollNo || student.admissionNo || student.id)
          : ""
        ).toLowerCase();

        return sid.includes(studentQuery) || sname.includes(studentQuery) || sroll.includes(studentQuery);
      });
    }

    currentFilteredRecords = records;
    currentResolvedRecords = records.map((r) => resolveRecord(r));

    renderSummary(currentFilteredRecords);
    renderTable();
  }

  // ── Clear Filters ─────────────────────────────────────────────
  function clearFilters() {
    if (filterFrom) filterFrom.value = "";
    if (filterTo) filterTo.value = "";
    if (filterStudent) filterStudent.value = "";
    if (filterStatus) filterStatus.value = "";

    applyFilters();
    App.toast("Filters cleared.", "info");
  }

  // ── Export CSV ────────────────────────────────────────────────
  function exportCSV() {
    if (currentResolvedRecords.length === 0) {
      App.toast("No records available to export.", "warning");
      return;
    }

    function csvEscape(val) {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return '"' + str.replace(/"/g, '""') + '"';
    }

    const headers = [
      "Date",
      "Time",
      "Student",
      "Roll No",
      "Status",
      "Remarks",
    ];

    const rows = currentResolvedRecords.map((item) => [
      csvEscape(item.date),
      csvEscape(item.time),
      csvEscape(item.studentName),
      csvEscape(item.rollNo),
      csvEscape(item.status),
      csvEscape(item.remarks),
    ]);

    const csvContent = "\uFEFF" + [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance_records_${App.todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    App.toast(`Exported ${currentResolvedRecords.length} record(s) to CSV.`, "success");
  }

  // ── Setup Event Listeners ─────────────────────────────────────
  function initEvents() {
    if (btnFilter) {
      btnFilter.addEventListener("click", applyFilters);
    }
    if (btnClear) {
      btnClear.addEventListener("click", clearFilters);
    }
    if (btnExport) {
      btnExport.addEventListener("click", exportCSV);
    }

    // Trigger filter on Enter key inside inputs
    [filterStudent, filterFrom, filterTo].forEach((inp) => {
      if (inp) {
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            applyFilters();
          }
        });
      }
    });

    // Column sort headers click
    sortableHeaders.forEach((th) => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-col");
        if (!col) return;

        if (sortColumn === col) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortColumn = col;
          sortDirection = "asc";
        }

        renderTable();
      });
    });
  }

  // ── Initialize Page ───────────────────────────────────────────
  function init() {
    initFromUrlParams();
    applyFilters();
    initEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
