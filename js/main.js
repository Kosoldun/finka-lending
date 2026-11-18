/* ФИНКА — интерактив главной страницы: анимации, FAQ, калькулятор, форма заявки. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EMAIL = 'finka06@bk.ru';
  const MAX_PHONE = '+79082124366';
  let currentMessage = '';

  /* подсветка активного раздела в меню */
  const spyLinks = $$('#siteNav a[href^="#"]');
  const spyMap = new Map(spyLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        spyLinks.forEach(a => a.classList.remove('active'));
        const link = spyMap.get(en.target.id);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  spyMap.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* появление блоков при прокрутке */
  const rev = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(el => rev.observe(el));

  /* анимация цифр — ИСПРАВЛЕНО: отсчёт от первого кадра, прогресс зажат в 0…1 */
  const animateCount = el => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (reduced) { el.textContent = String(target); return; }
    const duration = 1100;
    let zero;
    const tick = ts => {
      if (zero === undefined) zero = ts;
      const p = Math.max(0, Math.min(1, (ts - zero) / duration));
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  };
  const counterObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { animateCount(en.target); counterObs.unobserve(en.target); } });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => counterObs.observe(el));

  /* параллакс карточек — ИСПРАВЛЕНО: исходный наклон сохраняется */
  const floats = $$('[data-speed]').map(el => {
    let angle = 0;
    try {
      const t = getComputedStyle(el).transform;
      if (t && t !== 'none') {
        const m = new DOMMatrixReadOnly(t);
        angle = Math.atan2(m.b, m.a) * 180 / Math.PI;
      }
    } catch (_) { angle = 0; }
    return { el, speed: Number(el.dataset.speed) || 0, angle };
  });
  if (!reduced && floats.length) {
    let ticking = false;
    const move = () => {
      const y = window.scrollY;
      floats.forEach(f => {
        f.el.style.transform = `translateY(${(y * f.speed).toFixed(2)}px) rotate(${f.angle.toFixed(2)}deg)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(move); ticking = true; }
    }, { passive: true });
  }

  /* всплывающие подсказки */
  const toastEl = $('#toast');
  let toastTimer = 0;
  const toast = message => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2800);
  };

  /* копирование в буфер обмена */
  const fallbackCopy = text => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove();
    return ok;
  };
  const copyText = text => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  };

  /* вопросы и ответы */
  const faqItems = $$('.faq-item');
  faqItems.forEach(item => {
    const btn = $('.faq-q', item), panel = $('.faq-a', item);
    btn.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
    });
  });
  window.addEventListener('resize', () => {
    faqItems.forEach(item => {
      const panel = $('.faq-a', item);
      if (item.classList.contains('open')) panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });

  /* калькулятор объёма */
  const calc = { segment: 'ip', docs: 40, staff: 2, recovery: false, hr: false, ndfl: false, deduction: 'property' };
  const segInputs = $$('input[name="segment"]');
  const docsRange = $('#docsRange'), docsOut = $('#docsOut');
  const staffVal = $('#staffVal'), bizBlock = $('#bizControls'), physBlock = $('#physControls');
  const deductionSelect = $('#deductionSelect');
  const calcProfile = $('#calcProfile'), calcRows = $('#calcRows'), volumeBadge = $('#volumeBadge');
  const segLabel = { ip: 'ИП', ooo: 'ООО', phys: 'Физлицо' };
  const dedLabel = { property: 'имущественный (жильё)', social: 'социальный (лечение, обучение)', multi: 'несколько вычетов' };

  const volume = () => {
    if (calc.segment === 'phys') return { text: 'Разовая услуга', cls: 'vol-s' };
    if (calc.docs <= 50) return { text: 'Небольшой объём', cls: 'vol-s' };
    if (calc.docs <= 150) return { text: 'Средний объём', cls: 'vol-m' };
    return { text: 'Значительный объём', cls: 'vol-l' };
  };
  const renderCalc = () => {
    const docsLabel = calc.docs >= 300 ? '300+' : String(calc.docs);
    docsOut.textContent = docsLabel;
    staffVal.textContent = String(calc.staff);
    bizBlock.hidden = calc.segment === 'phys';
    physBlock.hidden = calc.segment !== 'phys';
    const p = (calc.docs / 300) * 100;
    docsRange.style.background = `linear-gradient(90deg, var(--green) ${p}%, var(--line) ${p}%)`;
    const v = volume();
    volumeBadge.textContent = v.text;
    volumeBadge.className = 'volume ' + v.cls;
    calcProfile.textContent = `${segLabel[calc.segment]} · ${v.text.toLowerCase()}`;
    if (calc.segment === 'phys') {
      calcRows.innerHTML = `<div class="s-row"><span>Услуга</span><b>Декларация 3-НДФЛ</b></div><div class="s-row"><span>Вычет</span><b>${dedLabel[calc.deduction]}</b></div>`;
    } else {
      const extras = [calc.recovery && 'восстановление', calc.hr && 'кадры', calc.ndfl && '3-НДФЛ'].filter(Boolean).join(', ') || '—';
      calcRows.innerHTML = `<div class="s-row"><span>Документы</span><b>~${docsLabel} в месяц</b></div><div class="s-row"><span>Сотрудники</span><b>${calc.staff}</b></div><div class="s-row"><span>Дополнительно</span><b>${extras}</b></div>`;
    }
  };
  const calcComment = () => {
    if (calc.segment === 'phys') return `Физлицо. Нужна декларация 3-НДФЛ: ${dedLabel[calc.deduction]}. Прошу сообщить стоимость и список документов.`;
    const docsLabel = calc.docs >= 300 ? '300+' : String(calc.docs);
    const extras = [calc.recovery && 'восстановление учёта', calc.hr && 'кадровый учёт', calc.ndfl && 'декларация 3-НДФЛ'].filter(Boolean);
    return `${segLabel[calc.segment]}. Предварительный объём: ~${docsLabel} документов в месяц; сотрудников: ${calc.staff}. Дополнительно: ${extras.length ? extras.join(', ') : 'не требуется'}. Прошу рассчитать стоимость обслуживания.`;
  };
  segInputs.forEach(input => input.addEventListener('change', () => { calc.segment = input.value; renderCalc(); }));
  docsRange.addEventListener('input', () => { calc.docs = Number(docsRange.value); renderCalc(); });
  $('#staffMinus').addEventListener('click', () => { calc.staff = Math.max(0, calc.staff - 1); renderCalc(); });
  $('#staffPlus').addEventListener('click', () => { calc.staff = Math.min(50, calc.staff + 1); renderCalc(); });
  $('#optRecovery').addEventListener('change', e => { calc.recovery = e.target.checked; renderCalc(); });
  $('#optHr').addEventListener('change', e => { calc.hr = e.target.checked; renderCalc(); });
  $('#optNdfl').addEventListener('change', e => { calc.ndfl = e.target.checked; renderCalc(); });
  deductionSelect.addEventListener('change', () => { calc.deduction = deductionSelect.value; renderCalc(); });
  $('#calcReset').addEventListener('click', () => {
    Object.assign(calc, { segment: 'ip', docs: 40, staff: 2, recovery: false, hr: false, ndfl: false, deduction: 'property' });
    segInputs.forEach(i => { i.checked = i.value === 'ip'; });
    docsRange.value = '40';
    $('#optRecovery').checked = false; $('#optHr').checked = false; $('#optNdfl').checked = false;
    deductionSelect.value = 'property';
    renderCalc();
    toast('Параметры сброшены');
  });

  /* переход к форме с готовым комментарием */
  const form = $('#leadForm'), success = $('#leadSuccess');
  const showForm = () => { success.hidden = true; form.hidden = false; };
  const goToForm = comment => {
    if (comment) $('#message').value = comment;
    showForm();
    $('#contact').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => $('#name').focus({ preventScroll: true }), reduced ? 0 : 650);
    if (comment) toast('Данные перенесены в заявку — добавьте имя и контакт');
  };
  $('#calcTransfer').addEventListener('click', () => goToForm(calcComment()));
  $$('[data-service]').forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    goToForm(`Интересует услуга: ${link.dataset.service}.`);
  }));

  /* проверка формы и формирование заявки */
  const setError = (id, message) => {
    const input = $('#' + id), err = $('#err-' + (id === 'contactInput' ? 'contact' : id));
    if (input) { input.classList.add('invalid'); input.setAttribute('aria-invalid', 'true'); }
    if (err) err.textContent = message;
  };
  const clearErrors = () => {
    $$('.invalid').forEach(el => { el.classList.remove('invalid'); el.removeAttribute('aria-invalid'); });
    $$('.field-error').forEach(el => { el.textContent = ''; });
  };
  ['name', 'contactInput', 'consent'].forEach(id => {
    $('#' + id).addEventListener('input', () => {
      $('#' + id).classList.remove('invalid');
      $('#' + id).removeAttribute('aria-invalid');
      const errId = id === 'contactInput' ? 'err-contact' : 'err-' + id;
      $('#' + errId).textContent = '';
    });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors();
    if ($('#website').value.trim()) return;
    const name = $('#name').value.trim();
    const contact = $('#contactInput').value.trim();
    const message = $('#message').value.trim();
    const consent = $('#consent').checked;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const phoneDigits = contact.replace(/\D/g, '');
    const isPhone = /^[+\d]/.test(contact) && phoneDigits.length >= 10 && phoneDigits.length <= 15;
    let ok = true;
    if (name.length < 2) { setError('name', 'Укажите имя'); ok = false; }
    if (!isEmail && !isPhone) { setError('contactInput', 'Укажите корректный телефон или email'); ok = false; }
    if (!consent) { setError('consent', 'Нужно согласие на обработку данных'); ok = false; }
    if (!ok) { const first = $('.invalid'); if (first) first.focus(); return; }
    currentMessage = `Заявка с сайта ФИНКА\nИмя: ${name}\nКонтакт: ${contact}\n${message ? 'Комментарий: ' + message : ''}`.trim();
    $('#successPreview').textContent = currentMessage;
    $('#sendEmail').href = `mailto:${EMAIL}?subject=${encodeURIComponent('Заявка с сайта ФИНКА')}&body=${encodeURIComponent(currentMessage)}`;
    form.hidden = true;
    success.hidden = false;
    toast('Заявка готова — выберите канал отправки');
  });
  $('#editLead').addEventListener('click', showForm);
  $('#copyMsg').addEventListener('click', () => {
    copyText(currentMessage).then(ok => toast(ok ? 'Текст заявки скопирован' : 'Не удалось скопировать — выделите текст вручную'));
  });
  $('#sendTg').addEventListener('click', () => {
    copyText(currentMessage).then(() => toast('Текст скопирован — вставьте его в чат Telegram'));
  });
  const maxAction = () => {
    const payload = currentMessage ? `${currentMessage}\n\nНаш контакт в MAX: ${MAX_PHONE}` : MAX_PHONE;
    copyText(payload).then(() => toast(currentMessage ? 'Текст скопирован — вставьте в чат MAX' : 'Номер скопирован — найдите нас в MAX'));
  };
  $('#sendMax').addEventListener('click', maxAction);
  $('#maxDirect').addEventListener('click', maxAction);

  /* плавающая кнопка на телефоне */
  const mobileCta = $('#mobileCta');
  let pastHero = false, inContact = false;
  const updateMobileCta = () => mobileCta.classList.toggle('show', pastHero && !inContact);
  new IntersectionObserver(entries => { pastHero = !entries[0].isIntersecting; updateMobileCta(); }, { threshold: 0.08 }).observe($('#hero'));
  new IntersectionObserver(entries => { inContact = entries[0].isIntersecting; updateMobileCta(); }, { threshold: 0.12 }).observe($('#contact'));

  renderCalc();
})();
