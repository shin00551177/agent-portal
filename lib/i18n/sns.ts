export type Locale = "ja" | "pt-BR";

export interface SnsTranslations {
  nav: {
    dashboard: string; hypotheses: string; ego: string; feedback: string;
    frequency: string; learnings: string; accounts: string; settings: string;
    back: string;
    groups: { main: string; pdca: string; config: string };
  };
  dashboard: {
    title: string; todo: string; noTodo: string; pdca: string;
    trends: string; frequency: string; emptyTitle: string; emptyDesc: string;
    emptyLink: string; egoDetail: string; freqDetail: string;
    pending: string; unprocessed: string; freqCheck: string;
    pdcaCards: { ego: string; hypothesis: string; contentLab: string; buzz: string };
    pdcaSubs: { egoSub: (neg: number, pos: number) => string; hypoSub: (n: number) => string; briefSub: string; buzzSub: string };
    egoNotRun: string;
  };
  hypotheses: {
    title: string; desc: string; generate: string; generating: string;
    status: { pending: string; approved: string; rejected: string; briefed: string; posted: string; measured: string };
    empty_pending: string; empty: string;
    approve: string; reject: string; send: string; markPosted: string;
    rejectPlaceholder: string; submitReject: string; cancel: string; pendingBadge: string;
    labels: { platform: string; target: string; format: string; brief: string; rejectNote: string };
  };
  ego: {
    title: string; collect: string; collecting: string;
    summary: { total: string; buzz: string; neg: string; pos: string };
    buzzTop: string; all: string; empty: string;
  };
  feedback: {
    title: string; desc: string; add: string; unprocessedOnly: string; showProcessed: string;
    done: string; empty: string;
    form: { source: string; type: string; importance: string; content: string; author: string; url: string; submit: string; cancel: string };
  };
  frequency: {
    title: string; desc: string; analyze: string; analyzing: string; empty: string;
    accept: string; adjust: string; confirm: string; cancel: string;
    current: string; perWeek: string; aiRec: string; adjusted: string;
    unconfirmed: string; confirmed: string;
  };
  learnings: {
    title: string; desc: string; valid: string;
    synthesize: string; synthesizing: string; add: string;
    activeOnly: string; showAll: string; edit: string; disable: string; enable: string;
    delete: string; save: string; cancel: string; empty: string; emptyDesc: string;
    types: { avoid: string; prioritize: string; general: string };
  };
}

