/**
 * Default static pages seeded on first run. Text is Romanian (the store targets
 * Romanian consumers) and uses {{tokens}} that the storefront replaces with the
 * company data configured in the admin (Settings → Storefront content → Company).
 *
 * IMPORTANT: these are solid starting templates aligned with OUG 34/2014,
 * GDPR (Reg. UE 2016/679), Legea 506/2004 and Ordinul ANPC 449/2022, but they
 * must be reviewed by a lawyer for your specific business before going live.
 */
export type DefaultPage = {
  handle: string
  title: string
  seo_description: string
  is_legal: boolean
  body: string
}

const COMPANY_BLOCK = `**{{company.legal_name}}** („{{company.trade_name}}”), CUI {{company.cui}}, nr. Registrul Comerțului {{company.reg_com}}, cu sediul în {{company.address}}, e-mail {{company.email}}, telefon {{company.phone}}.`

export const DEFAULT_PAGES: DefaultPage[] = [
  {
    handle: "termeni-si-conditii",
    title: "Termeni și condiții",
    seo_description: "Termenii și condițiile de utilizare a magazinului online și de vânzare a produselor.",
    is_legal: true,
    body: `## 1. Cine suntem

Site-ul {{site_url}} este operat de ${COMPANY_BLOCK}

## 2. Domeniu de aplicare

Acești termeni se aplică tuturor comenzilor plasate pe site de consumatori, în sensul OUG nr. 34/2014 privind drepturile consumatorilor. Prin plasarea unei comenzi confirmi că ai citit și accepți acești termeni.

## 3. Produse și prețuri

- Prețurile sunt exprimate în lei (RON) și includ TVA.
- Costul livrării este afișat separat, înainte de finalizarea comenzii.
- Fotografiile au caracter de prezentare; pot exista mici diferențe de nuanță față de produsul real, în funcție de ecran.
- Ne rezervăm dreptul de a corecta erori evidente de preț; în acest caz te contactăm înainte de expediere și poți anula comanda fără costuri.

## 4. Comanda și încheierea contractului

Contractul se consideră încheiat în momentul în care primești e-mailul de confirmare a comenzii. Putem refuza o comandă în cazuri justificate (stoc epuizat, date incomplete, suspiciune de fraudă), caz în care îți returnăm integral orice sumă plătită.

## 5. Plată

Poți plăti ramburs, la livrare, sau online cu cardul, dacă această opțiune este activă. Plățile online sunt procesate de procesatorul de plăți; nu stocăm datele cardului tău.

## 6. Livrare

Detaliile privind livrarea sunt descrise în pagina [Livrare](/pages/livrare).

## 7. Dreptul de retragere

Ai dreptul să te retragi din contract în termen de 14 zile calendaristice de la primirea produselor, fără a indica motivul. Oferim, comercial, un termen extins de {{shipping.returns_days}} de zile. Detalii și formularul de retragere în pagina [Retururi](/pages/retur).

## 8. Garanție și conformitate

Produsele beneficiază de garanția legală de conformitate conform Legii nr. 449/2003 și OUG nr. 140/2021. Pentru reclamații ne poți scrie la {{company.email}}.

## 9. Soluționarea litigiilor

Încercăm să rezolvăm amiabil orice nemulțumire. Poți apela și la procedura de Soluționare Alternativă a Litigiilor (SAL) – detalii în pagina [Informații ANPC](/pages/anpc).

## 10. Legea aplicabilă

Acești termeni sunt guvernați de legea română. Ultima actualizare: {{updated_at}}.
`,
  },
  {
    handle: "politica-de-confidentialitate",
    title: "Politica de confidențialitate",
    seo_description: "Cum colectăm, folosim și protejăm datele tale personale (GDPR).",
    is_legal: true,
    body: `## Operatorul de date

${COMPANY_BLOCK}

## Ce date prelucrăm

- **Date de identificare și contact**: nume, e-mail, telefon, adresă de livrare și facturare.
- **Date despre comenzi**: produse, valori, istoric, retururi.
- **Date de cont**: e-mail, parolă (stocată criptat), lista de favorite.
- **Date tehnice**: adresă IP, tip de dispozitiv și browser, cookie-uri (vezi [Politica de cookies](/pages/politica-cookies)).

## Scopuri și temeiuri legale

| Scop | Temei (art. 6 GDPR) |
| --- | --- |
| Procesarea și livrarea comenzilor | Executarea contractului – art. 6(1)(b) |
| Facturare și evidență contabilă | Obligație legală – art. 6(1)(c) |
| Gestionarea contului de client | Executarea contractului – art. 6(1)(b) |
| Statistici și publicitate personalizată (Google, Meta, TikTok) | Consimțământ – art. 6(1)(a) |
| Prevenirea fraudei și securitatea site-ului | Interes legitim – art. 6(1)(f) |

## Cui transmitem datele

- Firme de curierat (ex. Sameday Courier) – pentru livrare;
- Procesatori de plăți – pentru plățile online;
- Furnizori de găzduire, e-mail și infrastructură IT;
- Google, Meta, TikTok – doar dacă ți-ai exprimat consimțământul pentru cookie-urile de marketing/analiză;
- Autorități publice, când legea o cere.

Unii furnizori pot transfera date în afara SEE, pe baza clauzelor contractuale standard sau a deciziilor de adecvare ale Comisiei Europene.

## Cât timp păstrăm datele

Datele de comandă și facturare – 10 ani (Legea contabilității nr. 82/1991). Datele contului – până la ștergerea contului. Datele de marketing – până la retragerea consimțământului.

## Drepturile tale

Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate, opoziție și dreptul de a-ți retrage consimțământul oricând. Scrie-ne la {{company.email}}. Ai dreptul să depui plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal ([dataprotection.ro](https://www.dataprotection.ro)).

Ultima actualizare: {{updated_at}}.
`,
  },
  {
    handle: "politica-cookies",
    title: "Politica de cookies",
    seo_description: "Ce cookie-uri folosim și cum îți poți gestiona preferințele.",
    is_legal: true,
    body: `## Ce sunt cookie-urile

Cookie-urile sunt fișiere mici salvate de browser. Le folosim conform Legii nr. 506/2004 și GDPR. Cookie-urile care nu sunt strict necesare sunt activate **doar după ce îți dai acordul**, pe categorii.

## Categorii

| Categorie | Rol | Exemple |
| --- | --- | --- |
| Strict necesare | Coș de cumpărături, autentificare, securitate, memorarea preferințelor de cookie | \`_medusa_cart_id\`, \`_medusa_jwt\`, \`oh_consent\` |
| Preferințe | Memorează alegeri precum produsele vizualizate recent | \`oh_recent\` (local storage) |
| Analiză | Statistici anonime de utilizare | Google Analytics (\`_ga\`, \`_ga_*\`) |
| Marketing | Măsurarea campaniilor și publicitate relevantă | Meta Pixel (\`_fbp\`), TikTok Pixel (\`_ttp\`), Google Ads |

## Google Consent Mode

Folosim Google Consent Mode v2: până la acordul tău, etichetele Google funcționează fără a seta cookie-uri de analiză sau publicitate.

## Cum îți schimbi opțiunea

Poți modifica oricând preferințele din linkul **„Setări cookie”** din subsolul site-ului. Poți șterge cookie-urile și din setările browserului.

Ultima actualizare: {{updated_at}}.
`,
  },
  {
    handle: "livrare",
    title: "Livrare",
    seo_description: "Metode, costuri și termene de livrare: curier la adresă sau Sameday Easybox.",
    is_legal: false,
    body: `## Metode de livrare

- **Curier Sameday la adresă** – livrare în 1–2 zile lucrătoare în toată țara.
- **Sameday Easybox** – ridici coletul oricând dintr-un locker ales de tine la finalizarea comenzii.

## Costuri

Costul livrării este afișat în coș și la finalizarea comenzii. Livrarea este gratuită pentru comenzile de peste {{shipping.free_shipping_threshold}} lei (dacă promoția este activă).

## Urmărirea coletului

După expediere primești numărul AWB pe e-mail. Îl găsești și în contul tău, la comanda respectivă.

## Termen estimat

{{shipping.delivery_estimate}} de la confirmarea comenzii. În perioadele aglomerate (Black Friday, sărbători) termenul se poate prelungi.
`,
  },
  {
    handle: "retur",
    title: "Retururi și dreptul de retragere",
    seo_description: "Cum returnezi un produs: termen, condiții, rambursare și formular de retragere.",
    is_legal: true,
    body: `## Termen

Conform OUG nr. 34/2014 ai **14 zile calendaristice** de la primirea produsului pentru a te retrage din contract, fără a preciza motivul. Noi extindem acest termen la **{{shipping.returns_days}} de zile**.

## Cum returnezi

1. Trimite-ne o notificare la {{company.email}} (poți folosi formularul de mai jos) sau din contul tău.
2. Expediază produsele în maximum 14 zile de la notificare, la adresa pe care ți-o comunicăm.
3. Produsele trebuie să nu fie purtate, spălate sau deteriorate și să aibă etichetele atașate.

## Costuri

Costul direct al returnării este suportat de client, cu excepția cazului în care produsul este neconform sau am greșit comanda.

## Rambursare

Rambursăm toate sumele primite, inclusiv costul livrării inițiale standard, în cel mult 14 zile de la data la care ne-ai notificat retragerea. Putem amâna rambursarea până la primirea produselor sau a dovezii expedierii lor.

## Formular de retragere (Anexa 1 la OUG 34/2014)

> Către {{company.legal_name}}, {{company.address}}, {{company.email}}:
>
> Vă informez prin prezenta cu privire la retragerea mea din contractul de vânzare a următoarelor produse: ______ ,
> comandate la data ______ / primite la data ______ ,
> numele consumatorului ______ , adresa consumatorului ______ ,
> semnătura (doar pentru formularul pe hârtie), data ______ .
`,
  },
  {
    handle: "anpc",
    title: "Informații ANPC și soluționarea litigiilor",
    seo_description: "Informații privind protecția consumatorilor, ANPC și soluționarea alternativă a litigiilor (SAL).",
    is_legal: true,
    body: `## Autoritatea Națională pentru Protecția Consumatorilor

Pentru informații și reclamații te poți adresa ANPC: [anpc.ro](https://anpc.ro), telefon consumatori (TelVerde) 0800 080 999.

## Soluționarea Alternativă a Litigiilor (SAL)

Conform Ordonanței nr. 38/2015 și Ordinului ANPC nr. 449/2022, poți apela la procedura SAL pentru rezolvarea extrajudiciară a litigiilor cu comercianții: [anpc.ro/ce-este-sal](https://anpc.ro/ce-este-sal/).

## Platforma SOL a Comisiei Europene

Platforma europeană de soluționare online a litigiilor (SOL/ODR) a fost închisă la 20 iulie 2025, odată cu abrogarea Regulamentului (UE) nr. 524/2013 prin Regulamentul (UE) 2024/3228. Pentru litigii transfrontaliere poți contacta Centrul European al Consumatorilor România: [eccromania.ro](https://eccromania.ro).

## Datele comerciantului

${COMPANY_BLOCK}
`,
  },
  {
    handle: "despre-noi",
    title: "Despre noi",
    seo_description: "Povestea OutfitHub: haine gândite să fie purtate des.",
    is_legal: false,
    body: `OutfitHub a pornit de la o idee simplă: un dulap mai mic, cu piese mai bune.

Lucrăm cu materiale durabile, croieli relaxate și o paletă de culori care se combină ușor. Fiecare piesă este aleasă ca să fie purtată des, nu păstrată pentru „o ocazie”.

Ai întrebări? Scrie-ne la {{company.email}}.
`,
  },
  {
    handle: "contact",
    title: "Contact",
    seo_description: "Date de contact OutfitHub: e-mail, telefon și program.",
    is_legal: false,
    body: `- **E-mail:** {{company.email}}
- **Telefon:** {{company.phone}}
- **Program:** {{company.support_hours}}
- **Sediu:** {{company.address}}

${COMPANY_BLOCK}
`,
  },
]
