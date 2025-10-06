const n = (k: string, d: number) => Number(process.env[k] ?? d);

export const RLP = {
  // 운영 기준 보수적 기본값
  short:  { win: 60_000,   client: n('RL_REVISIT_PER_MIN',   5)  }, // 1분 5회 (IP+UA)
  medium: { win: 3_600_000, user:   n('RL_REVISIT_PER_HOUR', 10) }, // 1시간 10회 (user/email)
  daily:  { win: 86_400_000, user:  n('RL_REVISIT_PER_DAY',  20) }, // 24시간 20회
  code:   { win: 60_000,   per:     n('RL_CODE_PER_MIN',     10) }, // 같은 코드 보호
};