const JA: SnsTranslations = {
  nav: {
    dashboard: "ダッシュボード", hypotheses: "仮説管理", ego: "エゴサ",
    feedback: "ユーザーFB", frequency: "投稿頻度", learnings: "学習DB",
    accounts: "アカウント", settings: "設定", back: "← SNS管理に戻る",
    groups: { main: "メイン", pdca: "PDCA", config: "設定" },
  },
  dashboard: {
    title: "ダッシュボード", todo: "今やること", noTodo: "対応が必要なタスクはありません",
    pdca: "PDCAサイクル現状", trends: "直近14日のトレンドワード（エゴサから自動抽出）",
    frequency: "投稿頻度レコメンド", emptyTitle: "仮説は自動生成されます",
    emptyDesc: "毎朝8時・夜20時に投稿頻度に合わせて自動補充されます",
    emptyLink: "投稿頻度を設定する →", egoDetail: "エゴサ詳細 →", freqDetail: "詳細・調整 →",
    pending: "承認待ちの仮説", unprocessed: "未処理のユーザーFB", freqCheck: "投稿頻度レコメンドを確認",
    pdcaCards: { ego: "エゴサ", hypothesis: "仮説", contentLab: "Content-lab送信", buzz: "バズ検知" },
    pdcaSubs: {
      egoSub: (neg: number, pos: number) => `直近7日 ${neg}ネガ / ${pos}ポジ`,
      hypoSub: (n: number) => `承認済 ${n}件`,
      briefSub: "ブリーフ送信済み",
      buzzSub: "直近7日",
    },
    egoNotRun: "未実行",
  },
  hypotheses: {
    title: "仮説管理", desc: "AIが投稿頻度に合わせて自動生成します。承認・差し戻しをしてください。",
    generate: "今すぐ生成", generating: "生成中...",
    status: { pending: "承認待ち", approved: "承認済み", rejected: "差し戻し", briefed: "Content-lab送信済", posted: "投稿済み", measured: "測定済み" },
    empty_pending: "承認待ちの仮説がありません。「今すぐ生成」を押してください。", empty: "該当する仮説がありません",
    approve: "承認", reject: "差し戻し", send: "Content-lab に送信", markPosted: "投稿済みとしてマーク",
    rejectPlaceholder: "差し戻し理由・改善メモ（AIが次回の仮説生成に活用します）",
    submitReject: "差し戻す", cancel: "キャンセル", pendingBadge: "実装待ち",
    labels: { platform: "プラットフォーム", target: "ターゲット", format: "フォーマット", brief: "Content-lab ブリーフ", rejectNote: "差し戻しメモ" },
  },
  ego: {
    title: "エゴサ", collect: "今すぐエゴサ", collecting: "収集中...",
    summary: { total: "合計", buzz: "バズ", neg: "ネガ", pos: "ポジ" },
    buzzTop: "🔥 バズ上位", all: "全件（スコア順）", empty: "「今すぐエゴサ」でデータを収集します",
  },
  feedback: {
    title: "ユーザーFB", desc: "アプリレビュー・SNS言及から収集したユーザーフィードバック",
    add: "+ 手動追加", unprocessedOnly: "未処理のみ", showProcessed: "処理済みを表示中",
    done: "対応済み", empty: "フィードバックがありません",
    form: { source: "ソース", type: "種別", importance: "重要度", content: "内容", author: "投稿者（任意）", url: "URL（任意）", submit: "追加", cancel: "キャンセル" },
  },
  frequency: {
    title: "投稿頻度レコメンド", desc: "エゴサと過去の仮説データをもとにAIが最適な投稿頻度を提案します",
    analyze: "AIに分析させる", analyzing: "分析中...", empty: "「AIに分析させる」でレコメンドを生成します",
    accept: "推奨通りに確定", adjust: "調整する", confirm: "この頻度で確定", cancel: "キャンセル",
    current: "現在", perWeek: "回/週", aiRec: "AI推奨", adjusted: "調整後",
    unconfirmed: "要確認", confirmed: "確認済み",
  },
  learnings: {
    title: "学習DB", desc: "仮説生成に注入される原則リスト。", valid: "件が有効。",
    synthesize: "差し戻しから合成", synthesizing: "合成中...", add: "+ 手動追加",
    activeOnly: "有効のみ", showAll: "無効を含む", edit: "編集", disable: "無効化",
    enable: "有効化", delete: "削除", save: "保存", cancel: "キャンセル",
    empty: "学びがまだありません", emptyDesc: "差し戻しが蓄積されたら「差し戻しから合成」でAIが原則を抽出します",
    types: { avoid: "やってはいけない", prioritize: "優先すべき", general: "一般原則" },
  },
};

