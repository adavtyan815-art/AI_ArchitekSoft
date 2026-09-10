/**
 * Architeksoft Luxury Web Application Engine
 * Trilingual i18n, WebGL 3D Configurator, Before/After Slider, Modals, Video Switcher
 */

const translations = {
  hy: {
    nav_home: 'Գլխավոր',
    nav_capabilities: 'Հնարավորություններ',
    nav_drop_showroom_title: 'Ինտերակտիվ 4K Ցուցասրահ',
    nav_drop_showroom_desc: 'Ռեալ-թայմ քայլել սենյակում, լույսի և նյութերի փոփոխություն',
    nav_drop_ar_title: 'Web 3D & Բջջային AR',
    nav_drop_ar_desc: '360° ինտերակտիվություն և 1:1 AR պրոյեկցիա սմարթֆոնով',
    nav_drop_factory_title: 'Գործարանային Փաստաթղթավորում',
    nav_drop_factory_desc: 'CNC ռասկրոյ, Blum ֆուրնիտուրա և զրո խոտան',
    nav_pipeline: 'Ինչպես է Աշխատում',
    nav_portfolio: 'Պորտֆոլիո',
    nav_b2b: 'Արտադրողներին',
    nav_configurator: '3D Ցուցասրահ',
    nav_blueprint: 'Կտրման Քարտեզներ (Раскрой)',
    nav_contact: 'Կապ',
    showroom_sec_tag: '4K Ինտերակտիվ Ցուցասրահ',
    showroom_sec_title: 'Ինտերակտիվ 4K Շրջայց և <span class="gradient-text">Սենյակների Ընտրություն</span>',
    showroom_sec_desc: 'Փորձարկեք իրական ժամանակում սենյակների փոփոխությունը, ազատ տեղաշարժը և ֆոտոռեալիստիկ լուսավորությունը։',
    nav_demo_btn: '3D Ցուցասրահ',

    hero_console_title: '4K ԻՆՏԵՐԱԿՏԻՎ ՎԻԶՈՒԱԼԻԶԱՑԻԱ',
    hero_status_tag: 'ԿԱՐԳԱՎԻՃԱԿ՝ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿ // 60 FPS',

    tab_scene_kitchen: 'Խոհանոց',
    tab_scene_bedroom: 'Ննջասենյակ',
    tab_scene_living: 'Հյուրասենյակ',
    tab_scene_interior: 'Ինտերիեր',

    scene_kitchen_title: 'Ինտերակտիվ Խոհանոց',
    scene_bedroom_title: 'Ննջասենյակ & Պահարաններ',
    scene_living_title: 'Հյուրասենյակ & TV Գոտի',
    scene_interior_title: 'Ճարտարապետական Ինտերիեր',

    hero_view_4k_btn: '4K Cinema',
    hero_xray_btn: 'CAD X-Ray',
    btn_ar_launch_short: '1:1 AR',
    ar_modal_title: '1:1 Բջջային AR Պրոյեկցիա',
    ar_modal_desc: 'Սկանավորեք QR կոդը Ձեր սմարթֆոնով՝ կահույքն անմիջապես Ձեր սենյակում 1:1 մասշտաբով տեսնելու համար։',
    ar_badge_ios: 'iOS QuickLook',
    ar_badge_android: 'Android SceneViewer',

    hero_badge: 'ԹՎԱՅԻՆ ՑՈՒՑԱՍՐԱՀ ԵՎ ԳՈՐԾԱՐԱՆԱՅԻՆ ՃՇԳՐՏՈՒԹՅՈՒՆ',
    hero_title: 'Կահույքի և Ինտերիերի <span class="gradient-text">Թվային Ցուցասրահ</span>',
    hero_sub_title: 'Էսքիզից մինչև 4K Ինտերակտիվ Ցուցասրահ և Կտրման Քարտեզներ (Раскрой)',
    hero_desc: 'Մենք թվայնացնում ենք Ձեր նախագծերը՝ ստեղծելով ֆոտոռեալիստիկ 3D ցուցասրահ Ձեր հաճախորդների համար և պատրաստի գործարանային գծագրեր՝ արտադրության համար։',
    hero_btn_live: 'Փորձել 3D Ցուցասրահը',
    hero_btn_contact: 'Կապվել Մեզ Հետ',
    hero_stat_1_val: '4K Շրջայց',
    hero_stat_1_lbl: 'Ազատ Շարժում Սենյակում',
    hero_stat_2_val: '1:1 AR',
    hero_stat_2_lbl: 'Կահույքը Ձեր Սենյակում',
    hero_stat_3_val: '0.1 մմ',
    hero_stat_3_lbl: 'Կտրման Քարտեզներ (Раскрой)',
    hero_feat_1_val: '4K Շրջայց',
    hero_feat_1_lbl: 'Ազատ Շարժում Սենյակում',
    hero_feat_2_val: '1:1 Իրական Չափս',
    hero_feat_2_lbl: 'Կահույքը Ձեր Սենյակում (AR)',
    hero_feat_3_val: '0.1 մմ Ճշգրտություն',
    hero_feat_3_lbl: 'Կտրման Քարտեզներ (Раскрой)',
    hero_feat_4_val: 'Բոլոր Սարքերում',
    hero_feat_4_lbl: 'Համակարգիչ, Սմարթֆոն, VR',
    hero_annotation_color: 'Տեսեք տարբեր<br/>գույնով',


    devices_tag: 'Բազմասարք Համատեղելիություն',
    devices_title: 'Ձեր Գաղափարը՝ <span class="gradient-text">Հասանելի Ցանկացած Սարքում</span>',
    devices_desc: 'Մեր թվային ցուցասրահները հասանելի են բոլոր ժամանակակից սարքերում՝ առանց հզոր համակարգչի կամ ծանր ծրագրեր տեղադրելու։',
    device_card1_t: 'Desktop & WebGL',
    device_card1_d: '4K շրջայց մկնիկով ցանկացած բրաուզերում (Chrome, Safari, Edge)',
    device_card2_t: 'Mobile & Tablet',
    device_card2_d: 'Սենսորային հարմարավետ կառավարում iOS և Android սարքերում',
    device_card3_t: 'VR Virtual Reality',
    device_card3_d: 'Լիարժեք ընկղմում վիրտուալ տարածքում (Meta Quest, Vision Pro)',
    device_card4_t: '1:1 Scale AR',
    device_card4_d: 'Կահույքի տեղադրում իրական սենյակում՝ սմարթֆոնի տեսախցիկով',

    pipeline_tag: 'Արտադրական Գործընթաց',
    pipeline_title: 'Արտադրության և Թվայնացման 4 Փուլերը',
    pipeline_desc: 'Ինչպես ենք Ձեր նախնական էսքիզը վերածում ինտերակտիվ ցուցասրահի և գործարանային պատրաստի գծագրի։',
    pillar1_title: '01. Էսքիզ և Չափագրում',
    pillar1_desc: 'Ձեռքի էսքիզի կամ նախնական գծագրի թվայնացում և ճշգրիտ 3D մոդելավորում։',
    pillar2_title: '02. 4K Ինտերակտիվ Ցուցասրահ',
    pillar2_desc: 'Ազատ տեղաշարժ սենյակում, դարակների բացում և նյութերի ակնթարթային փոփոխություն։',
    pillar3_title: '03. Բջջային AR Պրոյեկցիա',
    pillar3_desc: 'Կահույքի տեղադրում սեփական սենյակում՝ սմարթֆոնի տեսախցիկով (1:1 մասշտաբով)։',
    pillar4_title: '04. CNC Ռասկրոյ և Գծագիր',
    pillar4_desc: 'Գործարանային CNC ռասկրոյի քարտեզներ, Blum ֆուրնիտուրայի տեղադրման սխեմաներ և զրո խոտան։',

    comp_tag: 'Համեմատություն',
    comp_title: 'Ձեռքի Էսքիզից մինչև 4K Իրականություն',
    comp_desc: 'Սահեցրեք կենտրոնական բաժանիչը՝ տեսնելու համար նախնական էսքիզի և վերջնական 4K ռենդերի տարբերությունը։',
    comp_tag_before: 'Էսքիզ',
    comp_tag_after: '4K Վերջնական Ռենդեր',

    config_tag: 'Ինտերակտիվ 3D',
    config_title: 'Ինտերակտիվ 3D Ցուցասրահ Բրաուզերում',
    config_desc: 'Ուսումնասիրեք մոդելը 360° անկյան տակ, փոխեք ֆասադների նյութերը իրական ժամանակում։',
    config_choose_mat: 'Ընտրեք Ֆասադի Նյութը՝',
    btn_ar_launch: 'Տեսնել Իրական Սենյակում (AR)',

    mat_walnut: 'Ընկուզենի',
    mat_marble: 'Մարմար',
    mat_graphite: 'Գրաֆիտ',
    mat_gold: 'Ոսկի',

    blueprint_tag: 'Գործարանային Արտադրություն',
    blueprint_title: 'Գործարանային CNC Ռասկրոյ և Blueprint',
    blueprint_desc: 'Յուրաքանչյուր նախագիծ ապահովվում է գործարանային ամբողջական փաստաթղթավորմամբ՝ CNC կտրման քարտեզներով, Blum ֆուրնիտուրայի ծակման կոորդինատներով և նյութերի հաշվարկով։',
    blueprint_f1_t: 'Ավտոմատ Ռասկրոյի Քարտեզներ',
    blueprint_f1_d: 'Մաքսիմալ նյութի խնայողություն և հաստոցի հետ լիարժեք համատեղելիություն։',
    blueprint_f2_t: 'Blum & Hettich Ֆուրնիտուրա',
    blueprint_f2_d: 'Միլիմետրային ճշգրտությամբ ծակման և տեղադրման սխեմաներ։',
    blueprint_f3_t: 'Զրո Խոտանի Երաշխիք',
    blueprint_f3_d: 'Արտադրական սխալների և խոտանի 95% կրճատում։',
    blueprint_btn: 'Ներբեռնել Օրինակելի PDF Գծագիրը (Aren.pdf)',

    contact_tag: 'Հետադարձ Կապ',
    contact_title: 'Սկսեք Ձեր Պրոյեկտի Թվայնացումը',
    contact_desc: 'Կապվեք մեզ հետ անհատական առաջարկի կամ Ձեր նախագծի 3D ցուցադրության համար։',
    contact_phone_lbl: 'Հեռախոսահամարներ',
    contact_tg_lbl: 'Telegram Ուղիղ Կապ',
    contact_email_lbl: 'Էլ․ Հասցե',
    form_name_lbl: 'Ձեր Անունը / Ընկերության Անվանումը',
    form_phone_lbl: 'Հեռախոսահամար կամ Telegram',
    form_msg_lbl: 'Հաղորդագրություն կամ Նախագծի Մանրամասներ',
    form_submit_btn: 'Ուղարկել Հարցումը',
    form_success: 'Շնորհակալություն։ Ձեր հարցումն ընդունված է։ Մեր մասնագետը կկապվի Ձեզ հետ կարճ ժամանակում։',

    footer_rights: '© 2026 ArchiTek Soft. Բոլոր իրավունքները պաշտպանված են։',
    footer_tagline: 'Բարձրտեխնոլոգիական 3D Վիզուալիզացիա, Ինտերակտիվ Ցուցասրահներ և CNC Ռասկրոյ:'
  },
  ru: {
    nav_home: 'Главная',
    nav_capabilities: 'Возможности',
    nav_drop_showroom_title: 'Интерактивный 4K Шоурум',
    nav_drop_showroom_desc: 'Прогулка по комнате в реальном времени, смена света и материалов',
    nav_drop_ar_title: 'Web 3D & Мобильный AR',
    nav_drop_ar_desc: '360° интерактивность и 1:1 AR проекция со смартфона',
    nav_drop_factory_title: 'Заводская Документация',
    nav_drop_factory_desc: 'CNC раскрой, фурнитура Blum и ноль брака',
    nav_pipeline: 'Как это работает',
    nav_portfolio: 'Портфолио',
    nav_b2b: 'Производителям',
    nav_configurator: '3D Шоурум',
    nav_blueprint: 'Карты Раскроя',
    nav_contact: 'Контакты',
    showroom_sec_tag: '4K Интерактивный Шоурум',
    showroom_sec_title: 'Интерактивный 4K Тур и <span class="gradient-text">Выбор Помещений</span>',
    showroom_sec_desc: 'Испытайте смену комнат в реальном времени, свободное перемещение и фотореалистичное освещение.',
    nav_demo_btn: '3D Шоурум',

    hero_console_title: '4K ИНТЕРАКТИВНАЯ ВИЗУАЛИЗАЦИЯ',
    hero_status_tag: 'СТАТУС: РЕАЛЬНОЕ ВРЕМЯ // 60 FPS',

    tab_scene_kitchen: 'Кухня',
    tab_scene_bedroom: 'Спальня',
    tab_scene_living: 'Гостиная',
    tab_scene_interior: 'Интерьер',

    scene_kitchen_title: 'Интерактивная Кухня',
    scene_bedroom_title: 'Спальня и Гардеробные',
    scene_living_title: 'Гостиная и ТВ Зона',
    scene_interior_title: 'Архитектурный Интерьер',

    hero_view_4k_btn: '4K Cinema',
    hero_xray_btn: 'CAD X-Ray',
    btn_ar_launch_short: '1:1 AR',
    ar_modal_title: '1:1 Мобильная AR Проекция',
    ar_modal_desc: 'Отсканируйте QR-код смартфоном, чтобы спроецировать мебель в реальную комнату (1:1).',
    ar_badge_ios: 'iOS QuickLook',
    ar_badge_android: 'Android SceneViewer',

    hero_badge: 'ВЫСОКОТЕХНОЛОГИЧНАЯ ЦИФРОВИЗАЦИЯ МЕБЕЛИ И ИНТЕРЬЕРОВ',
    hero_title: 'Цифровой Шоурум <span class="gradient-text">Мебели и Интерьера</span>',
    hero_sub_title: 'От Эскиза до 4K Интерактивного Шоурума и Заводского ЧПУ Раскроя',
    hero_desc: 'Мы оцифровываем ваши проекты мебели: создаем фотореалистичные 3D шоурумы для клиентов и точные карты раскроя ЧПУ для производства.',
    hero_btn_live: 'Попробовать 3D Шоурум',
    hero_btn_contact: 'Связаться с Нами',
    hero_stat_1_val: '4K Шоурум',
    hero_stat_1_lbl: 'Свободное Движение',
    hero_stat_2_val: '1:1 AR',
    hero_stat_2_lbl: 'Мебель в Вашей Комнате',
    hero_stat_3_val: '0.1 мм',
    hero_stat_3_lbl: 'Карты Раскроя (ЧПУ)',
    hero_feat_1_val: '4K Тур',
    hero_feat_1_lbl: 'Свободное Движение в Комнате',
    hero_feat_2_val: '1:1 Масштаб',
    hero_feat_2_lbl: 'Мебель в Вашей Комнате (AR)',
    hero_feat_3_val: '0.1 мм Точность',
    hero_feat_3_lbl: 'Карты Раскроя (ЧПУ)',
    hero_feat_4_val: 'Все Устройства',
    hero_feat_4_lbl: 'Компьютер, Смартфон, VR',
    hero_annotation_color: 'Смотрите в<br/>разных цветах',


    devices_tag: 'Кроссплатформенность',
    devices_title: 'Ваш Проект — <span class="gradient-text">Доступен на Любом Устройстве</span>',
    devices_desc: 'Интерактивные 3D шоурумы работают на любом устройстве прямо в браузере без установки тяжелых программ.',
    device_card1_t: 'Компьютеры & WebGL',
    device_card1_d: '4K управление мышью в любом браузере (Chrome, Safari, Edge)',
    device_card2_t: 'Смартфоны & Планшеты',
    device_card2_d: 'Удобное сенсорное управление на iOS и Android',
    device_card3_t: 'VR Шлемы',
    device_card3_d: 'Полное погружение в виртуальную реальность (Meta Quest, Vision Pro)',
    device_card4_t: '1:1 AR Примерка',
    device_card4_d: 'Примерка мебели в реальной комнате через камеру смартфона',

    pipeline_tag: 'Производственный Процесс',
    pipeline_title: '4 Этапа Производства и Оцифровки',
    pipeline_desc: 'Как мы превращаем ваш эскиз в интерактивный шоурум и готовые чертежи для станков с ЧПУ.',
    pillar1_title: '01. Эскиз и Замеры',
    pillar1_desc: 'Оцифровка ручного эскиза и точное 3D моделирование архитектуры мебели.',
    pillar2_title: '02. Интерактивный 4K Шоурум',
    pillar2_desc: 'Свободное перемещение по комнате, открытие ящиков и мгновенная смена материалов.',
    pillar3_title: '03. Мобильная AR Проекция',
    pillar3_desc: 'Примерка мебели в реальной комнате через камеру смартфона в масштабе 1:1.',
    pillar4_title: '04. ЧПУ Раскрой и Чертежи',
    pillar4_desc: 'Заводские карты раскроя, схемы присадки фурнитуры Blum и нулевой брак.',

    comp_tag: 'Сравнение',
    comp_title: 'От Ручного Эскиза до 4K Реальности',
    comp_desc: 'Передвигайте ползунок, чтобы увидеть разницу между исходным эскизом и финальным 4K рендером.',
    comp_tag_before: 'Эскиз',
    comp_tag_after: 'Финальный 4K Рендер',

    config_tag: 'Интерактивное 3D',
    config_title: 'Интерактивный 3D Шоурум в Браузере',
    config_desc: 'Изучайте модель на 360°, меняйте материалы фасадов в реальном времени.',
    config_choose_mat: 'Выберите Материал Фасада:',
    btn_ar_launch: 'Посмотреть в Комнате (AR)',

    mat_walnut: 'Орех',
    mat_marble: 'Мрамор',
    mat_graphite: 'Графит',
    mat_gold: 'Золото',

    blueprint_tag: 'Заводское Производство',
    blueprint_title: 'Заводской ЧПУ Раскрой и Blueprint',
    blueprint_desc: 'Каждый проект сопровождается комплектом заводской документации: картами раскроя ЧПУ и присадками Blum.',
    blueprint_f1_t: 'Автоматические Карты Раскроя',
    blueprint_f1_d: 'Максимальная экономия материалов и полная совместимость со станками ЧПУ.',
    blueprint_f2_t: 'Фурнитура Blum и Hettich',
    blueprint_f2_d: 'Миллиметровая точность присадки и монтажные схемы.',
    blueprint_f3_t: 'Гарантия Без Брака',
    blueprint_f3_d: 'Сокращение производственного брака на 95%.',
    blueprint_btn: 'Скачать Пример PDF Чертежа (Aren.pdf)',

    contact_tag: 'Обратная Связь',
    contact_title: 'Начните Цифровизацию Вашего Проекта',
    contact_desc: 'Свяжитесь с нами для получения индивидуального предложения или 3D презентации проекта.',
    contact_phone_lbl: 'Номера Телефонов',
    contact_tg_lbl: 'Прямая Связь в Telegram',
    contact_email_lbl: 'Эл. Почта',
    form_name_lbl: 'Ваше Имя / Название Компании',
    form_phone_lbl: 'Телефон или Telegram',
    form_msg_lbl: 'Сообщение или Детали Проекта',
    form_submit_btn: 'Отправить Запрос',
    form_success: 'Спасибо! Ваш запрос принят. Наш специалист свяжется с вами в ближайшее время.',

    footer_rights: '© 2026 ArchiTek Soft. Все права защищены.',
    footer_tagline: 'Высокотехнологичная 3D Визуализация, Интерактивные Шоурумы и ЧПУ Раскрой.'
  },
  en: {
    nav_home: 'Home',
    nav_capabilities: 'Capabilities',
    nav_drop_showroom_title: 'Interactive 4K Showroom',
    nav_drop_showroom_desc: 'Real-time walkthrough, lighting and material changes',
    nav_drop_ar_title: 'Web 3D & Mobile AR',
    nav_drop_ar_desc: '360° interactive view and 1:1 AR room projection',
    nav_drop_factory_title: 'Factory Documentation',
    nav_drop_factory_desc: 'CNC cutlists, Blum hardware drilling and zero waste',
    nav_pipeline: 'How it Works',
    nav_portfolio: 'Portfolio',
    nav_b2b: 'For Manufacturers',
    nav_configurator: '3D Showroom',
    nav_blueprint: 'CNC Cutlist',
    nav_contact: 'Contact',
    showroom_sec_tag: '4K Interactive Showroom',
    showroom_sec_title: 'Interactive 4K Walkthrough & <span class="gradient-text">Scene Selection</span>',
    showroom_sec_desc: 'Experience real-time scene swapping, free room walkthrough, and photorealistic lighting.',
    nav_demo_btn: '3D Showroom',

    hero_console_title: '4K INTERACTIVE VISUALIZATION',
    hero_status_tag: 'STATUS: REAL-TIME STREAMING // 60 FPS',

    tab_scene_kitchen: 'Kitchen',
    tab_scene_bedroom: 'Bedroom',
    tab_scene_living: 'Living Room',
    tab_scene_interior: 'Interior',

    scene_kitchen_title: 'Interactive Kitchen',
    scene_bedroom_title: 'Bedroom & Wardrobes',
    scene_living_title: 'Living Room & TV Unit',
    scene_interior_title: 'Architectural Interior',

    hero_view_4k_btn: '4K Cinema',
    hero_xray_btn: 'CAD X-Ray',
    btn_ar_launch_short: '1:1 AR',
    ar_modal_title: '1:1 Mobile AR Projection',
    ar_modal_desc: 'Scan the QR code with your smartphone to project the furniture into your room at 1:1 scale.',
    ar_badge_ios: 'iOS QuickLook',
    ar_badge_android: 'Android SceneViewer',

    hero_badge: 'HIGH-TECH DIGITALIZATION FOR FURNITURE & INTERIORS',
    hero_title: 'Digital Showroom for <span class="gradient-text">Furniture & Interiors</span>',
    hero_sub_title: 'From Hand Sketch to 4K Interactive Showroom & Factory CNC Cutlists',
    hero_desc: 'We digitize your bespoke furniture projects: creating photorealistic 3D interactive showrooms for clients and millimeter-accurate CNC cutlists for production.',
    hero_btn_live: 'Try 3D Showroom',
    hero_btn_contact: 'Contact Us',
    hero_stat_1_val: '4K Showroom',
    hero_stat_1_lbl: 'Free Room Walkthrough',
    hero_stat_2_val: '1:1 AR',
    hero_stat_2_lbl: 'Furniture in Your Room',
    hero_stat_3_val: '0.1 mm',
    hero_feat_1_val: '4K Walkthrough',
    hero_feat_1_lbl: 'Free Room Navigation',
    hero_feat_2_val: '1:1 Real Scale',
    hero_feat_2_lbl: 'Furniture in Your Room (AR)',
    hero_feat_3_val: '0.1 mm Precision',
    hero_feat_3_lbl: 'Factory CNC Cutlists',
    hero_feat_4_val: 'All Devices',
    hero_feat_4_lbl: 'Desktop, Mobile, VR',
    hero_annotation_color: 'Explore in<br/>different colors',

    hero_stat_3_lbl: 'Factory CNC Cutlists',

    devices_tag: 'Cross-Platform Accessibility',
    devices_title: 'Your Project — <span class="gradient-text">Accessible on Any Device</span>',
    devices_desc: 'Our interactive 3D showrooms run smoothly on any modern device directly in the browser with zero software installation.',
    device_card1_t: 'Desktop & WebGL',
    device_card1_d: '4K mouse walkthrough in any browser (Chrome, Safari, Edge)',
    device_card2_t: 'Mobile & Tablets',
    device_card2_d: 'Intuitive touch controls on iOS and Android smartphones & tablets',
    device_card3_t: 'VR Headsets',
    device_card3_d: 'Fully immersive spatial reality (Meta Quest, Vision Pro)',
    device_card4_t: '1:1 Scale AR',
    device_card4_d: 'Instant real-room furniture projection using phone camera',

    pipeline_tag: 'Production Pipeline',
    pipeline_title: 'The 4 Stages of Digital Manufacturing',
    pipeline_desc: 'How we turn your initial sketch into an interactive showroom and factory-ready CNC cutlists.',
    pillar1_title: '01. Sketch & Survey',
    pillar1_desc: 'Digitization of hand sketches and precise 3D architectural modeling.',
    pillar2_title: '02. 4K Interactive Showroom',
    pillar2_desc: 'Free room walkthrough, drawer physics, and real-time material swapping.',
    pillar3_title: '03. Mobile AR Projection',
    pillar3_desc: '1:1 scale furniture placement in your real room using your smartphone camera.',
    pillar4_title: '04. CNC Cutlists & Blueprints',
    pillar4_desc: 'Factory-ready CNC cutlists, Blum hardware drilling maps, and zero defect rate.',

    comp_tag: 'Comparison',
    comp_title: 'From Hand Sketch to 4K Reality',
    comp_desc: 'Drag the central slider to see the difference between the initial sketch and the final 4K render.',
    comp_tag_before: 'Hand Sketch',
    comp_tag_after: 'Final 4K Render',

    config_tag: 'Interactive 3D',
    config_title: 'Interactive 3D Showroom in Browser',
    config_desc: 'Explore the 3D model in 360°, change facade materials in real time.',
    config_choose_mat: 'Select Facade Material:',
    btn_ar_launch: 'View in Real Room (AR)',

    mat_walnut: 'Walnut Wood',
    mat_marble: 'Calacatta Marble',
    mat_graphite: 'Graphite Matte',
    mat_gold: 'Brushed Gold',

    blueprint_tag: 'Factory Manufacturing',
    blueprint_title: 'Factory CNC Cutlists & Blueprints',
    blueprint_desc: 'Every project comes with complete factory documentation: CNC cutlists, Blum drilling coordinates, and bill of materials.',
    blueprint_f1_t: 'Automated Cutlist Maps',
    blueprint_f1_d: 'Maximum material yield and seamless CNC machine compatibility.',
    blueprint_f2_t: 'Blum & Hettich Hardware',
    blueprint_f2_d: 'Millimeter-accurate drilling and assembly diagrams.',
    blueprint_f3_t: 'Zero-Defect Guarantee',
    blueprint_f3_d: '95% reduction in manufacturing errors and waste.',
    blueprint_btn: 'Download Sample PDF Blueprint (Aren.pdf)',

    contact_tag: 'Get in Touch',
    contact_title: 'Start Digitizing Your Project Today',
    contact_desc: 'Contact us for a bespoke quotation or a live 3D demonstration of your project.',
    contact_phone_lbl: 'Phone Numbers',
    contact_tg_lbl: 'Direct Telegram',
    contact_email_lbl: 'Email Address',
    form_name_lbl: 'Your Name / Company Name',
    form_phone_lbl: 'Phone Number or Telegram',
    form_msg_lbl: 'Project Details / Message',
    form_submit_btn: 'Submit Inquiry',
    form_success: 'Thank you! Your inquiry has been received. Our engineer will contact you shortly.',

    footer_rights: '© 2026 ArchiTek Soft. All rights reserved.',
    footer_tagline: 'High-Tech 3D Visualization, Interactive Showrooms & CNC Factory Engineering.'
  }
};

