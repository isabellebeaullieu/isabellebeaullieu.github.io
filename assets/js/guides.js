/*
  Buyer's / Seller's Guide pages.
  Visitors enter name, email, and phone to download the guide. Each sign-up goes to
  the separate "Guide Leads" Google Sheet (guideLeadEndpoint in config.js), marked
  as a Buyer or Seller lead.
*/
(function () {
  const C = window.SITE_CONFIG || {};
  const page = document.querySelector(".guide-page");
  if (!page) return;

  const leadType = page.dataset.leadType;          // "Buyer" or "Seller"
  const guideName = page.dataset.guideName;        // "Buyer’s Guide"
  const slug = page.dataset.guide;                 // "buyers-guide"
  const pdf = page.dataset.pdf;
  const box = document.getElementById("get-guide");
  const ask = box.querySelector(".guide-form__ask");
  const done = box.querySelector(".guide-form__done");
  const form = box.querySelector("form");
  const err = box.querySelector(".guide-form__error");
  const f = (n) => form.querySelector(`[name="${n}"]`);

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const digits = (s) => String(s || "").replace(/\D/g, "");
  const validPhone = (s) => { const d = digits(s); return d.length === 10 || (d.length === 11 && d[0] === "1"); };
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
  function formatPhone(s) {
    let d = digits(s);
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : s;
  }

  function showDone(name, startDownload) {
    const first = String(name || "").trim().split(/\s+/)[0];
    box.querySelector(".guide-form__thanks").textContent = first ? `Thank you, ${first}!` : "Thank you!";
    ask.hidden = true;
    done.hidden = false;
    if (startDownload) {
      const a = document.createElement("a");
      a.href = pdf; a.download = ""; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
    }
  }

  // Visitors who already downloaded this guide on this device go straight to the button
  const got = read("ib_guides") || {};
  if (got[slug]) showDone(got[slug].name, false);

  // Pre-fill from an earlier sign-up (guide or listing)
  const known = read("ib_registered");
  if (known) ["name", "email", "phone"].forEach((k) => { if (!f(k).value) f(k).value = known[k] || ""; });

  f("phone").addEventListener("blur", () => { if (validPhone(f("phone").value)) f("phone").value = formatPhone(f("phone").value); });

  // "Get the Free Guide" buttons scroll to the form
  document.querySelectorAll("[data-scroll-form]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!ask.hidden) setTimeout(() => f("name").focus({ preventScroll: true }), 400);
  }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (f("company_website").value) return; // spam trap
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
    if (!C.guideLeadEndpoint) {
      err.textContent = `Downloads aren't connected yet. Please call ${C.phone} or email ${C.email} and I'll send the guide.`;
      return;
    }
    err.textContent = "";
    v.phone = formatPhone(v.phone);
    const btn = form.querySelector(".guide-form__submit");
    btn.disabled = true;
    btn.textContent = "Getting your guide…";
    try {
      await fetch(C.guideLeadEndpoint, {
        method: "POST", mode: "no-cors",
        body: new URLSearchParams({
          lead_type: leadType, guide: guideName,
          name: v.name, email: v.email, phone: v.phone,
          submitted_from: window.location.href
        })
      });
    } catch (x) {}
    got[slug] = { name: v.name, at: new Date().toISOString() };
    write("ib_guides", got);
    if (!known) write("ib_registered", { ...v, at: new Date().toISOString() });
    showDone(v.name, true);
  });
})();
