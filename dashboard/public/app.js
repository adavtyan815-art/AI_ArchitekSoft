let currentAssets = [];
let currentProjects = [];
let selectedAssetFilenames = ['WD1.jpg', 'WD2.jpg', 'WD3.jpg'];
let currentAspect = '1:1';
let currentStyle = 'editorial'; // 'editorial', 'minimal', 'before_after'
let currentPlatform = 'facebook';
let generatedPosters = {};
let currentAICopy = null;

async function init() {
  if (window.lucide) lucide.createIcons();
  await loadConfig();
  await loadAssets();
  await loadProjects();
  await loadPosts();
  // Auto-generate initial poster preview for studio
  setTimeout(generatePoster, 500);
}

function switchTab(tab) {
  ['portals', 'library', 'studio', 'calendar', 'settings'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    const nav = document.getElementById('nav-' + t);
    if (el) el.classList.add('hidden');
    if (nav) nav.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 text-slate-400 hover:text-slate-200';
  });

  const activeEl = document.getElementById('tab-' + tab);
  const activeNav = document.getElementById('nav-' + tab);
  if (activeEl) activeEl.classList.remove('hidden');
  if (activeNav) activeNav.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';

  if (window.lucide) lucide.createIcons();
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    const g = document.getElementById('cfg-gemini');
    if (g) g.value = cfg.geminiApiKey || '';
    const fId = document.getElementById('cfg-fb-id');
    if (fId) fId.value = cfg.facebookPageId || '';
    const fTok = document.getElementById('cfg-fb-token');
    if (fTok) fTok.value = cfg.facebookPageToken || '';
  } catch (e) {
    console.error("loadConfig error:", e);
  }
}

async function saveSettings(e) {
  if (e) e.preventDefault();
  const body = {
    geminiApiKey: document.getElementById('cfg-gemini').value,
    facebookPageId: document.getElementById('cfg-fb-id').value,
    facebookPageToken: document.getElementById('cfg-fb-token').value
  };
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  alert('Կարգավորումները հաջողությամբ պահպանվեցին:');
}

// ==========================================
// CLIENT PORTALS MANAGEMENT
// ==========================================
async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    currentProjects = await res.json();
    renderProjectsGrid();
  } catch (e) {
    console.error("loadProjects error:", e);
  }
}

