// Review carousel in the Meet Isabelle section: arrows, swipe, and a "1–2 of 7" counter
(function () {
  document.querySelectorAll(".reviews").forEach((box) => {
    const track = box.querySelector(".reviews__track");
    const items = [...track.children];
    const prev = box.querySelector(".reviews__prev");
    const next = box.querySelector(".reviews__next");
    const count = box.querySelector(".reviews__count");
    if (items.length < 2) { box.querySelector(".reviews__nav").hidden = true; return; }

    const step = () => items[1].offsetLeft - items[0].offsetLeft;
    const perView = () => Math.max(1, Math.round(track.clientWidth / step()));
    const first = () => Math.round(track.scrollLeft / step());

    function update() {
      const f = Math.min(first(), items.length - 1), n = perView();
      const last = Math.min(items.length, f + n);
      count.textContent = n > 1 && last > f + 1 ? `${f + 1}–${last} of ${items.length}` : `${f + 1} of ${items.length}`;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      // Fit the height to the reviews showing so the arrows sit right under them
      const tallest = Math.max(...items.slice(f, last).map((x) => x.offsetHeight));
      track.style.height = tallest + 28 + "px";
    }
    // Move a full page at a time (2 on desktop, 1 on phones)
    function go(dir) {
      const n = perView(), f = first();
      const to = dir > 0 ? (Math.floor(f / n) + 1) * n : Math.max(0, Math.floor((f - 1) / n) * n);
      track.scrollTo({ left: Math.min(to, items.length - 1) * step() });
    }

    prev.addEventListener("click", () => go(-1));
    next.addEventListener("click", () => go(1));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    let t; track.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
