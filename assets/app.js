/* ============================================================
   Кейс БСПБ — динамика страницы
   Прелоадер, прогресс чтения, появление блоков, счётчики,
   параллакс, мини-игра «город или банк?», лайтбокс.
   Без библиотек. Учитывает prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- прелоадер ---------- */
  var preloader = $('#preloader');
  function hidePreloader() {
    if (preloader) preloader.classList.add('is-done');
  }
  window.addEventListener('load', function () { setTimeout(hidePreloader, 350); });
  setTimeout(hidePreloader, 2500); // страховка

  /* ---------- параллакс: лёгкий сдвиг кадров ---------- */
  var parallaxItems = [];

  function collectParallax() {
    parallaxItems = $$('[data-parallax]').map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.08 };
    });
    var heroShot = $('.hero__shot img');
    if (heroShot) parallaxItems.push({ el: heroShot, speed: 0.03, scale: true });
  }

  function paintParallax(y) {
    if (reduceMotion) return;
    parallaxItems.forEach(function (item) {
      var rect = item.el.getBoundingClientRect();
      var center = rect.top + rect.height / 2 - window.innerHeight / 2;
      var shift = -center * item.speed;
      if (item.scale) {
        var p = Math.min(1, Math.max(0, (y - 200) / 900));
        item.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0) scale(' + (1 + p * 0.045).toFixed(4) + ')';
      } else {
        item.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      }
    });
  }

  /* ---------- прогресс чтения, шапка, кнопка «наверх» ---------- */
  var progress = $('#progress');
  var topbar = $('#topbar');
  var totop = $('#totop');
  var ticking = false;

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var y = window.scrollY || doc.scrollTop;

    if (progress) progress.style.width = Math.min(100, Math.max(0, max > 0 ? (y / max) * 100 : 0)) + '%';
    if (topbar) topbar.classList.toggle('is-scrolled', y > 20);
    if (totop) totop.classList.toggle('is-visible', y > 600);

    paintParallax(y);
    checkMissedReveals();
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ---------- счётчики ---------- */
  function countUp(el, instant) {
    if (el.dataset.counted === '1') return;
    el.dataset.counted = '1';

    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var format = function (value) {
      return value.toLocaleString('ru-RU').replace(/\u00A0/g, ' ') + suffix;
    };

    if (instant || reduceMotion) { el.textContent = format(target); return; }

    var duration = 1100;
    var start = performance.now();

    (function step(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(target * eased));
      if (t < 1) window.requestAnimationFrame(step);
    })(start);
  }

  /* ---------- появление блоков при скролле ---------- */
  var revealSelector = '[data-reveal], .fact, .shot, .tasks, .step';
  var revealTargets = [];

  function markShown(el, instant) {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    var counter = el.hasAttribute('data-count') ? el : $('[data-count]', el);
    if (counter) countUp(counter, instant);
  }

  // страховка: если блок «проскочил» мимо наблюдателя при быстрой прокрутке
  function checkMissedReveals() {
    if (!revealTargets.length) return;
    revealTargets.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      if (el.getBoundingClientRect().bottom < 40) markShown(el, true);
    });
  }

  revealTargets = $$(revealSelector);

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { markShown(el, true); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        markShown(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealTargets.forEach(function (el, i) {
      if (!el.style.getPropertyValue('--delay')) el.style.setProperty('--delay', (i % 6) * 0.04 + 's');
      observer.observe(el);
    });
  }

  /* ---------- кнопка «наверх» ---------- */
  if (totop) {
    totop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- подсветка активного раздела в шапке ---------- */
  var navLinks = $$('.nav a[href^="#"]');
  var navSections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);

  function markActive() {
    if (!navSections.length) return;
    var offset = window.scrollY + 220;
    var current = navSections[0];
    navSections.forEach(function (section) { if (section.offsetTop <= offset) current = section; });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', current && a.getAttribute('href') === '#' + current.id);
    });
  }

  window.addEventListener('scroll', markActive, { passive: true });

  /* ---------- «пятна» в hero следуют за курсором ---------- */
  var hero = $('#hero');
  if (hero && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    var shapes = $$('.hero__shapes .orb');
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      var dx = (e.clientX - rect.left) / rect.width - 0.5;
      var dy = (e.clientY - rect.top) / rect.height - 0.5;
      shapes.forEach(function (el, i) {
        var k = (i + 1) * 9;
        el.style.marginLeft = (dx * k).toFixed(1) + 'px';
        el.style.marginTop = (dy * k).toFixed(1) + 'px';
      });
    });
  }

  /* ---------- лайтбокс для кадров ---------- */
  var lightbox = $('#lightbox');
  if (lightbox) {
    var lightboxImg = lightbox.querySelector('img');
    var closeLightbox = function () {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (lightboxImg) lightboxImg.removeAttribute('src');
    };

    $$('.shot img, .hero__shot img').forEach(function (img) {
      img.addEventListener('click', function () {
        lightboxImg.src = img.currentSrc || img.src;
        lightboxImg.alt = img.alt || 'Скриншот сайта';
        lightbox.classList.add('is-open');
        document.body.classList.add('is-locked');
      });
    });

    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  /* ---------- мини-игра «город или банк?» ---------- */
  var QUIZ = [
    {
      q: '«Белые ночи» начинаются в конце мая и длятся почти до июля.',
      a: 'city',
      hint: 'Это город: период белых ночей в Санкт-Петербурге начинается в конце мая.'
    },
    {
      q: 'Основан в 1990 году и входит в топ-15 российских банков по объёму активов.',
      a: 'bank',
      hint: 'Это банк: БСПБ работает с 1990 года и входит в топ-15 банков России по активам.'
    },
    {
      q: 'Главный офис — историческое здание, которое называют городской достопримечательностью.',
      a: 'bank',
      hint: 'И это тоже банк: главный офис БСПБ считают одной из достопримечательностей города.'
    }
  ];

  var quiz = $('#quiz');
  if (quiz) {
    var qText = $('#quizQ');
    var qFeedback = $('#quizFeedback');
    var qScore = $('#quizScore');
    var qVerdict = $('#quizVerdict');
    var qDots = $$('#quizDots i');
    var qOptions = $$('.quiz__opt', quiz);
    var qStep = 0;
    var qRight = 0;
    var qLocked = false;

    function renderQuestion() {
      var item = QUIZ[qStep];
      qText.textContent = item.q;
      qFeedback.textContent = '';
      qOptions.forEach(function (btn) {
        btn.classList.remove('is-right', 'is-wrong');
        btn.disabled = false;
      });
      qDots.forEach(function (dot, i) { dot.classList.toggle('is-done', i < qStep); });
      qLocked = false;
    }

    function finish() {
      quiz.classList.add('is-finished');
      qScore.textContent = qRight;
      qVerdict.textContent = qRight === 3
        ? 'Вы знаете и город, и банк. На карьерном сайте викторина длиннее — и с призом за прохождение.'
        : qRight === 2
          ? 'Хороший результат. На сайте викторина продолжается — с чек-листом по резюме в подарок.'
          : 'Есть что узнать: на карьерном сайте утверждений больше, а за прохождение дают чек-лист по резюме.';
    }

    function answer(choice) {
      if (qLocked) return;
      qLocked = true;

      var item = QUIZ[qStep];
      var isRight = choice === item.a;
      if (isRight) qRight += 1;

      qOptions.forEach(function (btn) {
        btn.disabled = true;
        if (btn.getAttribute('data-answer') === item.a) btn.classList.add('is-right');
        else if (btn.getAttribute('data-answer') === choice) btn.classList.add('is-wrong');
      });

      qFeedback.innerHTML = '<b>' + (isRight ? 'Верно!' : 'Почти.') + '</b> ' + item.hint;
      qDots.forEach(function (dot, i) { dot.classList.toggle('is-done', i <= qStep); });

      qStep += 1;
      setTimeout(function () {
        if (qStep < QUIZ.length) renderQuestion();
        else finish();
      }, isRight ? 1200 : 1900);
    }

    qOptions.forEach(function (btn) {
      btn.addEventListener('click', function () { answer(btn.getAttribute('data-answer')); });
    });

    var quizRestart = $('#quizRestart');
    if (quizRestart) {
      quizRestart.addEventListener('click', function () {
        qStep = 0; qRight = 0; qLocked = false;
        quiz.classList.remove('is-finished');
        renderQuestion();
      });
    }

    renderQuestion();
  }

  /* ---------- инициализация ---------- */
  collectParallax();
  onScroll();
  markActive();
})();