function renderProjectsGrid() {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  if (currentProjects.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
        <i data-lucide="folder-open" class="w-10 h-10 text-slate-600 mx-auto"></i>
        <h4 class="text-base font-bold text-slate-300">Դեռ ստեղծված պորտալներ չկան</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">Սեղմեք «Ստեղծել Նոր Պորտալ» կոճակը՝ ձեր առաջին հաճախորդի էջը գեներացնելու համար</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = currentProjects.map(p => {
    const thumbUrl = (p.renders && p.renders[0]) || p.sketchUrl || '/local-assets/WD1.jpg';
    const portalUrl = `${window.location.origin}/p/${p.slug || p.id}`;
    const renderCount = p.renders ? p.renders.length : 0;

    return `
      <div class="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-3xl overflow-hidden group transition flex flex-col justify-between shadow-xl">
        <div>
          <!-- Thumbnail with status badges -->
          <div class="aspect-video bg-slate-950 relative overflow-hidden">
            <img src="${thumbUrl}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
            
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950/80 backdrop-blur text-cyan-400 border border-cyan-500/30">
              ${p.code || 'AT-2026'}
            </span>
            <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/80 backdrop-blur text-emerald-400 border border-emerald-500/30">
              ✓ Պատրաստ է
            </span>
            
            <div class="absolute bottom-3 left-3 right-3">
              <span class="text-[11px] font-semibold text-slate-300">${p.clientName}</span>
              <h3 class="font-extrabold text-base text-white truncate">${p.title}</h3>
            </div>
          </div>

          <!-- Description and Specs -->
          <div class="p-5 space-y-3 text-xs">
            <p class="text-slate-400 line-clamp-2 leading-relaxed">${p.description || 'Անհատական նախագիծ'}</p>
            
            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
              <span class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <i data-lucide="image" class="w-3.5 h-3.5 text-cyan-400"></i> ${renderCount} Ռենդեր
              </span>
              <span class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <i data-lucide="file-text" class="w-3.5 h-3.5 text-emerald-400"></i> PDF Ռասկրոյ
              </span>
              <span class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <i data-lucide="cpu" class="w-3.5 h-3.5 text-indigo-400"></i> UE5 Live
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="p-5 pt-0 space-y-2">
          <div class="flex items-center gap-2">
            <a href="/p/${p.slug || p.id}" target="_blank" class="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Բացել Պորտալը
            </a>
            <button onclick="copyProjectLink('${portalUrl}')" class="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition" title="Պատճենել հաճախորդի հղումը">
              <i data-lucide="copy" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <button onclick="launchStudioForProject('${p.id}')" class="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Ստեղծել SMM Փաթեթ
            </button>
            <button onclick="deleteProject('${p.id}')" class="text-red-400 hover:text-red-300 font-medium">
              Ջնջել
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function copyProjectLink(url) {
  navigator.clipboard.writeText(url);
  alert('Հաճախորդի անհատական պորտալի հղումը պատճենվեց:\n' + url);
}

function openCreateProjectModal() {
  // Populate dropdowns from local assets
  const sketchSel = document.getElementById('p-file-sketch');
  const videoSel = document.getElementById('p-file-video');
  const rendersContainer = document.getElementById('p-renders-selector');

  const images = currentAssets.filter(a => !a.isVideo && !a.isLogo);
  const videos = currentAssets.filter(a => a.isVideo);

  if (sketchSel) {
    sketchSel.innerHTML = currentAssets.filter(a => !a.isVideo).map(a => 
      `<option value="${a.url}">${a.filename}</option>`
    ).join('');
    // default to sketch if found
    const defaultSketch = currentAssets.find(a => /photo|sketch/i.test(a.filename));
    if (defaultSketch) sketchSel.value = defaultSketch.url;
  }

  if (videoSel) {
    videoSel.innerHTML = videos.map(a => 
      `<option value="${a.url}">${a.filename}</option>`
    ).join('');
  }

  if (rendersContainer) {
    rendersContainer.innerHTML = images.map(a => `
      <label class="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
        <input type="checkbox" name="p-render-checkbox" value="${a.url}" checked class="rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-0">
        <span class="text-[11px] text-slate-300 truncate">${a.filename}</span>
      </label>
    `).join('');
  }

  document.getElementById('modal-create-project').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeCreateProjectModal() {
  document.getElementById('modal-create-project').classList.add('hidden');
}

async function handleCreateProject(e) {
  e.preventDefault();
  const clientName = document.getElementById('p-client').value;
  const code = document.getElementById('p-code').value;
  const title = document.getElementById('p-title').value;
  const slug = document.getElementById('p-slug').value || clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const category = document.getElementById('p-category').value;
  const description = document.getElementById('p-desc').value;
  const pixelStreamingUrl = document.getElementById('p-pixel-url').value;
  const webViewerUrl = document.getElementById('p-viewer-url').value;
  const sketchUrl = document.getElementById('p-file-sketch').value;
  const videoUrl = document.getElementById('p-file-video').value;
  const pdfUrl = document.getElementById('p-file-pdf').value;

  const renderCheckboxes = document.querySelectorAll('input[name="p-render-checkbox"]:checked');
  const renders = Array.from(renderCheckboxes).map(cb => cb.value);

  const payload = {
    clientName,
    code,
    title,
    slug,
    category,
    description,
    sketchUrl,
    videoUrl,
    pdfUrl,
    renders: renders.length > 0 ? renders : ['/local-assets/WD1.jpg'],
    pixelStreamingUrl,
    webViewerUrl
  };

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      closeCreateProjectModal();
      await loadProjects();
      alert('Հաճախորդի պորտալը հաջողությամբ ստեղծվեց!\nՀասցե՝ ' + window.location.origin + '/p/' + result.project.slug);
    }
  } catch (err) {
    console.error("Create project error:", err);
    alert('Սխալ տեղի ունեցավ նախագիծը ստեղծելիս');
  }
}

async function deleteProject(id) {
  if (!confirm('Վստա՞հ եք, որ ցանկանում եք ջնջել այս պորտալը:')) return;
  await fetch('/api/projects/' + id, { method: 'DELETE' });
  await loadProjects();
}

function launchStudioForProject(projectId) {
  const p = currentProjects.find(item => item.id === projectId);
  if (!p) return;

  if (p.renders && p.renders.length > 0) {
    selectedAssetFilenames = p.renders.map(r => decodeURIComponent(r.replace('/local-assets/', '')));
  }
  
  const catInput = document.getElementById('ai-category');
  if (catInput) catInput.value = p.category || 'Ժամանակակից Խոհանոց';

  const instInput = document.getElementById('ai-instructions');
  if (instInput) {
    instInput.value = `Նախագիծ: ${p.title}\nՀաճախորդ: ${p.clientName}\nLive հղում: https://live.architeksoft.com/${p.slug}\nՇեշտել էսքիզից մինչև 4K Unreal Engine 5 ռեալիզմը և գործարանային ռասկրոյի ճշգրտությունը:`;
  }

  switchTab('studio');
  renderStudioSelectedAssets();
  generatePoster();
  generateAICopy();
}

