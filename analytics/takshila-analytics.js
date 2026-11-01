/*!
 * Takshila analytics — GA4 event tracking.
 * Event names, parameters and key events are documented in analytics/TRACKING_PLAN.md.
 *
 * Setup: put your GA4 Measurement ID in the page head, before this script:
 *   <meta name="ga-measurement-id" content="G-XXXXXXXXXX">
 * Without an ID the script runs in debug mode: events are logged to the console and
 * pushed to window.dataLayer, but nothing is sent to Google.
 *
 * The script finds elements using the current markup's class names. When the
 * production templates change, update the selectors in RULES below.
 */
(function () {
  'use strict';
  if (window.__takshilaAnalytics) return;
  window.__takshilaAnalytics = true;

  var meta = document.querySelector('meta[name="ga-measurement-id"]');
  var GA_ID = (meta && meta.content) || window.TAKSHILA_GA_ID || '';
  var LIVE = /^G-[A-Z0-9]+$/.test(GA_ID);
  var DEBUG = !LIVE || /[?&]ga_debug=1/.test(location.search);
  var CURRENCY = 'USD';

  /* ---------- gtag bootstrap + Consent Mode v2 ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Ads signals off everywhere; analytics storage denied by default in EEA/UK/CH
  // until a consent banner calls gtag('consent','update',{analytics_storage:'granted'}).
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'granted'
  });
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']
  });

  var PAGE_TYPE = document.body && document.body.dataset.pageType ||
    (document.getElementById('studio') ? 'home' : document.querySelector('.journey') ? 'how_it_works' : 'other');

  gtag('js', new Date());
  if (LIVE) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('config', GA_ID, { content_group: PAGE_TYPE, page_type: PAGE_TYPE, debug_mode: DEBUG || undefined });
  }

  /* ---------- helpers ---------- */
  function track(name, params) {
    params = params || {};
    params.page_type = PAGE_TYPE;
    gtag('event', name, params);
    if (DEBUG && window.console) console.debug('[analytics]', name, params);
  }
  window.takshilaTrack = track; // for manual calls from other scripts

  function txt(el) { return (el && (el.getAttribute('aria-label') || el.textContent) || '').replace(/[→↑✦]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100); }
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  function price(el) { var m = txt(el).replace(/,/g, '').match(/[\d.]+/); return m ? +m[0] : undefined; }

  function sectionOf(el) {
    var sec = el.closest('section, header, footer, .fab');
    if (!sec) return 'other';
    if (sec.matches('header')) return 'header';
    if (sec.matches('footer')) return 'footer';
    if (sec.matches('.fab')) return 'floating_button';
    if (sec.dataset.analyticsSection) return sec.dataset.analyticsSection;
    if (sec.id) return sec.id === 'event' ? 'halloween' : sec.id === 'why' ? 'why_takshila' : sec.id;
    if (sec.classList.contains('hero')) return 'hero';
    if (sec.classList.contains('why')) return 'why_takshila';
    if (sec.classList.contains('trust')) return 'trust';
    if (sec.classList.contains('review')) return 'reviews';
    return slug(txt(sec.querySelector('h2') || sec.querySelector('.eyebrow'))) || 'other';
  }

  // GA4 item-list name for the product grid that contains el.
  function listOf(el) {
    var grid = el.closest('.grid4, .grid5, #gifts, #engs');
    if (!grid) return sectionOf(el);
    if (grid.id === 'gifts') {
      var t = document.querySelector('#giftTabs .tab.on');
      return 'gift_edit_' + slug(txt(t));
    }
    if (grid.id === 'engs') {
      var e = document.querySelector('#engTabs .ttab.on');
      return 'engagement_' + slug(txt(e));
    }
    return sectionOf(grid);
  }

  function itemFromCard(card, index) {
    var name = txt(card.querySelector('.nm'));
    var tag = card.querySelector('.tag');
    return {
      item_id: slug(name),
      item_name: name,
      item_variant: txt(card.querySelector('.mt')) || undefined,
      item_category: inferCategory(name),
      item_list_name: listOf(card),
      index: index,
      price: price(card.querySelector('.pr')),
      promotion_name: tag ? txt(tag) : undefined,
      quantity: 1
    };
  }
  function inferCategory(n) {
    n = (n || '').toLowerCase();
    var map = [['ring','rings'],['band','rings'],['solitaire','rings'],['stud','earrings'],['hoop','earrings'],['drop','earrings'],['huggie','earrings'],
      ['pendant','pendants'],['lariat','necklaces'],['necklace','necklaces'],['bracelet','bracelets'],['cuff','bracelets'],['charm','charms'],['set','sets']];
    for (var i = 0; i < map.length; i++) if (n.indexOf(map[i][0]) > -1) return map[i][1];
    return undefined;
  }
  function indexIn(el, sel) { var p = el.parentNode; return p ? Array.prototype.indexOf.call(p.querySelectorAll(sel), el) : 0; }

  /* ---------- click rules: first matching rule wins ---------- */
  var RULES = [
    // Ignore the design-review overlay (not part of the real site)
    ['#demo', function () {}],

    // Wishlist heart sits inside the product link: fire wishlist only
    ['.pc .heart', function (el) {
      var card = el.closest('.pc'); var item = itemFromCard(card, indexIn(card, '.pc'));
      track('add_to_wishlist', { currency: CURRENCY, value: item.price, items: [item] });
    }],
    ['.pc', function (el) {
      var item = itemFromCard(el, indexIn(el, '.pc'));
      track('select_item', { item_list_id: slug(item.item_list_name), item_list_name: item.item_list_name, items: [item] });
    }],
    ['.cat', function (el) {
      track('category_select', { category: txt(el.querySelector('.n')), index: indexIn(el, '.cat'), section: 'shop_by_category' });
    }],
    ['[data-scroll]', function (el) {
      track('carousel_scroll', { direction: +el.dataset.scroll > 0 ? 'next' : 'previous', section: sectionOf(el) });
    }],

    // AI Design Studio funnel
    ['.prompt .btn', function (el) { track('design_generate', { location: sectionOf(el) }); }],
    ['.prompt .add, .upload', function (el) { track('design_upload_click', { location: sectionOf(el) }); }],
    ['.chip', function (el) { track('design_prompt_suggestion', { prompt: txt(el), section: sectionOf(el) }); }],
    ['a[href="#studio"]', function (el) { track('design_start', { location: sectionOf(el), cta_text: txt(el) }); }],

    // Tabs
    ['#giftTabs .tab', function (el) { track('tab_select', { tab_group: 'gift_edit', tab: txt(el) }); }],
    ['#engTabs .ttab', function (el) { track('tab_select', { tab_group: 'engagement', tab: txt(el) }); }],

    // Halloween campaign
    ['#lights', function (el) {
      // we listen in the capture phase, before the page flips aria-pressed: read it next tick
      setTimeout(function () { track('halloween_lights_toggle', { lights_off: el.getAttribute('aria-pressed') === 'true' }); }, 0);
    }],
    ['.pk', function (el) { track('halloween_pumpkin_pick', { pumpkin: indexIn(el, '.pk') + 1 }); }],

    // Header icons
    ['header .icon-btn', function (el) {
      var a = slug(el.getAttribute('aria-label'));
      track(a === 'cart' ? 'view_cart' : a === 'search' ? 'search_open' : a === 'menu' ? 'menu_open' : 'account_click', { location: 'header' });
    }],
    ['header nav a, header .logo', function (el) { track('nav_click', { link_text: txt(el) || 'logo', link_url: el.getAttribute('href') }); }],

    // Footer
    ['footer .socials a', function (el) { track('social_click', { network: slug(el.getAttribute('aria-label')) }); }],
    ['footer a', function (el) { track('footer_click', { link_text: txt(el) }); }],

    // Any other button or link that reads as a call to action
    ['.btn, .link, a.fab', function (el) { track('cta_click', { cta_text: txt(el), section: sectionOf(el), link_url: el.getAttribute('href') }); }]
  ];

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    for (var i = 0; i < RULES.length; i++) {
      var el = t.closest(RULES[i][0]);
      if (el) { RULES[i][1](el); return; }
    }
  }, true);

  /* ---------- newsletter (key event) — never send the email address ---------- */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.closest || !f.closest('.news')) return;
    var input = f.querySelector('input[type=email]');
    if (input && input.value && input.checkValidity()) {
      track('newsletter_signup', { location: sectionOf(f), method: 'footer_form' });
    }
  }, true);

  /* ---------- impressions: sections, product lists, promotion ---------- */
  if (!('IntersectionObserver' in window)) return;

  var seen = {};
  function once(key, fn) { if (!seen[key]) { seen[key] = 1; fn(); } }

  // "Viewed" = 40% of the section, or 40% of the screen for sections taller than the screen.
  var secIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var need = 0.4 * Math.min(e.boundingClientRect.height, innerHeight);
      if (!e.isIntersecting || e.intersectionRect.height < need) return;
      var name = e.target.matches('.step') ? 'step_' + (indexIn(e.target, '.step') + 1) : sectionOf(e.target);
      once('sec:' + name, function () { track('section_view', { section: name }); });
      secIO.unobserve(e.target);
    });
  }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] });
  document.querySelectorAll('main section, body > section, .journey .step, #close, footer').forEach(function (s) { secIO.observe(s); });

  function reportList(grid) {
    var cards = grid.querySelectorAll('.pc');
    if (!cards.length) return;
    var name = listOf(cards[0]);
    once('list:' + name, function () {
      track('view_item_list', {
        item_list_id: slug(name), item_list_name: name,
        items: Array.prototype.map.call(cards, function (c, i) { return itemFromCard(c, i); })
      });
    });
  }
  var listIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) reportList(e.target); });
  }, { threshold: 0.3 });
  document.querySelectorAll('.grid4, .grid5').forEach(function (g) { listIO.observe(g); });

  // Tab switches swap the grid contents; report the new list once it has re-rendered.
  document.addEventListener('click', function (e) {
    var tab = e.target instanceof Element && e.target.closest('#giftTabs .tab, #engTabs .ttab');
    if (!tab) return;
    var grid = document.getElementById(tab.closest('#giftTabs') ? 'gifts' : 'engs');
    setTimeout(function () { reportList(grid); }, 600);
  });

  var announce = document.querySelector('.announce');
  if (announce) {
    var code = announce.querySelector('b:last-of-type');
    track('view_promotion', {
      creative_slot: 'announcement_bar', promotion_id: slug(txt(code)) || 'announcement',
      promotion_name: txt(announce).split('·')[0].trim() + (code ? ' ' + txt(code) : ''),
      items: []
    });
  }

  /* ---------- engagement depth on the Design Studio prompt ---------- */
  var studio = document.getElementById('studio');
  if (studio) {
    var t0 = 0;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) t0 = Date.now();
        else if (t0) {
          var secs = Math.round((Date.now() - t0) / 1000); t0 = 0;
          if (secs >= 10) once('studio_dwell', function () { track('studio_engaged', { seconds: secs }); });
        }
      });
    }, { threshold: 0.5 }).observe(studio);
  }
})();
