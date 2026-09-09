with open(r"public\index.html", "a", encoding="utf-8") as f:
    f.write("""
    <!-- 3. CALENDAR & SCHEDULE TAB -->
    <section id="tab-calendar" class="hidden space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight text-white">Փոստերի Օրացույց և Պատմություն</h2>
          <p class="text-sm text-slate-400">Բոլոր պլանավորված և հրապարակված փոստերի ցանկը</p>
        </div>
      </div>
      <div id="posts-list" class="space-y-4"></div>
    </section>

    <!-- 4. SETTINGS TAB -->
    <section id="tab-settings" class="hidden space-y-6 max-w-2xl">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight text-white">Կարգավորումներ և API Բանալիներ</h2>
        <p class="text-sm text-slate-400">Տեղական գաղտնի տվյալներ (պահվում են ձեր համակարգչում)</p>
      </div>
      <form id="settings-form" onsubmit="saveSettings(event)" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Google Gemini API Key</label>
          <input type="password" id="cfg-gemini" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Facebook Page ID</label>
          <input type="text" id="cfg-fb-id" placeholder="օրինակ՝ 1029384756..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Facebook Page Access Token</label>
          <input type="password" id="cfg-fb-token" placeholder="EAA..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Telegram Bot Token (Optional)</label>
          <input type="text" id="cfg-tg-token" placeholder="7123456789:AAH..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Telegram Chat ID (Optional)</label>
          <input type="text" id="cfg-tg-chat" placeholder="123456789" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono">
        </div>
        <button type="submit" class="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-sm text-white shadow-lg shadow-cyan-500/20 transition">
          Պահպանել Կարգավորումները
        </button>
      </form>
    </section>
  </main>

  <script>
    let currentAssets = [];
    let currentAspect = '1:1';
    let currentPlatform = 'facebook';
    let currentGeneratedPosterUrl = '';
    let currentAICopy = null;

    async function init() {
      lucide.createIcons();
      await loadConfig();
      await loadAssets();
      await loadPosts();
    }

    function switchTab(tab) {
      ['library', 'studio', 'calendar', 'settings'].forEach(t => {
        document.getElementById('tab-' + t).classList.add('hidden');
        document.getElementById('nav-' + t).className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 text-slate-400 hover:text-slate-200';
      });
      document.getElementById('tab-' + tab).classList.remove('hidden');
      document.getElementById('nav-' + tab).className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
      lucide.createIcons();
    }

    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        document.getElementById('cfg-gemini').value = cfg.geminiApiKey || '';
        document.getElementById('cfg-fb-id').value = cfg.facebookPageId || '';
        document.getElementById('cfg-fb-token').value = cfg.facebookPageToken || '';
        document.getElementById('cfg-tg-token').value = cfg.telegramBotToken || '';
        document.getElementById('cfg-tg-chat').value = cfg.telegramChatId || '';
      } catch (e) { console.error(e); }
    }

    async function saveSettings(e) {
      e.preventDefault();
      const body = {
        geminiApiKey: document.getElementById('cfg-gemini').value,
        facebookPageId: document.getElementById('cfg-fb-id').value,
        facebookPageToken: document.getElementById('cfg-fb-token').value,
        telegramBotToken: document.getElementById('cfg-tg-token').value,
        telegramChatId: document.getElementById('cfg-tg-chat').value
      };
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      alert('Կարգավորումները հաջողությամբ պահպանվեցին:');
    }

    async function loadAssets() {
      try {
        const res = await fetch('/api/assets');
        currentAssets = await res.json();
        renderAssetsGrid();
        populateStudioSelect();
      } catch (e) { console.error(e); }
    }

    function renderAssetsGrid() {
      const grid = document.getElementById('assets-grid');
      if (currentAssets.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500">Ռենդերներ չգտնվեցին:</div>';
        return;
      }
      grid.innerHTML = currentAssets.map(asset => `
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden group hover:border-slate-700 transition flex flex-col">
          <div class="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
            ${asset.isVideo 
              ? `<video src="${asset.url}" class="w-full h-full object-cover" muted></video><div class="absolute inset-0 bg-black/40 flex items-center justify-center"><i data-lucide="video" class="w-8 h-8 text-cyan-400"></i></div>`
              : `<img src="${asset.url}" alt="${asset.filename}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">`
            }
            <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/80 backdrop-blur text-slate-300 border border-slate-700">
              ${(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
          <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h4 class="font-bold text-sm text-white truncate" title="${asset.filename}">${asset.filename}</h4>
              <p class="text-xs text-slate-400 mt-0.5">${asset.usageCount === 0 ? '✨ Դեռ չի հրապարակվել' : 'Օգտագործվել է ' + asset.usageCount + ' անգամ'}</p>
            </div>
            <button onclick="openInStudio('${asset.filename}')" class="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Սարքել Փոստ
            </button>
          </div>
        </div>
      `).join('');
      lucide.createIcons();
    }

    function populateStudioSelect() {
      const sel = document.getElementById('studio-asset-select');
      sel.innerHTML = currentAssets.map(a => `<option value="${a.filename}">${a.filename} (${a.isVideo ? 'Video' : 'Render'})</option>`).join('');
    }

    function openInStudio(filename) {
      document.getElementById('studio-asset-select').value = filename;
      switchTab('studio');
      onAssetChange();
    }

    function onAssetChange() {
      const filename = document.getElementById('studio-asset-select').value;
      const asset = currentAssets.find(a => a.filename === filename);
      if (asset) {
        document.getElementById('poster-preview-img').src = asset.url;
        currentGeneratedPosterUrl = asset.url;
      }
    }

    function setAspectRatio(ratio) {
      currentAspect = ratio;
      ['1:1', '4:5', '16:9'].forEach(r => {
        const id = 'ratio-' + r.replace(':', '-');
        const btn = document.getElementById(id);
        if (r === ratio) {
          btn.className = 'ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400';
        } else {
          btn.className = 'ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700';
        }
      });
    }

    async function generatePoster() {
      const assetName = document.getElementById('studio-asset-select').value;
      const overlayText = document.getElementById('studio-overlay-text').value;
      const loader = document.getElementById('poster-loading');
      loader.classList.remove('hidden');
      try {
        const res = await fetch('/api/generate-poster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetName, aspectRatio: currentAspect, overlayText })
        });
        const data = await res.json();
        if (data.success) {
          currentGeneratedPosterUrl = data.url;
          document.getElementById('poster-preview-img').src = data.url;
          document.getElementById('poster-dim-badge').innerText = data.width + ' x ' + data.height + ' px';
        } else {
          alert('Poster error: ' + data.error);
        }
      } catch (e) { console.error(e); } 
      finally { loader.classList.add('hidden'); }
    }

    async function generateAICopy() {
      const assetName = document.getElementById('studio-asset-select').value;
      const category = document.getElementById('ai-category').value;
      const instructions = document.getElementById('ai-instructions').value;
      const btn = document.getElementById('btn-gen-ai');
      btn.disabled = true;
      btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> AI-ն գեներացնում է...';
      try {
        const res = await fetch('/api/generate-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetName, category, instructions })
        });
        const data = await res.json();
        if (data.success) {
          currentAICopy = data.copy;
          if (data.copy.recommendedOverlayText) {
            document.getElementById('studio-overlay-text').value = data.copy.recommendedOverlayText;
          }
          displayPlatformCopy(currentPlatform);
        }
      } catch (e) { console.error(e); } 
      finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> Գեներացնել AI Տեքստերը';
        lucide.createIcons();
      }
    }

    function switchPlatform(platform) {
      currentPlatform = platform;
      ['facebook', 'instagram', 'linkedin', 'youtube'].forEach(p => {
        const btn = document.getElementById('plat-' + p);
        if (p === platform) {
          btn.className = 'plat-tab px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/20 text-cyan-400 flex items-center gap-1.5';
        } else {
          btn.className = 'plat-tab px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 flex items-center gap-1.5';
        }
      });
      displayPlatformCopy(platform);
    }

    function displayPlatformCopy(platform) {
      if (!currentAICopy || !currentAICopy[platform]) return;
      const item = currentAICopy[platform];
      if (platform === 'facebook') {
        document.getElementById('post-headline').value = item.headline || '';
        document.getElementById('post-caption').value = item.caption || '';
        document.getElementById('post-cta').value = item.cta || '';
        document.getElementById('post-hashtags').value = (item.hashtags || []).join(' ');
      } else if (platform === 'instagram') {
        document.getElementById('post-headline').value = item.hook || '';
        document.getElementById('post-caption').value = item.caption || '';
        document.getElementById('post-cta').value = item.cta || '';
        document.getElementById('post-hashtags').value = (item.hashtags || []).join(' ');
      } else if (platform === 'linkedin') {
        document.getElementById('post-headline').value = item.headline || '';
        document.getElementById('post-caption').value = item.caption || '';
        document.getElementById('post-cta').value = item.cta || '';
        document.getElementById('post-hashtags').value = (item.hashtags || []).join(' ');
      } else if (platform === 'youtube') {
        document.getElementById('post-headline').value = item.title || '';
        document.getElementById('post-caption').value = item.description || '';
        document.getElementById('post-cta').value = '';
        document.getElementById('post-hashtags').value = (item.tags || []).join(', ');
      }
    }

    async function savePostToSchedule() {
      const assetFile = document.getElementById('studio-asset-select').value;
      const postData = {
        assetFile,
        posterUrl: currentGeneratedPosterUrl || ('/local-assets/' + encodeURIComponent(assetFile)),
        targetPlatforms: ['facebook', 'instagram', 'linkedin', 'youtube'],
        copy: currentAICopy || { facebook: { headline: document.getElementById('post-headline').value, caption: document.getElementById('post-caption').value, cta: document.getElementById('post-cta').value, hashtags: [] } },
        status: 'AWAITING_APPROVAL'
      };
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Փոստը հաջողությամբ պահպանվեց օրացույցում:');
        await loadPosts();
        switchTab('calendar');
      }
    }

    async function approveAndPublishNow() {
      const assetFile = document.getElementById('studio-asset-select').value;
      const postData = {
        assetFile,
        posterUrl: currentGeneratedPosterUrl || ('/local-assets/' + encodeURIComponent(assetFile)),
        targetPlatforms: ['facebook'],
        copy: currentAICopy || { facebook: { headline: document.getElementById('post-headline').value, caption: document.getElementById('post-caption').value, cta: document.getElementById('post-cta').value, hashtags: [] } }
      };
      const createRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const created = await createRes.json();
      const pubRes = await fetch('/api/posts/' + created.post.id + '/publish', { method: 'POST' });
      const pubData = await pubRes.json();
      if (pubData.success) {
        alert('Փոստը ՀԱՍՏԱՏՎԵՑ և ՀՐԱՊԱՐԱԿՎԵՑ!\n' + JSON.stringify(pubData.results, null, 2));
        await loadPosts();
        switchTab('calendar');
      }
    }

    async function loadPosts() {
      const res = await fetch('/api/posts');
      const posts = await res.json();
      const container = document.getElementById('posts-list');
      if (posts.length === 0) {
        container.innerHTML = '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">Դեռ պլանավորված փոստեր չկան:</div>';
        return;
      }
      container.innerHTML = posts.map(p => `
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center space-x-4">
            <img src="${p.posterUrl}" class="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-800">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  p.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }">${p.status === 'PUBLISHED' ? '✓ ՀՐԱՊԱՐԱԿՎԱԾ' : '⏳ ՍՊԱՍՈՒՄ Է ՀԱՍՏԱՏՄԱՆ'}</span>
                <span class="text-xs text-slate-400 font-mono">${new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 class="font-bold text-sm text-white">${p.copy?.facebook?.headline || p.assetFile}</h4>
              <p class="text-xs text-slate-400 line-clamp-1 max-w-xl">${p.copy?.facebook?.caption || ''}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full md:w-auto">
            ${p.status !== 'PUBLISHED' ? `
              <button onclick="publishPost('${p.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Հաստատել հիմա
              </button>
            ` : `<span class="text-xs text-slate-500">Ավարտված է</span>`}
          </div>
        </div>
      `).join('');
      lucide.createIcons();
    }

    async function publishPost(id) {
      const res = await fetch('/api/posts/' + id + '/publish', { method: 'POST' });
      const data = await res.json();
      alert('Կարգավիճակ՝ ' + JSON.stringify(data.results, null, 2));
      await loadPosts();
    }

    window.addEventListener('DOMContentLoaded', init);
  </script>
</body>
</html>
""")
