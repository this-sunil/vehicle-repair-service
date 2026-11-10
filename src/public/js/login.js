/* Login page */
(function () {
  "use strict";

  const form = document.getElementById("login-form");
  if (!form) return;

  const toggle = document.getElementById("toggle-pass");
  if (toggle)
    toggle.addEventListener("click", () => {
      const input = document.getElementById("pass");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.innerHTML = '<i class="bi ' + (show ? "bi-eye-slash" : "bi-eye") + '"></i>';
    });

  function setError(field, msg) {
    const el = document.querySelector('[data-error-for="' + field + '"]');
    if (el) { el.textContent = msg || ""; el.classList.toggle("hidden", !msg); }
    const input = document.getElementById(field);
    if (input) input.classList.toggle("input-error", !!msg);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = document.getElementById("phone").value.trim();
    const pass = document.getElementById("pass").value;
    let bad = false;

    setError("phone", ""); setError("pass", "");
    if (!/^\d{6,15}$/.test(phone.replace(/\s+/g, ""))) { setError("phone", "Enter a valid phone number"); bad = true; }
    if (pass.length < 4) { setError("pass", "Enter your password"); bad = true; }
    if (bad) return;

    const btn = document.getElementById("login-btn");
    const busy = () => {
      btn.disabled = true;
      btn.querySelectorAll(".btn-label").forEach((x) => x.classList.add("hidden"));
      btn.querySelector(".animate-spin").classList.remove("hidden");
    };
    const idle = () => {
      btn.disabled = false;
      btn.querySelectorAll(".btn-label").forEach((x) => x.classList.remove("hidden"));
      btn.querySelector(".animate-spin").classList.add("hidden");
    };

    busy();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\s+/g, ""), pass }),
      });
      const data = await res.json().catch(() => null);
      idle();

      if (data && data.status && data.token) {
        VS.session.set(data.token, data.result || {});
        VS.toast("Welcome back, " + ((data.result && data.result.name) || "Admin") + "!", "success");
        setTimeout(() => (window.location.href = "/dashboard"), 500);
      } else {
        VS.toast((data && data.msg) || "Login failed", "error");
        setError("pass", (data && data.msg) || "Login failed");
      }
    } catch (err) {
      idle();
      VS.toast("Network error — please try again", "error");
    }
  });
})();
