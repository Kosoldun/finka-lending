/* ФИНКА — шапка и мобильное меню. Работает на всех страницах. */
(() => {
  'use strict';
  const header = document.getElementById('siteHeader');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('siteNav');

  if (header) {
    const setHeader = () => header.classList.toggle('scrolled', window.scrollY > 10);
    setHeader();
    window.addEventListener('scroll', setHeader, { passive: true });
  }

  if (burger && nav) {
    const closeNav = () => {
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
    };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
    document.addEventListener('click', e => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();