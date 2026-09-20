/* ============================================================
   common.js — Shared UI Utilities
   Nav renderer, toast, modal, date/time helpers, escaping.
   ============================================================ */

const App = (function () {
  "use strict";

  // ── Navigation ────────────────────────────────────────────────
  const NAV_ITEMS = [
    { href: "index.html", icon: "🏠", label: "Dashboard" },
    { href: "add-student.html", icon: "➕", label: "Add Student" },
    { href: "students.html", icon: "👥", label: "Students" },
    { href: "attendance.html", icon: "✅", label: "Mark Attendance" },
    { href: "records.html", icon: "📊", label: "Records" },
    { href: "settings.html", icon: "⚙️", label: "Settings" },
  ];

  function renderNav() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Sidebar
    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "sidebar";

    let navHTML = `
      <div class="sidebar__brand">
        <span class="sidebar__logo">📋</span>
        <span class="sidebar__title">AttendTrack</span>
      </div>
      <nav class="sidebar__nav">`;

    NAV_ITEMS.forEach((item) => {
      const active = currentPage === item.href ? "sidebar__link--active" : "";
      navHTML += `
        <a href="${item.href}" class="sidebar__link ${active}">
          <span class="sidebar__icon">${item.icon}</span>
          <span class="sidebar__label">${item.label}</span>
        </a>`;
    });

    navHTML += `</nav>`;
    sidebar.innerHTML = navHTML;

    // Top bar (mobile)
    const topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML = `
      <button class="topbar__hamburger" id="hamburger" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <span class="topbar__title">📋 AttendTrack</span>
    `;

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebar-overlay";

    document.body.prepend(overlay);
    document.body.prepend(sidebar);
    document.body.prepend(topbar);

    // Hamburger toggle
    const hamburger = document.getElementById("hamburger");
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar--open");
      overlay.classList.toggle("sidebar-overlay--visible");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("sidebar--open");
      overlay.classList.remove("sidebar-overlay--visible");
    });
  }

  // ── Toast ─────────────────────────────────────────────────────
  function toast(msg, type) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.className = "toast toast--" + (type || "info");
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // ── Modal confirm ─────────────────────────────────────────────
  function confirm(msg, onConfirm, onCancel) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    backdrop.innerHTML = `
      <div class="modal">
        <p class="modal__msg">${esc(msg)}</p>
        <div class="modal__actions">
          <button class="btn btn--danger modal__yes">Yes, proceed</button>
          <button class="btn btn--outline modal__no">Cancel</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("modal-backdrop--visible"));

    backdrop.querySelector(".modal__yes").addEventListener("click", () => {
      close();
      if (onConfirm) onConfirm();
    });
    backdrop.querySelector(".modal__no").addEventListener("click", () => {
      close();
      if (onCancel) onCancel();
    });
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        close();
        if (onCancel) onCancel();
      }
    });

    function close() {
      backdrop.classList.remove("modal-backdrop--visible");
      setTimeout(() => backdrop.remove(), 250);
    }
  }

  // ── Utility helpers ───────────────────────────────────────────
  function esc(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec",
    ];
    return parseInt(d, 10) + " " + months[parseInt(m, 10) - 1] + " " + y;
  }

  function formatTime(timeStr) {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":");
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? "PM" : "AM";
    const h12 = hr % 12 || 12;
    return h12 + ":" + m + " " + ampm;
  }

  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function properCase(str) {
    if (!str) return "";
    return str.replace(/\b\w/g, function (c) { return c.toUpperCase(); }).replace(/\b(\w+)/g, function(m) {
      // Keep small words lowercase unless first word
      return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
    });
  }

  function getMonthRange(yearMonth) {
    // yearMonth = "2026-09"
    if (!yearMonth) return null;
    const [y, m] = yearMonth.split("-");
    const start = yearMonth + "-01";
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = yearMonth + "-" + String(lastDay).padStart(2, "0");
    return { start, end };
  }

  function formatMonth(yearMonth) {
    if (!yearMonth) return "—";
    const [y, m] = yearMonth.split("-");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[parseInt(m, 10) - 1] + " " + y;
  }

  function pctBadgeClass(pct) {
    if (pct === null || pct === undefined) return "";
    if (pct >= 75) return "pct-badge--good";
    if (pct >= 50) return "pct-badge--warn";
    return "pct-badge--danger";
  }

  function statusPillHTML(status) {
    const cls = {
      Present: "status-pill--present",
      Absent: "status-pill--absent",
      Late: "status-pill--late",
      Leave: "status-pill--leave",
    };
    return '<span class="status-pill ' + (cls[status] || "") + '">' + esc(status) + "</span>";
  }

  /** Populate a <select> with options */
  function populateSelect(selectEl, items, valueKey, labelKey, placeholder) {
    selectEl.innerHTML = "";
    if (placeholder) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      selectEl.appendChild(opt);
    }
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item[valueKey];
      opt.textContent = item[labelKey];
      selectEl.appendChild(opt);
    });
  }

  // ── Init on every page ────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", renderNav);

  // ── Public API ────────────────────────────────────────────────
  return {
    toast,
    confirm,
    esc,
    formatDate,
    formatTime,
    todayISO,
    nowTime,
    getUrlParam,
    pctBadgeClass,
    statusPillHTML,
    populateSelect,
    properCase,
    getMonthRange,
    formatMonth,
  };
})();
