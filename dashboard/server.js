import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const ASSETS_DIR = path.join(__dirname, "..", "media_library");
const GENERATED_DIR = path.join(__dirname, "public", "generated");
const LANDING_DIR = path.join(__dirname, "..", "landing_page");
const DASHBOARD_PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Static Assets
app.use("/assets", express.static(path.join(LANDING_DIR, "assets")));
app.use("/local-assets", express.static(ASSETS_DIR));
app.use("/generated", express.static(GENERATED_DIR));

// Enterprise Multi-Page Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

app.get("/capabilities", (req, res) => {
  const filePath = path.join(LANDING_DIR, "capabilities.html");
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

app.get(["/process", "/how-it-works"], (req, res) => {
  const filePath = path.join(LANDING_DIR, "process.html");
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

app.get("/portfolio", (req, res) => {
  const filePath = path.join(LANDING_DIR, "portfolio.html");
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

app.get(["/b2b", "/for-manufacturers"], (req, res) => {
  const filePath = path.join(LANDING_DIR, "b2b.html");
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

app.get(["/configurator", "/configurator.html", "/showroom", "/3d"], (req, res) => {
  const filePath = path.join(LANDING_DIR, "configurator.html");
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

app.get("/contact", (req, res) => {
  const filePath = path.join(LANDING_DIR, "contact.html");
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.sendFile(path.join(LANDING_DIR, "index.html"));
});

// Marketing & Project Admin Dashboard
app.get(["/admin", "/dashboard"], (req, res) => {
  res.sendFile(path.join(DASHBOARD_PUBLIC_DIR, "index.html"));
});

// Client Presentation Portals
app.get(["/p/:slug", "/portal/:slug"], (req, res) => {
  res.sendFile(path.join(DASHBOARD_PUBLIC_DIR, "portal.html"));
});

// Dashboard public static assets (e.g., /app.js)
app.use(express.static(DASHBOARD_PUBLIC_DIR));

function loadData() {
  const defaultProjects = [
    {
      id: "proj_aren_kitchen",
      slug: "aren-kitchen",
      clientName: "Արեն (Aren)",
      code: "AT-2026-042",
      category: "Ժամանակակից Պրեմիում Խոհանոց",
      title: "Aren • Bespoke Luxury Kitchen Architecture",
      description: "Անհատական նախագծված պրեմիում խոհանոց՝ բնական փայտի շպոնով, քվարցային մակերեսներով և ինտեգրված Blum ֆուրնիտուրայով: Էսքիզից մինչև 4K Unreal Engine 5 ինտերակտիվ վիզուալիզացիա և գործարանային ճշգրիտ ռասկրոյ:",
      sketchUrl: "/local-assets/photo_2026-09-08_15-44-07.jpg",
      renders: [
        "/local-assets/WD1.jpg",
        "/local-assets/WD2.jpg",
        "/local-assets/WD3.jpg"
      ],
      videoUrl: "/local-assets/ArchiTek_Kitchen%20Preview%20.mp4",
      pdfUrl: "/local-assets/Aren.pdf",
      pixelStreamingUrl: "https://live.architeksoft.com/aren",
      webViewerUrl: "https://viewer.architeksoft.com/aren",
      status: "READY_FOR_PRODUCTION",
      createdAt: new Date().toISOString()
    }
  ];

  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (!data.projects || data.projects.length === 0) {
        data.projects = defaultProjects;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
      }
      return data;
    } catch (e) {
      console.error("Error reading data.json", e);
    }
  }
  const initialData = { posts: [], projects: defaultProjects };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  return initialData;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch (e) {}
  }
  return {
    geminiApiKey: "AQ.Ab8RN6JD0sVDHlV4FLyqZl1dAKC_WcyI3jKvorE42FxNs8kMSg",
    language: "hy",
    facebookPageId: "",
    facebookPageToken: "",
    brandName: "ArchiTek Soft",
    website: "architeksoft.com"
  };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

app.get("/api/config", (req, res) => res.json(loadConfig()));
app.post("/api/config", (req, res) => {
  const current = loadConfig();
  const updated = { ...current, ...req.body };
  saveConfig(updated);
  res.json({ success: true, config: updated });
});

app.get("/api/assets", (req, res) => {
  try {
    if (!fs.existsSync(ASSETS_DIR)) return res.json([]);
    const files = fs.readdirSync(ASSETS_DIR);
    const data = loadData();

    const assets = files
      .filter(f => /\.(jpg|jpeg|png|webp|mp4|mov)$/i.test(f))
      .map(file => {
        const filePath = path.join(ASSETS_DIR, file);
        const stats = fs.statSync(filePath);
        const isVideo = /\.(mp4|mov)$/i.test(file);
        const isLogo = /logo/i.test(file);

        const usedInPosts = data.posts.filter(p => (p.assetFiles || [p.assetFile]).includes(file));
        const lastUsed = usedInPosts.length > 0 
          ? usedInPosts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt 
          : null;

        return {
          filename: file,
          url: `/local-assets/${encodeURIComponent(file)}`,
          isVideo,
          isLogo,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime,
          usageCount: usedInPosts.length,
          lastUsedAt: lastUsed
        };
      });

    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: AI Copy Generator
app.post("/api/generate-copy", async (req, res) => {
  try {
    const { 
      assetNames = ["WD1.jpg"], 
      category = "Ժամանակակից Խոհանոց", 
      instructions = "", 
      language = "hy" 
    } = req.body;
    
    const config = loadConfig();

    const systemPrompt = `Դուք հանդիսանում եք Architeksoft (architeksoft.com) ընկերության պրոֆեսիոնալ մարքեթոլոգ և SMM մասնագետ:
Architeksoft-ը ստեղծում է Unreal Engine 5-ի վրա հիմնված ֆոտոռեալիստիկ 3D վիզուալիզացիաներ, ինտերակտիվ շոուրումներ և կոնֆիգուրատորներ կահույք և խոհանոց արտադրողների, ինտերիեր դիզայներների և ճարտարապետների համար:

Նախագծի նկարներ/վիդեոներ: ${JSON.stringify(assetNames)}
Կատեգորիա: "${category}"
Լրացուցիչ ցուցումներ: "${instructions}"

ՊԱՀԱՆՋ: Գրեք գրավիչ, գրագետ, վաճառող ՀԱՅԵՐԵՆ տեքստեր 4 հարթակների համար (Facebook, Instagram, LinkedIn, YouTube): Տեքստը պետք է լինի 100% ՀԱՅԵՐԵՆ:

Վերադարձրեք ՄԻԱՅՆ հետևյալ JSON սխեմայով օբյեկտ:
{
  "conceptTitle": "Կարճ վերնագիր հայերենով",
  "recommendedOverlayText": "Պաստառի կարգախոս հայերեն",
  "facebook": {
    "headline": "Գրավիչ վերնագիր Facebook-ի համար",
    "caption": "Մանրամասն պատմողական տեքստ հայերեն (2-3 պարբերություն): Նկարագրեք նախագծի գեղեցկությունը, լուսավորությունը, անտեսանելի պահարանները, բարձրորակ ռեալիզմը և թե ինչպես է ինտերակտիվ 3D-ն օգնում պատվիրատուին տեսնել իր ապագա կահույքը նախքան պատրաստելը:",
    "cta": "Տեսեք նախագծի ինտերակտիվ 3D տարբերակը մեր կայքում՝ https://architeksoft.com",
    "hashtags": ["#ԽոհանոցիԴիզայն", "#ԻնտերիերԴիզայն", "#ԿահույքիԱրտադրություն", "#3DՎիզուալիզացիա", "#Architeksoft", "#UnrealEngine5"]
  },
  "instagram": {
    "hook": "Գրավիչ հարց կամ միտք էմոջիներով ✨",
    "caption": "Էսթետիկ Instagram-ի տեքստ (2-3 նախադասություն)՝ շեշտելով դետալները, գույները և նորաոճ լուծումները:",
    "cta": "Անցեք պրոֆիլի հղումով՝ ինտերակտիվ 3D շոուրումը փորձելու համար 🛋️",
    "hashtags": ["#Խոհանոց", "#Ինտերիեր", "#Դիզայն", "#Կահույք", "#3DԴիզայն", "#Architeksoft", "#InteriorsArmenia", "#YerevanDesign"]
  },
  "linkedin": {
    "headline": "B2B Վերնագիր Կահույք Արտադրողների Համար",
    "caption": "Պրոֆեսիոնալ B2B տեքստ՝ ուղղված կահույքի և խոհանոցի արտադրողներին:\n\nԻնչո՞ւ են առաջատար շոուրումները հրաժարվում թղթային կատալոգներից և անցնում Real-Time 3D-ի.\n1. Հաճախորդը տեսնում է կահույքը իրական մասշտաբով և լուսավորությամբ\n2. Ցանկացած նյութի և գույնի փոփոխություն 1 վայրկյանում\n3. Պատվերի հաստատման ժամկետի կրճատում 40%-ով\n\nԻնչպե՞ս եք դուք այսօր ներկայացնում ձեր նոր նախագծերը պատվիրատուներին:",
    "cta": "Ծանոթացեք համագործակցության հնարավորություններին՝ architeksoft.com",
    "hashtags": ["#ԿահույքիԲիզնես", "#Արտադրություն", "#3DՏեխնոլոգիաներ", "#B2BArmenia", "#Architeksoft"]
  },
  "youtube": {
    "title": "Ժամանակակից Խոհանոցի 3D Վիզուալիզացիա | Unreal Engine 5 | Architeksoft",
    "description": "Architeksoft-ի կողմից ստեղծված ֆոտոռեալիստիկ ինտերիերի և խոհանոցի 3D շնորհանդես Unreal Engine 5-ում:\n\nԻնտերակտիվ 3D շոուրումների համար այցելեք՝ https://architeksoft.com\n\n#Shorts #Խոհանոց #Ինտերիեր #Architeksoft",
    "tags": ["architeksoft", "խոհանոցի դիզայն", "ինտերիեր դիզայն", "կահույք", "unreal engine 5", "3d render armenia"]
  }
}`;

    let aiResult = null;

    if (config.geminiApiKey) {
      const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
      for (const m of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.geminiApiKey}`;
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7
              }
            })
          });

          if (response.ok) {
            const json = await response.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              aiResult = JSON.parse(text);
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (!aiResult) {
      aiResult = {
        conceptTitle: `${category} • 3D Շնորհանդես (${assetNames.length} նկար)`,
        recommendedOverlayText: "Ֆոտոռեալիստիկ 3D Խոհանոց",
        facebook: {
          headline: `Ինչպե՞ս պետք է ճիշտ ներկայացնել ${category.toLowerCase()}ը հաճախորդին ✨`,
          caption: `Ստանդարտ գծագրերն ու 2D էսքիզներն այլևս բավարար չեն պատվիրատուին ամբողջական պատկերացում տալու համար:\n\nArchiteksoft-ի Unreal Engine 5 ինտերակտիվ վիզուալիզացիան թույլ է տալիս քայլել ապագա խոհանոցում, զգալ նյութերի իրական որակը, տեսնել լուսավորությունն օրվա տարբեր ժամերին և փոխել ֆասադների գույները 1 սեղմումով:\n\nԱյս ամբողջական նախագիծը հնարավորություն է տալիս կահույքագործներին ու դիզայներներին զրոյացնել պատվիրատուի հետ անհամաձայնությունները և հաստատել նախագիծը առաջին իսկ հանդիպման ժամանակ:`,
          cta: "Բացահայտեք ինտերակտիվ 3D շոուրումի հնարավորությունները՝ https://architeksoft.com",
          hashtags: ["#ԽոհանոցիԴիզայն", "#ԻնտերիերԴիզայն", "#ԿահույքիԱրտադրություն", "#3DՎիզուալիզացիա", "#Architeksoft", "#UnrealEngine5"]
        },
        instagram: {
          hook: "Ֆոտոռեալիստիկ ճշգրտություն և մինիմալիստական էսթետիկա ✨",
          caption: `Այս ${category.toLowerCase()}ի յուրաքանչյուր դետալ՝ մակերեսների արտացոլանքից մինչև անտեսանելի բռնակներ, ստեղծված է Real-Time 3D-ով: Իդեալական լուծում ժամանակակից ինտերիերի համար:`,
          cta: "Անցեք պրոֆիլի հղումով՝ ինտերակտիվ 3D շոուրումը փորձելու համար 🛋️",
          hashtags: ["#Խոհանոց", "#Ինտերիեր", "#Դիզայն", "#Կահույք", "#3DԴիզայն", "#Architeksoft", "#InteriorsArmenia", "#YerevanDesign"]
        },
        linkedin: {
          headline: `Ինչո՞ւ են Կահույքի Առաջատար Արտադրողներն Անցնում Real-Time 3D Վիզուալիզացիայի`,
          caption: `Ֆիզիկական շոուրումների տարածքը սահմանափակ է, իսկ յուրաքանչյուր նոր մոդել ցուցադրելը՝ ծախսատար:\n\nArchiteksoft-ի ինտերակտիվ Unreal Engine համակարգը թույլ է տալիս արտադրողներին.\n• Ցուցադրել անսահմանափակ կահույքի մոդելներ և գունային տարբերակներ\n• Կրճատել պատվերի քննարկման և հաստատման ժամանակը\n• Ապահովել պրեմիում դասի ֆոտոռեալիստիկ սպասարկում\n\nԻնչպե՞ս եք դուք այսօր ներկայացնում ձեր նախագծերը պատվիրատուներին:`,
          cta: "Կապվեք մեզ հետ B2B համագործակցության համար՝ architeksoft.com",
          hashtags: ["#ԿահույքիԲիզնես", "#Արտադրություն", "#3DՏեխնոլոգիաներ", "#B2BArmenia", "#Architeksoft"]
        },
        youtube: {
          title: `Ժամանակակից Խոհանոցի 3D Վիզուալիզացիա | Unreal Engine 5 | Architeksoft`,
          description: `Architeksoft-ի ֆոտոռեալիստիկ ինտերիերի և խոհանոցի 3D շնորհանդես:\n\nԿայք՝ https://architeksoft.com\n\n#Shorts #Խոհանոց #Ինտերիեր #Architeksoft`,
          tags: ["architeksoft", "խոհանոցի դիզայն", "ինտերիեր դիզայն", "կահույք", "unreal engine 5", "3d render armenia"]
        }
      };
    }

    res.json({ success: true, copy: aiResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 3 Luxury Poster Generation Styles
app.post("/api/generate-poster", async (req, res) => {
  try {
    const { 
      assetName = "WD1.jpg", 
      aspectRatio = "1:1", 
      overlayText = "Ֆոտոռեալիստիկ 3D Խոհանոց",
      style = "editorial" // 'minimal', 'editorial', 'before_after'
    } = req.body;

    const inputPath = path.join(ASSETS_DIR, assetName);
    const logoPath = path.join(ASSETS_DIR, "ArchiTek_logo_Carrd.png");
    const sketchPath = path.join(ASSETS_DIR, "photo_2026-09-08_15-44-07.jpg");

    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: "Source image not found" });
    }

    let width = 1080;
    let height = 1080;
    if (aspectRatio === "4:5") {
      width = 1080;
      height = 1350;
    } else if (aspectRatio === "16:9") {
      width = 1200;
      height = 675;
    } else if (aspectRatio === "9:16") {
      width = 1080;
      height = 1920;
    }

    const outputFilename = `poster_${style}_${path.parse(assetName).name}_${aspectRatio.replace(":", "x")}_${Date.now()}.jpg`;
    const outputPath = path.join(GENERATED_DIR, outputFilename);

    const safeText = overlayText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ==========================================
    // STYLE 1: PURE 4K MINIMALIST (Full-Bleed, no crop)
    // ==========================================
    if (style === "minimal") {
      let baseImage = sharp(inputPath).resize(width, height, { fit: "cover", position: "center" });

      const svgOverlay = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="subtleTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="subtleBottom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#000000" stop-opacity="0" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0.75" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${width}" height="100" fill="url(#subtleTop)" />
          <rect x="0" y="${height - 100}" width="${width}" height="100" fill="url(#subtleBottom)" />

          <!-- Minimal Watermark -->
          <text x="${width - 40}" y="${height - 35}" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="end" letter-spacing="1">ARCHITEKSOFT.COM</text>
          <text x="40" y="${height - 35}" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="600" fill="#38bdf8" letter-spacing="0.5">UNREAL ENGINE 5 • 4K ՌԵԱԼԻԶՄ</text>
        </svg>
      `;

      const composites = [{ input: Buffer.from(svgOverlay), top: 0, left: 0 }];
      if (fs.existsSync(logoPath)) {
        const logoBuffer = await sharp(logoPath).resize(140, null, { fit: "inside" }).toBuffer();
        composites.push({ input: logoBuffer, top: 30, left: width - 170 });
      }

      await baseImage.composite(composites).jpeg({ quality: 95 }).toFile(outputPath);
    }

    // ==========================================
    // STYLE 2: EDITORIAL MAGAZINE FRAME (No Render Crop! Full Architectural Canvas)
    // ==========================================
    else if (style === "editorial") {
      // 1. Create elegant dark canvas
      const canvas = sharp({
        create: {
          width: width,
          height: height,
          channels: 4,
          background: { r: 7, g: 11, b: 20, alpha: 1 } // Deep luxury slate
        }
      });

      // 2. Render image uncropped in center
      const renderHeight = Math.round(height * 0.76);
      const renderWidth = width - 48;
      const renderBuffer = await sharp(inputPath)
        .resize(renderWidth, renderHeight, { fit: "contain", background: { r: 7, g: 11, b: 20, alpha: 1 } })
        .toBuffer();

      const topBarY = 24;
      const renderY = 80;
      const footerY = height - 120;

      const svgOverlay = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <!-- Top Header Tag -->
          <rect x="24" y="${topBarY}" width="160" height="32" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
          <text x="104" y="${topBarY + 21}" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">ARCHITEKSOFT</text>

          <text x="${width - 24}" y="${topBarY + 22}" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="600" fill="#94a3b8" text-anchor="end" letter-spacing="1">ARCHITECTURAL SHOWCASE</text>

          <!-- Footer Area -->
          <rect x="24" y="${footerY}" width="${width - 48}" height="96" rx="12" fill="#0f172a" fill-opacity="0.9" stroke="#1e293b" stroke-width="1.5" />
          
          <text x="48" y="${footerY + 40}" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff" letter-spacing="0.5">${safeText}</text>
          <text x="48" y="${footerY + 70}" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="600" fill="#38bdf8" letter-spacing="0.5">3D ԻՆՏԵՐԱԿՏԻՎ ՇՈՈՒՐՈՒՄ • UNREAL ENGINE 5</text>
          
          <text x="${width - 48}" y="${footerY + 55}" font-family="DejaVu Sans, Arial, sans-serif" font-size="15" font-weight="700" fill="#cbd5e1" text-anchor="end">architeksoft.com</text>
        </svg>
      `;

      const composites = [
        { input: renderBuffer, top: renderY, left: 24 },
        { input: Buffer.from(svgOverlay), top: 0, left: 0 }
      ];

      await canvas.composite(composites).jpeg({ quality: 95 }).toFile(outputPath);
    }

    // ==========================================
    // STYLE 3: BEFORE & AFTER (Sketch -> 3D Render)
    // ==========================================
    else if (style === "before_after") {
      const halfWidth = Math.round(width / 2);

      // Left: Sketch
      let leftSketchBuffer;
      if (fs.existsSync(sketchPath)) {
        leftSketchBuffer = await sharp(sketchPath)
          .resize(halfWidth, height, { fit: "cover", position: "center" })
          .toBuffer();
      } else {
        leftSketchBuffer = await sharp(inputPath)
          .grayscale()
          .resize(halfWidth, height, { fit: "cover" })
          .toBuffer();
      }

      // Right: 3D Render
      const rightRenderBuffer = await sharp(inputPath)
        .resize(halfWidth, height, { fit: "cover", position: "center" })
        .toBuffer();

      const svgDivider = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#000000" stop-opacity="0" />
              <stop offset="100%" stop-color="#050811" stop-opacity="0.9" />
            </linearGradient>
          </defs>

          <!-- Vertical dividing line -->
          <line x1="${halfWidth}" y1="0" x2="${halfWidth}" y2="${height}" stroke="#38bdf8" stroke-width="4" />

          <!-- Badges -->
          <rect x="30" y="30" width="170" height="34" rx="6" fill="#0f172a" fill-opacity="0.9" stroke="#94a3b8" stroke-width="1.5" />
          <text x="115" y="52" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#f8fafc" text-anchor="middle">1. ԷՍՔԻԶ (SKETCH)</text>

          <rect x="${halfWidth + 30}" y="30" width="210" height="34" rx="6" fill="#0f172a" fill-opacity="0.9" stroke="#38bdf8" stroke-width="1.5" />
          <text x="${halfWidth + 135}" y="52" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle">2. UNREAL ENGINE 5 3D</text>

          <!-- Center Comparison Pill -->
          <circle cx="${halfWidth}" cy="${Math.round(height / 2)}" r="28" fill="#0f172a" stroke="#38bdf8" stroke-width="3" />
          <text x="${halfWidth}" y="${Math.round(height / 2) + 5}" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="900" fill="#38bdf8" text-anchor="middle">VS</text>

          <!-- Bottom bar -->
          <rect x="0" y="${height - 110}" width="${width}" height="110" fill="url(#bottomGrad)" />
          <text x="40" y="${height - 50}" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff">ԷՍՔԻԶԻՑ ՄԻՆՉԵՎ 3D ՌԵԱԼԻԶՄ</text>
          <text x="40" y="${height - 25}" font-family="DejaVu Sans, Arial, sans-serif" font-size="13" font-weight="600" fill="#38bdf8">ARCHITEKSOFT • ԻՆՏԵՐԱԿՏԻՎ ՎԻԶՈՒԱԼԻԶԱՑԻԱ</text>
          <text x="${width - 40}" y="${height - 40}" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" font-weight="700" fill="#cbd5e1" text-anchor="end">architeksoft.com</text>
        </svg>
      `;

      const composites = [
        { input: leftSketchBuffer, top: 0, left: 0 },
        { input: rightRenderBuffer, top: 0, left: halfWidth },
        { input: Buffer.from(svgDivider), top: 0, left: 0 }
      ];

      await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
      })
      .composite(composites)
      .jpeg({ quality: 95 })
      .toFile(outputPath);
    }

    res.json({
      success: true,
      url: `/generated/${outputFilename}`,
      filename: outputFilename,
      width,
      height,
      aspectRatio,
      style
    });
  } catch (error) {
    console.error("Poster generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Posts API
app.get("/api/posts", (req, res) => res.json(loadData().posts));

app.post("/api/posts", (req, res) => {
  const data = loadData();
  const assetFiles = req.body.assetFiles || [req.body.assetFile];
  const newPost = {
    id: "post_" + Date.now(),
    createdAt: new Date().toISOString(),
    status: req.body.status || "AWAITING_APPROVAL",
    assetFiles: assetFiles,
    posterUrls: req.body.posterUrls || [req.body.posterUrl],
    targetPlatforms: req.body.targetPlatforms || ["facebook"],
    scheduledFor: req.body.scheduledFor || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    copy: req.body.copy,
    publishLog: []
  };

  data.posts.unshift(newPost);
  saveData(data);
  res.json({ success: true, post: newPost });
});

app.post("/api/posts/:id/publish", async (req, res) => {
  const data = loadData();
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const config = loadConfig();
  const results = [];

  if (post.targetPlatforms.includes("facebook")) {
    if (config.facebookPageId && config.facebookPageToken) {
      try {
        const fbUrl = `https://graph.facebook.com/v20.0/${config.facebookPageId}/feed`;
        const fbResponse = await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `${post.copy.facebook.headline}\n\n${post.copy.facebook.caption}\n\n${post.copy.facebook.cta}\n\n${post.copy.facebook.hashtags.join(" ")}`,
            access_token: config.facebookPageToken
          })
        });
        const fbJson = await fbResponse.json();
        if (fbResponse.ok && fbJson.id) {
          results.push({ platform: "facebook", status: "SUCCESS", postId: fbJson.id });
        } else {
          results.push({ platform: "facebook", status: "FAILED", error: fbJson.error?.message || "FB publish failed" });
        }
      } catch (err) {
        results.push({ platform: "facebook", status: "FAILED", error: err.message });
      }
    } else {
      results.push({
        platform: "facebook",
        status: "SIMULATED_SUCCESS",
        note: "Փորձնական հրապարակում (Facebook Access Token-ը դեռ գրված չէ Կարգավորումներում)"
      });
    }
  }

  post.status = results.some(r => r.status.includes("SUCCESS")) ? "PUBLISHED" : "FAILED";
  post.publishedAt = new Date().toISOString();
  post.publishLog = results;
  saveData(data);

  res.json({ success: true, post, results });
});

// ==========================================
// CLIENT SHOWCASE PORTALS API & ROUTES
// ==========================================
app.get("/api/projects", (req, res) => {
  const data = loadData();
  res.json(data.projects || []);
});

app.get("/api/projects/:slug", (req, res) => {
  const data = loadData();
  const slug = req.params.slug;
  const project = (data.projects || []).find(p => p.slug === slug || p.id === slug);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

app.post("/api/projects", (req, res) => {
  const data = loadData();
  if (!data.projects) data.projects = [];
  
  const {
    id,
    clientName = "Նոր Պատվիրատու",
    code = "AT-" + Date.now().toString().slice(-4),
    category = "Ժամանակակից Խոհանոց",
    title = "",
    description = "",
    sketchUrl = "",
    renders = [],
    videoUrl = "",
    pdfUrl = "",
    pixelStreamingUrl = "",
    webViewerUrl = "",
    status = "READY_FOR_PRODUCTION"
  } = req.body;

  const slug = req.body.slug || (clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proj-" + Date.now());

  const newProject = {
    id: id || "proj_" + Date.now(),
    slug,
    clientName,
    code,
    category,
    title: title || `${clientName} • ${category}`,
    description,
    sketchUrl,
    renders: Array.isArray(renders) ? renders : [renders],
    videoUrl,
    pdfUrl,
    pixelStreamingUrl,
    webViewerUrl,
    status,
    createdAt: new Date().toISOString()
  };

  const existingIndex = data.projects.findIndex(p => p.id === newProject.id || p.slug === newProject.slug);
  if (existingIndex >= 0) {
    data.projects[existingIndex] = { ...data.projects[existingIndex], ...newProject };
  } else {
    data.projects.unshift(newProject);
  }

  saveData(data);
  res.json({ success: true, project: newProject });
});

app.delete("/api/projects/:id", (req, res) => {
  const data = loadData();
  if (!data.projects) data.projects = [];
  data.projects = data.projects.filter(p => p.id !== req.params.id && p.slug !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// Client-facing portal page routes
app.get("/p/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "portal.html"));
});

app.get("/portal/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "portal.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Architeksoft Marketing Dashboard is running at http://localhost:${PORT}`);
});
