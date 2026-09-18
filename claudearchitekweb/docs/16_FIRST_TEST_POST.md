# 16 — Առաջին փորձնական փոստը · First test post

Ամբողջ ուղեցույցը նախ հայերեն է, հետո՝ անգլերեն (տես [English](#english)).
The whole guide is in Armenian first; the English version starts at [English](#english).

Այս փաստաթուղթը սեփականատիրոջ քայլ առ քայլ ուղեցույցն է՝ ինչպես այսօր, առանց ոչ մի բանալու,
անցնել ամբողջ հրապարակման շղթան փորձնական ռեժիմում, և ինչպես հետո՝ հարթակ առ հարթակ՝ անցնել
իրական հրապարակման։ Համակարգի ընդհանուր նկարագրությունը՝ `05_SMM_AUTOMATION.md`,
inbox պանակը՝ `15_INBOX_WORKFLOW.md`։

---

## 1. Փորձնական հրապարակում այսօր (առանց բանալիների)

Առանց բանալիների ոչ մի հարթակ չի կանչվում։ Ադապտերը վերադարձնում է **«Փորձնական»** և գրում է,
թե ինչ կհրապարակվեր և որ փոփոխականներն են պակասում։ Ստուգումները նույնն են, ինչ իրական
հրապարակման ժամանակ, ուստի եթե, օրինակ, YouTube-ի համար վիդեո չկա, փորձնականն էլ կձախողվի։

### 1.1 Ճանապարհ Ա — կոմպոզիտոր

1. Մուտք գործիր `/admin`, բացիր **Սոց. ցանցեր** → **Նոր փոստ** (`/admin/smm/new`)։
2. Ընտրիր նախագիծը։ Մեդիայի ցանկը կսահմանափակվի այդ նախագծի ֆայլերով, իսկ եթե հետո փոխես
   նախագիծը, ընտրվածը կմաքրվի ու էկրանը դա կասի։
3. Ընտրիր մեդիան՝ առավելագույնը **20 ֆայլ**։ Ցանկության դեպքում սեղմիր պաստառի կոճակը և ստացիր
   բրենդավորված 1:1 / 4:5 / 16:9 / 9:16 JPEG — այն դառնում է առաջին նկարը։
4. Ընտրիր նպատակը (`showcase`, `trust`, `sales_b2b`, `sales_b2c`, `education`), լեզուն և հարթակները։
   Լռելյայն հարթակները գալիս են **Կարգավորումներ → Սոց. ցանցեր**-ից, լեզուն՝ **Կարգավորումներ → Բրենդ**-ից,
   իսկ ժամը նախապես լրացվում է հրապարակման օրերի ու ժամի հաջորդ ազատ դիրքով։
5. Կողային սյունակում նայիր **Copywriter** տողը։ Եթե գրված է `template`, ANTHROPIC_API_KEY և
   GEMINI_API_KEY չկան, և տեքստը գրում են ներկառուցված ձևանմուշները։ Դա խնդիր չէ. մնացած ամեն ինչ
   աշխատում է նույն կերպ։
6. Սեղմիր ստեղծելու կոճակը։ Կստացվի մեկ փոստ՝ մեկ տարբերակով յուրաքանչյուր ընտրված հարթակի համար,
   և կբացվի խմբագրիչը։

### 1.2 Խմբագրիչ — ինչ ես տեսնում

- Ձախում՝ ներքին անվանումը, նպատակը, լեզուն, պլանավորված ժամը (**Set** կոճակով) և մեդիայի շերտը։
- Աջում՝ մեկ քարտ յուրաքանչյուր հարթակի համար. **Միացված** անջատիչ, ֆորմատ
  (`image` · `carousel` · `video` · `reel` · `short` · `text`), տեքստ, կոչ (CTA), հեշթեգներ՝ *n*/40
  հաշվիչով, և **AI-ով բարելավել** դաշտը։
- Վերնագրի դաշտ կա միայն այնտեղ, որտեղ հարթակն իրոք վերնագիր է հրապարակում՝ **YouTube** և **LinkedIn**։
- Նիշերի հաշվիչը ցույց է տալիս հարթակի սահմանը, իսկ եթե մեդիա է կցված՝ Telegram-ի համար իջնում է
  **1024**-ի (երկար տեքստը գնում է առանձին հաղորդագրությամբ՝ մեդիայի տակ)։
- Պահպանելիս էկրանը հայտնում է, թե որ հարթակների տեքստն է սահմանից երկար և որտեղ է հեշթեգների
  ցանկը կտրվել 40-ի վրա։ Ոչինչ լուռ չի կտրվում։

### 1.3 Հաստատում և փորձնական հրապարակում

7. Սեղմիր **Ուղարկել հաստատման (Telegram)**։ Քանի դեռ Telegram-ը կարգավորված չէ, կտեսնես.
   *«Telegram-ը կարգավորված չէ (բոտի բանալի / ադմին չաթի id)։ Փոստը նշվեց «սպասում է հաստատման» —
   հաստատիր այստեղ։»* Փոստը ստանում է `awaiting_approval` կարգավիճակը։
8. Սեղմիր **Հաստատել** — կարգավիճակը դառնում է **Հաստատված**։
9. Սեղմիր **Հրապարակել հիմա** և հաստատիր հարցումը։ Արդյունքը կլինի, օրինակ,
   **«Հրապարակված — 6 հարթակ»**, և ամեն տարբերակ կստանա **«Փորձնական»** նշիչը՝ իր բացատրությամբ։

> **Ուշադրություն.** Եթե բոլոր հարթակների **Միացված** վանդակները հանված են, «Հրապարակել հիմա»
> կոճակն ընդհանրապես չի երևում։ Սերվերն էլ նույն կանոնն է կիրառում՝ *«Ոչ մի հարթակ միացված չէ։»*

### 1.4 Ճանապարհ Բ — inbox պանակ

1. `data/inbox/`-ում ստեղծիր նոր պանակ, օրինակ `walnut kitchen`, և պատճենիր մեջը ռենդերները։
2. Ցանկության դեպքում ավելացրու `post.txt`՝ `language`, `goal`, `platforms`, `project`, `schedule`
   բանալիներով (ամբողջական ցանկը՝ `15_INBOX_WORKFLOW.md`)։
3. Սպասիր. ֆայլերի պատճենումն ավարտվելուց **30 վայրկյան** հետո պանակը համարվում է պատրաստ, իսկ
   ֆոնային աշխատողը ստուգում է ամեն **60 վայրկյան**։ Գործնականում ներմուծումը տեղի է ունենում
   մոտ մեկ րոպեում։ Կարելի է չսպասել՝ **Սոց. ցանցեր → Ֆայլերի պանակ (inbox) → Ներմուծել հիմա**։
4. Ցանկում տողը կրում է **inbox-ից** նշիչը, իսկ խմբագրիչում վերևում գրված է՝ *«Պատրաստվել է inbox
   պանակից՝ … · Առաջարկվող ժամը՝ …»*։
5. Սեղմիր **Կիրառել առաջարկվող ժամը** — ժամի դաշտը լրացվում է և էկրանը հաստատում է կիրառված ժամը։
6. Հետո՝ նույն 7–9 քայլերը։ Հրապարակվում են **միայն** `post.txt`-ում նշված հարթակները։

### 1.5 Ինչպես կարդալ տարբերակի կարգավիճակը

| Նշիչ | Նշանակում է | Գույնը |
|---|---|---|
| **Փորձնական** (`simulated`) | Հարթակը չի կանչվել, քանի որ բանալիներ չկան։ Նշումը գրում է, թե ինչ կհրապարակվեր և ինչ է պակասում։ | չեզոք, մոխրագույն |
| **Հրապարակված** (`published`) | Իրապես գնաց հարթակ։ Կա արտաքին id, և հնարավորության դեպքում՝ ուղիղ հղում։ | կանաչ |
| **Ձախողված** (`failed`) | Ստուգումը կամ հարթակի պատասխանը ձախողվեց։ Պատճառը գրված է նույն տեղում։ | կարմիր |
| **Սպասում է** (`pending`) | Դեռ չի փորձվել։ | չեզոք |

Փոստի ընդհանուր կարգավիճակը՝ բոլոր միացվածները հաջողվեցին → **Հրապարակված**, մի մասը → **Մասամբ
հրապարակված**, ոչ մեկը → **Ձախողված**։ «Փորձնական»-ը հաշվվում է որպես հաջողված. դա փորձնական
ռեժիմի իմաստն է։ Երբեք ոչ մի տեղ փորձնականը չի ներկայացվում որպես իրական հրապարակում՝ նշումները
գրված են պայմանական եղանակով («կհրապարակվեր …»)։

---

## 2. Իրական հրապարակում՝ հարթակ առ հարթակ

Բոլոր բանալիները գրվում են `.env` ֆայլում (սերվերի վրա՝ `deploy/.env.production`)։ **Կարգավորումներ →
Ինտեգրումներ** էջը ցույց է տալիս յուրաքանչյուր հարթակի կարգավիճակը և հենց այդ փոփոխականների անունները։
Փոփոխություններից հետո հավելվածը պետք է վերագործարկվի։

Կարգավիճակները՝ `connected` (միացված), `dry_run` (փորձնական), `bot_only` (Telegram բոտ կա, ալիք՝ ոչ),
`manual` (միայն ձեռքով՝ TikTok)։

### 2.1 Facebook Page

| | |
|---|---|
| Փոփոխականներ | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` |
| Հաշիվ | Facebook **էջ** (Page), ոչ անձնական պրոֆիլ։ Դու պետք է լինես էջի ադմին։ |
| Որտեղից | developers.facebook.com → ստեղծիր հավելված (Business տիպ) → ավելացրու Facebook Login / Graph API → Graph API Explorer-ով վերցրու **էջի** թոքենը (`pages_manage_posts`, `pages_read_engagement`) → փոխարկիր երկարաժամկետի, հետո՝ էջի չժամկետանցող թոքենի։ `META_PAGE_ID`-ն էջի թվային id-ն է։ |
| Ստուգում | Սեփական էջի համար App Review-ը սովորաբար պետք չէ, քանի դեռ թոքենի տերը հավելվածի ադմին է (Standard Access)։ |
| Մեդիա | Առավելագույնը **10 նկար**՝ JPEG/PNG, մինչև 4 ՄԲ, ամենաերկար կողմը՝ 4096 փիքսել (մեծերն ինքնաշխատ փոքրանում են)։ Վիդեո՝ մինչև **1 ԳԲ**։ Տեքստ՝ մինչև 63 206 նիշ։ |
| Ինչպես է հրապարակվում | Նկարները նախ վերբեռնվում են որպես չհրապարակված, հետո կցվում մեկ գրառման։ Վիդեոն գնում է առանձին վերջնակետով, երբ ֆորմատը `video`/`reel`/`short` է կամ վիդեոն միակ մեդիան է։ |

### 2.2 Instagram Business

| | |
|---|---|
| Փոփոխականներ | `META_IG_USER_ID`, `META_PAGE_ACCESS_TOKEN` (նույնը, ինչ Facebook-ի), **և հրապարակային `APP_URL`** |
| Հաշիվ | Instagram **Business** (professional) հաշիվ, կապված Facebook էջին։ |
| Որտեղից | Նույն Meta հավելվածը։ `META_IG_USER_ID`-ն վերցվում է `me/accounts?fields=instagram_business_account` հարցումով։ Թոքենը՝ նույն էջի թոքենը (`instagram_basic`, `instagram_content_publish`)։ |
| Կարևոր | Instagram-ը մեդիան **ինքն է վերցնում հղումով**, ուստի `APP_URL`-ը պետք է լինի իրական հրապարակային `https://…` հասցե։ `localhost`-ի դեպքում ադապտերը գրում է՝ *«Instagram-ը մեդիան վերցնում է հրապարակային https հղումով, իսկ APP_URL-ը լոկալ է»*։ |
| Մեդիա | Միայն **JPEG**, մինչև 8 ՄԲ, ամենաերկար կողմը՝ 1440 փիքսել, համամասնությունը՝ 4:5 – 1.91:1։ Չհամապատասխանողները փոխարկվում և **լուսանցքներով լրացվում են՝ առանց կտրելու**։ Առավելագույնը 10 նկար (կարուսել)։ Վիդեոն գնում է որպես **Reel**՝ մինչև 1 ԳԲ։ Տեքստ՝ մինչև 2 200 նիշ։ Առանց մեդիայի Instagram-ը չի ընդունում։ |
| Ինչպես է հրապարակվում | Կոնտեյների հոսք՝ ստեղծվում է կոնտեյներ, սպասվում է մշակմանը (մինչև 120 վրկ), հետո՝ հրապարակում։ |

### 2.3 LinkedIn (ընկերության էջ)

| | |
|---|---|
| Փոփոխականներ | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN`, ըստ ցանկության՝ `LINKEDIN_API_VERSION` |
| Հաշիվ | LinkedIn **ընկերության էջ**, որի ադմինը դու ես։ |
| Որտեղից | linkedin.com/developers → ստեղծիր հավելված և կապիր ընկերության էջին → հաստատիր էջի սեփականությունը → խնդրիր **Community Management API** հասանելիություն (vetting) → ստացիր թոքեն `w_organization_social` իրավունքով։ |
| Ձևաչափ | `LINKEDIN_ORG_URN`-ը պետք է լինի ուղիղ `urn:li:organization:<թվային id>`։ Տեղապահը (`…:XXXXXXX`) դիտավորյալ չի ընդունվում, որպեսզի հավելվածը երբեք չկարծի, թե միացած է, երբ միացած չէ։ |
| Տարբերակ | `LINKEDIN_API_VERSION`-ը `YYYYMM` ձևաչափով է, կոդի լռելյայնը՝ `202606`։ LinkedIn-ը տարբերակը պահում է մոտ մեկ տարի, ուստի տարին մեկ պետք է թարմացնել։ Ժամկետանցի դեպքում պատասխանը HTTP 426 է, և սխալի տեքստը հենց այդ փոփոխականն է անվանում։ |
| Մեդիա | **Մեկ** մեդիա՝ վիդեո, եթե կա, այլապես առաջին նկարը։ Նկար՝ JPEG/PNG/GIF, մինչև 20 ՄԲ, ամենաերկար կողմը՝ 6000 փիքսել։ Տեքստ՝ մինչև 3 000 նիշ։ Վերնագիրը հրապարակվում է որպես մեդիայի վերնագիր։ |

### 2.4 YouTube

| | |
|---|---|
| Փոփոխականներ | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, ըստ ցանկության՝ `YOUTUBE_PRIVACY` |
| Հաշիվ | YouTube ալիք, կապված Google հաշվին։ |
| Որտեղից | console.cloud.google.com → նոր նախագիծ → միացրու **YouTube Data API v3** → OAuth consent screen → OAuth client → մեկ անգամ անցիր համաձայնության հոսքը `https://www.googleapis.com/auth/youtube.upload` թույլտվությամբ և ծածկագիրը փոխանակիր **refresh token**-ի հետ։ |
| Ստուգում | Չստուգված (unverified) Google նախագծից վերբեռնված վիդեոները YouTube-ի կողմից մնում են **փակ**, մինչև համապատասխանության ստուգումն անցնի։ Դա հարթակի կանոնն է, ոչ թե այս համակարգի։ |
| `YOUTUBE_PRIVACY` | `public` \| `unlisted` \| `private`։ `.env.example`-ում գրված է `private`։ Եթե փոփոխականն ընդհանրապես բացակայում է, կոդն օգտագործում է `public` — ուստի **լրացրու այն բացահայտ**։ |
| Մեդիա | Պարտադիր **վիդեո ֆայլ**. առանց վիդեոյի տարբերակը ձախողվում է՝ *«YouTube-ի համար վիդեո է պետք»*։ Վերնագիր՝ մինչև 100 նիշ, նկարագրություն՝ մինչև 5 000 բայթ, `<` և `>` հեռացվում են, պիտակներ՝ մինչև 15։ |

### 2.5 Telegram ալիք

| | |
|---|---|
| Փոփոխականներ | `TELEGRAM_BOT_TOKEN` + ալիքի id՝ **Կարգավորումներ → Telegram → Ալիքի id** (կամ `TELEGRAM_CHANNEL_ID`) |
| Հաշիվ | Հրապարակային ալիք (`@username`) կամ մասնավոր ալիք (`-100…` id)։ |
| Որտեղից | @BotFather → `/newbot` → թոքենը։ Ապա **բոտը պետք է դառնա ալիքի ադմին**՝ հրապարակելու իրավունքով։ |
| Մեդիա | Նկար՝ JPEG/PNG, մինչև 10 ՄԲ, ամենաերկար կողմը՝ 4096 փիքսել, մինչև 10 ֆայլ մեկ ալբոմում։ Վիդեո՝ մինչև **50 ՄԲ**։ Ենթագիր՝ 1 024 նիշ, հաղորդագրություն՝ 4 096։ Երկար տեքստը չի կտրվում՝ գնում է առանձին հաղորդագրությամբ մեդիայի տակ։ |

**Կարևոր տարբերակում.** ադմին չաթի id-ն և ալիքի id-ն **առանձին են**։ Հաստատման հոսքը կարող է
աշխատել Telegram-ով, մինչ ալիք հրապարակումը դեռ փորձնական է (`bot_only`)։ Երկուսն էլ օգտագործում են
նույն բոտի թոքենը։

### 2.6 TikTok

TikTok-ը **երբեք ավտոմատ չի հրապարակվում** և փոփոխական չունի։ Ավտոմատ հրապարակումը հնարավոր է միայն
ստուգված (audited) հավելվածի համար, իսկ չստուգվածի գրառումները մնում են փակ, ուստի ադապտերը ընդհանրապես
չի կանչում TikTok-ը։ Կարգավիճակը միշտ `manual` է, իսկ նշումը գրում է, թե որ ֆայլը վերբեռնես ձեռքով՝
պատրաստված տեքստի հետ։

### 2.7 AI տեքստագիր (ըստ ցանկության)

`ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`) → `GEMINI_API_KEY` (+ `GEMINI_MODEL`) → ներկառուցված
ձևանմուշներ։ Սա հրապարակման հետ կապ չունի. առանց բանալու ամեն ինչ աշխատում է, պարզապես տեքստը գրում են
ձևանմուշները։

---

## 3. Telegram բոտը և հաստատման հոսքը

1. @BotFather → `/newbot` → պատճենիր թոքենը `.env`-ի `TELEGRAM_BOT_TOKEN` դաշտը և վերագործարկիր հավելվածը։
2. Բաց արա **Կարգավորումներ → Telegram**։ Վերևում պետք է գրվի՝ *միացված է որպես @bot_name*։
3. Քանի դեռ ադմին չաթ կապված չէ, նույն էջում երևում է **`/setadmin <code>`** հրահանգը՝ պատճենելու
   կոճակով։ Ծածկագիրը ածանցվում է `APP_SECRET`-ից։
4. Հեռախոսից գրիր բոտին `/start`, հետո ուղարկիր պատճենած `/setadmin <code>` տողը։ Բոտը կպատասխանի՝
   *«Այս չաթն այժմ ադմին չաթն է»*, և էջից այդ վահանակը կանհետանա։
5. Ալիքի համար. ստեղծիր ալիք, ավելացրու բոտը որպես **ադմին**, և ալիքի id-ն գրիր
   **Կարգավորումներ → Telegram → Ալիքի id** դաշտում (`@username` կամ `-100…`)։
6. Սեղմիր **Ուղարկել փորձնական հաղորդագրություն**՝ ստուգելու համար։

**Ոչ մի webhook չի գրանցվում։** Բոտն աշխատում է `getUpdates` երկար հարցումով։ Webhook գրանցելը
Telegram-ին կստիպի `getUpdates`-ին պատասխանել 409-ով, և հաստատումները լուռ կդադարեն։

**Հաստատման հաղորդագրությունը** ուղարկվում է պլանավորված ժամից **`approvalLeadMinutes`** րոպե առաջ
(լռելյայն՝ 120)։ Այն պարունակում է մեդիան, վերնագիրը, ժամը (Երևան), միացված հարթակները, Facebook-ի
տեքստը (կամ առաջին միացված տարբերակը) մինչև 700 նիշ, հեշթեգները և խմբագրիչի հղումը։ Կոճակները՝

| Կոճակ | Ինչ է անում |
|---|---|
| ✅ Approve | Հաստատում է։ Եթե «ավտոհրապարակումը հաստատումից հետո» միացված է և ժամը հասել է՝ հրապարակում է անմիջապես, այլապես սպասում է իր ժամին կամ ձեռքով «Հրապարակել»-ին։ |
| ✏️ Edit text | Հարցնում է՝ որ հարթակի տեքստը (կամ բոլորը), հետո խնդրում է **պատասխանել** իր հաղորդագրությանը նոր տեքստով։ |
| ✨ Improve with AI | Խնդրում է ցուցում («ավելի կարճ», «ավելի պաշտոնական»)։ Առանց AI բանալու պատասխանում է, որ բանալի չկա, և ոչինչ չի փոխում։ |
| 🕐 Tomorrow | Տեղափոխում է +24 ժամ **այս պահից**, ոչ թե ուշացած ամսաթվից։ |
| ⏭ Skip | Չեղարկում է փոստը։ |
| 🔗 Open | Բացում է խմբագրիչը։ |

Խմբագրումը կիրառվում է **միայն** այն դեպքում, երբ հաղորդագրությունը բոտի հարցման **պատասխանն է**։
Չպատասխանված հարցումը 24 ժամ հետո ժամկետանց է դառնում։ Հին հաղորդագրության կոճակը պատասխանում է
*«Too late — this post is …»* և ինքն իրեն հեռացնում է։ Քանի դեռ ադմին չաթ կապված չէ, կոճակները
պատասխանում են *Not authorised*։

Բոտի հրահանգները՝ `/start`, `/chatid`, `/id` (չաթի id), `/setadmin <code>`, `/status` (հերթի
հաշիվները)։

---

## 4. Ստուգաթերթ՝ իրական հրապարակումից առաջ և հետո

### 4.1 Նախքան առաջին իրական փոստը

- [ ] `APP_URL`-ը իրական հրապարակային `https://…` հասցե է (առանց դրա Instagram-ը չի աշխատի)։
- [ ] `.env`-ում լրացված են այն հարթակների բանալիները, որոնցով ուզում ես սկսել։
- [ ] Հավելվածը վերագործարկված է, և **Կարգավորումներ → Ինտեգրումներ**-ում այդ հարթակները գրված են
      `connected`։
- [ ] Telegram-ի ադմին չաթը կապված է, փորձնական հաղորդագրությունը հասել է։
- [ ] **Կարգավորումներ → Սոց. ցանցեր**՝ հրապարակման օրերը, ժամը, հաստատման առաջընթաց ժամանակը և
      «ավտոհրապարակում հաստատումից հետո» դրոշակը ստուգված են։
- [ ] Ֆոնային աշխատողն աշխատում է (`RUN_WORKER_IN_APP=true` կամ առանձին `npm run worker`)։
- [ ] Առաջին իրական փոստը՝ **մեկ հարթակ**, մեկ նկար, չեզոք բովանդակություն։

### 4.2 Ինչպես ստուգել, որ իրոք հրապարակվել է

1. Խմբագրիչում տարբերակի նշիչը պետք է լինի **Հրապարակված** (կանաչ), ոչ թե «Փորձնական»։
2. Տարբերակի մոտ պետք է լինի արտաքին հղումը (Facebook, YouTube, LinkedIn և հրապարակային Telegram
   ալիքի դեպքում. Instagram-ի permalink-ը փնտրվում է հրապարակումից հետո և կարող է բացակայել)։
3. Telegram-ի ադմին չաթը ստանում է ամփոփումը՝ մեկ տող յուրաքանչյուր հարթակի համար՝ ✅ / 🧪 / ❌։
4. Բացիր հղումը և համոզվիր, որ գրառումը հենց քո էջում է։
5. `/admin/smm` → **Հրապարակված** ներդիրում տողը երևում է իր ամսաթվով։

### 4.3 Փորձնական գրառումը հետ վերցնելը

Համակարգը հարթակից **չի ջնջում** գրառումը. հրապարակվածը հանվում է հենց հարթակի հավելվածում։
Հերթականությունը՝ նախ հարթակից, հետո՝ ադմինից։

| Հարթակ | Ինչպես ջնջել |
|---|---|
| Facebook | Էջի գրառումների ցանկ → գրառման ⋯ ընտրացանկ → Delete post։ |
| Instagram | Գրառում → ⋯ → Delete։ Reel-ը՝ նույն ձևով։ |
| LinkedIn | Ընկերության էջ → գրառում → ⋯ → Delete post։ |
| YouTube | YouTube Studio → Content → վիդեո → ⋯ → Delete forever (կամ պարզապես դարձրու Private)։ |
| Telegram | Ալիքում հաղորդագրության վրա → Delete → «Delete for everyone»։ Երկար տեքստի դեպքում կարող են լինել մի քանի հաղորդագրություն՝ ջնջիր բոլորը։ |
| TikTok | Ձեռքով վերբեռնվածը ջնջվում է TikTok-ի հավելվածից։ |

Ադմինում. բացիր փոստը → **Այլ գործողություններ** → **Ջնջել**, և հաստատիր։ Ջնջումն անվերադարձ է և հեռացնում է
տարբերակներն ու մեդիայի կապերը (ֆայլերն իրենք մնում են գրադարանում)։ Եթե ուզում ես պահել պատմությունը,
մի ջնջիր՝ պարզապես թող այն «Հրապարակված» վիճակում։

---

## 5. Հաճախ հանդիպող հաղորդագրություններ

Բոլորը գալիս են `src/lib/social/messages.ts`-ից և երևում են ադմինի լեզվով (հայերեն կամ անգլերեն)։

| Հաղորդագրություն | Պատճառ | Լուծում |
|---|---|---|
| «Instagram-ը մեդիան վերցնում է հրապարակային https հղումով, իսկ APP_URL-ը լոկալ է։» | `APP_URL`-ը `localhost` է կամ ոչ https։ | Դիր իրական հրապարակային հասցե և վերագործարկիր։ |
| «Instagram-ի համար պետք է առնվազն մեկ նկար կամ վիդեո։» | Տարբերակը մեդիա չունի։ | Կցիր նկար կամ վիդեո։ |
| «YouTube-ի համար վիդեո է պետք։» | Վիդեո կցված չէ։ | Կցիր վիդեո կամ անջատիր YouTube-ը։ |
| «<հարթակ>՝ ձևաչափը վիդեո է, բայց վիդեո կցված չէ։» | Ֆորմատը `video`/`reel`, մեդիան՝ նկար։ | Փոխիր ֆորմատը կամ կցիր վիդեո։ |
| «<հարթակ>՝ «<ֆայլ>» ֆայլը X ՄԲ է, սահմանը Y ՄԲ է։» | Ֆայլը հարթակի սահմանից մեծ է (Telegram՝ 50 ՄԲ վիդեո, Facebook/Instagram՝ 1 ԳԲ)։ | Սեղմիր ֆայլը և փորձիր նորից։ |
| ««<ֆայլ>» ֆայլը սկավառակի վրա չկա։» | DB-ում գրառում կա, ֆայլը՝ ոչ։ | Վերբեռնիր ֆայլը նորից և կցիր։ |
| «LinkedIn-ը մերժեց API-ի <version> տարբերակը (HTTP 426)։» | API-ի տարբերակը ժամկետանց է։ | `.env`-ում `LINKEDIN_API_VERSION`-ին տուր գործող `YYYYMM` արժեք։ |
| «Ոչ մի հարթակ միացված չէ։» | Բոլոր տարբերակների «Միացված»-ը հանված է։ | Միացրու գոնե մեկը։ |
| «Այս գրառումն այս պահին մշակվում է…» | Զուգահեռ հրապարակում կամ հաստատման ուղարկում է ընթանում։ | Սպասիր մի քանի վայրկյան։ |
| «Այս գրառումը ընթացիկ կարգավիճակում հնարավոր չէ հրապարակել…» | Օրինակ՝ արդեն հրապարակված է կամ չեղարկված։ | Կրկնօրինակիր, կամ վերադարձրու սևագրի։ |
| «Հրապարակումն ընդհատվեց (սերվերը վերագործարկվեց)։» | Սերվերը վերագործարկվել է հրապարակման ընթացքում. 15 րոպե հետո մաքրող ընթացակարգն ազատել է փոստը։ | Ստուգիր հարթակները (գուցե մի մասը գնացել է) և սեղմիր նորից «Հրապարակել հիմա»։ |
| «AI բանալի չկա, ուստի տեքստը գրվել է ներկառուցված ձևանմուշներով։» | `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` չկան։ | Խնդիր չէ. կամ խմբագրիր ձեռքով, կամ ավելացրու բանալի։ |
| «AI-ը չպատասխանեց (…)» | Ցանցի կամ մատակարարի սխալ։ | Փորձիր նորից. տեքստը մնացել է անփոփոխ։ |
| «Telegram-ը կարգավորված չէ (բոտի բանալի / ադմին չաթի id)։» | Հաստատումը ուղարկվել է փորձնական ռեժիմում։ | Կարգավորիր բոտը (§3) կամ հաստատիր ադմինում։ |

---

<a id="english"></a>

# English

This is the owner's step-by-step guide: how to run the whole publishing chain today, in dry-run mode,
with no credentials at all — and how to go live afterwards, one platform at a time. The system as a
whole is described in `05_SMM_AUTOMATION.md`; the drop folder in `15_INBOX_WORKFLOW.md`.

---

## 1. A dry run today (no credentials)

With no credentials no platform is ever called. The adapter answers **Simulated** and writes what it
*would* have published together with the exact variables that are missing. The checks are the same as
for a real call, so a variant that would fail for real — YouTube without a video, for instance —
fails in the dry run too.

### 1.1 Path A — the composer

1. Sign in at `/admin`, open **Social media** → **New post** (`/admin/smm/new`).
2. Pick a project. The media list narrows to that project's files, and changing the project later
   prunes the selection and says so.
3. Pick the media, up to **20 files**. Optionally generate a branded poster (1:1 / 4:5 / 16:9 / 9:16)
   from a render — it becomes the first image.
4. Pick the goal (`showcase`, `trust`, `sales_b2b`, `sales_b2c`, `education`), the language and the
   platforms. The default platforms come from **Settings → Social media**, the language from
   **Settings → Brand**, and the schedule is pre-filled with the next free slot from the posting days
   and posting time.
5. Check the **Copywriter** line in the sidebar. `template` means neither `ANTHROPIC_API_KEY` nor
   `GEMINI_API_KEY` is set and the built-in templates write the copy. That is fine — everything else
   behaves identically.
6. Generate. You get one post with one variant per selected platform, opened in the editor.

### 1.2 The editor — what you see

- Left: the internal title, goal, language, the scheduled time (with a **Set** button) and the media strip.
- Right: one card per platform — an **Enabled** switch, a format
  (`image` · `carousel` · `video` · `reel` · `short` · `text`), the text, a call to action, hashtags
  with an *n*/40 counter, and an **Improve with AI** field.
- A headline field appears only where the platform really publishes one: **YouTube** and **LinkedIn**.
- The character counter shows the platform limit and drops to Telegram's **1024** as soon as media is
  attached (a longer text then follows as a separate message under the media).
- Saving reports which platforms are over their text limit and where the hashtag list had to be capped
  at 40. Nothing is trimmed silently.

### 1.3 Approval and the dry-run publish

7. Press **Send for approval (Telegram)**. While Telegram is not configured you get:
   *"Telegram is not configured (bot token / admin chat id). The post is marked awaiting approval;
   approve it here in the admin."* The post moves to `awaiting_approval`.
8. Press **Approve** — the status becomes **Approved**.
9. Press **Publish now** and confirm. The result reads something like **"Published — 6 platforms"**,
   and every variant carries a **Simulated** chip with its own explanation.

> **Note.** With every platform's **Enabled** box unticked, the **Publish now** button is not shown at
> all. The server applies the same rule: *"No platform is enabled."*

### 1.4 Path B — the inbox folder

1. Create a folder under `data/inbox/`, e.g. `walnut kitchen`, and copy the renders into it.
2. Optionally add `post.txt` with `language`, `goal`, `platforms`, `project`, `schedule`
   (the full key list is in `15_INBOX_WORKFLOW.md`).
3. Wait. A folder counts as ready **30 seconds** after the last file stopped changing, and the worker
   looks every **60 seconds** — in practice the import happens within about a minute. To skip the
   wait: **Social media → File inbox → Import now**.
4. The row carries a **from inbox** badge, and the editor shows a banner: *"Prepared from the inbox
   folder … · Suggested slot …"*.
5. Press **Use suggested slot** — the time field is filled in and the applied time is confirmed
   on screen.
6. Then steps 7–9 above. **Only** the platforms named in `post.txt` are published.

### 1.5 How to read a variant status

| Chip | Means | Colour |
|---|---|---|
| **Simulated** | The platform was never called because credentials are missing. The note says what would have gone out and what is missing. | neutral grey |
| **Published** | It really went out. An external id is stored, and a direct link where the platform gives one. | green |
| **Failed** | A check or the platform's answer failed. The reason is written on the card. | red |
| **Pending** | Not attempted yet. | neutral |

The post's own status: all enabled variants succeeded → **Published**; some → **Partially published**;
none → **Failed**. *Simulated* counts as success — that is what a dry run is for. Nothing in the
interface ever presents a dry run as a real publication: the notes are written in the conditional
("would publish …").

---

## 2. Going live, platform by platform

All credentials live in `.env` (on a server, `deploy/.env.production`). **Settings → Integrations**
shows each platform's live status and the exact variable names. Restart the app after a change.

Statuses: `connected`, `dry_run`, `bot_only` (a Telegram bot but no channel), `manual` (TikTok).

### 2.1 Facebook Page

| | |
|---|---|
| Variables | `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` |
| Account | A Facebook **Page**, not a personal profile. You must be an admin of the Page. |
| Where from | developers.facebook.com → create a Business-type app → add Facebook Login / Graph API → use the Graph API Explorer to get a **Page** token (`pages_manage_posts`, `pages_read_engagement`) → exchange it for a long-lived, then a non-expiring page token. `META_PAGE_ID` is the Page's numeric id. |
| Review | For your own Page, App Review is normally not needed while the token owner is an admin of the app (Standard Access). |
| Media | Up to **10 images**, JPEG/PNG, 4 MB, longest side 4096 px (larger ones are downscaled automatically). Video up to **1 GB**. Text up to 63,206 characters. |
| How it posts | Photos are uploaded unpublished and attached to one feed post. A video goes through the video endpoint when the format is `video`/`reel`/`short` or the video is the only media. |

### 2.2 Instagram Business

| | |
|---|---|
| Variables | `META_IG_USER_ID`, `META_PAGE_ACCESS_TOKEN` (the same token as Facebook), **and a public `APP_URL`** |
| Account | An Instagram **Business** (professional) account linked to the Facebook Page. |
| Where from | The same Meta app. Read `META_IG_USER_ID` from `me/accounts?fields=instagram_business_account`. The token is the same page token with `instagram_basic`, `instagram_content_publish`. |
| Critical | Instagram **fetches the media by URL itself**, so `APP_URL` must be a real public `https://…` address. On localhost the adapter answers *"Instagram fetches media from a public https URL, but APP_URL is local."* |
| Media | **JPEG only**, up to 8 MB, longest side 1440 px, aspect ratio 4:5 – 1.91:1. Anything else is converted and **padded with margins, never cropped**. Up to 10 images (carousel). A video is posted as a **Reel**, up to 1 GB. Text up to 2,200 characters. Instagram needs at least one file. |
| How it posts | The container flow: create a container, wait for processing (up to 120 s), then publish. |

### 2.3 LinkedIn (company page)

| | |
|---|---|
| Variables | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN`, optionally `LINKEDIN_API_VERSION` |
| Account | A LinkedIn **company page** you administer. |
| Where from | linkedin.com/developers → create an app tied to the company page → verify page ownership → request **Community Management API** access (vetting) → obtain a token with `w_organization_social`. |
| Format | `LINKEDIN_ORG_URN` must be exactly `urn:li:organization:<numeric id>`. A placeholder (`…:XXXXXXX`) is deliberately rejected, so the app never believes it is connected when it is not. |
| Version | `LINKEDIN_API_VERSION` is `YYYYMM`; the code default is `202606`. LinkedIn supports a version for about a year, so it must be bumped roughly yearly. An expired version answers HTTP 426, and the error text names the variable. |
| Media | **One** media: the video if there is one, otherwise the first image. Images JPEG/PNG/GIF up to 20 MB, longest side 6000 px. Text up to 3,000 characters. The headline is published as the media title. |

### 2.4 YouTube

| | |
|---|---|
| Variables | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, optionally `YOUTUBE_PRIVACY` |
| Account | A YouTube channel on a Google account. |
| Where from | console.cloud.google.com → new project → enable **YouTube Data API v3** → OAuth consent screen → OAuth client → run the consent flow once with the `https://www.googleapis.com/auth/youtube.upload` scope and exchange the code for a **refresh token**. |
| Review | Uploads from an **unverified** Google project stay **private** on YouTube's side until the compliance audit passes. That is the platform's rule, not this system's. |
| `YOUTUBE_PRIVACY` | `public` \| `unlisted` \| `private`. `.env.example` ships `private`. With the variable missing entirely the code uses `public` — so **set it explicitly**. |
| Media | A **video file is required**: without one the variant fails with *"YouTube needs a video file."* Title up to 100 characters, description up to 5,000 bytes, `<` and `>` stripped, at most 15 tags. |

### 2.5 Telegram channel

| | |
|---|---|
| Variables | `TELEGRAM_BOT_TOKEN` plus a channel id in **Settings → Telegram → Channel id** (or `TELEGRAM_CHANNEL_ID`) |
| Account | A public channel (`@username`) or a private one (`-100…` id). |
| Where from | @BotFather → `/newbot` → the token. Then **make the bot an admin of the channel** with permission to post. |
| Media | Images JPEG/PNG up to 10 MB, longest side 4096 px, up to 10 per album. Video up to **50 MB**. Caption 1,024 characters, message 4,096. A longer text is never cut: it follows as its own message under the media. |

**One distinction matters.** The admin chat id and the channel id are **independent**. Approvals can
work over Telegram while channel posting is still simulated (`bot_only`). Both use the same bot token.

### 2.6 TikTok

TikTok **never publishes automatically** and has no variable. Automatic posting requires an audited
app, and an unaudited one only produces private posts, so the adapter never calls TikTok. The status
is permanently `manual`, and the note tells you which file to upload by hand with the prepared text.

### 2.7 AI copywriting (optional)

`ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`) → `GEMINI_API_KEY` (+ `GEMINI_MODEL`) → built-in templates.
This is orthogonal to publishing: with no key everything still works, the templates simply write the copy.

---

## 3. Telegram bot and the approval flow

1. @BotFather → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN` in `.env` and restart the app.
2. Open **Settings → Telegram**. The top of the page should read *connected as @bot_name*.
3. While no admin chat is bound, the same page shows a **`/setadmin <code>`** command with a copy
   button. The code is derived from `APP_SECRET`.
4. From your phone, send `/start` to the bot, then send the copied `/setadmin <code>` line. The bot
   answers *"This chat is now the admin chat"* and the panel disappears from the page.
5. For the channel: create it, add the bot as an **admin**, and put the channel id in
   **Settings → Telegram → Channel id** (`@username` or `-100…`).
6. Press **Send a test message** to confirm.

**No webhook is ever registered.** The bot long-polls `getUpdates`. Registering a webhook makes
Telegram answer `getUpdates` with 409 and approvals stop without a visible error.

**The approval message** is sent **`approvalLeadMinutes`** minutes before the scheduled time
(120 by default). It carries the media, the title, the time in Yerevan, the enabled platforms, the
Facebook text (or the first enabled variant) up to 700 characters, the hashtags and a link to the
editor. The buttons:

| Button | What it does |
|---|---|
| ✅ Approve | Approves. With "auto-publish after approval" on and the time due, it publishes immediately; otherwise it waits for the scheduled time or a manual Publish. |
| ✏️ Edit text | Asks which platform (or all), then asks you to **reply** to its message with the new text. |
| ✨ Improve with AI | Asks for an instruction ("shorter", "more formal"). With no AI key it says so and changes nothing. |
| 🕐 Tomorrow | Moves the post 24 h from **now**, never from an overdue date. |
| ⏭ Skip | Cancels the post. |
| 🔗 Open | Opens the editor. |

An edit is applied **only** when the message is a reply to the bot's own prompt. An unanswered prompt
expires after 24 hours. A button on an old message answers *"Too late — this post is …"* and removes
itself. While no admin chat is bound, buttons answer *Not authorised*.

Bot commands: `/start`, `/chatid`, `/id` (the chat id), `/setadmin <code>`, `/status` (queue counts).

---

## 4. Go-live checklist, verification and rollback

### 4.1 Before the first real post

- [ ] `APP_URL` is a real public `https://…` address (Instagram will not work without it).
- [ ] `.env` holds the credentials for the platforms you want to start with.
- [ ] The app has been restarted and **Settings → Integrations** shows those platforms as `connected`.
- [ ] The Telegram admin chat is bound and the test message arrived.
- [ ] **Settings → Social media**: posting days, posting time, approval lead time and the auto-publish flag are
      what you want.
- [ ] The background worker is running (`RUN_WORKER_IN_APP=true`, or `npm run worker` separately).
- [ ] The first real post is **one platform**, one image, neutral content.

### 4.2 Verifying a real publication

1. In the editor the variant chip must read **Published** (green), not *Simulated*.
2. The variant should carry an external link (Facebook, YouTube, LinkedIn and a public Telegram
   channel; Instagram's permalink is looked up after publishing and may be absent).
3. The Telegram admin chat receives the summary — one line per platform with ✅ / 🧪 / ❌.
4. Open the link and confirm the post is on your own page.
5. `/admin/smm` → the **Published** tab shows the row with its date.

### 4.3 Rolling a test post back

The system **never deletes** a post from a platform. Remove it in the platform's own app first, then
in the admin.

| Platform | How to delete |
|---|---|
| Facebook | Page post list → the post's ⋯ menu → Delete post. |
| Instagram | Post → ⋯ → Delete. Same for a Reel. |
| LinkedIn | Company page → the post → ⋯ → Delete post. |
| YouTube | YouTube Studio → Content → the video → ⋯ → Delete forever (or simply set it to Private). |
| Telegram | In the channel, on the message → Delete → "Delete for everyone". A long text may be several messages; delete them all. |
| TikTok | A manual upload is deleted in the TikTok app. |

In the admin: open the post → **More actions** → **Delete** and confirm. The delete cannot be undone and
removes the variants and the media links (the files themselves stay in the library). To keep the
history instead, simply leave the post in its *Published* state.

---

## 5. Messages you may run into

All of them come from `src/lib/social/messages.ts` and appear in the admin language.

| Message | Cause | Fix |
|---|---|---|
| "Instagram fetches media from a public https URL, but APP_URL is local." | `APP_URL` is localhost or not https. | Set a real public address and restart. |
| "Instagram needs at least one image or a video." | The variant has no media. | Attach an image or a video. |
| "YouTube needs a video file." | No video attached. | Attach a video, or disable YouTube. |
| "<platform>: the format is video, but no video is attached." | The format is `video`/`reel` while the media is an image. | Change the format or attach a video. |
| "<platform>: "<file>" is X MB, the limit is Y MB." | The file is over the platform limit (Telegram 50 MB video, Facebook/Instagram 1 GB). | Compress the file and try again. |
| "The file "<name>" is missing on disk. Upload it again." | The database row exists but the file does not. | Upload the file again and attach it. |
| "LinkedIn rejected API version <version> (HTTP 426)." | The API version has expired. | Set `LINKEDIN_API_VERSION` in `.env` to a currently supported `YYYYMM`. |
| "No platform is enabled, so there is nothing to publish." | Every variant's Enabled box is unticked. | Enable at least one. |
| "This post is being processed right now…" | A publish or an approval send is already running. | Wait a few seconds. |
| "This post cannot be published or sent for approval in its current status." | For example it is already published, or cancelled. | Duplicate it, or move it back to draft. |
| "Publishing was interrupted (the server restarted)." | The server restarted mid-publish; the 15-minute sweep released the post. | Check the platforms (some variants may have gone out) and press Publish now again. |
| "No AI key is set, so the text was written with the built-in templates." | Neither `ANTHROPIC_API_KEY` nor `GEMINI_API_KEY` is set. | Not a problem: edit by hand, or add a key. |
| "The AI did not answer (…)" | A network or provider error. | Try again; the text is unchanged. |
| "Telegram is not configured (bot token / admin chat id)." | The approval ran in dry-run mode. | Configure the bot (§3), or approve in the admin. |
