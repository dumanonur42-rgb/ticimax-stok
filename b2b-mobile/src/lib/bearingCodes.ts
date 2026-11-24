// Offline dictionary that explains bearing designations (type, bore, suffix codes) and lists
// how other manufacturers write the same feature. No network, no AI: only fixed, well-known codes.

export type BearingFamily =
  | 'dgbb' | 'sabb' | 'acbb' | 'dacbb' | 'crb' | 'srb' | 'trb' | 'thrust' | 'needle'
  | 'plain' | 'rod' | 'linear' | 'insert' | 'clutch' | 'sleeve' | 'nut' | 'other'

export interface CodeEquivalent { brand: string; code: string }
export interface CodeNote { code: string; title: string; detail: string; equivalents: CodeEquivalent[]; sameEverywhere: boolean }
export interface CodeExplanation { base: string; type: string; typeDetail: string; size: string; notes: CodeNote[] }

interface Concept { title: string; detail?: string; eq?: string; same?: boolean }
interface Rule { codes: string; concept: string; families?: BearingFamily[]; brands?: string[] }

const ROLLING: BearingFamily[] = ['dgbb', 'sabb', 'acbb', 'dacbb', 'crb', 'srb', 'trb', 'thrust', 'needle']
const BALL: BearingFamily[] = ['dgbb', 'sabb', 'acbb', 'dacbb']

