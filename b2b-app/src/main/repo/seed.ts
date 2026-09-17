import { getDb, normalize, normalizeText } from "../db";

const BRANDS = [
  "SKF",
  "FAG",
  "NSK",
  "NTN",
  "KOYO",
  "TIMKEN",
  "ZKL",
  "URB",
  "NACHI",
  "INA",
  "KG",
  "ORS",
];
const SEALS: [string, string][] = [
  ["", "Açık"],
  ["ZZ", "Metal Kapaklı"],
  ["2RS", "Kauçuk Keçeli"],
  ["2RS1", "Kauçuk Keçeli"],
];

// series -> [prefix, list of (bore code, d, D, B)]
const BALL_SERIES: Record<string, [number, number, number][]> = {
  "60": [
    [10, 26, 8],
    [12, 28, 8],
    [15, 32, 9],
    [17, 35, 10],
    [20, 42, 12],
    [25, 47, 12],
    [30, 55, 13],
    [35, 62, 14],
    [40, 68, 15],
    [45, 75, 16],
    [50, 80, 16],
    [55, 90, 18],
    [60, 95, 18],
    [70, 110, 20],
    [80, 125, 22],
  ],
  "62": [
    [10, 30, 9],
    [12, 32, 10],
    [15, 35, 11],
    [17, 40, 12],
    [20, 47, 14],
    [25, 52, 15],
    [30, 62, 16],
    [35, 72, 17],
    [40, 80, 18],
    [45, 85, 19],
    [50, 90, 20],
    [55, 100, 21],
    [60, 110, 22],
    [70, 125, 24],
    [80, 140, 26],
  ],
  "63": [
    [10, 35, 11],
    [12, 37, 12],
    [15, 42, 13],
    [17, 47, 14],
    [20, 52, 15],
    [25, 62, 17],
    [30, 72, 19],
    [35, 80, 21],
    [40, 90, 23],
    [45, 100, 25],
    [50, 110, 27],
    [55, 120, 29],
    [60, 130, 31],
    [70, 150, 35],
    [80, 170, 39],
  ],
  "16": [
    [10, 28, 7],
    [12, 30, 7],
    [15, 35, 8],
    [17, 40, 10],
    [20, 42, 8],
    [25, 47, 8],
    [30, 55, 9],
    [35, 62, 9],
    [40, 68, 9],
    [50, 80, 10],
  ],
  "68": [
    [10, 19, 5],
    [12, 21, 5],
    [15, 24, 5],
    [17, 26, 5],
    [20, 32, 7],
    [25, 37, 7],
    [30, 42, 7],
    [35, 47, 7],
    [40, 52, 7],
    [50, 65, 7],
  ],
  "69": [
    [10, 22, 6],
    [12, 24, 6],
    [15, 28, 7],
    [17, 30, 7],
    [20, 37, 9],
    [25, 42, 9],
    [30, 47, 9],
    [35, 55, 10],
    [40, 62, 12],
    [50, 72, 12],
  ],
};
// angular contact (72/73) and self-aligning (12/22) share the same bore codes; only open/ C3 variants exist
const OTHER_BALL: Record<string, [string, string, [number, number, number][]]> =
  {
    "72": [
      "Eğik Bilyalı",
      "Eğik Bilyalı Rulman",
      [
        [10, 30, 9],
        [12, 32, 10],
        [15, 35, 11],
        [17, 40, 12],
        [20, 47, 14],
        [25, 52, 15],
        [30, 62, 16],
        [35, 72, 17],
        [40, 80, 18],
        [45, 85, 19],
        [50, 90, 20],
        [55, 100, 21],
        [60, 110, 22],
      ],
    ],
    "73": [
      "Eğik Bilyalı",
      "Eğik Bilyalı Rulman",
      [
        [10, 35, 11],
        [12, 37, 12],
        [15, 42, 13],
        [17, 47, 14],
        [20, 52, 15],
        [25, 62, 17],
        [30, 72, 19],
        [35, 80, 21],
        [40, 90, 23],
        [45, 100, 25],
        [50, 110, 27],
      ],
    ],
    "12": [
      "Oynak Bilyalı",
      "Oynak Bilyalı Rulman",
      [
        [10, 30, 9],
        [12, 32, 10],
        [15, 35, 11],
        [17, 40, 12],
        [20, 47, 14],
        [25, 52, 15],
        [30, 62, 16],
        [35, 72, 17],
        [40, 80, 18],
        [45, 85, 19],
        [50, 90, 20],
      ],
    ],
    "22": [
      "Oynak Bilyalı",
      "Oynak Bilyalı Rulman",
      [
        [10, 30, 14],
        [12, 32, 14],
        [15, 35, 14],
        [17, 40, 16],
        [20, 47, 18],
        [25, 52, 18],
        [30, 62, 20],
        [35, 72, 23],
        [40, 80, 23],
        [45, 85, 23],
        [50, 90, 23],
      ],
    ],
  };
