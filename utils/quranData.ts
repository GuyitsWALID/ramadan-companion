// Full Quran Surah Metadata
// Note: Actual verse content will be fetched from API

export interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: "Meccan" | "Medinan";
  numberOfAyahs: number;
  juz: number[];
}

export interface Verse {
  number: number;
  arabic: string;
  translation?: string;
  transliteration?: string;
  audio?: string;
}

export interface Reciter {
  id: string;
  name: string;
  englishName: string;
  style: string;
  identifier: string;
}

// Popular Quran reciters
export const RECITERS: Reciter[] = [
  { id: "mishary", name: "مشاري راشد العفاسي", englishName: "Mishary Rashid Alafasy", style: "Murattal", identifier: "ar.alafasy" },
  { id: "sudais", name: "عبد الرحمن السديس", englishName: "Abdul Rahman Al-Sudais", style: "Murattal", identifier: "ar.abdurrahmaansudais" },
  { id: "shuraim", name: "سعود الشريم", englishName: "Saud Al-Shuraim", style: "Murattal", identifier: "ar.saaborhim" },
  { id: "minshawi", name: "محمد صديق المنشاوي", englishName: "Mohamed Siddiq Al-Minshawi", style: "Murattal", identifier: "ar.minshawi" },
  { id: "husary", name: "محمود خليل الحصري", englishName: "Mahmoud Khalil Al-Husary", style: "Murattal", identifier: "ar.husary" },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد", englishName: "Abdul Basit Abdul Samad", style: "Murattal", identifier: "ar.abdulbasitmurattal" },
  { id: "maher", name: "ماهر المعيقلي", englishName: "Maher Al Muaiqly", style: "Murattal", identifier: "ar.mahermuaiqly" },
];

