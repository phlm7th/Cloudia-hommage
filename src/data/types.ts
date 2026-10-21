export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
  isCurrent?: boolean;
}

export interface HourPoint {
  hour: number;
  temp: number | null;
  code: number | null;
  cloud: number | null;
  wind: number | null;
  pop: number | null;
}

export interface DayPoint {
  date: string;
  max: number | null;
  min: number | null;
  code: number | null;
  sunrise: string | null;
  sunset: string | null;
  moonPhase: number | null;
}

export interface WeatherData {
  timezone: string;
  utcOffsetSeconds: number;
  fetchedAt: number;
  stale: boolean;
  /** 24 entries, hour 0..23 (location local time) */
  yesterday: HourPoint[];
  /** 24 entries, hour 0..23 (location local time) */
  today: HourPoint[];
  /** [0]=yesterday, [1]=today, [2..5]=next 4 days */
  days: DayPoint[];
}