const PT_BR: SnsTranslations = {
  nav: {
    dashboard: "Painel", hypotheses: "Hipóteses", ego: "Monitoramento",
    feedback: "Feedback", frequency: "Frequência", learnings: "Aprendizados",
    accounts: "Contas", settings: "Configurações", back: "← Voltar ao SNS",
    groups: { main: "Principal", pdca: "PDCA", config: "Configurações" },
  },
  dashboard: {
    title: "Painel", todo: "O que fazer agora", noTodo: "Nenhuma tarefa pendente",
    pdca: "Status do Ciclo PDCA", trends: "Tendências dos últimos 14 dias",
    frequency: "Recomendação de Frequência", emptyTitle: "Hipóteses são geradas automaticamente",
    emptyDesc: "Reposições automáticas às 8h e 20h com base na frequência recomendada",
    emptyLink: "Configurar frequência →", egoDetail: "Ver monitoramento →", freqDetail: "Detalhes e ajustes →",
    pending: "Hipóteses aguardando aprovação", unprocessed: "Feedbacks não processados", freqCheck: "Verificar frequência recomendada",
    pdcaCards: { ego: "Monitoramento", hypothesis: "Hipóteses", contentLab: "Enviado ao Content-lab", buzz: "Detecção viral" },
    pdcaSubs: {
      egoSub: (neg: number, pos: number) => `Últimos 7 dias: ${neg} neg / ${pos} pos`,
      hypoSub: (n: number) => `Aprovadas: ${n}`,
      briefSub: "Briefs enviados",
      buzzSub: "Últimos 7 dias",
    },
    egoNotRun: "Não executado",
  },
  hypotheses: {
    title: "Hipóteses", desc: "A IA gera hipóteses automaticamente. Aprove ou rejeite cada uma.",
    generate: "Gerar agora", generating: "Gerando...",
    status: { pending: "Aguardando aprovação", approved: "Aprovada", rejected: "Rejeitada", briefed: "Enviada ao Content-lab", posted: "Publicada", measured: "Medida" },
    empty_pending: "Nenhuma hipótese pendente. Clique em \"Gerar agora\".", empty: "Nenhuma hipótese encontrada",
    approve: "Aprovar", reject: "Rejeitar", send: "Enviar ao Content-lab", markPosted: "Marcar como publicada",
    rejectPlaceholder: "Motivo da rejeição (a IA usará isso nas próximas hipóteses)",
    submitReject: "Rejeitar", cancel: "Cancelar", pendingBadge: "em implementação",
    labels: { platform: "Plataforma", target: "Público-alvo", format: "Formato", brief: "Brief para Content-lab", rejectNote: "Motivo da rejeição" },
  },
  ego: {
    title: "Monitoramento", collect: "Monitorar agora", collecting: "Coletando...",
    summary: { total: "Total", buzz: "Viral", neg: "Negativo", pos: "Positivo" },
    buzzTop: "🔥 Mais virais", all: "Todos (por pontuação)", empty: "Clique em \"Monitorar agora\" para coletar dados",
  },
  feedback: {
    title: "Feedback", desc: "Feedbacks coletados de avaliações e menções nas redes sociais",
    add: "+ Adicionar manualmente", unprocessedOnly: "Apenas pendentes", showProcessed: "Exibindo processados",
    done: "Concluído", empty: "Nenhum feedback encontrado",
    form: { source: "Origem", type: "Tipo", importance: "Importância", content: "Conteúdo", author: "Autor (opcional)", url: "URL (opcional)", submit: "Adicionar", cancel: "Cancelar" },
  },
  frequency: {
    title: "Frequência de Postagem", desc: "A IA sugere a frequência ideal com base no monitoramento e hipóteses",
    analyze: "Analisar com IA", analyzing: "Analisando...", empty: "Clique em \"Analisar com IA\" para gerar recomendações",
    accept: "Confirmar recomendação", adjust: "Ajustar", confirm: "Confirmar esta frequência", cancel: "Cancelar",
    current: "Atual", perWeek: "x/semana", aiRec: "Recomendação IA", adjusted: "Ajustada",
    unconfirmed: "Pendente", confirmed: "Confirmada",
  },
  learnings: {
    title: "Aprendizados", desc: "Lista de princípios injetados na geração de hipóteses. ", valid: " ativos.",
    synthesize: "Sintetizar das rejeições", synthesizing: "Sintetizando...", add: "+ Adicionar manualmente",
    activeOnly: "Apenas ativos", showAll: "Incluir inativos", edit: "Editar", disable: "Desativar",
    enable: "Ativar", delete: "Excluir", save: "Salvar", cancel: "Cancelar",
    empty: "Nenhum aprendizado ainda", emptyDesc: "Quando houver rejeições acumuladas, use \"Sintetizar das rejeições\"",
    types: { avoid: "Evitar", prioritize: "Priorizar", general: "Princípio geral" },
  },
};

