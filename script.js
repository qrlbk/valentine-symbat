(function () {
  var screen1 = document.getElementById('screen1');
  var screen2 = document.getElementById('screen2');
  var btnYes = document.getElementById('btnYes');
  var btnNo = document.getElementById('btnNo');
  var btnNoWrap = document.getElementById('btnNoWrap');
  var letterLayer = document.getElementById('letterLayer');

  var padding = 24;
  var letterPadding = 16;
  var letters = [];
  var animationFrameId = null;
  var letterSpeed = 0.38;
  var letterWander = 0.06;
  var collisionRadius = 0.9;

  var audioAnalyser = null;
  var audioAnalyserData = null;
  function setupAudioAnalyser() {
    if (audioAnalyser) return;
    var el = document.getElementById('bgMusic');
    if (!el) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var source = ctx.createMediaElementSource(el);
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume();
      audioAnalyser = analyser;
      audioAnalyserData = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {}
  }
  function getMusicLevel() {
    if (!audioAnalyser || !audioAnalyserData) return 0;
    try {
      audioAnalyser.getByteFrequencyData(audioAnalyserData);
      var sum = 0;
      for (var i = 0; i < 32; i++) sum += audioAnalyserData[i];
      return sum / 32 / 255;
    } catch (e) { return 0; }
  }

  var bgMusicStarted = false;
  function startBackgroundMusic() {
    if (bgMusicStarted) return;
    var el = document.getElementById('bgMusic');
    if (!el) return;
    bgMusicStarted = true;
    el.volume = 0.12;
    el.play().then(function () {
      setupAudioAnalyser();
    }).catch(function () { bgMusicStarted = false; });
  }

  var ambientStarted = false;
  function startAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;
    startBackgroundMusic();
  }

  function wrapTextInLetters(container, text) {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'letter';
      span.setAttribute('data-index', i);
      span.textContent = text[i];
      fragment.appendChild(span);
    }
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  function addPlaceholder(container, text) {
    var span = document.createElement('span');
    span.className = 'letter-placeholder';
    span.style.visibility = 'hidden';
    span.style.pointerEvents = 'none';
    span.style.display = 'inline';
    span.textContent = text;
    container.appendChild(span);
  }

  function initMessageLettersAndStartFlying() {
    letters = [];
    var card = document.querySelector('.card--message');
    if (!card || !letterLayer) return;

    var titleEl = card.querySelector('.card__title');
    var textEl = card.querySelector('.card__text');
    var signEl = card.querySelector('.card__sign');

    var titleText = titleEl ? titleEl.textContent : '';
    var textText = textEl ? textEl.textContent : '';
    var signText = signEl ? signEl.textContent : '';

    if (titleEl && titleText) wrapTextInLetters(titleEl, titleText);
    if (textEl && textText) wrapTextInLetters(textEl, textText);
    if (signEl && signText) wrapTextInLetters(signEl, signText);

    void card.offsetHeight;

    var allLetterSpans = card.querySelectorAll('.letter');
    for (var i = 0; i < allLetterSpans.length; i++) {
      var el = allLetterSpans[i];
      var parent = el.parentElement;
      if (parent && parent.classList.contains('card__title')) el.classList.add('letter--title');
      else if (parent && parent.classList.contains('card__text')) el.classList.add('letter--text');
      else if (parent && parent.classList.contains('card__sign')) el.classList.add('letter--sign');
      var r = el.getBoundingClientRect();
      letters.push({
        el: el,
        home: { left: r.left, top: r.top, width: r.width, height: r.height },
        x: 0, y: 0,
        vx: 0, vy: 0
      });
    }

    while (letterLayer.firstChild) letterLayer.removeChild(letterLayer.firstChild);
    for (var j = 0; j < letters.length; j++) {
      letterLayer.appendChild(letters[j].el);
    }

    if (titleEl && titleText) addPlaceholder(titleEl, titleText);
    if (textEl && textText) addPlaceholder(textEl, textText);
    if (signEl && signText) addPlaceholder(signEl, signText);

    if (titleEl) titleEl.style.minHeight = titleEl.getBoundingClientRect().height + 'px';
    if (textEl) textEl.style.minHeight = textEl.getBoundingClientRect().height + 'px';
    if (signEl) signEl.style.minHeight = signEl.getBoundingClientRect().height + 'px';

    startFlying();
  }

  function getBounds() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    return { w: w, h: h, pad: letterPadding };
  }

  function randomPositionForLetter(home) {
    var b = getBounds();
    var maxLeft = b.w - home.width - b.pad * 2;
    var maxTop = b.h - home.height - b.pad * 2;
    var minLeft = b.pad;
    var minTop = b.pad;
    if (maxLeft < minLeft) maxLeft = minLeft;
    if (maxTop < minTop) maxTop = minTop;
    return {
      left: minLeft + Math.random() * (maxLeft - minLeft),
      top: minTop + Math.random() * (maxTop - minTop)
    };
  }

  function startFlying() {
    var b = getBounds();
    for (var i = 0; i < letters.length; i++) {
      var item = letters[i];
      var el = item.el;
      el.classList.add('letter--flying');
      el.style.transition = 'none';
      el.style.position = 'fixed';
      el.style.width = item.home.width + 'px';
      el.style.height = item.home.height + 'px';
      var pos = randomPositionForLetter(item.home);
      item.x = pos.left;
      item.y = pos.top;
      item.vx = (Math.random() - 0.5) * 2 * letterSpeed;
      item.vy = (Math.random() - 0.5) * 2 * letterSpeed;
      el.style.left = item.x + 'px';
      el.style.top = item.y + 'px';
    }
    function tick() {
      if (!screen1.classList.contains('screen--active')) {
        animationFrameId = null;
        return;
      }
      var b = getBounds();
      var pad = b.pad;
      var w = b.w;
      var h = b.h;
      var i, j, L;
      for (i = 0; i < letters.length; i++) {
        var a = letters[i];
        a.x += a.vx;
        a.y += a.vy;
        a.vx += (Math.random() - 0.5) * letterWander;
        a.vy += (Math.random() - 0.5) * letterWander;
        if (a.vx > letterSpeed) a.vx = letterSpeed;
        if (a.vx < -letterSpeed) a.vx = -letterSpeed;
        if (a.vy > letterSpeed) a.vy = letterSpeed;
        if (a.vy < -letterSpeed) a.vy = -letterSpeed;
        if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx) * 0.6; }
        if (a.x + a.home.width > w - pad) { a.x = w - pad - a.home.width; a.vx = -Math.abs(a.vx) * 0.6; }
        if (a.y < pad) { a.y = pad; a.vy = Math.abs(a.vy) * 0.6; }
        if (a.y + a.home.height > h - pad) { a.y = h - pad - a.home.height; a.vy = -Math.abs(a.vy) * 0.6; }
      }
      var musicLevel = getMusicLevel();
      if (musicLevel > 0.15 && letters.length > 0) {
        var pushStrength = (musicLevel - 0.1) * 0.5;
        if (pushStrength > 0.2) pushStrength = 0.2;
        var numPush = Math.max(1, Math.floor(letters.length * 0.08 + Math.random() * 4));
        for (var p = 0; p < numPush; p++) {
          var idx = Math.floor(Math.random() * letters.length);
          var L = letters[idx];
          L.vx += (Math.random() - 0.5) * 2 * pushStrength;
          L.vy += (Math.random() - 0.5) * 2 * pushStrength;
        }
      }
      for (i = 0; i < letters.length; i++) {
        for (j = i + 1; j < letters.length; j++) {
          var A = letters[i];
          var B = letters[j];
          var ax = A.x + A.home.width / 2;
          var ay = A.y + A.home.height / 2;
          var bx = B.x + B.home.width / 2;
          var by = B.y + B.home.height / 2;
          var dx = bx - ax;
          var dy = by - ay;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minDist = ((A.home.width + A.home.height) / 2 + (B.home.width + B.home.height) / 2) * 0.5 * collisionRadius;
          if (dist < minDist && dist > 0.001) {
            var overlap = minDist - dist;
            var nx = dx / dist;
            var ny = dy / dist;
            A.x -= nx * overlap * 0.5;
            A.y -= ny * overlap * 0.5;
            B.x += nx * overlap * 0.5;
            B.y += ny * overlap * 0.5;
            var vAn = A.vx * nx + A.vy * ny;
            var vBn = B.vx * nx + B.vy * ny;
            A.vx += (vBn - vAn) * nx * 0.5;
            A.vy += (vBn - vAn) * ny * 0.5;
            B.vx += (vAn - vBn) * nx * 0.5;
            B.vy += (vAn - vBn) * ny * 0.5;
          }
        }
      }
      for (L = 0; L < letters.length; L++) {
        letters[L].el.style.left = letters[L].x + 'px';
        letters[L].el.style.top = letters[L].y + 'px';
      }
      animationFrameId = requestAnimationFrame(tick);
    }
    animationFrameId = requestAnimationFrame(tick);
  }

  function gatherLettersAndShowScreen2() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    screen1.classList.remove('screen--active');
    screen2.classList.add('screen--active');
    if (btnNoWrap) btnNoWrap.style.display = 'none';

    for (var i = 0; i < letters.length; i++) {
      var item = letters[i];
      item.el.style.transition = '';
      item.el.classList.add('letter--returning');
      item.el.style.left = item.home.left + 'px';
      item.el.style.top = item.home.top + 'px';
    }
  }

  function placeNoRandomly() {
    if (!btnNoWrap) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var sizeW = btnNoWrap.offsetWidth;
    var sizeH = btnNoWrap.offsetHeight;
    var minLeft = padding;
    var maxLeft = w - sizeW - padding;
    var minTop = padding;
    var maxTop = h - sizeH - padding;
    if (maxLeft < minLeft) maxLeft = minLeft;
    if (maxTop < minTop) maxTop = minTop;
    var left = minLeft + Math.random() * (maxLeft - minLeft);
    var top = minTop + Math.random() * (maxTop - minTop);
    btnNoWrap.style.left = left + 'px';
    btnNoWrap.style.top = top + 'px';
  }

  function escapeNo() {
    if (!screen1.classList.contains('screen--active')) return;
    placeNoRandomly();
  }

  function onFirstInteraction() {
    startAmbient();
  }
  document.addEventListener('click', onFirstInteraction, { once: true });
  document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });

  var btnMusic = document.getElementById('btnMusic');
  if (btnMusic) {
    btnMusic.addEventListener('click', function () {
      startBackgroundMusic();
      startAmbient();
      btnMusic.style.opacity = '0';
      btnMusic.style.pointerEvents = 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initMessageLettersAndStartFlying();
      setTimeout(function () { startAmbient(); }, 300);
    });
  } else {
    initMessageLettersAndStartFlying();
    setTimeout(function () { startAmbient(); }, 300);
  }

  btnYes.addEventListener('click', function () {
    startAmbient();
    if (!screen1.classList.contains('screen--active')) return;
    gatherLettersAndShowScreen2();
  });

  btnNo.addEventListener('click', startAmbient);
  btnNo.addEventListener('mouseenter', escapeNo);
  btnNo.addEventListener('mousemove', escapeNo);
  btnNoWrap.addEventListener('mouseenter', escapeNo);
  btnNoWrap.addEventListener('mousemove', escapeNo);

  document.addEventListener('touchstart', function (e) {
    if (!screen1.classList.contains('screen--active') || !e.touches.length) return;
    var touch = e.touches[0];
    var br = btnNoWrap.getBoundingClientRect();
    var cx = br.left + br.width / 2;
    var cy = br.top + br.height / 2;
    var dx = touch.clientX - cx;
    var dy = touch.clientY - cy;
    if (Math.sqrt(dx * dx + dy * dy) < 100) placeNoRandomly();
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!screen1.classList.contains('screen--active') || !e.touches.length) return;
    var touch = e.touches[0];
    var br = btnNoWrap.getBoundingClientRect();
    var cx = br.left + br.width / 2;
    var cy = br.top + br.height / 2;
    var dx = touch.clientX - cx;
    var dy = touch.clientY - cy;
    if (Math.sqrt(dx * dx + dy * dy) < 100) placeNoRandomly();
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (screen1.classList.contains('screen--active') && btnNoWrap) {
      var left = parseInt(btnNoWrap.style.left, 10);
      var top = parseInt(btnNoWrap.style.top, 10);
      if (!isNaN(left) && !isNaN(top)) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var sizeW = btnNoWrap.offsetWidth;
        var sizeH = btnNoWrap.offsetHeight;
        if (left < padding || top < padding || left + sizeW > w - padding || top + sizeH > h - padding) {
          placeNoRandomly();
        }
      }
    }
    if (screen1.classList.contains('screen--active') && letters.length) {
      var w = window.innerWidth;
      var h = window.innerHeight;
      for (var i = 0; i < letters.length; i++) {
        var a = letters[i];
        if (a.x < letterPadding) a.x = letterPadding;
        if (a.y < letterPadding) a.y = letterPadding;
        if (a.x + a.home.width > w - letterPadding) a.x = w - letterPadding - a.home.width;
        if (a.y + a.home.height > h - letterPadding) a.y = h - letterPadding - a.home.height;
        a.el.style.left = a.x + 'px';
        a.el.style.top = a.y + 'px';
      }
    }
  });
})();