// ==========================================
// MEDIA ASSETS LIBRARY
// ==========================================
async function loadAssets() {
  try {
    const res = await fetch('/api/assets');
    currentAssets = await res.json();
    renderAssetsGrid();
    renderStudioSelectedAssets();
  } catch (e) {
    console.error("loadAssets error:", e);
  }
}

function toggleAssetSelection(filename) {
  if (selectedAssetFilenames.includes(filename)) {
    selectedAssetFilenames = selectedAssetFilenames.filter(f => f !== filename);
  } else {
    selectedAssetFilenames.push(filename);
  }
  renderAssetsGrid();
  renderStudioSelectedAssets();
}

function selectAllRenders() {
  const images = currentAssets.filter(a => !a.isLogo).map(a => a.filename);
  selectedAssetFilenames = images;
  renderAssetsGrid();
  renderStudioSelectedAssets();
}

function openStudioWithSelection() {
  if (selectedAssetFilenames.length === 0) {
    alert('Խնդրում ենք ընտրել գոնե 1 նկար:');
    return;
  }
  switchTab('studio');
  renderStudioSelectedAssets();
  generatePoster();
}

function renderAssetsGrid() {
  const grid = document.getElementById('assets-grid');
  const countBadge = document.getElementById('selected-count-badge');
  if (countBadge) countBadge.innerText = `${selectedAssetFilenames.length} նկար ընտրված է`;

  if (!grid) return;
  if (currentAssets.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500">Ռենդերներ չգտնվեցին:</div>';
    return;
  }

  grid.innerHTML = currentAssets.map(asset => {
    const isSelected = selectedAssetFilenames.includes(asset.filename);
    return `
      <div class="bg-slate-900/60 border ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-800'} rounded-2xl overflow-hidden group hover:border-slate-700 transition flex flex-col relative">
        <div class="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-pointer" onclick="toggleAssetSelection('${asset.filename}')">
          ${asset.isVideo 
            ? `<video src="${asset.url}" class="w-full h-full object-cover" muted></video><div class="absolute inset-0 bg-black/40 flex items-center justify-center"><i data-lucide="video" class="w-8 h-8 text-cyan-400"></i></div>`
            : `<img src="${asset.url}" alt="${asset.filename}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">`
          }
          <div class="absolute top-2.5 left-2.5">
            <input type="checkbox" ${isSelected ? 'checked' : ''} class="w-5 h-5 rounded-lg text-cyan-500 bg-slate-900/80 border-slate-700 focus:ring-0 cursor-pointer">
          </div>
          <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/80 backdrop-blur text-slate-300 border border-slate-700">
            ${(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB
          </span>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <h4 class="font-bold text-sm text-white truncate" title="${asset.filename}">${asset.filename}</h4>
            <p class="text-xs text-slate-400 mt-0.5">${asset.usageCount === 0 ? '✨ Դեռ չի հրապարակվել' : 'Օգտագործվել է ' + asset.usageCount + ' անգամ'}</p>
          </div>
          <button onclick="selectedAssetFilenames = ['${asset.filename}']; openStudioWithSelection();" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Սարքել առանձին փոստ
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderStudioSelectedAssets() {
  const container = document.getElementById('studio-selected-strip');
  const countLabel = document.getElementById('studio-selected-count');
  if (countLabel) {
    countLabel.innerText = `${selectedAssetFilenames.length} նկար/վիդեո կներառվի այս 1 ամբողջական փոստում`;
  }

  if (!container) return;
  if (selectedAssetFilenames.length === 0) {
    container.innerHTML = '<p class="text-xs text-amber-400">Ոչ մի նկար ընտրված չէ: Գրադարանից ընտրեք նկարներ:</p>';
    return;
  }

  container.innerHTML = selectedAssetFilenames.map(fn => {
    const asset = currentAssets.find(a => a.filename === fn);
    const isVideo = asset && asset.isVideo;
    const url = asset ? asset.url : `/local-assets/${encodeURIComponent(fn)}`;
    return `
      <div class="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex-shrink-0 group">
        ${isVideo 
          ? `<video src="${url}" class="w-full h-full object-cover"></video><div class="absolute inset-0 bg-black/40 flex items-center justify-center"><i data-lucide="video" class="w-4 h-4 text-cyan-400"></i></div>`
          : `<img src="${url}" class="w-full h-full object-cover">`
        }
        <button onclick="toggleAssetSelection('${fn}')" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">×</button>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function setStyle(style) {
  currentStyle = style;
  ['editorial', 'minimal', 'before_after'].forEach(s => {
    const btn = document.getElementById('style-' + s);
    if (!btn) return;
    if (s === style) {
      btn.className = 'style-btn p-3 rounded-xl text-left border border-cyan-500 bg-cyan-500/10 text-white transition';
    } else {
      btn.className = 'style-btn p-3 rounded-xl text-left border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 transition';
    }
  });
  generatePoster();
}

function setAspectRatio(ratio) {
  currentAspect = ratio;
  ['1:1', '4:5', '16:9'].forEach(r => {
    const id = 'ratio-' + r.replace(':', '-');
    const btn = document.getElementById(id);
    if (!btn) return;
    if (r === ratio) {
      btn.className = 'ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400';
    } else {
      btn.className = 'ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700';
    }
  });
  generatePoster();
}

async function generatePoster() {
  const firstImage = selectedAssetFilenames.find(f => !/\.(mp4|mov)$/i.test(f)) || 'WD1.jpg';
  const overlayText = document.getElementById('studio-overlay-text').value;
  const loader = document.getElementById('poster-loading');
  if (loader) loader.classList.remove('hidden');

  try {
    const res = await fetch('/api/generate-poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assetName: firstImage, 
        aspectRatio: currentAspect, 
        overlayText,
        style: currentStyle
      })
    });
    const data = await res.json();
    if (data.success) {
      generatedPosters[firstImage] = data.url;
      const preview = document.getElementById('poster-preview-img');
      if (preview) preview.src = data.url;
      const badge = document.getElementById('poster-dim-badge');
      if (badge) badge.innerText = `${data.width} x ${data.height} px • ${currentStyle.toUpperCase()}`;
    }
  } catch (e) {
    console.error(e);
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}

