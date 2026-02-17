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

  // Detailed Financials for Calculation
  final double eps;
  final double peRatio;
  final double estimatedGrowthRate;

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
    required this.eps,
    required this.peRatio,
    required this.estimatedGrowthRate,
    required this.roic,
    required this.equityGrowthRate,
    required this.epsGrowthRate,
    required this.salesGrowthRate,
    required this.cashGrowthRate,
  });

  bool get isWonderful =>
      meaningScore >= 0.8 && moatScore >= 0.8 && managementScore >= 0.8;

  bool get isOnSale => currentPrice <= marginOfSafetyPrice;

  double get marginOfSafety => (stickerPrice - currentPrice) / stickerPrice;

  factory Business.fromJson(Map<String, dynamic> json) {
    return Business(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      symbol: json['symbol'] ?? '',
      meaningScore: (json['meaningScore'] ?? 0.0).toDouble(),
      moatScore: (json['moatScore'] ?? 0.0).toDouble(),
      managementScore: (json['managementScore'] ?? 0.0).toDouble(),
      stickerPrice: (json['stickerPrice'] ?? 0.0).toDouble(),
      marginOfSafetyPrice: (json['marginOfSafetyPrice'] ?? 0.0).toDouble(),
      currentPrice: (json['currentPrice'] ?? 0.0).toDouble(),
      eps: (json['eps'] ?? 0.0).toDouble(),
      peRatio: (json['peRatio'] ?? 0.0).toDouble(),
      estimatedGrowthRate: (json['estimatedGrowthRate'] ?? 0.0).toDouble(),
      roic: (json['roic'] ?? 0.0).toDouble(),
      equityGrowthRate: (json['equityGrowthRate'] ?? 0.0).toDouble(),
      epsGrowthRate: (json['epsGrowthRate'] ?? 0.0).toDouble(),
      salesGrowthRate: (json['salesGrowthRate'] ?? 0.0).toDouble(),
      cashGrowthRate: (json['cashGrowthRate'] ?? 0.0).toDouble(),
    );
  }

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
      'eps': eps,
      'peRatio': peRatio,
      'estimatedGrowthRate': estimatedGrowthRate,
      'roic': roic,
      'equityGrowthRate': equityGrowthRate,
      'epsGrowthRate': epsGrowthRate,
      'salesGrowthRate': salesGrowthRate,
      'cashGrowthRate': cashGrowthRate,
    };
  }

  Business copyWith({
    String? id,
    String? name,
    String? symbol,
    double? meaningScore,
    double? moatScore,
    double? managementScore,
    double? stickerPrice,
    double? marginOfSafetyPrice,
    double? currentPrice,
    double? eps,
    double? peRatio,
    double? estimatedGrowthRate,
    double? roic,
    double? equityGrowthRate,
    double? epsGrowthRate,
    double? salesGrowthRate,
    double? cashGrowthRate,
  }) {
    return Business(
      id: id ?? this.id,
      name: name ?? this.name,
      symbol: symbol ?? this.symbol,
      meaningScore: meaningScore ?? this.meaningScore,
      moatScore: moatScore ?? this.moatScore,
      managementScore: managementScore ?? this.managementScore,
      stickerPrice: stickerPrice ?? this.stickerPrice,
      marginOfSafetyPrice: marginOfSafetyPrice ?? this.marginOfSafetyPrice,
      currentPrice: currentPrice ?? this.currentPrice,
      eps: eps ?? this.eps,
      peRatio: peRatio ?? this.peRatio,
      estimatedGrowthRate: estimatedGrowthRate ?? this.estimatedGrowthRate,
      roic: roic ?? this.roic,
      equityGrowthRate: equityGrowthRate ?? this.equityGrowthRate,
      epsGrowthRate: epsGrowthRate ?? this.epsGrowthRate,
      salesGrowthRate: salesGrowthRate ?? this.salesGrowthRate,
      cashGrowthRate: cashGrowthRate ?? this.cashGrowthRate,
    );
  }
}
