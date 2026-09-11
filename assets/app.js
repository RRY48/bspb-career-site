/* Кейс БСПБ — интерактив: прогресс чтения, появление блоков, лайтбокс */
(function () {
  'use strict';

  /* прогресс чтения */
  var progress = document.getElementById('progress');
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var value = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = Math.min(100, Math.max(0, value)) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* подсветка активного раздела в навигации по кейсу */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.caselinks a[href^="#"]'));
  var navSections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function updateActiveSection() {
    var offset = window.scrollY + 200;
    var current = navSections[0];
    navSections.forEach(function (section) {
      if (section.offsetTop <= offset) current = section;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', current && a.getAttribute('href') === '#' + current.id);
    });
  }
  window.addEventListener('scroll', updateActiveSection, { passive: true });
  updateActiveSection();

  /* плавное появление блоков */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* лайтбокс по клику на скриншот */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = lightbox.querySelector('img');

  document.querySelectorAll('.shot img').forEach(function (img) {
    img.addEventListener('click', function () {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || 'Скриншот сайта';
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
  });
})();
