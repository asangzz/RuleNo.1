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
  const tickerList = tickers.map(t => t.toUpperCase()).join(", ");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Return mock data if no API key is provided
    const mockData: ComparisonResult = {
      analyses: tickers.map(ticker => ({
        ticker: ticker.toUpperCase(),
        meaning: `A complex but dominant player in the ${ticker} sector.`,
        moat: "Strong network effects and brand recognition.",
        management: "Reliable management team with a focus on long-term growth.",
        isWonderful: true,
        riskScore: 3,
        summary: "A solid business with strong fundamentals and a clear path forward."
      })),
      winner: tickers[0].toUpperCase(),
      reasoning: `Based on a side-by-side comparison, ${tickers[0].toUpperCase()} shows slightly better moat protection and management stability.`
    };
    return { success: true, data: mockData };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Compare the following company tickers based on Phil Town's "Rule No. 1" investment principles: ${tickerList}.

      Provide a side-by-side analysis in JSON format with the following structure:
      {
        "analyses": [
          {
            "ticker": "TICKER",
            "meaning": "Description of business understanding",
            "moat": "Analysis of competitive advantage",
            "management": "Evaluation of leadership",
            "isWonderful": boolean,
            "riskScore": number (1-10),
            "summary": "Business quality summary"
          }
        ],
        "winner": "TICKER",
        "reasoning": "Detailed explanation of why this company is the Rule No. 1 winner among the choices"
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
      const data = JSON.parse(jsonStr) as ComparisonResult;
      return { success: true, data };
    } else {
      throw new Error("Could not find JSON in AI response");
    }
  } catch (error) {
    console.error("AI Comparison Error:", error);
    return { success: false, error: "Failed to compare businesses. Please try again later." };
  }
}
