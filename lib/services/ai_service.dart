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
    Analyze the following stock symbol based on Phil Town's Rule No. 1 investing principles: $symbol.

    Provide the following information in JSON format:
    {
      "name": "Company Name",
      "symbol": "$symbol",
      "meaningScore": 0.0 to 1.0,
      "moatScore": 0.0 to 1.0,
      "managementScore": 0.0 to 1.0,
      "stickerPrice": 0.0,
      "marginOfSafetyPrice": 0.0,
      "currentPrice": 0.0,
      "roic": 0.0 to 1.0,
      "equityGrowthRate": 0.0 to 1.0,
      "epsGrowthRate": 0.0 to 1.0,
      "salesGrowthRate": 0.0 to 1.0,
      "cashGrowthRate": 0.0 to 1.0
    }

    Ensure the scores and growth rates are between 0.0 and 1.0 representing their relative health (0.9+ is excellent).
    ''';

    try {
      final content = [Content.text(prompt)];
      final response = await _model.generateContent(content);

      final jsonString = _extractJson(response.text ?? '{}');
      final data = jsonDecode(jsonString);

      return Business(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: data['name'] ?? 'Unknown',
        symbol: data['symbol'] ?? symbol,
        meaningScore: (data['meaningScore'] ?? 0.0).toDouble(),
        moatScore: (data['moatScore'] ?? 0.0).toDouble(),
        managementScore: (data['managementScore'] ?? 0.0).toDouble(),
        stickerPrice: (data['stickerPrice'] ?? 0.0).toDouble(),
        marginOfSafetyPrice: (data['marginOfSafetyPrice'] ?? 0.0).toDouble(),
        currentPrice: (data['currentPrice'] ?? 0.0).toDouble(),
        roic: (data['roic'] ?? 0.0).toDouble(),
        equityGrowthRate: (data['equityGrowthRate'] ?? 0.0).toDouble(),
        epsGrowthRate: (data['epsGrowthRate'] ?? 0.0).toDouble(),
        salesGrowthRate: (data['salesGrowthRate'] ?? 0.0).toDouble(),
        cashGrowthRate: (data['cashGrowthRate'] ?? 0.0).toDouble(),
      );
    } catch (e) {
      // For development/demo, return a mock business if AI fails
      return Business(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: 'Mock $symbol',
        symbol: symbol,
        meaningScore: 0.8,
        moatScore: 0.8,
        managementScore: 0.8,
        stickerPrice: 200.0,
        marginOfSafetyPrice: 100.0,
        currentPrice: 150.0,
        roic: 0.8,
        equityGrowthRate: 0.8,
        epsGrowthRate: 0.8,
        salesGrowthRate: 0.8,
        cashGrowthRate: 0.8,
      );
    }
  }

  String _extractJson(String text) {
    final start = text.indexOf('{');
    final end = text.lastIndexOf('}');
    if (start != -1 && end != -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return '{}';
  }
}