async function generateAICopy() {
  const category = document.getElementById('ai-category').value;
  const instructions = document.getElementById('ai-instructions').value;
  const btn = document.getElementById('btn-gen-ai');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> AI-ն գեներացնում է ՀԱՅԵՐԵՆ տեքստ...';
  }

  try {
    const res = await fetch('/api/generate-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assetNames: selectedAssetFilenames, 
        category, 
        instructions, 
        language: 'hy' 
      })
    });
    const data = await res.json();
    if (data.success) {
      currentAICopy = data.copy;
      if (data.copy.recommendedOverlayText) {
        const overlayInp = document.getElementById('studio-overlay-text');
        if (overlayInp) overlayInp.value = data.copy.recommendedOverlayText;
      }
      displayPlatformCopy(currentPlatform);
    }
  } catch (e) {
    console.error(e);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> Գեներացնել ՀԱՅԵՐԵՆ Տեքստերը (4 Հարթակ)';
    }
    if (window.lucide) lucide.createIcons();
  }
}

function switchPlatform(platform) {
  currentPlatform = platform;
  ['facebook', 'instagram', 'linkedin', 'youtube'].forEach(p => {
    const btn = document.getElementById('plat-' + p);
    if (!btn) return;
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
  const postData = {
    assetFiles: selectedAssetFilenames,
    posterUrls: selectedAssetFilenames.map(f => generatedPosters[f] || `/local-assets/${encodeURIComponent(f)}`),
    targetPlatforms: ['facebook'],
    copy: currentAICopy || { 
      facebook: { 
        headline: document.getElementById('post-headline').value, 
        caption: document.getElementById('post-caption').value, 
        cta: document.getElementById('post-cta').value, 
        hashtags: [] 
      } 
    },
    status: 'AWAITING_APPROVAL'
  };

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  });
  const data = await res.json();
  if (data.success) {
    alert('Ամբողջական նախագիծը պահպանվեց օրացույցում (Սպասում է հաստատման):');
    await loadPosts();
    switchTab('calendar');
  }
}