// eq format: "MARKA=KOD; MARKA=KOD"
const CONCEPTS: Record<string, Concept> = {
  seal2: {
    title: 'İki tarafı lastik kapaklı (temaslı keçe)',
    detail: 'Toza ve suya karşı en iyi koruma. Fabrikada greslenmiştir, yeniden yağlanmaz. Sürtünmesi metal kapaklıdan biraz fazladır.',
    eq: 'SKF=2RS1 / 2RSH; FAG=2RSR / 2HRS; NSK=DDU; NTN=LLU; KOYO=2RS; NACHI=2NSE; SNR=EE; ZKL=2RS'
  },
  seal1: {
    title: 'Tek tarafı lastik kapaklı (temaslı keçe)',
    detail: 'Bir yüzü keçeli, diğer yüzü açıktır.',
    eq: 'SKF=RS1 / RSH; FAG=RSR / HRS; NSK=DU; NTN=LU; KOYO=RS; NACHI=NSE; SNR=E; ZKL=RS'
  },
  shield2: {
    title: 'İki tarafı metal (sac) kapaklı',
    detail: 'Kapak bileziğe sürtmez: sürtünme düşük, yüksek devire uygun. Toza karşı korur, suya karşı sızdırmaz değildir. Fabrikada greslenmiştir.',
    eq: 'SKF=2Z; FAG=2Z / 2ZR; NSK=ZZ; NTN=ZZ; KOYO=ZZ; NACHI=ZZE; SNR=ZZ; ZKL=2Z'
  },
  shield1: {
    title: 'Tek tarafı metal (sac) kapaklı',
    detail: 'Bir yüzü sac kapaklı, diğer yüzü açıktır.',
    eq: 'SKF=Z; FAG=Z / ZR; NSK=Z; NTN=Z; KOYO=Z; NACHI=ZE; SNR=Z; ZKL=Z'
  },
  noncontact2: {
    title: 'İki tarafı lastik kapaklı (temassız keçe)',
    detail: 'Lastik kapak bileziğe sürtmez: metal kapak kadar düşük sürtünme, ondan daha iyi toz koruması.',
    eq: 'SKF=2RZ; FAG=2BRS; NSK=VV; NTN=LLB; KOYO=2RU; NACHI=2NKE'
  },
  sealedBoth: { title: 'İki tarafı keçeli', detail: 'Greslidir; toza ve kire karşı korumalıdır.' },
  sealedOne: { title: 'Tek tarafı keçeli' },
  sealedLs: { title: 'İki tarafı temaslı keçeli', eq: 'SKF=2LS; INA=PP' },
  sealedPp: { title: 'İki tarafı keçeli', detail: 'INA yazımıdır.', eq: 'INA=PP; IKO=UU; SKF=2LS / 2RS' },
  sealedUu: { title: 'İki tarafı keçeli', eq: 'IKO=UU; INA=PP' },
  linearUu: { title: 'İki ucu keçeli', detail: 'Lineer rulmanın iki ucunda toz keçesi vardır.', eq: 'INA=PP; SKF=2LS' },
  linearOp: { title: 'Açık tip (OP)', detail: 'Gövdesi boydan yarıktır; alttan destekli millerde kullanılır.' },
  linearAj: { title: 'Ayarlanabilir tip (AJ)', detail: 'Gövdesi ince yarıktır; yuva sıkılarak boşluk ayarlanır.' },
  linearL: { title: 'Uzun tip (çift boy)' },
  clutchPp: { title: 'İç ve dış bilezikte kama kanalı' },
  clutchP: { title: 'İç bilezikte kama kanalı' },
  flinger2: { title: 'İki tarafı keçeli ve savurma saclı', detail: 'Keçenin önünde çamur ve tozu savuran sac disk vardır (SKF yatak rulmanı).' },
  flingerRubber2: { title: 'İki tarafı keçeli ve lastik kaplı savurma saclı', detail: 'Çok kirli ortamlar için (SKF yatak rulmanı).' },
  inaNpp: { title: 'İki tarafı dudaklı keçeli (INA)' },
  inaNppu: { title: 'İki tarafı dudaklı keçeli, dış yüzeyi bombeli (INA)' },
  inaNppb: { title: 'İki tarafı dudaklı keçeli, dış bileziği küresel (INA)' },
  inaKrr: { title: 'İki tarafı R tipi keçeli (INA)' },
  inaKrrb: { title: 'İki tarafı R tipi keçeli, dış bileziği küresel (INA)' },

  c1: { title: 'İç boşluk C1: C2\'den küçük', same: true },
  c2: { title: 'İç boşluk C2: normalden küçük', detail: 'Sessiz ve hassas çalışması istenen yerlerde kullanılır.', same: true },
  cn: { title: 'İç boşluk normal (CN)', detail: 'Kodda boşluk yazmıyorsa rulman zaten normal boşlukludur.', same: true },
  c3: { title: 'İç boşluk C3: normalden büyük', detail: 'Isınan, yüksek devirli veya sıkı geçmeli yataklar için (örneğin elektrik motoru). Kodda boşluk yazmıyorsa rulman normal boşlukludur.', same: true },
  c4: { title: 'İç boşluk C4: C3\'ten büyük', detail: 'Yüksek sıcaklık farkı olan yataklar için.', same: true },
  c5: { title: 'İç boşluk C5: C4\'ten büyük', same: true },
  cm: { title: 'Elektrik motoru boşluğu (CM)', detail: 'Normal boşluğun dar toleranslı hâlidir; sessiz çalışma için. Japon markalarında kullanılır.', eq: 'NSK=CM; NTN=CM; KOYO=CM; NACHI=CM' },

  p6: { title: 'Hassasiyet sınıfı P6: normalden hassas', eq: 'ABEC=3' },
  p6x: { title: 'Hassasiyet sınıfı P6X', detail: 'Konik makaralı rulmanlarda dar genişlik toleransı.' },
  p5: { title: 'Hassasiyet sınıfı P5: P6\'dan hassas', eq: 'ABEC=5' },
  p4: { title: 'Hassasiyet sınıfı P4: P5\'ten hassas', detail: 'Takım tezgâhı iş mili gibi hassas yataklar için.', eq: 'ABEC=7' },
  p4s: { title: 'Hassasiyet sınıfı P4S', detail: 'İş mili rulmanı: ölçüler P4, dönme hassasiyeti P2 düzeyinde.', eq: 'FAG=P4S; SKF=P4A; NSK=P3' },
  p2: { title: 'Hassasiyet sınıfı P2: en hassas sınıf', eq: 'ABEC=9' },
  sp: { title: 'Hassasiyet sınıfı SP', detail: 'Takım tezgâhı rulmanları için özel hassasiyet (yaklaşık P5 ölçü, P4 dönme hassasiyeti).' },
  up: { title: 'Hassasiyet sınıfı UP', detail: 'Takım tezgâhı rulmanları için ultra hassasiyet (SP\'den hassas).' },
  p63: { title: 'Hassasiyet P6 ve iç boşluk C3' },
  p62: { title: 'Hassasiyet P6 ve iç boşluk C2' },
  p64: { title: 'Hassasiyet P6 ve iç boşluk C4' },
  p53: { title: 'Hassasiyet P5 ve iç boşluk C3' },
  p52: { title: 'Hassasiyet P5 ve iç boşluk C2' },

  cagePoly: {
    title: 'Polyamid (plastik) kafes',
    detail: 'Cam elyaf takviyeli polyamid. Hafif ve sessizdir; sürekli çalışmada yaklaşık 120 °C\'ye kadar kullanılır.',
    eq: 'SKF=TN9 / P; FAG=TVP / TVP2 / TVH; NSK=T / TNG; NTN=T2; NACHI=G; ZKL=TNG'
  },
  cageBrass: {
    title: 'Masif pirinç kafes',
    detail: 'Darbe, titreşim ve yüksek sıcaklığa dayanıklıdır; ağır hizmet için.',
    eq: 'SKF=M / MA / ML; FAG=M1 / MP / MPA; NSK=M; NTN=L1; ZKL=M'
  },
  cageBrassOuter: {
    title: 'Masif pirinç kafes (dış bilezikten kılavuzlu)',
    detail: 'Darbe, titreşim ve yüksek devire dayanıklıdır.',
    eq: 'SKF=MA; FAG=MPA / M1A; NSK=M; NTN=L1'
  },
  cageBrassInner: {
    title: 'Masif pirinç kafes (iç bilezikten kılavuzlu)',
    detail: 'Darbe ve titreşime dayanıklıdır; ağır hizmet için.',
    eq: 'SKF=MB; FAG=MB / M1B; NTN=L1'
  },
  cageSteel: {
    title: 'Preslenmiş çelik sac kafes',
    eq: 'SKF=J; FAG=JP1 / JP3; NSK=W'
  },
  cagePhenolic: { title: 'Fenolik (reçineli kumaş) kafes', detail: 'Çok yüksek devirli iş mili rulmanları için hafif kafes.', eq: 'FAG=T; NSK=TR; SKF=PH' },
  fullComplement: { title: 'Kafessiz, tam dolu (full complement)', detail: 'Kafes yerine fazladan yuvarlanma elemanı vardır: yük kapasitesi çok yüksek, izin verilen devir düşüktür.' },

  reinforced: {
    title: 'Güçlendirilmiş iç tasarım (E)',
    detail: 'Daha büyük veya daha çok makara/bilya içerir; yük kapasitesi yüksektir.',
    eq: 'SKF=EC (silindirik makaralıda) / E; FAG=E; NSK=E; NTN=E; NACHI=E'
  },
  xlife: { title: 'X-life', detail: 'FAG / INA\'nın yüksek yük kapasiteli, uzun ömürlü premium serisi.' },
  taperBore: { title: 'Konik delikli (koniklik 1:12)', detail: 'Germe manşonuyla (H serisi) veya konik mile takılır.', same: true },
  taperBore30: { title: 'Konik delikli (koniklik 1:30)', detail: 'Geniş seri (240, 241) oynak makaralı rulmanlarda kullanılır.', same: true },
  lubeGroove: {
    title: 'Dış bilezikte yağlama kanalı ve 3 yağlama deliği',
    detail: 'Rulman, yuva üzerinden yeniden yağlanabilir.',
    eq: 'SKF=W33; FAG=S (E1 serisinde standart); NSK=E4; NTN=D1; SNR=B33 / W33; TIMKEN=W33; KOYO=W33; NACHI=W33; ZKL=W33'
  },
  srbSteel: {
    title: 'Sac kafesli, yüksek kapasiteli tasarım',
    detail: 'Oynak makaralı rulmanın güncel standart tasarımıdır.',
    eq: 'SKF=E / CC; FAG=E1; NSK=EA / CD; NTN=EA / C; TIMKEN=EJ; SNR=EA; KOYO=RH / RZ; NACHI=EX'
  },
  srbBrass: {
    title: 'Masif pirinç kafesli tasarım',
    detail: 'Darbe ve titreşimli ağır hizmet için (örneğin elek, kırıcı).',
    eq: 'SKF=CA / CAC; FAG=MB / M; NSK=CAM; NTN=B / EM; TIMKEN=EM / YM; SNR=EM'
  },
  snapGroove: { title: 'Dış bilezikte segman kanalı', same: true },
  snapRing: { title: 'Dış bilezikte segman kanalı ve segman', same: true },
  heat150: { title: 'Isıl kararlı: 150 °C\'ye kadar ölçü değiştirmez' },
  heat200: { title: 'Isıl kararlı: 200 °C\'ye kadar ölçü değiştirmez', eq: 'SKF=S1; FAG=S1; NSK=S11' },
  lubeHole1: { title: 'Dış bilezikte 1 yağlama deliği (INA)' },

  angle40: { title: 'Temas açısı 40°', detail: 'Yüksek eksenel yük taşır.', eq: 'SKF=B / BE; FAG=B; NSK=B; NTN=B; KOYO=B' },
  angle40e: { title: 'Temas açısı 40°, güçlendirilmiş iç tasarım', eq: 'SKF=BE; FAG=B; NSK=BEA; NTN=B' },
  angle30: { title: 'Temas açısı 30°', eq: 'NSK=A; NTN=(eksiz); KOYO=(eksiz)' },
  angle25: { title: 'Temas açısı 25°', eq: 'SKF=AC / ACD; FAG=E; NSK=A5; NTN=AD' },
  angle15: { title: 'Temas açısı 15°', detail: 'Yüksek devir için; eksenel yük kapasitesi düşüktür.', eq: 'SKF=C / CD; FAG=C; NSK=C; NTN=C' },
  universal: {
    title: 'Üniversal eşleme',
    detail: 'Yan yüzeyleri taşlanmıştır; aynı rulmandan ikisi sırt sırta, yüz yüze veya art arda takılabilir.',
    eq: 'SKF=CB (eski: G); FAG=UA; SNR=G; NTN=G; KOYO=G'
  },
  universalUa: { title: 'Üniversal eşleme, küçük eksenel boşluk', detail: 'İkili takıldığında az boşluklu çalışır.', eq: 'FAG=UA; SKF=CB' },
  universalUo: { title: 'Üniversal eşleme, boşluksuz', eq: 'FAG=UO; SKF=CA / G' },
  universalUl: { title: 'Üniversal eşleme, hafif ön yük', eq: 'FAG=UL; SKF=GA; NSK=SUL' },
  nskBw: { title: 'Temas açısı 40°, sac kafes (NSK)', eq: 'SKF=BEJ; FAG=B-JP' },
  pairDb: { title: 'İkili takım: sırt sırta (O düzeni)', same: true },
  pairDf: { title: 'İkili takım: yüz yüze (X düzeni)', same: true },
  pairDt: { title: 'İkili takım: art arda (tandem)', same: true },
  dacbbNoSlot: {
    title: 'Dolum kanalsız iç tasarım',
    detail: 'İki yönde de eksenel yük taşır.',
    eq: 'SKF=A; FAG=B / BD; NSK=B; ZKL=B'
  },

  trbStd: {
    title: 'Standart (ISO) iç tasarım, yüksek kapasiteli',
    detail: 'Bu tasarımdaki konik rulmanlar markalar arasında birebir değiştirilebilir.',
    eq: 'SKF=J2/Q; FAG=A; NSK=HR…J; NTN=4T-…; KOYO=JR; NACHI=E…J'
  },
  trbX: { title: 'Ana ölçüleri ISO standardına uygun (X)', same: true },
  trbSteep: { title: 'Büyük temas açılı tip', detail: 'Eksenel yük kapasitesi yüksektir.', eq: 'SKF=B; FAG=B; NSK=D; NTN=D' },

  geEs: { title: 'Çelik / çelik, yağlanabilir', detail: 'Yağ deliği ve yağ kanalı vardır; düzenli greslenir.', eq: 'SKF=GE…ES; INA=GE…DO; FAG=GE…DO' },
  geE: { title: 'Çelik / çelik, yağlama deliksiz', eq: 'SKF=GE…E; INA=GE…DO' },
  geUk: { title: 'Bakım gerektirmeyen (yağlanmaz) tip', detail: 'Kayma yüzeyi PTFE kaplıdır.', eq: 'INA=GE…UK; SKF=GE…C / GE…TXE' },
  geC: { title: 'Bakım gerektirmeyen (yağlanmaz) tip', eq: 'SKF=GE…C; INA=GE…UK' },
  geFo: { title: 'Geniş iç bilezikli, çelik / çelik', eq: 'INA=GE…FO; SKF=GEH…ES' },
  geLo: { title: 'Ölçü serisi W (silindir ölçülerine uygun), çelik / çelik', eq: 'INA=GE…LO; SKF=GEG…ES' },
  geHo: { title: 'İç bileziği iki yana uzatılmış, çelik / çelik', eq: 'INA=GE…HO; SKF=GEM…ES' },
  geZo: { title: 'İnç ölçülü, çelik / çelik', eq: 'INA=GE…ZO; SKF=GEZ…ES' },
  geAx: { title: 'Eksenel mafsal rulmanı' },
  ge2rs: { title: 'İki tarafı keçeli', eq: 'SKF=2RS; INA=2RS' }
}

const RULES: Rule[] = [
  // --- special families first
  { codes: 'PP', concept: 'clutchPp', families: ['clutch'] },
  { codes: 'P', concept: 'clutchP', families: ['clutch'] },
  { codes: '2RS', concept: 'sealedBoth', families: ['clutch'] },
  { codes: 'UU PP 2LS', concept: 'linearUu', families: ['linear'] },
  { codes: 'OP', concept: 'linearOp', families: ['linear'] },
  { codes: 'AJ', concept: 'linearAj', families: ['linear'] },
  { codes: 'L', concept: 'linearL', families: ['linear'] },
  { codes: '2F', concept: 'flinger2', families: ['insert'] },
  { codes: '2RF', concept: 'flingerRubber2', families: ['insert'] },
  { codes: 'NPP', concept: 'inaNpp', families: ['insert', 'needle', 'dgbb'] },
  { codes: 'NPPU', concept: 'inaNppu', families: ['insert', 'needle', 'dgbb'] },
  { codes: 'NPPB', concept: 'inaNppb', families: ['insert', 'needle', 'dgbb'] },
  { codes: 'KRR', concept: 'inaKrr', families: ['insert'] },
  { codes: 'KRRB', concept: 'inaKrrb', families: ['insert'] },
  { codes: '2RS 2RS1 2RSR 2LS', concept: 'ge2rs', families: ['plain', 'rod'] },
  { codes: 'ES DO', concept: 'geEs', families: ['plain', 'rod'] },
  { codes: 'E', concept: 'geE', families: ['plain', 'rod'] },
  { codes: 'UK', concept: 'geUk', families: ['plain', 'rod'] },
  { codes: 'C TXE TXA', concept: 'geC', families: ['plain', 'rod'] },
  { codes: 'FO', concept: 'geFo', families: ['plain'] },
  { codes: 'LO', concept: 'geLo', families: ['plain'] },
  { codes: 'HO', concept: 'geHo', families: ['plain'] },
  { codes: 'ZO', concept: 'geZo', families: ['plain'] },
  { codes: 'AX AW', concept: 'geAx', families: ['plain'] },

  // --- seals and shields
  { codes: '2RS 2RS1 2RSH 2RS2 2RSR 2HRS DDU DD LLU 2NSE 2NS EE', concept: 'seal2', families: BALL },
  { codes: 'RS RS1 RSH RSR HRS DU LU NSE', concept: 'seal1', families: BALL },
  { codes: 'ZZ 2Z 2ZR ZZE', concept: 'shield2', families: [...BALL, 'needle'] },
  { codes: 'Z ZR ZE', concept: 'shield1', families: BALL },
  { codes: '2RZ 2BRS VV LLB 2RU 2NKE', concept: 'noncontact2', families: BALL },
  { codes: '2LS', concept: 'sealedLs', families: ['crb'] },
  { codes: 'PP', concept: 'sealedPp', families: ['crb', 'needle'] },
  { codes: 'UU', concept: 'sealedUu', families: ['needle'] },
  { codes: '2RS 2RSR 2RS1', concept: 'sealedBoth', families: ['needle', 'srb', 'crb'] },
  { codes: 'RS RSR', concept: 'sealedOne', families: ['needle'] },

  // --- clearance, precision, heat treatment (same on every rolling bearing)
  { codes: 'C1', concept: 'c1', families: ROLLING },
  { codes: 'C2', concept: 'c2', families: ROLLING },
  { codes: 'CN', concept: 'cn', families: ROLLING },
  { codes: 'C3', concept: 'c3', families: [...ROLLING, 'clutch', 'insert'] },
  { codes: 'C4', concept: 'c4', families: ROLLING },
  { codes: 'C5', concept: 'c5', families: [...ROLLING, 'clutch'] },
  { codes: 'CM', concept: 'cm', families: ['dgbb'] },
  { codes: 'P6', concept: 'p6', families: ROLLING },
  { codes: 'P6X', concept: 'p6x', families: ['trb'] },
  { codes: 'P5', concept: 'p5', families: ROLLING },
  { codes: 'P4', concept: 'p4', families: ROLLING },
  { codes: 'P4S P4A P3', concept: 'p4s', families: ['acbb'] },
  { codes: 'P2', concept: 'p2', families: ROLLING },
  { codes: 'SP', concept: 'sp', families: ['crb', 'acbb', 'thrust'] },
  { codes: 'UP', concept: 'up', families: ['crb', 'acbb', 'thrust'] },
  { codes: 'P63', concept: 'p63', families: ROLLING },
  { codes: 'P62', concept: 'p62', families: ROLLING },
  { codes: 'P64', concept: 'p64', families: ROLLING },
  { codes: 'P53', concept: 'p53', families: ROLLING },
  { codes: 'P52', concept: 'p52', families: ROLLING },
  { codes: 'S0', concept: 'heat150', families: ROLLING },
  { codes: 'S1 S11', concept: 'heat200', families: ROLLING },
  { codes: 'XL', concept: 'xlife', families: ROLLING, brands: ['FAG', 'INA'] },

  // --- angular contact ball bearings
  { codes: 'BW', concept: 'nskBw', families: ['acbb'] },
  { codes: 'BE BEA', concept: 'angle40e', families: ['acbb'] },
  { codes: 'B', concept: 'angle40', families: ['acbb'] },
  { codes: 'A', concept: 'angle30', families: ['acbb'], brands: ['NSK', 'NTN', 'KOYO', 'NACHI'] },
  { codes: 'AC ACD', concept: 'angle25', families: ['acbb'] },
  { codes: 'C CD', concept: 'angle15', families: ['acbb'] },
  { codes: 'CB G', concept: 'universal', families: ['acbb'] },
  { codes: 'UA', concept: 'universalUa', families: ['acbb'] },
  { codes: 'UO', concept: 'universalUo', families: ['acbb'] },
  { codes: 'UL SUL', concept: 'universalUl', families: ['acbb'] },
  { codes: 'DB', concept: 'pairDb', families: ['acbb', 'trb'] },
  { codes: 'DF', concept: 'pairDf', families: ['acbb', 'trb'] },
  { codes: 'DT', concept: 'pairDt', families: ['acbb'] },
  { codes: 'T', concept: 'cagePhenolic', families: ['acbb'], brands: ['FAG'] },
  { codes: 'TR', concept: 'cagePhenolic', families: ['acbb'], brands: ['NSK'] },
  { codes: 'TYN', concept: 'cagePoly', families: ['acbb'] },
  { codes: 'P', concept: 'cagePoly', families: ['acbb', 'crb'], brands: ['SKF'] },
  { codes: 'J', concept: 'cageSteel', families: ['acbb', 'crb'], brands: ['SKF'] },

  // --- double row angular contact
  { codes: 'A', concept: 'dacbbNoSlot', families: ['dacbb'] },
  { codes: 'B BD', concept: 'dacbbNoSlot', families: ['dacbb'] },

  // --- spherical roller bearings
  { codes: 'CC C E E1 EA EJ CD RH RZ EX', concept: 'srbSteel', families: ['srb'] },
  { codes: 'CA CAC CAM EM YM MB M', concept: 'srbBrass', families: ['srb'] },
  { codes: 'B', concept: 'srbBrass', families: ['srb'], brands: ['NTN'] },
  { codes: 'W33 E4 B33', concept: 'lubeGroove', families: ['srb', 'crb'] },
  { codes: 'D1', concept: 'lubeGroove', families: ['srb'], brands: ['NTN'] },
  { codes: 'S', concept: 'lubeGroove', families: ['srb'], brands: ['FAG'] },
  { codes: 'K30', concept: 'taperBore30', families: ['srb'] },

  // --- tapered roller bearings
  { codes: 'J2 Q J2Q JR', concept: 'trbStd', families: ['trb'] },
  { codes: 'J', concept: 'trbStd', families: ['trb'], brands: ['NSK', 'KOYO', 'NACHI', 'KBC'] },
  { codes: 'A', concept: 'trbStd', families: ['trb'], brands: ['FAG'] },
  { codes: 'U', concept: 'trbStd', families: ['trb'], brands: ['NTN'] },
  { codes: 'X', concept: 'trbX', families: ['trb'] },
  { codes: 'B', concept: 'trbSteep', families: ['trb'], brands: ['SKF', 'FAG'] },
  { codes: 'D', concept: 'trbSteep', families: ['trb'], brands: ['NSK', 'NTN'] },

  // --- cages and general design codes
  { codes: 'TN9 TN TVP TVP2 TVP3 TVH TV TNG TNH TVPB', concept: 'cagePoly', families: ROLLING },
  { codes: 'T2', concept: 'cagePoly', families: ROLLING, brands: ['NTN'] },
  { codes: 'G', concept: 'cagePoly', families: ['crb'], brands: ['NACHI'] },
  { codes: 'MA MPA M1A', concept: 'cageBrassOuter', families: ['dgbb', 'acbb', 'crb', 'thrust'] },
  { codes: 'MB M1B', concept: 'cageBrassInner', families: ['dgbb', 'acbb', 'crb', 'thrust'] },
  { codes: 'M M1 MP ML', concept: 'cageBrass', families: ['dgbb', 'sabb', 'acbb', 'dacbb', 'crb', 'thrust'] },
  { codes: 'JP JP1 JP3', concept: 'cageSteel', families: ['acbb', 'crb'] },
  { codes: 'W', concept: 'cageSteel', families: ['crb'], brands: ['NSK'] },
  { codes: 'V', concept: 'fullComplement', families: ['crb', 'needle'] },
  { codes: 'E EC', concept: 'reinforced', families: ['crb', 'sabb', 'thrust'] },
  { codes: 'K', concept: 'taperBore', families: ['sabb', 'srb', 'crb'] },
  { codes: 'N', concept: 'snapGroove', families: ['dgbb'] },
  { codes: 'NR', concept: 'snapRing', families: ['dgbb'] },
  { codes: 'AS1', concept: 'lubeHole1', families: ['needle'] }
]

