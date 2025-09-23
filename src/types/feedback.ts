// src/types/feedback.ts

/** 개별 감정 기록 */
export interface EmotionEntryLite {
  id: string;
  user_pass_id: string | null;
  standard_emotion_id: string | null;
  created_at: string;
  situation_summary_text: string | null;
  journal_summary_text: string | null;
}

/** 조인된 이용권 정보 */
export interface UserPassWithName {
  uuid_code: string;
  remaining_uses: number | null;
  expires_at: string | null;
  prev_pass_id: string | null;
  is_active: boolean;
  pass: { name: string } | null; // passes.name 조인
}

/** 누적 요약 */
export interface PassRollupDigest {
  digest_text: string;
  updated_at: string;
}

/** 피드백 */
export interface EmotionFeedback {
  id: string;
  feedback_text: string;
  created_at: string;
  user_pass_id: string;
}

/** 최종 응답 스키마 */
// src/types/feedback.ts

export interface FeedbackApiResponse {
  ok: boolean;
  data: {
    // ─ Pass 메타 ─
    uuid_code: string;
    remaining_uses: number;
    total_uses: number;                 // ← 누락돼 있으면 추가
    expires_at: string | null;
    status_label: string;
    prev_linked: boolean;
    pass_name: string | null;

    // ─ 개별 피드백 카드용 ─
    entries: {
      entry_datetime: string;
      standard_emotion: string;
      standard_emotion_color?: string | null;  // DB color_code
      standard_emotion_desc?: string | null;   // DB description
      situation_summary: string;
      journal_summary: string | null;
      feedback_text: string;
    }[];

    // ─ 누적 리포트 ─
    carryover_digest: string;  // 최종본(analysis_requests.stats_json.carryover_digest)
    carryover_digests?: {      // 진행 중 최근 N건(pass_rollup_digests)
      digest_text: string;
      entry_no: number | null;
      updated_at: string;
    }[];

    // ─ 차트용 누적 엔트리(옵션) ─
    entries_for_stats?: {
      entry_datetime: string;
      standard_emotion: string;
      color_code?: string | null;       // 차트 색 쓰려면
    }[];

    // ─ 인사이트 ─
    insights: { k: string; v: string }[];
  };
}