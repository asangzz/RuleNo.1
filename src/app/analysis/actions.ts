"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult, ComparisonResult } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function analyzeBusiness(ticker: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Return mock data if no API key is provided
    return {
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        meaning: `The business model for ${ticker.toUpperCase()} is well-established and essential in its target market.`,
        moat: "Strong economic moat driven by brand loyalty and high switching costs.",
        management: "Experienced leadership team with a clear focus on long-term value creation.",
        managementScore: 8,
        isWonderful: true,
        riskScore: 3, // 1-10
        summary: "A wonderful business with consistent performance and a solid competitive position."
      } as AnalysisResult
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
      - managementScore: A number from 1 to 10 (10 being best leadership).
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
      const data = JSON.parse(jsonStr) as AnalysisResult;
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
  const tickerStr = tickers.join(", ");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Return mock data if no API key is provided
    const mockComparisons: AnalysisResult[] = tickers.map((ticker, index) => ({
      ticker: ticker.toUpperCase(),
      meaning: `Core business model for ${ticker} is well-established in its industry.`,
      moat: index === 0 ? "Wide economic moat with strong brand recognition." : "Moderate moat with some competitive pressure.",
      management: "Proven leadership team with long-term strategic vision.",
      managementScore: index === 0 ? 9 : 6,
      isWonderful: index === 0,
      riskScore: index === 0 ? 2 : 4,
      summary: `${ticker} represents a ${index === 0 ? "solid" : "fair"} investment opportunity under Rule No. 1.`
    }));

    return {
      success: true,
      data: {
        comparisons: mockComparisons,
        winnerTicker: tickers[0].toUpperCase(),
        winnerReasoning: `${tickers[0].toUpperCase()} is the clear winner due to its superior moat and lower risk score compared to ${tickers.slice(1).join(", ")}.`
      } as ComparisonResult
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Perform a side-by-side comparison of the following companies based on Phil Town's "Rule No. 1" investment principles: ${tickerStr}.

      Provide your analysis in JSON format with the following structure:
      {
        "comparisons": [
          {
            "ticker": "TICKER",
            "meaning": "Meaning analysis...",
            "moat": "Moat analysis...",
            "management": "Management analysis...",
            "managementScore": 1-10,
            "isWonderful": true/false,
            "riskScore": 1-10,
            "summary": "Brief summary..."
          },
          ...
        ],
        "winnerTicker": "TICKER",
        "winnerReasoning": "Detailed reasoning why this ticker is the best 'Rule No. 1' candidate among those compared."
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