const STRONG_SHORT = new Set(['ZZ', '2Z', 'C2', 'C3', 'C4', 'C5', 'P4', 'P5', 'P6', 'UU'])

const brandKey = (brand: string): string => {
  const value = brand.toLocaleUpperCase('tr-TR').replace(/İ/g, 'I')
  for (const name of ['SKF', 'FAG', 'INA', 'NSK', 'NTN', 'KOYO', 'NACHI', 'SNR', 'TIMKEN', 'ZKL', 'IKO', 'KBC']) {
    if (new RegExp(`(^|[^A-Z])${name}([^A-Z]|$)`).test(value)) return name
  }
  return ''
}

const codeTable = (family: BearingFamily, brand: string): Map<string, string> => {
  const table = new Map<string, string>()
  for (const rule of RULES) {
    if (rule.families && !rule.families.includes(family)) continue
    if (rule.brands && !rule.brands.includes(brand)) continue
    for (const code of rule.codes.split(' ')) if (!table.has(code)) table.set(code, rule.concept)
  }
  return table
}

/** Splits a glued suffix such as "ETVP2C3" into known codes; unknown parts are skipped. */
const segment = (token: string, table: Map<string, string>): string[] => {
  const n = token.length
  const cost: number[] = [0]
  const back: { from: number; code: string | null }[] = [{ from: 0, code: null }]
  for (let end = 1; end <= n; end += 1) {
    cost[end] = cost[end - 1] + 100
    back[end] = { from: end - 1, code: null }
    for (let start = Math.max(0, end - 6); start < end; start += 1) {
      const part = token.slice(start, end)
      if (table.has(part) && cost[start] + 1 < cost[end]) {
        cost[end] = cost[start] + 1
        back[end] = { from: start, code: part }
      }
    }
  }
  const codes: string[] = []
  for (let at = n; at > 0; at = back[at].from) {
    const code = back[at].code
    if (code) codes.unshift(code)
  }
  const complete = cost[n] < 100
  return complete ? codes : codes.filter((code) => code.length >= 3 || STRONG_SHORT.has(code))
}

