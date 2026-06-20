/* AI for All — admin dashboard logic */
(function () {
  "use strict";

  // ---------- guard: config present? ----------
  if (!window.SUPABASE_READY) {
    document.getElementById("login").innerHTML =
      '<div class="login-card"><h1>⚙️ يلزم الإعداد</h1>' +
      '<p>لم تُضبط مفاتيح Supabase بعد. اتبع <b>db/SETUP.md</b> ثم ضع الرابط والمفتاح ' +
      'في <code>shared/supabase-config.js</code>.</p></div>';
    return;
  }

  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  let COURSE = null; // active course row (for quiz panel)

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));

  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    setTimeout(() => (t.className = "toast"), 2600);
  }
  async function guard(promise, okMsg) {
    const { data, error } = await promise;
    if (error) { toast(error.message || "حدث خطأ", true); throw error; }
    if (okMsg) toast(okMsg);
    return data;
  }

  // ---------- auth ----------
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#loginMsg");
    msg.className = "msg";
    const { error } = await sb.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value,
    });
    if (error) { msg.className = "msg err"; msg.textContent = "تعذّر الدخول: " + error.message; return; }
    boot();
  });
  $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { $("#login").style.display = "flex"; $("#app").style.display = "none"; return; }
    $("#login").style.display = "none";
    $("#app").style.display = "block";
    $("#who").textContent = session.user.email;
    await loadSeasons();
    await loadEpisodes();
    await loadCourses();
  }

  // ---------- panel nav ----------
  $$("nav.side button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("nav.side button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $$(".panel").forEach((p) => p.classList.remove("active"));
      $("#panel-" + b.dataset.panel).classList.add("active");
      if (b.dataset.panel === "quiz") loadQuiz();
      if (b.dataset.panel === "stats") loadStats();
      if (b.dataset.panel === "results") loadResults();
    }));
  $("#refreshStats").addEventListener("click", loadStats);

  // ================= SEASONS =================
  async function loadSeasons() {
    const rows = await guard(sb.from("seasons").select("*").order("number"));
    const sel = $("#seasonSel");
    sel.innerHTML = rows.map((s) => `<option value="${s.id}">${esc(s.title)} (#${s.number})</option>`).join("");
  }
  $("#addSeasonBtn").addEventListener("click", async () => {
    const title = prompt("اسم الموسم؟", "الموسم الثاني");
    if (!title) return;
    const number = parseInt(prompt("رقم الموسم؟", "2") || "0", 10);
    await guard(sb.from("seasons").insert({ title, number, sort_order: number }), "أُضيف الموسم");
    await loadSeasons(); await loadEpisodes();
  });
  $("#seasonSel").addEventListener("change", loadEpisodes);

  // ================= EPISODES =================
  async function loadEpisodes() {
    const seasonId = $("#seasonSel").value;
    if (!seasonId) { $("#epList").innerHTML = '<p class="muted-note">أضف موسماً أولاً.</p>'; return; }
    const rows = await guard(sb.from("episodes").select("*").eq("season_id", seasonId).order("number"));
    $("#epList").innerHTML = rows.length
      ? rows.map((e) => `
        <div class="item">
          <div class="num">${e.number}</div>
          <div class="body"><h3>${esc(e.title)}</h3><p>${esc(e.tagline || e.description || "")}</p></div>
          <div class="acts">
            <button class="btn ghost sm" data-edit="${e.id}">تعديل</button>
            <button class="btn danger sm" data-del="${e.id}">حذف</button>
          </div>
        </div>`).join("")
      : '<p class="muted-note">لا حلقات في هذا الموسم بعد.</p>';
    $$("[data-edit]", $("#epList")).forEach((b) =>
      b.addEventListener("click", () => editEpisode(rows.find((r) => r.id === b.dataset.edit))));
    $$("[data-del]", $("#epList")).forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("حذف هذه الحلقة؟")) return;
        await guard(sb.from("episodes").delete().eq("id", b.dataset.del), "حُذفت الحلقة");
        loadEpisodes();
      }));
  }

  $("#newEpBtn").addEventListener("click", () => editEpisode(null));

  function editEpisode(ep) {
    const f = $("#epForm");
    f.classList.remove("hide");
    f.innerHTML = `
      <h3 style="margin-bottom:6px">${ep ? "تعديل حلقة" : "حلقة جديدة"}</h3>
      <div class="row">
        <div><label>رقم الحلقة</label><input id="f_num" type="number" value="${ep ? ep.number : ""}"></div>
        <div><label>معرّف يوتيوب (اختياري)</label><input id="f_yt" value="${ep ? esc(ep.youtube_id || "") : ""}"></div>
      </div>
      <label>العنوان</label><input id="f_title" value="${ep ? esc(ep.title) : ""}">
      <label>الوصف المختصر (سطر جذّاب)</label><input id="f_tag" value="${ep ? esc(ep.tagline || "") : ""}">
      <label>الوصف الكامل</label><textarea id="f_desc">${ep ? esc(ep.description || "") : ""}</textarea>
      <label>ملف الصوت (MP3)${ep ? " — اتركه فارغاً للإبقاء على الحالي" : ""}</label>
      <input id="f_audio" type="file" accept="audio/*">
      <p class="muted-note">سيتم رفع الصوت وتوليد الصورة المصغّرة تلقائياً بنفس قالب البرنامج.</p>
      <div style="margin-top:16px;display:flex;gap:10px">
        <button class="btn" id="saveEpBtn">حفظ</button>
        <button class="btn ghost" id="cancelEpBtn">إلغاء</button>
        <span id="epProgress" class="muted-note"></span>
      </div>`;
    f.scrollIntoView({ behavior: "smooth", block: "nearest" });
    $("#cancelEpBtn").addEventListener("click", () => f.classList.add("hide"));
    $("#saveEpBtn").addEventListener("click", () => saveEpisode(ep));
  }

  async function saveEpisode(ep) {
    const prog = $("#epProgress");
    const seasonId = $("#seasonSel").value;
    const number = parseInt($("#f_num").value, 10);
    const title = $("#f_title").value.trim();
    const tagline = $("#f_tag").value.trim();
    const description = $("#f_desc").value.trim();
    const youtube_id = $("#f_yt").value.trim() || null;
    if (!number || !title) { toast("الرقم والعنوان مطلوبان", true); return; }

    const row = { season_id: seasonId, number, title, tagline, description, youtube_id };
    const audioFile = $("#f_audio").files[0];

    try {
      // 1) audio upload (if provided)
      if (audioFile) {
        prog.textContent = "جارٍ رفع الصوت…";
        const path = `s${seasonId.slice(0, 8)}/ep${String(number).padStart(2, "0")}-${Date.now()}.mp3`;
        await guard(sb.storage.from("audio").upload(path, audioFile, { upsert: true, contentType: "audio/mpeg" }));
        row.audio_url = sb.storage.from("audio").getPublicUrl(path).data.publicUrl;
      }
      // 2) thumbnail generation + upload
      prog.textContent = "جارٍ توليد الصورة المصغّرة…";
      const blob = await makeThumbnail({ number, title, tagline });
      const tpath = `s${seasonId.slice(0, 8)}/ep${String(number).padStart(2, "0")}-${Date.now()}.png`;
      await guard(sb.storage.from("thumbnails").upload(tpath, blob, { upsert: true, contentType: "image/png" }));
      row.thumbnail_url = sb.storage.from("thumbnails").getPublicUrl(tpath).data.publicUrl;

      // 3) insert/update row
      prog.textContent = "جارٍ الحفظ…";
      if (ep) await guard(sb.from("episodes").update(row).eq("id", ep.id), "حُفظت الحلقة");
      else await guard(sb.from("episodes").insert(row), "أُضيفت الحلقة");

      $("#epForm").classList.add("hide");
      loadEpisodes();
    } catch (e) { prog.textContent = ""; }
  }

  // ---------- canvas thumbnail (matches the program template) ----------
  function makeThumbnail(ep) {
    const c = $("#thumbCanvas"), ctx = c.getContext("2d"), W = 1280, H = 720;
    const navy = "#0a1628", navy2 = "#11263f", green = "#169b62", greenL = "#3ec98a", gold = "#f0c85a", white = "#fff", grey = "#b9c8d7";
    // bg gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, navy); g.addColorStop(1, navy2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // neural net motif (seeded-ish, left side)
    const pts = [];
    let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 24; i++) pts.push([20 + rnd() * 460, 40 + rnd() * (H - 80)]);
    ctx.strokeStyle = "rgba(62,201,138,.16)"; ctx.lineWidth = 2;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < 150) { ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke(); }
    }
    ctx.fillStyle = "rgba(62,201,138,.5)";
    pts.forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
    // top accent
    ctx.fillStyle = green; ctx.fillRect(0, 0, W, 10);
    ctx.direction = "rtl";
    // program name
    ctx.textAlign = "right"; ctx.fillStyle = greenL; ctx.font = "800 54px Tajawal";
    ctx.fillText("خوارزميات", W - 60, 78);
    ctx.fillStyle = grey; ctx.font = "500 26px Tajawal";
    ctx.fillText("الموسم الأول", W - 60, 116);
    // episode badge
    ctx.textAlign = "left"; ctx.fillStyle = green;
    const badge = "الحلقة " + ep.number;
    ctx.font = "700 34px Tajawal";
    const bw = ctx.measureText(badge).width + 56;
    roundRect(ctx, 60, 40, bw, 64, 32); ctx.fill();
    ctx.fillStyle = white; ctx.textAlign = "right"; ctx.fillText(badge, 60 + bw - 28, 84);
    // title (wrap up to 2 lines)
    ctx.fillStyle = white; let size = 74;
    let lines = wrap(ctx, ep.title, W - 120, "800 " + size + "px Tajawal");
    if (lines.length > 2) { size = 60; lines = wrap(ctx, ep.title, W - 120, "800 " + size + "px Tajawal"); }
    const lh = size * 1.4; let y = 300 - (lh * lines.length) / 2 + size;
    ctx.font = "800 " + size + "px Tajawal";
    lines.forEach((ln) => { ctx.fillText(ln, W - 60, y); y += lh; });
    // tagline
    if (ep.tagline) { ctx.fillStyle = gold; ctx.font = "500 40px Tajawal"; ctx.fillText(ep.tagline, W - 60, y + 6); }
    // bottom bar
    ctx.strokeStyle = "rgba(62,201,138,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, H - 130); ctx.lineTo(W - 60, H - 130); ctx.stroke();
    ctx.fillStyle = white; ctx.font = "700 40px Tajawal"; ctx.fillText("م. مصطفى الشعلة", W - 60, H - 86);
    ctx.fillStyle = grey; ctx.font = "500 25px Tajawal"; ctx.fillText("خبير الذكاء الاصطناعي وعلوم البيانات", W - 60, H - 50);
    // station + initiative (text only)
    ctx.textAlign = "left"; ctx.fillStyle = white; ctx.font = "700 32px Tajawal";
    ctx.fillText("على إذاعة الرياض", 60, H - 86);
    ctx.fillStyle = greenL; ctx.font = "400 23px Tajawal";
    ctx.fillText("AI for All — الذكاء الاصطناعي للجميع", 60, H - 48);
    return new Promise((res) => c.toBlob(res, "image/png"));
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW, font) {
    ctx.font = font; const words = text.split(" "); const lines = []; let cur = "";
    words.forEach((w) => {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // ================= COURSE =================
  async function loadCourses() {
    const rows = await guard(sb.from("courses").select("*").order("sort_order"));
    COURSE = rows[0] || null;
    $("#courseList").innerHTML = rows.length
      ? rows.map((c) => courseCard(c)).join("")
      : `<button class="btn" id="newCourseBtn">+ فصل جديد</button>`;
    $$("[data-savecourse]").forEach((b) => b.addEventListener("click", () => saveCourse(b.dataset.savecourse)));
    const nc = $("#newCourseBtn"); if (nc) nc.addEventListener("click", newCourse);
  }
  function courseCard(c) {
    return `<div class="card" data-course="${c.id}">
      <label>عنوان الفصل</label><input id="c_title_${c.id}" value="${esc(c.title)}">
      <label>مقدمة قصيرة</label><input id="c_intro_${c.id}" value="${esc(c.intro || "")}">
      <label>درجة النجاح (من ١٠)</label><input id="c_pass_${c.id}" type="number" value="${c.pass_score}">
      <label>نص الفصل (HTML)</label><textarea id="c_body_${c.id}" style="min-height:260px">${esc(c.body_html || "")}</textarea>
      <div style="margin-top:14px"><button class="btn" data-savecourse="${c.id}">حفظ الفصل</button></div>
    </div>`;
  }
  async function saveCourse(id) {
    await guard(sb.from("courses").update({
      title: $("#c_title_" + id).value.trim(),
      intro: $("#c_intro_" + id).value.trim(),
      pass_score: parseInt($("#c_pass_" + id).value, 10) || 7,
      body_html: $("#c_body_" + id).value,
    }).eq("id", id), "حُفظ الفصل");
  }
  async function newCourse() {
    const title = prompt("عنوان الفصل الجديد؟"); if (!title) return;
    const slug = "chapter-" + Date.now();
    await guard(sb.from("courses").insert({ title, slug, body_html: "<h2>عنوان</h2><p>المحتوى…</p>", pass_score: 7, sort_order: 99 }), "أُنشئ الفصل");
    loadCourses();
  }

  // ================= QUIZ =================
  async function loadQuiz() {
    if (!COURSE) { $("#quizArea").innerHTML = '<p class="muted-note">أنشئ فصلاً أولاً.</p>'; return; }
    const rows = await guard(sb.from("quiz_questions").select("*").eq("course_id", COURSE.id).order("sort_order"));
    $("#quizArea").innerHTML =
      `<p class="muted-note">أسئلة فصل: <b>${esc(COURSE.title)}</b></p>` +
      rows.map((q, i) => qCard(q, i)).join("") +
      `<div style="margin-top:8px;display:flex;gap:10px">
         <button class="btn" id="saveQuizBtn">💾 حفظ كل الأسئلة</button>
         <button class="btn ghost" id="addQBtn">+ سؤال</button>
       </div>`;
    window.__quiz = rows.map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options) }));
    renderQuizEditors();
    $("#saveQuizBtn").addEventListener("click", saveQuiz);
    $("#addQBtn").addEventListener("click", () => {
      window.__quiz.push({ id: null, question: "", options: ["", "", "", ""], answer_index: 0, sort_order: window.__quiz.length });
      renderQuizEditors();
    });
  }
  function qCard() { return ""; } // editors rendered by renderQuizEditors

  function renderQuizEditors() {
    const area = $("#quizArea");
    // rebuild only the editors region
    const editors = window.__quiz.map((q, i) => `
      <div class="q-edit" data-qi="${i}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b>سؤال ${i + 1}</b>
          <button class="btn danger sm" data-rmq="${i}">حذف</button>
        </div>
        <label>نص السؤال</label>
        <input data-q="${i}" value="${esc(q.question)}">
        <label>الخيارات (اختر الصحيح)</label>
        ${q.options.map((o, j) => `
          <div class="opt-row">
            <input type="radio" name="ans${i}" ${q.answer_index === j ? "checked" : ""} data-ans="${i}:${j}">
            <input data-opt="${i}:${j}" value="${esc(o)}">
          </div>`).join("")}
      </div>`).join("");
    // replace everything between the intro note and the action buttons
    const note = area.querySelector("p.muted-note").outerHTML;
    const actions = `<div style="margin-top:8px;display:flex;gap:10px">
         <button class="btn" id="saveQuizBtn">💾 حفظ كل الأسئلة</button>
         <button class="btn ghost" id="addQBtn">+ سؤال</button></div>`;
    area.innerHTML = note + editors + actions;
    // rebind
    $$("[data-q]").forEach((el) => el.addEventListener("input", (e) => window.__quiz[+el.dataset.q].question = e.target.value));
    $$("[data-opt]").forEach((el) => el.addEventListener("input", () => {
      const [i, j] = el.dataset.opt.split(":").map(Number); window.__quiz[i].options[j] = el.value;
    }));
    $$("[data-ans]").forEach((el) => el.addEventListener("change", () => {
      const [i, j] = el.dataset.ans.split(":").map(Number); window.__quiz[i].answer_index = j;
    }));
    $$("[data-rmq]").forEach((el) => el.addEventListener("click", () => {
      window.__quiz.splice(+el.dataset.rmq, 1); renderQuizEditors();
    }));
    $("#saveQuizBtn").addEventListener("click", saveQuiz);
    $("#addQBtn").addEventListener("click", () => {
      window.__quiz.push({ id: null, question: "", options: ["", "", "", ""], answer_index: 0, sort_order: window.__quiz.length });
      renderQuizEditors();
    });
  }

  async function saveQuiz() {
    // simplest robust approach: replace all questions for this course
    await guard(sb.from("quiz_questions").delete().eq("course_id", COURSE.id));
    const rows = window.__quiz
      .filter((q) => q.question.trim())
      .map((q, i) => ({
        course_id: COURSE.id, sort_order: i, question: q.question.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean), answer_index: q.answer_index,
      }));
    if (rows.length) await guard(sb.from("quiz_questions").insert(rows), "حُفظ الاختبار");
    loadQuiz();
  }

  // ================= STATS =================
  async function loadStats() {
    const cards = $("#statCards");
    cards.innerHTML = '<div class="spin">…</div>';
    // pull events + results + episodes (titles)
    const [events, results, eps] = await Promise.all([
      guard(sb.from("events").select("type,episode_id,seconds,session_id").limit(50000)),
      guard(sb.from("exam_results").select("passed,score").limit(50000)),
      guard(sb.from("episodes").select("id,number,title")),
    ]);
    const visitors = new Set(events.filter((e) => e.session_id).map((e) => e.session_id)).size;
    const plays = events.filter((e) => e.type === "play_start").length;
    const playSessions = new Set(events.filter((e) => e.type === "play_start").map((e) => e.session_id)).size;
    const seconds = events.filter((e) => e.type === "play_progress").reduce((a, e) => a + (Number(e.seconds) || 0), 0);
    const hrs = Math.floor(seconds / 3600), mins = Math.round((seconds % 3600) / 60);
    const examCount = results.length;
    const passCount = results.filter((r) => r.passed).length;

    cards.innerHTML = [
      ["👥 الزوّار", visitors],
      ["🎧 مرّات الاستماع", plays],
      ["🙋 مستمعون مختلفون", playSessions],
      ["⏱️ إجمالي وقت الاستماع", (hrs ? hrs + " س " : "") + mins + " د"],
      ["📝 محاولات الاختبار", examCount],
      ["🏅 نسبة النجاح", examCount ? Math.round((passCount / examCount) * 100) + "%" : "—"],
    ].map(([k, v]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");

    // plays per episode chart (top 10)
    const byEp = {};
    events.filter((e) => e.type === "play_start" && e.episode_id).forEach((e) => (byEp[e.episode_id] = (byEp[e.episode_id] || 0) + 1));
    const titleOf = {}; eps.forEach((e) => (titleOf[e.id] = e.number + ". " + e.title));
    const rows = Object.entries(byEp).map(([id, n]) => ({ lbl: titleOf[id] || "—", n }))
      .sort((a, b) => b.n - a.n).slice(0, 10);
    const max = Math.max(1, ...rows.map((r) => r.n));
    $("#playsChart").innerHTML = rows.length
      ? rows.map((r) => `<div class="bar-row"><span class="lbl" title="${esc(r.lbl)}">${esc(r.lbl)}</span>
          <span class="track"><span class="fill" style="width:${(r.n / max) * 100}%"></span></span>
          <span class="n">${r.n}</span></div>`).join("")
      : '<p class="muted-note">لا بيانات استماع بعد — ستظهر عندما يستمع الزوّار للحلقات.</p>';
  }

  // ================= RESULTS =================
  async function loadResults() {
    const area = $("#resultsArea");
    area.innerHTML = '<div class="spin">…</div>';
    const rows = await guard(sb.from("exam_results").select("name,score,total,passed,created_at").order("created_at", { ascending: false }).limit(1000));
    if (!rows.length) { area.innerHTML = '<p class="muted-note">لا نتائج بعد — ستظهر هنا عندما يجتاز الزوّار الاختبار.</p>'; return; }
    const fmt = (d) => new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
    area.innerHTML = `
      <p class="muted-note">${rows.length} محاولة — <button class="btn ghost sm" id="csvBtn">⬇ تصدير CSV</button></p>
      <table class="tbl"><thead><tr><th>الاسم</th><th>الدرجة</th><th>الحالة</th><th>التاريخ</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${esc(r.name)}</td>
        <td>${r.score} / ${r.total}</td>
        <td><span class="pill ${r.passed ? "pass" : "fail"}">${r.passed ? "ناجح" : "لم يجتز"}</span></td>
        <td>${fmt(r.created_at)}</td></tr>`).join("")}</tbody></table>`;
    $("#csvBtn").addEventListener("click", () => {
      const csv = "name,score,total,passed,date\n" +
        rows.map((r) => `"${r.name.replace(/"/g, '""')}",${r.score},${r.total},${r.passed},${r.created_at}`).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = "exam-results.csv"; a.click();
    });
  }

  // ---------- start ----------
  boot();
})();
