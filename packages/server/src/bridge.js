// Vanilla JS bridge script injected into the user's app iframe.
// Sends postMessage to parent with VERYA_SELECT payload on element click.
(function () {
  'use strict';

  if (window.__veryaBridgeInstalled) return;
  window.__veryaBridgeInstalled = true;

  // ─── Overlay container ────────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = '__verya_overlay__';
  overlay.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:2147483647',
  ].join(';');
  document.body.appendChild(overlay);

  // ─── Hover box ────────────────────────────────────────────────────────────
  var hoverBox = document.createElement('div');
  hoverBox.id = '__verya_hover__';
  hoverBox.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'box-sizing:border-box',
    'border:1px solid rgba(99,102,241,0.55)',
    'background:rgba(99,102,241,0.05)',
    'border-radius:2px',
    'display:none',
    'transition:all 0.08s ease',
  ].join(';');
  overlay.appendChild(hoverBox);

  // ─── Selection box ────────────────────────────────────────────────────────
  var selBox = document.createElement('div');
  selBox.id = '__verya_sel__';
  selBox.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'box-sizing:border-box',
    'border:2px solid rgba(99,102,241,0.9)',
    'background:rgba(99,102,241,0.06)',
    'border-radius:2px',
    'display:none',
  ].join(';');
  overlay.appendChild(selBox);

  // ─── Selection label ─────────────────────────────────────────────────────
  var selLabel = document.createElement('div');
  selLabel.id = '__verya_label__';
  selLabel.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'background:rgba(99,102,241,0.92)',
    'color:#fff',
    'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
    'font-size:11px',
    'line-height:1',
    'padding:3px 6px',
    'border-radius:3px',
    'white-space:nowrap',
    'display:none',
    'z-index:2147483647',
  ].join(';');
  overlay.appendChild(selLabel);

  // ─── State ────────────────────────────────────────────────────────────────
  var currentHover = null;
  var currentSelection = null;
  var selRect = null;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isVeryaEl(el) {
    return overlay.contains(el) || el === overlay;
  }

  function positionBox(box, rect) {
    box.style.top = rect.top + 'px';
    box.style.left = rect.left + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
  }

  function positionLabel(rect, text) {
    selLabel.textContent = text;
    var labelTop = rect.top - 22;
    if (labelTop < 4) labelTop = rect.top + 4;
    selLabel.style.top = labelTop + 'px';
    selLabel.style.left = rect.left + 'px';
  }

  // ─── React Fiber introspection ────────────────────────────────────────────
  function getReactComponentName(el) {
    // Find the react fiber key on the DOM node
    var fiberKey = Object.keys(el).find(function (k) {
      return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
    });
    if (!fiberKey) return null;

    var fiber = el[fiberKey];
    // Walk up the fiber tree to find the nearest named function component
    var current = fiber;
    while (current) {
      var type = current.type;
      if (type && typeof type === 'function' && type.name && /^[A-Z]/.test(type.name)) {
        return type.name;
      }
      if (type && typeof type === 'object' && type.displayName) {
        return type.displayName;
      }
      current = current.return;
    }
    return null;
  }

  // ─── Collect ElementInfo ──────────────────────────────────────────────────
  function collectElementInfo(el) {
    var rect = el.getBoundingClientRect();
    var cs = window.getComputedStyle(el);
    var componentName = getReactComponentName(el);

    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.className || '',
      componentName: componentName,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      computedStyle: {
        display: cs.display,
        width: cs.width,
        height: cs.height,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        margin: cs.margin,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
        textDecoration: cs.textDecoration,
        borderRadius: cs.borderRadius,
        border: cs.border,
        borderColor: cs.borderColor,
        borderWidth: cs.borderWidth,
        opacity: cs.opacity,
        boxShadow: cs.boxShadow,
        flexDirection: cs.flexDirection,
        alignItems: cs.alignItems,
        justifyContent: cs.justifyContent,
        gap: cs.gap,
        position: cs.position,
        top: cs.top,
        left: cs.left,
        right: cs.right,
        bottom: cs.bottom,
        overflow: cs.overflow,
        cursor: cs.cursor,
      },
    };
  }

  // ─── Mouse over ───────────────────────────────────────────────────────────
  document.addEventListener('mouseover', function (e) {
    var target = e.target;
    if (!target || isVeryaEl(target) || target === document.body || target === document.documentElement) {
      hoverBox.style.display = 'none';
      currentHover = null;
      return;
    }
    currentHover = target;
    var rect = target.getBoundingClientRect();
    positionBox(hoverBox, rect);
    hoverBox.style.display = 'block';
  }, true);

  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget || e.relatedTarget === document.body) {
      hoverBox.style.display = 'none';
    }
  }, true);

  // ─── Click ────────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || isVeryaEl(target) || target === document.body || target === document.documentElement) return;

    e.preventDefault();
    e.stopPropagation();

    currentSelection = target;
    var rect = target.getBoundingClientRect();
    selRect = rect;

    positionBox(selBox, rect);
    selBox.style.display = 'block';

    var info = collectElementInfo(target);
    var labelText = (info.componentName ? info.componentName + ' / ' : '') + info.tagName;
    positionLabel(rect, labelText);
    selLabel.style.display = 'block';

    window.parent.postMessage({ type: 'VERYA_SELECT', payload: info }, '*');
  }, true);

  // ─── Messages from parent ─────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'VERYA_DESELECT') {
      selBox.style.display = 'none';
      selLabel.style.display = 'none';
      currentSelection = null;
      selRect = null;
    }
  });

  // ─── Update positions on scroll/resize ───────────────────────────────────
  function updatePositions() {
    if (currentHover) {
      var hr = currentHover.getBoundingClientRect();
      positionBox(hoverBox, hr);
    }
    if (currentSelection) {
      var sr = currentSelection.getBoundingClientRect();
      selRect = sr;
      positionBox(selBox, sr);
      var info = collectElementInfo(currentSelection);
      var labelText = (info.componentName ? info.componentName + ' / ' : '') + info.tagName;
      positionLabel(sr, labelText);
    }
  }

  window.addEventListener('scroll', updatePositions, true);
  window.addEventListener('resize', updatePositions);
})();
