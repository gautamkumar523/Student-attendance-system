/* ============================================================
   add-student.js — Student Registration & Edit Controller
   Handles form validation, accordion panels, photo preview,
   review summary generation, and saving to Store.
   ============================================================ */

(function () {
  "use strict";

  // ── DOM Elements ──────────────────────────────────────────────
  const headingEl = document.getElementById("page-heading");
  const saveBtn = document.getElementById("save-btn");
  const resetBtn = document.getElementById("reset-btn");

  // Panel 1: Basic
  const inpId = document.getElementById("inp-id");
  const inpName = document.getElementById("inp-name");
  const inpDob = document.getElementById("inp-dob");
  const inpPhoto = document.getElementById("inp-photo");
  const photoPreview = document.getElementById("photo-preview");
  const errId = document.getElementById("err-id");
  const errName = document.getElementById("err-name");

  // Panel 2: Academic
  const inpCourse = document.getElementById("inp-course");
  const inpSemester = document.getElementById("inp-semester");
  const inpDepartment = document.getElementById("inp-department");
  const inpBatch = document.getElementById("inp-batch");
  const inpAdmissionNo = document.getElementById("inp-admission-no");
  const inpAdmissionDate = document.getElementById("inp-admission-date");

  // Panel 3: Contact
  const inpMobile = document.getElementById("inp-mobile");
  const inpEmail = document.getElementById("inp-email");
  const inpAddress = document.getElementById("inp-address");
  const inpCity = document.getElementById("inp-city");
  const inpState = document.getElementById("inp-state");

  // Panel 4: Parent / Guardian
  const inpFather = document.getElementById("inp-father");
  const inpMother = document.getElementById("inp-mother");
  const inpParentMobile = document.getElementById("inp-parent-mobile");
  const inpParentEmail = document.getElementById("inp-parent-email");

  // Panel 5: Review
  const panelReview = document.getElementById("panel-review");
  const reviewSummary = document.getElementById("review-summary");

  const DEFAULT_AVATAR = "assets/default-avatar.svg";
  let currentPhotoData = "";

  // ── Edit Mode Detection ───────────────────────────────────────
  const editId = App.getUrlParam("edit");
  const isEditMode = Boolean(editId);

  // ── Helpers ───────────────────────────────────────────────────
  function getSelectedGender() {
    const checked = document.querySelector('input[name="gender"]:checked');
    return checked ? checked.value : "";
  }

  function setSelectedGender(val) {
    const radios = document.querySelectorAll('input[name="gender"]');
    radios.forEach((r) => {
      r.checked = r.value.toLowerCase() === (val || "").toLowerCase();
    });
  }

  function getFormData() {
    return {
      id: inpId.value.trim(),
      name: App.properCase(inpName.value.trim()),
      dob: inpDob.value,
      gender: getSelectedGender(),
      photo: currentPhotoData || "",
      course: inpCourse.value.trim(),
      year: inpSemester.value.trim(),
      department: inpDepartment.value.trim(),
      batch: inpBatch.value.trim(),
      admissionNo: inpAdmissionNo.value.trim(),
      admissionDate: inpAdmissionDate.value,
      mobile: inpMobile.value.trim(),
      email: inpEmail.value.trim(),
      address: inpAddress.value.trim(),
      city: inpCity.value.trim(),
      state: inpState.value.trim(),
      fatherName: App.properCase(inpFather.value.trim()),
      motherName: App.properCase(inpMother.value.trim()),
      parentMobile: inpParentMobile.value.trim(),
      parentEmail: inpParentEmail.value.trim(),
    };
  }

  function populateForm(student) {
    if (!student) return;
    inpId.value = student.id || "";
    inpName.value = student.name || "";
    inpDob.value = student.dob || "";
    setSelectedGender(student.gender || "");

    if (student.photo) {
      currentPhotoData = student.photo;
      photoPreview.src = student.photo;
    } else {
      currentPhotoData = "";
      photoPreview.src = DEFAULT_AVATAR;
    }

    inpCourse.value = student.course || "";
    inpSemester.value = student.year || "";
    inpDepartment.value = student.department || "";
    inpBatch.value = student.batch || "";
    inpAdmissionNo.value = student.admissionNo || "";
    inpAdmissionDate.value = student.admissionDate || "";

    inpMobile.value = student.mobile || "";
    inpEmail.value = student.email || "";
    inpAddress.value = student.address || "";
    inpCity.value = student.city || "";
    inpState.value = student.state || "";

    inpFather.value = student.fatherName || "";
    inpMother.value = student.motherName || "";
    inpParentMobile.value = student.parentMobile || "";
    inpParentEmail.value = student.parentEmail || "";
  }

  function resetForm() {
    inpId.value = "";
    inpName.value = "";
    inpDob.value = "";
    setSelectedGender("");

    inpPhoto.value = "";
    currentPhotoData = "";
    photoPreview.src = DEFAULT_AVATAR;

    inpCourse.value = "";
    inpSemester.value = "";
    inpDepartment.value = "";
    inpBatch.value = "";
    inpAdmissionNo.value = "";
    inpAdmissionDate.value = "";

    inpMobile.value = "";
    inpEmail.value = "";
    inpAddress.value = "";
    inpCity.value = "";
    inpState.value = "";

    inpFather.value = "";
    inpMother.value = "";
    inpParentMobile.value = "";
    inpParentEmail.value = "";

    clearErrors();

    if (reviewSummary) {
      reviewSummary.innerHTML = "";
    }
  }

  // ── Validation ────────────────────────────────────────────────
  function clearErrors() {
    inpId.classList.remove("input-error");
    inpName.classList.remove("input-error");
    if (errId) {
      errId.textContent = "";
      errId.style.display = "none";
    }
    if (errName) {
      errName.textContent = "";
      errName.style.display = "none";
    }
  }

  function validate() {
    clearErrors();
    let valid = true;
    let firstInvalid = null;

    if (!inpId.value.trim()) {
      inpId.classList.add("input-error");
      if (errId) {
        errId.textContent = "Student ID / Roll Number is required.";
        errId.style.display = "block";
      }
      valid = false;
      if (!firstInvalid) firstInvalid = inpId;
    }

    if (!inpName.value.trim()) {
      inpName.classList.add("input-error");
      if (errName) {
        errName.textContent = "Full Name is required.";
        errName.style.display = "block";
      }
      valid = false;
      if (!firstInvalid) firstInvalid = inpName;
    }

    if (!valid && firstInvalid) {
      const basicPanel = document.getElementById("panel-basic");
      if (basicPanel && !basicPanel.classList.contains("accordion__item--open")) {
        basicPanel.classList.add("accordion__item--open");
      }
      firstInvalid.focus();
    }

    return valid;
  }

  // ── Review Summary Generator ──────────────────────────────────
  function renderReviewSummary() {
    if (!reviewSummary) return;

    const data = getFormData();
    const photoSrc = currentPhotoData || DEFAULT_AVATAR;
    const hasRequired = Boolean(data.id && data.name);

    let html = "";

    if (!hasRequired) {
      html += `
        <div style="background: var(--clr-danger-light); color: var(--clr-danger); border: 1px solid var(--clr-danger); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.88rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>⚠️</span>
          <span><strong>Required Information Missing:</strong> Please provide both <strong>Student ID</strong> and <strong>Full Name</strong> in Basic Details.</span>
        </div>
      `;
    }

    html += `
      <div style="background: var(--clr-bg); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1rem; border: 1px solid var(--clr-border);">
        
        <!-- Header / Avatar preview -->
        <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--clr-border);">
          <img src="${App.esc(photoSrc)}" alt="Photo Preview" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--clr-border); background: #fff; flex-shrink: 0;" />
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; color: var(--clr-text);">${App.esc(data.name || "— (No Name)")}</h3>
            <p style="margin: 0.35rem 0 0; font-size: 0.88rem; color: var(--clr-text-muted);">
              <strong>ID:</strong> ${App.esc(data.id || "—")}
              ${data.gender ? ` &bull; <strong>Gender:</strong> ${App.esc(data.gender)}` : ""}
              ${data.dob ? ` &bull; <strong>DOB:</strong> ${App.formatDate(data.dob)}` : ""}
            </p>
          </div>
        </div>

        <!-- Detail columns -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
          
          <!-- Academic Info -->
          <div>
            <h4 style="margin: 0 0 0.65rem; font-size: 0.92rem; color: var(--clr-primary); border-bottom: 2px solid var(--clr-primary-light); padding-bottom: 0.25rem;">
              Academic Details
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
              <div><span style="color: var(--clr-text-muted);">Course:</span> <strong>${App.esc(data.course || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Year:</span> <strong>${App.esc(data.year || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Department:</span> <strong>${App.esc(data.department || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Batch:</span> <strong>${App.esc(data.batch || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Admission No:</span> <strong>${App.esc(data.admissionNo || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Admission Date:</span> <strong>${data.admissionDate ? App.formatDate(data.admissionDate) : "—"}</strong></div>
            </div>
          </div>

          <!-- Contact Info -->
          <div>
            <h4 style="margin: 0 0 0.65rem; font-size: 0.92rem; color: var(--clr-primary); border-bottom: 2px solid var(--clr-primary-light); padding-bottom: 0.25rem;">
              Contact Details
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
              <div><span style="color: var(--clr-text-muted);">Mobile:</span> <strong>${App.esc(data.mobile || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Email:</span> <strong>${App.esc(data.email || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Address:</span> <strong>${App.esc(data.address || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">City:</span> <strong>${App.esc(data.city || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">State:</span> <strong>${App.esc(data.state || "—")}</strong></div>
            </div>
          </div>

          <!-- Parent Details -->
          <div>
            <h4 style="margin: 0 0 0.65rem; font-size: 0.92rem; color: var(--clr-primary); border-bottom: 2px solid var(--clr-primary-light); padding-bottom: 0.25rem;">
              Parent / Guardian
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;">
              <div><span style="color: var(--clr-text-muted);">Father/Guardian:</span> <strong>${App.esc(data.fatherName || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Mother:</span> <strong>${App.esc(data.motherName || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Parent Mobile:</span> <strong>${App.esc(data.parentMobile || "—")}</strong></div>
              <div><span style="color: var(--clr-text-muted);">Parent Email:</span> <strong>${App.esc(data.parentEmail || "—")}</strong></div>
            </div>
          </div>

        </div>
      </div>
    `;

    reviewSummary.innerHTML = html;
  }

  // ── Event Handlers ────────────────────────────────────────────

  // Accordion toggle
  function initAccordion() {
    const items = document.querySelectorAll(".accordion__item");
    items.forEach((item) => {
      const header = item.querySelector(".accordion__header");
      if (!header) return;

      header.addEventListener("click", () => {
        item.classList.toggle("accordion__item--open");

        // When panel 5 is opened, populate #review-summary
        if (item.id === "panel-review" && item.classList.contains("accordion__item--open")) {
          renderReviewSummary();
        }
      });
    });
  }

  // Photo upload preview
  function initPhotoUpload() {
    if (!inpPhoto || !photoPreview) return;

    inpPhoto.addEventListener("change", function () {
      const file = this.files && this.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        App.toast("Please select an image file.", "warning");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        currentPhotoData = e.target.result;
        photoPreview.src = currentPhotoData;

        // If review panel is already open, refresh the summary
        if (panelReview && panelReview.classList.contains("accordion__item--open")) {
          renderReviewSummary();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Input clear error listeners
  function initInputListeners() {
    if (inpId) {
      inpId.addEventListener("input", () => {
        if (inpId.value.trim()) {
          inpId.classList.remove("input-error");
          if (errId) {
            errId.textContent = "";
            errId.style.display = "none";
          }
        }
      });
    }

    if (inpName) {
      inpName.addEventListener("input", () => {
        if (inpName.value.trim()) {
          inpName.classList.remove("input-error");
          if (errName) {
            errName.textContent = "";
            errName.style.display = "none";
          }
        }
      });
    }
  }

  // Save handler
  function onSave() {
    if (!validate()) {
      App.toast("Please fill in all required fields (Student ID and Full Name).", "error");
      return;
    }

    const studentData = getFormData();
    let result;

    if (isEditMode) {
      result = Store.updateStudent(editId, studentData);
    } else {
      result = Store.addStudent(studentData);
    }

    if (!result.ok) {
      App.toast(result.error || "Failed to save student.", "error");

      // Check if error is related to duplicate ID
      if (result.error && result.error.toLowerCase().includes("id")) {
        inpId.classList.add("input-error");
        if (errId) {
          errId.textContent = result.error;
          errId.style.display = "block";
        }
        const basicPanel = document.getElementById("panel-basic");
        if (basicPanel && !basicPanel.classList.contains("accordion__item--open")) {
          basicPanel.classList.add("accordion__item--open");
        }
        inpId.focus();
      }
      return;
    }

    App.toast(
      isEditMode ? "Student updated successfully!" : "Student registered successfully!",
      "success"
    );

    setTimeout(() => {
      window.location.href = "students.html";
    }, 600);
  }

  // Reset handler
  function onReset() {
    resetForm();
    App.toast("Form fields have been reset.", "info");
  }

  // ── Initialization ────────────────────────────────────────────
  function init() {
    initAccordion();
    initPhotoUpload();
    initInputListeners();

    if (saveBtn) {
      saveBtn.addEventListener("click", onSave);
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", onReset);
    }

    // Check edit mode
    if (isEditMode) {
      if (headingEl) {
        headingEl.textContent = "Edit Student";
      }
      document.title = "Edit Student — AttendTrack";

      if (saveBtn) {
        saveBtn.textContent = "Update Student";
      }

      const existingStudent = Store.getStudentById(editId);
      if (existingStudent) {
        populateForm(existingStudent);
      } else {
        App.toast("Student with ID '" + editId + "' not found.", "error");
      }
    }
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
