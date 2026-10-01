/* Shared site logic: listings data, rendering helpers, lead forms. */
(function () {
  const C = window.SITE_CONFIG || {};

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const price = (n) => (typeof n === "number" ? "$" + n.toLocaleString("en-US") : esc(n || "Price upon request"));
  const num = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : esc(n || ""));
  const statusSlug = (s) => String(s || "").toLowerCase().replace(/\s+/g, "-");
  const place = (l) => [l.neighborhood, l.city].filter(Boolean).join(" · ");
  const fullAddress = (l) => `${l.address}, ${l.city}, ${l.state || "LA"} ${l.zip || ""}`.trim();

  async function loadListings() {
    const res = await fetch("data/listings.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load listings");
    return res.json();
  }

  function cardHTML(l) {
    const photo = (l.photos && l.photos[0]) || "assets/img/listings/sample-1.svg";
    return `
      <a class="card reveal" href="listing.html?id=${encodeURIComponent(l.id)}" data-status="${esc(l.status)}">
        <div class="card__media">
          <img src="${esc(photo)}" alt="${esc(l.address)}" loading="lazy">
          <span class="badge badge--${statusSlug(l.status)}">${esc(l.status)}</span>
          ${l.sample ? '<span class="sample-tag">Sample</span>' : ""}
        </div>
        <div class="card__body">
          <div class="card__price">${price(l.price)}</div>
          <div class="card__address">${esc(l.address)}</div>
          <div class="card__place">${esc(place(l))}</div>
          <div class="card__stats">
            ${l.beds ? `<span>${num(l.beds)} Beds</span>` : ""}
            ${l.baths ? `<span>${num(l.baths)} Baths</span>` : ""}
            ${l.sqft ? `<span>${num(l.sqft)} Sq Ft</span>` : ""}
          </div>
          <div class="card__cta">View Home <span aria-hidden="true">→</span></div>
        </div>
      </a>`;
  }

  /* ---------- Fill contact details everywhere ---------- */
  function fillContact() {
    const tel = "tel:" + String(C.phone || "").replace(/[^\d+]/g, "");
    document.querySelectorAll("[data-c]").forEach((el) => {
      const key = el.getAttribute("data-c");
      if (C[key]) el.textContent = C[key];
    });
    document.querySelectorAll("[data-tel]").forEach((el) => (el.href = tel));
    document.querySelectorAll("[data-mailto]").forEach((el) => (el.href = "mailto:" + C.email));
    document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

    // Louisiana rule: the licensing line shows the brokerage's office phone
    if (C.brokerPhone) {
      document.querySelectorAll(".footer__license [data-tel]").forEach((el) => {
        el.href = "tel:" + String(C.brokerPhone).replace(/[^\d+]/g, "");
        el.textContent = C.brokerPhone;
      });
    }

    // Compass logo in the footer (stays hidden until a logo file is set)
    if (C.compassLogo) {
      document.querySelectorAll(".footer__compass").forEach((a) => {
        const img = a.querySelector("img");
        img.onload = () => { a.hidden = false; };
        img.src = C.compassLogo;
      });
    }

    // Logo: shown in white on the periwinkle header, hero and footer
    if (C.logo) {
      document.querySelectorAll(".brand, .footer__name").forEach((el) => {
        const url = `url('${esc(C.logo)}')`;
        el.innerHTML = `<span class="logo logo--light" role="img" aria-label="${esc(C.agentName)} Real Estate" style="-webkit-mask-image:${url};mask-image:${url}"></span>`;
      });
    }
  }

  /* ---------- Lead forms ---------- */
  function wireForms() {
    document.querySelectorAll("form[data-lead]:not([data-wired])").forEach((form) => {
      form.setAttribute("data-wired", "");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const status = form.querySelector(".form__status");
        const btn = form.querySelector("button[type=submit]");
        const data = new FormData(form);

        if (data.get("company_website")) return; // spam trap
        status.className = "form__status";

        if (!data.get("email") && !data.get("phone")) {
          status.textContent = "Please share an email or phone number so I can reach you.";
          status.classList.add("is-error");
          return;
        }
        if (!C.leadEndpoint) {
          status.textContent = `The form isn't connected yet. Please call ${C.phone} or email ${C.email}.`;
          status.classList.add("is-error");
          return;
        }

        data.append("submitted_from", window.location.href);
        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = "Sending…";
        try {
          await fetch(C.leadEndpoint, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) });
          form.reset();
          form.querySelectorAll(".field, .form__note, .form__consent, button[type=submit]").forEach((el) => (el.style.display = "none"));
          status.textContent = "Thank you. I'll be in touch shortly.";
        } catch (err) {
          status.textContent = `Something went wrong. Please call ${C.phone} or email ${C.email}.`;
          status.classList.add("is-error");
        } finally {
          btn.disabled = false;
          btn.textContent = label;
        }
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function wireReveal(root = document) {
    const els = root.querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Header: solid on scroll, mobile menu ---------- */
  function wireNav() {
    const header = document.querySelector(".site-header");
    const nav = header && header.querySelector(".nav");
    if (!nav || header.querySelector(".nav-toggle")) return;
    nav.id = "site-nav";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-toggle";
    btn.setAttribute("aria-controls", "site-nav");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="nav-toggle__bars" aria-hidden="true"></span><span>Menu</span>';
    nav.before(btn);
    const setOpen = (open) => { header.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => setOpen(!header.classList.contains("is-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

    if (!header.classList.contains("site-header--solid")) {
      const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  window.Site = { C, esc, price, num, place, fullAddress, statusSlug, loadListings, cardHTML, wireReveal };

  document.addEventListener("DOMContentLoaded", () => { fillContact(); wireNav(); wireForms(); wireReveal(); });
  document.addEventListener("site:forms", () => { fillContact(); wireForms(); });
})();