// ─── Vietnamese (vi) ──────────────────────────────────────────────────────────
const VI: SnsTranslations = {
  nav: {
    dashboard: "Bảng điều khiển", hypotheses: "Giả thuyết", ego: "Theo dõi",
    feedback: "Phản hồi", frequency: "Tần suất", learnings: "Kiến thức",
    accounts: "Tài khoản", settings: "Cài đặt", back: "← Quay lại SNS",
    groups: { main: "Chính", pdca: "PDCA", config: "Cài đặt" },
  },
  dashboard: {
    title: "Bảng điều khiển", todo: "Việc cần làm", noTodo: "Không có nhiệm vụ nào cần xử lý",
    pdca: "Trạng thái vòng PDCA", trends: "Xu hướng 14 ngày gần nhất",
    frequency: "Đề xuất tần suất đăng bài", emptyTitle: "Giả thuyết được tạo tự động",
    emptyDesc: "Tự động bổ sung lúc 8h và 20h theo tần suất đề xuất",
    emptyLink: "Cài đặt tần suất →", egoDetail: "Xem theo dõi →", freqDetail: "Chi tiết và điều chỉnh →",
    pending: "Giả thuyết chờ phê duyệt", unprocessed: "Phản hồi chưa xử lý", freqCheck: "Xem đề xuất tần suất",
    pdcaCards: { ego: "Theo dõi", hypothesis: "Giả thuyết", contentLab: "Gửi Content-lab", buzz: "Phát hiện viral" },
    pdcaSubs: {
      egoSub: (neg: number, pos: number) => `7 ngày: ${neg} tiêu cực / ${pos} tích cực`,
      hypoSub: (n: number) => `Đã duyệt: ${n}`,
      briefSub: "Đã gửi brief", buzzSub: "7 ngày gần nhất",
    },
    egoNotRun: "Chưa thực hiện",
  },
  hypotheses: {
    title: "Giả thuyết", desc: "AI tự động tạo giả thuyết. Hãy phê duyệt hoặc từ chối.",
    generate: "Tạo ngay", generating: "Đang tạo...",
    status: { pending: "Chờ phê duyệt", approved: "Đã duyệt", rejected: "Bị từ chối", briefed: "Đã gửi Content-lab", posted: "Đã đăng", measured: "Đã đo lường" },
    empty_pending: "Không có giả thuyết nào. Nhấn \"Tạo ngay\".", empty: "Không tìm thấy giả thuyết",
    approve: "Phê duyệt", reject: "Từ chối", send: "Gửi Content-lab", markPosted: "Đánh dấu đã đăng",
    rejectPlaceholder: "Lý do từ chối (AI sẽ dùng để cải thiện giả thuyết tiếp theo)",
    submitReject: "Từ chối", cancel: "Hủy", pendingBadge: "đang triển khai",
    labels: { platform: "Nền tảng", target: "Đối tượng mục tiêu", format: "Định dạng", brief: "Brief cho Content-lab", rejectNote: "Lý do từ chối" },
  },
  ego: {
    title: "Theo dõi", collect: "Theo dõi ngay", collecting: "Đang thu thập...",
    summary: { total: "Tổng", buzz: "Viral", neg: "Tiêu cực", pos: "Tích cực" },
    buzzTop: "🔥 Viral nhất", all: "Tất cả (theo điểm)", empty: "Nhấn \"Theo dõi ngay\" để thu thập dữ liệu",
  },
  feedback: {
    title: "Phản hồi", desc: "Phản hồi từ đánh giá và đề cập trên mạng xã hội",
    add: "+ Thêm thủ công", unprocessedOnly: "Chỉ chưa xử lý", showProcessed: "Đang hiển thị đã xử lý",
    done: "Hoàn thành", empty: "Không có phản hồi",
    form: { source: "Nguồn", type: "Loại", importance: "Mức độ quan trọng", content: "Nội dung", author: "Tác giả (tùy chọn)", url: "URL (tùy chọn)", submit: "Thêm", cancel: "Hủy" },
  },
  frequency: {
    title: "Tần suất đăng bài", desc: "AI đề xuất tần suất tối ưu dựa trên dữ liệu theo dõi",
    analyze: "Phân tích bằng AI", analyzing: "Đang phân tích...", empty: "Nhấn \"Phân tích bằng AI\" để tạo đề xuất",
    accept: "Xác nhận đề xuất", adjust: "Điều chỉnh", confirm: "Xác nhận tần suất này", cancel: "Hủy",
    current: "Hiện tại", perWeek: "lần/tuần", aiRec: "AI đề xuất", adjusted: "Đã điều chỉnh",
    unconfirmed: "Chờ xác nhận", confirmed: "Đã xác nhận",
  },
  learnings: {
    title: "Kiến thức", desc: "Danh sách nguyên tắc được đưa vào tạo giả thuyết. ", valid: " đang hoạt động.",
    synthesize: "Tổng hợp từ từ chối", synthesizing: "Đang tổng hợp...", add: "+ Thêm thủ công",
    activeOnly: "Chỉ đang hoạt động", showAll: "Bao gồm không hoạt động", edit: "Sửa", disable: "Tắt",
    enable: "Bật", delete: "Xóa", save: "Lưu", cancel: "Hủy",
    empty: "Chưa có kiến thức nào", emptyDesc: "Khi có đủ từ chối, dùng \"Tổng hợp từ từ chối\"",
    types: { avoid: "Tránh", prioritize: "Ưu tiên", general: "Nguyên tắc chung" },
  },
};

