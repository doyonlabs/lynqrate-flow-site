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
  pass: {
    name: string | null;
    total_uses: number | null;
  } | null;
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

// 최근 5건(오늘+과거4건)용 타입
export type RecentEntry = {
  entry_datetime: string;
  standard_emotion: string;
  standard_emotion_color: string | null;
  situation_text: string;
  journal_text: string;
};

// 차트용 데이터(이미 있다면 재사용)
export type EntryForStats = {
  entry_datetime: string;
  standard_emotion: string;
  color_code?: string | null;
};

export type CarryoverMeta = {
  pass_name: string | null;
  generated_at: string | null;
};

export interface EmotionDistributionItem {
  emotion_id: string;
  label: string;
  color: string | null;
  count: number;
}

// 기존 인터페이스에 필드 추가
export interface FeedbackApiResponse {
  ok: boolean;
  data: {
    uuid_code: string;
    remaining_uses: number;
    total_uses: number;
    expires_at: string | null;
    status_label: string;
    prev_linked: boolean;
    pass_name: string | null;

    revisit_code?: string | null;
    revisit_expires_at?: string | null;

    // 오늘 기록 카드(기존)
    entries: Array<{
      entry_datetime: string;
      standard_emotion: string;
      standard_emotion_color: string | null;
      standard_emotion_desc: string | null;
      situation_summary: string;
      journal_summary: string;
      feedback_text: string;
    }>;

    // 직전 패스 carryover(기존)
    carryover_digest: string;

    carryover_meta?: CarryoverMeta | null;

    // ✅ 새로 추가 (UI에서 사용자 기록 보여주기)
    recent_entries?: RecentEntry[];

    // ✅ 차트용(이미 쓰고 있다면 타입 명시)
    entries_for_stats?: EntryForStats[];

    emotion_distribution: EmotionDistributionItem[];

    // 기존에 남겨둔 필드가 있으면 유지/정리
    carryover_digests?: Array<{ digest_text: string; entry_no: number | null; updated_at: string }>;
    insights?: Array<{ k: string; v: string }>;
  };
}