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
    // Return mock data if no API key is provided
    const data: ComparisonResult = {
      analyses: tickers.map(ticker => ({
        ticker: ticker.toUpperCase(),
        meaning: `This company (${ticker.toUpperCase()}) provides essential services that are easily understood by the average investor.`,
        moat: "Strong competitive advantage through brand recognition and high switching costs.",
        management: "Experienced leadership with a clear vision and history of integrity.",
        isWonderful: true,
        riskScore: 3,
        summary: "A solid Rule No. 1 candidate with predictable growth and a wide moat."
      })),
      winnerTicker: tickers[0].toUpperCase(),
      comparisonSummary: `Both companies are high-quality, but ${tickers[0].toUpperCase()} shows slightly better moat durability and management transparency in recent filings.`
    };

    return { success: true, data };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Perform a side-by-side comparison of the following company tickers based on Phil Town's "Rule No. 1" investment principles: ${tickers.join(", ")}.

      Provide your analysis in JSON format with the following structure:
      {
        "analyses": [
          {
            "ticker": "The stock ticker",
            "meaning": "Brief description of business clarity",
            "moat": "Analysis of competitive advantage",
            "management": "Evaluation of leadership",
            "isWonderful": boolean,
            "riskScore": number (1-10),
            "summary": "Final summary of business quality"
          }
        ],
        "winnerTicker": "The ticker of the company that best fits Rule No. 1 criteria",
        "comparisonSummary": "A summary explaining why the winner was chosen and key takeaways from the comparison"
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
