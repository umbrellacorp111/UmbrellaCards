/* =====================================================================
   UmbrellaCards — Lyric Cards Visualizer (Canvas 9:16 для TikTok / Reels)
   Новая концепция: Genius / Spotify Lyric Cards вместо эквалайзеров.
   - Фон: фото артиста с blur + затемнение overlay 0.4
   - Центр: Glassmorphism-карточка (рамка, скругление 24px)
   - Вверху карточки: мини-обложка + название + артист
   - По центру: крупная цитата из песни с shimmer-свечением
   - Динамика: пульс карточки 1-2% на басах, частицы на средних/высоких
   ===================================================================== */

(function () {
  'use strict';

  // ---------- Темы карточки: 2 бесплатные (включая референс) + 3 Pro ----------
  const THEMES = {
    standard: { name: 'Standard Grey', pro: false, lock: false },
    highlight:{ name: 'Genius Highlight', pro: false, lock: false }, // Референс TikTok/Reels
    genius:   { name: 'Genius Yellow', pro: true,  lock: true  },
    spotify:  { name: 'Spotify Canvas', pro: true, lock: true  },
    cyberpunk:{ name: 'Neon Cyberpunk', pro: true, lock: true  },
  };

  // ---------- Внутреннее состояние движка ----------
  const V = {
    canvas: null,
    ctx: null,
    bgImage: null,        // Фото артиста (фон)
    coverImage: null,     // Мини-обложка трека
    title: 'Название песни',
    artist: 'Имя артиста',
    lyric: 'Главный отрывок песни,\nкоторый хочется запостить',
    handle: '@username',  // TikTok-ник для нижней полосы
    theme: 'standard',    // standard | highlight | genius | spotify | cyberpunk
    isPro: false,         // Флаг Pro: отключает вотермарк и открывает темы
    watermark: 'Сгенерировано в UmbrellaCards',
    // Плавные аудио-уровни (приходят из index.html каждый кадр)
    bass: 0, mids: 0, highs: 0, volume: 0,
    beat: false, beatPulse: 0,
    // Сглаженная пульсация карточки
    pulse: 1,
    bassSmooth: 0,
    // Крупные размытые неоновые пылинки за карточкой
    dust: [],
    // Средний цвет обложки для темы Spotify Canvas
    coverColor: { h: 160, s: 80, l: 55 },
    time: 0,
  };

  /* ---------- Инициализация: привязываем canvas ---------- */
  function init(canvas) {
    V.canvas = canvas;
    V.ctx = canvas.getContext('2d');
    initDust(26); // 26 крупных пылинок — достаточно для кинематографичности
    return api;
  }

  /* ---------- Крупные размытые частицы-пылинки ---------- */
  function initDust(count) {
    V.dust = [];
    for (let i = 0; i < count; i++) {
      V.dust.push({
        x: Math.random(),
        y: Math.random(),
        r: 40 + Math.random() * 130,          // Крупные: 40–170px (в CSS-пикселях)
        vx: (Math.random() - 0.5) * 0.00022,  // Очень медленный дрейф
        vy: (Math.random() - 0.5) * 0.00018,
        hue: 170 + Math.random() * 150,       // Бирюза → фиолет → маджента
        alpha: 0.10 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /* ---------- Установка изображений и текстов ---------- */
  function setBackground(img) { V.bgImage = img; }
  function setCover(img) {
    V.coverImage = img;
    sampleCoverColor(img); // Для Spotify-темы подбираем градиент под обложку
  }
  function setMeta(data) {
    if (data.title !== undefined) V.title = data.title || 'Название песни';
    if (data.artist !== undefined) V.artist = data.artist || 'Имя артиста';
    if (data.lyric !== undefined) V.lyric = data.lyric || '';
    if (data.handle !== undefined) V.handle = data.handle || '@username';
  }
  function setTheme(name) {
    if (THEMES[name]) V.theme = name;
  }
  function setPro(value) { V.isPro = !!value; }

  /* ---------- Аудио-уровни из Web Audio API (вызывает index.html) ---------- */
  function setAudioLevels(levels) {
    V.bass = levels.bass || 0;
    V.mids = levels.mids || 0;
    V.highs = levels.highs || 0;
    V.volume = levels.volume || 0;
    V.beat = !!levels.beat;
    V.beatPulse = levels.beatPulse || 0;
  }

  /* ---------- Средний цвет обложки (для Spotify Canvas) ---------- */
  function sampleCoverColor(img) {
    try {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 8;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data;
      let r = 0, g2 = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g2 += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      const hsl = rgbToHsl(r / n, g2 / n, b / n);
      V.coverColor = { h: hsl[0], s: Math.max(55, hsl[1]), l: 52 };
    } catch (e) { /* CORS-картинки не читаются — оставляем дефолтный цвет */ }
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  /* ---------- Вспомогательное: скруглённый прямоугольник ---------- */
  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  /* ---------- Вспомогательное: перенос строк для цитаты ---------- */
  function wrapLyric(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    // Уважаем ручные переносы строк из textarea
    const paragraphs = String(text).split('\n');
    for (const para of paragraphs) {
      const ws = para.split(/\s+/).filter(Boolean);
      line = '';
      for (const word of ws) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
    }
    if (!lines.length && words.length === 0) return [''];
    return lines.slice(0, 6); // Не больше 6 строк, чтобы карточка не разъезжалась
  }

  /* =====================================================================
     ГЛАВНАЯ ОТРИСОВКА КАДРА 9:16
     ===================================================================== */
  function draw(dt) {
    const canvas = V.canvas, ctx = V.ctx;
    if (!canvas || !ctx) return;
    const W = canvas.width, H = canvas.height;
    V.time += dt || 0.016;

    // Плавное сглаживание баса для пульсации карточки
    V.bassSmooth += (V.bass - V.bassSmooth) * 0.12;
    // Целевая пульсация: всего 1–2%, благородно и едва заметно
    const target = 1 + Math.min(1, V.bassSmooth) * 0.015 + V.beatPulse * 0.010;
    V.pulse += (target - V.pulse) * 0.14;

    // Референс-стиль: резкое фото + белые плашки + чёрная полоса
    if (V.theme === 'highlight') {
      drawHighlightFrame(ctx, W, H);
      return;
    }

    drawBackground(ctx, W, H);
    drawDust(ctx, W, H);
    drawCard(ctx, W, H);
  }

  /* =====================================================================
     РЕФЕРЕНС-СТИЛЬ Genius Highlight (как в TikTok-примере):
     резкое фото на весь холст, белые плашки построчно, чёрная полоса снизу
     ===================================================================== */
  function drawHighlightFrame(ctx, W, H) {
    // 1. Фото резкое на весь холст 9:16 (без блюра, как в референсе)
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#101018');
    base.addColorStop(1, '#05060f');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    if (V.bgImage && V.bgImage.complete && V.bgImage.naturalWidth) {
      const iw = V.bgImage.naturalWidth, ih = V.bgImage.naturalHeight;
      const s = Math.max(W / iw, H / ih);
      const dw = iw * s, dh = ih * s;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.drawImage(V.bgImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
    }
    // Едва заметное затемнение только сверху/снизу для читаемости плашек
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0.18)');
    shade.addColorStop(0.35, 'rgba(0,0,0,0)');
    shade.addColorStop(0.8, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    // 2. Белые плашки с текстом — как в референсе, левый край ровный
    const scale = W / 720;
    const barH = H * 0.105; // Чёрная полоса снизу ~10.5%
    const areaH = H - barH;
    ctx.save();
    // Едва живая пульсация всего текстового блока в такт басам
    ctx.translate(W / 2, areaH * 0.52);
    ctx.scale(V.pulse, V.pulse);
    ctx.translate(-W / 2, -areaH * 0.52);

    const leftX = W * 0.055;                 // Ровный левый край всех плашек
    const maxTextW = W * 0.89;
    ctx.font = '700 ' + Math.floor(40 * scale) + 'px Inter, Arial, sans-serif';
    const rawLines = String(V.lyric || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    const lines = fitHighlightLines(ctx, rawLines.length ? rawLines : [''], maxTextW).slice(0, 7);
    const lineH = 62 * scale;
    const gapY = 10 * scale;
    const padX = 16 * scale, padY = 12 * scale;
    const blockH = lines.length * lineH + (lines.length - 1) * gapY;
    let y = areaH * 0.52 - blockH / 2;
    ctx.textBaseline = 'middle';
    lines.forEach(function (line) {
      const tw = Math.min(maxTextW, ctx.measureText(line).width);
      const bw = tw + padX * 2;
      const bh = lineH;
      // Белая плашка
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 8 * scale;
      ctx.fillRect(leftX, y, bw, bh);
      ctx.shadowBlur = 0;
      // Чёрный текст поверх
      ctx.fillStyle = '#141414';
      ctx.textAlign = 'left';
      ctx.fillText(line, leftX + padX, y + bh / 2 + 1 * scale);
      y += bh + gapY;
    });
    ctx.restore();

    // 3. Чёрная полоса снизу: слева артист/трек, справа TikTok-хендл
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, H - barH, W, barH);
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + Math.floor(26 * scale) + 'px Inter, Arial, sans-serif';
    const topStr = (V.artist + ' “' + V.title + '”').toUpperCase();
    ctx.fillText(ellipsis(ctx, topStr, W * 0.58), W * 0.05, H - barH * 0.68);
    ctx.font = '500 ' + Math.floor(22 * scale) + 'px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(ellipsis(ctx, V.title, W * 0.58), W * 0.05, H - barH * 0.28);
    // Справа: TikTok + handle
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + Math.floor(30 * scale) + 'px Inter, Arial, sans-serif';
    ctx.fillText('♪ ' + V.handle, W * 0.96, H - barH * 0.50);
    // Вотермарк Free — мелко в полосе, в Pro исчезает
    if (!V.isPro) {
      ctx.font = '500 ' + Math.floor(16 * scale) + 'px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(V.watermark, W * 0.96, H - barH * 0.82);
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  /* ---------- Разбивка длинных строк под ширину плашки ---------- */
  function fitHighlightLines(ctx, paragraphs, maxWidth) {
    const out = [];
    paragraphs.forEach(function (para) {
      const words = String(para).split(/\s+/).filter(Boolean);
      let line = '';
      words.forEach(function (word) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = word; }
        else line = test;
      });
      if (line) out.push(line);
    });
    return out.length ? out : [''];
  }

  /* ---------- 1. Фон: фото артиста + blur + затемнение 0.4 ---------- */
  function drawBackground(ctx, W, H) {
    // Базовый тёмный градиент, если фото ещё нет
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#0b0e1d');
    base.addColorStop(1, '#05060f');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    if (V.bgImage && V.bgImage.complete && V.bgImage.naturalWidth) {
      // Дорогой эффект: лёгкое размытие фото, чтобы текст читался идеально
      ctx.save();
      try { ctx.filter = 'blur(' + Math.floor(W * 0.012) + 'px)'; } catch (e) {}
      // Cover-fit: фото закрывает весь холст 9:16 без искажений
      const iw = V.bgImage.naturalWidth, ih = V.bgImage.naturalHeight;
      const s = Math.max(W / iw, H / ih);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(V.bgImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
      try { ctx.filter = 'none'; } catch (e) {}
    } else {
      // Плейсхолдер-фона: мягкие неоновые пятна
      ctx.save();
      const g1 = ctx.createRadialGradient(W * 0.2, H * 0.15, 10, W * 0.2, H * 0.15, W * 0.7);
      g1.addColorStop(0, 'rgba(0,240,255,0.16)'); g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(W * 0.85, H * 0.7, 10, W * 0.85, H * 0.7, W * 0.8);
      g2.addColorStop(0, 'rgba(255,0,229,0.14)'); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Затемнение overlay 0.4 — текст поверх всегда читается
    ctx.fillStyle = 'rgba(4, 5, 12, 0.4)';
    ctx.fillRect(0, 0, W, H);
    // Лёгкая виньетка для киношности
    const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 2. Неоновые пылинки: ускоряются от средних и высоких ---------- */
  function drawDust(ctx, W, H) {
    // Энергия средних и высоких частот разгоняет пылинки
    const energy = Math.min(1, (V.mids * 0.6 + V.highs * 0.7 + V.volume * 0.3));
    const speedMul = 1 + energy * 4;
    ctx.save();
    for (const p of V.dust) {
      p.x += p.vx * speedMul;
      p.y += p.vy * speedMul;
      p.phase += 0.008 + energy * 0.03;
      if (p.x < -0.2) p.x = 1.2; if (p.x > 1.2) p.x = -0.2;
      if (p.y < -0.2) p.y = 1.2; if (p.y > 1.2) p.y = -0.2;
      const x = p.x * W, y = p.y * H;
      const r = (p.r / 800) * W * (1 + energy * 0.35);
      const twinkle = 0.7 + Math.sin(p.phase) * 0.3;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      grad.addColorStop(0, 'hsla(' + Math.floor(p.hue) + ', 100%, 68%, ' + (p.alpha * twinkle + energy * 0.08).toFixed(3) + ')');
      grad.addColorStop(1, 'hsla(' + Math.floor(p.hue) + ', 100%, 60%, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 3. Центральная Glassmorphism-карточка ---------- */
  function drawCard(ctx, W, H) {
    const scale = W / 720; // Все размеры заданы под базу 720px ширины
    const cardW = W * 0.82;
    const cardH = H * 0.62;
    const radius = 24 * scale * 2; // Скругление 24px в CSS → пересчёт под canvas

    ctx.save();
    ctx.translate(W / 2, H * 0.50);
    ctx.scale(V.pulse, V.pulse); // Пульсация 1–2% на басах
    ctx.translate(-W / 2, -H * 0.50);

    const cx = W / 2 - cardW / 2;
    const cy = H * 0.50 - cardH / 2;

    // Тень карточки для глубины
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 60 * scale;
    ctx.shadowOffsetY = 24 * scale;
    rr(ctx, cx, cy, cardW, cardH, radius);
    // Заливка по теме
    paintCardFill(ctx, cx, cy, cardW, cardH, W, H, scale, radius);
    ctx.restore();

    // Белая тонкая рамка + верхний блик стекла
    rr(ctx, cx, cy, cardW, cardH, radius);
    ctx.strokeStyle = cardBorderColor();
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.stroke();
    // Блик сверху
    ctx.save();
    rr(ctx, cx, cy, cardW, cardH, radius);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, cy, 0, cy + cardH * 0.35);
    sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(cx, cy, cardW, cardH * 0.35);
    ctx.restore();

    // Неоновая рамка для Cyberpunk-темы
    if (V.theme === 'cyberpunk') drawNeonFrame(ctx, cx, cy, cardW, cardH, radius, scale);

    // Контент внутри карточки
    const pad = 34 * scale;
    drawCardHeader(ctx, cx + pad, cy + pad, cardW - pad * 2, scale);
    drawLyric(ctx, cx + pad, cy, cardW - pad * 2, cardH, pad, scale, W);
    drawWatermarkOnCard(ctx, cx, cardW, cy + cardH, pad, scale);

    ctx.restore();
  }

  /* ---------- Заливка карточки по теме ---------- */
  function paintCardFill(ctx, cx, cy, cardW, cardH, W, H, scale, radius) {
    if (V.theme === 'genius') {
      // Фирменная ярко-жёлтая Genius
      const g = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
      g.addColorStop(0, '#FFE600');
      g.addColorStop(1, '#FFD400');
      ctx.fillStyle = g;
      ctx.fill();
      return;
    }
    if (V.theme === 'spotify') {
      // Динамический градиент под обложку трека + дрейф оттенка
      const drift = Math.sin(V.time * 0.4) * 14;
      const h1 = (V.coverColor.h + drift + 360) % 360;
      const h2 = (V.coverColor.h + 46 + drift + 360) % 360;
      const g = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
      g.addColorStop(0, 'hsl(' + Math.floor(h1) + ', ' + V.coverColor.s + '%, 34%)');
      g.addColorStop(0.55, 'hsl(' + Math.floor((h1 + h2) / 2) + ', 70%, 22%)');
      g.addColorStop(1, 'hsl(' + Math.floor(h2) + ', 75%, 14%)');
      ctx.fillStyle = g;
      ctx.fill();
      // Стеклянный слой поверх
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      return;
    }
    if (V.theme === 'cyberpunk') {
      ctx.fillStyle = 'rgba(10, 8, 24, 0.72)';
      ctx.fill();
      return;
    }
    // Standard Grey (бесплатная): полупрозрачная матовая
    const g = ctx.createLinearGradient(0, cy, 0, cy + cardH);
    g.addColorStop(0, 'rgba(32, 34, 48, 0.68)');
    g.addColorStop(1, 'rgba(14, 15, 24, 0.68)');
    ctx.fillStyle = g;
    ctx.fill();
  }

  function cardBorderColor() {
    if (V.theme === 'genius') return 'rgba(0,0,0,0.85)';
    if (V.theme === 'cyberpunk') return 'rgba(0,242,254,0.9)';
    return 'rgba(255,255,255,0.28)'; // Тонкая белая рамка стекла
  }

  function drawNeonFrame(ctx, cx, cy, cardW, cardH, radius, scale) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 242, 254, 0.9)';
    ctx.shadowBlur = 18 * scale;
    rr(ctx, cx, cy, cardW, cardH, radius);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.shadowColor = 'rgba(255, 0, 229, 0.9)';
    rr(ctx, cx + 6 * scale, cy + 6 * scale, cardW - 12 * scale, cardH - 12 * scale, Math.max(4, radius - 6 * scale));
    ctx.strokeStyle = 'rgba(255, 0, 229, 0.45)';
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- Шапка карточки: обложка + название + артист ---------- */
  function drawCardHeader(ctx, x, y, w, scale) {
    const coverSize = 92 * scale;
    // Мини-обложка: скруглённый квадрат
    ctx.save();
    rr(ctx, x, y, coverSize, coverSize, 16 * scale);
    ctx.clip();
    if (V.coverImage && V.coverImage.complete && V.coverImage.naturalWidth) {
      ctx.drawImage(V.coverImage, x, y, coverSize, coverSize);
    } else {
      const g = ctx.createLinearGradient(x, y, x + coverSize, y + coverSize);
      g.addColorStop(0, '#00f0ff'); g.addColorStop(1, '#ff00e5');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, coverSize, coverSize);
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.font = '700 ' + Math.floor(34 * scale) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♪', x + coverSize / 2, y + coverSize / 2 + 12 * scale);
    }
    ctx.restore();
    rr(ctx, x, y, coverSize, coverSize, 16 * scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Тексты справа от обложки
    const tx = x + coverSize + 18 * scale;
    const tw = w - coverSize - 18 * scale;
    const dark = V.theme === 'genius'; // На жёлтой — тёмный текст
    ctx.textAlign = 'left';
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.96)';
    ctx.font = '800 ' + Math.floor(30 * scale) + 'px Inter, sans-serif';
    ctx.fillText(ellipsis(ctx, V.title, tw), tx, y + 34 * scale);
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.62)';
    ctx.font = '500 ' + Math.floor(24 * scale) + 'px Inter, sans-serif';
    ctx.fillText(ellipsis(ctx, V.artist, tw), tx, y + 64 * scale);
    // Маленький бейдж источника
    ctx.font = '600 ' + Math.floor(17 * scale) + 'px Inter, sans-serif';
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.38)';
    ctx.fillText('LYRIC CARD · 9:16', tx, y + 86 * scale);
  }

  function ellipsis(ctx, text, maxWidth) {
    const s = String(text || '');
    if (ctx.measureText(s).width <= maxWidth) return s;
    let out = s;
    while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
    return out + '…';
  }

  /* ---------- Центр карточки: крупная цитата с shimmer-свечением ---------- */
  function drawLyric(ctx, x, cardTopY, w, cardH, pad, scale, W) {
    const dark = V.theme === 'genius';
    const top = cardTopY + 150 * scale;
    const maxW = w;
    ctx.save();
    ctx.font = '800 ' + Math.floor(44 * scale) + 'px Inter, sans-serif';
    const lines = wrapLyric(ctx, V.lyric, maxW);
    const lineH = 58 * scale;
    const blockH = lines.length * lineH;
    let ly = top + (cardH - (top - cardTopY) - blockH) / 2 + 20 * scale;

    // Градиентное свечение: переливается со временем и дышит от громкости
    const shimmerX = Math.sin(V.time * 1.6) * W * 0.22;
    const glow = 8 + V.volume * 26 + V.beatPulse * 14;
    lines.forEach((line, i) => {
      const y = ly + i * lineH;
      let grad;
      if (dark) {
        grad = ctx.createLinearGradient(x + shimmerX - 100, 0, x + shimmerX + 300 * scale, 0);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(0.5, '#3a3a3a');
        grad.addColorStop(1, '#111111');
      } else if (V.theme === 'cyberpunk') {
        grad = ctx.createLinearGradient(x + shimmerX - 120, 0, x + shimmerX + 320 * scale, 0);
        grad.addColorStop(0, '#00f2fe');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, '#ff46e0');
      } else {
        grad = ctx.createLinearGradient(x + shimmerX - 120, 0, x + shimmerX + 320 * scale, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0.92)');
        grad.addColorStop(0.5, '#a5f3ff');
        grad.addColorStop(1, 'rgba(255,255,255,0.92)');
      }
      // Глитч текста для Cyberpunk на ударе баса
      const glitch = V.theme === 'cyberpunk' && (V.beat || V.beatPulse > 0.5);
      ctx.textAlign = 'left';
      if (glitch) {
        ctx.fillStyle = 'rgba(255,0,120,0.85)';
        ctx.fillText(line, x - 3 * scale, y);
        ctx.fillStyle = 'rgba(0,242,254,0.85)';
        ctx.fillText(line, x + 3 * scale, y);
      }
      ctx.shadowColor = dark ? 'rgba(0,0,0,0.25)' : 'rgba(0, 242, 254, 0.55)';
      ctx.shadowBlur = glow;
      ctx.fillStyle = grad;
      ctx.fillText(line, x, y);
    });
    ctx.restore();
  }

  /* ---------- Вотермарк на карточке (только Free) ---------- */
  function drawWatermarkOnCard(ctx, cx, cardW, cardBottomY, pad, scale) {
    if (V.isPro) return; // В Pro водяной знак полностью отключён
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 ' + Math.floor(19 * scale) + 'px Inter, sans-serif';
    ctx.fillStyle = V.theme === 'genius' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.42)';
    ctx.fillText(V.watermark, cx + cardW / 2, cardBottomY - pad * 0.7);
    ctx.restore();
  }

  // ---------- Публичный API движка ----------
  const api = {
    init: init,
    setBackground: setBackground,
    setCover: setCover,
    setMeta: setMeta,
    setTheme: setTheme,
    setPro: setPro,
    setAudioLevels: setAudioLevels,
    draw: draw,
    themes: THEMES,
    _state: V,
  };

  if (typeof window !== 'undefined') window.LyricVisualizer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
