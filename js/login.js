/* ============================================================
   login.js — Login Page Controller
   ============================================================ */
(function () {
  "use strict";

  // If already logged in, redirect to dashboard
  if (Store.isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  var form = document.getElementById("login-form");
  var usernameInput = document.getElementById("inp-username");
  var passwordInput = document.getElementById("inp-password");
  var errorEl = document.getElementById("login-error");

  // Form submission
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var username = usernameInput.value.trim();
    var password = passwordInput.value.trim();
    var role = document.querySelector('input[name="role"]:checked').value;

    if (!username || !password) {
      showError("Please enter both username and password.");
      return;
    }

    var result = Store.login(username, password);

    if (!result.ok) {
      showError(result.error);
      passwordInput.value = "";
      passwordInput.focus();
      return;
    }

    // Verify role matches
    if (result.session.role !== role) {
      Store.logout();
      showError("This account does not have " + role.charAt(0).toUpperCase() + role.slice(1) + " access. Please select the correct role.");
      return;
    }

    // Success — redirect to dashboard
    window.location.href = "index.html";
  });

  // Demo account chips — click to auto-fill
  document.querySelectorAll(".demo-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      usernameInput.value = chip.dataset.user;
      passwordInput.value = chip.dataset.pass;

      // Select the matching role radio
      var roleRadio = document.getElementById("role-" + chip.dataset.role);
      if (roleRadio) roleRadio.checked = true;

      hideError();
      usernameInput.focus();
    });
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("visible");
  }

  function hideError() {
    errorEl.classList.remove("visible");
  }

  // Clear error on typing
  usernameInput.addEventListener("input", hideError);
  passwordInput.addEventListener("input", hideError);
})();