let currentLang = localStorage.getItem('architek_lang') || 'hy';
let currentHeroScene = 'kitchen';

const sceneTitles = {
  kitchen: 'scene_kitchen_title',
  bedroom: 'scene_bedroom_title',
  living: 'scene_living_title',
  interior: 'scene_interior_title'
};

function setLanguage(lang) {
  if (!translations[lang]) lang = 'hy';
  currentLang = lang;
  localStorage.setItem('architek_lang', lang);

  const dict = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = dict[key];
      } else {
        el.innerHTML = dict[key];
      }
    }
  });

  const langTrigger = document.getElementById('current-lang-text');
  const flagIcon = document.getElementById('current-flag-icon');
  
  const flagSvgs = {
    hy: '<svg class="svg-flag" viewBox="0 0 640 480"><path fill="#d90012" d="M0 0h640v160H0z"/><path fill="#0033a0" d="M0 160h640v160H0z"/><path fill="#f2a800" d="M0 320h640v160H0z"/></svg>',
    ru: '<svg class="svg-flag" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v160H0z"/><path fill="#0039a6" d="M0 160h640v160H0z"/><path fill="#d52b1e" d="M0 320h640v160H0z"/></svg>',
    en: '<svg class="svg-flag" viewBox="0 0 640 480"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#fff" d="m75 0 245 180L565 0h75v60L435 240l205 180v60h-75L320 300 75 480H0v-60l205-180L0 60V0z"/><path fill="#C8102E" d="m424 281 216 159v40l-244-180zm141-281-245 180h50L640 40V0zM0 40l190 140h-50L0 76zm0 400 245-180h-50L0 440z"/><path fill="#fff" d="M240 0h160v480H240zM0 160h640v160H0z"/><path fill="#C8102E" d="M267 0h107v480H267zM0 187h640v107H0z"/></svg>'
  };

  const langLabels = { hy: 'ՀԱՅ', ru: 'РУС', en: 'ENG' };

  if (langTrigger) langTrigger.textContent = langLabels[lang] || 'ՀԱՅ';
  if (flagIcon && flagSvgs[lang]) flagIcon.innerHTML = flagSvgs[lang];

  document.querySelectorAll('.lang-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-lang') === lang);
  });
}

