// Surah list + ayah counts (114 surahs, 6236 total ayahs).
// Source: standard Hafs count. Used for navigation and progress math without needing the API.
export const SURAHS = [
  { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', ayahs: 7 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', ayahs: 286 },
  { n: 3, name: "Aali 'Imran", arabic: 'آل عمران', ayahs: 200 },
  { n: 4, name: 'An-Nisa', arabic: 'النساء', ayahs: 176 },
  { n: 5, name: "Al-Ma'idah", arabic: 'المائدة', ayahs: 120 },
  { n: 6, name: "Al-An'am", arabic: 'الأنعام', ayahs: 165 },
  { n: 7, name: "Al-A'raf", arabic: 'الأعراف', ayahs: 206 },
  { n: 8, name: 'Al-Anfal', arabic: 'الأنفال', ayahs: 75 },
  { n: 9, name: 'At-Tawbah', arabic: 'التوبة', ayahs: 129 },
  { n: 10, name: 'Yunus', arabic: 'يونس', ayahs: 109 },
  { n: 11, name: 'Hud', arabic: 'هود', ayahs: 123 },
  { n: 12, name: 'Yusuf', arabic: 'يوسف', ayahs: 111 },
  { n: 13, name: "Ar-Ra'd", arabic: 'الرعد', ayahs: 43 },
  { n: 14, name: 'Ibrahim', arabic: 'إبراهيم', ayahs: 52 },
  { n: 15, name: 'Al-Hijr', arabic: 'الحجر', ayahs: 99 },
  { n: 16, name: 'An-Nahl', arabic: 'النحل', ayahs: 128 },
  { n: 17, name: 'Al-Isra', arabic: 'الإسراء', ayahs: 111 },
  { n: 18, name: 'Al-Kahf', arabic: 'الكهف', ayahs: 110 },
  { n: 19, name: 'Maryam', arabic: 'مريم', ayahs: 98 },
  { n: 20, name: 'Ta-Ha', arabic: 'طه', ayahs: 135 },
  { n: 21, name: 'Al-Anbiya', arabic: 'الأنبياء', ayahs: 112 },
  { n: 22, name: 'Al-Hajj', arabic: 'الحج', ayahs: 78 },
  { n: 23, name: "Al-Mu'minun", arabic: 'المؤمنون', ayahs: 118 },
  { n: 24, name: 'An-Nur', arabic: 'النور', ayahs: 64 },
  { n: 25, name: 'Al-Furqan', arabic: 'الفرقان', ayahs: 77 },
  { n: 26, name: "Ash-Shu'ara", arabic: 'الشعراء', ayahs: 227 },
  { n: 27, name: 'An-Naml', arabic: 'النمل', ayahs: 93 },
  { n: 28, name: 'Al-Qasas', arabic: 'القصص', ayahs: 88 },
  { n: 29, name: 'Al-Ankabut', arabic: 'العنكبوت', ayahs: 69 },
  { n: 30, name: 'Ar-Rum', arabic: 'الروم', ayahs: 60 },
  { n: 31, name: 'Luqman', arabic: 'لقمان', ayahs: 34 },
  { n: 32, name: 'As-Sajdah', arabic: 'السجدة', ayahs: 30 },
  { n: 33, name: 'Al-Ahzab', arabic: 'الأحزاب', ayahs: 73 },
  { n: 34, name: 'Saba', arabic: 'سبأ', ayahs: 54 },
  { n: 35, name: 'Fatir', arabic: 'فاطر', ayahs: 45 },
  { n: 36, name: 'Ya-Sin', arabic: 'يس', ayahs: 83 },
  { n: 37, name: 'As-Saffat', arabic: 'الصافات', ayahs: 182 },
  { n: 38, name: 'Sad', arabic: 'ص', ayahs: 88 },
  { n: 39, name: 'Az-Zumar', arabic: 'الزمر', ayahs: 75 },
  { n: 40, name: 'Ghafir', arabic: 'غافر', ayahs: 85 },
  { n: 41, name: 'Fussilat', arabic: 'فصلت', ayahs: 54 },
  { n: 42, name: 'Ash-Shura', arabic: 'الشورى', ayahs: 53 },
  { n: 43, name: 'Az-Zukhruf', arabic: 'الزخرف', ayahs: 89 },
  { n: 44, name: 'Ad-Dukhan', arabic: 'الدخان', ayahs: 59 },
  { n: 45, name: 'Al-Jathiyah', arabic: 'الجاثية', ayahs: 37 },
  { n: 46, name: 'Al-Ahqaf', arabic: 'الأحقاف', ayahs: 35 },
  { n: 47, name: 'Muhammad', arabic: 'محمد', ayahs: 38 },
  { n: 48, name: 'Al-Fath', arabic: 'الفتح', ayahs: 29 },
  { n: 49, name: 'Al-Hujurat', arabic: 'الحجرات', ayahs: 18 },
  { n: 50, name: 'Qaf', arabic: 'ق', ayahs: 45 },
  { n: 51, name: 'Adh-Dhariyat', arabic: 'الذاريات', ayahs: 60 },
  { n: 52, name: 'At-Tur', arabic: 'الطور', ayahs: 49 },
  { n: 53, name: 'An-Najm', arabic: 'النجم', ayahs: 62 },
  { n: 54, name: 'Al-Qamar', arabic: 'القمر', ayahs: 55 },
  { n: 55, name: 'Ar-Rahman', arabic: 'الرحمن', ayahs: 78 },
  { n: 56, name: "Al-Waqi'ah", arabic: 'الواقعة', ayahs: 96 },
  { n: 57, name: 'Al-Hadid', arabic: 'الحديد', ayahs: 29 },
  { n: 58, name: 'Al-Mujadilah', arabic: 'المجادلة', ayahs: 22 },
  { n: 59, name: 'Al-Hashr', arabic: 'الحشر', ayahs: 24 },
  { n: 60, name: 'Al-Mumtahanah', arabic: 'الممتحنة', ayahs: 13 },
  { n: 61, name: 'As-Saff', arabic: 'الصف', ayahs: 14 },
  { n: 62, name: "Al-Jumu'ah", arabic: 'الجمعة', ayahs: 11 },
  { n: 63, name: 'Al-Munafiqun', arabic: 'المنافقون', ayahs: 11 },
  { n: 64, name: 'At-Taghabun', arabic: 'التغابن', ayahs: 18 },
  { n: 65, name: 'At-Talaq', arabic: 'الطلاق', ayahs: 12 },
  { n: 66, name: 'At-Tahrim', arabic: 'التحريم', ayahs: 12 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', ayahs: 30 },
  { n: 68, name: 'Al-Qalam', arabic: 'القلم', ayahs: 52 },
  { n: 69, name: 'Al-Haqqah', arabic: 'الحاقة', ayahs: 52 },
  { n: 70, name: "Al-Ma'arij", arabic: 'المعارج', ayahs: 44 },
  { n: 71, name: 'Nuh', arabic: 'نوح', ayahs: 28 },
  { n: 72, name: 'Al-Jinn', arabic: 'الجن', ayahs: 28 },
  { n: 73, name: 'Al-Muzzammil', arabic: 'المزمل', ayahs: 20 },
  { n: 74, name: 'Al-Muddaththir', arabic: 'المدثر', ayahs: 56 },
  { n: 75, name: 'Al-Qiyamah', arabic: 'القيامة', ayahs: 40 },
  { n: 76, name: 'Al-Insan', arabic: 'الإنسان', ayahs: 31 },
  { n: 77, name: 'Al-Mursalat', arabic: 'المرسلات', ayahs: 50 },
  { n: 78, name: 'An-Naba', arabic: 'النبأ', ayahs: 40 },
  { n: 79, name: "An-Nazi'at", arabic: 'النازعات', ayahs: 46 },
  { n: 80, name: 'Abasa', arabic: 'عبس', ayahs: 42 },
  { n: 81, name: 'At-Takwir', arabic: 'التكوير', ayahs: 29 },
  { n: 82, name: 'Al-Infitar', arabic: 'الانفطار', ayahs: 19 },
  { n: 83, name: 'Al-Mutaffifin', arabic: 'المطففين', ayahs: 36 },
  { n: 84, name: 'Al-Inshiqaq', arabic: 'الانشقاق', ayahs: 25 },
  { n: 85, name: 'Al-Buruj', arabic: 'البروج', ayahs: 22 },
  { n: 86, name: 'At-Tariq', arabic: 'الطارق', ayahs: 17 },
  { n: 87, name: "Al-A'la", arabic: 'الأعلى', ayahs: 19 },
  { n: 88, name: 'Al-Ghashiyah', arabic: 'الغاشية', ayahs: 26 },
  { n: 89, name: 'Al-Fajr', arabic: 'الفجر', ayahs: 30 },
  { n: 90, name: 'Al-Balad', arabic: 'البلد', ayahs: 20 },
  { n: 91, name: 'Ash-Shams', arabic: 'الشمس', ayahs: 15 },
  { n: 92, name: 'Al-Layl', arabic: 'الليل', ayahs: 21 },
  { n: 93, name: 'Ad-Duha', arabic: 'الضحى', ayahs: 11 },
  { n: 94, name: 'Ash-Sharh', arabic: 'الشرح', ayahs: 8 },
  { n: 95, name: 'At-Tin', arabic: 'التين', ayahs: 8 },
  { n: 96, name: "Al-'Alaq", arabic: 'العلق', ayahs: 19 },
  { n: 97, name: 'Al-Qadr', arabic: 'القدر', ayahs: 5 },
  { n: 98, name: 'Al-Bayyinah', arabic: 'البينة', ayahs: 8 },
  { n: 99, name: 'Az-Zalzalah', arabic: 'الزلزلة', ayahs: 8 },
  { n: 100, name: "Al-'Adiyat", arabic: 'العاديات', ayahs: 11 },
  { n: 101, name: "Al-Qari'ah", arabic: 'القارعة', ayahs: 11 },
  { n: 102, name: 'At-Takathur', arabic: 'التكاثر', ayahs: 8 },
  { n: 103, name: "Al-'Asr", arabic: 'العصر', ayahs: 3 },
  { n: 104, name: 'Al-Humazah', arabic: 'الهمزة', ayahs: 9 },
  { n: 105, name: 'Al-Fil', arabic: 'الفيل', ayahs: 5 },
  { n: 106, name: 'Quraysh', arabic: 'قريش', ayahs: 4 },
  { n: 107, name: "Al-Ma'un", arabic: 'الماعون', ayahs: 7 },
  { n: 108, name: 'Al-Kawthar', arabic: 'الكوثر', ayahs: 3 },
  { n: 109, name: 'Al-Kafirun', arabic: 'الكافرون', ayahs: 6 },
  { n: 110, name: 'An-Nasr', arabic: 'النصر', ayahs: 3 },
  { n: 111, name: 'Al-Masad', arabic: 'المسد', ayahs: 5 },
  { n: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', ayahs: 4 },
  { n: 113, name: 'Al-Falaq', arabic: 'الفلق', ayahs: 5 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', ayahs: 6 },
];

export const TOTAL_AYAHS = 6236;

// Juz starting points: [surah, ayah]. Juz N starts at JUZ_STARTS[N-1].
// Juz N ends just before JUZ_STARTS[N], or at the last ayah of the Quran for juz 30.
export const JUZ_STARTS = [
  [1, 1],     // 1  Al-Fatiha 1
  [2, 142],   // 2  Al-Baqarah 142
  [2, 253],   // 3  Al-Baqarah 253
  [3, 93],    // 4  Aali Imran 93
  [4, 24],    // 5  An-Nisa 24
  [4, 148],   // 6  An-Nisa 148
  [5, 82],    // 7  Al-Ma'idah 82
  [6, 111],   // 8  Al-An'am 111
  [7, 88],    // 9  Al-A'raf 88
  [8, 41],    // 10 Al-Anfal 41
  [9, 93],    // 11 At-Tawbah 93
  [11, 6],    // 12 Hud 6
  [12, 53],   // 13 Yusuf 53
  [15, 1],    // 14 Al-Hijr 1
  [17, 1],    // 15 Al-Isra 1
  [18, 75],   // 16 Al-Kahf 75
  [21, 1],    // 17 Al-Anbiya 1
  [23, 1],    // 18 Al-Mu'minun 1
  [25, 21],   // 19 Al-Furqan 21
  [27, 56],   // 20 An-Naml 56
  [29, 46],   // 21 Al-Ankabut 46
  [33, 31],   // 22 Al-Ahzab 31
  [36, 28],   // 23 Ya-Sin 28
  [39, 32],   // 24 Az-Zumar 32
  [41, 47],   // 25 Fussilat 47
  [46, 1],    // 26 Al-Ahqaf 1
  [51, 31],   // 27 Adh-Dhariyat 31
  [58, 1],    // 28 Al-Mujadilah 1
  [67, 1],    // 29 Al-Mulk 1
  [78, 1],    // 30 An-Naba 1
];

/** Returns the juz (1..30) containing a given (surahNumber, ayahNumber). */
export function juzOf(surahNumber, ayahNumber = 1) {
  if (!surahNumber) return null;
  const s = Number(surahNumber), a = Number(ayahNumber) || 1;
  for (let i = JUZ_STARTS.length - 1; i >= 0; i--) {
    const [ss, sa] = JUZ_STARTS[i];
    if (s > ss || (s === ss && a >= sa)) return i + 1;
  }
  return 1;
}

/** Friendly label for juz N, e.g. "Juz 30 · An-Naba → An-Nas". */
export function juzLabel(n) {
  if (!n || n < 1 || n > 30) return '';
  const [startSurah, startAyah] = JUZ_STARTS[n - 1];
  const startMeta = surahByNumber(startSurah);
  let endMeta;
  if (n < 30) {
    const [nextSurah, nextAyah] = JUZ_STARTS[n];
    // end is just before next juz starts; if next juz starts at ayah 1 of a surah, the previous surah ends this juz
    endMeta = surahByNumber(nextAyah === 1 ? nextSurah - 1 : nextSurah);
  } else {
    endMeta = surahByNumber(114);
  }
  if (startMeta?.n === endMeta?.n) {
    return `Juz ${n} · ${startMeta.name}`;
  }
  return `Juz ${n} · ${startMeta?.name} → ${endMeta?.name}`;
}

export function surahByNumber(n) {
  return SURAHS.find((s) => s.n === Number(n));
}

// In-memory cache so re-visiting a surah is instant.
const cache = new Map();

const ENDPOINTS = [
  // Primary: alquran.cloud, Uthmani edition
  (n) => `https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`,
  // Fallback 1: api.quran.com — different shape, transformed below
  (n) => `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${n}`,
];

async function tryFetch(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/**
 * Fetch a surah's Arabic ayahs. Cascades through a couple of endpoints
 * and times out after 10s so the UI never hangs.
 * Returns { number, englishName, arabicName, ayahs: [{ n, text }] }.
 */
export async function fetchSurah(n) {
  if (cache.has(n)) return cache.get(n);

  const meta = surahByNumber(n) ?? { name: '', arabic: '' };
  let lastErr;
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const url = ENDPOINTS[i](n);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10_000);
    try {
      const json = await tryFetch(url, ac.signal);
      clearTimeout(t);
      let ayahs;
      if (json?.data?.ayahs) {
        // alquran.cloud shape
        ayahs = json.data.ayahs.map((a) => ({ n: a.numberInSurah, text: a.text }));
      } else if (Array.isArray(json?.verses)) {
        // quran.com v4 shape: { verses: [{ verse_key: "67:1", text_uthmani: "..." }] }
        ayahs = json.verses.map((v) => ({
          n: Number(String(v.verse_key).split(':')[1]),
          text: v.text_uthmani,
        }));
      } else {
        throw new Error('Unrecognised API response shape');
      }
      const result = {
        number: n,
        englishName: meta.name,
        arabicName: meta.arabic,
        ayahs,
      };
      cache.set(n, result);
      return result;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      // try next endpoint
    }
  }
  throw new Error(
    `Could not load surah ${n}. Last error: ${lastErr?.message ?? 'unknown'}. ` +
    `Check your internet connection or try refreshing the page.`
  );
}
