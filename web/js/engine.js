// Движок новеллы 鈴の約束: фон, персонажи с эмоциями, диалог, выборы, словарик, письмо, сохранение.
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const game = $("#game");
  const IMG = "img/";

  // ---------- персонажи ----------
  // h — высота спрайта в процентах от высоты сцены (рисунки сделаны с разным кадрированием)
  const CHARS = {
    sakura: { name: "さくら", ru: "Сакура", h: 82, emo: "smile" },
    hiroshi: { name: "ひろし", ru: "Хироси", h: 97, emo: "calm" },
    yumiko: { name: "ゆみこ", ru: "Юмико", h: 95, emo: "smile" },
    kenta: { name: "けんた", ru: "Кэнта", h: 86, emo: "smirk" },
    suzuki: { name: "すずき", ru: "Судзуки-сан", h: 96, emo: "calm" },
    vera: { name: "Вера", ru: "Вера", h: 95, emo: "smile", ruName: true },
    announce: { name: "アナウンス", ru: "Объявление", voiceOnly: true },
  };
  const POS = { left: 25, center: 50, right: 75 };

  // ---------- сохранение (только в этом браузере) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ничего */ } },
  };
  const SAVE = "suzu.save.v1";
  const SETTINGS = "suzu.settings.v1";
  const WORDS_KEY = "suzu.words.v1";

  const settings = Object.assign({ tr: "always", voice: true, sound: true, speed: 2 }, store.get(SETTINGS, {}));
  let collected = new Set(store.get(WORDS_KEY, []));
  let player = null; // { name, kana, gender }
  let save = store.get(SAVE, null);

  // ---------- русский текст: имя и род ----------
  function ru(text) {
    if (!text) return "";
    const f = player && player.gender === "f";
    return text
      .replaceAll("{name}", player ? player.name : "")
      .replaceAll("{а}", f ? "а" : "")
      .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, w) => (f ? w : m));
  }
  const jpName = (t) => (t || "").replaceAll("{name}", player ? player.kana : "");
  const plainJp = (t) => jpName(t).replace(/\[\[|\]\]/g, "");

  // ---------- транслитерация имени в катакану ----------
  const KANA = {
    "": ["ア", "イ", "ウ", "エ", "オ"], к: ["カ", "キ", "ク", "ケ", "コ"], г: ["ガ", "ギ", "グ", "ゲ", "ゴ"],
    с: ["サ", "シ", "ス", "セ", "ソ"], з: ["ザ", "ジ", "ズ", "ゼ", "ゾ"], т: ["タ", "ティ", "トゥ", "テ", "ト"],
    д: ["ダ", "ディ", "ドゥ", "デ", "ド"], н: ["ナ", "ニ", "ヌ", "ネ", "ノ"], х: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    ф: ["ファ", "フィ", "フ", "フェ", "フォ"], б: ["バ", "ビ", "ブ", "ベ", "ボ"], п: ["パ", "ピ", "プ", "ペ", "ポ"],
    м: ["マ", "ミ", "ム", "メ", "モ"], р: ["ラ", "リ", "ル", "レ", "ロ"], л: ["ラ", "リ", "ル", "レ", "ロ"],
    в: ["ヴァ", "ヴィ", "ヴ", "ヴェ", "ヴォ"], ш: ["シャ", "シ", "シュ", "シェ", "ショ"], щ: ["シャ", "シ", "シュ", "シェ", "ショ"],
    ж: ["ジャ", "ジ", "ジュ", "ジェ", "ジョ"], ч: ["チャ", "チ", "チュ", "チェ", "チョ"], ц: ["ツァ", "ツィ", "ツ", "ツェ", "ツォ"],
    й: ["ヤ", "イ", "ユ", "イェ", "ヨ"],
  };
  const LONE = { т: "ト", д: "ド", н: "ン", й: "イ" };
  const V = { а: 0, и: 1, ы: 1, у: 2, э: 3, е: 3, о: 4, я: 0, ю: 2, ё: 4 };
  const YO = { я: "ャ", ю: "ュ", ё: "ョ" };
  function toKana(name) {
    const s = name.toLowerCase().replace(/[ьъ\s-]/g, "");
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const n = s[i + 1];
      if (c in V) {
        if (YO[c]) out += ["ヤ", "", "ユ", "", "ヨ"][V[c]];
        else out += KANA[""][V[c]];
        continue;
      }
      if (!(c in KANA)) continue;
      if (n === c) { out += c === "н" ? "ン" : "ッ"; continue; }
      if (n && n in V) {
        if (YO[n] && c !== "й") out += KANA[c][1].replace(/ィ$/, "") + YO[n];
        else out += KANA[c][V[n]];
        i++;
      } else {
        out += LONE[c] || KANA[c][2];
      }
    }
    return out || "アンナ";
  }

  // ---------- звук: колокольчик и щелчок (WebAudio, без файлов) ----------
  let actx = null;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function bell() {
    const a = settings.sound && audio();
    if (!a) return;
    const t = a.currentTime;
    [[1, .5], [2.76, .25], [5.4, .12], [8.9, .05]].forEach(([k, g], i) => {
      const o = a.createOscillator(); const v = a.createGain();
      o.type = "sine"; o.frequency.value = 1320 * k;
      v.gain.setValueAtTime(0, t + i * .002); v.gain.linearRampToValueAtTime(g * .35, t + .01);
      v.gain.exponentialRampToValueAtTime(.0001, t + 2.6 / (1 + i * .6));
      o.connect(v).connect(a.destination); o.start(t); o.stop(t + 3);
    });
  }

  // ---------- голос: японские реплики через синтез речи браузера ----------
  let jaVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find((v) => /ja[-_]JP/i.test(v.lang)) || vs.find((v) => /^ja/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(jp, force) {
    if (!("speechSynthesis" in window) || !jp) return;
    if (!force && !settings.voice) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plainJp(jp).replace(/[…]+/g, "、"));
      u.lang = "ja-JP"; if (jaVoice) u.voice = jaVoice; u.rate = .9;
      speechSynthesis.speak(u);
    } catch { /* без голоса */ }
  }

  // ---------- фон и персонажи ----------
  let bgFront = $("#bgA"), bgBack = $("#bgB"), curBg = null;
  function setBg(name, fx) {
    game.classList.toggle("sepia", fx === "sepia");
    if (!name || name === curBg) return;
    curBg = name;
    bgBack.style.backgroundImage = `url("${IMG}bg/${name}.webp")`;
    bgBack.classList.add("on"); bgFront.classList.remove("on");
    [bgFront, bgBack] = [bgBack, bgFront];
  }
  const sprites = {}; // who → img
  function setCast(cast) {
    const keep = new Set(Object.keys(cast));
    for (const who of Object.keys(sprites)) {
      if (!keep.has(who)) {
        const el = sprites[who]; delete sprites[who];
        el.classList.remove("on"); setTimeout(() => el.remove(), 500);
      }
    }
    for (const [who, [emo, pos]] of Object.entries(cast)) {
      let el = sprites[who];
      if (!el) {
        el = document.createElement("img"); el.alt = CHARS[who].ru; el.draggable = false;
        el.style.height = CHARS[who].h + "%";
        el.style.left = POS[pos] + "%";
        $("#sprites").appendChild(el); sprites[who] = el;
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
      }
      el.style.left = POS[pos] + "%";
      setEmo(who, emo);
    }
  }
  function setEmo(who, emo) {
    const el = sprites[who];
    if (el && emo) el.src = `${IMG}chars/${who}/${emo}.webp`;
  }
  function focus(who) {
    for (const [w, el] of Object.entries(sprites)) {
      el.classList.toggle("dim", !!who && w !== who && Object.keys(sprites).length > 1);
      if (w === who) { el.classList.remove("talk"); void el.offsetWidth; el.classList.add("talk"); }
    }
  }
  // предзагрузка картинок эпизода
  function preload(ep) {
    const urls = new Set();
    for (const st of flatSteps(ep.steps)) {
      if (st.bg) urls.add(`${IMG}bg/${st.bg}.webp`);
      if (st.cast) for (const [w, [e]] of Object.entries(st.cast)) urls.add(`${IMG}chars/${w}/${e}.webp`);
      if (st.say && st.emo && CHARS[st.say] && !CHARS[st.say].voiceOnly) urls.add(`${IMG}chars/${st.say}/${st.emo}.webp`);
    }
    urls.forEach((u) => { const i = new Image(); i.src = u; });
  }
  function* flatSteps(steps) {
    for (const s of steps) {
      yield s;
      if (s.choice) for (const o of s.choice) if (o.then) yield* flatSteps(o.then);
    }
  }

  // ---------- окно диалога ----------
  const dlg = $("#dialog"), nameTag = $("#nameTag"), lineJp = $("#lineJp"), lineRu = $("#lineRu");
  const btnTr = $("#btnTr"), btnVoice = $("#btnVoice");
  let typing = null, typingFinish = null, waiter = null, curLine = null;
  const log = [];

  function renderJp(text) {
    lineJp.className = ""; lineJp.textContent = "";
    const chars = [];
    const parts = jpName(text).split(/(\[\[.+?\]\])/);
    for (const p of parts) {
      if (!p) continue;
      const m = p.match(/^\[\[(.+)\]\]$/);
      let host = lineJp;
      if (m) {
        host = document.createElement("span"); host.className = "w"; host.dataset.w = m[1];
        lineJp.appendChild(host); collect(m[1]);
      }
      for (const ch of m ? m[1] : p) {
        const s = document.createElement("span"); s.className = "ch"; s.textContent = ch;
        host.appendChild(s); chars.push(s);
      }
    }
    return chars;
  }
  function renderPlain(text, cls) {
    lineJp.className = cls; lineJp.textContent = "";
    const chars = [];
    for (const ch of text) { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; lineJp.appendChild(s); chars.push(s); }
    return chars;
  }
  function typeOut(chars) {
    const delay = [40, 26, 14, 0][settings.speed] ?? 26;
    dlg.classList.remove("done");
    return new Promise((res) => {
      let i = 0;
      const finish = () => { chars.forEach((c) => c.classList.add("v")); clearInterval(typing); typing = null; typingFinish = null; dlg.classList.add("done"); res(); };
      if (!delay) return finish();
      typing = setInterval(() => { if (i >= chars.length) return finish(); chars[i++].classList.add("v"); }, delay);
      typingFinish = finish;
    });
  }
  function showRu() {
    if (!curLine) return;
    if (curLine.lock) {
      lineRu.className = "locked";
      lineRu.textContent = "？？？ — Кэнта тараторит, пока не разобрать";
      return;
    }
    lineRu.className = "";
    lineRu.textContent = curLine.ru && curLine.jp && trVisible() ? ru(curLine.ru) : "";
    btnTr.classList.toggle("on", trVisible());
  }

  // перевод: в режиме «сразу» кнопка 訳 прячет его для реплики, в режиме «по кнопке» — показывает
  const trVisible = () => !!curLine && (settings.tr === "always" ? !curLine.trToggled : curLine.trToggled);

  async function line(st) {
    const who = st.say || null;
    const ch = who && CHARS[who];
    curLine = { jp: st.jp, ru: st.ru, lock: st.lock, trToggled: false, who };
    dlg.hidden = false;
    // табличка с именем
    if (st.player) { nameTag.hidden = false; nameTag.className = "player"; nameTag.textContent = player.kana; }
    else if (ch) { nameTag.hidden = false; nameTag.className = ch.voiceOnly ? "other" : ""; nameTag.textContent = st.who || ch.name; }
    else nameTag.hidden = true;
    if (who && st.emo) setEmo(who, st.emo);
    focus(st.player ? null : who);
    let chars;
    if (st.jp) chars = renderJp(st.jp);
    else if (st.narr) chars = renderPlain(ru(st.narr), "narr");
    else chars = renderPlain(ru(st.ru), "ru");
    btnTr.disabled = !st.jp || !!st.lock;
    btnVoice.disabled = !st.jp;
    lineRu.textContent = "";
    log.push({ who: st.player ? player.kana : st.narr ? "" : (st.who || (ch && ch.name) || ""), jp: st.jp ? plainJp(st.jp) : "", ru: st.jp ? (st.lock ? "？？？" : ru(st.ru)) : ru(st.narr || st.ru) });
    if (st.jp) speak(st.jp);
    await typeOut(chars);
    showRu();
    await waitClick();
  }
  const typingDone = () => !typing;
  function waitClick() { return new Promise((res) => { waiter = res; }); }
  function advance() {
    if ($("#wordCard").hidden === false) { $("#wordCard").hidden = true; return; }
    if (typing && typingFinish) { typingFinish(); return; }
    if (waiter) { const w = waiter; waiter = null; w(); }
  }

  dlg.addEventListener("click", (e) => {
    const w = e.target.closest(".w");
    if (w && dlg.classList.contains("done")) { e.stopPropagation(); wordCard(w.dataset.w); return; }
    if (e.target.closest(".dlg-ctrls button")) return;
    advance();
  });
  btnTr.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!curLine || !typingDone()) return;
    curLine.trToggled = !curLine.trToggled;
    showRu();
  });
  btnVoice.addEventListener("click", (e) => { e.stopPropagation(); if (curLine) speak(curLine.jp, true); });

  // ---------- словарик ----------
  function collect(w) {
    if (!window.WORDS[w] || collected.has(w)) return;
    collected.add(w); store.set(WORDS_KEY, [...collected]);
  }
  function wordCard(w) {
    const d = window.WORDS[w]; if (!d) return;
    collect(w);
    const c = $("#wordCard");
    c.innerHTML = `<div class="wc-row"><span class="wc-jp" lang="ja"></span><span class="wc-read"></span><button lang="ja" aria-label="Послушать">音</button></div><div class="wc-ru"></div>`;
    c.querySelector(".wc-jp").textContent = w;
    c.querySelector(".wc-read").textContent = d.read;
    c.querySelector(".wc-ru").textContent = d.ru;
    c.querySelector("button").onclick = (e) => { e.stopPropagation(); speak(w, true); };
    c.onclick = () => { c.hidden = true; };
    c.hidden = false;
  }

  // ---------- выборы и мини-задания ----------
  function choose(options) {
    const box = $("#choices"); box.innerHTML = ""; box.hidden = false;
    focus(null);
    return new Promise((res) => {
      options.forEach((o, i) => {
        const b = document.createElement("button");
        b.innerHTML = `<span class="k">${i + 1}</span><span class="jp" lang="ja"></span>${settings.tr === "always" ? '<span class="ru"></span>' : ""}`;
        b.querySelector(".jp").textContent = plainJp(o.jp);
        if (settings.tr === "always") b.querySelector(".ru").textContent = ru(o.ru);
        b.style.animationDelay = i * 70 + "ms";
        b.onclick = (e) => { e.stopPropagation(); box.hidden = true; keyChoice = null; res(o); };
        box.appendChild(b);
      });
      keyChoice = (n) => { const b = box.children[n]; if (b) b.click(); };
      box.firstChild.focus({ preventScroll: true });
    });
  }
  let keyChoice = null;

  async function pick(p) {
    const box = $("#pick");
    const tried = new Set();
    while (true) {
      dlg.hidden = true;
      box.className = p.signs ? "signs" : "";
      box.innerHTML = `<div class="p-prompt"></div>${p.big ? '<div class="p-big" lang="ja"></div>' : ""}<div class="p-opts"></div>`;
      box.querySelector(".p-prompt").textContent = ru(p.prompt);
      if (p.big) box.querySelector(".p-big").textContent = p.big;
      box.hidden = false;
      const opt = await new Promise((res) => {
        p.options.forEach((o, i) => {
          const b = document.createElement("button");
          b.textContent = o.t; if (/[ぁ-ヿ]/.test(o.t)) b.lang = "ja";
          if (tried.has(i)) { b.classList.add("no"); b.disabled = true; }
          b.onclick = (e) => { e.stopPropagation(); keyChoice = null; res([o, i]); };
          box.querySelector(".p-opts").appendChild(b);
        });
        keyChoice = (n) => { const b = box.querySelectorAll(".p-opts button")[n]; if (b) b.click(); };
      });
      box.hidden = true;
      const [o, i] = opt;
      if (o.ok) return;
      tried.add(i);
      if (o.reply) await exec(o.reply);
    }
  }

  function signCard(c) {
    const el = $("#signCard");
    el.innerHTML = `<div class="s-jp" lang="ja"></div><div class="s-ru"></div>`;
    el.querySelector(".s-jp").textContent = jpName(c.jp);
    el.querySelector(".s-ru").textContent = settings.tr === "always" ? ru(c.ru) : "";
    el.hidden = false;
    speak(c.jp);
    return new Promise((res) => {
      waiter = () => { el.hidden = true; res(); };
      el.onclick = (e) => { e.stopPropagation(); advance(); };
    });
  }

  function sceneCard(main, sub) {
    const el = $("#sceneCard");
    el.querySelector(".sc-main").textContent = main;
    el.querySelector(".sc-sub").textContent = sub || "";
    el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    $("#sceneTag").textContent = `${main}${sub ? " · " + sub : ""}`;
    return new Promise((res) => setTimeout(() => { el.hidden = true; res(); }, 1700));
  }

  function toast(html) {
    const t = $("#toast"); t.innerHTML = html; t.hidden = false;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2000);
  }

  // ---------- письмо Ханы ----------
  const LETTER = [
    "[[ベラ]]さん へ。",
    "お元気ですか。[[わたし]]は 元気[[です]]。",
    "さくらざかは いま、はる[[です]]。",
    "じんじゃの さくらが きれい[[です]]。",
    "この すずを もっていて ください。",
    "@はな より",
  ];
  function showLetter(close = true) {
    const known = new Set((ep.letterKnown || []).filter((w) => collected.has(w)));
    const paper = $("#letter .paper"); paper.innerHTML = "";
    for (let row of LETTER) {
      const p = document.createElement("p");
      if (row.startsWith("@")) { p.className = "sign"; row = row.slice(1); }
      for (const part of row.split(/(\[\[.+?\]\])/)) {
        if (!part) continue;
        const m = part.match(/^\[\[(.+)\]\]$/);
        const s = document.createElement("span");
        s.textContent = m ? m[1] : part;
        s.className = m && known.has(m[1]) ? "known" : "blur";
        p.appendChild(s);
      }
      paper.appendChild(p);
    }
    const el = $("#letter"); el.hidden = false;
    return new Promise((res) => { el.onclick = () => { el.hidden = true; res(); }; });
  }

  // ---------- исполнение сценария ----------
  let ep = null;
  let stack = []; // [{steps, i}]
  let hearts = {};
  let topIdx = 0;

  async function exec(st) {
    if (st.scene !== undefined) {
      if (stack.length === 1) { topIdx = stack[0].i - 1; doSave(); }
      if (st.bg || st.fx !== undefined) setBg(st.bg || curBg, st.fx);
      if (st.cast) setCast(st.cast);
      dlg.hidden = true;
      await sceneCard(st.scene, st.sub);
      return;
    }
    if (st.bg) setBg(st.bg, st.fx);
    if (st.cast) setCast(st.cast);
    if (st.sfx === "bell") { bell(); await sleep(700); return; }
    if (st.learn) { collect(st.learn); return; }
    if (st.card) return signCard(st.card);
    if (st.pick) { dlg.hidden = true; return pick(st.pick); }
    if (st.letter) { dlg.hidden = true; return showLetter(); }
    if (st.end) return ending();
    if (st.choice) return choice(st);
    if (st.say || st.narr) return line(st);
  }

  async function choice(st) {
    const o = await choose(st.choice);
    await line({ player: true, jp: o.jp, ru: o.ru });
    const ok = st.choice.find((x) => x.ok);
    if (o.ok) {
      if (st.heart) {
        hearts[st.heart] = (hearts[st.heart] || 0) + 1;
        toast(`♥ <span lang="ja">${CHARS[st.heart].name}</span>`);
      }
      if (o.then) await runSteps(o.then);
    } else {
      if (o.then) await runSteps(o.then);
      // герой поправляется сам — без «попробуй ещё раз»
      await line({ narr: "Ой. Попробую по-другому…" });
      await line({ player: true, jp: ok.jp, ru: ok.ru });
      if (ok.then) await runSteps(ok.then);
    }
  }

  async function runSteps(steps) {
    stack.push({ steps, i: 0 });
    const fr = stack[stack.length - 1];
    while (fr.i < fr.steps.length) {
      const st = fr.steps[fr.i++];
      await exec(st);
      if (stack[0] && stack[0].ended) break;
    }
    stack.pop();
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function doSave() {
    save = { ep: ep.id, idx: topIdx, player, hearts, at: Date.now() };
    store.set(SAVE, save);
  }

  async function play(fromIdx = 0) {
    ep = window.EPISODES[1];
    preload(ep);
    hideScreens();
    $("#hud").hidden = false;
    // восстановить фон и персонажей на момент сохранения
    curBg = null; setCast({});
    let bg = null, fx = null, cast = {};
    for (let i = 0; i < fromIdx; i++) {
      const s = ep.steps[i];
      if (s.bg) bg = s.bg;
      if (s.fx !== undefined || s.scene !== undefined) fx = s.fx || null;
      if (s.cast) cast = s.cast;
    }
    if (bg) setBg(bg, fx);
    setCast(cast);
    stack = [];
    topIdx = fromIdx;
    stack.push({ steps: ep.steps, i: fromIdx });
    const fr = stack[0];
    while (fr.i < fr.steps.length && !fr.ended) await exec(fr.steps[fr.i++]);
  }

  function ending() {
    stack[0].ended = true;
    dlg.hidden = true; $("#hud").hidden = true;
    store.del(SAVE); save = null;
    const box = $("#ending .friends"); box.innerHTML = "";
    for (const who of ["sakura", "hiroshi", "yumiko", "kenta"]) {
      const n = hearts[who] || 0;
      const d = document.createElement("div"); d.className = "friend";
      d.innerHTML = `<img alt=""><div><div class="nm" lang="ja"></div><div class="hearts"></div></div>`;
      d.querySelector("img").src = `${IMG}chars/${who}/${CHARS[who].emo}.webp`;
      d.querySelector(".nm").textContent = CHARS[who].name;
      d.querySelector(".hearts").textContent = n ? "♥".repeat(n) : "♡";
      box.appendChild(d);
    }
    $("#ending .teaser").textContent = "В следующем эпизоде: " + ep.teaser;
    $("#ending").hidden = false;
  }

  // ---------- экраны ----------
  function hideScreens() { ["#title", "#nameScreen", "#ending", "#modal", "#letter"].forEach((s) => ($(s).hidden = true)); }
  function showTitle() {
    hideScreens(); $("#hud").hidden = true; dlg.hidden = true; $("#choices").hidden = true; $("#pick").hidden = true;
    window.speechSynthesis?.cancel();
    setCast({});
    save = store.get(SAVE, null);
    $("#tCont").hidden = !save;
    if (save) $("#tContSub").textContent = `Продолжить · ${save.player.name}`;
    $("#title").hidden = false;
  }
  // лепестки на титуле
  (() => {
    const box = $("#title .petals");
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.style.left = 30 + Math.random() * 75 + "%";
      s.style.animationDuration = 8 + Math.random() * 7 + "s";
      s.style.animationDelay = -Math.random() * 12 + "s";
      s.style.scale = .6 + Math.random() * .7;
      box.appendChild(s);
    }
  })();

  // имя
  let gender = "f", kanaEdited = false;
  const nameInput = $("#nameInput"), kanaInput = $("#kanaInput");
  function updKana() { if (!kanaEdited) { const k = toKana(nameInput.value.trim() || "Анна"); $("#kanaPreview").textContent = k; kanaInput.value = k; } }
  nameInput.addEventListener("input", updKana);
  $("#kanaEditBtn").onclick = () => { kanaInput.hidden = false; kanaInput.focus(); };
  kanaInput.addEventListener("input", () => { kanaEdited = true; $("#kanaPreview").textContent = kanaInput.value; });
  for (const [id, g] of [["#gF", "f"], ["#gM", "m"]]) {
    $(id).onclick = () => {
      gender = g;
      $("#gF").classList.toggle("on", g === "f"); $("#gM").classList.toggle("on", g === "m");
      $("#gF").setAttribute("aria-checked", g === "f"); $("#gM").setAttribute("aria-checked", g === "m");
    };
  }
  $("#nameBack").onclick = showTitle;
  $("#nameGo").onclick = () => {
    const name = nameInput.value.trim() || "Анна";
    player = { name: name[0].toUpperCase() + name.slice(1), kana: ($("#kanaPreview").textContent || toKana(name)).trim(), gender };
    hearts = {};
    audio();
    play(0);
  };

  $("#tNew").onclick = () => { hideScreens(); kanaEdited = false; nameInput.value = ""; kanaInput.hidden = true; updKana(); $("#nameScreen").hidden = false; nameInput.focus(); };
  $("#tCont").onclick = () => { if (!save) return; player = save.player; hearts = save.hearts || {}; audio(); play(save.idx); };
  $("#tWords").onclick = () => openWords();
  $("#tSettings").onclick = () => openSettings();
  $("#endMenu").onclick = showTitle;
  $("#endAgain").onclick = () => { hearts = {}; play(0); };
  $("#endWords").onclick = () => openWords();

  // ---------- окна: меню, словарик, история, настройки ----------
  const modal = $("#modal");
  function openModal(title, body) {
    $("#modalTitle").textContent = title;
    const b = $("#modalBody"); b.innerHTML = ""; b.appendChild(body);
    modal.hidden = false;
  }
  $("#modalClose").onclick = () => { modal.hidden = true; };
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

  function openWords() {
    const box = document.createElement("div");
    const ws = Object.keys(window.WORDS).filter((w) => collected.has(w));
    if (!ws.length) { box.innerHTML = `<p class="muted">Пока пусто. Слова появляются здесь сами, когда встречаются в истории.</p>`; }
    else {
      const p = document.createElement("p"); p.className = "muted small"; p.textContent = `Собрано слов: ${ws.length}. Нажми на слово, чтобы послушать.`;
      box.appendChild(p);
      const g = document.createElement("div"); g.className = "words";
      for (const w of ws) {
        const d = window.WORDS[w];
        const it = document.createElement("button"); it.className = "word" + (d.secret ? " secret" : "");
        it.innerHTML = `<span class="wj" lang="ja"></span><span class="wr"></span><div class="wm"></div>`;
        it.querySelector(".wj").textContent = w; it.querySelector(".wr").textContent = d.read; it.querySelector(".wm").textContent = d.ru;
        it.onclick = () => speak(w, true);
        g.appendChild(it);
      }
      box.appendChild(g);
    }
    openModal("Словарик", box);
  }
  function openLog() {
    const box = document.createElement("div");
    for (const l of log.slice(-60)) {
      const d = document.createElement("div"); d.className = "log-item";
      d.innerHTML = `<div class="lw" lang="ja"></div><div class="lj" lang="ja"></div><div class="lr"></div>`;
      d.querySelector(".lw").textContent = l.who; d.querySelector(".lj").textContent = l.jp; d.querySelector(".lr").textContent = l.ru;
      box.appendChild(d);
    }
    openModal("История", box);
    requestAnimationFrame(() => { $("#modalBody").scrollTop = 1e6; });
  }
  function seg(opts, val, on) {
    const s = document.createElement("div"); s.className = "seg";
    for (const [v, label] of opts) {
      const b = document.createElement("button"); b.textContent = label; b.classList.toggle("on", v === val);
      b.onclick = () => { s.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); on(v); store.set(SETTINGS, settings); };
      s.appendChild(b);
    }
    return s;
  }
  function openSettings() {
    const box = document.createElement("div");
    const row = (label, ctrl) => { const r = document.createElement("div"); r.className = "set-row"; const l = document.createElement("span"); l.textContent = label; r.append(l, ctrl); box.appendChild(r); };
    row("Перевод реплик", seg([["always", "сразу"], ["tap", "по кнопке 訳"]], settings.tr, (v) => { settings.tr = v; showRu(); }));
    row("Голос (японские реплики)", seg([[true, "вкл"], [false, "выкл"]], settings.voice, (v) => { settings.voice = v; }));
    row("Звуки", seg([[true, "вкл"], [false, "выкл"]], settings.sound, (v) => { settings.sound = v; }));
    row("Скорость текста", seg([[0, "медленно"], [1, "обычно"], [2, "быстро"], [3, "сразу"]], settings.speed, (v) => { settings.speed = v; }));
    if (!("speechSynthesis" in window) || !jaVoice) {
      const p = document.createElement("p"); p.className = "muted small";
      p.textContent = "В этом браузере нет японского голоса — реплики будут без озвучки.";
      box.appendChild(p);
    }
    openModal("Настройки", box);
  }
  function openMenu() {
    const box = document.createElement("div"); box.className = "menu-list";
    const add = (label, fn, cls = "ghost") => { const b = document.createElement("button"); b.className = cls; b.textContent = label; b.onclick = fn; box.appendChild(b); };
    add("Продолжить", () => { modal.hidden = true; }, "primary");
    add("Письмо Ханы", () => { modal.hidden = true; showLetter(); });
    add("Словарик", openWords);
    add("История реплик", openLog);
    add("Настройки", openSettings);
    add("В главное меню (прогресс сохранён на начале сцены)", () => { modal.hidden = true; showTitle(); });
    openModal("Меню", box);
  }
  $("#btnMenu").onclick = (e) => { e.stopPropagation(); openMenu(); };
  $("#btnLog").onclick = (e) => { e.stopPropagation(); openLog(); };

  // ---------- клавиатура ----------
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") { if (e.key === "Enter" && !$("#nameScreen").hidden) $("#nameGo").click(); return; }
    if (!modal.hidden) { if (e.key === "Escape") modal.hidden = true; return; }
    if (!$("#letter").hidden && (e.key === " " || e.key === "Enter" || e.key === "Escape")) { e.preventDefault(); $("#letter").click(); return; }
    if (keyChoice && /^[1-9]$/.test(e.key)) { keyChoice(+e.key - 1); return; }
    if (e.key === " " || e.key === "Enter") {
      if (!$("#title").hidden || !$("#ending").hidden || !$("#nameScreen").hidden) return;
      if (!$("#choices").hidden || !$("#pick").hidden) return;
      e.preventDefault(); advance();
    }
    if (e.key === "Escape" && !$("#hud").hidden) openMenu();
  });
  // клик по сцене (мимо окна диалога) — тоже «дальше»
  $("#game").addEventListener("click", (e) => {
    if (e.target.closest("button, #dialog, #choices, #pick, .overlay, .screen, #wordCard, #signCard")) return;
    if (!$("#hud").hidden) advance();
  });

  showTitle();
})();
