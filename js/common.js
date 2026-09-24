/* ============================================================
   common.js — Shared UI Utilities
   Nav renderer, auth guard, role-based nav, toast, modal,
   date/time helpers, escaping.
   ============================================================ */

const App = (function () {
  "use strict";

  // ── Page Access Rules ─────────────────────────────────────────
  // Maps page filenames to allowed roles. Pages not listed are open.
  const PAGE_ROLES = {
    "index.html":           ["admin", "teacher", "student"],
    "add-student.html":     ["admin"],
    "students.html":        ["admin", "teacher"],
    "student-profile.html": ["admin", "teacher", "student"],
    "attendance.html":      ["admin", "teacher"],
    "records.html":         ["admin", "teacher"],
    "settings.html":        ["admin"],
  };

  // ── Navigation items per role ─────────────────────────────────
  const NAV_ITEMS = [
    { href: "index.html",       icon: "🏠", label: "Dashboard",       roles: ["admin", "teacher", "student"] },
    { href: "add-student.html", icon: "➕", label: "Add Student",     roles: ["admin"] },
    { href: "students.html",    icon: "👥", label: "Students",        roles: ["admin", "teacher"] },
    { href: "attendance.html",  icon: "✅", label: "Mark Attendance", roles: ["admin", "teacher"] },
    { href: "records.html",     icon: "📊", label: "Records",         roles: ["admin", "teacher"] },
    { href: "settings.html",    icon: "⚙️", label: "Settings",       roles: ["admin"] },
  ];

  // ── Auth Guard ────────────────────────────────────────────────
  function checkAuth() {
    var currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Login page doesn't need guard
    if (currentPage === "login.html") return true;

    // Must be authenticated
    if (!Store.isAuthenticated()) {
      window.location.href = "login.html";
      return false;
    }

    // Check role access
    var session = Store.getSession();
    var allowedRoles = PAGE_ROLES[currentPage];
    if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
      // Redirect to dashboard with access denied
      window.location.href = "index.html";
      return false;
    }

    return true;
  }

  // ── Navigation ────────────────────────────────────────────────
  function renderNav() {
    // Run auth guard first
    if (!checkAuth()) return;

    var session = Store.getSession();
    if (!session) return;

    var role = session.role;
    var currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Sidebar
    var sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "sidebar";

    var roleBadge = {
      admin: "🛡️ Admin",
      teacher: "👨‍🏫 Teacher",
      student: "🎓 Student",
    };

    var navHTML =
      '<div class="sidebar__brand">' +
        '<span class="sidebar__logo">📋</span>' +
        '<span class="sidebar__title">AttendTrack</span>' +
      '</div>' +
      '<nav class="sidebar__nav">';

    NAV_ITEMS.forEach(function (item) {
      // Only show nav items the user's role has access to
      if (item.roles.indexOf(role) === -1) return;

      var active = currentPage === item.href ? "sidebar__link--active" : "";
      navHTML +=
        '<a href="' + item.href + '" class="sidebar__link ' + active + '">' +
          '<span class="sidebar__icon">' + item.icon + '</span>' +
          '<span class="sidebar__label">' + item.label + '</span>' +
        '</a>';
    });

    navHTML += '</nav>';

    // User profile section at bottom of sidebar
    navHTML +=
      '<div class="sidebar__user">' +
        '<div class="sidebar__user-info">' +
          '<div class="sidebar__user-avatar">' + esc(session.name.charAt(0).toUpperCase()) + '</div>' +
          '<div class="sidebar__user-details">' +
            '<div class="sidebar__user-name">' + esc(session.name) + '</div>' +
            '<div class="sidebar__user-role">' + (roleBadge[role] || role) + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="sidebar__logout" id="btn-logout" title="Sign out">⏻</button>' +
      '</div>';

    sidebar.innerHTML = navHTML;

    // Top bar (mobile)
    var topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML =
      '<button class="topbar__hamburger" id="hamburger" aria-label="Toggle navigation">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<span class="topbar__title">📋 AttendTrack</span>' +
      '<button class="topbar__logout" id="btn-logout-mobile" title="Sign out">⏻</button>';

    // Overlay
    var overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebar-overlay";

    document.body.prepend(overlay);
    document.body.prepend(sidebar);
    document.body.prepend(topbar);

    // Hamburger toggle
    var hamburger = document.getElementById("hamburger");
    hamburger.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar--open");
      overlay.classList.toggle("sidebar-overlay--visible");
    });
    overlay.addEventListener("click", function () {
      sidebar.classList.remove("sidebar--open");
      overlay.classList.remove("sidebar-overlay--visible");
    });

    // Logout buttons
    document.getElementById("btn-logout").addEventListener("click", handleLogout);
    document.getElementById("btn-logout-mobile").addEventListener("click", handleLogout);
  }

  function handleLogout() {
    Store.logout();
    window.location.href = "login.html";
  }

  // ── Role helpers ──────────────────────────────────────────────
  function requireRole(roles) {
    var session = Store.getSession();
    if (!session) return false;
    if (typeof roles === "string") roles = [roles];
    return roles.indexOf(session.role) !== -1;
  }

  function getRole() {
    return Store.getCurrentRole();
  }

  function getSessionUser() {
    return Store.getSession();
  }

  // ── Toast ─────────────────────────────────────────────────────
  function toast(msg, type) {
    var container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    var el = document.createElement("div");
    el.className = "toast toast--" + (type || "info");
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  // ── Modal confirm ─────────────────────────────────────────────
  function confirm(msg, onConfirm, onCancel) {
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    backdrop.innerHTML =
      '<div class="modal">' +
        '<p class="modal__msg">' + esc(msg) + '</p>' +
        '<div class="modal__actions">' +
          '<button class="btn btn--danger modal__yes">Yes, proceed</button>' +
          '<button class="btn btn--outline modal__no">Cancel</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add("modal-backdrop--visible"); });

    backdrop.querySelector(".modal__yes").addEventListener("click", function () {
      doClose();
      if (onConfirm) onConfirm();
    });
    backdrop.querySelector(".modal__no").addEventListener("click", function () {
      doClose();
      if (onCancel) onCancel();
    });
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) {
        doClose();
        if (onCancel) onCancel();
      }
    });

    function doClose() {
      backdrop.classList.remove("modal-backdrop--visible");
      setTimeout(function () { backdrop.remove(); }, 250);
    }
  }

  // ── Utility helpers ───────────────────────────────────────────
  function esc(str) {
    var el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    var months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec",
    ];
    return parseInt(parts[2], 10) + " " + months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  function formatTime(timeStr) {
    if (!timeStr) return "—";
    var parts = timeStr.split(":");
    var hr = parseInt(parts[0], 10);
    var ampm = hr >= 12 ? "PM" : "AM";
    var h12 = hr % 12 || 12;
    return h12 + ":" + parts[1] + " " + ampm;
  }

  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  function nowTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function properCase(str) {
    if (!str) return "";
    return str.replace(/\b(\w+)/g, function (m) {
      return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
    });
  }

  function getMonthRange(yearMonth) {
    if (!yearMonth) return null;
    var parts = yearMonth.split("-");
    var start = yearMonth + "-01";
    var lastDay = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
    var end = yearMonth + "-" + String(lastDay).padStart(2, "0");
    return { start: start, end: end };
  }

  function formatMonth(yearMonth) {
    if (!yearMonth) return "—";
    var parts = yearMonth.split("-");
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  function pctBadgeClass(pct) {
    if (pct === null || pct === undefined) return "";
    if (pct >= 75) return "pct-badge--good";
    if (pct >= 50) return "pct-badge--warn";
    return "pct-badge--danger";
  }

  function statusPillHTML(status) {
    var cls = {
      Present: "status-pill--present",
      Absent: "status-pill--absent",
      Late: "status-pill--late",
      Leave: "status-pill--leave",
    };
    return '<span class="status-pill ' + (cls[status] || "") + '">' + esc(status) + "</span>";
  }

  function populateSelect(selectEl, items, valueKey, labelKey, placeholder) {
    selectEl.innerHTML = "";
    if (placeholder) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      selectEl.appendChild(opt);
    }
    items.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item[valueKey];
      opt.textContent = item[labelKey];
      selectEl.appendChild(opt);
    });
  }

  // ── Init on every page ────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", renderNav);

  // ── Public API ────────────────────────────────────────────────
  return {
    toast: toast,
    confirm: confirm,
    esc: esc,
    formatDate: formatDate,
    formatTime: formatTime,
    todayISO: todayISO,
    nowTime: nowTime,
    getUrlParam: getUrlParam,
    pctBadgeClass: pctBadgeClass,
    statusPillHTML: statusPillHTML,
    populateSelect: populateSelect,
    properCase: properCase,
    getMonthRange: getMonthRange,
    formatMonth: formatMonth,
    // Auth helpers
    requireRole: requireRole,
    getRole: getRole,
    getSessionUser: getSessionUser,
    handleLogout: handleLogout,
  };
})();