// ─── Indonesian (id) ──────────────────────────────────────────────────────────
const ID: SnsTranslations = {
  nav: {
    dashboard: "Dasbor", hypotheses: "Hipotesis", ego: "Pemantauan",
    feedback: "Umpan Balik", frequency: "Frekuensi", learnings: "Pembelajaran",
    accounts: "Akun", settings: "Pengaturan", back: "← Kembali ke SNS",
    groups: { main: "Utama", pdca: "PDCA", config: "Pengaturan" },
  },
  dashboard: {
    title: "Dasbor", todo: "Yang harus dilakukan", noTodo: "Tidak ada tugas yang perlu ditangani",
    pdca: "Status Siklus PDCA", trends: "Tren 14 hari terakhir",
    frequency: "Rekomendasi Frekuensi Posting", emptyTitle: "Hipotesis dibuat otomatis",
    emptyDesc: "Diisi ulang otomatis pukul 8 dan 20 sesuai frekuensi rekomendasi",
    emptyLink: "Atur frekuensi →", egoDetail: "Lihat pemantauan →", freqDetail: "Detail dan penyesuaian →",
    pending: "Hipotesis menunggu persetujuan", unprocessed: "Umpan balik belum diproses", freqCheck: "Cek rekomendasi frekuensi",
    pdcaCards: { ego: "Pemantauan", hypothesis: "Hipotesis", contentLab: "Kirim Content-lab", buzz: "Deteksi viral" },
    pdcaSubs: {
      egoSub: (neg: number, pos: number) => `7 hari: ${neg} negatif / ${pos} positif`,
      hypoSub: (n: number) => `Disetujui: ${n}`,
      briefSub: "Brief terkirim", buzzSub: "7 hari terakhir",
    },
    egoNotRun: "Belum dijalankan",
  },
  hypotheses: {
    title: "Hipotesis", desc: "AI membuat hipotesis secara otomatis. Setujui atau tolak.",
    generate: "Buat sekarang", generating: "Membuat...",
    status: { pending: "Menunggu persetujuan", approved: "Disetujui", rejected: "Ditolak", briefed: "Terkirim ke Content-lab", posted: "Diposting", measured: "Terukur" },
    empty_pending: "Tidak ada hipotesis. Klik \"Buat sekarang\".", empty: "Tidak ada hipotesis",
    approve: "Setujui", reject: "Tolak", send: "Kirim ke Content-lab", markPosted: "Tandai sudah diposting",
    rejectPlaceholder: "Alasan penolakan (AI akan menggunakan ini untuk hipotesis berikutnya)",
    submitReject: "Tolak", cancel: "Batal", pendingBadge: "dalam pengembangan",
    labels: { platform: "Platform", target: "Target audiens", format: "Format", brief: "Brief untuk Content-lab", rejectNote: "Alasan penolakan" },
  },
  ego: {
    title: "Pemantauan", collect: "Pantau sekarang", collecting: "Mengumpulkan...",
    summary: { total: "Total", buzz: "Viral", neg: "Negatif", pos: "Positif" },
    buzzTop: "🔥 Paling viral", all: "Semua (berdasarkan skor)", empty: "Klik \"Pantau sekarang\" untuk mengumpulkan data",
  },
  feedback: {
    title: "Umpan Balik", desc: "Umpan balik dari ulasan dan sebutan di media sosial",
    add: "+ Tambah manual", unprocessedOnly: "Hanya belum diproses", showProcessed: "Menampilkan sudah diproses",
    done: "Selesai", empty: "Tidak ada umpan balik",
    form: { source: "Sumber", type: "Jenis", importance: "Tingkat kepentingan", content: "Konten", author: "Penulis (opsional)", url: "URL (opsional)", submit: "Tambah", cancel: "Batal" },
  },
  frequency: {
    title: "Frekuensi Posting", desc: "AI menyarankan frekuensi optimal berdasarkan data pemantauan",
    analyze: "Analisis dengan AI", analyzing: "Menganalisis...", empty: "Klik \"Analisis dengan AI\" untuk rekomendasi",
    accept: "Konfirmasi rekomendasi", adjust: "Sesuaikan", confirm: "Konfirmasi frekuensi ini", cancel: "Batal",
    current: "Saat ini", perWeek: "x/minggu", aiRec: "Rekomendasi AI", adjusted: "Disesuaikan",
    unconfirmed: "Menunggu", confirmed: "Dikonfirmasi",
  },
  learnings: {
    title: "Pembelajaran", desc: "Daftar prinsip yang dimasukkan ke pembuatan hipotesis. ", valid: " aktif.",
    synthesize: "Sintesis dari penolakan", synthesizing: "Mensintesis...", add: "+ Tambah manual",
    activeOnly: "Hanya aktif", showAll: "Termasuk tidak aktif", edit: "Edit", disable: "Nonaktifkan",
    enable: "Aktifkan", delete: "Hapus", save: "Simpan", cancel: "Batal",
    empty: "Belum ada pembelajaran", emptyDesc: "Gunakan \"Sintesis dari penolakan\" saat ada cukup penolakan",
    types: { avoid: "Hindari", prioritize: "Prioritaskan", general: "Prinsip umum" },
  },
};