const urlTheme = new URLSearchParams(window.location.search).get('theme');
let currentTheme = (urlTheme === 'light' || urlTheme === 'dark') ? urlTheme : (localStorage.getItem('architek_theme') || 'dark');

// Apply theme immediately on script execution to prevent flash
document.documentElement.setAttribute('data-theme', currentTheme);


// ============================================================================
// WEB AUDIO API SYNTHESIZER (MICRO-HAPTIC TACTILE SOUND ENGINE)
// ============================================================================
let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function initSound() {
  const saved = localStorage.getItem('architek_sound');
  soundEnabled = saved !== null ? saved === 'true' : true;
  updateSoundToggleUI();

  const toggleBtn = document.getElementById('sound-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSound();
    });
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('architek_sound', soundEnabled);
  updateSoundToggleUI();
  if (soundEnabled) {
    playHapticClick();
  }
}

function updateSoundToggleUI() {
  const toggleBtn = document.getElementById('sound-toggle-btn');
  if (toggleBtn) {
    toggleBtn.classList.toggle('sound-muted', !soundEnabled);
    toggleBtn.setAttribute('title', soundEnabled ? 'Ձայն՝ Միացված (Sound ON)' : 'Ձայն՝ Անջատված (Sound Muted)');
    toggleBtn.setAttribute('aria-label', soundEnabled ? 'Mute Sound FX' : 'Unmute Sound FX');
  }
}

