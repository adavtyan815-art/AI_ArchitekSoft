# KitchenPro — Product & Business Specification

*Purpose: the single product-context document for designing the KitchenPro web experience (B2B and B2C). It describes the complete intended product, not its current development status.*

## 1. What KitchenPro is

KitchenPro is a design-to-production platform for custom furniture — kitchens first, then wardrobes, bathroom, living-room and office storage. A furniture maker designs the customer's furniture once, in true 3D, from real manufacturer materials and hardware; KitchenPro turns that single design into everything the customer needs to decide (visuals, configuration options, a priced quotation) and everything the workshop needs to build (numbered drawings, cut lists, edge banding, drilling, cutting layouts, bill of materials, purchase lists), with the workshop's own production rules applied automatically.

One source of truth: what the customer sees, what the quote prices and what the shop cuts are the same model.

## 2. Who it is for

- **B2B — furniture makers, workshops, kitchen studios, independent designers.** Small and medium producers (1–30 people) that today design in generic 3D tools or by hand, price in spreadsheets, and re-draw production sheets manually. Initial market: Armenia and the wider region, with catalogs and suppliers verified for that market; the product itself is market-independent.
- **B2C — their customers.** Households and small businesses ordering a custom kitchen or storage furniture, who want to see exactly what they will get, choose real finishes, understand the price, and approve with confidence.
- **Suppliers / manufacturers (secondary).** Board, edge-band and hardware brands whose real products are represented in the catalog and specified by name in every order.

## 3. The business problem

For the maker: every project is re-entered several times (sales sketch → 3D visual → production drawings → cut list → purchasing → quote), each step by hand, each with errors. Changes late in the process are expensive; a customer changing one decor means re-doing drawings, quantities and prices. Production rules (how this shop builds a carcass, which edges get tape, which hardware goes where) live in people's heads.

For the customer: renders are approximations, prices arrive late and change, and the finished furniture rarely matches the picture exactly.

KitchenPro removes the re-entry: design once with real products, and quotation, customer approval and complete production documentation follow automatically from the same model, with the shop's standards built in.

## 4. Capabilities of the complete product

1. **3D design with real products.** Parametric cabinets (base, wall, tall, corner, open, appliance housings), doors, drawers, shelves, plinths, worktops, splashbacks, fillers, cornices, end panels and free custom parts, arranged in the customer's room. Sizes are exact to the millimetre; construction is real (carcass boards, backs, rails, fronts, hardware positions).
2. **Real material and hardware catalog.** Boards, decors, worktops and edge bands from real manufacturers (EGGER, Kronospan, Kastamonu, Swiss Krono, Cleaf, Alvic, …) with true colours and textures at physical scale, real codes, available thicknesses and sheet formats; hinges, runners, drawer systems, lifts, handles, legs, connectors and shelf supports from real makers (Blum, Hettich, Häfele, GTV, Samet, Boyard, Grass, Salice, …) with 3D models and technical data. Every product carries its verified local suppliers, availability and prices, and a fidelity class (verified / approximate) so nobody is misled by a photo.
3. **Customer-facing configuration.** Interactive viewer of the design: walk around, open doors and drawers, switch decors, fronts, handles, worktops, hardware grades and options; see the price react.
4. **Quotation.** Priced from the maker's own price lists: sheet materials by actual sheet consumption, edge band by metres, hardware by article, purchased drawer systems, labour and overhead rules; unpriced items are flagged, never guessed. Customer version (what they pay for) and internal version (cost breakdown, margin).
5. **Workshop production standard.** Each workshop defines once how it builds: carcass joint schemes per cabinet type, back-panel construction (thick, thin overlaid, grooved, none), edge-banding rules per part role and edge with tape articles and thickness, shelf statuses (fixed / adjustable / glass) with drilling and joinery patterns, hardware quantity rules (pins per shelf, hinges by door height, legs by cabinet width, clips per metre of plinth, brackets per wall cabinet…), saw kerf, sheet trim, cutting-layout options. Any cabinet can override the standard.
6. **Production documentation.** From the approved design: cover with schedule and specifications; elevations and plan with dimensions; one sheet per unique cabinet (front view, section, exploded numbered isometric, part table, hardware); drawer and door detail sheets; drilling sheets with hole coordinates; set-level parts sheet (fillers, cornice, plinth, end panels); cut list with per-edge banding, cut and finished sizes, process notes; hardware and materials bill with manufacturer, article, quantity, rule and supplier; materials & sourcing page; cutting layouts per sheet with kerf/trim/grain, waste and totals; production-rules page stating which rule level applied; assembly notes. Stable part numbers across revisions.
7. **Machine-ready data.** Cut lists, nesting and hole lists exportable for saws, CNC and edge banders; purchase lists per supplier.
8. **Project and order management.** Requests, versions, approvals, change history, status from enquiry to delivery, documents per version.
9. **Multi-workshop, multi-scenario.** Any furniture type built from the same parts logic; per-workshop standards, price lists, catalogs and supplier selections; showroom, remote (online) and dealer scenarios.

