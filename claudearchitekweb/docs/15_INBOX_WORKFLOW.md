# 15 — Ֆայլերի պանակ (inbox) → առաջարկվող փոստ · Local file inbox → suggested post

Ամբողջ ուղեցույցը նախ հայերեն է, հետո՝ անգլերեն (տես [English](#english)).
The whole guide is in Armenian first; the English version starts at [English](#english).

**Ինչ է սա։** Համակարգչի վրա մեկ պանակ։ Պատճենում ես ռենդերները մեջը, իսկ համակարգը պատրաստում է
փոստի ավարտուն սևագիր՝ մեկ տեքստ ամեն հարթակի համար, կցված մեդիա, առաջարկված հրապարակման ժամ —
և հայտնում է դրա մասին Telegram-ով ու ադմին վահանակում։ Առանց քո հաստատման ոչինչ չի հրապարակվում։

Ոչինչ կարգավորելու կարիք չկա։ Պանակն ինքնուրույն ստեղծվում է առաջին գործարկման ժամանակ՝ իր
`README.txt`-ի հետ միասին։

---

## 1. Որտեղ է պանակը

```
claudearchitekweb/data/inbox/
```

Այն այլ տեղ տանելու համար `.env`-ում լրացրու `INBOX_DIR` (OneDrive-ի պանակ, ցանցային սկավառակ,
Docker volume)։ Ուղին գրված է նաև **Ադմին → Սոց. ցանցեր → Ֆայլերի պանակ (inbox)** վահանակի
**Պանակը** տողում։

Պանակի հետ միասին ստեղծվում են երեք ծառայողական ենթապանակ, որոնց ձեռք տալ երբեք պետք չէ։

| Պանակ | Ինչ կա մեջը |
|---|---|
| `_processing/` | հենց այս պահին ներմուծվող պանակը (մնացած ժամանակ դատարկ է) |
| `_imported/` | քո ֆայլերը՝ հաջող ներմուծումից հետո, `<ամսաթիվ ժամ> <անուն>/` տեսքով |
| `_failed/` | քո ֆայլերը՝ ձախողված ներմուծումից հետո, կողքին՝ `error.txt` |

**Քո ֆայլերը երբեք չեն ջնջվում։** Դրանք միայն տեղափոխվում են `_imported/` կամ `_failed/` պանակ։

---

## 2. Կառուցվածքը

Մեկ ենթապանակ՝ մեկ փոստի համար։

```
data/inbox/
  README.txt                      ← ստեղծվում է քեզ համար. այս էջի կարճ տարբերակը
  2026-09-17 walnut kitchen/      ← մեկ փոստ (անունը՝ ազատ՝ հայերեն, ռուսերեն, անգլերեն)
    01-render.jpg
    02-render.jpg
    03-render.jpg
    clip.mp4
    post.txt                      ← ոչ պարտադիր բրիֆ
  _imported/
  _failed/
```

Անմիջապես `data/inbox/`-ում դրված առանձին ֆայլերը խմբավորվում են ըստ անվան, այսինքն՝
`render-01.jpg` + `render-02.jpg` դառնում են մեկ փոստ, իսկ առանձին `clip.mp4`-ը՝ մյուսը։

`_` կամ `.` նշանով սկսվող ենթապանակներն անտեսվում են։ **Ֆայլերը՝ ոչ.** `_final.jpg`-ը և
`_v2 render.png`-ը ներմուծվում են ինչպես ցանկացած այլ ռենդեր։ Բաց են թողնվում միայն այն
ծառայողական ֆայլերը, որ Windows-ի ու macOS-ի ամեն պանակ ինքն է հավաքում (`Thumbs.db`,
`desktop.ini`, `.DS_Store`, Office-ի `~$…` կողպեքի ֆայլերը)։

Ենթապանակները կարդացվում են մինչև **5 մակարդակ** խորությամբ։ Դրանից ցածրը չի ներմուծվում, և
վահանակն ու հաշվետվությունը գրում են, թե քանի պանակ մնաց չկարդացված՝ պանակը դատարկ անվանելու
փոխարեն։

### Թույլատրված ֆայլերը

| Տեսակ | Ընդլայնումներ |
|---|---|
| Նկարներ | `.jpg` `.jpeg` `.png` `.webp` `.avif` `.gif` |
| Վիդեո | `.mp4` `.mov` `.webm` `.mkv` |
| Փաստաթղթեր | `.pdf` |
| 3D | `.glb` `.usdz` |

Սա այն է, ինչ փոստն իրոք կարող է կրել, և գործում է ադմինի վերբեռնման նույն սահմանը՝ **100 ՄԲ**
մեկ ֆայլի համար։ Մնացած ամեն ինչ (`.docx`, `.exe`, `.zip`, ինչպես նաև ռենդերների կողքին սովորաբար
ընկած CAD-ի սկզբնաղբյուրները՝ `.dwg` / `.skp` / `.max`) **բաց է թողնվում և գրվում հաշվետվության
մեջ** — պանակը դրանից չի ձախողվում։ Ուշադրություն. այս ցանկը դիտավորյալ *ավելի նեղ* է, քան
ադմինի վերբեռնիչինը, որն ընդունում է նաև արխիվներ ու CAD ֆայլեր. դրանք կարող են մնալ ֆայլերի
պահոցում, բայց ոչ մի հարթակում հրապարակվել չեն կարող, ուստի երբեք չեն դառնում փոստի մեդիա։ Մեկ
փոստը վերցնում է առավելագույնը **20 ֆայլ**. առաջինը՝ նկարները (ըստ անվան՝ բնական
հերթականությամբ), հետո՝ վիդեոն, հետո՝ փաստաթղթերը։

Ամեն նկար և վիդեո **ապակոդավորվում է կցվելուց առաջ**։ Այն ֆայլը, որը չի բացվում — սովորաբար դեռ
պատճենվողը — դուրս է մնում փոստից, նշվում է զգուշացումներում, իսկ պանակը գնում է `_failed/`՝
`error.txt`-ի հետ։ Այսպես կիսատ գրված ռենդերը երբեք չի կարող դառնալ փոստի միակ նկարը։

«Ձախողվեց» բառը վերաբերում է երկու տարբեր դեպքի, ուստի արժե դրանք տարբերել։

- **Պանակը մնում է `_failed/`-ում**, երբ ինչ-որ բան գրվել է, բայց հետ կարդալ չի ստացվել — սովորական
  դեպքը վերևի չբացվող ֆայլն է։ Փոստը միևնույն է ստեղծվում է նրանից, ինչն *աշխատեց*, իսկ պանակը
  `_imported/` չի գնում, որպեսզի կարողանաս ուղղել ֆայլը և նորից դնել այն։
- **Ներմուծումն ընդհանրապես փոստ չի տալիս** միայն այն դեպքում, երբ պանակում **չկա ոչ մի պիտանի
  մեդիա և ոչ մի բրիֆի տեքստ**։ Մնացած ամեն ինչ — բաց թողնված `.zip`, անծանոթ բանալի բրիֆում,
  չգոյություն ունեցող նախագծի կոդ, 100 ՄԲ-ից մեծ ֆայլ — փոստի վրա ընդամենը զգուշացում է, ոչ թե սխալ։

---

## 3. Բրիֆը (ոչ պարտադիր)

Ավելացրու `post.txt`, `post.md` կամ `post.json`։ **Ամեն բանալի ոչ պարտադիր է**, ինչպես և ամբողջ
ֆայլը։

`post.txt` / `post.md` — `key: value` տողեր, հետո՝ `---`, հետո՝ ազատ տեքստ.

```
language: hy
goal: showcase
platforms: facebook, instagram, telegram
project: AT-2026-0003
schedule: auto
---
Ընկույզի խոհանոց երևանյան ընտանիքի համար։ Շեշտը՝ կղզյակի և ներկառուցված լուսավորության վրա։
```

`post.json` — նույն բանալիները՝ JSON օբյեկտի տեսքով.

```json
{
  "language": "ru",
  "goal": "sales_b2b",
  "platforms": ["facebook", "telegram"],
  "project": "AT-2026-0003",
  "schedule": "auto",
  "title": "Խոհանոցների շարք — փորձնական",
  "instructions": "Նշիր 3-օրյա ժամկետը։"
}
```

### Բոլոր բանալիները

| Բանալի | Թույլատրված արժեքները | Լռելյայնը, երբ բանալին չկա |
|---|---|---|
| `language` / `lang` | `hy`, `ru`, `en` | Կարգավորումներ → Բրենդ → **Հիմնական լեզու** |
| `goal` | `trust`, `sales_b2b`, `sales_b2c`, `showcase`, `education` | `showcase` |
| `platforms` | `facebook`, `instagram`, `linkedin`, `telegram`, `youtube`, `tiktok` (ստորակետերով. աշխատում են նաև `fb`, `ig`, `li`, `tg`, `yt`, `tt`) | Կարգավորումներ → Սոց. ցանցեր → **Հիմնական հարթակները նոր փոստի համար** |
| `project` | նախագծի կոդը (`AT-2026-0003`) կամ նախագծի id-ն | առանց նախագծի |
| `schedule` | `auto` — կիրառել առաջարկվող ժամը · `none` — թողնել սևագիր · ամսաթիվ, օրինակ՝ `2026-09-22 11:00` | միայն առաջարկ, չի կիրառվում |
| `scheduledAt` / `when` | ամսաթվի նույն ձևաչափերը, ինչ `schedule`-ի դեպքում | — |
| `title` | փոստի ներքին անվանումը (առավելագույնը 120 նիշ) | գրում է տեքստ գրողը |
| `instructions` / `notes` | լրացուցիչ ցուցումներ տեքստ գրողին | — |

Առանց ժամային գոտու գրված ամսաթիվը (`2026-09-22 11:00`) կարդացվում է **Երևանի** ժամանակով։ Միայն
ամսաթիվը (`2026-09-22`) նշանակում է այդ օրը՝ կարգավորումներում նշված հրապարակման ժամին։ Անցյալ
ամսաթիվն անտեսվում է, և դրա փոխարեն առաջարկվում է հաջորդ ազատ ժամը։

**Անծանոթ բանալիները երբեք սխալ չեն** — դրանք գրվում են որպես զգուշացում փոստի վրա և
հաշվետվության մեջ։

Նույնն է նաև այն տողի դեպքում, որն ընդհանրապես `key: value` չէ՝ քեզ համար գրած նշում, հայերեն
նախադասություն, կետանշումով տող։ Երբ բրիֆում կա `---` բաժանարարը, այդպիսի տողը պահվում է որպես
նկարագրության մաս, գրվում է զգուշացումներում, և **նրանից ներքև եղած բանալիները շարունակում են
կարդացվել**։ Միայն `---`-ից զուրկ բրիֆում է առաջին ոչ-բանալի տողն ավարտում վերնամասը և սկսում
ազատ տեքստը։

### Ֆայլի կոդավորումը

Աշխատում են և՛ UTF-8-ը, և՛ BOM-ով UTF-8-ը, և՛ UTF-16-ը (այն, ինչ գրում է Windows-ի Notepad-ը, երբ
իր *Save as* պատուհանում ընտրում ես “Unicode”)։ Հայերեն և ռուսերեն տեքստն ու ֆայլերի անունները
ամենուր խնդիր չեն։

---

## 4. Երբ է աշխատում

| Ինչից | Ինչպես |
|---|---|
| Ինքնաշխատ | ֆոնային աշխատողը ստուգում է ամեն 60 վայրկյան |
| Ադմինից | Սոց. ցանցեր → **Ֆայլերի պանակ (inbox)** վահանակ → **Ներմուծել հիմա** / **Ներմուծել բոլորը** |
| Տերմինալից | `npm run inbox` (նաև՝ `--dry-run` և `--example`) |

### «Դեռ պատճենվում է»

Պանակը ներմուծվում է միայն այն ժամանակ, երբ **նրա մեջ 30 վայրկյան ոչինչ չի փոխվել**, և երկու
հաջորդական ստուգման ժամանակ նույնն են ֆայլերի ցանկը, ֆայլերի չափերը *և ամեն ֆայլի առաջին ու վերջին
64 ԿԲ-ի հաշվարկված դրոշմը*։ Դրոշմը կարևոր է. այն պատճենիչը, որը նախապես զբաղեցնում է վերջնական
չափը և պահպանում սկզբնական ամսաթվերը (`robocopy /COPY:DT`, արխիվ բացող ծրագիր, ուղիղ պանակի մեջ
գրող ռենդերի շարժիչ), թողնում է ֆայլ, որն արդեն *երևում է* ավարտված, և միակ ճանապարհը հենց
բայթերը կարդալն է։ Դրանից բացի՝ ամեն նկար և վիդեո պետք է ապակոդավորվի կցվելուց առաջ։ Այսինքն՝
կարող ես 300 ՄԲ վիդեո քաշել ու հեռանալ. կիսատ պատճենված ֆայլը երբեք փոստի մեջ չի ընկնում։ Քանի
դեռ պանակը կայուն չէ, վահանակում գրված է **Դեռ պատճենվում է**։

Գործնականում սա նշանակում է, որ պանակը ներմուծվում է պատճենումն ավարտելուց մոտ մեկ րոպե հետո։

Պանակը ներմուծելուց առաջ գրավվում է բացառիկ կողպեքով, ուստի աշխատողի 60-վայրկյանանոց ստուգումը,
**Ներմուծել հիմա** սեղմելը և `npm run inbox`-ը կարող են միանգամից աշխատել, և պանակը միևնույն է
ներմուծվում է ուղիղ մեկ անգամ։ Կողպեքը ներմուծման ընթացքում ամեն րոպե թարմացվում է, ուստի երկար
ներմուծումը (քսան վիդեո՝ ամեն մեկն իր մանրապատկերով) երբեք չի ընկալվում որպես լքված, և ընթացքի
մեջ եղածը կրկին չի սկսվում։

### «Այս պանակի ֆայլերից մեկը բաց է այլ ծրագրում»

Windows-ը չի կարող տեղափոխել պանակը, քանի դեռ նրա ներսում ինչ-որ բան բաց է՝ պանակի վրա կանգնած
Explorer-ի պատուհան, JPEG-ի մանրապատկերի մշակիչ, Photoshop-ում բաց ֆայլ, հակավիրուսի ստուգում։
Այդ դեպքում պանակը մնում է հենց իր տեղում և գրվում է որպես **արգելափակված**. վահանակն ու
`npm run inbox`-ը նշում են դրա անունը, իսկ աշխատողը գրում է մատյանում (15 րոպեն մեկ, ոչ թե րոպեն
մեկ)։ Փակիր ֆայլը, և հաջորդ ստուգմանն ամեն ինչ կանցնի։ Սա այլ բան է, քան «Դեռ պատճենվում է»-ն,
և այլևս որպես այդպիսին չի ներկայացվում։

---

## 5. Ինչ ես ստանում

Յուրաքանչյուր պանակի համար՝

1. Ամեն պիտանի ֆայլ ներմուծվում է ֆայլերի պահոց (նույն ստուգումները, մանրապատկերները և վիդեոյի
   պաստառները, ինչ ադմինից վերբեռնելիս)՝ կցվելով նախագծին, եթե բրիֆում այն նշված է։
2. Գրվում է փոստի փաթեթը՝ ընդհանուր գաղափար և մեկ հարմարեցված տեքստ ամեն հարթակի համար։ AI
   բանալու առկայության դեպքում (`ANTHROPIC_API_KEY` / `GEMINI_API_KEY`) այն գրում է տեքստ գրողը՝
   օգտագործելով քո բրիֆի ազատ տեքստը։

   **Առանց AI բանալու** տեքստը գրում են ներկառուցված եռալեզու ձևանմուշները, իսկ նրանք չեն կարող
   կարդալ քո նկարագրությունը կամ տեսնել քո լուսանկարները. տեքստը կառուցվում է կապված նախագծի
   տեսակից, իսկ նախագծի բացակայության դեպքում գրվում է պարզապես «նախագիծ»։ Սևագրի նշումներում դա
   գրված է, և քո գրած տեքստը պահվում է, որպեսզի ինքդ կարողանաս տեղադրել այն։ Մնացած ամեն ինչ՝
   մեդիան, ժամը, հարթակները, պլանավորումը, աշխատում է նույնությամբ։ Բրիֆին ավելացրու `project:`
   տողը, և ձևակերպումները կլինեն խոհանոցի, պահարանի, սանհանգույցի մասին։

3. **Առաջարկվում է հրապարակման ժամ**՝ **Կարգավորումներ → Սոց. ցանցեր** էջից վերցված հաջորդ դիրքը
   (**Հրապարակման օրերը** + **Հրապարակման ժամը (Երևան)**), որը գոնե այնքան հեռու է, որքան նշված է
   **Կարգավորումներ → Սոց. ցանցեր → «Հաստատումն ուղարկել շուտ (րոպե)»** դաշտում
   (`approvalLeadMinutes`), և արդեն զբաղված չէ։
   - `schedule: auto` → ժամը կիրառվում է, և փոստը դառնում է **պլանավորված**։
   - այլապես → փոստը մնում է **սևագիր**, իսկ ժամը՝ ընդամենը առաջարկ։
4. Փոստը նշվում է որպես inbox-ից եկած (`source = inbox`, `source_ref = <պանակի անունը>`)։
5. Պանակը տեղափոխվում է `_imported/<ամսաթիվ ժամ> <անուն>/`։

### Ինչպես ես այդ մասին իմանում

- **Telegram** (երբ բոտն ու ադմին չաթը կարգավորված են)՝ վերնագիրը, տեքստի սկիզբը, հարթակները,
  առաջարկվող ժամը և երկու կոճակ՝ **Send for approval** (ուղարկել հաստատման) և **Open in editor**
  (բացել խմբագրիչում)։ Այս կոճակների վրա գործում է ճիշտ նույն իրավունքի կանոնը, ինչ հաստատման
  կոճակների վրա. սեղմել կարող է միայն կարգավորված ադմին չաթը։
  *(Երբ `APP_URL`-ը `http://…` է, Telegram-ը հղումով կոճակ չի ընդունում, ուստի հղումը դրվում է
  հաղորդագրության տեքստի մեջ։)*
- **Ադմին**՝ սևագիրը Սոց. ցանցերի ցանկում կրում է **inbox-ից** նշիչը, իսկ խմբագրիչում վերևում
  երևում է *«Պատրաստվել է inbox պանակից՝ … · Առաջարկվող ժամը՝ …»*՝ մեկ սեղմումով
  **Կիրառել առաջարկվող ժամը** կոճակով։
- **Էլ. փոստ**՝ նույն ամփոփումը՝ առկա ուղարկիչով, երբ `RESEND_API_KEY`-ը լրացված է։

Ոչինչ երբեք ինքնաշխատ չի հրապարակվում։ Առաջարկը կանգ է առնում *սևագրի* կամ *պլանավորվածի* վրա.
հաստատումը միշտ քոնն է։

---

## 6. Փորձնական անցում՝ դատարկ պանակից մինչև փորձնական հրապարակված փոստ

```bash
# 1. Ստեղծել պատրաստի օրինակ-պանակ (պատճենում է 3 ցուցադրական ռենդեր + գրում post.txt)
npm run inbox -- --example

# 2. Տեսնել, թե ինչ է մտածում համակարգը՝ առանց որևէ բան փոխելու
npm run inbox -- --dry-run
#    → [WAITING] … սպասում է, մինչև 30 վրկ ոչինչ չփոխվի

# 3. Սպասել կես րոպե և նորից նայել
npm run inbox -- --dry-run
#    → [READY  ] 2026-09-17 1403 example walnut kitchen

# 4. Ներմուծել
npm run inbox
#    → OK  post post_xxx — "…", 3 asset(s)
#         scheduled: 19 Sept 2026 11:00 (Yerevan)
#         files moved to: …/data/inbox/_imported/2026-09-17 1405 example walnut kitchen
```

`_imported/`-ում պանակի անվանը դրվում է ներմուծման պահի դրոշմը, ուստի րոպեները կարող են
տարբերվել այն անունից, որ տեսել ես `--dry-run`-ի ցանկում (վերևի օրինակում՝ 1403 → 1405)։

Հետո՝ բրաուզերում.

5. Բացիր <http://localhost:3100/admin/smm> — սևագիրը վերևում է՝ **inbox-ից** նշիչով, իսկ
   **Ֆայլերի պանակ (inbox)** վահանակն արդեն դատարկ է։
6. Բացիր փոստը։ Վերևի տողում գրված է պանակի անունը, իսկ **Կիրառել առաջարկվող ժամը** կոճակը
   լրացնում է ժամը։
7. Կարդա ամեն հարթակի տեքստը, խմբագրիր, ինչ պետք է, և սեղմիր **Պահպանել**։
8. **Ուղարկել հաստատման (Telegram)** → առանց Telegram բոտի փոստը պարզապես անցնում է
   *սպասում է հաստատման* վիճակի՝ այստեղ։
9. **Հաստատել**, ապա՝ **Հրապարակել հիմա**։ Առանց հարթակների բանալիների ամեն տարբերակ գրանցվում է
   որպես *փորձնական* — ամբողջ շղթան անցնում է, բայց ոչինչ չի դուրս գալիս համակարգչից։

Նույնը կարելի է անել նաև առանց տերմինալի. պատճենիր պանակը `data/inbox/`-ի մեջ, սպասիր և սեղմիր
**Ներմուծել հիմա**՝ **Ֆայլերի պանակ (inbox)** վահանակում։

---

## 7. Խնդիրների լուծում

| Ինչ ես տեսնում | Ինչ է դա նշանակում |
|---|---|
| Վահանակում գրված է **Դեռ պատճենվում է** և այդպես էլ մնում է | Ինչ-որ բան դեռ գրում է պանակի մեջ։ Ամպային համաժամացման ծրագրերը (OneDrive, Dropbox) ֆայլերին բազմիցս դիպչում են. սպասիր համաժամացման ավարտին կամ պանակը պատճենիր լոկալ սկավառակից։ |
| Պանակն ընդհանրապես ցանկում չկա | Անունը սկսվում է `_`-ով կամ `.`-ով, կամ պանակը `_imported` / `_failed`-ի ներսում է։ Վերանվանիր և տեղափոխիր `data/inbox/`-ի վերին մակարդակ։ |
| **Չկա թույլատրված նկար կամ վիդեո** | Հաշվվում են միայն §2-ի ցանկի ֆայլերը։ `.docx`-ը կամ `.zip`-ը բաց են թողնվում։ Ավելացրու ռենդեր, կամ `post.txt` նկարագրությամբ՝ միայն տեքստով փոստի համար։ |
| Պանակը գնաց `_failed/` | Կարդա նրա մեջ եղած `error.txt`-ը։ Ուղղիր պատճառը և պանակը վերադարձրու `data/inbox/`։ |
| Ֆայլը փոստի մեջ չկա | Նայիր փոստի զգուշացումները (խմբագրիչի կողային սյունակ, *Նշումներ*) — ֆայլը 100 ՄԲ-ից մեծ էր, դատարկ էր, չթույլատրված տեսակի էր, կամ նրա բովանդակությունը չէր համապատասխանում ընդլայնմանը (`.jpg`, որն իրականում JPEG չէ)։ |
| `Project "AT-…" was not found` | Բրիֆում նշված կոդը գոյություն չունի։ Փոստը միևնույն է ստեղծվում է՝ առանց նախագծի։ |
| Ժամ չառաջարկվեց | **Կարգավորումներ → Սոց. ցանցեր** էջում նշված չեն հրապարակման օրերը կամ հրապարակման ժամը։ |
| Ինքնաշխատ ոչինչ չի լինում | Աշխատողն աշխատում է վեբ-պրոցեսի ներսում։ Ստուգիր `RUN_WORKER_IN_APP=true`, կամ առանձին գործարկիր `npm run worker`։ Աշխատողի կոդի փոփոխությունները պահանջում են dev-սերվերի վերագործարկում։ |
| Պանակը կախվել է `_processing/`-ում | Ներմուծումն ընդհատվել է (վերագործարկում, հոսանքի անջատում)։ 30 րոպե անց այն ինքնաշխատ վերադառնում է inbox և կրկնվում։ |
| Telegram-ում **Open in editor** կոճակը չկա | `APP_URL`-ը `https://` չէ։ Telegram-ը նման հղումով կոճակ չի ընդունում, ուստի հղումը հաղորդագրության տեքստի մեջ է։ |

---

## 8. Ներսից

| Ֆայլ | Դերը |
|---|---|
| `src/lib/inbox.ts` | սկան, կայունության ստուգում, գրավում, ներմուծում, ժամի ընտրություն, առաջարկ |
| `src/worker/index.ts` | կանչում է սկանը ամեն 60-վայրկյանանոց քայլին՝ իր `try/catch`-ի ներսում |
| `src/worker/boot.ts` | գործարկման ժամանակ ստեղծում է պանակը և README-ն |
| `src/app/admin/actions/smm-actions.ts` | `importInboxForm`, `applySuggestedSlotAction` |
| `src/components/admin/smm/inbox-panel.tsx` | Ֆայլերի պանակ (inbox) վահանակը `/admin/smm`-ում |
| `scripts/inbox.ts` | `npm run inbox` |
| `src/lib/db/migrations.ts` | `0004_post_source` — `posts.source`, `posts.source_ref` |

---

<a id="english"></a>

# English

**What this is.** A folder on the PC. Copy renders into it, and the system prepares a finished post
draft — one text per platform, media attached, a publishing slot proposed — and tells you about it in
Telegram and in the admin. Nothing is published without your approval.

No configuration is needed. The folder is created on the first boot, with a `README.txt` in it.

---

## 1. Where the folder is

```
claudearchitekweb/data/inbox/
```

Set `INBOX_DIR` in `.env` to move it somewhere else (a OneDrive folder, a network share, a Docker
volume). The path is also printed on the **File inbox** panel of Admin → Social media.

It is created together with three house-keeping sub-folders you never have to touch:

| Folder         | What is in it                                                          |
| -------------- | ---------------------------------------------------------------------- |
| `_processing/` | a folder being imported right now (empty the rest of the time)         |
| `_imported/`   | your files after a successful import, under `<date time> <name>/`      |
| `_failed/`     | your files after a failed import, with an `error.txt` next to them     |

**Your files are never deleted.** They are only moved into `_imported/` or `_failed/`.

---

## 2. The structure

One sub-folder per post:

```
data/inbox/
  README.txt                      ← created for you; the short version of this page
  2026-09-17 walnut kitchen/      ← one post (any name: Armenian, Russian, English)
    01-render.jpg
    02-render.jpg
    03-render.jpg
    clip.mp4
    post.txt                      ← optional brief
  _imported/
  _failed/
```

Loose files dropped straight into `data/inbox/` are grouped by name, so
`render-01.jpg` + `render-02.jpg` become one post and a single `clip.mp4` becomes another.

Sub-folders whose name starts with `_` or `.` are ignored. **Files are not** — `_final.jpg` and
`_v2 render.png` are imported like any other render. Only the system files every Windows and macOS
folder collects (`Thumbs.db`, `desktop.ini`, `.DS_Store`, Office's `~$…` lock files) are skipped.

Sub-folders are read up to **5 levels** deep. Anything below that is not imported, and the panel and
the report say how many folders were left unread rather than calling the folder empty.

### Allowed files

| Kind      | Extensions                                     |
| --------- | ---------------------------------------------- |
| Images    | `.jpg` `.jpeg` `.png` `.webp` `.avif` `.gif`   |
| Video     | `.mp4` `.mov` `.webm` `.mkv`                   |
| Documents | `.pdf`                                         |
| 3D        | `.glb` `.usdz`                                 |

This is what a post can actually carry, and the same 100 MB per file limit as the admin upload.
Anything else (`.docx`, `.exe`, `.zip`, and the CAD sources `.dwg` / `.skp` / `.max` that usually sit
next to the renders) is **skipped and reported** — it does not fail the folder. Note this is
deliberately *narrower* than the admin uploader, which also accepts archives and CAD files: those can
live in the media library, but they cannot be published to any platform, so they never become a
post's media. A post takes at most 20 files; images come first (in natural order by name), then
video, then documents.

Every image and video is **decoded before it is attached**. A file that will not decode — usually one
that was still being copied — is left out of the post, named in the warnings, and the folder goes to
`_failed/` with an `error.txt`, so a half-written render can never end up as a post's only picture.

Two different outcomes share the word "failed", so it is worth separating them:

- **The folder is parked in `_failed/`** whenever anything was written but could not be read back —
  the undecodable file above is the usual case. The post is still created from what *did* work; the
  folder is kept out of `_imported/` so you can fix the file and drop it in again.
- **The import produces no post at all** only when the folder has **no usable media and no brief
  text**. Everything else — a skipped `.zip`, an unknown brief key, a project code that does not
  exist, a file over 100 MB — is a warning on the post, never an error.

---

## 3. The brief (optional)

Add `post.txt`, `post.md` or `post.json`. **Every key is optional**, and so is the whole file.

`post.txt` / `post.md` — `key: value` lines, then `---`, then free text:

```
language: hy
goal: showcase
platforms: facebook, instagram, telegram
project: AT-2026-0003
schedule: auto
---
Walnut kitchen for a family in Yerevan; emphasise the island and the integrated lighting.
```

`post.json` — the same keys as a JSON object:

```json
{
  "language": "ru",
  "goal": "sales_b2b",
  "platforms": ["facebook", "telegram"],
  "project": "AT-2026-0003",
  "schedule": "auto",
  "title": "Kitchen series — pilot",
  "instructions": "Mention the 3-day turnaround."
}
```

### Every key

| Key                    | Allowed values                                                                   | Default when missing               |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| `language` / `lang`    | `hy`, `ru`, `en`                                                                   | Settings → Brand → default language |
| `goal`                 | `trust`, `sales_b2b`, `sales_b2c`, `showcase`, `education`                         | `showcase`                         |
| `platforms`            | `facebook`, `instagram`, `linkedin`, `telegram`, `youtube`, `tiktok` (comma-separated; `fb`, `ig`, `li`, `tg`, `yt`, `tt` also work) | Settings → Social media → default platforms |
| `project`              | a project code (`AT-2026-0003`) or a project id                                    | no project                         |
| `schedule`             | `auto` — apply the suggested slot · `none` — leave it a draft · a date, e.g. `2026-09-22 11:00` | suggestion only, not applied |
| `scheduledAt` / `when` | the same date formats as `schedule`                                                | —                                  |
| `title`                | the internal name of the post (max 120 characters)                                 | written by the copywriter          |
| `instructions` / `notes` | extra guidance for the copywriter                                                | —                                  |

Dates without a time zone (`2026-09-22 11:00`) are read as **Yerevan** time. A bare date
(`2026-09-22`) means that day at the configured posting time. A date in the past is ignored and the
next free slot is suggested instead.

**Unknown keys are never an error** — they are reported as a warning on the post and in the report.

The same is true of a line that is not `key: value` at all — a note to yourself, a sentence in
Armenian, a bulleted line. When the brief has a `---` separator, such a line is kept as part of the
description, it is reported, and **the keys below it are still read**. Only in a brief with no `---`
does the first line that is not a key end the header and start the free text.

### File encoding

UTF-8, UTF-8 with BOM, and UTF-16 (what Windows Notepad writes when you pick “Unicode” in its
*Save as* dialog) all work. Armenian and Russian text and file names are fine everywhere.

---

## 4. When it runs

| Trigger                            | How                                                          |
| ---------------------------------- | ------------------------------------------------------------ |
| Automatically                      | the background worker checks every 60 seconds                |
| From the admin                     | Social media → **File inbox** panel → **Import now** / **Import all** |
| From the terminal                  | `npm run inbox` (also `--dry-run` and `--example`)           |

### “Still copying”

A folder is imported only when **nothing in it has changed for 30 seconds** and its file list, the
file sizes *and a digest of the first and last 64 KB of every file* are the same in two consecutive
checks. The digest matters: a copier that pre-allocates the final size and preserves the original
timestamps (`robocopy /COPY:DT`, an archive extractor, a render engine writing straight into the
folder) leaves a file that already *looks* finished, and reading the bytes is the only way to tell.
On top of that every image and video has to decode before it is attached. So you can drag a 300 MB
video in and walk away: a half-copied file is never imported into a post. Until the folder settles,
the panel shows *Still copying*.

In practice this means a folder is imported within about a minute after you finish copying.

A folder is claimed with an exclusive lock before it is imported, so the 60-second worker tick, an
*Import now* click and `npm run inbox` can all fire at the same moment and the folder is still
imported exactly once. The lock is re-stamped every minute while the import runs, so a long import
(twenty videos, a thumbnail each) is never mistaken for an abandoned one and restarted underneath.

### “A file in this folder is open in another program”

Windows cannot move a folder while anything inside it is open — an Explorer window sitting on it, a
thumbnail handler on a JPEG, a file open in Photoshop, an antivirus scan. The folder is then left
exactly where it is and reported as **blocked**: the panel and `npm run inbox` name it, and the
worker logs it (once every 15 minutes, not once a minute). Close the file and it goes through on the
next check. This is a different thing from *Still copying*, and it is no longer reported as one.

---

## 5. What you get

For each folder:

1. Every usable file is imported into the media library (same validation, thumbnails and video
   posters as an admin upload), attached to the project when the brief names one.
2. A post pack is written — a shared idea plus one adapted text per platform. With an AI key
   (`ANTHROPIC_API_KEY` / `GEMINI_API_KEY`) the copywriter writes it and uses the free text from your
   brief.

   **Without an AI key** the built-in trilingual templates write it instead, and they cannot read
   your description or see your photos: they build the copy from the linked project's type, or say
   "project" when there is none. The draft's notes say so and keep the text you wrote, so you can
   paste it in yourself. Everything else — the media, the slot, the platforms, the scheduling —
   behaves identically. Add a `project:` line to the brief to get wording about a kitchen, a
   wardrobe, a bathroom and so on.
3. A **publishing slot is suggested**: the next slot from Settings → Social media (posting days +
   posting time, Yerevan) that is at least the Settings → Social media → **Approval lead time**
   (`approvalLeadMinutes`) away and not already taken.
   - `schedule: auto` → the slot is applied and the post becomes **scheduled**.
   - otherwise → the post stays a **draft** and the slot is only a suggestion.
4. The post is marked as coming from the inbox (`source = inbox`, `source_ref = <folder name>`).
5. The folder is moved to `_imported/<date time> <name>/`.

### How you are told

- **Telegram** (when the bot and admin chat are configured): title, the first part of the text,
  the platforms, the suggested slot, and two buttons — **Send for approval** and **Open in editor**.
  The buttons obey exactly the same authorisation as the approval buttons: only the configured admin
  chat can press them.
  *(When `APP_URL` is `http://…`, Telegram refuses a link button, so the link is put in the message
  text instead.)*
- **Admin**: the draft carries a **from inbox** badge in the Social media list, and the editor shows a
  banner *“Prepared from the inbox folder … · Suggested slot …”* with a one-click **Use suggested slot**.
- **E-mail**: the same summary through the existing sender, when `RESEND_API_KEY` is set.

Nothing is ever published automatically. The suggestion stops at *draft* or *scheduled*; approval is
still yours.

---

## 6. Test run, from empty folder to a published dry-run post

```bash
# 1. Create a ready-made example folder (copies 3 demo renders + writes a post.txt)
npm run inbox -- --example

# 2. See what the system thinks, without changing anything
npm run inbox -- --dry-run
#    → [WAITING] … waiting until nothing has changed for 30 s

# 3. Wait half a minute, then look again
npm run inbox -- --dry-run
#    → [READY  ] 2026-09-17 1403 example walnut kitchen

# 4. Import
npm run inbox
#    → OK  post post_xxx — "…", 3 asset(s)
#         scheduled: 19 Sept 2026 11:00 (Yerevan)
#         files moved to: …/data/inbox/_imported/2026-09-17 1405 example walnut kitchen
```

The name under `_imported/` is re-stamped with the import time, so its minutes can differ from the
name in the `--dry-run` listing (1403 → 1405 above).

Then, in the browser:

5. Open <http://localhost:3100/admin/smm> — the draft is at the top with a **from inbox** badge, and
   the **File inbox** panel is now empty.
6. Open it. The banner names the folder; **Use suggested slot** fills in the schedule.
7. Read the per-platform texts, edit anything, press **Save**.
8. **Send for approval** → without a Telegram bot the post simply moves to *awaiting approval* here.
9. **Approve**, then **Publish now**. Without platform credentials every variant is recorded as
   *simulated* — the whole chain is exercised, nothing leaves the machine.

You can also do the same without the terminal: copy a folder into `data/inbox/`, wait, and press
**Import now** on the **File inbox** panel.

---

## 7. Troubleshooting

| What you see | What it means |
| ------------ | ------------- |
| The panel says **Still copying** and stays that way | Something is still writing to the folder. Cloud-sync clients (OneDrive, Dropbox) touch files repeatedly; wait for the sync to finish, or copy the folder in from a local disk. |
| The folder is not listed at all | Its name starts with `_` or `.`, or it is inside `_imported` / `_failed`. Rename it and move it to the top level of `data/inbox/`. |
| **No supported image or video** | Only files from the allow-list in §2 count. A `.docx` or `.zip` is skipped. Add a render, or a `post.txt` with a description for a text-only post. |
| The folder went to `_failed/` | Read `error.txt` inside it. Fix the cause and move the folder back into `data/inbox/`. |
| A file is missing from the post | Check the warnings on the post (editor sidebar, *Notes*) — it was over 100 MB, empty, an unsupported type, or its content did not match its extension (a `.jpg` that is not really a JPEG). |
| `Project "AT-…" was not found` | The code in the brief does not exist. The post is created anyway, without a project. |
| No slot was suggested | No posting days or posting time are set in Settings → Social media. |
| Nothing happens automatically | The worker runs inside the web process. Check `RUN_WORKER_IN_APP=true`, or run `npm run worker` separately. Worker code changes need a dev-server restart. |
| A folder is stuck in `_processing/` | An import was interrupted (restart, power cut). After 30 minutes it is moved back into the inbox automatically and retried. |
| Telegram has no **Open in editor** button | `APP_URL` is not `https://`. Telegram rejects such link buttons, so the link is in the message text instead. |

---

## 8. Under the hood

| File | Role |
| ---- | ---- |
| `src/lib/inbox.ts` | scan, stability check, claim, import, slot finder, suggestion |
| `src/worker/index.ts` | calls the scan on every 60-second tick, inside its own `try/catch` |
| `src/worker/boot.ts` | creates the folder and the README on boot |
| `src/app/admin/actions/smm-actions.ts` | `importInboxForm`, `applySuggestedSlotAction` |
| `src/components/admin/smm/inbox-panel.tsx` | the File inbox panel on `/admin/smm` |
| `scripts/inbox.ts` | `npm run inbox` |
| `src/lib/db/migrations.ts` | `0004_post_source` — `posts.source`, `posts.source_ref` |
