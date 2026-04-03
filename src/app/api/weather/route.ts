import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WEATHER_DESCRIPTIONS: Record<number, { label: string; emoji: string }> = {
  0: { label: "Céu limpo", emoji: "☀️" },
  1: { label: "Predominantemente limpo", emoji: "🌤️" },
  2: { label: "Parcialmente nublado", emoji: "⛅" },
  3: { label: "Nublado", emoji: "☁️" },
  45: { label: "Neblina", emoji: "🌫️" },
  48: { label: "Neblina gelada", emoji: "🌫️" },
  51: { label: "Garoa leve", emoji: "🌦️" },
  53: { label: "Garoa", emoji: "🌦️" },
  55: { label: "Garoa forte", emoji: "🌧️" },
  61: { label: "Chuva leve", emoji: "🌧️" },
  63: { label: "Chuva", emoji: "🌧️" },
  65: { label: "Chuva forte", emoji: "⛈️" },
  80: { label: "Pancadas leves", emoji: "🌦️" },
  81: { label: "Pancadas", emoji: "🌧️" },
  82: { label: "Pancadas fortes", emoji: "⛈️" },
  95: { label: "Tempestade", emoji: "⛈️" },
};

export async function GET() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=28.16&longitude=-81.60&current=temperature_2m,relative_humidity_2m,weather_code,apparent_temperature&timezone=America/New_York",
      { next: { revalidate: 300 } } // cache 5 min
    );
    const data = await res.json();
    const current = data.current;
    const weatherInfo = WEATHER_DESCRIPTIONS[current.weather_code] || {
      label: "Desconhecido",
      emoji: "🌡️",
    };

    return NextResponse.json({
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      description: weatherInfo.label,
      emoji: weatherInfo.emoji,
      location: "Davenport, FL",
    });
  } catch {
    return NextResponse.json(
      { temperature: null, error: "Failed to fetch weather" },
      { status: 500 }
    );
  }
}
