# -*- coding: utf-8 -*-
def nav(active):
    def a(k): return ' active' if active == k else ''
    return f'''  <header class="site-nav" id="main-nav">
    <div class="nav-container">
      <a href="/" class="brand-logo" aria-label="ArchiTek Soft Home">
        <img src="assets/images/image01.png" alt="ArchiTek Soft" class="brand-img" onerror="this.src=\'assets/images/image08.png\'" />
      </a>

      <ul class="nav-menu" id="nav-menu">
        <li><a href="/" class="nav-link{a('home')}" data-i18n="nav_home">Glxavor</a></li>
        <li class="nav-item-dropdown">
          <a href="/capabilities" class="nav-link dropdown-toggle{a('capabilities')}" data-i18n="nav_capabilities">
            <span>Hnaravoroutyun</span>
            <svg class="nav-arrow-svg" viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/capabilities#showroom" class="dropdown-item">
              <div class="dropdown-icon">🎆</div>
              <div class="dropdown-info">
                <div class="dropdown-title" data-i18n="nav_drop_showroom_title">Interactive 4K Showroom</div>
                <div class="dropdown-desc" data-i18n="nav_drop_showroom_desc">Real-time free walkthrough</div>
              </div>
            </a>
            <a href="/capabilities#ar" class="dropdown-item">
              <div class="dropdown-icon">📱</div>
              <div class="dropdown-info">
                <div class="dropdown-title" data-i18n="nav_drop_ar_title">Web 3D & Bjjajyn AR</div>
                <div class="dropdown-desc" data-i18n="nav_drop_ar_desc">360° interactivity & 1:1 AR projection</div>
              </div>
            </a>
            <a href="/capabilities#blueprints" class="dropdown-item">
              <div class="dropdown-icon">📐</div>
              <div class="dropdown-info">
                <div class="dropdown-title" data-i18n="nav_drop_factory_title">Factory Blueprints</div>
                <div class="dropdown-desc" data-i18n="nav_drop_factory_desc">CNC raskroy & Blum furniture</div>
              </div>
            </a>
          </div>
        </li>
        <li><a href="/process" class="nav-link{a('process')}" data-i18n="nav_pipeline">Inchpes e Ashkhatum</a></li>
        <li><a href="/portfolio" class="nav-link{a('portfolio')}" data-i18n="nav_portfolio">Portfolio</a></li>
        <li><a href="/b2b" class="nav-link{a('b2b')}" data-i18n="nav_b2b">Artadroghnerin</a></li>
        <li><a href="/contact" class="nav-link{a('contact')e" data-i18n="nav_contact">Kap</a></li>
        <li class="mobile-only-cta">
          <a href="/p/aren-kitchen" target="_blank" class="btn btn-primary" data-i18n="hero_btn_live">
            <span>Bacel Interaktiv PortalH</span>
          </a>
        </li>
      </ul>

      <div class="nav-actions">
        <div class="lang-selector">
          <button class="lang-btn" id="lang-btn" aria-label="Select Language">
            <span class="flag-icon" id="current-flag-icon">
              <svg class="svg-flag" viewBox="0 0 640 480"><path fill="#d90012" d="M0 0h640v160H0z"/><path fill="#0033a0" d="M0 160h640v160H0z"/><path fill="#f2a800" d="M0 320h640v160H0z"/></svg>
            </span>
            <span id="current-lang-text" class="lang-code-text">Սа�9</span>
            <svg class="chevron-svg" viewBox="0 0 24 24" width="12" height="12"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="lang-dropdown">
            <div class="lang-item active" data-lang="hy">
              <svg class="svg-flag" viewBox="0 0 640 480"><path fill="#d90012" d="M0 0h640v160H0z"/><path fill="#0033a0" d="M0 160h640v160H0z"/></svg>
              <span>Hayeren</span>
              <span class="lang-badge">Ս��9</span>
            </div>
            <div class="lang-item" data-lang="ru">
              <svg class="svg-flag" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v160H0z"/><path fill="#0039a6" d="M0 160h640v160H0z"/><path fill="#d52b1e" d="M0 320h640v160H0z"/></svg>
              <span>Русский</span>
              <span class="lang-badge">РуС</span>
            </div>
            <div class="lang-item" data-lang="en">
              <svg class="svg-flag" viewBox="0 0 640 480"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#fff" d="m75 0 245 180L565 0h75v60L435 240l205 18Av60h-75L320 300 75 480H0v-60l205-180L0 60V0z"/><path fill="#C8102E" d="m424 281 216 159v40l-244-180zm141-281-245 180h50L640 40V0zM0 40l190 140h-50L0 76zm0 400 245-180h-50L0 440z"/><path fill="#fff" d="M240 0h160v480H240z"/><path fill="#C8102E" d="M267 0h107v480H267z"/></svg>
              <span>English</span>
              <span class="lang-badge">ENG</span>
            </div>
          </div>
        </div>

        <a href="/capabilities" class="btn btn-primary btn-sm btn-nav-cta" data-i18n="nav_demo_btn">
          <svg class="cta-bolt-svg" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>Phordzel 3D-n</span>
        </a>

        <button class="mobile-toggle" id="mobile-toggle" aria-label="Open Navigation">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>'''

