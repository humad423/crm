import { NextResponse } from 'next/server';
import { Holiday } from '../../../types/salary';

// Static fallback for 2026 Turkish Public Holidays (including religious feast dates calculated for 2026)
const STATIC_2026_HOLIDAYS: Holiday[] = [
  { date: '2026-01-01', name: "New Year's Day", localName: 'Yılbaşı' },
  { date: '2026-04-23', name: 'National Sovereignty and Children\'s Day', localName: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { date: '2026-05-01', name: 'Labor and Solidarity Day', localName: 'Emek ve Dayanışma Günü' },
  { date: '2026-05-19', name: 'Commemoration of Atatürk, Youth and Sports Day', localName: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { date: '2026-07-15', name: 'Democracy and National Unity Day', localName: 'Demokrasi ve Milli Birlik Günü' },
  { date: '2026-08-30', name: 'Victory Day', localName: 'Zafer Bayramı' },
  { date: '2026-10-29', name: 'Republic Day', localName: 'Cumhuriyet Bayramı' },
  
  // Ramadan Feast 2026 (Ramazan Bayramı)
  { date: '2026-03-20', name: 'Ramadan Feast Day 1', localName: 'Ramazan Bayramı 1. Gün' },
  { date: '2026-03-21', name: 'Ramadan Feast Day 2', localName: 'Ramazan Bayramı 2. Gün' },
  { date: '2026-03-22', name: 'Ramadan Feast Day 3', localName: 'Ramazan Bayramı 3. Gün' },

  // Sacrifice Feast 2026 (Kurban Bayramı)
  { date: '2026-05-27', name: 'Sacrifice Feast Day 1', localName: 'Kurban Bayramı 1. Gün' },
  { date: '2026-05-28', name: 'Sacrifice Feast Day 2', localName: 'Kurban Bayramı 2. Gün' },
  { date: '2026-05-29', name: 'Sacrifice Feast Day 3', localName: 'Kurban Bayramı 3. Gün' },
  { date: '2026-05-30', name: 'Sacrifice Feast Day 4', localName: 'Kurban Bayramı 4. Gün' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || '2026';
  const apiKey = searchParams.get('apiKey') || '';

  let holidays: Holiday[] = [];

  // Attempt Google Calendar API if API Key is configured
  if (apiKey) {
    try {
      const calendarId = 'tr.turkish#holiday@group.v.calendar.google.com';
      const timeMin = `${year}-01-01T00:00:00Z`;
      const timeMax = `${year}-12-31T23:59:59Z`;
      const googleApiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=100`;

      const response = await fetch(googleApiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          holidays = data.items.map((item: any) => {
            const date = item.start?.date || '';
            const summary = item.summary || 'Public Holiday';
            return {
              date,
              name: summary,
              localName: summary, // Google Calendar returns localized name based on calendar ID
            };
          });

          // Sort holidays chronologically
          holidays.sort((a, b) => a.date.localeCompare(b.date));
          return NextResponse.json({ source: 'google_calendar', holidays });
        }
      }
    } catch (error) {
      console.error('Google Calendar API Error:', error);
    }
  }

  // Fallback 1: Nager.Date Public Holidays API (Free, no key required)
  try {
    const fallbackUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/TR`;
    const response = await fetch(fallbackUrl);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        holidays = data.map((item: any) => ({
          date: item.date,
          name: item.name,
          localName: item.localName,
        }));
        return NextResponse.json({ source: 'nager_date_api', holidays });
      }
    }
  } catch (error) {
    console.error('Nager Date API Fallback Error:', error);
  }

  // Fallback 2: Local Static data for 2026 (guarantees offline availability)
  if (year === '2026') {
    return NextResponse.json({ source: 'static_fallback', holidays: STATIC_2026_HOLIDAYS });
  }

  // If other year and no network, generate basic standard Turkish holidays dynamically
  const basicHolidays: Holiday[] = [
    { date: `${year}-01-01`, name: "New Year's Day", localName: 'Yılbaşı' },
    { date: `${year}-04-23`, name: 'National Sovereignty and Children\'s Day', localName: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { date: `${year}-05-01`, name: 'Labor and Solidarity Day', localName: 'Emek ve Dayanışma Günü' },
    { date: `${year}-05-19`, name: 'Commemoration of Atatürk, Youth and Sports Day', localName: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
    { date: `${year}-07-15`, name: 'Democracy and National Unity Day', localName: 'Demokrasi ve Milli Birlik Günü' },
    { date: `${year}-08-30`, name: 'Victory Day', localName: 'Zafer Bayramı' },
    { date: `${year}-10-29`, name: 'Republic Day', localName: 'Cumhuriyet Bayramı' },
  ];

  return NextResponse.json({ source: 'basic_fallback', holidays: basicHolidays });
}
