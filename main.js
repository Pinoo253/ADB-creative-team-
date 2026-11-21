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

  const parseSocial = value => { try { const u = new URL(value); const h = u.hostname.replace(/^www\./,"").replace(/^m\./,""); let m;
    if (h==="youtu.be" || h==="youtube.com" || h==="music.youtube.com") { let id = h==="youtu.be" ? u.pathname.slice(1) : u.pathname.startsWith("/watch") ? (u.searchParams.get("v")||"") : ((u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)||[])[1]||""); id = id.slice(0,11); if (/^[\w-]{11}$/.test(id)) return {platform:"youtube",label:"YouTube",id,embed:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,thumb:`https://img.youtube.com/vi/${id}/hqdefault.jpg`,ratio:"16/9"}; }
    if (h==="tiktok.com" && (m = u.pathname.match(/\/video\/(\d{8,25})/))) return {platform:"tiktok",label:"TikTok",id:m[1],embed:`https://www.tiktok.com/embed/v2/${m[1]}`,thumb:"",ratio:"9/16"};
    if (h==="instagram.com" && (m = u.pathname.match(/\/(p|reel|reels|tv)\/([\w-]+)/))) { const kind = m[1]==="reels" ? "reel" : m[1]; return {platform:"instagram",label:"Instagram",id:m[2],embed:`https://www.instagram.com/${kind}/${m[2]}/embed/captioned/`,thumb:"",ratio:"9/16"}; }
  } catch {} return null; };
  const socialItems = new Map();
  function openSocial(item) {
    const sp = parseSocial(item.media_url); if (!sp) return;
    const tall = sp.ratio !== "16/9";
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.88);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
    const frame = tall
      ? `<iframe src="${escapeHtml(sp.embed)}" title="${escapeHtml(sp.label)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen scrolling="no" style="width:100%;height:min(72vh,720px);border:0;border-radius:16px;background:#fff"></iframe>`
      : `<iframe src="${escapeHtml(sp.embed)}" title="${escapeHtml(sp.label)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:16px;background:#000"></iframe>`;
    box.innerHTML = `<div style="position:relative;width:min(${tall?"400px":"900px"},100%);background:#fff;border-radius:18px;padding:12px 12px 16px"><button type="button" aria-label="Tutup" style="position:absolute;right:-4px;top:-46px;background:#fff;border:0;border-radius:999px;width:36px;height:36px;font-size:20px;cursor:pointer">×</button>${frame}<div style="padding:12px 6px 0;color:#17233b"><b style="display:block;font:800 15px/1.4 Manrope,sans-serif;overflow-wrap:anywhere">${escapeHtml(item.title)}</b>${item.description?`<p style="margin:6px 0 0;font-size:13px;line-height:1.7;color:#45536c;overflow-wrap:anywhere;white-space:pre-line">${escapeHtml(item.description)}</p>`:""}<a href="${escapeHtml(item.media_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:10px;font-size:12px;font-weight:700;color:#2563eb">Buka di ${escapeHtml(sp.label)} ↗</a></div></div>`;
    const close = () => { box.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape") close(); };
    box.addEventListener("click", e => { if (e.target === box || e.target.tagName === "BUTTON") close(); });
    document.addEventListener("keydown", onKey); document.body.appendChild(box);
  }
  document.addEventListener("click", e => { const t = e.target.closest("[data-social]"); if (t) { e.preventDefault(); const item = socialItems.get(t.dataset.social); if (item) openSocial(item); } });
  const socialCover = (sp, title) => sp.thumb
    ? `<img src="${sp.thumb}" alt="${escapeHtml(title)}" loading="lazy">`
    : `<div style="position:absolute;inset:0;background:${sp.platform==="tiktok"?"linear-gradient(135deg,#0f172a,#1e3a8a)":"linear-gradient(135deg,#2563eb,#7c3aed 55%,#db2777)"}"></div>`;
  const playBadge = sp => `<i style="position:absolute;inset:0;margin:auto;width:56px;height:56px;border-radius:50%;background:rgba(37,99,235,.92);display:grid;place-items:center;font-style:normal;font-size:22px;color:#fff;z-index:1">▶</i>`;

  function cardMarkup(item) {
    const url = safeUrl(item.media_url);
    let media = "";
    const sp = parseSocial(url);
    if (sp) { socialItems.set(String(item.id), item); media = `<a href="${escapeHtml(url)}" data-social="${escapeHtml(String(item.id))}" class="cms-media" style="display:block;position:relative;overflow:hidden">${socialCover(sp,item.title)}<span style="position:absolute;left:12px;top:12px;z-index:2;background:rgba(15,23,42,.8);color:#fff;font-size:10px;font-weight:700;letter-spacing:.12em;padding:5px 10px;border-radius:20px">${escapeHtml(sp.label.toUpperCase())}</span>${playBadge(sp)}</a>`; }
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
    if (target && gallery.length) target.innerHTML = gallery.map((item,i) => { const url=safeUrl(item.media_url); const sp=parseSocial(url); if (sp) socialItems.set(String(item.id), item); const media=sp ? socialCover(sp,item.title)+playBadge(sp) : item.media_type==="video" ? `<video src="${escapeHtml(url)}" muted playsinline preload="metadata"></video>` : `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}" loading="lazy">`; return `<a class="gallery-tile cms-gallery-tile" ${sp?`data-social="${escapeHtml(String(item.id))}" `:""}href="${escapeHtml(url||"#")}" target="_blank" rel="noopener noreferrer">${media}<span>${String(i+1).padStart(2,"0")} / ${sp?sp.label.toUpperCase():item.media_type==="video"?"VIDEO":"PHOTO"}</span><b>${escapeHtml(item.title)}</b></a>`; }).join("");
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
