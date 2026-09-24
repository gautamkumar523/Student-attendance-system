/* ============================================================
   settings.js — Settings Controller
   CRUD operations for Classes and Threshold.
   ============================================================ */

(function () {
  "use strict";

  // ── Tab Elements ──────────────────────────────────────────────
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // ── Classes Elements ──────────────────────────────────────────
  const inpClsCourse = document.getElementById("cls-course");
  const inpClsSemester = document.getElementById("cls-semester");
  const btnAddCls = document.getElementById("btn-add-cls");
  const btnCancelCls = document.getElementById("btn-cancel-cls");
  const classesTable = document.getElementById("classes-table");
  const classesTbody = document.getElementById("classes-tbody");

  // ── Threshold Elements ────────────────────────────────────────
  const inpThreshold = document.getElementById("inp-threshold");
  const btnSaveThreshold = document.getElementById("btn-save-threshold");

  // ── State ─────────────────────────────────────────────────────
  let editingClsId = null;

  // ── Tab Switching ─────────────────────────────────────────────
  function switchTab(targetTabId) {
    let found = false;
    tabPanels.forEach(function (panel) {
      const isMatch = panel.id === targetTabId;
      panel.classList.toggle("tab-panel--active", isMatch);
      if (isMatch) found = true;
    });

    tabBtns.forEach(function (btn) {
      const isMatch = btn.getAttribute("data-tab") === targetTabId;
      btn.classList.toggle("tab-btn--active", isMatch);
    });

    return found;
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const target = btn.getAttribute("data-tab");
      if (target) switchTab(target);
    });
  });

  // Check URL param or hash on initial load (e.g. settings.html?tab=teachers or #tab-classes)
  function initTabFromUrl() {
    const paramTab = App.getUrlParam("tab");
    if (paramTab) {
      const targetId = paramTab.startsWith("tab-") ? paramTab : "tab-" + paramTab;
      if (switchTab(targetId)) return;
    }

    if (window.location.hash) {
      const hashId = window.location.hash.replace("#", "");
      const targetId = hashId.startsWith("tab-") ? hashId : "tab-" + hashId;
      switchTab(targetId);
    }
  }

  // ── Classes CRUD ──────────────────────────────────────────────
  function renderClasses() {
    const classes = Store.getClasses();
    if (!classes || classes.length === 0) {
      classesTbody.innerHTML =
        '<tr><td colspan="4" class="table-empty">No classes added yet. Add your first class above.</td></tr>';
      return;
    }

    let html = "";
    classes.forEach(function (cls) {
      html += `
        <tr>
          <td><strong>${App.esc(cls.id)}</strong></td>
          <td>${App.esc(cls.course)}</td>
          <td>${App.esc(cls.year)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn--small btn--outline btn-edit-cls" data-id="${App.esc(cls.id)}" title="Edit Class">✏️ Edit</button>
              <button type="button" class="btn btn--small btn--danger btn-del-cls" data-id="${App.esc(cls.id)}" title="Delete Class">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    classesTbody.innerHTML = html;
  }

  function cancelClsEdit() {
    editingClsId = null;
    inpClsCourse.value = "";
    inpClsSemester.value = "";
    btnAddCls.textContent = "Add Class";
    btnCancelCls.style.display = "none";
  }

  function handleSaveClass() {
    const course = inpClsCourse.value.trim();
    const year = inpClsSemester.value.trim();

    if (!course || !year) {
      App.toast("Please fill in Course and Year.", "warning");
      return;
    }

    if (editingClsId !== null) {
      const res = Store.updateClass(editingClsId, {
        course: course,
        year: year,
      });

      if (res && !res.ok) {
        App.toast(res.error || "Failed to update class.", "error");
        return;
      }

      cancelClsEdit();
      renderClasses();
      App.toast("Class updated successfully.", "success");
    } else {
      const newId = (course.replace(/\s+/g, "-") + "-" + year.replace(/\s+/g, "-")).toLowerCase();
      const res = Store.addClass({
        id: newId,
        course: course,
        year: year,
      });

      if (res && !res.ok) {
        App.toast(res.error || "Failed to add class.", "error");
        return;
      }

      inpClsCourse.value = "";
      inpClsSemester.value = "";
      renderClasses();
      App.toast("Class added successfully.", "success");
    }
  }

  function handleEditClass(id) {
    const cls = Store.getClasses().find(function (c) {
      return c.id === id;
    });
    if (!cls) {
      App.toast("Class not found.", "error");
      return;
    }

    editingClsId = cls.id;
    inpClsCourse.value = cls.course;
    inpClsSemester.value = cls.year;
    btnAddCls.textContent = "Update Class";
    btnCancelCls.style.display = "inline-flex";
    inpClsCourse.focus();
  }

  function handleDeleteClass(id) {
    App.confirm("Are you sure you want to delete this class?", function () {
      Store.deleteClass(id);
      if (editingClsId === id) {
        cancelClsEdit();
      }
      renderClasses();
      App.toast("Class deleted successfully.", "success");
    });
  }

  btnAddCls.addEventListener("click", handleSaveClass);
  btnCancelCls.addEventListener("click", cancelClsEdit);

  inpClsCourse.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      inpClsSemester.focus();
    }
  });

  inpClsSemester.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveClass();
    }
  });

  classesTable.addEventListener("click", function (e) {
    const editBtn = e.target.closest(".btn-edit-cls");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      handleEditClass(id);
      return;
    }

    const delBtn = e.target.closest(".btn-del-cls");
    if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      handleDeleteClass(id);
      return;
    }
  });

  // ── Threshold ─────────────────────────────────────────────────
  function initThreshold() {
    const val = Store.getThreshold();
    inpThreshold.value = typeof val === "number" && !isNaN(val) ? val : 75;
  }

  function handleSaveThreshold() {
    const rawVal = inpThreshold.value.trim();
    if (rawVal === "") {
      App.toast("Please enter a threshold percentage.", "warning");
      return;
    }

    const val = parseInt(rawVal, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      App.toast("Please enter a valid percentage between 0 and 100.", "error");
      return;
    }

    Store.setThreshold(val);
    App.toast("Attendance threshold saved successfully (" + val + "%).", "success");
  }

  btnSaveThreshold.addEventListener("click", handleSaveThreshold);

  inpThreshold.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveThreshold();
    }
  });

  // ── Initialization ────────────────────────────────────────────
  function init() {
    initTabFromUrl();
    renderClasses();
    initThreshold();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