// Micro tactile haptic click (crisp, subtle high-tech tick for tab clicks)
function playHapticClick() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.035);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {}
}

// Smooth dual-harmonic chime for theme toggle
function playThemeTone() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // Base chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(540, now);
    osc1.frequency.exponentialRampToValueAtTime(820, now + 0.12);
    gain1.gain.setValueAtTime(0.035, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Subtle shimmer overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1080, now + 0.025);
    osc2.frequency.exponentialRampToValueAtTime(1640, now + 0.13);
    gain2.gain.setValueAtTime(0.02, now + 0.025);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.025);
    osc2.stop(now + 0.13);
  } catch (e) {}
}

// Cinematic spatial chord for opening 4K Cinema mode
function playCinemaTone() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [330, 495, 660];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.35);

      gain.gain.setValueAtTime(0.028, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.35);
    });
  } catch (e) {}
}


// Laser scan tone for CAD X-Ray mode
function playLaserTone() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

// Lighting switch micro tone
function playLightSwitchTone() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.045);

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  } catch (e) {}
}

// AR Launch spatial chime
function playARLaunchTone() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.03, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.18);
    });
  } catch (e) {}
}

// Adaptive Ambilight Palettes (Scene x Lighting Mode)
const sceneAmbilightPalettes = {
  kitchen: {
    day: ['rgba(245, 158, 11, 0.28)', 'rgba(0, 240, 255, 0.18)'],
    sunset: ['rgba(251, 146, 60, 0.42)', 'rgba(234, 88, 12, 0.32)'],
    night: ['rgba(59, 130, 246, 0.28)', 'rgba(0, 240, 255, 0.30)']
  },
  bedroom: {
    day: ['rgba(234, 179, 8, 0.24)', 'rgba(99, 102, 241, 0.20)'],
    sunset: ['rgba(244, 63, 94, 0.36)', 'rgba(245, 158, 11, 0.26)'],
    night: ['rgba(99, 102, 241, 0.35)', 'rgba(0, 240, 255, 0.20)']
  },
  living: {
    day: ['rgba(251, 191, 36, 0.26)', 'rgba(139, 92, 246, 0.18)'],
    sunset: ['rgba(249, 115, 22, 0.40)', 'rgba(168, 85, 247, 0.25)'],
    night: ['rgba(139, 92, 246, 0.34)', 'rgba(0, 240, 255, 0.28)']
  },
  interior: {
    day: ['rgba(0, 240, 255, 0.32)', 'rgba(37, 99, 235, 0.24)'],
    sunset: ['rgba(251, 146, 60, 0.36)', 'rgba(0, 240, 255, 0.24)'],
    night: ['rgba(0, 240, 255, 0.40)', 'rgba(30, 58, 138, 0.32)']
  }
};

