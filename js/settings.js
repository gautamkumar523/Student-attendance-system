/* ============================================================
   settings.js — Settings Controller
   CRUD operations for Subjects, Teachers, Classes, and Threshold.
   ============================================================ */

(function () {
  "use strict";

  // ── Tab Elements ──────────────────────────────────────────────
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // ── Subjects Elements ─────────────────────────────────────────
  const inpSubjId = document.getElementById("subj-id");
  const inpSubjName = document.getElementById("subj-name");
  const btnAddSubj = document.getElementById("btn-add-subj");
  const btnCancelSubj = document.getElementById("btn-cancel-subj");
  const subjectsTable = document.getElementById("subjects-table");
  const subjectsTbody = document.getElementById("subjects-tbody");

  // ── Teachers Elements ─────────────────────────────────────────
  const inpTeachId = document.getElementById("teach-id");
  const inpTeachName = document.getElementById("teach-name");
  const btnAddTeach = document.getElementById("btn-add-teach");
  const btnCancelTeach = document.getElementById("btn-cancel-teach");
  const teachersTable = document.getElementById("teachers-table");
  const teachersTbody = document.getElementById("teachers-tbody");

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
  let editingSubjId = null;
  let editingTeachId = null;
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

  // ── Subjects CRUD ─────────────────────────────────────────────
  function renderSubjects() {
    const subjects = Store.getSubjects();
    if (!subjects || subjects.length === 0) {
      subjectsTbody.innerHTML =
        '<tr><td colspan="3" class="table-empty">No subjects added yet. Add your first subject above.</td></tr>';
      return;
    }

    let html = "";
    subjects.forEach(function (subj) {
      html += `
        <tr>
          <td><strong>${App.esc(subj.id)}</strong></td>
          <td>${App.esc(subj.name)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn--small btn--outline btn-edit-subj" data-id="${App.esc(subj.id)}" title="Edit Subject">✏️ Edit</button>
              <button type="button" class="btn btn--small btn--danger btn-del-subj" data-id="${App.esc(subj.id)}" title="Delete Subject">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    subjectsTbody.innerHTML = html;
  }

  function cancelSubjEdit() {
    editingSubjId = null;
    inpSubjId.value = "";
    inpSubjName.value = "";
    inpSubjId.disabled = false;
    btnAddSubj.textContent = "Add Subject";
    btnCancelSubj.style.display = "none";
  }

  function handleSaveSubject() {
    const id = inpSubjId.value.trim();
    const name = inpSubjName.value.trim();

    if (!id || !name) {
      App.toast("Please enter both Subject ID and Subject Name.", "warning");
      return;
    }

    if (editingSubjId !== null) {
      // If changing the ID, make sure another subject doesn't already use it
      if (id !== editingSubjId) {
        const duplicate = Store.getSubjects().some(function (s) {
          return s.id === id;
        });
        if (duplicate) {
          App.toast("A subject with ID '" + id + "' already exists.", "error");
          return;
        }
      }

      const res = Store.updateSubject(editingSubjId, { id: id, name: name });
      if (res && !res.ok) {
        App.toast(res.error || "Failed to update subject.", "error");
        return;
      }

      cancelSubjEdit();
      renderSubjects();
      App.toast("Subject updated successfully.", "success");
    } else {
      const res = Store.addSubject({ id: id, name: name });
      if (res && !res.ok) {
        App.toast(res.error || "Failed to add subject.", "error");
        return;
      }

      inpSubjId.value = "";
      inpSubjName.value = "";
      renderSubjects();
      App.toast("Subject added successfully.", "success");
    }
  }

  function handleEditSubject(id) {
    const subj = Store.getSubjects().find(function (s) {
      return s.id === id;
    });
    if (!subj) {
      App.toast("Subject not found.", "error");
      return;
    }

    editingSubjId = subj.id;
    inpSubjId.value = subj.id;
    inpSubjName.value = subj.name;
    inpSubjId.disabled = false;
    btnAddSubj.textContent = "Update Subject";
    btnCancelSubj.style.display = "inline-flex";
    inpSubjName.focus();
  }

  function handleDeleteSubject(id) {
    App.confirm("Are you sure you want to delete subject '" + id + "'?", function () {
      Store.deleteSubject(id);
      if (editingSubjId === id) {
        cancelSubjEdit();
      }
      renderSubjects();
      App.toast("Subject deleted successfully.", "success");
    });
  }

  btnAddSubj.addEventListener("click", handleSaveSubject);
  btnCancelSubj.addEventListener("click", cancelSubjEdit);

  inpSubjId.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      inpSubjName.focus();
    }
  });

  inpSubjName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveSubject();
    }
  });

  subjectsTable.addEventListener("click", function (e) {
    const editBtn = e.target.closest(".btn-edit-subj");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      handleEditSubject(id);
      return;
    }

    const delBtn = e.target.closest(".btn-del-subj");
    if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      handleDeleteSubject(id);
      return;
    }
  });

  // ── Teachers CRUD ─────────────────────────────────────────────
  function renderTeachers() {
    const teachers = Store.getTeachers();
    if (!teachers || teachers.length === 0) {
      teachersTbody.innerHTML =
        '<tr><td colspan="3" class="table-empty">No teachers added yet. Add your first teacher above.</td></tr>';
      return;
    }

    let html = "";
    teachers.forEach(function (teach) {
      html += `
        <tr>
          <td><strong>${App.esc(teach.id)}</strong></td>
          <td>${App.esc(teach.name)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn--small btn--outline btn-edit-teach" data-id="${App.esc(teach.id)}" title="Edit Teacher">✏️ Edit</button>
              <button type="button" class="btn btn--small btn--danger btn-del-teach" data-id="${App.esc(teach.id)}" title="Delete Teacher">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    teachersTbody.innerHTML = html;
  }

  function cancelTeachEdit() {
    editingTeachId = null;
    inpTeachId.value = "";
    inpTeachName.value = "";
    inpTeachId.disabled = false;
    btnAddTeach.textContent = "Add Teacher";
    btnCancelTeach.style.display = "none";
  }

  function handleSaveTeacher() {
    const id = inpTeachId.value.trim();
    const name = inpTeachName.value.trim();

    if (!id || !name) {
      App.toast("Please enter both Teacher ID and Teacher Name.", "warning");
      return;
    }

    if (editingTeachId !== null) {
      if (id !== editingTeachId) {
        const duplicate = Store.getTeachers().some(function (t) {
          return t.id === id;
        });
        if (duplicate) {
          App.toast("A teacher with ID '" + id + "' already exists.", "error");
          return;
        }
      }

      const res = Store.updateTeacher(editingTeachId, { id: id, name: name });
      if (res && !res.ok) {
        App.toast(res.error || "Failed to update teacher.", "error");
        return;
      }

      cancelTeachEdit();
      renderTeachers();
      App.toast("Teacher updated successfully.", "success");
    } else {
      const res = Store.addTeacher({ id: id, name: name });
      if (res && !res.ok) {
        App.toast(res.error || "Failed to add teacher.", "error");
        return;
      }

      inpTeachId.value = "";
      inpTeachName.value = "";
      renderTeachers();
      App.toast("Teacher added successfully.", "success");
    }
  }

  function handleEditTeacher(id) {
    const teach = Store.getTeachers().find(function (t) {
      return t.id === id;
    });
    if (!teach) {
      App.toast("Teacher not found.", "error");
      return;
    }

    editingTeachId = teach.id;
    inpTeachId.value = teach.id;
    inpTeachName.value = teach.name;
    inpTeachId.disabled = false;
    btnAddTeach.textContent = "Update Teacher";
    btnCancelTeach.style.display = "inline-flex";
    inpTeachName.focus();
  }

  function handleDeleteTeacher(id) {
    App.confirm("Are you sure you want to delete teacher '" + id + "'?", function () {
      Store.deleteTeacher(id);
      if (editingTeachId === id) {
        cancelTeachEdit();
      }
      renderTeachers();
      App.toast("Teacher deleted successfully.", "success");
    });
  }

  btnAddTeach.addEventListener("click", handleSaveTeacher);
  btnCancelTeach.addEventListener("click", cancelTeachEdit);

  inpTeachId.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      inpTeachName.focus();
    }
  });

  inpTeachName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTeacher();
    }
  });

  teachersTable.addEventListener("click", function (e) {
    const editBtn = e.target.closest(".btn-edit-teach");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      handleEditTeacher(id);
      return;
    }

    const delBtn = e.target.closest(".btn-del-teach");
    if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      handleDeleteTeacher(id);
      return;
    }
  });

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
    renderSubjects();
    renderTeachers();
    renderClasses();
    initThreshold();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
