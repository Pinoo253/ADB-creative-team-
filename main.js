(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const cfg = window.ADB_CONFIG || {};
  const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  window.adbSupabase = client;
  const toast = message => {
    const el = $("#toast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    window.setTimeout(() => el.classList.remove("show"), 3200);
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl = value => { try { const u = new URL(value, location.href); return ["http:","https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };
  const formatDate = value => value ? new Date(value).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"}) : "";
  if ($("#year")) $("#year").textContent = new Date().getFullYear();

  const menu = $(".menu-toggle"), nav = $(".nav");
  if (menu && nav) {
    menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); }));
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }), {threshold:.12});
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  } else document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));

  const ytId = value => { try { const u = new URL(value); const h = u.hostname.replace(/^www\./,""); let id = ""; if (h==="youtu.be") id = u.pathname.slice(1); else if (h==="youtube.com"||h==="m.youtube.com"||h==="music.youtube.com") id = u.pathname.startsWith("/watch") ? (u.searchParams.get("v")||"") : (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)||[])[1]||""; return /^[\w-]{11}$/.test(id) ? id : ""; } catch { return ""; } };
  function openVideo(id) {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.88);display:flex;align-items:center;justify-content:center;padding:16px";
    box.innerHTML = `<div style="position:relative;width:min(900px,100%)"><button type="button" aria-label="Tutup" style="position:absolute;right:0;top:-44px;background:#fff;border:0;border-radius:999px;width:36px;height:36px;font-size:20px;cursor:pointer">×</button><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Video YouTube" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:16px;background:#000"></iframe></div>`;
    const close = () => { box.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape") close(); };
    box.addEventListener("click", e => { if (e.target === box || e.target.tagName === "BUTTON") close(); });
    document.addEventListener("keydown", onKey); document.body.appendChild(box);
  }
  document.addEventListener("click", e => { const t = e.target.closest("[data-yt]"); if (t) { e.preventDefault(); openVideo(t.dataset.yt); } });

  function cardMarkup(item) {
    const url = safeUrl(item.media_url);
    let media = "";
    const yt = ytId(url);
    if (yt) media = `<a href="${escapeHtml(url)}" data-yt="${yt}" class="cms-media" style="display:block;position:relative"><img class="cms-media" src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="${escapeHtml(item.title)}" loading="lazy"><span style="position:absolute;inset:0;margin:auto;width:56px;height:56px;border-radius:50%;background:rgba(37,99,235,.92);color:#fff;display:grid;place-items:center;font-size:22px">▶</span></a>`;
    else if (url && item.media_type === "video") media = `<video class="cms-media" controls preload="metadata"><source src="${escapeHtml(url)}"></video>`;
    else if (url) media = `<img class="cms-media" src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    const date = formatDate(item.event_date);
    return `<article class="cms-card">${media}<div class="cms-card-body">${date ? `<small class="cms-date">${date}</small>` : ""}<h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${item.body ? `<details><summary>Baca selengkapnya</summary><p>${escapeHtml(item.body)}</p></details>` : ""}${item.location ? `<small class="cms-location">${escapeHtml(item.location)}</small>` : ""}</div></article>`;
  }
  async function loadCmsContent() {
    const targets = {berita:"#news-list",pencapaian:"#achievements-list",agenda:"#agenda-list",pengumuman:"#announcements-list"};
    if (!client) { document.querySelectorAll(".cms-grid").forEach(el => el.innerHTML = '<p class="data-note">Konten akan tampil setelah koneksi Supabase aktif.</p>'); return; }
    const {data,error} = await client.from("content_items").select("id,category,title,description,body,media_url,media_type,event_date,location,created_at").eq("is_published",true).order("created_at",{ascending:false}).limit(100);
    if (error) { console.error("Supabase CMS:",error.message); document.querySelectorAll(".cms-grid").forEach(el => el.innerHTML = '<p class="data-note">Konten belum dapat dimuat. Periksa schema dan koneksi Supabase.</p>'); return; }
    Object.entries(targets).forEach(([category,selector]) => { const el = $(selector); if (!el) return; const items = (data||[]).filter(x=>x.category===category); el.innerHTML = items.length ? items.map(cardMarkup).join("") : '<p class="data-note">Belum ada konten yang diterbitkan.</p>'; });
    const gallery = (data||[]).filter(x=>["foto","video"].includes(x.category)).slice(0,6), target = $("#gallery-list");
    if (target && gallery.length) target.innerHTML = gallery.map((item,i) => { const url=safeUrl(item.media_url); const yt=ytId(url); const media=yt ? `<img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="${escapeHtml(item.title)}" loading="lazy"><i style="position:absolute;inset:0;margin:auto;width:56px;height:56px;border-radius:50%;background:rgba(37,99,235,.92);display:grid;place-items:center;font-style:normal;font-size:22px;z-index:1">▶</i>` : item.media_type==="video" ? `<video src="${escapeHtml(url)}" muted playsinline preload="metadata"></video>` : `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}" loading="lazy">`; return `<a class="gallery-tile cms-gallery-tile" ${yt?`data-yt="${yt}" `:""}href="${escapeHtml(url||"#")}" target="_blank" rel="noopener noreferrer">${media}<span>${String(i+1).padStart(2,"0")} / ${item.media_type==="video"?"VIDEO":"PHOTO"}</span><b>${escapeHtml(item.title)}</b></a>`; }).join("");
  }
  async function loadLegacyContent() {
    if (!client) return;
    try {
      const {data:profile} = await client.from("profiles").select("description").eq("id",1).maybeSingle();
      if (profile?.description && $("#profile-description")) $("#profile-description").textContent=profile.description;
      const {data:projects,error:pe}=await client.from("projects").select("id,title,description,creator,published_at,image_url").order("published_at",{ascending:false}).limit(6);
      if (!pe && projects?.length && $("#project-list")) $("#project-list").innerHTML=projects.map((p,i)=>{const img=safeUrl(p.image_url);return `<article class="project-card"><div class="project-visual ${["visual-blue","visual-lilac","visual-dark"][i%3]}">${img?`<img class="project-photo" src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}" loading="lazy">`:""}<span class="visual-label">${String(i+1).padStart(2,"0")} / ADB PROJECT</span><div class="motion-title">${escapeHtml(p.title)}</div></div><div class="project-info"><div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.creator||p.description||"ADB Creative Team")}</p></div><span>↗</span></div></article>`;}).join("");
      const {data:acts,error:ae}=await client.from("activities").select("id,title,date,description,location").order("date",{ascending:false}).limit(6);
      if (!ae && acts?.length && $("#activity-list")) $("#activity-list").innerHTML=acts.map((a,i)=>`<article><span class="activity-number">${String(i+1).padStart(2,"0")}</span><div><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.description||a.location||"")}</p></div><span class="activity-arrow">↗</span></article>`).join("");
    } catch(e) { console.warn("Konten lama:",e); }
  }
  const feedbackForm=$("#feedback-form");
  if (feedbackForm) feedbackForm.addEventListener("submit",async e=>{
    e.preventDefault(); const form=e.currentTarget,button=form.querySelector('button[type="submit"]'),status=$("#form-status");
    if(!client){toast("Supabase belum dikonfigurasi.");if(status)status.textContent="Database belum terhubung.";return;}
    const fd=new FormData(form),payload={name:String(fd.get("name")||"").trim(),type:String(fd.get("type")||"Saran"),message:String(fd.get("message")||"").trim()};
    button.disabled=true;
    try{const {error}=await client.from("feedback").insert(payload);if(error)throw error;form.reset();if(status)status.textContent="Pesan berhasil dikirim.";toast("Terima kasih! Pesan berhasil dikirim.");}
    catch(err){console.error(err);if(status)status.textContent="Pesan belum terkirim.";toast(err.message||"Gagal mengirim pesan.");}
    finally{button.disabled=false;}
  });

  const MAIL_TO="dokumentasi@smkn1adw.sch.id";
  const mailBtn=$("#send-email");
  if (mailBtn && feedbackForm) mailBtn.addEventListener("click",()=>{
    if(!feedbackForm.reportValidity()) return;
    const fd=new FormData(feedbackForm), type=String(fd.get("type")||"Saran"), name=String(fd.get("name")||"").trim(), msg=String(fd.get("message")||"").trim();
    const subject=`${type} untuk ADB Creative Team`;
    const body=`Nama: ${name}\nJenis: ${type}\n\n${msg}`;
    location.href=`mailto:${MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Membuka aplikasi email Anda...");
  });
  loadCmsContent(); loadLegacyContent();
})();
