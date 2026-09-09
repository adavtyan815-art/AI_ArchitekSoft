# 🏛️ Architeksoft AI & Ecosystem Master Briefing

> **Հրահանգ նոր չաթի AI օգնականին (System Prompt Context):**
> Այս փաստաթուղթը պարունակում է Architeksoft-ի ամբողջական բիզնես մոդելը, տեխնիկական ճարտարապետությունը, կատարված աշխատանքը և հաջորդ քայլերը: Կարդացեք սա՝ առանց որևէ բան բաց թողնելու աշխատանքը շարունակելու համար:

---

## 1. Ընկերության և Պրոդուկտի Էությունը (Product Overview)

**Architeksoft** ([architeksoft.com](https://www.architeksoft.com)) — Կահույքի և ինտերիերի ոլորտի բարձրտեխնոլոգիական 3D վիզուալիզացիայի և արտադրական թվայնացման հարթակ:

### 🌟 4 Հիմնական Փուլերը (The 4-Pillar Pipeline):
1. **Էսքիզ (Hand Sketch)**: Պատվիրատուի կամ դիզայների ձեռքի նախնական գծագիր:
2. **4K Ռեալիզմ & Ինտերակտիվություն (Unreal Engine 5 Pixel Streaming)**:
   * Գործում է AWS սերվերներից (`live.architeksoft.com/username`):
   * Ազատ տեղաշարժ, դարակների բացում/փակում, ֆասադների/նյութերի ակնթարթային փոփոխություն, 60 FPS Lumen Ray-Tracing:
3. **Web 3D Viewer & AR (Augmented Reality)**:
   * Գործում է ցանկացած սմարթֆոնից (`viewer.architeksoft.com/username`):
   * Տեսախցիկի միջոցով կահույքի պրոյեկտում իրական սենյակում (AR QuickLook / SceneViewer):
4. **Արտադրական Ճշգրիտ Ռասկրոյ & Կոնստրուկցիա (PDF Blueprint)**:
   * Գործարանային CNC ռասկրոյի քարտեզ, եզրաշերտեր (ABS), Blum ֆուրնիտուրա, հավաքման սխեմաներ (`Aren.pdf`):

---

## 2. Ռազմավարական Դիրքավորումը (Brand Strategy)

* **ԳԼԽԱՎՈՐ ՆՊԱՏԱԿԸ**: Ոչ թե B2C մանրածախ վաճառք կամ լայքեր հավաքել, այլ **ՏԵԽՆՈԼՈԳԻԱԿԱՆ ՀԵՂԻՆԱԿՈՒԹՅՈՒՆ, ՊՐԵՍՏԻԺ ԵՎ ԲԱՐՁՐ ՆԵՐԿԱՅԱՆԱԼԻՈՒԹՅՈՒՆ (B2B Authority & Prestige)**:
* **Ոճը**: Մինիմալիստական, ինժեներական, «Show, Don't Tell» (թող աշխատանքը խոսի, ոչ թե երկար գովազդային տեքստերը):
* **Լեզուն**: 100% Գրագետ, պրոֆեսիոնալ ՀԱՅԵՐԵՆ:

---

## 3. Ինչ է Արդեն Ստեղծված և Պատրաստ Լոկալ (`D:\ArchiTek_Soft\AI_ArchitekSoft`)

### 📁 Կառուցվածքը
```text
D:\ArchiTek_Soft\AI_ArchitekSoft\
├── dashboard\         ➔ Node.js/Express կառավարման վահանակ և շարժիչ (Port: 3456)
│   ├── server.js      ➔ Backend API, Sharp պատկերների մշակում, Project CRUD, SMM generator
│   ├── public\
│   │   ├── portal.html ➔ Հաճախորդի էլիտար էջի շաբլոն (/p/:slug)
│   │   ├── index.html  ➔ Dashboard UI (Պորտալներ, Գրադարան, AI Studio, Օրացույց)
│   │   └── app.js      ➔ Ֆրոնտենդի ամբողջական տրամաբանություն
│   ├── data.json      ➔ Բազա (Նախագծեր և Փոստեր)
│   └── config.json    ➔ Կարգավորումներ (Gemini API, Facebook API)
│
├── media_library\     ➔ Նախագծերի բնօրինակ ֆայլեր (4K ռենդերներ, էսքիզ, վիդեո, Aren.pdf)
├── website\           ➔ Պատրաստ է architeksoft.com Git repository-ի կլոնավորմանը
├── docs\              ➔ Այս փաստաթուղթը (PROJECT_CONTEXT.md)
└── start_server.bat   ➔ 1-կտտոցով սերվերի գործարկում
```

### 🌟 Ինչ է աշխատում այս պահին
1. **Հաճախորդի Անհատական Պորտալ (1 Հղումով)**:
   * Հասցե՝ `http://localhost:3456/p/aren-kitchen`
   * Պարունակում է՝
     * 🎮 Embedded UE5 Live Viewport սիմուլյատոր (Lumen, Fullscreen, Color swapper)
     * 🔄 Before & After ինտերակտիվ սահիկ (Էսքիզ $\leftrightarrow$ 4K Ռենդեր)
     * 🖼️ 4K Գալերեա (Zoom Lightbox)
     * 🎥 Preview Video Player
     * 📑 PDF Ռասկրոյի դիտիչ և ներբեռնում (`Aren.pdf`)
     * 📱 AR QR-Code մոդալ
2. **Dashboard (Կառավարման Վահանակ)**:
   * Հասցե՝ `http://localhost:3456`
   * «+ Ստեղծել Նոր Պորտալ» ֆորմա (հաճախորդի անուն, կոդ, ֆայլերի կցում, 1-կտտոցով ստեղծում),
   * 1-կտտոցով SMM Փաթեթի գեներացիա (LinkedIn B2B, Instagram, Facebook, YouTube):

---

## 4. Հաջորդ Քայլերը (Next Action Items)

1. **Git Repository Clone**: Ներբեռնել `architeksoft.com` կայքի կոդը `D:\ArchiTek_Soft\AI_ArchitekSoft\website` թղթապանակում:
2. **Ավելացնել 50+ Նախագծերը**: Մեդիա պահոցի միջոցով ստեղծել բոլոր պատվերների անհատական պորտալները:
3. **Gemini Multimodal Vision Ակտիվացում**: Որպեսզի AI-ն ինքնուրույն նկարից ճանաչի կահույքի տեսակը (հյուրասենյակ/TV գոտի, խոհանոց, ննջասենյակ) և գրի 100% ճշգրիտ տեքստեր:
4. **Սոց-Էջերի Ուղիղ Հրապարակում**: Facebook Graph API, LinkedIn API և Instagram հրապարակումների ակտիվացում:
