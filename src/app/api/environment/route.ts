import { NextResponse } from "next/server";

type EnvironmentPayload = {
  city?: string;
  state?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as EnvironmentPayload;
  const city = body.city?.trim();
  const state = body.state?.trim();
  if (!city || !state) {
    return NextResponse.json({ error: "City and state are required." }, { status: 400 });
  }
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      location: `${city}, ${state}`,
      temperatureF: null,
      humidityPct: null,
      elevationFt: null,
      note: "OPENWEATHER_API_KEY not configured.",
    });
  }

  const geoResponse = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      `${city},${state}`
    )}&limit=1&appid=${apiKey}`
  );
  const geoData = (await geoResponse.json()) as Array<{ lat: number; lon: number }>;
  if (!geoData[0]) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }
  const { lat, lon } = geoData[0];

  const weatherResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
  );
  const weatherData = (await weatherResponse.json()) as {
    main?: { temp?: number; humidity?: number };
  };

  return NextResponse.json({
    location: `${city}, ${state}`,
    temperatureF: weatherData.main?.temp ?? null,
    humidityPct: weatherData.main?.humidity ?? null,
    elevationFt: null,
  });
}