def head(title, desc):
    return f'''<!DOCTYPE html>
  <html lang="hy">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content="{desc}" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:image" content="assets/images/share.jpg" />
    <meta property="og:type" content="website" />
    <link rel="icon" type="image/png" href="assets/images/favicon.png" />
    <link rel="apple-touch-icon" href="assets/images/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Noto+Sans+Armenian:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/style.css" />
  </head>
  <body>
    <div class="ambient-bg">
      <div class="ambient-grid"></div>
      <div class="ambient-glow-1"></div>
      <div class="ambient-glow-2"></div>
      <div class="ambient-glow-3"></div>
    </div>'''

def footer():
    return '''  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <a href="/" class="brand-logo">
          <img src="assets/images/image01.png" alt="ArchiTek Soft Logo" class="brand-img" onerror="this.src=\'assets/images/image08.png\'" />
        </a>

        <ul class="social-links">
          <li><a href="https://facebook.com/ArchiTekSoft" target="_blank" class="social-btn" title="Facebook">f</a></li>
          <li><a href="https://instagram.com/architek_soft" target="_blank" class="social-btn" title="Instagram">💀</a></li>
          <li><a href="https://linkedin.com/company/architek-soft" target="_blank" class="social-btn" title="LinkedIn">in</a></li>
          <li><a href="https://youtube.com/@ArchiTekSoft" target="_blank" class="social-btn" title="YouTube">▶</a></li>
          <li><a href="https://t.me/ArchiTek_Soft" target="_blank" class="social-btn" title="Telegram">✈</a></li>
        </ul>
      </div>

      <div class="footer-bottom">
        <div data-i18n="footer_rights">© 2026 ArchiTek Soft. Bolor iravounqnere pashtpanvad en:</div>
        <div data-i18n="footer_tagline">High-Tech 3D Visualization, Interactive Showrooms & CNC Factory Engineering.</div>
      </div>
    </div>
  </footer>

  <div class="modal-backdrop" id="video-modal">
    <div class="modal-content" style="max-width: 960px;">
      <button class="modal-close-btn" onclick="closeVideoModal()">✕</button>
      <div style="padding: 16px 24px; background: #080c14; border-bottom: 1px solid var(--border-subtle); font-weight: 700; color: #fff;" id="modal-video-title">
        Architeksoft Preview
      </div>
      <div style="aspect-ratio: 16/9; background: #000;">
        <video id="modal-video-player" controls playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="lightbox-modal">
    <div class="modal-content" style="max-width: 1100px; background: transparent; border: none; box-shadow: none;">
      <button class="modal-close-btn" onclick="closeLightbox()">✕</button>
      <div style="text-align: center;">
        <img id="lightbox-img" src="" alt="Zoom" style="max-width: 100%; max-height: 85vh; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 25px 60px rgba(0,0,0,0.9);" />
        <div id="lightbox-title" style="margin-top: 12px; font-weight: 600; color: #fff; font-size: 1rem;"></div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="ar-modal">
    <div class="modal-content" style="max-width: 460px; padding: 36px; text-align: center;">
      <button class="modal-close-btn" onclick="closeARModal()">✕</button>
      <div style="font-size: 3rem; margin-bottom: 12px;">📱</div>
      <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #fff;">Augmented Reality (AR)</h3>
      <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 24px;">
        Scan the QR code with your smartphone to view in 1:1 real room scale.
      </p>
      <div style="background: #fff; padding: 16px; border-radius: 16px; display: inline-block; margin-bottom: 20px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://192.168.10.138:3456/p/aren-kitchen" alt="AR QR Code" style="width: 180px; height: 180px; display: block;" />
      </div>
      <div style="font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono);">
        COMOATIBLE: iOS QuickLook / Android SceneViewer
      </div>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>'''

if __name__ == '__main__':
    print('Core module built.')
