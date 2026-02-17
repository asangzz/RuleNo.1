class Business {
  final String id;
  final String name;
  final String symbol;

  // Rule No. 1 Metrics (Scores 0.0 to 1.0)
  final double meaningScore;
  final double moatScore;
  final double managementScore;

  // Financials
  final double stickerPrice;
  final double marginOfSafetyPrice;
  final double currentPrice;

  // Growth rates (last 10 years)
  final double roic;
  final double equityGrowthRate;
  final double epsGrowthRate;
  final double salesGrowthRate;
  final double cashGrowthRate;

  const Business({
    required this.id,
    required this.name,
    required this.symbol,
    required this.meaningScore,
    required this.moatScore,
    required this.managementScore,
    required this.stickerPrice,
    required this.marginOfSafetyPrice,
    required this.currentPrice,
    required this.roic,
    required this.equityGrowthRate,
    required this.epsGrowthRate,
    required this.salesGrowthRate,
    required this.cashGrowthRate,
  });

  bool get isWonderful =>
      meaningScore >= 0.8 &&
      moatScore >= 0.8 &&
      managementScore >= 0.8;

  bool get isOnSale => currentPrice <= marginOfSafetyPrice;

  double get marginOfSafety => (stickerPrice - currentPrice) / stickerPrice;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'symbol': symbol,
      'meaningScore': meaningScore,
      'moatScore': moatScore,
      'managementScore': managementScore,
      'stickerPrice': stickerPrice,
      'marginOfSafetyPrice': marginOfSafetyPrice,
      'currentPrice': currentPrice,
      'roic': roic,
      'equityGrowthRate': equityGrowthRate,
      'epsGrowthRate': epsGrowthRate,
      'salesGrowthRate': salesGrowthRate,
      'cashGrowthRate': cashGrowthRate,
    };
  }

  factory Business.fromJson(Map<String, dynamic> json) {
    return Business(
      id: json['id'] as String,
      name: json['name'] as String,
      symbol: json['symbol'] as String,
      meaningScore: (json['meaningScore'] as num).toDouble(),
      moatScore: (json['moatScore'] as num).toDouble(),
      managementScore: (json['managementScore'] as num).toDouble(),
      stickerPrice: (json['stickerPrice'] as num).toDouble(),
      marginOfSafetyPrice: (json['marginOfSafetyPrice'] as num).toDouble(),
      currentPrice: (json['currentPrice'] as num).toDouble(),
      roic: (json['roic'] as num).toDouble(),
      equityGrowthRate: (json['equityGrowthRate'] as num).toDouble(),
      epsGrowthRate: (json['epsGrowthRate'] as num).toDouble(),
      salesGrowthRate: (json['salesGrowthRate'] as num).toDouble(),
      cashGrowthRate: (json['cashGrowthRate'] as num).toDouble(),
    );
  }
}
