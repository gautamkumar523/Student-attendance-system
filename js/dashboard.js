/* ============================================================
   dashboard.js — Dashboard Page Controller
   ============================================================ */

(function () {
  "use strict";

  function updateGreeting() {
    const el = document.getElementById("dashboard-greeting");
    if (!el) return;
    const session = Store.getSession();
    const name = session ? session.name : "";
    const hr = new Date().getHours();
    let g = "Good evening";
    if (hr >= 5 && hr < 12) g = "Good morning";
    else if (hr >= 12 && hr < 17) g = "Good afternoon";
    el.textContent = "Welcome, " + name + "! — " + g;
  }

  // ── Admin/Teacher Stats ──────────────────────────────────────
  function renderStats() {
    const grid = document.getElementById("stats-grid");
    if (!grid) return;

    const students = Store.getStudents() || [];
    const total = students.length;
    const today = App.todayISO();
    const todayRecs = Store.getAttendanceByDate(today) || [];
    const present = todayRecs.filter(function (r) {
      return r.status === "Present" || r.status === "Late";
    }).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    const threshold = Store.getThreshold();
    let below = 0;
    students.forEach(function (s) {
      const st = Store.getStudentStats(s.id);
      if (st && st.pct !== null && st.pct < threshold) below++;
    });

    grid.innerHTML =
      '<div class="stat-card">' +
        '<div class="stat-card__icon stat-card__icon--green">✓</div>' +
        '<div class="stat-card__info">' +
          '<div class="stat-card__value">' + pct + '%</div>' +
          '<div class="stat-card__label">Today\'s Presence</div>' +
          '<div class="stat-card__sub stat-card__sub--green">' + present + '/' + total + ' Students</div>' +
        '</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-card__icon stat-card__icon--blue">👥</div>' +
        '<div class="stat-card__info">' +
          '<div class="stat-card__value">' + total + '</div>' +
          '<div class="stat-card__label">Total Students</div>' +
          '<div class="stat-card__sub stat-card__sub--green">Enrolled</div>' +
        '</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-card__icon stat-card__icon--red">⚠</div>' +
        '<div class="stat-card__info">' +
          '<div class="stat-card__value">' + below + '</div>' +
          '<div class="stat-card__label">Below Min. Attendance</div>' +
          '<div class="stat-card__sub stat-card__sub--red">' + (below > 0 ? 'Below ' + threshold + '%' : 'All Good') + '</div>' +
        '</div>' +
      '</div>';
  }

  // ── Attendance Gauge ─────────────────────────────────────────
  function renderGauge() {
    const card = document.getElementById("gauge-card");
    if (!card) return;

    const students = Store.getStudents() || [];
    let totalPct = 0, count = 0;
    students.forEach(function (s) {
      const st = Store.getStudentStats(s.id);
      if (st && st.pct !== null) { totalPct += st.pct; count++; }
    });
    const avg = count > 0 ? Math.round(totalPct / count) : 0;
    const r = 68, circ = 2 * Math.PI * r;
    const offset = circ - (avg / 100) * circ;
    const color = avg >= 75 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444';

    card.innerHTML =
      '<div class="card__header"><h2 class="card__title">Overall Attendance</h2></div>' +
      '<div class="card__body gauge-wrapper">' +
        '<div class="gauge">' +
          '<svg width="180" height="180" viewBox="0 0 180 180">' +
            '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="var(--clr-border-strong)" stroke-width="14"></circle>' +
            '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="14" ' +
              'stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" ' +
              'stroke-linecap="round" transform="rotate(-90 90 90)" ' +
              'style="transition: stroke-dashoffset 0.8s ease;"></circle>' +
          '</svg>' +
          '<div class="gauge__label">' +
            '<span class="gauge__pct">' + avg + '%</span>' +
            '<span class="gauge__text">Overall</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ── Daily Attendance Trend Chart ─────────────────────────────
  function renderTrendChart() {
    const card = document.getElementById("trend-chart-card");
    if (!card) return;

    const allAttendance = Store.getAttendance() || [];

    // Group records by date
    const dateMap = {};
    allAttendance.forEach(function (r) {
      if (!r.date) return;
      if (!dateMap[r.date]) dateMap[r.date] = { total: 0, present: 0 };
      dateMap[r.date].total++;
      if (r.status === "Present" || r.status === "Late") {
        dateMap[r.date].present++;
      }
    });

    let dates = Object.keys(dateMap).sort();
    if (dates.length > 7) dates = dates.slice(dates.length - 7);

    if (dates.length === 0) {
      card.innerHTML =
        '<div class="card__header"><h2 class="card__title">Daily Attendance Trend</h2></div>' +
        '<div class="card__body table-empty" style="padding: 40px 20px;">No attendance records found yet.</div>';
      return;
    }

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const chartData = dates.map(function (d) {
      const item = dateMap[d];
      const pct = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
      const parts = d.split("-");
      const shortDate = parseInt(parts[2], 10) + " " + months[parseInt(parts[1], 10) - 1];
      return { date: d, label: shortDate, pct: pct, present: item.present, total: item.total };
    });

    const svgWidth = 500;
    const svgHeight = 175;
    const padLeft = 38;
    const padRight = 16;
    const padTop = 22;
    const padBottom = 28;
    const chartW = svgWidth - padLeft - padRight;
    const chartH = svgHeight - padTop - padBottom;
    const barCount = chartData.length;
    const barWidth = Math.min(36, Math.floor((chartW / barCount) * 0.5));
    const step = chartW / barCount;

    // Grid lines
    let gridLines = "";
    [0, 25, 50, 75, 100].forEach(function (tick) {
      const y = padTop + chartH - (tick / 100) * chartH;
      gridLines +=
        '<line x1="' + padLeft + '" y1="' + y + '" x2="' + (svgWidth - padRight) + '" y2="' + y + '" stroke="var(--clr-border)" stroke-dasharray="' + (tick === 0 ? 'none' : '4,4') + '" />' +
        '<text x="' + (padLeft - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="9" fill="var(--clr-text-muted)">' + tick + '%</text>';
    });

    // Bars
    let barsHTML = "";
    chartData.forEach(function (item, i) {
      const cx = padLeft + i * step + step / 2;
      const x = cx - barWidth / 2;
      const bH = Math.max(4, (item.pct / 100) * chartH);
      const y = padTop + chartH - bH;
      const barColor = item.pct >= 75 ? "#10b981" : item.pct >= 50 ? "#f59e0b" : "#ef4444";

      barsHTML +=
        '<rect x="' + x + '" y="' + padTop + '" width="' + barWidth + '" height="' + chartH + '" rx="4" fill="var(--clr-surface-2)" />' +
        '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + bH + '" rx="4" fill="' + barColor + '">' +
          '<title>' + item.date + ': ' + item.pct + '% (' + item.present + '/' + item.total + ')</title>' +
        '</rect>' +
        '<text x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle" font-size="10" font-weight="600" fill="' + barColor + '">' + item.pct + '%</text>' +
        '<text x="' + cx + '" y="' + (padTop + chartH + 16) + '" text-anchor="middle" font-size="10" fill="var(--clr-text-secondary)">' + item.label + '</text>';
    });

    card.innerHTML =
      '<div class="card__header">' +
        '<div>' +
          '<h2 class="card__title">Daily Attendance Trend</h2>' +
          '<span style="font-size:0.75rem;color:var(--clr-text-muted);">Last ' + chartData.length + ' Recorded Days</span>' +
        '</div>' +
        '<span class="badge badge--primary">📈 Daily Graph</span>' +
      '</div>' +
      '<div class="card__body" style="padding: 16px 16px 8px;">' +
        '<svg viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" width="100%" height="' + svgHeight + '" style="overflow: visible;">' +
          gridLines +
          barsHTML +
        '</svg>' +
      '</div>';
  }

  // ── Daily Attendance Table ───────────────────────────────────
  function renderDailyAttendance() {
    const card = document.getElementById("daily-attendance-card");
    if (!card) return;

    const today = App.todayISO();
    const records = Store.getAttendanceByDate(today) || [];
    let rows = "";

    if (records.length === 0) {
      rows = '<tr><td colspan="5" class="table-empty">No attendance records for today.</td></tr>';
    } else {
      records.forEach(function (r) {
        const s = Store.getStudentById(r.studentId) || {};
        const name = s.name || "Unknown";
        const initial = name.charAt(0).toUpperCase();
        rows +=
          '<tr>' +
            '<td>' +
              '<div class="student-cell">' +
                '<span class="avatar">' + initial + '</span>' +
                '<span>' + App.esc(name) + '</span>' +
              '</div>' +
            '</td>' +
            '<td>' + App.esc(r.studentId) + '</td>' +
            '<td>' + App.esc(s.course ? s.course + (s.year ? " (" + s.year + ")" : "") : "—") + '</td>' +
            '<td>' + (r.time ? App.formatTime(r.time) : "—") + '</td>' +
            '<td>' + App.statusPillHTML(r.status) + '</td>' +
          '</tr>';
      });
    }

    card.innerHTML =
      '<div class="card__header">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<h2 class="card__title">Daily Student Attendance</h2>' +
          (records.length > 0 ? '<span class="badge" style="background:var(--clr-surface-2);color:var(--clr-text-secondary);">' + records.length + ' Recorded</span>' : '') +
        '</div>' +
        '<span class="badge badge--primary">' + App.formatDate(today) + '</span>' +
      '</div>' +
      '<div class="table-wrapper daily-attendance-scroll">' +
        '<table>' +
          '<thead><tr>' +
            '<th>Student Name</th><th>ID</th><th>Class</th><th>Time</th><th>Status</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  // ── Activity Feed ────────────────────────────────────────────
  function renderActivityFeed() {
    const el = document.getElementById("activity-feed");
    if (!el) return;

    const attendance = Store.getAttendance() || [];
    if (attendance.length === 0) {
      el.innerHTML = '<li class="table-empty">No activity data yet.</li>';
      return;
    }

    const sorted = attendance
      .map(function (record, index) { return { record: record, index: index }; })
      .sort(function (a, b) {
        var d = (b.record.date || "").localeCompare(a.record.date || "");
        if (d !== 0) return d;
        var t = (b.record.time || "").localeCompare(a.record.time || "");
        if (t !== 0) return t;
        return b.index - a.index;
      })
      .slice(0, 10);

    el.innerHTML = "";
    sorted.forEach(function (item) {
      var r = item.record;
      var student = Store.getStudentById(r.studentId);
      var name = student ? student.name : r.studentId || "Unknown";
      var status = r.status || "Present";
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="activity-dot activity-dot--' + status.toLowerCase() + '"></span>' +
        '<div style="flex:1;min-width:0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">' +
          '<div>' +
            '<span style="font-weight:600;">' + App.esc(name) + '</span>' +
            '<div style="font-size:0.78rem;color:var(--clr-text-muted);margin-top:2px;">' +
              App.formatDate(r.date) + (r.time ? " at " + App.formatTime(r.time) : "") +
            '</div>' +
          '</div>' +
          '<div>' + App.statusPillHTML(status) + '</div>' +
        '</div>';
      el.appendChild(li);
    });
  }

  // ── Student Dashboard ────────────────────────────────────────
  function renderStudentDashboard() {
    const session = Store.getSession();
    if (!session || !session.studentId) return;
    const student = Store.getStudentById(session.studentId);
    if (!student) return;

    const stats = Store.getStudentStats(student.id);
    const threshold = Store.getThreshold();
    const below = stats.pct !== null && stats.pct < threshold;
    const pageEl = document.querySelector(".page");
    if (!pageEl) return;

    const pctText = stats.pct !== null ? Math.round(stats.pct) + "%" : "N/A";
    const pctClass = App.pctBadgeClass(stats.pct);
    const r = 68, circ = 2 * Math.PI * r;
    const offset = circ - ((stats.pct || 0) / 100) * circ;
    const gaugeColor = (stats.pct || 0) >= 75 ? '#10b981' : (stats.pct || 0) >= 50 ? '#f59e0b' : '#ef4444';

    let html =
      '<div class="page-header">' +
        '<div><h1 class="page-title">My Dashboard</h1>' +
        '<p class="page-subtitle" id="dashboard-greeting"></p></div>' +
        '<span class="badge badge--primary">🎓 Student</span>' +
      '</div>' +

      // Stats
      '<div class="stats-grid">' +
        '<div class="stat-card">' +
          '<div class="stat-card__icon stat-card__icon--green">📊</div>' +
          '<div class="stat-card__info">' +
            '<div class="stat-card__value">' + pctText + '</div>' +
            '<div class="stat-card__label">Overall Attendance</div>' +
          '</div>' +
        '</div>' +
        '<div class="stat-card">' +
          '<div class="stat-card__icon stat-card__icon--green">✓</div>' +
          '<div class="stat-card__info">' +
            '<div class="stat-card__value">' + stats.present + '</div>' +
            '<div class="stat-card__label">Days Present</div>' +
          '</div>' +
        '</div>' +
        '<div class="stat-card">' +
          '<div class="stat-card__icon stat-card__icon--red">✗</div>' +
          '<div class="stat-card__info">' +
            '<div class="stat-card__value">' + stats.absent + '</div>' +
            '<div class="stat-card__label">Days Absent</div>' +
          '</div>' +
        '</div>' +
        '<div class="stat-card">' +
          '<div class="stat-card__icon stat-card__icon--amber">⏱</div>' +
          '<div class="stat-card__info">' +
            '<div class="stat-card__value">' + (stats.late + stats.leave) + '</div>' +
            '<div class="stat-card__label">Late / Leave</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Warning
    if (below) {
      html += '<div class="card" style="border-color:var(--clr-danger);margin-bottom:20px;">' +
        '<div class="card__body" style="display:flex;align-items:center;gap:12px;color:var(--clr-danger);">' +
          '<span style="font-size:1.3rem;">⚠️</span>' +
          '<span><strong>Low Attendance:</strong> Your attendance (' + pctText + ') is below the required ' + threshold + '% threshold.</span>' +
        '</div></div>';
    }

    // Profile + Gauge
    html += '<div class="dashboard-grid">' +
      '<div class="card">' +
        '<div class="card__header"><h2 class="card__title">Attendance</h2></div>' +
        '<div class="card__body gauge-wrapper">' +
          '<div class="gauge">' +
            '<svg width="180" height="180" viewBox="0 0 180 180">' +
              '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="var(--clr-border-strong)" stroke-width="14"></circle>' +
              '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + gaugeColor + '" stroke-width="14" ' +
                'stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" stroke-linecap="round" transform="rotate(-90 90 90)"></circle>' +
            '</svg>' +
            '<div class="gauge__label"><span class="gauge__pct">' + pctText + '</span><span class="gauge__text">Attendance</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__header"><h2 class="card__title">Personal Information</h2></div>' +
        '<div class="card__body">' +
          '<div class="info-grid">' +
            infoRow("Name", student.name) + infoRow("Student ID", student.id) +
            infoRow("Course", student.course) + infoRow("Year", student.year) +
            infoRow("Department", student.department) + infoRow("Batch", student.batch) +
            infoRow("DOB", student.dob ? App.formatDate(student.dob) : "—") +
            infoRow("Gender", student.gender) + infoRow("Mobile", student.mobile) +
            infoRow("Email", student.email) +
            infoRow("Father", student.fatherName) + infoRow("Mother", student.motherName) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    // Attendance history
    html += '<div class="card">' +
      '<div class="card__header"><h2 class="card__title">Attendance History</h2></div>' +
      '<div class="table-wrapper">' +
        '<table><thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>' +
        '<tbody id="student-attendance-history"></tbody></table>' +
      '</div>' +
      '<div id="no-history" class="table-empty" style="display:none;">No attendance records yet.</div>' +
    '</div>';

    pageEl.innerHTML = html;
    updateGreeting();

    // Populate history
    const records = Store.getAttendanceByStudent(student.id)
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    const tbody = document.getElementById("student-attendance-history");
    const noHist = document.getElementById("no-history");
    if (records.length === 0) {
      noHist.style.display = "block";
    } else {
      var rhtml = "";
      records.slice(0, 30).forEach(function (rec) {
        rhtml += '<tr><td>' + App.formatDate(rec.date) + '</td>' +
          '<td>' + App.statusPillHTML(rec.status) + '</td>' +
          '<td>' + App.esc(rec.remarks || "—") + '</td></tr>';
      });
      tbody.innerHTML = rhtml;
    }
  }

  function infoRow(label, val) {
    return '<div class="info-item">' +
      '<span class="info-label">' + App.esc(label) + '</span>' +
      '<span class="info-value">' + App.esc(val || "—") + '</span>' +
    '</div>';
  }

  // ── Init ─────────────────────────────────────────────────────
  function initDashboard() {
    const session = Store.getSession();
    if (session && session.role === "student" && session.studentId) {
      renderStudentDashboard();
      return;
    }
    updateGreeting();
    renderStats();
    renderGauge();
    renderTrendChart();
    renderDailyAttendance();
    renderActivityFeed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }
  window.addEventListener("pageshow", initDashboard);
})();
