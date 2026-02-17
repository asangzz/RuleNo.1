import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/business.dart';

class AiService {
  final String apiKey;
  late final GenerativeModel _model;

  AiService({required this.apiKey}) {
    _model = GenerativeModel(
      model: 'gemini-1.5-pro-latest',
      apiKey: apiKey,
    );
  }

  Future<Business> analyzeBusiness(String symbol) async {
    final prompt = '''
    Analyze the company with stock symbol "$symbol" based on Rule No. 1 investing principles.
    Provide the following data in valid JSON format:
    {
      "name": "Full Company Name",
      "symbol": "$symbol",
      "meaningScore": 0.0-1.0,
      "moatScore": 0.0-1.0,
      "managementScore": 0.0-1.0,
      "stickerPrice": current sticker price estimate,
      "marginOfSafetyPrice": sticker price / 2,
      "currentPrice": current stock price,
      "eps": current trailing twelve months EPS,
      "peRatio": historical average PE ratio,
      "estimatedGrowthRate": estimated 10-year growth rate (0.0-1.0),
      "roic": 10-year average ROIC (0.0-1.0),
      "equityGrowthRate": 10-year average equity growth (0.0-1.0),
      "epsGrowthRate": 10-year average EPS growth (0.0-1.0),
      "salesGrowthRate": 10-year average sales growth (0.0-1.0),
      "cashGrowthRate": 10-year average free cash flow growth (0.0-1.0)
    }
    Ensure the response is ONLY the JSON object.
    ''';

    final content = [Content.text(prompt)];
    final response = await _model.generateContent(content);

    final text = response.text ?? '{}';
    final jsonStart = text.indexOf('{');
    final jsonEnd = text.lastIndexOf('}');

    if (jsonStart == -1 || jsonEnd == -1) {
      throw Exception('Invalid AI response: No JSON found');
    }

    final jsonText = text.substring(jsonStart, jsonEnd + 1);
    final Map<String, dynamic> data = jsonDecode(jsonText);

    // Assign a temporary ID if not present
    data['id'] = DateTime.now().millisecondsSinceEpoch.toString();

    return Business.fromJson(data);
  }
}
