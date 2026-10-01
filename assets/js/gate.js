/*
  Registration gate for listing pages.
  Visitors see the main photo, then register (Google, Facebook, or the form)
  to unlock the rest. Registrations go to the same Google Sheet as other leads.
  Turn the Google / Facebook buttons on by adding googleClientId and
  facebookAppId in assets/js/config.js.
*/
(function () {
  const C = window.SITE_CONFIG || {};
  const KEY = "ib_registered";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function remember(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  // Pre-fill other forms on the page for registered visitors
  function prefill(v) {
    if (!v) return;
    document.querySelectorAll("form[data-lead]").forEach((f) => {
      ["name", "email", "phone"].forEach((k) => {
        const el = f.querySelector(`[name="${k}"]`);
        if (el && !el.value) el.value = v[k] || "";
      });
    });
  }

  const digits = (s) => String(s || "").replace(/\D/g, "");
  function formatPhone(s) {
    let d = digits(s);
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length !== 10) return s;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  const validPhone = (s) => { const d = digits(s); return d.length === 10 || (d.length === 11 && d[0] === "1"); };
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.defer = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function decodeJwt(token) {
    try {
      const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(atob(part).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
      return JSON.parse(json);
    } catch (e) { return {}; }
  }

  function protect(listing, photoCount) {
    const already = saved();
    if (already) { prefill(already); return; }

    document.body.classList.add("is-gated");
    const property = `${listing.address}, ${listing.city}, ${listing.state || "LA"} ${listing.zip || ""}`.trim();
    const hasGoogle = !!C.googleClientId, hasFacebook = !!C.facebookAppId;

    const modal = document.createElement("div");
    modal.className = "gate";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "gate-title");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="gate__panel">
        <p class="eyebrow">Private Access</p>
        <h2 id="gate-title">See the full listing</h2>
        <p class="gate__lede">View photos and property details.</p>
        ${hasGoogle || hasFacebook ? `
        <div class="gate__social">
          ${hasGoogle ? '<div class="gate__google" id="gate-google"></div>' : ""}
          ${hasFacebook ? '<button type="button" class="gate__fb" id="gate-fb"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.69 4.54-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>Continue with Facebook</button>' : ""}
        </div>
        <div class="gate__or"><span>or enter your details</span></div>` : ""}
        <form class="gate__form" novalidate>
          <p class="gate__hint" hidden></p>
          <div class="field"><label for="g-name">Full name</label><input id="g-name" name="name" required autocomplete="name"></div>
          <div class="field"><label for="g-email">Email</label><input id="g-email" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label for="g-phone">Phone</label><input id="g-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="(337) 555-0123"></div>
          <div class="hp" aria-hidden="true"><label>Website <input name="company_website" tabindex="-1" autocomplete="off"></label></div>
          <button class="btn gate__submit" type="submit">View This Home</button>
          <p class="gate__error" role="alert"></p>
          <p class="form__consent">By registering, you agree that Isabelle Beaullieu may contact you by phone, text, or email about this and similar properties. Message and data rates may apply. Consent is not a condition of any purchase. See our <a href="privacy" target="_blank" rel="noopener">Privacy Policy</a>.</p>
        </form>
        <a class="gate__back" href="./#listings">← Back to all listings</a>
      </div>`;
    document.body.appendChild(modal);

    const form = modal.querySelector("form");
    const hint = modal.querySelector(".gate__hint");
    const err = modal.querySelector(".gate__error");
    const f = (n) => form.querySelector(`[name="${n}"]`);
    let method = "Form";

    function open() {
      if (!modal.hidden) return;
      modal.hidden = false;
      const panel = modal.querySelector(".gate__panel"); panel.setAttribute("tabindex", "-1"); panel.focus({ preventScroll: true });
      document.body.classList.add("gate-open");
      requestAnimationFrame(() => modal.classList.add("is-in"));
      if (renderGoogle) renderGoogle();
    }
    let renderGoogle = null;

    function fillFromSocial(name, email, source) {
      method = source;
      if (name) f("name").value = name;
      if (email) f("email").value = email;
      err.textContent = "";
      hint.hidden = false;
      hint.textContent = `Thanks${name ? ", " + name.split(" ")[0] : ""}! Just add your phone number to finish.`;
      (f("name").value ? (f("email").value ? f("phone") : f("email")) : f("name")).focus();
    }

    // Show the main photo first, then ask. Any attempt to see more opens it right away.
    setTimeout(open, 1800);
    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("is-gated")) return;
      if (e.target.closest(".gallery button, .hood__grid button, .mobile-cta, .detail, .hood")) {
        e.preventDefault(); e.stopPropagation(); open();
      }
    }, true);

    f("phone").addEventListener("blur", () => { if (validPhone(f("phone").value)) f("phone").value = formatPhone(f("phone").value); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (f("company_website").value) return;
      const v = { name: f("name").value.trim(), email: f("email").value.trim(), phone: f("phone").value.trim() };
      form.querySelectorAll(".field").forEach((x) => x.classList.remove("is-invalid"));
      const bad = [];
      if (v.name.length < 2) bad.push("name");
      if (!validEmail(v.email)) bad.push("email");
      if (!validPhone(v.phone)) bad.push("phone");
      if (bad.length) {
        bad.forEach((k) => f(k).closest(".field").classList.add("is-invalid"));
        err.textContent = bad.length === 3 ? "Please fill in your name, email, and phone number."
          : `Please enter a valid ${bad.map((k) => (k === "name" ? "full name" : k === "email" ? "email address" : "10-digit phone number")).join(" and ")}.`;
        f(bad[0]).focus();
        return;
      }
      v.phone = formatPhone(v.phone);
      const btn = form.querySelector(".gate__submit");
      btn.disabled = true; btn.textContent = "Opening…";
      if (C.leadEndpoint) {
        const data = new URLSearchParams({
          name: v.name, email: v.email, phone: v.phone,
          property, listing_id: listing.id || "", mls: listing.mls || "",
          message: `Registered to view this listing (signed up with ${method}).`,
          submitted_from: window.location.href
        });
        try { await fetch(C.leadEndpoint, { method: "POST", mode: "no-cors", body: data }); } catch (x) {}
      }
      remember({ ...v, at: new Date().toISOString() });
      document.body.classList.remove("is-gated", "gate-open");
      modal.classList.remove("is-in");
      setTimeout(() => modal.remove(), 250);
      prefill(v);
    });

    // Google: Sign in with Google (name + email)
    if (hasGoogle) {
      loadScript("https://accounts.google.com/gsi/client").then(() => {
        google.accounts.id.initialize({
          client_id: C.googleClientId,
          callback: (res) => { const p = decodeJwt(res.credential); fillFromSocial(p.name, p.email, "Google"); },
          ux_mode: "popup"
        });
        // Draw the button once the popup is visible so it can match the popup's width
        renderGoogle = () => {
          const box = modal.querySelector("#gate-google");
          if (!box || box.childElementCount || modal.hidden) return;
          google.accounts.id.renderButton(box, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", logo_alignment: "center", width: Math.max(200, Math.min(box.clientWidth || 320, 400)) });
        };
        renderGoogle();
      }).catch(() => { const b = modal.querySelector("#gate-google"); if (b) b.remove(); });
    }

    // Facebook: Facebook Login (name + email)
    if (hasFacebook) {
      const fbBtn = modal.querySelector("#gate-fb");
      fbBtn.disabled = true;
      window.fbAsyncInit = function () {
        FB.init({ appId: C.facebookAppId, cookie: false, xfbml: false, version: "v21.0" });
        fbBtn.disabled = false;
      };
      loadScript("https://connect.facebook.net/en_US/sdk.js").catch(() => fbBtn.remove());
      fbBtn.addEventListener("click", () => {
        if (!window.FB) return;
        FB.login((res) => {
          if (!res.authResponse) return;
          FB.api("/me", { fields: "name,email" }, (me) => fillFromSocial(me && me.name, me && me.email, "Facebook"));
        }, { scope: "public_profile,email" });
      });
    }
  }

  window.Gate = { protect };
})();
