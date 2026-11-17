/* The terms, privacy policy and 特定商取引法 pages never scroll either: their content is split into pages that fit the
   screen, with ◀ ▶ at the bottom (the same splitting as in the app: a section too long for a page continues on the next).
   Without this script the page is a normal long document. */
(function () {
  'use strict';
  var main = document.querySelector('main');
  if (!main || !window.requestAnimationFrame) return;
  document.documentElement.classList.add('paged');
  var box = document.createElement('div');
  box.className = 'pg-box';
  var nav = document.createElement('nav');
  nav.className = 'pg-nav';
  nav.innerHTML = '<button type="button" class="pg-prev">← 前へ</button><span class="pg-at" aria-live="polite"></span><button type="button" class="pg-next">次へ →</button>';
  var head = main.querySelector('.top');
  var title = main.querySelector('h1');
  /* everything after the title goes into the paged box */
  var rest = [];
  var n = title ? title.nextElementSibling : main.firstElementChild;
  while (n) { rest.push(n); n = n.nextElementSibling; }
  rest.forEach(function (e) { box.appendChild(e); });
  main.appendChild(box);
  main.appendChild(nav);
  var src = box.innerHTML, pages = [], at = 0;

  function fits() { return box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1; }
  function splittable(e) {
    if (!e.children.length) return false;
    for (var i = 0; i < e.childNodes.length; i++) { var c = e.childNodes[i]; if (c.nodeType === 3 && c.textContent.trim()) return false; }
    return true;
  }
  function fill(host, n) {
    var shell = n.cloneNode(false); host.appendChild(shell);
    var kids = Array.prototype.slice.call(n.children);
    while (n.firstChild) n.removeChild(n.firstChild);
    for (var i = 0; i < kids.length; i++) {
      shell.appendChild(kids[i]);
      if (fits()) continue;
      shell.removeChild(kids[i]);
      var rest = splittable(kids[i]) ? fill(shell, kids[i]) : kids[i];
      if (!shell.children.length) host.removeChild(shell);
      var left = n.cloneNode(false);
      if (rest) left.appendChild(rest);
      for (var j = i + 1; j < kids.length; j++) left.appendChild(kids[j]);
      return left.children.length ? left : null;
    }
    return null;
  }
  function takeFirst(n) {
    var c = n.firstElementChild, shell = n.cloneNode(false);
    if (splittable(c)) { shell.appendChild(takeFirst(c)); if (!c.children.length) n.removeChild(c); } else shell.appendChild(c);
    return shell;
  }
  function split() {
    box.innerHTML = src;
    var all = document.createElement('div');
    all.className = 'pg-page';
    while (box.firstChild) all.appendChild(box.firstChild);
    pages = [];
    var left = all, guard = 0;
    while (left && guard++ < 300) {
      left = fill(box, left);
      var page = box.firstElementChild;
      if (!page) { page = takeFirst(left); if (!left.children.length) left = null; }
      pages.push(page);
      while (box.firstChild) box.removeChild(box.firstChild);
    }
  }
  function show() {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.appendChild(pages[at]);
    box.style.zoom = '';
    if (!fits()) { var lo = 0.6, hi = 1; for (var k = 0; k < 7; k++) { var m = (lo + hi) / 2; box.style.zoom = m; if (fits()) lo = m; else hi = m; } box.style.zoom = lo; }
    nav.querySelector('.pg-at').textContent = (at + 1) + ' / ' + pages.length;
    nav.querySelector('.pg-prev').disabled = at === 0;
    nav.querySelector('.pg-next').disabled = at === pages.length - 1;
    nav.hidden = pages.length < 2;
  }
  function go(d) { var t = at + d; if (t < 0 || t >= pages.length) return; at = t; show(); }
  nav.querySelector('.pg-prev').addEventListener('click', function () { go(-1); });
  nav.querySelector('.pg-next').addEventListener('click', function () { go(1); });
  var sx = 0, sy = 0;
  box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', function (e) { var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1); }, { passive: true });
  function layout() { var f = pages.length ? at / pages.length : 0; split(); at = Math.min(pages.length - 1, Math.round(f * pages.length)); show(); }
  var q = 0;
  window.addEventListener('resize', function () { clearTimeout(q); q = setTimeout(layout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout); else layout();
  requestAnimationFrame(layout);
})();