const boreFromCode = (code: string): number | null => {
  if (!/^\d\d$/.test(code)) return null
  const value = Number(code)
  if (value === 0) return 10
  if (value === 1) return 12
  if (value === 2) return 15
  if (value === 3) return 17
  return value >= 4 && value <= 96 ? value * 5 : null
}

const mm = (value: number): string => `${String(value).replace('.', ',')} mm`
const bore = (value: number | null): string => value === null ? '' : `İç çap ${mm(value)}`

interface TypeInfo { family: BearingFamily; type: string; detail?: string; size?: string }

const numericType = (digits: string, explicitBore: number | null): TypeInfo | null => {
  const size = (code: string): string => bore(explicitBore ?? boreFromCode(code))
  if (digits.length === 3 && /^6[0-3]\d$/.test(digits)) {
    return { family: 'dgbb', type: 'Sabit bilyalı rulman (minyatür)', size: bore(explicitBore ?? Number(digits[2])) }
  }
  if (digits.length === 2 && explicitBore !== null) {
    if (/^6[0-4]$/.test(digits)) return { family: 'dgbb', type: 'Sabit bilyalı rulman', size: bore(explicitBore) }
    if (/^(30|31|32|33)$/.test(digits)) return null
  }
  if (digits.length === 4) {
    const series = digits.slice(0, 2)
    const code = digits.slice(2)
    if (/^6[0234]$/.test(series)) return { family: 'dgbb', type: 'Sabit bilyalı rulman', detail: 'En yaygın rulman tipi: radyal yükü ve iki yönde hafif eksenel yükü taşır.', size: size(code) }
    if (/^(12|13|22|23)$/.test(series)) return { family: 'sabb', type: 'Oynak bilyalı rulman', detail: 'Çift sıra bilyalı; mil eğilmesini ve eksen kaçıklığını kendiliğinden karşılar.', size: size(code) }
    if (/^(42|43)$/.test(series)) return { family: 'dgbb', type: 'Çift sıra sabit bilyalı rulman', size: size(code) }
    if (/^(32|33|52|53)$/.test(series)) return { family: 'dacbb', type: 'Çift sıra eğik bilyalı rulman', detail: 'Radyal yükle birlikte iki yönde eksenel yük taşır.', size: size(code) }
    if (/^7[0234]$/.test(series)) return { family: 'acbb', type: 'Eğik bilyalı rulman', detail: 'Radyal yükle birlikte tek yönde eksenel yük taşır; genellikle çift kullanılır.', size: size(code) }
    return null
  }
  if (digits.length === 5) {
    const series = digits.slice(0, 3)
    const code = digits.slice(3)
    if (/^(160|161|617|618|619|622|623|630|632|633)$/.test(series)) return { family: 'dgbb', type: 'Sabit bilyalı rulman', size: size(code) }
    if (/^(213|222|223|230|231|232|233|238|239|240|241)$/.test(series)) return { family: 'srb', type: 'Oynak makaralı rulman', detail: 'Çift sıra fıçı makaralı; çok ağır yük taşır, eksen kaçıklığını karşılar.', size: size(code) }
    if (/^(202|203)$/.test(series)) return { family: 'srb', type: 'Fıçı makaralı rulman (tek sıra)', size: size(code) }
    if (/^(302|303|313|320|322|323|329|330|331|332)$/.test(series)) return { family: 'trb', type: 'Konik makaralı rulman', detail: 'Radyal ve tek yönde eksenel yükü birlikte taşır; iç ve dış bilezik ayrılabilir.', size: size(code) }
    if (/^51[1-4]$/.test(series)) return { family: 'thrust', type: 'Eksenel bilyalı rulman (tek yönlü)', detail: 'Yalnızca eksenel yük taşır.', size: size(code) }
    if (/^52[2-4]$/.test(series)) return { family: 'thrust', type: 'Eksenel bilyalı rulman (çift yönlü)', detail: 'Yalnızca eksenel yük taşır.' }
    if (/^53[2-4]$/.test(series)) return { family: 'thrust', type: 'Eksenel bilyalı rulman (küresel oturma yüzeyli)', size: size(code) }
    if (/^(811|812|893|894)$/.test(series)) return { family: 'thrust', type: 'Eksenel silindirik makaralı rulman', detail: 'Yalnızca eksenel yük taşır.', size: size(code) }
    if (/^29[234]$/.test(series)) return { family: 'thrust', type: 'Eksenel oynak makaralı rulman', size: size(code) }
    if (/^71[89]$/.test(series)) return { family: 'acbb', type: 'Eğik bilyalı rulman', size: size(code) }
  }
  return null
}

