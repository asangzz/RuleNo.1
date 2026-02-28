"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ComparisonResult } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function analyzeBusiness(ticker: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Return mock data if no API key is provided
    return {
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        meaning: "This company provides essential digital services and hardware that are deeply integrated into consumer lives.",
        moat: "Strong brand loyalty, ecosystem lock-in, and proprietary technology (Secret).",
        management: "Experienced leadership with a track record of capital allocation and innovation.",
        isWonderful: true,
        riskScore: 2, // 1-10
        summary: "A high-quality business with a sustainable competitive advantage and strong financials."
      }
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Analyze the following company ticker based on Phil Town's "Rule No. 1" investment principles: ${ticker}.

      Provide your analysis in JSON format with the following keys:
      - ticker: The stock ticker.
      - meaning: A brief description of whether the business is easy to understand.
      - moat: Analysis of the company's competitive advantage (Brand, Secret, Toll Bridge, Switching, or Price).
      - management: Evaluation of the leadership and their integrity/talent.
      - isWonderful: Boolean indicating if it qualifies as a "Wonderful Business".
      - riskScore: A number from 1 to 10 (1 being lowest risk).
      - summary: A final summary of the business quality.

      Return ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON as per memory instructions
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonStr);
      return { success: true, data };
    } else {
      throw new Error("Could not find JSON in AI response");
    }
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { success: false, error: "Failed to analyze business. Please try again later." };
  }
}

export async function compareBusinesses(tickers: string[]) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Return mock comparison data if no API key is provided
    const data: ComparisonResult = {
      businesses: tickers.map((t, i) => ({
        ticker: t.toUpperCase(),
        meaning: `Mock analysis for ${t}. This business has a clear model.`,
        moat: i === 0 ? "Strong economic moat with high switching costs." : "Moderate moat with some brand recognition.",
        management: "Competent management with good capital allocation history.",
        isWonderful: true,
        riskScore: i === 0 ? 2 : 4,
        summary: `${t} is a solid Rule No. 1 candidate.`
      })),
      winnerTicker: tickers[0].toUpperCase(),
      comparisonSummary: `Comparing ${tickers.join(", ")}, ${tickers[0]} stands out as the superior 'Wonderful Business' due to its stronger moat and lower risk profile.`
    };
    return { success: true, data };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Compare the following company tickers based on Phil Town's "Rule No. 1" investment principles: ${tickers.join(", ")}.

      Provide your comparison in JSON format with the following structure:
      {
        "businesses": [
          {
            "ticker": "The stock ticker",
            "meaning": "Brief description of understanding the business",
            "moat": "Analysis of competitive advantage",
            "management": "Evaluation of leadership",
            "isWonderful": boolean,
            "riskScore": number (1-10),
            "summary": "Individual summary"
          }
        ],
        "winnerTicker": "The ticker of the best business among them according to Rule No. 1",
        "comparisonSummary": "A summary explaining why the winner was chosen and how they compare."
      }

      Return ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      const data: ComparisonResult = JSON.parse(jsonStr);
      return { success: true, data };
    } else {
      throw new Error("Could not find JSON in AI response");
    }
  } catch (error) {
    console.error("AI Comparison Error:", error);
    return { success: false, error: "Failed to compare businesses. Please try again later." };
  }
}
