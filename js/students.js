/* ============================================================
   students.js — Student Directory Controller
   Pure vanilla JavaScript, uses Store and App APIs.
   ============================================================ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────
  let currentView = "table"; // "table" | "cards"
  let sortField = "name";
  let sortAsc = true;

  // ── DOM Elements ───────────────────────────────────────────
  let searchInput;
  let btnTable;
  let btnCards;
  let filterCourse;
  let filterYear;
  let btnClearFilters;
  let tableView;
  let cardsView;
  let studentsTbody;
  let cardsContainer;
  let emptyState;
  let emptyStateTitle;
  let emptyStateDesc;
  let studentCountEl;

  // ── Helper: Extract Roll No ────────────────────────────────
  function getRollNo(student) {
    return student.rollNo || student.admissionNo || student.roll || student.id || "—";
  }

  // ── Helper: Extract Sort Field from Header ─────────────────
  function getHeaderSortField(th) {
    if (!th) return "";
    const dataSort = th.getAttribute("data-sort");
    if (dataSort) return dataSort;
    const text = (th.textContent || "").replace(/[▲▼↕]/g, "").trim().toLowerCase();
    if (text.includes("course")) return "course";
    if (text.includes("year") || text.includes("sem")) return "year";
    if (text.includes("roll")) return "rollNo";
    if (text.includes("name")) return "name";
    if (text.includes("dept") || text.includes("department")) return "dept";
    if (text.includes("attendance") || text.includes("pct") || text.includes("%")) return "pct";
    return text;
  }

  // ── Populate Filter Dropdowns from Settings Classes ─────────
  function populateDropdowns() {
    const classes = Store.getClasses() || [];

    const selectedCourse = filterCourse.value;
    const selectedYear = filterYear.value;

    const courses = [...new Set(classes.map((c) => c.course).filter(Boolean))].sort();
    const years = [...new Set(classes.map((c) => c.year).filter(Boolean))].sort();

    function populate(selectEl, items, defaultLabel, currentVal) {
      selectEl.innerHTML = `<option value="">${defaultLabel}</option>`;
      items.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        if (item === currentVal) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });
    }

    populate(filterCourse, courses, "All Courses", selectedCourse);
    populate(filterYear, years, "All Years", selectedYear);
  }

  // ── Filter and Sort Students ───────────────────────────────
  function getFilteredAndSortedStudents() {
    const allStudents = Store.getStudents();
    const query = searchInput.value.trim().toLowerCase();
    const course = filterCourse.value;
    const year = filterYear.value;

    // Filter
    const filtered = allStudents.filter((student) => {
      if (course && student.course !== course) {
        return false;
      }
      if (year && (student.year || "") !== year) {
        return false;
      }

      if (query) {
        const name = (student.name || "").toLowerCase();
        const roll = getRollNo(student).toString().toLowerCase();
        const stCourse = (student.course || "").toLowerCase();
        const stYear = (student.year || "").toLowerCase();

        const matches =
          name.includes(query) ||
          roll.includes(query) ||
          stCourse.includes(query) ||
          stYear.includes(query);

        if (!matches) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      const field = (sortField || "").toLowerCase();

      // Sort by course: a.course.localeCompare(b.course)
      if (field === "course") {
        if (a.course && b.course) {
          return sortAsc ? a.course.localeCompare(b.course) : b.course.localeCompare(a.course);
        }
        const cA = a.course || "";
        const cB = b.course || "";
        return sortAsc ? cA.localeCompare(cB) : cB.localeCompare(cA);
      }

      // Sort by year: a.year.localeCompare(b.year)
      if (field === "year") {
        if (a.year && b.year) {
          return sortAsc ? a.year.localeCompare(b.year) : b.year.localeCompare(a.year);
        }
        const yA = a.year || "";
        const yB = b.year || "";
        return sortAsc ? yA.localeCompare(yB) : yB.localeCompare(yA);
      }

      let valA, valB;
      if (field === "rollno") {
        valA = getRollNo(a);
        valB = getRollNo(b);
      } else if (field === "pct") {
        const statsA = Store.getStudentStats(a.id);
        const statsB = Store.getStudentStats(b.id);
        valA = statsA.pct !== null ? statsA.pct : -1;
        valB = statsB.pct !== null ? statsB.pct : -1;
      } else if (field === "dept" || field === "department") {
        valA = a.department || a.dept || "";
        valB = b.department || b.dept || "";
      } else {
        // default "name"
        valA = a.name || "";
        valB = b.name || "";
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB), undefined, { numeric: true })
        : String(valB).localeCompare(String(valA), undefined, { numeric: true });
    });

    return { allCount: allStudents.length, list: filtered };
  }

  // ── Render Views ───────────────────────────────────────────
  function render() {
    const { allCount, list } = getFilteredAndSortedStudents();
    const threshold = Store.getThreshold();

    // Subtitle Count
    if (studentCountEl) {
      if (allCount === 0) {
        studentCountEl.textContent = "(0 students)";
      } else if (list.length === allCount) {
        studentCountEl.textContent = `(${allCount} ${allCount === 1 ? "student" : "students"})`;
      } else {
        studentCountEl.textContent = `(Showing ${list.length} of ${allCount} students)`;
      }
    }

    // Empty State Check
    if (list.length === 0) {
      tableView.style.display = "none";
      cardsView.style.display = "none";
      emptyState.style.display = "block";

      if (allCount === 0) {
        emptyStateTitle.textContent = "No students registered yet";
        emptyStateDesc.innerHTML =
          'Get started by adding your first student.<br><a href="add-student.html" class="btn btn--primary btn--small" style="margin-top: 0.75rem; display: inline-flex;">➕ Add Student</a>';
      } else {
        emptyStateTitle.textContent = "No matching students found";
        emptyStateDesc.innerHTML =
          'Try adjusting your search or filter criteria.<br><button type="button" id="btn-empty-clear" class="btn btn--outline btn--small" style="margin-top: 0.75rem;">Clear Filters</button>';
        const btnEmptyClear = document.getElementById("btn-empty-clear");
        if (btnEmptyClear) {
          btnEmptyClear.addEventListener("click", clearFilters);
        }
      }
      return;
    }

    // Results exist: Hide empty state, show active view
    emptyState.style.display = "none";
    if (currentView === "table") {
      tableView.style.display = "block";
      cardsView.style.display = "none";
    } else {
      tableView.style.display = "none";
      cardsView.style.display = "block";
    }

    // Render Table View
    let tableHtml = "";
    list.forEach((student) => {
      const stats = Store.getStudentStats(student.id);
      const belowThreshold = stats.pct !== null && stats.pct < threshold;
      const rowClass = belowThreshold ? "row--danger" : "";
      const rollNo = getRollNo(student);
      const pctBadgeCls = App.pctBadgeClass(stats.pct);
      const pctText = stats.pct !== null ? Math.round(stats.pct) + "%" : "—";
      const badgeStyle = stats.pct === null ? 'style="background:#e9ecef;color:#6c757d;"' : "";

      tableHtml += `
        <tr class="${rowClass}">
          <td><strong>${App.esc(rollNo)}</strong></td>
          <td>
            <a href="student-profile.html?id=${encodeURIComponent(student.id)}" class="student-name-link" style="font-weight: 600; color: var(--clr-primary);" title="View student profile">
              ${App.esc(student.name || "Unnamed Student")}
            </a>
          </td>
          <td>${App.esc(student.course || "—")}</td>
          <td>${App.esc(student.department || student.dept || "—")}</td>
          <td>
            <span class="pct-badge ${pctBadgeCls}" ${badgeStyle}>${pctText}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.5rem; justify-content: flex-end;">
              <a href="add-student.html?edit=${encodeURIComponent(student.id)}" class="btn btn--small btn--outline" title="Edit Student">✏️ Edit</a>
              <button type="button" class="btn btn--small btn--danger btn-delete-student" data-id="${App.esc(student.id)}" data-name="${App.esc(student.name || rollNo)}" title="Delete Student">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    studentsTbody.innerHTML = tableHtml;

    // Render Cards View
    let cardsHtml = "";
    list.forEach((student) => {
      const stats = Store.getStudentStats(student.id);
      const belowThreshold = stats.pct !== null && stats.pct < threshold;
      const rowClass = belowThreshold ? "row--danger" : "";
      const rollNo = getRollNo(student);
      const pctBadgeCls = App.pctBadgeClass(stats.pct);
      const pctText = stats.pct !== null ? Math.round(stats.pct) + "% Attendance" : "No attendance data";
      const badgeStyle = stats.pct === null ? 'style="background:#e9ecef;color:#6c757d;"' : "";
      const avatarSrc = student.photo ? student.photo : "assets/default-avatar.svg";

      cardsHtml += `
        <div class="student-card ${rowClass}" data-id="${App.esc(student.id)}">
          <img
            src="${App.esc(avatarSrc)}"
            alt="${App.esc(student.name || "Student")}"
            class="student-card__avatar"
            onerror="this.onerror=null;this.src='assets/default-avatar.svg';"
          />
          <div class="student-card__name">${App.esc(student.name || "Unnamed Student")}</div>
          <div class="student-card__meta">Roll No: <strong>${App.esc(rollNo)}</strong></div>
          <div class="student-card__meta">${App.esc(student.course || "—")}</div>
          ${(student.department || student.dept) ? `<div class="student-card__meta">${App.esc(student.department || student.dept)}</div>` : ""}
          <div class="student-card__pct">
            <span class="pct-badge ${pctBadgeCls}" ${badgeStyle}>${pctText}</span>
          </div>
          <div class="student-card__actions">
            <a href="add-student.html?edit=${encodeURIComponent(student.id)}" class="btn btn--small btn--outline" onclick="event.stopPropagation();" title="Edit Student">✏️ Edit</a>
            <button type="button" class="btn btn--small btn--danger btn-delete-student" data-id="${App.esc(student.id)}" data-name="${App.esc(student.name || rollNo)}" onclick="event.stopPropagation();" title="Delete Student">🗑️ Delete</button>
          </div>
        </div>
      `;
    });
    cardsContainer.innerHTML = cardsHtml;

    // Update sort indicators in table headers
    updateSortIndicators();
  }

  // ── Update Sort Header Icons ───────────────────────────────
  function updateSortIndicators() {
    const headers = document.querySelectorAll("#students-table thead th");
    headers.forEach((th) => {
      const field = getHeaderSortField(th);
      const icon = th.querySelector(".sort-icon");
      if (!icon) return;
      if (field && sortField && field.toLowerCase() === sortField.toLowerCase()) {
        icon.textContent = sortAsc ? "▲" : "▼";
      } else {
        icon.textContent = "↕";
      }
    });
  }

  // ── Clear All Filters ──────────────────────────────────────
  function clearFilters() {
    searchInput.value = "";
    filterCourse.value = "";
    filterYear.value = "";
    render();
  }

  // ── Delete Handler ─────────────────────────────────────────
  function handleDelete(studentId, studentName) {
    App.confirm(
      `Are you sure you want to delete ${studentName}? All associated attendance records will also be removed.`,
      function () {
        Store.deleteStudent(studentId);
        App.toast("Student deleted successfully.", "success");
        populateDropdowns();
        render();
      }
    );
  }

  // ── Event Handlers & Initialization ────────────────────────
  function init() {
    // Cache DOM refs
    searchInput = document.getElementById("search-input");
    btnTable = document.getElementById("btn-table");
    btnCards = document.getElementById("btn-cards");
    filterCourse = document.getElementById("filter-course");
    filterYear = document.getElementById("filter-year");
    btnClearFilters = document.getElementById("btn-clear-filters");
    tableView = document.getElementById("table-view");
    cardsView = document.getElementById("cards-view");
    studentsTbody = document.getElementById("students-tbody");
    cardsContainer = document.getElementById("cards-container");
    emptyState = document.getElementById("empty-state");
    emptyStateTitle = document.getElementById("empty-state-title");
    emptyStateDesc = document.getElementById("empty-state-desc");
    studentCountEl = document.getElementById("student-count");

    // Search and filters
    searchInput.addEventListener("input", render);
    filterCourse.addEventListener("change", render);
    filterYear.addEventListener("change", render);
    btnClearFilters.addEventListener("click", clearFilters);

    // View toggle
    btnTable.addEventListener("click", function () {
      if (currentView === "table") return;
      currentView = "table";
      btnTable.classList.add("active");
      btnCards.classList.remove("active");
      render();
    });

    btnCards.addEventListener("click", function () {
      if (currentView === "cards") return;
      currentView = "cards";
      btnCards.classList.add("active");
      btnTable.classList.remove("active");
      render();
    });

    // Column sorting
    const sortableHeaders = document.querySelectorAll("#students-table thead th");
    sortableHeaders.forEach((th) => {
      const field = getHeaderSortField(th);
      if (!field || field === "actions" || field.includes("action")) return;
      th.classList.add("sortable");
      th.addEventListener("click", function () {
        const clickedField = getHeaderSortField(this);
        if (sortField && clickedField && sortField.toLowerCase() === clickedField.toLowerCase()) {
          sortAsc = !sortAsc;
        } else {
          sortField = clickedField;
          sortAsc = true;
        }
        render();
      });
    });

    // Table Delete Button delegation
    tableView.addEventListener("click", function (e) {
      const deleteBtn = e.target.closest(".btn-delete-student");
      if (!deleteBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = deleteBtn.getAttribute("data-id");
      const name = deleteBtn.getAttribute("data-name");
      handleDelete(id, name);
    });

    // Cards Delegation: Delete Button & Card Navigation
    cardsView.addEventListener("click", function (e) {
      const deleteBtn = e.target.closest(".btn-delete-student");
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = deleteBtn.getAttribute("data-id");
        const name = deleteBtn.getAttribute("data-name");
        handleDelete(id, name);
        return;
      }

      // Ignore if other action clicked
      if (e.target.closest(".student-card__actions") || e.target.closest("button") || e.target.closest("a")) {
        return;
      }

      // Clicking a card navigates to student-profile.html?id=STUDENT_ID
      const card = e.target.closest(".student-card");
      if (card && card.dataset.id) {
        window.location.href = `student-profile.html?id=${encodeURIComponent(card.dataset.id)}`;
      }
    });

    // Populate dynamic dropdowns & initial render
    populateDropdowns();
    render();
  }

  // Initialize once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