let isXRayActive = false;
let currentLightingMode = 'day';

function updateAmbilight() {
  const ambilightEl = document.getElementById('studio-ambilight');
  if (!ambilightEl) return;
  const sceneData = sceneAmbilightPalettes[currentHeroScene] || sceneAmbilightPalettes.kitchen;
  const colors = sceneData[currentLightingMode] || sceneData.day;
  ambilightEl.style.setProperty('--amb-c1', colors[0]);
  ambilightEl.style.setProperty('--amb-c2', colors[1]);
}

function toggleXRayMode() {
  playLaserTone();
  isXRayActive = !isXRayActive;
  
  const xrayBtn = document.getElementById('hud-xray-btn');
  const screenLayer = document.getElementById('studio-screen-layer');
  
  if (xrayBtn) xrayBtn.classList.toggle('active', isXRayActive);
  if (screenLayer) screenLayer.classList.toggle('xray-active', isXRayActive);
}

function setLightingMode(mode, btn) {
  playLightSwitchTone();
  currentLightingMode = mode || 'day';
  
  const screenLayer = document.getElementById('studio-screen-layer');
  if (screenLayer) {
    screenLayer.setAttribute('data-lighting', currentLightingMode);
  }
  
  document.querySelectorAll('.lighting-btn').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const match = document.querySelector(`.lighting-btn[data-light="${currentLightingMode}"]`);
    if (match) match.classList.add('active');
  }
  
  updateAmbilight();
}

