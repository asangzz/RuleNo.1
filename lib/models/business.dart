class Business {
  final String id;
  final String name;
  final String ticker;
  final String description;

  // Rule No. 1 Metrics (The Four Ms)
  final bool hasMeaning;
  final bool hasMoat;
  final bool hasManagement;
  final double marginOfSafetyPrice;
  final double stickerPrice;

  // 10-Year Growth Rates (Big Five)
  final double roic10Year;
  final double equity10Year;
  final double eps10Year;
  final double sales10Year;
  final double cash10Year;

  // Analysis Summary (from AI)
  final String? analysisSummary;

  Business({
    required this.id,
    required this.name,
    required this.ticker,
    this.description = '',
    required this.hasMeaning,
    required this.hasMoat,
    required this.hasManagement,
    required this.marginOfSafetyPrice,
    required this.stickerPrice,
    required this.roic10Year,
    required this.equity10Year,
    required this.eps10Year,
    required this.sales10Year,
    required this.cash10Year,
    this.analysisSummary,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'ticker': ticker,
      'description': description,
      'hasMeaning': hasMeaning,
      'hasMoat': hasMoat,
      'hasManagement': hasManagement,
      'marginOfSafetyPrice': marginOfSafetyPrice,
      'stickerPrice': stickerPrice,
      'roic10Year': roic10Year,
      'equity10Year': equity10Year,
      'eps10Year': eps10Year,
      'sales10Year': sales10Year,
      'cash10Year': cash10Year,
      'analysisSummary': analysisSummary,
    };
  }

  factory Business.fromMap(Map<String, dynamic> map) {
    return Business(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      ticker: map['ticker'] ?? '',
      description: map['description'] ?? '',
      hasMeaning: map['hasMeaning'] ?? false,
      hasMoat: map['hasMoat'] ?? false,
      hasManagement: map['hasManagement'] ?? false,
      marginOfSafetyPrice: (map['marginOfSafetyPrice'] ?? 0.0).toDouble(),
      stickerPrice: (map['stickerPrice'] ?? 0.0).toDouble(),
      roic10Year: (map['roic10Year'] ?? 0.0).toDouble(),
      equity10Year: (map['equity10Year'] ?? 0.0).toDouble(),
      eps10Year: (map['eps10Year'] ?? 0.0).toDouble(),
      sales10Year: (map['sales10Year'] ?? 0.0).toDouble(),
      cash10Year: (map['cash10Year'] ?? 0.0).toDouble(),
      analysisSummary: map['analysisSummary'],
    );
  }
}