const CRB: Record<string, string> = {
  NU: 'İç bilezik faturasızdır: eksenel yük taşımaz, mil uzamasına izin verir (serbest yatak).',
  NJ: 'İç bilezikte tek fatura vardır: tek yönde eksenel yük taşır.',
  NUP: 'İç bilezikte fatura ve ayrı fatura pulu vardır: mili iki yönde konumlar (sabit yatak).',
  N: 'Dış bilezik faturasızdır: eksenel yük taşımaz (serbest yatak).',
  NF: 'Dış bilezikte tek fatura vardır: tek yönde eksenel yük taşır.',
  NH: 'NJ rulmanı ile HJ açı bileziğinin takımıdır: mili iki yönde konumlar.',
  NN: 'Çift sıra, dış bilezik faturasız; takım tezgâhı milleri için.',
  NNU: 'Çift sıra, iç bilezik faturasız.',
  NCF: 'Kafessiz (tam dolu), tek sıra.',
  RNU: 'NU tipinin iç bileziksiz hâlidir; makaralar doğrudan mil üzerinde çalışır.',
  RN: 'N tipinin dış bileziksiz hâlidir.'
}

const NEEDLE: Record<string, string> = {
  NA: 'İğneli rulman (iç bilezikli)',
  RNA: 'İğneli rulman (iç bileziksiz)',
  NK: 'İğneli rulman (iç bileziksiz)',
  NKS: 'İğneli rulman (iç bileziksiz)',
  NKI: 'İğneli rulman (iç bilezikli)',
  NKIS: 'İğneli rulman (iç bilezikli)',
  NAO: 'İğneli rulman (faturasız, iç bilezikli)',
  RNAO: 'İğneli rulman (faturasız, iç bileziksiz)',
  HK: 'İğneli kovan (iki ucu açık)',
  BK: 'İğneli kovan (bir ucu kapalı)',
  K: 'İğneli kafes (bileziksiz)',
  IR: 'İğneli rulman iç bileziği',
  AXK: 'Eksenel iğneli kafes',
  AS: 'Eksenel rulman pulu (ince)',
  NKX: 'Kombine rulman: iğneli + eksenel bilyalı',
  NKXR: 'Kombine rulman: iğneli + eksenel silindirik makaralı',
  NKIA: 'Kombine rulman: iğneli + eğik bilyalı (tek yön)',
  NKIB: 'Kombine rulman: iğneli + eğik bilyalı (çift yön)',
  NATR: 'Destek makarası (yürüyen makara), eksenel kılavuzlu',
  NATV: 'Destek makarası, kafessiz (tam dolu)',
  NUTR: 'Destek makarası, ağır yük tipi (çift sıra silindirik makaralı)',
  NART: 'Destek makarası (yürüyen makara)',
  NAST: 'Destek makarası (ayrılabilir tip)',
  STO: 'Destek makarası (eksenel kılavuzsuz)',
  RSTO: 'Destek makarası (iç bileziksiz)',
  KR: 'Saplı makara (kam takipçisi)',
  KRV: 'Saplı makara, kafessiz (tam dolu)',
  NUKR: 'Saplı makara, ağır yük tipi',
  HF: 'Tek yönlü iğneli kovan (serbest dönüş kavraması)',
  HFL: 'Tek yönlü iğneli kovan, yataklamalı'
}

const ROD: Record<string, string> = {
  PHS: 'Rot başı (mafsal başlık), dişi dişli',
  POS: 'Rot başı (mafsal başlık), erkek dişli',
  SI: 'Rot başı (mafsal başlık), dişi dişli',
  SA: 'Rot başı (mafsal başlık), erkek dişli',
  SIL: 'Rot başı, dişi dişli, sol diş',
  SAL: 'Rot başı, erkek dişli, sol diş',
  GIR: 'Rot başı, dişi dişli, sağ diş',
  GIL: 'Rot başı, dişi dişli, sol diş',
  GAR: 'Rot başı, erkek dişli, sağ diş',
  GAL: 'Rot başı, erkek dişli, sol diş'
}

