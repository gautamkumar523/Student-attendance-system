/* ============================================================
   common.js — Shared UI: Sidebar nav, auth guard, utilities
   ============================================================ */

const App = (function () {
  "use strict";

  // ── Page Access Rules ─────────────────────────────────────────
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

  // ── Theme Management (Default: dark) ──────────────────────────
  function getTheme() {
    return localStorage.getItem("ams_theme") || "dark";
  }

  function applyTheme(theme) {
    const validTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", validTheme);
    document.documentElement.style.colorScheme = validTheme;
    localStorage.setItem("ams_theme", validTheme);
    window.dispatchEvent(new CustomEvent("ams-theme-change", { detail: { theme: validTheme } }));
  }

  function setTheme(theme) {
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = getTheme() === "light" ? "dark" : "light";
    applyTheme(next);
    return next;
  }

  // Initialize theme on script execution
  applyTheme(getTheme());

  // ── Auth Guard ────────────────────────────────────────────────
  function checkAuth() {
    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    if (currentPage === "login.html") return true;
    if (!Store.isAuthenticated()) {
      window.location.href = "login.html";
      return false;
    }
    var session = Store.getSession();
    var allowedRoles = PAGE_ROLES[currentPage];
    if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
      window.location.href = "index.html";
      return false;
    }
    return true;
  }

  // ── Navigation Renderer ───────────────────────────────────────
  function renderNav() {
    if (!checkAuth()) return;

    var session = Store.getSession();
    if (!session) return;

    var role = session.role;
    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    var roleLabels = { admin: "Admin", teacher: "Teacher", student: "Student" };

    // ── Build Sidebar ───────────────────────────────────────────
    var sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "sidebar";

    var html = "";

    // Brand
    html += '<div class="sidebar__brand">' +
      '<div class="sidebar__logo">📋</div>' +
      '<span class="sidebar__title">AttendTrack</span>' +
    '</div>';

    // Nav links
    html += '<nav class="sidebar__nav">';
    NAV_ITEMS.forEach(function (item) {
      if (item.roles.indexOf(role) === -1) return;
      var active = currentPage === item.href ? " sidebar__link--active" : "";
      html += '<a href="' + item.href + '" class="sidebar__link' + active + '">' +
        '<span class="sidebar__icon">' + item.icon + '</span>' +
        '<span>' + item.label + '</span>' +
      '</a>';
    });
    html += '</nav>';

    // User section
    html += '<div class="sidebar__user">' +
      '<div class="sidebar__user-avatar">' + esc(session.name.charAt(0).toUpperCase()) + '</div>' +
      '<div class="sidebar__user-info">' +
        '<div class="sidebar__user-name">' + esc(session.name) + '</div>' +
        '<div class="sidebar__user-role">' + (roleLabels[role] || role) + '</div>' +
      '</div>' +
      '<button class="sidebar__logout" id="btn-logout" title="Sign out">⏻</button>' +
    '</div>';

    sidebar.innerHTML = html;

    // ── Mobile Topbar ───────────────────────────────────────────
    var topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML =
      '<button class="topbar__hamburger" id="hamburger" aria-label="Menu">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<span class="topbar__title">📋 AttendTrack</span>' +
      '<button class="topbar__logout" id="btn-logout-mobile" title="Sign out">⏻</button>';

    // Overlay
    var overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebar-overlay";

    // Insert into DOM
    document.body.prepend(overlay);
    document.body.prepend(sidebar);
    document.body.prepend(topbar);

    // ── Event Listeners ─────────────────────────────────────────
    document.getElementById("hamburger").addEventListener("click", function () {
      sidebar.classList.toggle("sidebar--open");
      overlay.classList.toggle("sidebar-overlay--visible");
    });
    overlay.addEventListener("click", function () {
      sidebar.classList.remove("sidebar--open");
      overlay.classList.remove("sidebar-overlay--visible");
    });

    sidebar.querySelectorAll(".sidebar__link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove("sidebar--open");
          overlay.classList.remove("sidebar-overlay--visible");
        }
      });
    });

    // Logout
    document.getElementById("btn-logout").addEventListener("click", handleLogout);
    document.getElementById("btn-logout-mobile").addEventListener("click", handleLogout);

    // Reveal the page (prevents auth flash)
    document.body.classList.add("body--ready");
  }

  function handleLogout() {
    Store.logout();
    window.location.href = "login.html";
  }

  // ── Role helpers ──────────────────────────────────────────────
  function requireRole(roles) {
    var s = Store.getSession();
    if (!s) return false;
    if (typeof roles === "string") roles = [roles];
    return roles.indexOf(s.role) !== -1;
  }
  function getRole() { return Store.getCurrentRole(); }
  function getSessionUser() { return Store.getSession(); }

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
      doClose(); if (onConfirm) onConfirm();
    });
    backdrop.querySelector(".modal__no").addEventListener("click", function () {
      doClose(); if (onCancel) onCancel();
    });
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) { doClose(); if (onCancel) onCancel(); }
    });
    function doClose() {
      backdrop.classList.remove("modal-backdrop--visible");
      setTimeout(function () { backdrop.remove(); }, 200);
    }
  }

  // ── Utility helpers ───────────────────────────────────────────
  function esc(str) {
    if (str == null) return "";
    var el = document.createElement("span");
    el.textContent = String(str);
    return el.innerHTML;
  }
  function formatDate(iso) {
    if (!iso) return "—";
    var p = iso.split("-");
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return parseInt(p[2], 10) + " " + months[parseInt(p[1], 10) - 1] + " " + p[0];
  }
  function formatTime(t) {
    if (!t) return "—";
    var p = t.split(":"); var hr = parseInt(p[0], 10);
    return (hr % 12 || 12) + ":" + p[1] + " " + (hr >= 12 ? "PM" : "AM");
  }
  function todayISO() { return new Date().toISOString().split("T")[0]; }
  function nowTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function getUrlParam(n) { return new URLSearchParams(window.location.search).get(n); }
  function properCase(s) {
    if (!s) return "";
    return s.replace(/\b(\w+)/g, function (m) { return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(); });
  }
  function getMonthRange(ym) {
    if (!ym) return null;
    var p = ym.split("-");
    var last = new Date(parseInt(p[0]), parseInt(p[1]), 0).getDate();
    return { start: ym + "-01", end: ym + "-" + String(last).padStart(2, "0") };
  }
  function formatMonth(ym) {
    if (!ym) return "—";
    var p = ym.split("-");
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[parseInt(p[1], 10) - 1] + " " + p[0];
  }
  function pctBadgeClass(pct) {
    if (pct === null || pct === undefined) return "";
    if (pct >= 75) return "pct-badge--good";
    if (pct >= 50) return "pct-badge--warn";
    return "pct-badge--danger";
  }
  function statusPillHTML(status) {
    var cls = {
      Present: "status-pill--present", Absent: "status-pill--absent",
      Late: "status-pill--late", Leave: "status-pill--leave",
    };
    return '<span class="status-pill ' + (cls[status] || "") + '">' + esc(status) + "</span>";
  }
  function populateSelect(sel, items, vKey, lKey, placeholder) {
    sel.innerHTML = "";
    if (placeholder) {
      var o = document.createElement("option");
      o.value = ""; o.textContent = placeholder; sel.appendChild(o);
    }
    items.forEach(function (item) {
      var o = document.createElement("option");
      o.value = item[vKey]; o.textContent = item[lKey]; sel.appendChild(o);
    });
  }

  // ── Init ──────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", renderNav);

  // ── Public API ────────────────────────────────────────────────
  return {
    toast: toast, confirm: confirm, esc: esc,
    formatDate: formatDate, formatTime: formatTime,
    todayISO: todayISO, nowTime: nowTime,
    getUrlParam: getUrlParam, properCase: properCase,
    getMonthRange: getMonthRange, formatMonth: formatMonth,
    pctBadgeClass: pctBadgeClass, statusPillHTML: statusPillHTML,
    populateSelect: populateSelect,
    requireRole: requireRole, getRole: getRole,
    getSessionUser: getSessionUser, handleLogout: handleLogout,
    getTheme: getTheme, setTheme: setTheme, toggleTheme: toggleTheme,
  };
})();
