with open(r"public\index.html", "w", encoding="utf-8") as f:
    f.write("""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architeksoft • Marketing & Social Automation</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scroll::-webkit-scrollbar-track { background: #0f172a; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">AS</div>
        <div>
          <h1 class="font-bold text-lg tracking-tight flex items-center gap-2">Architeksoft <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">Marketing Engine</span></h1>
          <p class="text-xs text-slate-400">Unreal Engine Render & Social Automation</p>
        </div>
      </div>
      <nav class="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
        <button onclick="switchTab('library')" id="nav-library" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"><i data-lucide="image" class="w-4 h-4"></i> Գրադարան</button>
        <button onclick="switchTab('studio')" id="nav-studio" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 text-slate-400 hover:text-slate-200"><i data-lucide="sparkles" class="w-4 h-4"></i> AI Studio</button>
        <button onclick="switchTab('calendar')" id="nav-calendar" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 text-slate-400 hover:text-slate-200"><i data-lucide="calendar" class="w-4 h-4"></i> Օրացույց</button>
        <button onclick="switchTab('settings')" id="nav-settings" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 text-slate-400 hover:text-slate-200"><i data-lucide="settings" class="w-4 h-4"></i> Կարգավորումներ</button>
      </nav>
      <div class="flex items-center space-x-3">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Local Server Online
        </span>
      </div>
    </div>
  </header>
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
""")
