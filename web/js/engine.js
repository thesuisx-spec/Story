// Движок новеллы 鈴の約束: фон, персонажи с эмоциями, диалог с «лепетом», выборы, письмо, сохранение.
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const game = $("#game");
  const IMG = "img/";

  // ---------- персонажи ----------
  // h — высота спрайта в % от высоты сцены (картинки нарисованы с разным кадрированием)
  // voice — высота «лепета» в Гц и тембр
  const CHARS = {
    sakura: { name: "さくら", ru: "Сакура", h: 82, emo: "smile", voice: { pitch: 430, wave: "triangle" } },
    hiroshi: { name: "ひろし", ru: "Хироси", h: 97, emo: "calm", voice: { pitch: 150, wave: "sawtooth" } },
    yumiko: { name: "ゆみこ", ru: "Юмико", h: 95, emo: "smile", voice: { pitch: 310, wave: "triangle" } },
    kenta: { name: "けんた", ru: "Кэнта", h: 86, emo: "smirk", voice: { pitch: 500, wave: "square" } },
    suzuki: { name: "すずき", ru: "Судзуки-сан", h: 96, emo: "calm", voice: { pitch: 125, wave: "sawtooth" } },
    vera: { name: "Вера", ru: "Вера", h: 95, emo: "smile", voice: { pitch: 250, wave: "triangle" } },
    yui: { name: "ゆい", ru: "Юи", voiceOnly: true, voice: { pitch: 600, wave: "square" } },
    mama: { name: "ゆいの ママ", ru: "мама Юи", voiceOnly: true, voice: { pitch: 290, wave: "triangle" } },
    announce: { name: "アナウンス", ru: "Объявление", voiceOnly: true, voice: { pitch: 210, wave: "sine", flat: true } },
  };
  const POS = { left: 25, center: 50, right: 75 };

  // ---------- сохранение (только в этом браузере) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ничего */ } },
  };
  const SAVE = "suzu.save.v2";
  const SETTINGS = "suzu.settings.v2";
  const WORDS_KEY = "suzu.words.v2";

  const settings = Object.assign({ voices: true, sound: true, speed: 1 }, store.get(SETTINGS, {}));
  const collected = new Set(store.get(WORDS_KEY, []));
  let player = null; // { name, kana, gender }
  let save = store.get(SAVE, null);

  // ---------- имя и род ----------
  const female = () => !!player && player.gender === "f";
  const gendered = (t) => t.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, w) => (female() ? w : m));
  function ru(text) {
    if (!text) return "";
    return gendered(text.replaceAll("{name}", player ? player.name : "").replaceAll("{а}", female() ? "а" : ""));
  }
  const jpText = (t) => gendered((t || "").replaceAll("{name}", player ? player.kana : ""));
  const plainJp = (t) => jpText(t).replace(/\[\[|\]\]/g, "");

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
      const c = s[i], n = s[i + 1];
      if (c in V) { out += YO[c] ? ["ヤ", "", "ユ", "", "ヨ"][V[c]] : KANA[""][V[c]]; continue; }
      if (!(c in KANA)) continue;
      if (n === c) { out += c === "н" ? "ン" : "ッ"; continue; }
      if (n && n in V) {
        out += YO[n] && c !== "й" ? KANA[c][1].replace(/ィ$/, "") + YO[n] : KANA[c][V[n]];
        i++;
      } else out += LONE[c] || KANA[c][2];
    }
    return out || "アンナ";
  }

  // ---------- звук ----------
  let actx = null, master = null;
  function audio() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain(); master.gain.value = .9; master.connect(actx.destination);
      } catch { return null; }
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function bell() {
    const a = settings.sound && audio();
    if (!a) return;
    const t = a.currentTime;
    [[1, .5], [2.76, .25], [5.4, .12], [8.9, .05]].forEach(([k, g], i) => {
      const o = a.createOscillator(), v = a.createGain();
      o.type = "sine"; o.frequency.value = 1320 * k;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g * .35, t + .01);
      v.gain.exponentialRampToValueAtTime(.0001, t + 2.6 / (1 + i * .6));
      o.connect(v).connect(master); o.start(t); o.stop(t + 3);
    });
  }

  // «Лепет» как в Animal Crossing: каждый слог — короткий звук его гласной голосом персонажа.
  const VOWELS = {
    a: "あかさたなはまやらわがざだばぱゃぁアカサタナハマヤラワガザダバパャァаяАЯ",
    i: "いきしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィиыИЫ",
    u: "うくすつぬふむゆるぐずづぶぷゅぅウクスツヌフムユルグズヅブプュゥヴуюУЮ",
    e: "えけせてねへめれげぜでべぺぇエケセテネヘメレゲゼデベペェэеЭЕ",
    o: "おこそとのほもよろをごぞどぼぽょぉオコソトノホモヨロヲゴゾドボポョォоёОЁ",
    n: "んン",
  };
  const PURE = "あいうえおアイウエオаиуэоыяюеёАИУЭОЫЯЮЕЁ";
  const FORMANTS = { a: [800, 1250], i: [320, 2300], u: [360, 1400], e: [480, 1950], o: [520, 900], n: [260, 1100] };
  const vowelOf = (ch) => { for (const v in VOWELS) if (VOWELS[v].includes(ch)) return v; return null; };
  let noiseBuf = null;
  function blip(ch, voice) {
    const v = vowelOf(ch);
    const a = v && settings.voices && audio();
    if (!a) return;
    const t = a.currentTime + .005;
    const base = voice.pitch * (voice.flat ? 1 : 1 + (Math.random() - .5) * .16) * (v === "i" ? 1.08 : v === "e" ? 1.04 : 1);
    const dur = v === "n" ? .06 : .075;
    const o = a.createOscillator(); o.type = voice.wave;
    o.frequency.setValueAtTime(base * 1.06, t); o.frequency.exponentialRampToValueAtTime(base * .94, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    for (const f of FORMANTS[v]) {
      const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 5;
      o.connect(bp).connect(g);
    }
    o.connect(g); // немного «сырого» тона для звонкости
    g.connect(master); o.start(t); o.stop(t + dur + .02);
    if (!PURE.includes(ch) && v !== "n") { // согласная — крошечный шумовой щелчок
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * .03), a.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const n = a.createBufferSource(); n.buffer = noiseBuf;
      const hp = a.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
      const ng = a.createGain(); ng.gain.setValueAtTime(.06, t); ng.gain.exponentialRampToValueAtTime(.0001, t + .015);
      n.connect(hp).connect(ng).connect(master); n.start(t); n.stop(t + .02);
    }
  }

  // ---------- фон и персонажи ----------
  let bgFront = $("#bgA"), bgBack = $("#bgB"), curBg = null;
  function setBg(name, fx) {
    game.classList.toggle("sepia", fx === "sepia");
    game.classList.toggle("dim", fx === "dim");
    if (!name || name === curBg) return;
    curBg = name;
    bgBack.style.backgroundImage = `url("${IMG}bg/${name}.webp")`;
    bgBack.classList.add("on"); bgFront.classList.remove("on");
    [bgFront, bgBack] = [bgBack, bgFront];
  }
  const sprites = {};
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
    const n = Object.keys(sprites).length;
    for (const [w, el] of Object.entries(sprites)) {
      el.classList.toggle("dim", !!who && w !== who && n > 1);
      if (w === who) { el.classList.remove("talk"); void el.offsetWidth; el.classList.add("talk"); }
    }
  }
  function* flatSteps(steps) {
    for (const s of steps) {
      yield s;
      if (s.choice) for (const o of s.choice) if (o.then) yield* flatSteps(o.then);
      if (s.pick) for (const o of s.pick.options) if (o.reply) yield o.reply;
    }
  }
  function preload(ep) {
    const urls = new Set();
    for (const st of flatSteps(ep.steps)) {
      if (st.bg) urls.add(`${IMG}bg/${st.bg}.webp`);
      if (st.cast) for (const [w, [e]] of Object.entries(st.cast)) urls.add(`${IMG}chars/${w}/${e}.webp`);
      if (st.say && st.emo && CHARS[st.say] && !CHARS[st.say].voiceOnly) urls.add(`${IMG}chars/${st.say}/${st.emo}.webp`);
    }
    urls.forEach((u) => { const i = new Image(); i.src = u; });
  }

  // ---------- окно диалога ----------
  const dlg = $("#dialog"), nameTag = $("#nameTag"), lineJp = $("#lineJp");
  let typing = null, typingFinish = null, waiter = null;
  const log = [];

  function addChars(host, text, list) {
    for (const ch of text) { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; host.appendChild(s); list.push(s); }
  }
  function renderJp(text) {
    lineJp.className = ""; lineJp.textContent = "";
    const chars = [];
    for (const p of jpText(text).split(/(\[\[.+?\]\])/)) {
      if (!p) continue;
      const m = p.match(/^\[\[(.+)\]\]$/);
      if (m && window.WORDS[m[1]]) {
        const w = document.createElement("span"); w.className = "w"; w.dataset.w = m[1];
        lineJp.appendChild(w); addChars(w, m[1], chars); collect(m[1]);
      } else addChars(lineJp, m ? m[1] : p, chars);
    }
    return chars;
  }
  function renderPlain(text, cls) {
    lineJp.className = cls; lineJp.textContent = "";
    const chars = []; addChars(lineJp, text, chars); return chars;
  }
  function typeOut(chars, voice) {
    const delay = voice ? [70, 52, 36, 0][settings.speed] : [40, 24, 12, 0][settings.speed];
    dlg.classList.remove("done");
    return new Promise((res) => {
      let i = 0;
      const finish = () => {
        chars.forEach((c) => c.classList.add("v"));
        clearInterval(typing); typing = null; typingFinish = null;
        dlg.classList.add("done"); res();
      };
      if (!delay) return finish();
      typingFinish = finish;
      typing = setInterval(() => {
        if (i >= chars.length) return finish();
        const c = chars[i++]; c.classList.add("v");
        if (voice) blip(c.textContent, voice);
      }, delay);
    });
  }

  async function line(st) {
    const who = st.say || null;
    const ch = who && CHARS[who];
    dlg.hidden = false;
    let voice = null;
    if (st.player) {
      nameTag.hidden = false; nameTag.className = "player"; nameTag.textContent = player.kana;
      voice = { pitch: female() ? 390 : 200, wave: "triangle" };
    } else if (ch) {
      nameTag.hidden = false; nameTag.className = ch.voiceOnly ? "other" : ""; nameTag.textContent = st.who || ch.name;
      voice = ch.voice;
    } else nameTag.hidden = true;
    if (who && st.emo) setEmo(who, st.emo);
    focus(st.player ? null : who);
    let chars;
    if (st.jp) chars = renderJp(st.jp);
    else if (st.narr) { chars = renderPlain(ru(st.narr), "narr"); voice = null; }
    else chars = renderPlain(ru(st.ru), "ru");
    log.push({ who: st.player ? player.kana : st.narr ? "" : (st.who || (ch && ch.name) || ""), jp: st.jp ? plainJp(st.jp) : "", ru: st.jp ? "" : ru(st.narr || st.ru) });
    await typeOut(chars, voice);
    await waitClick();
  }
  function waitClick() { return new Promise((res) => { waiter = res; }); }
  function advance() {
    if (!$("#wordCard").hidden) { $("#wordCard").hidden = true; return; }
    if (typing && typingFinish) { typingFinish(); return; }
    if (waiter) { const w = waiter; waiter = null; w(); }
  }

  dlg.addEventListener("click", (e) => {
    const w = e.target.closest(".w");
    if (w && dlg.classList.contains("done")) { e.stopPropagation(); wordCard(w.dataset.w); return; }
    advance();
  });

  // ---------- подсказки к трудным словам ----------
  function collect(w) {
    if (!window.WORDS[w] || collected.has(w)) return;
    collected.add(w); store.set(WORDS_KEY, [...collected]);
  }
  function wordCard(w) {
    const d = window.WORDS[w]; if (!d) return;
    const c = $("#wordCard");
    c.innerHTML = `<div class="wc-jp" lang="ja"></div><div class="wc-ru"></div>`;
    c.querySelector(".wc-jp").textContent = w;
    c.querySelector(".wc-ru").textContent = d.hint;
    c.onclick = () => { c.hidden = true; };
    c.hidden = false;
  }

  // ---------- выборы и мини-задания ----------
  let keyChoice = null;
  function choose(options) {
    const box = $("#choices"); box.innerHTML = ""; box.hidden = false;
    focus(null);
    return new Promise((res) => {
      options.forEach((o, i) => {
        const b = document.createElement("button");
        b.innerHTML = `<span class="k">${i + 1}</span><span class="jp" lang="ja"></span>`;
        b.querySelector(".jp").textContent = plainJp(o.jp);
        b.style.animationDelay = i * 70 + "ms";
        b.onclick = (e) => { e.stopPropagation(); box.hidden = true; keyChoice = null; res(o); };
        box.appendChild(b);
      });
      keyChoice = (n) => { const b = box.children[n]; if (b) b.click(); };
      box.firstChild.focus({ preventScroll: true });
    });
  }

  async function pick(p) {
    const box = $("#pick");
    const tried = new Set();
    for (;;) {
      dlg.hidden = true;
      box.className = p.signs ? "signs" : "";
      box.innerHTML = `<div class="p-prompt"></div>${p.big ? '<div class="p-big" lang="ja"></div>' : ""}<div class="p-opts"></div>`;
      box.querySelector(".p-prompt").textContent = ru(p.prompt);
      if (p.big) box.querySelector(".p-big").textContent = p.big;
      box.hidden = false;
      const [o, i] = await new Promise((res) => {
        p.options.forEach((o, i) => {
          const b = document.createElement("button");
          b.textContent = o.t; if (/[ぁ-ヿ]/.test(o.t)) b.lang = "ja";
          if (tried.has(i)) { b.classList.add("no"); b.disabled = true; }
          b.onclick = (e) => { e.stopPropagation(); keyChoice = null; res([o, i]); };
          box.querySelector(".p-opts").appendChild(b);
        });
        keyChoice = (n) => { const b = box.querySelectorAll(".p-opts button")[n]; if (b && !b.disabled) b.click(); };
      });
      box.hidden = true;
      if (o.ok) return;
      tried.add(i);
      if (o.reply) await exec(o.reply);
    }
  }

  function signCard(c) {
    const el = $("#signCard");
    el.innerHTML = `<div class="s-jp" lang="ja"></div>`;
    el.querySelector(".s-jp").textContent = plainJp(c.jp);
    el.hidden = false;
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
    { t: "ベラさんへ。" },
    { t: "お元気ですか。わたしは 元気です。" },
    { t: "さくらざかは いま、はるです。" },
    { t: "じんじゃの さくらが とても きれいです。" },
    { t: "この すずを もっていて ください。", blur: true },
    { t: "いつか また、あの さくらの 下で……", blur: true },
    { t: "はな より", blur: true, sign: true },
  ];
  function showLetter() {
    const paper = $("#letter .paper"); paper.innerHTML = "";
    for (const r of LETTER) {
      const p = document.createElement("p");
      p.textContent = r.t;
      if (r.blur) p.classList.add("blur");
      if (r.sign) p.classList.add("sign");
      paper.appendChild(p);
    }
    const el = $("#letter"); el.hidden = false;
    return new Promise((res) => { el.onclick = () => { el.hidden = true; res(); }; });
  }

  // ---------- исполнение сценария ----------
  let ep = null, stack = [], hearts = {}, topIdx = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    if (st.pick) return pick(st.pick);
    if (st.letter) { dlg.hidden = true; return showLetter(); }
    if (st.end) return ending();
    if (st.choice) return choice(st);
    if (st.say || st.narr) return line(st);
  }

  function addHeart(who) {
    hearts[who] = (hearts[who] || 0) + 1;
    toast(`♥ <span lang="ja">${CHARS[who].name}</span>`);
  }

  async function choice(st) {
    const o = await choose(st.choice);
    await line({ player: true, jp: o.jp });
    if (o.heart) addHeart(o.heart);
    if (o.then) await runSteps(o.then);
    if (o.oops) {
      // неловкий вариант: герой поправляется сам
      const fix = st.choice.find((x) => x.fix) || st.choice.find((x) => !x.oops);
      await line({ narr: "Ой. То есть…" });
      await line({ player: true, jp: fix.jp });
      if (fix.then) await runSteps(fix.then);
    }
  }

  async function runSteps(steps) {
    stack.push({ steps, i: 0 });
    const fr = stack[stack.length - 1];
    while (fr.i < fr.steps.length && !(stack[0] && stack[0].ended)) await exec(fr.steps[fr.i++]);
    stack.pop();
  }

  function doSave() {
    save = { ep: ep.id, idx: topIdx, player, hearts, at: Date.now() };
    store.set(SAVE, save);
  }

  async function play(fromIdx = 0) {
    ep = window.EPISODES[1];
    preload(ep);
    hideScreens();
    $("#hud").hidden = false;
    curBg = null; setCast({});
    let bg = null, fx = null, cast = {};
    for (let i = 0; i < fromIdx; i++) {
      const s = ep.steps[i];
      if (s.bg) bg = s.bg;
      if (s.fx !== undefined) fx = s.fx;
      else if (s.scene !== undefined && s.bg) fx = null;
      if (s.cast) cast = s.cast;
    }
    if (bg) setBg(bg, fx);
    setCast(cast);
    topIdx = fromIdx;
    stack = [{ steps: ep.steps, i: fromIdx }];
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
    hideScreens();
    $("#hud").hidden = true; dlg.hidden = true; $("#choices").hidden = true; $("#pick").hidden = true; $("#signCard").hidden = true;
    if (typingFinish) typingFinish();
    waiter = null;
    if (stack[0]) stack[0].ended = true;
    setCast({});
    save = store.get(SAVE, null);
    $("#tCont").hidden = !save;
    if (save) $("#tContSub").textContent = `Продолжить · ${save.player.name}`;
    $("#title").hidden = false;
  }
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

  // ---------- окна ----------
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
    if (!ws.length) box.innerHTML = `<p class="muted">Здесь собираются подсказки к трудным словам, которые встретились в истории.</p>`;
    else {
      const g = document.createElement("div"); g.className = "words";
      for (const w of ws) {
        const d = window.WORDS[w];
        const it = document.createElement("div"); it.className = "word" + (d.secret ? " secret" : "");
        it.innerHTML = `<div class="wj" lang="ja"></div><div class="wm"></div>`;
        it.querySelector(".wj").textContent = w; it.querySelector(".wm").textContent = d.hint;
        g.appendChild(it);
      }
      box.appendChild(g);
    }
    openModal("Трудные слова", box);
  }
  function openLog() {
    const box = document.createElement("div");
    for (const l of log.slice(-80)) {
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
    row("Голоса персонажей", seg([[true, "вкл"], [false, "выкл"]], settings.voices, (v) => { settings.voices = v; if (v) { audio(); blip("あ", CHARS.sakura.voice); } }));
    row("Звуки", seg([[true, "вкл"], [false, "выкл"]], settings.sound, (v) => { settings.sound = v; }));
    row("Скорость текста", seg([[0, "медленно"], [1, "обычно"], [2, "быстро"], [3, "сразу"]], settings.speed, (v) => { settings.speed = v; }));
    openModal("Настройки", box);
  }
  function openMenu() {
    const box = document.createElement("div"); box.className = "menu-list";
    const add = (label, fn, cls = "ghost") => { const b = document.createElement("button"); b.className = cls; b.textContent = label; b.onclick = fn; box.appendChild(b); };
    add("Продолжить", () => { modal.hidden = true; }, "primary");
    add("Письмо Ханы", () => { modal.hidden = true; showLetter(); });
    add("Трудные слова", openWords);
    add("История реплик", openLog);
    add("Настройки", openSettings);
    add("В главное меню (прогресс сохранён на начале сцены)", () => { modal.hidden = true; showTitle(); });
    openModal("Меню", box);
  }
  $("#btnMenu").onclick = (e) => { e.stopPropagation(); openMenu(); };
  $("#btnLog").onclick = (e) => { e.stopPropagation(); openLog(); };

  // ---------- клавиатура и клики ----------
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
  game.addEventListener("click", (e) => {
    if (e.target.closest("button, #dialog, #choices, #pick, .overlay, .screen, #wordCard, #signCard")) return;
    if (!$("#hud").hidden) advance();
  });

  showTitle();
})();
