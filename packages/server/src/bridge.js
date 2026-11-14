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

  function attachOverlay() {
    var host = document.documentElement || document.body;
    if (host && !overlay.parentNode) {
      host.appendChild(overlay);
    }
  }
  attachOverlay();
  if (!overlay.parentNode) {
    document.addEventListener('DOMContentLoaded', attachOverlay);
  }

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
  var selectedComponentName = null;
  var selRect = null;
  var interactMode = false;

  // ─── Theme Style Injection ───────────────────────────────────────────────
  var themeStyle = document.createElement('style');
  themeStyle.id = '__verya_theme_style__';
  themeStyle.textContent = 
    'html.light, html.light body { background-color: #ffffff; color: #111827; }\n' +
    'html.dark, html.dark body { background-color: #0b0d13; color: #E8EAF0; }';

  function attachThemeStyle() {
    var host = document.head || document.documentElement || document.body;
    if (host && !themeStyle.parentNode) {
      host.appendChild(themeStyle);
    }
  }
  attachThemeStyle();
  if (!themeStyle.parentNode) {
    document.addEventListener('DOMContentLoaded', attachThemeStyle);
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isVeryaEl(el) {
    if (!el) return false;
    var node = el.nodeType === 1 ? el : el.parentElement;
    if (!node) return false;
    return overlay.contains(node) || node === overlay || node === themeStyle;
  }

  function positionBox(box, rect) {
    var top = rect.top + 'px';
    var left = rect.left + 'px';
    var width = rect.width + 'px';
    var height = rect.height + 'px';
    if (box.style.top !== top) box.style.top = top;
    if (box.style.left !== left) box.style.left = left;
    if (box.style.width !== width) box.style.width = width;
    if (box.style.height !== height) box.style.height = height;
  }

  function positionLabel(rect, text) {
    if (selLabel.textContent !== text) {
      selLabel.textContent = text;
    }
    var labelTop = rect.top - 22;
    if (labelTop < 4) labelTop = rect.top + 4;
    var top = labelTop + 'px';
    var left = rect.left + 'px';
    if (selLabel.style.top !== top) selLabel.style.top = top;
    if (selLabel.style.left !== left) selLabel.style.left = left;
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

  // React records the JSX call site on the fiber as _debugSource in development.
  // It is the only reliable way to map a DOM node back to a specific source line
  // when the same tag/class combination appears many times across many files.
  function getReactSource(el) {
    var fiberKey = Object.keys(el).find(function (k) {
      return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
    });
    if (!fiberKey) return null;

    var current = el[fiberKey];
    while (current) {
      var source = current._debugSource;
      if (source && typeof source.fileName === 'string' && source.lineNumber) {
        return {
          fileName: source.fileName,
          line: source.lineNumber,
          column: source.columnNumber || undefined,
        };
      }
      current = current.return;
    }
    return null;
  }

  function classNameOf(el) {
    // SVG elements expose className as an SVGAnimatedString, which is not
    // structured-cloneable and would throw inside postMessage.
    if (typeof el.className === 'string') return el.className;
    return el.getAttribute('class') || '';
  }

  // ─── Collect ElementInfo ──────────────────────────────────────────────────
  function collectElementInfo(el) {
    var rect = el.getBoundingClientRect();
    var cs = window.getComputedStyle(el);
    var componentName = getReactComponentName(el);
    var source = getReactSource(el);

    // Compute index among siblings of same tag inside root
    var container = document.getElementById('root') || document.body || document.documentElement;
    var tagIndex = 0;
    if (container && container.getElementsByTagName) {
      var allOfTag = container.getElementsByTagName(el.tagName);
      for (var i = 0; i < allOfTag.length; i++) {
        if (allOfTag[i] === el) {
          tagIndex = i;
          break;
        }
      }
    }

    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: classNameOf(el),
      componentName: componentName,
      index: tagIndex,
      source: source
        ? { fileName: source.fileName, line: source.line, column: source.column }
        : null,
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
    if (interactMode) return;
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
    if (interactMode) return;
    if (!e.relatedTarget || e.relatedTarget === document.body || e.relatedTarget === document.documentElement) {
      hoverBox.style.display = 'none';
      currentHover = null;
    }
  }, true);

  // ─── Click ────────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    // In interact mode or when holding Alt/Option key, allow full native interaction (buttons, inputs, links)
    if (interactMode || e.altKey) return;

    var target = e.target;
    if (!target || isVeryaEl(target) || target === document.body || target === document.documentElement) return;

    e.preventDefault();
    e.stopPropagation();

    currentSelection = target;
    var rect = target.getBoundingClientRect();
    selRect = rect;

    var info = collectElementInfo(target);
    selectedComponentName = info.componentName;
    var labelText = (info.componentName ? info.componentName + ' / ' : '') + info.tagName;

    positionBox(selBox, rect);
    selBox.style.display = 'block';

    positionLabel(rect, labelText);
    selLabel.style.display = 'block';

    window.parent.postMessage({ type: 'VERYA_SELECT', payload: info }, '*');
  }, true);

  // ─── Messages from parent ─────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'VERYA_DESELECT') {
      selBox.style.display = 'none';
      selLabel.style.display = 'none';
      currentSelection = null;
      selectedComponentName = null;
      selRect = null;
    } else if (e.data.type === 'VERYA_MODE') {
      interactMode = e.data.mode === 'interact';
      if (interactMode) {
        hoverBox.style.display = 'none';
        selBox.style.display = 'none';
        selLabel.style.display = 'none';
      } else if (currentSelection && document.contains(currentSelection)) {
        selBox.style.display = 'block';
        selLabel.style.display = 'block';
      }
    } else if (e.data.type === 'VERYA_THEME') {
      applyTheme(e.data.theme);
    }
  });

  // ─── Update positions on scroll/resize/mutation ───────────────────────────
  function updatePositions() {
    if (interactMode) return;

    if (currentHover) {
      if (!document.contains(currentHover)) {
        currentHover = null;
        hoverBox.style.display = 'none';
      } else {
        var hr = currentHover.getBoundingClientRect();
        positionBox(hoverBox, hr);
      }
    }

    if (currentSelection) {
      if (!document.contains(currentSelection)) {
        currentSelection = null;
        selectedComponentName = null;
        selRect = null;
        selBox.style.display = 'none';
        selLabel.style.display = 'none';
      } else {
        var sr = currentSelection.getBoundingClientRect();
        selRect = sr;
        positionBox(selBox, sr);
        var labelText = (selectedComponentName ? selectedComponentName + ' / ' : '') + currentSelection.tagName.toLowerCase();
        positionLabel(sr, labelText);
      }
    }
  }

  var updatePending = false;
  function scheduleUpdate() {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(function () {
      updatePending = false;
      updatePositions();
    });
  }

  window.addEventListener('scroll', scheduleUpdate, true);
  window.addEventListener('resize', scheduleUpdate);

  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      if (interactMode || (!currentHover && !currentSelection)) return;

      var hasExternal = false;
      for (var i = 0; i < mutations.length; i++) {
        var target = mutations[i].target;
        if (!isVeryaEl(target)) {
          hasExternal = true;
          break;
        }
      }
      if (!hasExternal) return;

      scheduleUpdate();
    });

    function attachObserver() {
      var targetNode = document.body || document.documentElement;
      if (targetNode) {
        observer.observe(targetNode, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'hidden'],
        });
      }
    }

    if (document.body) {
      attachObserver();
    } else {
      document.addEventListener('DOMContentLoaded', attachObserver);
    }
  }
})();
