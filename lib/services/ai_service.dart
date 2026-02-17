import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/business.dart';

class AiService {
  final String apiKey;
  late final GenerativeModel _model;

  AiService({required this.apiKey}) {
    _model = GenerativeModel(model: 'gemini-1.5-pro-latest', apiKey: apiKey);
  }

  Future<Business> analyzeBusiness(String symbol) async {
    final prompt = '''
    Analyze the business with ticker symbol $symbol based on Phil Town's Rule No. 1 investing principles.
    Provide the following data in JSON format:
    - name: Full company name
    - symbol: Ticker symbol
    - meaningScore: 0.0 to 1.0
    - moatScore: 0.0 to 1.0
    - managementScore: 0.0 to 1.0
    - stickerPrice: Estimated sticker price (intrinsic value)
    - marginOfSafetyPrice: 50% of sticker price
    - currentPrice: Current market price
    - roic: 10-year average Return on Invested Capital (0.0 to 1.0 score)
    - equityGrowthRate: 10-year average Equity growth rate (0.0 to 1.0 score)
    - epsGrowthRate: 10-year average EPS growth rate (0.0 to 1.0 score)
    - salesGrowthRate: 10-year average Sales growth rate (0.0 to 1.0 score)
    - cashGrowthRate: 10-year average Free Cash Flow growth rate (0.0 to 1.0 score)

    Example format:
    {
      "name": "Apple Inc.",
      "symbol": "AAPL",
      "meaningScore": 0.9,
      "moatScore": 0.95,
      "managementScore": 0.9,
      "stickerPrice": 300.0,
      "marginOfSafetyPrice": 150.0,
      "currentPrice": 185.0,
      "roic": 0.95,
      "equityGrowthRate": 0.85,
      "epsGrowthRate": 0.9,
      "salesGrowthRate": 0.8,
      "cashGrowthRate": 0.85
    }
    ''';

    final content = [Content.text(prompt)];
    final response = await _model.generateContent(content);

    final jsonText = _extractJson(response.text ?? '');
    final Map<String, dynamic> data = json.decode(jsonText);

    return Business.fromJson({
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      ...data,
    });
  }

  String _extractJson(String text) {
    final start = text.indexOf('{');
    final end = text.lastIndexOf('}');
    if (start != -1 && end != -1) {
      return text.substring(start, end + 1);
    }
    return text;
  }
}