const LINEAR: Record<string, string> = {
  LM: 'Lineer bilyalı rulman (Asya ölçü serisi)',
  LME: 'Lineer bilyalı rulman (Avrupa ölçü serisi)',
  LMF: 'Lineer bilyalı rulman, yuvarlak flanşlı',
  LMK: 'Lineer bilyalı rulman, kare flanşlı',
  LMH: 'Lineer bilyalı rulman, oval flanşlı',
  LMEF: 'Lineer bilyalı rulman, yuvarlak flanşlı (Avrupa ölçü serisi)',
  LMEK: 'Lineer bilyalı rulman, kare flanşlı (Avrupa ölçü serisi)',
  KH: 'Lineer bilyalı rulman (kompakt seri)',
  KB: 'Lineer bilyalı rulman',
  KBO: 'Lineer bilyalı rulman (açık tip)'
}

const INSERT: Record<string, string> = {
  UC: 'Yatak rulmanı, setuskur vidalı',
  UK: 'Yatak rulmanı, konik delikli (manşonla takılır)',
  SB: 'Yatak rulmanı, setuskur vidalı (dar iç bilezik)',
  SA: 'Yatak rulmanı, eksantrik kilit bilezikli',
  YAR: 'Yatak rulmanı, setuskur vidalı (SKF)',
  YET: 'Yatak rulmanı, eksantrik kilit bilezikli (SKF)',
  YEL: 'Yatak rulmanı, eksantrik kilit bilezikli (SKF)'
}

const halves = (digits: string): [number, number] | null => {
  if (digits.length === 4) return [Number(digits.slice(0, 2)), Number(digits.slice(2))]
  if (digits.length === 5) return [Number(digits.slice(0, 2)), Number(digits.slice(2))]
  if (digits.length === 6) return [Number(digits.slice(0, 3)), Number(digits.slice(3))]
  return null
}

const prefixedType = (prefix: string, number: string, rest: string, brand: string): TypeInfo | null => {
  const digits = /^\d+$/.test(number) ? number : ''
  const slash = number.match(/^(\d+)\/(\d+(?:[.,]\d+)?)$/)
  const dims = number.match(/^(\d+(?:[.,]\d+)?)X(\d+(?:[.,]\d+)?)X(\d+(?:[.,]\d+)?)$/)
  const value = (text: string): number => Number(text.replace(',', '.'))
  if (prefix in CRB) {
    const code = digits.length >= 3 && digits.length <= 4 ? digits.slice(-2) : ''
    const noInner = prefix === 'RNU' || prefix === 'RN'
    return { family: 'crb', type: `Silindirik makaralı rulman (${prefix} tipi)`, detail: CRB[prefix], size: noInner ? '' : bore(boreFromCode(code)) }
  }
  if (prefix === 'SL' && number.length >= 4) return { family: 'crb', type: 'Silindirik makaralı rulman, kafessiz (tam dolu)', detail: 'Yük kapasitesi çok yüksek, izin verilen devir düşüktür.' }
  if (prefix === 'QJ' && digits) return { family: 'acbb', type: 'Dört nokta temaslı bilyalı rulman', detail: 'İki yönde eksenel yük taşır; iç bileziği iki parçalıdır.', size: bore(boreFromCode(digits.slice(-2))) }
  if (prefix === 'LR' && !dims && digits) return { family: 'needle', type: 'Yürüyen makara (bilyalı, kalın dış bilezikli)' }
  if (prefix === 'LR' && dims) return { family: 'needle', type: 'İğneli rulman iç bileziği', size: `İç çap ${mm(value(dims[1]))} · dış çap ${mm(value(dims[2]))} · genişlik ${mm(value(dims[3]))}` }
  if (prefix in NEEDLE) {
    const info: TypeInfo = { family: 'needle', type: NEEDLE[prefix] }
    if (prefix === 'K' && !dims) return null
    if ((prefix === 'K' || prefix === 'IR') && dims) {
      info.size = prefix === 'K'
        ? `İç çap ${mm(value(dims[1]))} · dış çap ${mm(value(dims[2]))} · genişlik ${mm(value(dims[3]))}`
        : `İç çap ${mm(value(dims[1]))} · yuvarlanma çapı ${mm(value(dims[2]))} · genişlik ${mm(value(dims[3]))}`
    } else if ((prefix === 'NK' || prefix === 'NKS') && slash) info.size = `İğne altı (mil) çapı ${mm(value(slash[1]))} · genişlik ${mm(value(slash[2]))}`
    else if ((prefix === 'NKI' || prefix === 'NKIS') && slash) info.size = `İç çap ${mm(value(slash[1]))} · genişlik ${mm(value(slash[2]))}`
    else if ((prefix === 'HK' || prefix === 'BK' || prefix === 'HF') && digits.length === 4) info.size = `Mil çapı ${mm(Number(digits.slice(0, 2)))} · genişlik ${mm(Number(digits.slice(2)))}`
    else if ((prefix === 'AXK' || prefix === 'AS') && halves(digits)) { const pair = halves(digits); if (pair) info.size = `İç çap ${mm(pair[0])} · dış çap ${mm(pair[1])}` }
    else if (prefix === 'NA' && /^(48|49|59|69)\d\d$/.test(digits)) info.size = bore(boreFromCode(digits.slice(2)))
    return info
  }
  if (/^GE[A-Z]{0,2}$/.test(prefix) && digits) {
    if (/KRR/.test(rest)) return { family: 'insert', type: 'Yatak rulmanı, eksantrik kilit bilezikli (INA)', size: bore(Number(digits)) }
    // GEZ and ...ZO are inch sizes: "GEZ 108" is 1 8/16 in, while "GEZ 31" / "GE 19 ZO" are the inch bore rounded to mm.
    const inch = prefix.startsWith('GEZ') || /(^|[\s-])ZO($|[\s-])/.test(rest)
    let size = bore(Number(digits))
    if (inch) {
      const sixteenths = Number(digits) % 100
      size = digits.length === 3 && sixteenths < 16
        ? `İç çap ${mm(Math.round((Math.floor(Number(digits) / 100) + sixteenths / 16) * 25.4 * 1000) / 1000)} (inç ölçülü)`
        : digits.length <= 2 ? `İç çap yaklaşık ${mm(Number(digits))} (inç ölçülü)` : ''
    }
    return { family: 'plain', type: 'Mafsal rulmanı (küresel kaymalı yatak)', detail: 'Salınım hareketi ve eksen kaçıklığı olan bağlantılarda kullanılır.', size }
  }
  if ((prefix === 'SA' || prefix === 'SB' || prefix === 'UC' || prefix === 'UK' || prefix === 'YAR' || prefix === 'YET' || prefix === 'YEL') && /^[23]\d\d$/.test(digits)) {
    return { family: 'insert', type: INSERT[prefix], detail: 'Dış bileziği küreseldir; yatak gövdesine (UCP, UCF vb.) takılır.', size: prefix === 'UK' ? '' : bore(boreFromCode(digits.slice(1))) }
  }
  if (prefix in ROD && digits && digits.length <= 2) return { family: 'rod', type: ROD[prefix], size: `Delik çapı ${mm(Number(digits))}` }
  if (prefix in LINEAR && digits && (digits.length <= 2 || ((prefix === 'KH' || prefix.startsWith('KB')) && digits.length === 4))) {
    const shaft = digits.length === 4 ? Number(digits.slice(0, 2)) : Number(digits)
    return { family: 'linear', type: LINEAR[prefix], size: digits ? `Mil çapı ${mm(shaft)}` : '' }
  }
  if (prefix === 'CSK' && digits) return { family: 'clutch', type: 'Tek yönlü rulman (serbest dönüş kavramalı)', detail: 'Bir yönde serbest döner, diğer yönde kilitlenir. Ölçüleri 62 serisi bilyalı rulmanla aynıdır.', size: bore(Number(digits)) }
  if ((prefix === 'H' || prefix === 'HE' || prefix === 'HA') && /^\d{3,4}$/.test(digits)) {
    const d = boreFromCode(digits.slice(-2))
    return { family: 'sleeve', type: 'Germe manşonu (somun ve emniyet puluyla)', detail: 'Konik delikli (K) rulmanı düz mile bağlar.', size: d === null ? '' : `${mm(d)} delikli rulmanlar için` }
  }
  if ((prefix === 'KM' || prefix === 'KML') && digits && digits.length <= 2) {
    const d = boreFromCode(digits.padStart(2, '0'))
    return { family: 'nut', type: 'Emniyet somunu (kilit somunu)', detail: `MB ${Number(digits)} emniyet puluyla birlikte kullanılır.`, size: d === null ? '' : `Diş çapı M${d}` }
  }
  if (prefix === 'MB' && digits && digits.length <= 2) {
    return { family: 'nut', type: 'Emniyet pulu (kilit rondelası)', detail: `KM ${Number(digits)} somunuyla birlikte kullanılır.` }
  }
  if (/^(LM|JLM|JM|JHM|HM|LL|JL|L|M|HH|H)$/.test(prefix) && (digits || slash?.[1] || '').length >= 5) {
    return { family: 'other', type: 'İnç seri konik makaralı rulman', detail: 'İç bilezik (cone) ve dış bilezik (cup) ayrı numaralanır; kod ikisini birlikte gösterir.' }
  }
  if (/^(RLS|RMS|LJ|MJ)$/.test(prefix)) return { family: 'dgbb', type: 'İnç ölçülü sabit bilyalı rulman', detail: prefix === 'RLS' || prefix === 'LJ' ? 'Hafif seri.' : 'Orta seri.' }
  void brand
  return null
}

