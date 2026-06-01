export type AppContext = {
  name: string;
  description: string;
  target: string;
  platforms: string[];
  locale: string;
  outputLang: string;
};

const JA = { locale: "ja", outputLang: "日本語" };

const APP_CONTEXTS: Record<string, AppContext> = {
  buzzencer: {
    name: "BUZZENCER",
    description: "Ferramenta de marketing nas redes sociais que analisa vídeos virais, gera roteiros e gerencia a produção de conteúdo para o mercado brasileiro.",
    target: "Marqueteiros de redes sociais, criadores de conteúdo e equipes de marketing empresarial no Brasil",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    locale: "pt-BR",
    outputLang: "português brasileiro (pt-BR)",
  },
  "buzzencer-vn": {
    name: "BUZZENCER VN",
    description: "Công cụ tiếp thị mạng xã hội phân tích video viral, tạo kịch bản và quản lý sản xuất nội dung cho thị trường Việt Nam.",
    target: "Nhà tiếp thị mạng xã hội, nhà sáng tạo nội dung và đội ngũ marketing doanh nghiệp tại Việt Nam",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    locale: "vi",
    outputLang: "tiếng Việt",
  },
  "buzzencer-id": {
    name: "BUZZENCER ID",
    description: "Alat pemasaran media sosial yang menganalisis video viral, membuat skrip, dan mengelola produksi konten untuk pasar Indonesia.",
    target: "Pemasar media sosial, pembuat konten, dan tim pemasaran perusahaan di Indonesia",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    locale: "id",
    outputLang: "Bahasa Indonesia",
  },
  "buzzencer-bd": {
    name: "BUZZENCER BD",
    description: "সোশ্যাল মিডিয়া মার্কেটিং টুল যা ভাইরাল ভিডিও বিশ্লেষণ করে, স্ক্রিপ্ট তৈরি করে এবং বাংলাদেশের বাজারের জন্য কন্টেন্ট প্রোডাকশন পরিচালনা করে।",
    target: "বাংলাদেশের সোশ্যাল মিডিয়া মার্কেটার, কন্টেন্ট ক্রিয়েটর এবং কর্পোরেট মার্কেটিং টিম",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    locale: "bn",
    outputLang: "বাংলা (Bengali)",
  },
  twomi: {
    name: "Twomi",
    description: "AIアバターと自由に会話・ビデオ通話できるアプリ。AIキャラクターとのリアルタイム会話、アバター作成、ライブ配信機能を持つ。",
    target: "10〜30代のSNSユーザー",
    platforms: ["youtube", "tiktok", "instagram", "x", "threads"],
    ...JA,
  },
  "ai-avatar": {
    name: "AI AVATAR",
    description: "自分だけのAIアバターを作成できるアプリ。写真から高精度なアバターを生成し、様々なシーンで活用できる。",
    target: "10〜40代のクリエイター・SNSユーザー",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    ...JA,
  },
  soulriza: {
    name: "SOULRiZA",
    description: "スピリチュアル・占いAIアプリ。タロット・占星術・数秘術などをAIが解析し、運勢や人生の指針を提供する。",
    target: "20〜40代の女性",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    ...JA,
  },
  "king-together": {
    name: "KING Together",
    description: "AIが将軍として個別に対話するエンタメアプリ。歴史キャラクターとのリアルな会話体験を提供する。",
    target: "20〜50代の歴史・エンタメファン",
    platforms: ["youtube", "tiktok", "instagram", "x"],
    ...JA,
  },
  education: {
    name: "Education",
    description: "AIを活用した教育・学習支援アプリ。英語学習や知識習得を対話型AIでサポートする。",
    target: "学生・社会人・保護者",
    platforms: ["youtube", "instagram", "x"],
    ...JA,
  },
  pachinavi: {
    name: "パチナビ",
    description: "パチスロ・パチンコの設定推測・立ち回りをAIが分析・サポートするアプリ。設定判別・期待値計算・ハイエナポイント予測などの機能を持つ。",
    target: "20〜50代のパチスロ・パチンコユーザー",
    platforms: ["youtube", "tiktok", "x"],
    ...JA,
  },
};

export function getAppContext(appId: string): AppContext {
  return APP_CONTEXTS[appId] ?? {
    name: appId,
    description: "アプリの詳細情報なし",
    target: "一般ユーザー",
    platforms: ["youtube", "x"],
    ...JA,
  };
}