// All 114 Surahs with metadata
export const SURAHS: SurahInfo[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Fatiha", englishNameTranslation: "The Opening", revelationType: "Meccan", numberOfAyahs: 7, juz: [1] },
  { number: 2, name: "البقرة", englishName: "Al-Baqara", englishNameTranslation: "The Cow", revelationType: "Medinan", numberOfAyahs: 286, juz: [1, 2, 3] },
  { number: 3, name: "آل عمران", englishName: "Aal-E-Imran", englishNameTranslation: "The Family of Imran", revelationType: "Medinan", numberOfAyahs: 200, juz: [3, 4] },
  { number: 4, name: "النساء", englishName: "An-Nisa", englishNameTranslation: "The Women", revelationType: "Medinan", numberOfAyahs: 176, juz: [4, 5, 6] },
  { number: 5, name: "المائدة", englishName: "Al-Maida", englishNameTranslation: "The Table Spread", revelationType: "Medinan", numberOfAyahs: 120, juz: [6, 7] },
  { number: 6, name: "الأنعام", englishName: "Al-An'am", englishNameTranslation: "The Cattle", revelationType: "Meccan", numberOfAyahs: 165, juz: [7, 8] },
  { number: 7, name: "الأعراف", englishName: "Al-A'raf", englishNameTranslation: "The Heights", revelationType: "Meccan", numberOfAyahs: 206, juz: [8, 9] },
  { number: 8, name: "الأنفال", englishName: "Al-Anfal", englishNameTranslation: "The Spoils of War", revelationType: "Medinan", numberOfAyahs: 75, juz: [9, 10] },
  { number: 9, name: "التوبة", englishName: "At-Tawba", englishNameTranslation: "The Repentance", revelationType: "Medinan", numberOfAyahs: 129, juz: [10, 11] },
  { number: 10, name: "يونس", englishName: "Yunus", englishNameTranslation: "Jonah", revelationType: "Meccan", numberOfAyahs: 109, juz: [11] },
  { number: 11, name: "هود", englishName: "Hud", englishNameTranslation: "Hud", revelationType: "Meccan", numberOfAyahs: 123, juz: [11, 12] },
  { number: 12, name: "يوسف", englishName: "Yusuf", englishNameTranslation: "Joseph", revelationType: "Meccan", numberOfAyahs: 111, juz: [12, 13] },
  { number: 13, name: "الرعد", englishName: "Ar-Ra'd", englishNameTranslation: "The Thunder", revelationType: "Medinan", numberOfAyahs: 43, juz: [13] },
  { number: 14, name: "إبراهيم", englishName: "Ibrahim", englishNameTranslation: "Abraham", revelationType: "Meccan", numberOfAyahs: 52, juz: [13] },
  { number: 15, name: "الحجر", englishName: "Al-Hijr", englishNameTranslation: "The Rocky Tract", revelationType: "Meccan", numberOfAyahs: 99, juz: [14] },
  { number: 16, name: "النحل", englishName: "An-Nahl", englishNameTranslation: "The Bee", revelationType: "Meccan", numberOfAyahs: 128, juz: [14] },
  { number: 17, name: "الإسراء", englishName: "Al-Isra", englishNameTranslation: "The Night Journey", revelationType: "Meccan", numberOfAyahs: 111, juz: [15] },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", englishNameTranslation: "The Cave", revelationType: "Meccan", numberOfAyahs: 110, juz: [15, 16] },
  { number: 19, name: "مريم", englishName: "Maryam", englishNameTranslation: "Mary", revelationType: "Meccan", numberOfAyahs: 98, juz: [16] },
  { number: 20, name: "طه", englishName: "Ta-Ha", englishNameTranslation: "Ta-Ha", revelationType: "Meccan", numberOfAyahs: 135, juz: [16] },
  { number: 21, name: "الأنبياء", englishName: "Al-Anbiya", englishNameTranslation: "The Prophets", revelationType: "Meccan", numberOfAyahs: 112, juz: [17] },
  { number: 22, name: "الحج", englishName: "Al-Hajj", englishNameTranslation: "The Pilgrimage", revelationType: "Medinan", numberOfAyahs: 78, juz: [17] },
  { number: 23, name: "المؤمنون", englishName: "Al-Mu'minun", englishNameTranslation: "The Believers", revelationType: "Meccan", numberOfAyahs: 118, juz: [18] },
  { number: 24, name: "النور", englishName: "An-Nur", englishNameTranslation: "The Light", revelationType: "Medinan", numberOfAyahs: 64, juz: [18] },
  { number: 25, name: "الفرقان", englishName: "Al-Furqan", englishNameTranslation: "The Criterion", revelationType: "Meccan", numberOfAyahs: 77, juz: [18, 19] },
  { number: 26, name: "الشعراء", englishName: "Ash-Shu'ara", englishNameTranslation: "The Poets", revelationType: "Meccan", numberOfAyahs: 227, juz: [19] },
  { number: 27, name: "النمل", englishName: "An-Naml", englishNameTranslation: "The Ant", revelationType: "Meccan", numberOfAyahs: 93, juz: [19, 20] },
  { number: 28, name: "القصص", englishName: "Al-Qasas", englishNameTranslation: "The Stories", revelationType: "Meccan", numberOfAyahs: 88, juz: [20] },
  { number: 29, name: "العنكبوت", englishName: "Al-Ankabut", englishNameTranslation: "The Spider", revelationType: "Meccan", numberOfAyahs: 69, juz: [20, 21] },
  { number: 30, name: "الروم", englishName: "Ar-Rum", englishNameTranslation: "The Romans", revelationType: "Meccan", numberOfAyahs: 60, juz: [21] },
  { number: 31, name: "لقمان", englishName: "Luqman", englishNameTranslation: "Luqman", revelationType: "Meccan", numberOfAyahs: 34, juz: [21] },
  { number: 32, name: "السجدة", englishName: "As-Sajda", englishNameTranslation: "The Prostration", revelationType: "Meccan", numberOfAyahs: 30, juz: [21] },
  { number: 33, name: "الأحزاب", englishName: "Al-Ahzab", englishNameTranslation: "The Confederates", revelationType: "Medinan", numberOfAyahs: 73, juz: [21, 22] },
  { number: 34, name: "سبأ", englishName: "Saba", englishNameTranslation: "Sheba", revelationType: "Meccan", numberOfAyahs: 54, juz: [22] },
  { number: 35, name: "فاطر", englishName: "Fatir", englishNameTranslation: "The Originator", revelationType: "Meccan", numberOfAyahs: 45, juz: [22] },
  { number: 36, name: "يس", englishName: "Ya-Sin", englishNameTranslation: "Ya-Sin", revelationType: "Meccan", numberOfAyahs: 83, juz: [22, 23] },
  { number: 37, name: "الصافات", englishName: "As-Saffat", englishNameTranslation: "Those Ranged in Ranks", revelationType: "Meccan", numberOfAyahs: 182, juz: [23] },
  { number: 38, name: "ص", englishName: "Sad", englishNameTranslation: "Sad", revelationType: "Meccan", numberOfAyahs: 88, juz: [23] },
  { number: 39, name: "الزمر", englishName: "Az-Zumar", englishNameTranslation: "The Groups", revelationType: "Meccan", numberOfAyahs: 75, juz: [23, 24] },
  { number: 40, name: "غافر", englishName: "Ghafir", englishNameTranslation: "The Forgiver", revelationType: "Meccan", numberOfAyahs: 85, juz: [24] },
  { number: 41, name: "فصلت", englishName: "Fussilat", englishNameTranslation: "Explained in Detail", revelationType: "Meccan", numberOfAyahs: 54, juz: [24, 25] },
  { number: 42, name: "الشورى", englishName: "Ash-Shura", englishNameTranslation: "The Consultation", revelationType: "Meccan", numberOfAyahs: 53, juz: [25] },
  { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", englishNameTranslation: "The Gold Adornments", revelationType: "Meccan", numberOfAyahs: 89, juz: [25] },
  { number: 44, name: "الدخان", englishName: "Ad-Dukhan", englishNameTranslation: "The Smoke", revelationType: "Meccan", numberOfAyahs: 59, juz: [25] },
  { number: 45, name: "الجاثية", englishName: "Al-Jathiya", englishNameTranslation: "The Kneeling", revelationType: "Meccan", numberOfAyahs: 37, juz: [25] },
  { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", englishNameTranslation: "The Wind-Curved Sandhills", revelationType: "Meccan", numberOfAyahs: 35, juz: [26] },
  { number: 47, name: "محمد", englishName: "Muhammad", englishNameTranslation: "Muhammad", revelationType: "Medinan", numberOfAyahs: 38, juz: [26] },
  { number: 48, name: "الفتح", englishName: "Al-Fath", englishNameTranslation: "The Victory", revelationType: "Medinan", numberOfAyahs: 29, juz: [26] },
  { number: 49, name: "الحجرات", englishName: "Al-Hujurat", englishNameTranslation: "The Rooms", revelationType: "Medinan", numberOfAyahs: 18, juz: [26] },
  { number: 50, name: "ق", englishName: "Qaf", englishNameTranslation: "Qaf", revelationType: "Meccan", numberOfAyahs: 45, juz: [26] },
  { number: 51, name: "الذاريات", englishName: "Adh-Dhariyat", englishNameTranslation: "The Winnowing Winds", revelationType: "Meccan", numberOfAyahs: 60, juz: [26, 27] },
  { number: 52, name: "الطور", englishName: "At-Tur", englishNameTranslation: "The Mount", revelationType: "Meccan", numberOfAyahs: 49, juz: [27] },
  { number: 53, name: "النجم", englishName: "An-Najm", englishNameTranslation: "The Star", revelationType: "Meccan", numberOfAyahs: 62, juz: [27] },
  { number: 54, name: "القمر", englishName: "Al-Qamar", englishNameTranslation: "The Moon", revelationType: "Meccan", numberOfAyahs: 55, juz: [27] },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahman", englishNameTranslation: "The Beneficent", revelationType: "Medinan", numberOfAyahs: 78, juz: [27] },
  { number: 56, name: "الواقعة", englishName: "Al-Waqi'a", englishNameTranslation: "The Inevitable", revelationType: "Meccan", numberOfAyahs: 96, juz: [27] },
  { number: 57, name: "الحديد", englishName: "Al-Hadid", englishNameTranslation: "The Iron", revelationType: "Medinan", numberOfAyahs: 29, juz: [27] },
  { number: 58, name: "المجادلة", englishName: "Al-Mujadila", englishNameTranslation: "The Pleading Woman", revelationType: "Medinan", numberOfAyahs: 22, juz: [28] },
  { number: 59, name: "الحشر", englishName: "Al-Hashr", englishNameTranslation: "The Exile", revelationType: "Medinan", numberOfAyahs: 24, juz: [28] },
  { number: 60, name: "الممتحنة", englishName: "Al-Mumtahina", englishNameTranslation: "She That is to be Examined", revelationType: "Medinan", numberOfAyahs: 13, juz: [28] },
  { number: 61, name: "الصف", englishName: "As-Saff", englishNameTranslation: "The Ranks", revelationType: "Medinan", numberOfAyahs: 14, juz: [28] },
  { number: 62, name: "الجمعة", englishName: "Al-Jumu'a", englishNameTranslation: "The Congregation", revelationType: "Medinan", numberOfAyahs: 11, juz: [28] },
  { number: 63, name: "المنافقون", englishName: "Al-Munafiqun", englishNameTranslation: "The Hypocrites", revelationType: "Medinan", numberOfAyahs: 11, juz: [28] },
  { number: 64, name: "التغابن", englishName: "At-Taghabun", englishNameTranslation: "The Mutual Disillusion", revelationType: "Medinan", numberOfAyahs: 18, juz: [28] },
  { number: 65, name: "الطلاق", englishName: "At-Talaq", englishNameTranslation: "The Divorce", revelationType: "Medinan", numberOfAyahs: 12, juz: [28] },
  { number: 66, name: "التحريم", englishName: "At-Tahrim", englishNameTranslation: "The Prohibition", revelationType: "Medinan", numberOfAyahs: 12, juz: [28] },
  { number: 67, name: "الملك", englishName: "Al-Mulk", englishNameTranslation: "The Sovereignty", revelationType: "Meccan", numberOfAyahs: 30, juz: [29] },
  { number: 68, name: "القلم", englishName: "Al-Qalam", englishNameTranslation: "The Pen", revelationType: "Meccan", numberOfAyahs: 52, juz: [29] },
  { number: 69, name: "الحاقة", englishName: "Al-Haaqqa", englishNameTranslation: "The Reality", revelationType: "Meccan", numberOfAyahs: 52, juz: [29] },
  { number: 70, name: "المعارج", englishName: "Al-Ma'arij", englishNameTranslation: "The Ascending Stairways", revelationType: "Meccan", numberOfAyahs: 44, juz: [29] },
  { number: 71, name: "نوح", englishName: "Nuh", englishNameTranslation: "Noah", revelationType: "Meccan", numberOfAyahs: 28, juz: [29] },
  { number: 72, name: "الجن", englishName: "Al-Jinn", englishNameTranslation: "The Jinn", revelationType: "Meccan", numberOfAyahs: 28, juz: [29] },
  { number: 73, name: "المزمل", englishName: "Al-Muzzammil", englishNameTranslation: "The Enshrouded One", revelationType: "Meccan", numberOfAyahs: 20, juz: [29] },
  { number: 74, name: "المدثر", englishName: "Al-Muddaththir", englishNameTranslation: "The Cloaked One", revelationType: "Meccan", numberOfAyahs: 56, juz: [29] },
  { number: 75, name: "القيامة", englishName: "Al-Qiyama", englishNameTranslation: "The Resurrection", revelationType: "Meccan", numberOfAyahs: 40, juz: [29] },
  { number: 76, name: "الإنسان", englishName: "Al-Insan", englishNameTranslation: "The Man", revelationType: "Medinan", numberOfAyahs: 31, juz: [29] },
  { number: 77, name: "المرسلات", englishName: "Al-Mursalat", englishNameTranslation: "The Emissaries", revelationType: "Meccan", numberOfAyahs: 50, juz: [29] },
  { number: 78, name: "النبأ", englishName: "An-Naba", englishNameTranslation: "The Tidings", revelationType: "Meccan", numberOfAyahs: 40, juz: [30] },
  { number: 79, name: "النازعات", englishName: "An-Nazi'at", englishNameTranslation: "Those Who Drag Forth", revelationType: "Meccan", numberOfAyahs: 46, juz: [30] },
  { number: 80, name: "عبس", englishName: "Abasa", englishNameTranslation: "He Frowned", revelationType: "Meccan", numberOfAyahs: 42, juz: [30] },
  { number: 81, name: "التكوير", englishName: "At-Takwir", englishNameTranslation: "The Overthrowing", revelationType: "Meccan", numberOfAyahs: 29, juz: [30] },
  { number: 82, name: "الانفطار", englishName: "Al-Infitar", englishNameTranslation: "The Cleaving", revelationType: "Meccan", numberOfAyahs: 19, juz: [30] },
  { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", englishNameTranslation: "The Defrauding", revelationType: "Meccan", numberOfAyahs: 36, juz: [30] },
  { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaq", englishNameTranslation: "The Splitting Open", revelationType: "Meccan", numberOfAyahs: 25, juz: [30] },
  { number: 85, name: "البروج", englishName: "Al-Buruj", englishNameTranslation: "The Mansions of the Stars", revelationType: "Meccan", numberOfAyahs: 22, juz: [30] },
  { number: 86, name: "الطارق", englishName: "At-Tariq", englishNameTranslation: "The Nightcommer", revelationType: "Meccan", numberOfAyahs: 17, juz: [30] },
  { number: 87, name: "الأعلى", englishName: "Al-A'la", englishNameTranslation: "The Most High", revelationType: "Meccan", numberOfAyahs: 19, juz: [30] },
  { number: 88, name: "الغاشية", englishName: "Al-Ghashiya", englishNameTranslation: "The Overwhelming", revelationType: "Meccan", numberOfAyahs: 26, juz: [30] },
  { number: 89, name: "الفجر", englishName: "Al-Fajr", englishNameTranslation: "The Dawn", revelationType: "Meccan", numberOfAyahs: 30, juz: [30] },
  { number: 90, name: "البلد", englishName: "Al-Balad", englishNameTranslation: "The City", revelationType: "Meccan", numberOfAyahs: 20, juz: [30] },
  { number: 91, name: "الشمس", englishName: "Ash-Shams", englishNameTranslation: "The Sun", revelationType: "Meccan", numberOfAyahs: 15, juz: [30] },
  { number: 92, name: "الليل", englishName: "Al-Layl", englishNameTranslation: "The Night", revelationType: "Meccan", numberOfAyahs: 21, juz: [30] },
  { number: 93, name: "الضحى", englishName: "Ad-Dhuha", englishNameTranslation: "The Morning Hours", revelationType: "Meccan", numberOfAyahs: 11, juz: [30] },
  { number: 94, name: "الشرح", englishName: "Ash-Sharh", englishNameTranslation: "The Relief", revelationType: "Meccan", numberOfAyahs: 8, juz: [30] },
  { number: 95, name: "التين", englishName: "At-Tin", englishNameTranslation: "The Fig", revelationType: "Meccan", numberOfAyahs: 8, juz: [30] },
  { number: 96, name: "العلق", englishName: "Al-Alaq", englishNameTranslation: "The Clot", revelationType: "Meccan", numberOfAyahs: 19, juz: [30] },
  { number: 97, name: "القدر", englishName: "Al-Qadr", englishNameTranslation: "The Power", revelationType: "Meccan", numberOfAyahs: 5, juz: [30] },
  { number: 98, name: "البينة", englishName: "Al-Bayyina", englishNameTranslation: "The Clear Proof", revelationType: "Medinan", numberOfAyahs: 8, juz: [30] },
  { number: 99, name: "الزلزلة", englishName: "Az-Zalzala", englishNameTranslation: "The Earthquake", revelationType: "Medinan", numberOfAyahs: 8, juz: [30] },
  { number: 100, name: "العاديات", englishName: "Al-Adiyat", englishNameTranslation: "The Courser", revelationType: "Meccan", numberOfAyahs: 11, juz: [30] },
  { number: 101, name: "القارعة", englishName: "Al-Qari'a", englishNameTranslation: "The Calamity", revelationType: "Meccan", numberOfAyahs: 11, juz: [30] },
  { number: 102, name: "التكاثر", englishName: "At-Takathur", englishNameTranslation: "The Rivalry in World Increase", revelationType: "Meccan", numberOfAyahs: 8, juz: [30] },
  { number: 103, name: "العصر", englishName: "Al-Asr", englishNameTranslation: "The Declining Day", revelationType: "Meccan", numberOfAyahs: 3, juz: [30] },
  { number: 104, name: "الهمزة", englishName: "Al-Humaza", englishNameTranslation: "The Traducer", revelationType: "Meccan", numberOfAyahs: 9, juz: [30] },
  { number: 105, name: "الفيل", englishName: "Al-Fil", englishNameTranslation: "The Elephant", revelationType: "Meccan", numberOfAyahs: 5, juz: [30] },
  { number: 106, name: "قريش", englishName: "Quraysh", englishNameTranslation: "Quraysh", revelationType: "Meccan", numberOfAyahs: 4, juz: [30] },
  { number: 107, name: "الماعون", englishName: "Al-Ma'un", englishNameTranslation: "The Small Kindnesses", revelationType: "Meccan", numberOfAyahs: 7, juz: [30] },
  { number: 108, name: "الكوثر", englishName: "Al-Kawthar", englishNameTranslation: "The Abundance", revelationType: "Meccan", numberOfAyahs: 3, juz: [30] },
  { number: 109, name: "الكافرون", englishName: "Al-Kafirun", englishNameTranslation: "The Disbelievers", revelationType: "Meccan", numberOfAyahs: 6, juz: [30] },
  { number: 110, name: "النصر", englishName: "An-Nasr", englishNameTranslation: "The Divine Support", revelationType: "Medinan", numberOfAyahs: 3, juz: [30] },
  { number: 111, name: "المسد", englishName: "Al-Masad", englishNameTranslation: "The Palm Fiber", revelationType: "Meccan", numberOfAyahs: 5, juz: [30] },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlas", englishNameTranslation: "The Sincerity", revelationType: "Meccan", numberOfAyahs: 4, juz: [30] },
  { number: 113, name: "الفلق", englishName: "Al-Falaq", englishNameTranslation: "The Daybreak", revelationType: "Meccan", numberOfAyahs: 5, juz: [30] },
  { number: 114, name: "الناس", englishName: "An-Nas", englishNameTranslation: "The Mankind", revelationType: "Meccan", numberOfAyahs: 6, juz: [30] },
];

// API URLs for fetching Quran data
export const QURAN_API = {
  // Al-Quran Cloud API (free, no auth required)
  surah: (surahNumber: number) => `https://api.alquran.cloud/v1/surah/${surahNumber}`,
  surahWithTranslation: (surahNumber: number, edition: string = "en.sahih") => 
    `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,${edition}`,
  ayah: (surahNumber: number, ayahNumber: number) => 
    `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}`,
  audio: (surahNumber: number, reciter: string = "ar.alafasy") => 
    `https://api.alquran.cloud/v1/surah/${surahNumber}/${reciter}`,
  search: (query: string) => `https://api.alquran.cloud/v1/search/${query}/all/en`,
};

// Cache keys for offline access
export const CACHE_KEYS = {
  surahData: (surahNumber: number) => `@quran_surah_${surahNumber}`,
  surahAudio: (surahNumber: number, reciter: string) => `@quran_audio_${surahNumber}_${reciter}`,
  lastRead: "@quran_last_read",
  readingMode: "@quran_reading_mode",
  selectedReciter: "@quran_selected_reciter",
};

// Reading modes
export type ReadingMode = "arabic" | "translation";

export const getReadingModeLabel = (mode: ReadingMode): string => {
  switch (mode) {
    case "arabic": return "Arabic Only";
    case "translation": return "With Translation";
    default: return "Arabic Only";
  }
};
