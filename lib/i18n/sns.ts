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

const TRANSLATIONS: Record<string, SnsTranslations> = { ja: JA, "pt-BR": PT_BR };

export function getSnsT(locale: string): SnsTranslations {
  return TRANSLATIONS[locale] ?? JA;
}