## 5. End-to-end workflow

### Stage 0 — Customer request
**Customer provides:** room measurements or a floor plan (or books a site survey), photos, appliance list and sizes, style references, must-haves, budget range, contact and delivery address. Optionally an existing quote from elsewhere.
**KitchenPro provides:** a structured request form and intake checklist; automatic project creation; room template from the measurements.
**Maker does:** qualifies the request, schedules survey if needed, assigns a designer.
**Customer can:** submit, edit and track the request; upload files; message the maker.

### Stage 1 — Site survey and room model
**Maker does:** measures the room (walls, windows, doors, utilities, ceiling height, out-of-square), records appliances.
**KitchenPro provides:** the room model with obstacles and utilities; validation of measurements; survey report the customer can confirm.
**Customer can:** review and confirm the room facts; correct appliance choices.

### Stage 2 — Design
**Maker does:** places cabinets and fittings, chooses construction (carcass, fronts, worktop), sets initial materials and hardware, resolves fillers, corners and appliance housings.
**KitchenPro provides:** parametric cabinets and set parts obeying the workshop standard; collision, ergonomic and manufacturability checks (sizes vs stock, appliance clearances, door swings); real product visuals; instant estimate as the design grows.
**Customer can:** nothing yet, or an early look-in if the maker shares a draft.

### Stage 3 — Customer configuration and approval
**Maker does:** publishes a design version with the options the customer may change and the price rules for each; answers questions; adjusts on request.
**KitchenPro provides:** the interactive 3D viewer with configurable options (decors, fronts, handles, worktops, hardware grades, optional modules), live price, comparison of variants, saved favourites, real product pages (manufacturer data, local supplier), approval and deposit flow, e-signature of the quotation and drawings summary.
**Customer can:** explore, change allowed options, compare, ask questions, request changes, approve a version, pay a deposit.

### Stage 4 — Production preparation
**Maker does:** reviews the approved version, sets or confirms the workshop standard and per-cabinet overrides (joint scheme, back type, shelf statuses, extra hardware), confirms sheet stock and suppliers, adds notes.
**KitchenPro provides:** the complete production documentation set, cut list, cutting layouts, BOM and purchase lists per supplier, drilling data, machine exports; consistency checks (unplaced parts, unpriced items, products without a verified supplier, missing generated parts).
**Customer can:** see status; nothing changes without a new version.

### Stage 5 — Purchasing, manufacturing, installation
**Maker does:** orders boards, tape and hardware from the purchase lists; cuts, edges, drills, assembles; installs.
**KitchenPro provides:** purchase lists with articles, quantities and supplier prices; production status per cabinet; installation sheets (elevation, plan, mounting heights); change orders re-generate only what changed with stable part numbers.
**Customer can:** track progress, schedule delivery and installation, receive the final documents.