// ─── Bengali / Bangladesh (bn) ────────────────────────────────────────────────
const BN: SnsTranslations = {
  nav: {
    dashboard: "ড্যাশবোর্ড", hypotheses: "অনুমান", ego: "মনিটরিং",
    feedback: "মতামত", frequency: "পোস্টের ফ্রিকোয়েন্সি", learnings: "শিক্ষা",
    accounts: "অ্যাকাউন্ট", settings: "সেটিংস", back: "← SNS-এ ফিরুন",
    groups: { main: "প্রধান", pdca: "PDCA", config: "সেটিংস" },
  },
  dashboard: {
    title: "ড্যাশবোর্ড", todo: "এখন কী করতে হবে", noTodo: "কোনো সক্রিয় কাজ নেই",
    pdca: "PDCA সাইকেলের অবস্থা", trends: "গত ১৪ দিনের ট্রেন্ড",
    frequency: "পোস্টের ফ্রিকোয়েন্সি সুপারিশ", emptyTitle: "অনুমান স্বয়ংক্রিয়ভাবে তৈরি হয়",
    emptyDesc: "সকাল ৮টা ও রাত ৮টায় স্বয়ংক্রিয়ভাবে পূরণ হয়",
    emptyLink: "ফ্রিকোয়েন্সি সেট করুন →", egoDetail: "মনিটরিং দেখুন →", freqDetail: "বিস্তারিত ও সামঞ্জস্য →",
    pending: "অনুমোদনের অপেক্ষায় অনুমান", unprocessed: "অপ্রক্রিয়াকৃত মতামত", freqCheck: "ফ্রিকোয়েন্সি সুপারিশ দেখুন",
    pdcaCards: { ego: "মনিটরিং", hypothesis: "অনুমান", contentLab: "Content-lab পাঠানো", buzz: "ভাইরাল সনাক্তকরণ" },
    pdcaSubs: {
      egoSub: (neg: number, pos: number) => `৭ দিন: ${neg} নেতিবাচক / ${pos} ইতিবাচক`,
      hypoSub: (n: number) => `অনুমোদিত: ${n}`,
      briefSub: "ব্রিফ পাঠানো হয়েছে", buzzSub: "গত ৭ দিন",
    },
    egoNotRun: "চালানো হয়নি",
  },
  hypotheses: {
    title: "অনুমান", desc: "AI স্বয়ংক্রিয়ভাবে অনুমান তৈরি করে। অনুমোদন বা প্রত্যাখ্যান করুন।",
    generate: "এখনই তৈরি করুন", generating: "তৈরি হচ্ছে...",
    status: { pending: "অনুমোদনের অপেক্ষায়", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত", briefed: "Content-lab-এ পাঠানো", posted: "পোস্ট করা হয়েছে", measured: "পরিমাপ করা হয়েছে" },
    empty_pending: "কোনো অনুমান নেই। \"এখনই তৈরি করুন\" ক্লিক করুন।", empty: "কোনো অনুমান পাওয়া যায়নি",
    approve: "অনুমোদন করুন", reject: "প্রত্যাখ্যান করুন", send: "Content-lab-এ পাঠান", markPosted: "পোস্ট করা হিসেবে চিহ্নিত করুন",
    rejectPlaceholder: "প্রত্যাখ্যানের কারণ (AI পরবর্তী অনুমানে ব্যবহার করবে)",
    submitReject: "প্রত্যাখ্যান করুন", cancel: "বাতিল", pendingBadge: "বাস্তবায়নাধীন",
    labels: { platform: "প্ল্যাটফর্ম", target: "লক্ষ্য দর্শক", format: "ফরম্যাট", brief: "Content-lab-এর জন্য ব্রিফ", rejectNote: "প্রত্যাখ্যানের কারণ" },
  },
  ego: {
    title: "মনিটরিং", collect: "এখনই মনিটর করুন", collecting: "সংগ্রহ করা হচ্ছে...",
    summary: { total: "মোট", buzz: "ভাইরাল", neg: "নেতিবাচক", pos: "ইতিবাচক" },
    buzzTop: "🔥 সবচেয়ে ভাইরাল", all: "সব (স্কোর অনুযায়ী)", empty: "ডেটা সংগ্রহ করতে \"এখনই মনিটর করুন\" ক্লিক করুন",
  },
  feedback: {
    title: "মতামত", desc: "রিভিউ ও সোশ্যাল মিডিয়া উল্লেখ থেকে সংগৃহীত মতামত",
    add: "+ ম্যানুয়ালি যোগ করুন", unprocessedOnly: "শুধু অপ্রক্রিয়াকৃত", showProcessed: "প্রক্রিয়াকৃত দেখাচ্ছে",
    done: "সম্পন্ন", empty: "কোনো মতামত নেই",
    form: { source: "উৎস", type: "ধরন", importance: "গুরুত্ব", content: "বিষয়বস্তু", author: "লেখক (ঐচ্ছিক)", url: "URL (ঐচ্ছিক)", submit: "যোগ করুন", cancel: "বাতিল" },
  },
  frequency: {
    title: "পোস্টের ফ্রিকোয়েন্সি", desc: "AI মনিটরিং ডেটার উপর ভিত্তি করে সর্বোত্তম ফ্রিকোয়েন্সি সুপারিশ করে",
    analyze: "AI দিয়ে বিশ্লেষণ করুন", analyzing: "বিশ্লেষণ করা হচ্ছে...", empty: "সুপারিশ পেতে \"AI দিয়ে বিশ্লেষণ করুন\" ক্লিক করুন",
    accept: "সুপারিশ নিশ্চিত করুন", adjust: "সামঞ্জস্য করুন", confirm: "এই ফ্রিকোয়েন্সি নিশ্চিত করুন", cancel: "বাতিল",
    current: "বর্তমান", perWeek: "বার/সপ্তাহ", aiRec: "AI সুপারিশ", adjusted: "সামঞ্জস্যকৃত",
    unconfirmed: "অপেক্ষমাণ", confirmed: "নিশ্চিত",
  },
  learnings: {
    title: "শিক্ষা", desc: "অনুমান তৈরিতে ব্যবহৃত নীতির তালিকা। ", valid: " টি সক্রিয়।",
    synthesize: "প্রত্যাখ্যান থেকে সংশ্লেষণ", synthesizing: "সংশ্লেষণ করা হচ্ছে...", add: "+ ম্যানুয়ালি যোগ করুন",
    activeOnly: "শুধু সক্রিয়", showAll: "নিষ্ক্রিয় সহ", edit: "সম্পাদনা", disable: "নিষ্ক্রিয় করুন",
    enable: "সক্রিয় করুন", delete: "মুছুন", save: "সংরক্ষণ করুন", cancel: "বাতিল",
    empty: "এখনো কোনো শিক্ষা নেই", emptyDesc: "পর্যাপ্ত প্রত্যাখ্যান জমা হলে \"প্রত্যাখ্যান থেকে সংশ্লেষণ\" ব্যবহার করুন",
    types: { avoid: "এড়িয়ে চলুন", prioritize: "অগ্রাধিকার দিন", general: "সাধারণ নীতি" },
  },
};

const TRANSLATIONS: Record<string, SnsTranslations> = { ja: JA, "pt-BR": PT_BR, vi: VI, id: ID, bn: BN };

export function getSnsT(locale: string): SnsTranslations {
  return TRANSLATIONS[locale] ?? JA;
}