const parseEquivalents = (text: string | undefined): CodeEquivalent[] =>
  (text ?? '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const at = part.indexOf('=')
    return { brand: part.slice(0, at).trim(), code: part.slice(at + 1).trim() }
  })

const STAINLESS = /^(SS|S)$/

export function explainProductCode(sku: string, brand: string): CodeExplanation | null {
  const text = sku.toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/\([^)]*\)?/g, ' ').replace(/\s+/g, ' ').trim()
  const match = text.match(/^(?:(4T|[A-Z]{1,5})[\s-]?)?(\d+(?:[.,]\d+)?(?:X\d+(?:[.,]\d+)?){2}|\d+(?:\/\d+(?:[.,]\d+)?)?)(.*)$/)
  if (!match) return null
  const prefix = match[1] ?? ''
  const number = match[2]
  let rest = match[3]
  const brandName = brandKey(brand)
  let info: TypeInfo | null = null
  let prefixNote = ''
  const plainPrefix = prefix === '' || STAINLESS.test(prefix) || prefix === 'HR' || prefix === '4T' || prefix === 'B' || prefix === 'HQ' || prefix === 'E'
  if (plainPrefix) {
    const slash = number.match(/^(\d+)\/(\d+(?:[.,]\d+)?)$/)
    const digits = slash ? slash[1] : number
    let explicit = slash ? Number(slash[2].replace(',', '.')) : null
    // "6902-16 ZZ": a number right after the base code is a special bore, so the standard bore does not apply.
    const special = rest.match(/^-(\d+(?:[.,]\d+)?)(?=\s|$)/)
    if (special) { explicit = Number(special[1].replace(',', '.')); rest = rest.slice(special[0].length) }
    if (/^\d+$/.test(digits)) info = numericType(digits, explicit)
    if (info && STAINLESS.test(prefix) && info.family === 'dgbb') prefixNote = 'Paslanmaz çelik'
    if (info && (prefix === 'HR' || prefix === '4T') && info.family !== 'trb') info = null
    if (info && prefix === 'B' && info.family !== 'acbb') info = null
    if (info && prefix === 'B') prefixNote = 'İş mili (spindle) rulmanı'
  } else {
    info = prefixedType(prefix, number, rest, brandName)
  }
  if (!info) return null

  const table = codeTable(info.family, brandName)
  const notes: CodeNote[] = []
  const seen = new Map<string, CodeNote>()
  const tokens = rest.split(/[\s\-/.,+]+/).filter(Boolean)
  for (const token of tokens) {
    if (/^\d+$/.test(token) || token.length > 14) continue
    for (const code of segment(token, table)) {
      const id = table.get(code)
      if (!id) continue
      const existing = seen.get(id)
      if (existing) {
        if (!existing.code.split(' + ').includes(code)) existing.code += ` + ${code}`
        continue
      }
      const concept = CONCEPTS[id]
      const note: CodeNote = { code, title: concept.title, detail: concept.detail ?? '', equivalents: parseEquivalents(concept.eq), sameEverywhere: concept.same === true }
      seen.set(id, note)
      notes.push(note)
    }
  }
  const type = prefixNote ? `${info.type} · ${prefixNote}` : info.type
  return { base: `${prefix ? `${prefix} ` : ''}${number}`.trim(), type, typeDetail: info.detail ?? '', size: info.size ?? '', notes }
}