### Stage 6 — Handover
**Customer receives:** the final 3D model and renders, the approved quotation and contract, the product passport (every material and hardware product used, with manufacturer codes and care instructions), warranty terms, installation summary, and a reorder/extension path.
**Maker keeps:** the full project archive (versions, documents, costs, margin, supplier orders) as the basis for repeat business and after-sales.

## 6. How the production concepts fit together

| Concept | Where it comes from | Where it goes |
|---|---|---|
| Real materials and finishes | Catalog (manufacturer data + local suppliers) chosen in design and by the customer | Visuals, quote lines, cut list material groups, materials & sourcing page, purchase list |
| Hardware | Catalog articles placed in the design or added by quantity rules of the standard | 3D model, BOM by category, quote, purchase list, drilling positions |
| Dimensions | Room survey and cabinet parameters; construction is real | Drawings, cut sizes, nesting, machine data |
| Production standard | Defined once per workshop, overridable per cabinet | Applied automatically: back panels, joint schemes, edge banding, shelves and drilling, hardware quantities, kerf and trim; documents state which rule applied |
| Parts | Every board of every cabinet and set-level part, numbered stably | Cabinet sheets, cut list, nesting, drilling, exploded views |
| Edge banding | Per-edge rules with tape article and thickness; tape deduction optional | Cut list edge columns, cutting layouts marks, tape metres in BOM and quote |
| Drilling | Shelf statuses and patterns of the standard | Drilling sheets with coordinates, hole data for CNC |
| BOM and cut list | Derived from the approved version | Purchasing, production, quote basis |
| Nesting | Workshop sheet stock, kerf, trim, grain | Cutting layouts, sheet counts and waste, quote sheet quantities |
| Quotation | Maker's price lists applied to the derived quantities | Customer approval; internal cost view |

## 7. Supporting different furniture, workshops and customers

- **Furniture types:** any storage furniture is a set of boxes, fronts, shelves, worktops and set-level parts; kitchens, wardrobes, bathroom, office and shop fittings use the same parts logic, production standard and documents.
- **Workshops:** each has its own standard, sheet stock, price lists, preferred brands and suppliers, document language and branding; several standards can coexist (economy / premium lines).
- **Customer scenarios:** showroom with a designer, fully remote online configuration, dealer or architect ordering on behalf of a client, repeat or extension orders from the archived model.
- **Markets:** catalogs are per market (suppliers, availability, prices, currencies, languages); manufacturer data is shared.

## 8. What a B2B user should be able to do

Manage their company profile, standards, price lists, catalogs and suppliers; create and manage projects and customers; design or import designs; publish configurable versions to customers; produce and sign quotations; generate, review and download production documentation and machine data; create purchase orders per supplier; track production and installation; manage users and roles (owner, designer, production, sales); see reports (margin, material usage, supplier spend, lead times).

## 9. What a B2C user should be able to see and do

Submit a request and upload room information; follow project status; open their design in 3D on any device; change the options the maker allows and see the price change; compare variants and save favourites; read real product information (manufacturer, decor, supplier); ask questions and request changes; approve a version and pay a deposit; receive and keep the final documents and product passport; reorder or extend later.

## 10. What the future web experience should expose

- **Public:** product story, gallery of real projects with real product names, catalog browsing (decors, hardware, suppliers), request form, workshop directory (for the platform model).
- **Customer portal:** project dashboard, 3D viewer with configuration and price, variant comparison, approvals and payments, messages, documents, delivery and installation scheduling, product passport, after-sales.
- **Business portal:** company setup (standards, stock, prices, catalogs, suppliers, branding), project pipeline, design handoff (upload / open from the design tool), version publishing with allowed options, quotation editor, production documentation generation and downloads, purchase orders, production board, reports, team management.
- **Integrations:** catalog and supplier data feeds, payment provider, messaging, machine exports, accounting.
