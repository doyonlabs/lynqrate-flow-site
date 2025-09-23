export function buildMockData() {
  return {
    uuid_code:'AB12-9KQ', remaining_uses:7, total_uses:10, expires_at:'2025-09-20',
    status_label:'진행 중', prev_linked:true,
    entries:[
      { entry_datetime:'2025-08-22T10:12:00+09:00', standard_emotion:'불안',
        situation_summary:'회의 전부터 심장이 빨리 뛰었다.',
        feedback_text:'오늘 컨디션을 잘 버텨냈어. 회의 전 60초 호흡 루틴이 네게 맞았던 순간이 있었지. 내일도 같은 시간대에 같은 루틴을 가볍게 반복해보면 리듬을 되찾는 데 도움이 될 거야.' },
      { entry_datetime:'2025-08-21T17:41:00+09:00', standard_emotion:'피로',
        situation_summary:'퇴근길엔 머리가 멍했다.',
        feedback_text:'바쁜 하루였다. 저녁에 20분 산책과 가벼운 스트레칭이 다음 날 집중을 도와줬던 패턴이 있었어. 오늘도 같은 리듬으로 마무리해 보자.' },
    ],
    carryover_digest:'최근 10회 기록을 묶어 보면, 오후 6–8시에 긴장이 반복된다.\n저녁 일정 전 10분 산책과 60초 호흡을 붙였을 때 다음 날 컨디션이 안정적이었다.\n같은 루틴을 같은 시간대에 짧게 유지하는 전략이 잘 맞는다.',
    insights:[
      { k:'최빈 감정', v:'불안 (7회)' }, { k:'강도 상승', v:'오후 6~8시 ↑' },
      { k:'회복 트리거', v:'산책 후 안정' }, { k:'주의 음식', v:'밀가루 섭취 후 악화' },
    ],
  };
}