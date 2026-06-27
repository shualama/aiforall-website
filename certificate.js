/* AI for All — shared certificate renderer (canvas).
 * drawCertificate(canvasEl, opts) where opts = {
 *   kind: 'quiz' | 'listen',
 *   name, score, total,       // score/total only for quiz
 *   line1, line2, sub         // descriptive lines
 * }
 */
async function drawCertificate(canvas, opts) {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('800 80px Tajawal'),
    document.fonts.load('700 56px Tajawal'),
    document.fonts.load('500 34px Tajawal'),
  ]);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a1628'); bg.addColorStop(1, '#11263f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.95, 50, W * 0.85, H * 0.95, 600);
  glow.addColorStop(0, 'rgba(22,155,98,.35)'); glow.addColorStop(1, 'rgba(22,155,98,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // borders — gold for listening (trophy), green for quiz
  const accent = opts.kind === 'listen' ? '#f0c85a' : '#169b62';
  ctx.strokeStyle = accent; ctx.lineWidth = 10; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = opts.kind === 'listen' ? '#169b62' : '#f0c85a';
  ctx.lineWidth = 2; ctx.strokeRect(52, 52, W - 104, H - 104);

  // logo mark
  drawMark(ctx, W / 2, 175, 62);
  ctx.textAlign = 'center'; ctx.direction = 'rtl';
  ctx.fillStyle = '#ffffff'; ctx.font = '800 46px Tajawal';
  ctx.fillText('AI for All — الذكاء الاصطناعي للجميع', W / 2, 305);
  ctx.fillStyle = '#b9c8d7'; ctx.font = '500 26px Tajawal';
  ctx.fillText('مبادرة لتمكين الجميع من أدوات الذكاء الاصطناعي وتوظيفها للخير', W / 2, 348);

  // title
  ctx.fillStyle = '#f0c85a'; ctx.font = '800 84px Tajawal';
  ctx.fillText(opts.kind === 'listen' ? 'شهادة إتمام استماع' : 'شهادة إتمام', W / 2, 465);

  ctx.fillStyle = '#b9c8d7'; ctx.font = '500 34px Tajawal';
  ctx.fillText('تُمنح هذه الشهادة إلى', W / 2, 540);

  // name
  ctx.fillStyle = '#ffffff'; ctx.font = '800 78px Tajawal';
  ctx.fillText(opts.name, W / 2, 645);
  ctx.strokeStyle = 'rgba(62,201,138,.6)'; ctx.lineWidth = 3;
  const nw = Math.min(ctx.measureText(opts.name).width + 80, W - 300);
  ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, 672); ctx.lineTo(W / 2 + nw / 2, 672); ctx.stroke();

  ctx.fillStyle = '#dbe6f1'; ctx.font = '500 36px Tajawal';
  ctx.fillText(opts.line1 || '', W / 2, 745);
  if (opts.line2) { ctx.fillStyle = '#3ec98a'; ctx.font = '500 30px Tajawal'; ctx.fillText(opts.line2, W / 2, 795); }

  // score + date
  const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillStyle = '#b9c8d7'; ctx.font = '500 28px Tajawal';
  const meta = (opts.kind === 'quiz' && opts.total) ? `النتيجة: ${opts.score} من ${opts.total}  •  التاريخ: ${dateStr}` : `التاريخ: ${dateStr}`;
  ctx.fillText(meta, W / 2, 860);

  // signature
  ctx.strokeStyle = 'rgba(185,200,215,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 200, 975); ctx.lineTo(W / 2 + 200, 975); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = '700 34px Tajawal';
  ctx.fillText('م. مصطفى الشعلة', W / 2, 1020);
  ctx.fillStyle = '#b9c8d7'; ctx.font = '500 24px Tajawal';
  ctx.fillText('مؤسس المبادرة — خبير الذكاء الاصطناعي وعلوم البيانات', W / 2, 1056);

  // certificate id
  const cid = (opts.kind === 'listen' ? 'AIFA-L2L-' : 'AIFA-L2Q-') + Date.now().toString(36).toUpperCase();
  ctx.textAlign = 'left'; ctx.direction = 'ltr';
  ctx.fillStyle = 'rgba(185,200,215,.55)'; ctx.font = '400 20px Tajawal';
  ctx.fillText(cid, 70, H - 72);
}

function drawMark(ctx, cx, cy, s) {
  const nodes = [[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]];
  ctx.strokeStyle = '#3ec98a'; ctx.lineWidth = s * 0.05;
  nodes.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + x * s, cy + y * s); ctx.stroke(); });
  ctx.fillStyle = '#3ec98a';
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.27, 0, 7); ctx.fill();
  nodes.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, s * 0.15, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#0a1628';
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.11, 0, 7); ctx.fill();
}

function downloadCanvas(canvasId, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = document.getElementById(canvasId).toDataURL('image/png');
  a.click();
}