const heroSceneVideos = {
  kitchen: { src: 'assets/videos/video01.mp4', key: 'scene_kitchen_title' },
  bedroom: { src: 'assets/videos/video03.mp4', key: 'scene_bedroom_title' },
  living: { src: 'assets/videos/video04.mp4', key: 'scene_living_title' },
  interior: { src: 'assets/videos/video10.mp4', key: 'scene_interior_title' }
};

function openHeroCinema() {
  playCinemaTone();
  const sceneData = heroSceneVideos[currentHeroScene] || heroSceneVideos['kitchen'];
  const title = (translations[currentLang] && translations[currentLang][sceneData.key]) 
    ? translations[currentLang][sceneData.key] 
    : '4K Ինտերակտիվ Ցուցասրահ';
  openVideoModal(sceneData.src, title);
}

function initTheme() {
  setTheme(currentTheme, false);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }

  // Listen to OS preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('architek_theme')) {
        setTheme(e.matches ? 'light' : 'dark', false);
      }
    });
  }
}

function setTheme(theme, save = true) {
  currentTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (save) {
    localStorage.setItem('architek_theme', currentTheme);
  }

  // Switch hero showcase image dynamically
  const showcaseImg = document.getElementById('device-slideshow-img');
  if (showcaseImg) {
    showcaseImg.src = currentTheme === 'light' 
      ? 'assets/images/hero_showcase_light_clean.png' 
      : 'assets/images/hero_showcase_dark_clean.png';
  }

  // If Three.js viewer is active, adapt scene background
  if (typeof scene !== 'undefined' && scene && typeof THREE !== 'undefined') {
    scene.background = new THREE.Color(currentTheme === 'light' ? 0xf8fafc : 0x0a0e17);
  }
}

function toggleTheme() {
  playThemeTone();
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme, true);
}

