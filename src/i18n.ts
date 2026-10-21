export type Lang = 'ko' | 'en';

const ko = {
  'cond.clear': '맑음',
  'cond.partlyCloudy': '구름 조금',
  'cond.cloudy': '흐림',
  'cond.fog': '안개',
  'cond.drizzle': '이슬비',
  'cond.rain': '비',
  'cond.snow': '눈',
  'cond.thunder': '뇌우',
  'cmp.same': '어제와 비슷해요',
  'cmp.warmer': '어제보다 {d}° 따뜻해요',
  'cmp.cooler': '어제보다 {d}° 쌀쌀해요',
  'label.today': 'TODAY',
  'label.yesterday': 'YESTERDAY',
  'label.yday': '어제',
  'label.todayCol': '오늘',
  'label.myLocation': '내 위치',
  'label.currentPlace': '현재 위치',
  'label.updated': '마지막 갱신 {time}',
  'err.unavailable': '날씨를 불러오지 못했어요',
  'action.retry': '다시 시도',
  'cities.title': '지역',
  'cities.search': '도시 검색',
  'aria.tempChart': '오늘 최고 {max}° {maxH}시, 최저 {min}° {minH}시',
} as const;

export type StringKey = keyof typeof ko;

const en: Record<StringKey, string> = {
  'cond.clear': 'Clear',
  'cond.partlyCloudy': 'Partly Cloudy',
  'cond.cloudy': 'Cloudy',
  'cond.fog': 'Fog',
  'cond.drizzle': 'Drizzle',
  'cond.rain': 'Rain',
  'cond.snow': 'Snow',
  'cond.thunder': 'Thunderstorm',
  'cmp.same': 'Same as yesterday.',
  'cmp.warmer': '{d}° warmer than yesterday.',
  'cmp.cooler': '{d}° cooler than yesterday.',
  'label.today': 'TODAY',
  'label.yesterday': 'YESTERDAY',
  'label.yday': "Y'day",
  'label.todayCol': 'Today',
  'label.myLocation': 'You',
  'label.currentPlace': 'Current location',
  'label.updated': 'Updated {time}',
  'err.unavailable': "Couldn't load the weather",
  'action.retry': 'Retry',
  'cities.title': 'Places',
  'cities.search': 'Search city',
  'aria.tempChart': 'Today high {max}° at {maxH}:00, low {min}° at {minH}:00',
};

const dict: Record<Lang, Record<StringKey, string>> = { ko, en };

export function detectLang(navLang: string): Lang {
  return navLang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function t(lang: Lang, key: StringKey, vars: Record<string, string | number> = {}): string {
  return dict[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}
