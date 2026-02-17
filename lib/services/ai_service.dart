import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/business.dart';

class AIService {
  final String apiKey;
  late final GenerativeModel _model;

  AIService({required this.apiKey}) {
    _model = GenerativeModel(
      model: 'gemini-1.5-pro-latest',
      apiKey: apiKey,
    );
  }

  Future<String> analyzeBusiness(Business business) async {
    final prompt = '''
    Analyze the following business based on Phil Town's Rule No. 1 principles:

    Name: ${business.name}
    Ticker: ${business.ticker}
    ROIC (10yr): ${(business.roic10Year * 100).toStringAsFixed(1)}%
    Equity Growth (10yr): ${(business.equity10Year * 100).toStringAsFixed(1)}%
    EPS Growth (10yr): ${(business.eps10Year * 100).toStringAsFixed(1)}%
    Sales Growth (10yr): ${(business.sales10Year * 100).toStringAsFixed(1)}%
    Cash Growth (10yr): ${(business.cash10Year * 100).toStringAsFixed(1)}%

    Provide a concise summary (max 3 sentences) on whether this is a "Wonderful Business" and why.
    Focus on Moat and Management.
    ''';

    try {
      final content = [Content.text(prompt)];
      final response = await _model.generateContent(content);
      return response.text ?? 'Unable to generate analysis.';
    } catch (e) {
      return 'Error analyzing business: $e';
    }
  }

  Future<double> estimateIntrinsicValue(Business business) async {
    // This is a placeholder for AI-guided valuation
    // In a real app, this might involve more complex prompts or tools
    return business.stickerPrice;
  }
}