async function approveAndPublishNow() {
  const postData = {
    assetFiles: selectedAssetFilenames,
    posterUrls: selectedAssetFilenames.map(f => generatedPosters[f] || `/local-assets/${encodeURIComponent(f)}`),
    targetPlatforms: ['facebook'],
    copy: currentAICopy || { 
      facebook: { 
        headline: document.getElementById('post-headline').value, 
        caption: document.getElementById('post-caption').value, 
        cta: document.getElementById('post-cta').value, 
        hashtags: [] 
      } 
    }
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
  if (!container) return;
  if (posts.length === 0) {
    container.innerHTML = '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">Դեռ պլանավորված փոստեր չկան:</div>';
    return;
  }

  container.innerHTML = posts.map(p => {
    const files = p.assetFiles || [p.assetFile];
    const previewUrl = (p.posterUrls && p.posterUrls[0]) || p.posterUrl || `/local-assets/${encodeURIComponent(files[0])}`;
    return `
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-center space-x-4">
          <div class="relative w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-800 flex-shrink-0">
            <img src="${previewUrl}" class="w-full h-full object-cover">
            <span class="absolute bottom-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-1 rounded-tl">${files.length} նկար</span>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
                p.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }">${p.status === 'PUBLISHED' ? '✓ ՀՐԱՊԱՐԱԿՎԱԾ' : '⏳ ՍՊԱՍՈՒՄ Է ՀԱՍՏԱՏՄԱՆ'}</span>
              <span class="text-xs text-slate-400 font-mono">${new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
            <h4 class="font-bold text-sm text-white">${p.copy?.facebook?.headline || files.join(', ')}</h4>
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
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

async function publishPost(id) {
  const res = await fetch('/api/posts/' + id + '/publish', { method: 'POST' });
  const data = await res.json();
  alert('Կարգավիճակ՝ ' + JSON.stringify(data.results, null, 2));
  await loadPosts();
}

window.addEventListener('DOMContentLoaded', init);