const CLEARANCES = ["", "C3"];
const BORE_CODE = (d: number): string =>
  d < 20
    ? { 10: "00", 12: "01", 15: "02", 17: "03" }[d]!
    : String(d / 5).padStart(2, "0");

const TAPERED: [string, number, number, number][] = [
  ["30204", 20, 47, 15.25],
  ["30205", 25, 52, 16.25],
  ["30206", 30, 62, 17.25],
  ["30207", 35, 72, 18.25],
  ["30208", 40, 80, 19.75],
  ["30209", 45, 85, 20.75],
  ["30210", 50, 90, 21.75],
  ["30211", 55, 100, 22.75],
  ["30212", 60, 110, 23.75],
  ["30213", 65, 120, 24.75],
  ["32204", 20, 47, 19.25],
  ["32205", 25, 52, 19.25],
  ["32206", 30, 62, 21.25],
  ["32207", 35, 72, 24.25],
  ["32208", 40, 80, 24.75],
  ["32209", 45, 85, 24.75],
  ["32210", 50, 90, 24.75],
  ["32211", 55, 100, 26.75],
  ["32212", 60, 110, 29.75],
  ["32213", 65, 120, 32.75],
  ["33205", 25, 52, 22],
  ["33206", 30, 62, 25],
  ["33207", 35, 72, 28],
  ["33208", 40, 80, 32],
  ["33209", 45, 85, 32],
  ["33210", 50, 90, 32],
];
const SPHERICAL: [string, number, number, number][] = [
  ["22205", 25, 52, 18],
  ["22206", 30, 62, 20],
  ["22207", 35, 72, 23],
  ["22208", 40, 80, 23],
  ["22209", 45, 85, 23],
  ["22210", 50, 90, 23],
  ["22211", 55, 100, 25],
  ["22212", 60, 110, 28],
  ["22213", 65, 120, 31],
  ["22214", 70, 125, 31],
  ["22215", 75, 130, 31],
  ["22216", 80, 140, 33],
  ["22308", 40, 90, 33],
  ["22309", 45, 100, 36],
  ["22310", 50, 110, 40],
  ["22311", 55, 120, 43],
  ["22312", 60, 130, 46],
  ["22313", 65, 140, 48],
];
const CYL: [string, number, number, number][] = [
  ["NU204", 20, 47, 14],
  ["NU205", 25, 52, 15],
  ["NU206", 30, 62, 16],
  ["NU207", 35, 72, 17],
  ["NU208", 40, 80, 18],
  ["NU209", 45, 85, 19],
  ["NU210", 50, 90, 20],
  ["NU211", 55, 100, 21],
  ["NU212", 60, 110, 22],
  ["NJ205", 25, 52, 15],
  ["NJ206", 30, 62, 16],
  ["NJ207", 35, 72, 17],
  ["NJ208", 40, 80, 18],
  ["NJ209", 45, 85, 19],
  ["NJ210", 50, 90, 20],
  ["NUP205", 25, 52, 15],
  ["NUP206", 30, 62, 16],
  ["NUP207", 35, 72, 17],
  ["N205", 25, 52, 15],
  ["N206", 30, 62, 16],
  ["N207", 35, 72, 17],
  ["N208", 40, 80, 18],
  ["NU2205", 25, 52, 18],
  ["NU2206", 30, 62, 20],
  ["NU2207", 35, 72, 23],
];
const THRUST: [string, number, number, number][] = [
  ["51100", 10, 24, 9],
  ["51101", 12, 26, 9],
  ["51102", 15, 28, 9],
  ["51103", 17, 30, 9],
  ["51104", 20, 35, 10],
  ["51105", 25, 42, 11],
  ["51106", 30, 47, 11],
  ["51107", 35, 52, 12],
  ["51108", 40, 60, 13],
  ["51109", 45, 65, 14],
  ["51110", 50, 70, 14],
  ["51111", 55, 78, 16],
  ["51204", 20, 40, 14],
  ["51205", 25, 47, 15],
  ["51206", 30, 52, 16],
  ["51207", 35, 62, 18],
  ["51208", 40, 68, 19],
  ["51209", 45, 73, 20],
  ["51210", 50, 78, 22],
];
const INSERT: [string, number, number, number][] = [
  ["UC201", 12, 47, 31],
  ["UC202", 15, 47, 31],
  ["UC203", 17, 47, 31],
  ["UC204", 20, 47, 31],
  ["UC205", 25, 52, 34.1],
  ["UC206", 30, 62, 38.1],
  ["UC207", 35, 72, 42.9],
  ["UC208", 40, 80, 49.2],
  ["UC209", 45, 85, 49.2],
  ["UC210", 50, 90, 51.6],
  ["UC211", 55, 100, 55.6],
  ["UC212", 60, 110, 65.1],
  ["UC213", 65, 120, 65.1],
  ["UC214", 70, 125, 74.6],
  ["UC215", 75, 130, 77.8],
  ["UC216", 80, 140, 82.6],
  ["UC217", 85, 150, 85.7],
  ["UC218", 90, 160, 96],
];
const HOUSINGS: [string, string][] = [
  ["P204", "Yatak Ayaklı P204"],
  ["P205", "Yatak Ayaklı P205"],
  ["P206", "Yatak Ayaklı P206"],
  ["P207", "Yatak Ayaklı P207"],
  ["P208", "Yatak Ayaklı P208"],
  ["P209", "Yatak Ayaklı P209"],
  ["P210", "Yatak Ayaklı P210"],
  ["P211", "Yatak Ayaklı P211"],
  ["P212", "Yatak Ayaklı P212"],
  ["F204", "Flanşlı Yatak F204"],
  ["F205", "Flanşlı Yatak F205"],
  ["F206", "Flanşlı Yatak F206"],
  ["F207", "Flanşlı Yatak F207"],
  ["F208", "Flanşlı Yatak F208"],
  ["FL204", "Oval Flanşlı FL204"],
  ["FL205", "Oval Flanşlı FL205"],
  ["FL206", "Oval Flanşlı FL206"],
  ["FL207", "Oval Flanşlı FL207"],
  ["T204", "Gergi Yatak T204"],
  ["T205", "Gergi Yatak T205"],
  ["T206", "Gergi Yatak T206"],
  ["T207", "Gergi Yatak T207"],
  ["T208", "Gergi Yatak T208"],
];
const NEEDLE: [string, number, number, number][] = [
  ["HK0808", 8, 12, 8],
  ["HK1010", 10, 14, 10],
  ["HK1210", 12, 16, 10],
  ["HK1212", 12, 16, 12],
  ["HK1512", 15, 21, 12],
  ["HK1612", 16, 22, 12],
  ["HK2012", 20, 26, 12],
  ["HK2016", 20, 26, 16],
  ["HK2516", 25, 32, 16],
  ["HK3016", 30, 37, 16],
  ["HK3020", 30, 37, 20],
  ["HK3520", 35, 42, 20],
  ["HK4020", 40, 47, 20],
  ["NA4900", 10, 22, 13],
  ["NA4901", 12, 24, 13],
  ["NA4902", 15, 28, 13],
  ["NA4903", 17, 30, 13],
  ["NA4904", 20, 37, 17],
  ["NA4905", 25, 42, 17],
  ["NA4906", 30, 47, 17],
  ["NA4907", 35, 55, 20],
  ["NA4908", 40, 62, 22],
  ["NA4909", 45, 68, 22],
  ["NA4910", 50, 72, 22],
];
const SEAL_SIZES: [number, number, number][] = [
  [20, 30, 7],
  [20, 35, 7],
  [25, 35, 7],
  [25, 40, 7],
  [25, 47, 7],
  [30, 42, 7],
  [30, 47, 7],
  [30, 52, 7],
  [35, 47, 7],
  [35, 52, 7],
  [35, 55, 8],
  [40, 52, 7],
  [40, 55, 8],
  [40, 62, 8],
  [45, 60, 8],
  [45, 62, 8],
  [45, 65, 10],
  [50, 65, 8],
  [50, 68, 8],
  [50, 72, 8],
  [55, 72, 8],
  [55, 80, 8],
  [60, 80, 8],
  [60, 85, 8],
  [65, 85, 10],
  [65, 90, 10],
  [70, 90, 10],
  [70, 100, 10],
  [75, 100, 10],
  [80, 100, 10],
];