function switchHeroVideo(src, sceneKey, btn) {
  playHapticClick();
  const player = document.getElementById('hero-video-player');
  
  if (player) {
    player.style.opacity = '0.4';
    player.style.transform = 'scale(0.99)';
    player.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    setTimeout(() => {
      player.src = src;
      player.play().catch(() => {});
      player.style.opacity = '1';
      player.style.transform = 'scale(1)';
    }, 180);
  }
  
  currentHeroScene = sceneKey || 'kitchen';
  
  // Strictly remove .active from ALL scene tabs
  document.querySelectorAll('.studio-tab, .cyber-tab, .scene-tab-btn, .scene-pill').forEach(b => {
    b.classList.remove('active');
  });
  
  // Add .active strictly to the clicked button or the matching data-scene button
  if (btn) {
    btn.classList.add('active');
  } else {
    const matchingBtn = document.querySelector(`.studio-tab[data-scene="${currentHeroScene}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }
}

function initStudio3DTilt() {
  const container = document.getElementById('hero-studio-container');
  const card = document.getElementById('studio-viewport-card');
  const glare = document.getElementById('studio-glare');
  if (!container || !card) return;

  updateAmbilight();

  // Desktop Mouse Parallax & Dynamic Refraction
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotX = (y - 0.5) * -10;
    const rotY = (x - 0.5) * 10;

    card.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(8px)`;

    if (glare) {
      glare.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
      glare.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
    }
  });

  container.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
  });

  // Mobile Gyroscope Spatial Parallax (Apple Vision Pro Style Window Tilt)
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (window.innerWidth > 1024) return;
      if (e.gamma === null || e.beta === null) return;

      const gamma = Math.max(-30, Math.min(30, e.gamma));
      const beta = Math.max(10, Math.min(60, e.beta));

      const rotY = (gamma / 30) * 8;
      const rotX = ((beta - 35) / 25) * -8;

      card.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(6px)`;

      if (glare) {
        const gx = 50 + (gamma / 30) * 40;
        const gy = 50 + ((beta - 35) / 25) * 40;
        glare.style.setProperty('--glare-x', `${gx.toFixed(1)}%`);
        glare.style.setProperty('--glare-y', `${gy.toFixed(1)}%`);
      }
    }, { passive: true });
  }
}

let currentSlideIdx = 0;
let slideshowInterval = null;
const slideImages = [
  'assets/images/slideshow01-88e3d442.png',
  'assets/images/slideshow01-4267f885.png',
  'assets/images/slideshow01-166be171.png',
  'assets/images/slideshow01-63fcc3d5.png',
  'assets/images/slideshow01-78c76df0.png',
  'assets/images/slideshow01-bdabb82a.png',
  'assets/images/slideshow01-c3275cf2.png',
  'assets/images/slideshow01-e764791b.png',
  'assets/images/slideshow01-ea0f29d9.png',
  'assets/images/slideshow01-f4aaddcf.png',
  'assets/images/slideshow01-f9815e1b.png'
];

// Preload all slideshow images so replacement is instant without delay
const preloadedSlideImgs = slideImages.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

function initMultiDeviceSlideshow() {
  // High-fidelity rendered 3D showcase is preserved
}

function initHero3DRotation() {
  const container = document.getElementById('hero-device-container');
  const img = document.getElementById('device-slideshow-img');
  if (!container || !img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    img.style.transform = `scale(1.015) translateY(${-y * 6}px) translateX(${x * 6}px)`;
  });

  container.addEventListener('mouseleave', () => {
    img.style.transform = 'scale(1) translateY(0) translateX(0)';
  });
}

function initBeforeAfterSlider() {
  const container = document.getElementById('ba-slider');
  if (!container) return;

  const beforeImg = container.querySelector('.ba-image-before');
  const handle = container.querySelector('.ba-handle');
  let isDragging = false;

  function updateSlider(x) {
    const rect = container.getBoundingClientRect();
    let pos = (x - rect.left) / rect.width;
    pos = Math.max(0.02, Math.min(0.98, pos));
    const percentage = pos * 100;
    if (beforeImg) beforeImg.style.width = percentage + '%';
    if (handle) handle.style.left = percentage + '%';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateSlider(clientX);
  }

  function startDragging(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateSlider(clientX);
  }

  function stopDragging() {
    isDragging = false;
  }

  container.addEventListener('mousedown', startDragging);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', stopDragging);

  container.addEventListener('touchstart', startDragging, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', stopDragging);
}

let scene, camera, renderer, currentModel, materialMeshList = [];
let autoRotate = true, isWireframe = false;

function init3DViewer() {
  const canvasContainer = document.getElementById('three-canvas-container');
  if (!canvasContainer || typeof THREE === 'undefined') return;

  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(currentTheme === 'light' ? 0xf8fafc : 0x0a0e17);

  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
  camera.position.set(2.8, 1.8, 3.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvasContainer.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight1.position.set(5, 8, 4);
  dirLight1.castShadow = true;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 0.6);
  dirLight2.position.set(-5, 3, -3);
  scene.add(dirLight2);

  buildLuxuryKitchenModel();

  // Controls (orbit interaction)
  let isPointerDown = false;
  let prevX = 0, prevY = 0;

  canvasContainer.addEventListener('mousedown', (e) => {
    isPointerDown = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isPointerDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPointerDown || !currentModel) return;
    const deltaX = e.clientX - prevX;
    const deltaY = e.clientY - prevY;
    currentModel.rotation.y += deltaX * 0.008;
    currentModel.rotation.x += deltaY * 0.005;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  canvasContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPointerDown = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!canvasContainer || !renderer || !camera) return;
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate && currentModel && !isPointerDown) {
      currentModel.rotation.y += 0.004;
    }
    renderer.render(scene, camera);
  }
  animate();
}

function buildLuxuryKitchenModel() {
  currentModel = new THREE.Group();
  materialMeshList = [];

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x221a14,
    roughness: 0.35,
    metalness: 0.1
  });

  const islandGeo = new THREE.BoxGeometry(2.0, 0.9, 1.0);
  const islandMesh = new THREE.Mesh(islandGeo, baseMat);
  islandMesh.position.y = -0.25;
  islandMesh.castShadow = true;
  islandMesh.receiveShadow = true;
  currentModel.add(islandMesh);
  materialMeshList.push(islandMesh);

  // Marble Top
  const topGeo = new THREE.BoxGeometry(2.1, 0.08, 1.1);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f7,
    roughness: 0.15,
    metalness: 0.05
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.y = 0.24;
  topMesh.castShadow = true;
  currentModel.add(topMesh);

  // Modern Handles / LED Recess
  const ledGeo = new THREE.BoxGeometry(2.02, 0.03, 0.03);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.position.set(0, 0.17, 0.51);
  currentModel.add(ledMesh);

  // Upper Cabinets
  const upperGeo = new THREE.BoxGeometry(2.0, 0.6, 0.4);
  const upperMesh = new THREE.Mesh(upperGeo, baseMat.clone());
  upperMesh.position.set(0, 0.9, -0.3);
  upperMesh.castShadow = true;
  currentModel.add(upperMesh);
  materialMeshList.push(upperMesh);

  scene.add(currentModel);
}

const materialPresets = {
  walnut: {
    color: 0x3d2817,
    roughness: 0.35,
    metalness: 0.08
  },
  marble: {
    color: 0xf0f0f4,
    roughness: 0.15,
    metalness: 0.05
  },
  graphite: {
    color: 0x1e2229,
    roughness: 0.45,
    metalness: 0.25
  },
  gold: {
    color: 0xc5a059,
    roughness: 0.25,
    metalness: 0.85
  }
};

function changeConfigMaterial(type, btn) {
  const preset = materialPresets[type];
  if (!preset) return;

  materialMeshList.forEach(mesh => {
    mesh.material.color.setHex(preset.color);
    mesh.material.roughness = preset.roughness;
    mesh.material.metalness = preset.metalness;
    mesh.material.needsUpdate = true;
  });

  document.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function toggleAutoRotate() {
  autoRotate = !autoRotate;
  const btn = document.getElementById('rotate-btn');
  if (btn) btn.classList.toggle('active', autoRotate);
}

function reset3DCamera() {
  if (currentModel) {
    currentModel.rotation.set(0, 0, 0);
  }
}

function openVideoModal(videoSrc, title) {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('modal-video-player');
  const titleEl = document.getElementById('modal-video-title');
  if (!modal || !player) return;

  player.src = videoSrc;
  if (titleEl) titleEl.textContent = title || 'Architeksoft 4K Preview';
  modal.classList.add('active');
  player.play().catch(() => {});
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('modal-video-player');
  if (!modal || !player) return;

  player.pause();
  player.src = '';
  modal.classList.remove('active');
}

function openARModal() {
  playARLaunchTone();
  const modal = document.getElementById('ar-modal');
  if (modal) modal.classList.add('active');
}

function closeARModal() {
  const modal = document.getElementById('ar-modal');
  if (modal) modal.classList.remove('active');
}

function initNavbar() {
  const nav = document.getElementById('main-nav');
  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('nav-menu');
  const dropdownItem = document.querySelector('.nav-item-dropdown');
  const dropdownToggle = document.querySelector('.dropdown-toggle');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  if (dropdownToggle && dropdownItem) {
    dropdownToggle.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        dropdownItem.classList.toggle('open');
      }
    });
  }

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      menu.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link:not(.dropdown-toggle), .dropdown-item').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        menu.classList.remove('open');
        if (dropdownItem) dropdownItem.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) {
        toggle.classList.remove('active');
        menu.classList.remove('open');
        if (dropdownItem) dropdownItem.classList.remove('open');
      }
    });
  }

  const langBtn = document.getElementById('lang-btn');
  const langSelector = document.querySelector('.lang-selector');
  if (langBtn && langSelector) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langSelector.classList.toggle('open');
    });

    window.addEventListener('click', () => {
      langSelector.classList.remove('open');
    });
  }

  document.querySelectorAll('.lang-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lang = item.getAttribute('data-lang');
      setLanguage(lang);
      if (langSelector) langSelector.classList.remove('open');
    });
  });
}

function initContactForm() {
  const form = document.getElementById('project-form');
  const toast = document.getElementById('form-toast');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Ուղարկվում է...</span>';
    }

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = translations[currentLang].form_submit_btn;
      }
      form.reset();
      if (toast) {
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 6000);
      }
    }, 800);
  });
}

function initScrollReveal() {
  const elements = document.querySelectorAll(
    '.section-header, .device-card, .pillar-card, .glass-card, .stat-item, .contact-info-card, .contact-form-card, .ba-wrapper, .blueprint-feature'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -30px 0px'
    });

    elements.forEach(el => {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  } else {
    elements.forEach(el => el.classList.add('is-revealed'));
  }
}

function initWebPatternCanvas() {
  const canvas = document.getElementById('web-pattern-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, dpr;
  let particles = [];
  let mouse = { x: -1000, y: -1000, radius: 200 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    createParticles();
  }

  function createParticles() {
    particles = [];
    const count = Math.floor((width * height) / 18000);
    const numParticles = Math.max(32, Math.min(count, 70));

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: Math.random() * 0.9 + 1.4,
        pulse: Math.random() * Math.PI
      });
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    // Balanced, refined architectural web mesh
    const lineBaseAlpha = isLight ? 0.10 : 0.16;
    const nodeColor = isLight ? 'rgba(30, 41, 59, ' : 'rgba(0, 240, 255, ';
    const nodeAlpha = isLight ? '0.30)' : '0.52)';
    const cyanLine = isLight ? '148, 163, 184' : '0, 240, 255';
    const neutralLine = isLight ? '203, 213, 225' : '148, 163, 184';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Mouse proximity interaction
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distMouse = Math.sqrt(dx * dx + dy * dy);
      if (distMouse < mouse.radius) {
        const force = (1 - distMouse / mouse.radius) * 0.45;
        p.x -= (dx / distMouse) * force * 1.0;
        p.y -= (dy / distMouse) * force * 1.0;

        // Interactive connection line directly to mouse cursor
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        const mAlpha = (1 - distMouse / mouse.radius) * (isLight ? 0.20 : 0.28);
        ctx.strokeStyle = `rgba(${cyanLine}, ${mAlpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // Draw particle node
      const currentRadius = p.radius + Math.sin(p.pulse) * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor + nodeAlpha;
      ctx.fill();

      // Connect to neighboring particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        const maxDist = 140;

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * lineBaseAlpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${dist < 70 ? cyanLine : neutralLine}, ${alpha})`;
          ctx.lineWidth = dist < 70 ? 0.85 : 0.6;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  resize();
  render();
}

// Global Exports
window.setLanguage = setLanguage;
window.switchHeroVideo = switchHeroVideo;
window.openHeroCinema = openHeroCinema;
window.toggleXRayMode = toggleXRayMode;
window.setLightingMode = setLightingMode;
window.updateAmbilight = updateAmbilight;
window.toggleSound = toggleSound;
window.playHapticClick = playHapticClick;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.changeConfigMaterial = changeConfigMaterial;
window.toggleAutoRotate = toggleAutoRotate;
window.reset3DCamera = reset3DCamera;
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;
window.openARModal = openARModal;
window.closeARModal = closeARModal;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSound();
  initWebPatternCanvas();
  setLanguage(currentLang);
  initNavbar();
  initStudio3DTilt();
  initMultiDeviceSlideshow();
  initHero3DRotation();
  initBeforeAfterSlider();
  initContactForm();
  initScrollReveal();

  if (document.getElementById('three-canvas-container')) {
    setTimeout(init3DViewer, 200);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVideoModal();
      closeARModal();
    }
  });
});
