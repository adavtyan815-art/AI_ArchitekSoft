with open(r"public\index.html", "a", encoding="utf-8") as f:
    f.write("""
    <!-- 1. CONTENT LIBRARY TAB -->
    <section id="tab-library" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight text-white">Մեդիա Գրադարան (Render & Video Assets)</h2>
          <p class="text-sm text-slate-400">Ֆայլերը վերցված են <code class="text-cyan-400 font-mono text-xs">local test facebook</code> թղթապանակից</p>
        </div>
        <button onclick="loadAssets()" class="px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-300">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Թարմացնել
        </button>
      </div>
      <div id="assets-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
    </section>

    <!-- 2. AI POST STUDIO TAB -->
    <section id="tab-studio" class="hidden space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 class="font-bold text-lg text-white flex items-center gap-2"><i data-lucide="sliders" class="w-5 h-5 text-cyan-400"></i> 1. Ընտրեք Ռենդերը և Չափսը</h3>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ընտրված Ռենդեր</label>
              <select id="studio-asset-select" onchange="onAssetChange()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"></select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Պաստառի Չափս (Aspect Ratio)</label>
              <div class="grid grid-cols-3 gap-2">
                <button type="button" onclick="setAspectRatio('1:1')" id="ratio-1-1" class="ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">1:1 Քառակուսի<br><span class="text-[10px] text-slate-400">Instagram / FB</span></button>
                <button type="button" onclick="setAspectRatio('4:5')" id="ratio-4-5" class="ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700">4:5 Ուղղահայաց<br><span class="text-[10px] text-slate-400">Instagram Feed</span></button>
                <button type="button" onclick="setAspectRatio('16:9')" id="ratio-16-9" class="ratio-btn px-3 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700">16:9 Լանդշաֆտ<br><span class="text-[10px] text-slate-400">LinkedIn / FB</span></button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Պաստառի Կարգախոս (Overlay Text)</label>
              <input type="text" id="studio-overlay-text" value="Bespoke Luxury Kitchen • Unreal Engine 5" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none">
            </div>
            <button onclick="generatePoster()" id="btn-gen-poster" class="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-sm text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition">
              <i data-lucide="layers" class="w-4 h-4"></i> Պատրաստել Բրենդավորված Պաստառ
            </button>
          </div>
          <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 class="font-bold text-lg text-white flex items-center gap-2"><i data-lucide="bot" class="w-5 h-5 text-purple-400"></i> 2. AI Տեքստերի Գեներացիա</h3>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Կատեգորիա</label>
              <input type="text" id="ai-category" value="Luxury Modern Kitchen" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Լրացուցիչ ցուցումներ AI-ին</label>
              <textarea id="ai-instructions" rows="2" placeholder="օրինակ՝ Շեշտել Unreal Engine-ի ռեալիստիկ լույսերը..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"></textarea>
            </div>
            <button onclick="generateAICopy()" id="btn-gen-ai" class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-sm text-white shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition">
              <i data-lucide="sparkles" class="w-4 h-4"></i> Գեներացնել AI Տեքստերը
            </button>
          </div>
        </div>
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-bold text-sm text-slate-300 flex items-center gap-2"><i data-lucide="eye" class="w-4 h-4 text-cyan-400"></i> Պաստառի Նախադիտում</h4>
              <span id="poster-dim-badge" class="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">1080 x 1080 px</span>
            </div>
            <div class="w-full aspect-square max-h-[420px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center relative">
              <img id="poster-preview-img" src="/local-assets/WD1.jpg" class="max-h-full max-w-full object-contain">
              <div id="poster-loading" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur flex flex-col items-center justify-center gap-3">
                <div class="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs font-medium text-cyan-400">Sharp ռենդերինգ...</span>
              </div>
            </div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center space-x-2">
                <button onclick="switchPlatform('facebook')" id="plat-facebook" class="plat-tab px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/20 text-cyan-400 flex items-center gap-1.5"><i data-lucide="facebook" class="w-3.5 h-3.5"></i> Facebook</button>
                <button onclick="switchPlatform('instagram')" id="plat-instagram" class="plat-tab px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 flex items-center gap-1.5"><i data-lucide="instagram" class="w-3.5 h-3.5"></i> Instagram</button>
                <button onclick="switchPlatform('linkedin')" id="plat-linkedin" class="plat-tab px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 flex items-center gap-1.5"><i data-lucide="linkedin" class="w-3.5 h-3.5"></i> LinkedIn</button>
                <button onclick="switchPlatform('youtube')" id="plat-youtube" class="plat-tab px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 flex items-center gap-1.5"><i data-lucide="youtube" class="w-3.5 h-3.5"></i> YouTube</button>
              </div>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Վերնագիր / Hook</label>
                <input type="text" id="post-headline" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:border-cyan-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Հիմնական Տեքստ (Caption)</label>
                <textarea id="post-caption" rows="5" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none custom-scroll"></textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">CTA & Հեշթեգեր</label>
                <input type="text" id="post-cta" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-cyan-400 focus:border-cyan-500 focus:outline-none mb-2">
                <input type="text" id="post-hashtags" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 focus:border-cyan-500 focus:outline-none font-mono">
              </div>
            </div>
            <div class="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-2 text-xs text-amber-400 font-medium">
                <i data-lucide="shield-alert" class="w-4 h-4"></i> Սպասում է ձեր հաստատմանը
              </div>
              <div class="flex items-center gap-3 w-full sm:w-auto">
                <button onclick="savePostToSchedule()" class="flex-1 sm:flex-none px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                  <i data-lucide="clock" class="w-4 h-4"></i> Պլանավորել
                </button>
                <button onclick="approveAndPublishNow()" class="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2">
                  <i data-lucide="check-circle" class="w-4 h-4"></i> Հաստատել և Տեղադրել
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
""")