interface Row {
  sku: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  seal: string;
  d_inner: number | null;
  d_outer: number | null;
  width: number | null;
  equivalents: string;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoCatalog(target: number): Row[] {
  const rows: Row[] = [];
  const brandsFor = (n: number): string[] => BRANDS.slice(0, n);

  for (const [series, list] of Object.entries(BALL_SERIES)) {
    for (const [d, D, B] of list) {
      const base = `${series}${BORE_CODE(d)}`;
      for (const [suffix, sealName] of SEALS) {
        for (const clearance of CLEARANCES) {
          for (const brand of brandsFor(8)) {
            const sku = `${suffix ? `${base}-${suffix}` : base}${clearance ? ` ${clearance}` : ""}`;
            rows.push({
              sku: `${sku} ${brand}`,
              name: `${sku} ${sealName} Sabit Bilyalı Rulman ${d}x${D}x${B}${clearance ? " (C3 boşluklu)" : ""}`,
              brand,
              category: "Sabit Bilyalı Rulmanlar",
              type: "Sabit Bilyalı",
              seal: suffix || "Açık",
              d_inner: d,
              d_outer: D,
              width: B,
              equivalents:
                suffix === "2RS"
                  ? `${base}-2RS1, ${base} DDU, ${base} LLU`
                  : suffix === "ZZ"
                    ? `${base}-2Z, ${base} Z`
                    : "",
            });
          }
        }
      }
    }
  }
  for (const [series, [type, label, list]] of Object.entries(OTHER_BALL)) {
    for (const [d, D, B] of list)
      for (const clearance of CLEARANCES)
        for (const brand of brandsFor(6)) {
          const sku = `${series}${BORE_CODE(d)}${series.startsWith("7") ? "-B-TVP" : ""}${clearance ? ` ${clearance}` : ""}`;
          rows.push({
            sku: `${sku} ${brand}`,
            name: `${sku} ${label} ${d}x${D}x${B}`,
            brand,
            category: `${type} Rulmanlar`,
            type,
            seal: "",
            d_inner: d,
            d_outer: D,
            width: B,
            equivalents: "",
          });
        }
  }
  const push = (
    list: [string, number, number, number][],
    cat: string,
    type: string,
    names: string,
    n: number,
  ): void => {
    for (const [code, d, D, B] of list)
      for (const brand of brandsFor(n))
        rows.push({
          sku: `${code} ${brand}`,
          name: `${code} ${names} ${d}x${D}x${B}`,
          brand,
          category: cat,
          type,
          seal: "",
          d_inner: d,
          d_outer: D,
          width: B,
          equivalents: "",
        });
  };
  push(
    TAPERED,
    "Konik Makaralı Rulmanlar",
    "Konik Makaralı",
    "Konik Makaralı Rulman",
    6,
  );
  push(
    SPHERICAL,
    "Oynak Makaralı Rulmanlar",
    "Oynak Makaralı",
    "Oynak Makaralı Rulman",
    5,
  );
  push(
    CYL,
    "Silindirik Makaralı Rulmanlar",
    "Silindirik Makaralı",
    "Silindirik Makaralı Rulman",
    5,
  );
  push(
    THRUST,
    "Eksenel Bilyalı Rulmanlar",
    "Eksenel Bilyalı",
    "Eksenel Bilyalı Rulman",
    4,
  );
  push(INSERT, "Yatak Rulmanları", "Yatak Rulmanı (UC)", "Yatak Rulmanı", 5);
  push(NEEDLE, "İğneli Rulmanlar", "İğneli", "İğneli Rulman", 4);
  for (const [code, name] of HOUSINGS)
    for (const brand of ["KG", "ORS", "ASAHI", "FYH", "NTN"])
      rows.push({
        sku: `${code} ${brand}`,
        name: `${name} ${brand}`,
        brand,
        category: "Rulman Yatakları",
        type: "Yatak",
        seal: "",
        d_inner: null,
        d_outer: null,
        width: null,
        equivalents: "",
      });
  for (const [d, D, B] of SEAL_SIZES)
    for (const brand of ["KOR", "CFW", "NAK", "SOG"])
      for (const t of ["TC", "SC", "TB"])
        rows.push({
          sku: `${t} ${d}x${D}x${B} ${brand}`,
          name: `Yağ Keçesi ${t} ${d}x${D}x${B}`,
          brand,
          category: "Keçeler",
          type: "Yağ Keçesi",
          seal: t,
          d_inner: d,
          d_outer: D,
          width: B,
          equivalents: "",
        });

  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const k = normalize(r.sku);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (unique.length >= target) return unique.slice(0, target);
  // pad with extra brand variants to reach the requested size
  const extra: Row[] = [];
  const extraBrands = [
    "CRAFT",
    "KBS",
    "EZO",
    "FBJ",
    "PFI",
    "KYK",
    "MTK",
    "ZVL",
  ];
  outer: for (const brand of extraBrands) {
    for (const r of unique) {
      if (r.category === "Rulman Yatakları" || r.category === "Keçeler")
        continue;
      const sku = r.sku.replace(/ [A-Z]+$/, ` ${brand}`);
      const k = normalize(sku);
      if (seen.has(k)) continue;
      seen.add(k);
      extra.push({ ...r, sku, brand });
      if (unique.length + extra.length >= target) break outer;
    }
  }
  return [...unique, ...extra];
}

export function seedDemo(target: number): number {
  const db = getDb();
  const rand = mulberry32(42);
  const rows = generateDemoCatalog(target);
  const ins = db.prepare(
    `INSERT OR IGNORE INTO products(sku, sku_norm, name, name_norm, brand, category, type, seal, d_inner, d_outer, width, stock, unit,
     price, currency, list_price, card_price, min_order, shelf, barcode, image, description, equivalents, active)
     VALUES (@sku,@sku_norm,@name,@name_norm,@brand,@category,@type,@seal,@d_inner,@d_outer,@width,@stock,'Adet',@price,'TRY',
     @list_price,@card_price,@min_order,@shelf,'','','',@equivalents,1)`,
  );
  const tx = db.transaction(() => {
    let n = 0;
    for (const r of rows) {
      const size = (r.d_outer ?? 60) * (r.width ?? 12);
      const premium = ["SKF", "FAG", "TIMKEN", "NSK", "INA"].includes(r.brand)
        ? 2.2
        : 1;
      const price =
        Math.round(size * 0.12 * premium * (0.8 + rand() * 0.6) * 100) / 100 +
        15;
      const stockRoll = rand();
      const stock =
        stockRoll < 0.15
          ? 0
          : stockRoll < 0.3
            ? Math.floor(rand() * 5) + 1
            : Math.floor(rand() * 400) + 5;
      const res = ins.run({
        ...r,
        sku_norm: normalize(r.sku),
        name_norm: normalizeText(r.name),
        stock,
        price,
        list_price: Math.round(price * 1.35 * 100) / 100,
        card_price: Math.round(price * 1.08 * 100) / 100,
        min_order: 1,
        shelf: `${String.fromCharCode(65 + Math.floor(rand() * 8))}-${Math.floor(rand() * 40) + 1}`,
      });
      n += res.changes;
    }
    return n;
  });
  const n = tx();
  db.exec("INSERT INTO products_fts(products_fts) VALUES('optimize')");
  if (
    (db.prepare("SELECT COUNT(*) c FROM customers").get() as { c: number })
      .c === 0
  ) {
    const cIns = db.prepare(
      `INSERT INTO customers(code, name, contact, phone, city, discount_pct, currency) VALUES (?,?,?,?,?,?,?)`,
    );
    cIns.run(
      "B0001",
      "Demir Makina San. Tic. Ltd. Şti.",
      "Ahmet Demir",
      "0532 000 00 01",
      "İstanbul",
      10,
      "TRY",
    );
    cIns.run(
      "B0002",
      "Anadolu Hırdavat",
      "Mehmet Kaya",
      "0533 000 00 02",
      "Ankara",
      5,
      "TRY",
    );
    cIns.run(
      "B0003",
      "Ege Endüstri Malzemeleri",
      "Ayşe Yılmaz",
      "0534 000 00 03",
      "İzmir",
      15,
      "TRY",
    );
  }
  return n;
}
