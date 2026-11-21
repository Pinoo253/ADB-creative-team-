(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const cfg = window.ADB_CONFIG || {};
  const client = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const categories = {
    foto: "Foto", video: "Video", berita: "Berita", pencapaian: "Pencapaian",
    agenda: "Agenda sekolah", pengumuman: "Pengumuman"
  };
  let currentCategory = "foto", records = [];
  const toast = msg => { const el=$("#toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3500); };
  const esc = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const form = $("#content-form");
  const parseSocial = value => { try { const u = new URL(value); const h = u.hostname.replace(/^www\./,"").replace(/^m\./,""); let m;
    if (h==="youtu.be" || h==="youtube.com" || h==="music.youtube.com") { let id = h==="youtu.be" ? u.pathname.slice(1) : u.pathname.startsWith("/watch") ? (u.searchParams.get("v")||"") : ((u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)||[])[1]||""); id = id.slice(0,11); if (/^[\w-]{11}$/.test(id)) return {platform:"youtube",label:"YouTube",id,embed:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,thumb:`https://img.youtube.com/vi/${id}/hqdefault.jpg`,ratio:"16/9"}; }
    if (h==="tiktok.com" && (m = u.pathname.match(/\/video\/(\d{8,25})/))) return {platform:"tiktok",label:"TikTok",id:m[1],embed:`https://www.tiktok.com/embed/v2/${m[1]}`,thumb:"",ratio:"9/16"};
    if (h==="instagram.com" && (m = u.pathname.match(/\/(p|reel|reels|tv)\/([\w-]+)/))) { const kind = m[1]==="reels" ? "reel" : m[1]; return {platform:"instagram",label:"Instagram",id:m[2],embed:`https://www.instagram.com/${kind}/${m[2]}/embed/captioned/`,thumb:"",ratio:"9/16"}; }
  } catch {} return null; };
  const linkInput = () => form.elements.youtube_url;
  let lastFilled = "";
  async function autofillFromLink(){
    const url = linkInput().value.trim(); const sp = parseSocial(url);
    if (!sp || url === lastFilled) return; lastFilled = url;
    const st = $("#form-status"); st.textContent = "Mengambil judul & keterangan dari "+sp.label+"...";
    try {
      const res = await fetch("https://noembed.com/embed?url="+encodeURIComponent(url));
      const info = await res.json();
      if (info && !info.error && (info.title || info.author_name)) {
        const caption = String(info.title||"").trim(), author = String(info.author_name||"").trim();
        if (!form.elements.title.value.trim()) form.elements.title.value = (caption || author).slice(0,180);
        if (!form.elements.description.value.trim()) form.elements.description.value = [author && "Oleh "+author, caption].filter(Boolean).join("\n").slice(0,500);
        st.textContent = "Judul & keterangan terisi otomatis. Boleh diedit sebelum disimpan."; return;
      }
    } catch(e) { console.warn("Autofill link:", e); }
    st.textContent = sp.label+": judul/keterangan tidak bisa diambil otomatis, isi manual. Keterangan asli tetap tampil di video.";
  }
  form.addEventListener("change", e => { if (e.target && e.target.name === "youtube_url") autofillFromLink(); });
  if (!client) { $("#login-status").textContent="Koneksi Supabase belum tersedia. Periksa config.js dan pastikan library Supabase termuat."; return; }

  async function isAuthorized(user) {
    if (!user) return false;
    const {data,error}=await client.from("admins").select("user_id").eq("user_id",user.id).maybeSingle();
    return !error && Boolean(data);
  }
  async function showSession() {
    const {data:{user}}=await client.auth.getUser();
    if (!user) { $("#login-view").hidden=false; $("#panel-view").hidden=true; return; }
    if (!(await isAuthorized(user))) {
      await client.auth.signOut(); $("#login-view").hidden=false; $("#panel-view").hidden=true;
      $("#login-status").textContent="Akun ini belum terdaftar sebagai admin. Tambahkan UUID akun ke tabel public.admins."; return;
    }
    $("#login-view").hidden=true; $("#panel-view").hidden=false; $("#admin-user").textContent=user.email || "Admin";
    await loadRecords();
  }
  $("#login-form").addEventListener("submit",async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const status=$("#login-status"); status.textContent="Memeriksa akun...";
    const {error}=await client.auth.signInWithPassword({email:fd.get("email"),password:fd.get("password")});
    if(error){status.textContent="Login gagal: "+error.message;return;} await showSession();
  });
  $("#logout").addEventListener("click",async()=>{await client.auth.signOut();location.reload();});
  document.querySelectorAll("[data-category]").forEach(button=>button.addEventListener("click",()=>{
    currentCategory=button.dataset.category;
    document.querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b===button));
    resetForm(); loadRecords();
  }));
  $("#refresh-button").addEventListener("click",loadRecords);

  async function loadRecords(){
    $("#records").textContent="Memuat konten...";
    const {data,error}=await client.from("content_items").select("*").eq("category",currentCategory).order("created_at",{ascending:false}).limit(100);
    if(error){$("#records").textContent="Gagal memuat: "+error.message;return;}
    records=data||[];
    $("#records").innerHTML=records.map((r,i)=>`<article class="record"><div class="record-main"><b>${esc(r.title)}</b><small>${r.is_published?"Terbit":"Draft"}${r.event_date?" · "+esc(new Date(r.event_date).toLocaleDateString("id-ID")):""}</small></div><div class="record-actions"><button type="button" data-edit="${i}">Edit</button><button type="button" data-delete="${i}">Hapus</button></div></article>`).join("")||'<p class="admin-muted">Belum ada konten pada kategori ini.</p>';
  }
  $("#records").addEventListener("click",async e=>{
    const editIndex=e.target.dataset.edit,deleteIndex=e.target.dataset.delete;
    if(editIndex!==undefined){fillForm(records[Number(editIndex)]);return;}
    if(deleteIndex!==undefined){await deleteRecord(records[Number(deleteIndex)]);}
  });
  function fillForm(item){
    form.elements.id.value=item.id; form.elements.old_media_url.value=item.media_url||""; form.elements.youtube_url.value=parseSocial(item.media_url||"")?item.media_url:"";
    form.elements.title.value=item.title||""; form.elements.description.value=item.description||"";
    form.elements.body.value=item.body||""; form.elements.location.value=item.location||"";
    form.elements.event_date.value=item.event_date?new Date(item.event_date).toISOString().slice(0,16):"";
    form.elements.is_published.checked=Boolean(item.is_published);
    $("#form-heading").textContent="Edit "+categories[currentCategory]; $("#save-button").textContent="Perbarui konten ↗";
    form.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function resetForm(){form.reset();form.elements.id.value="";form.elements.old_media_url.value="";$("#form-heading").textContent="Tambah "+categories[currentCategory].toLowerCase();$("#save-button").textContent="Simpan konten ↗";$("#form-status").textContent="";}
  $("#clear-button").addEventListener("click",resetForm);

  async function uploadFile(file){
    if(!file)return null;
    const allowed=["image/jpeg","image/png","image/webp","image/gif","image/avif","video/mp4","video/webm","video/quicktime"];
    if(!allowed.includes(file.type))throw new Error("Format file tidak didukung.");
    if(currentCategory==="foto" && !file.type.startsWith("image/"))throw new Error("Kategori Foto hanya menerima file gambar.");
    if(currentCategory==="video" && !file.type.startsWith("video/"))throw new Error("Kategori Video hanya menerima file video.");
    if(file.size>50*1024*1024)throw new Error("Ukuran file melebihi batas 50 MB.");
    const {data:{user}}=await client.auth.getUser(); if(!user)throw new Error("Sesi admin berakhir. Login kembali.");
    const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await client.storage.from("media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=client.storage.from("media").getPublicUrl(path);
    return {url:data.publicUrl,type:file.type.startsWith("video/")?"video":"image",path};
  }
  function storagePath(publicUrl){
    if(!publicUrl)return null;
    try{const u=new URL(publicUrl);const marker="/storage/v1/object/public/media/";const i=u.pathname.indexOf(marker);return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):null;}catch{return null;}
  }
  async function deleteStoredFile(url){const path=storagePath(url);if(!path)return;const {error}=await client.storage.from("media").remove([path]);if(error)console.warn("File lama belum terhapus:",error.message);}

  form.addEventListener("submit",async e=>{
    e.preventDefault();const button=$("#save-button"),status=$("#form-status");button.disabled=true;status.textContent="Menyimpan...";
    try{
      const fd=new FormData(form),id=String(fd.get("id")||""),oldUrl=String(fd.get("old_media_url")||""),file=form.elements.media.files[0];
      const payload={category:currentCategory,title:String(fd.get("title")||"").trim(),description:String(fd.get("description")||"").trim(),body:String(fd.get("body")||"").trim(),location:String(fd.get("location")||"").trim()||null,event_date:fd.get("event_date")?new Date(fd.get("event_date")).toISOString():null,is_published:form.elements.is_published.checked};
      if(!payload.title)throw new Error("Judul wajib diisi.");
      const ytUrl=String(fd.get("youtube_url")||"").trim();
      if(ytUrl&&file)throw new Error("Pilih salah satu: upload file ATAU link video.");
      if(ytUrl&&!parseSocial(ytUrl))throw new Error("Link tidak dikenali. Pakai link lengkap YouTube, TikTok (…/video/angka), atau Instagram (/p/ atau /reel/). Link pendek TikTok (vt./vm.) belum didukung, buka dulu lalu salin link lengkapnya.");
      let uploaded=null;if(file){uploaded=await uploadFile(file);payload.media_url=uploaded.url;payload.media_type=uploaded.type;}
      else if(ytUrl){payload.media_url=ytUrl;payload.media_type="video";}
      const result=id?await client.from("content_items").update(payload).eq("id",id):await client.from("content_items").insert(payload);
      if(result.error){if(uploaded)await deleteStoredFile(uploaded.url);throw result.error;}
      if((file||ytUrl)&&oldUrl&&oldUrl!==ytUrl)await deleteStoredFile(oldUrl);
      status.textContent="Konten berhasil disimpan.";toast("Konten berhasil disimpan.");resetForm();await loadRecords();
    }catch(error){status.textContent="Gagal: "+error.message;toast("Gagal menyimpan konten.");console.error(error);}
    finally{button.disabled=false;}
  });
  async function deleteRecord(item){
    if(!confirm(`Hapus konten “${item.title}”?`))return;
    const {error}=await client.from("content_items").delete().eq("id",item.id);
    if(error){toast("Gagal menghapus: "+error.message);return;}
    if(item.media_url)await deleteStoredFile(item.media_url);
    toast("Konten dan file medianya dihapus.");await loadRecords();
  }
  client.auth.onAuthStateChange((_event)=>{setTimeout(showSession,0);});
  showSession();
})();
