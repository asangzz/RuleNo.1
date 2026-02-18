import '../models/business.dart';

abstract class BusinessRepository {
  Future<List<Business>> getWatchlist();
  Future<void> addToWatchlist(Business business);
  Future<void> removeFromWatchlist(String id);
}

class MockBusinessRepository implements BusinessRepository {
  final List<Business> _watchlist = [
    const Business(
      id: '1',
      name: 'Apple Inc.',
      symbol: 'AAPL',
      meaningScore: 0.9,
      moatScore: 0.95,
      managementScore: 0.9,
      stickerPrice: 240.0,
      marginOfSafetyPrice: 120.0,
      currentPrice: 185.0,
      roic: 0.95,
      equityGrowthRate: 0.85,
      epsGrowthRate: 0.9,
      salesGrowthRate: 0.8,
      cashGrowthRate: 0.85,
    ),
    const Business(
      id: '2',
      name: 'Alphabet Inc.',
      symbol: 'GOOGL',
      meaningScore: 0.85,
      moatScore: 0.9,
      managementScore: 0.8,
      stickerPrice: 180.0,
      marginOfSafetyPrice: 90.0,
      currentPrice: 142.0,
      roic: 0.8,
      equityGrowthRate: 0.75,
      epsGrowthRate: 0.85,
      salesGrowthRate: 0.9,
      cashGrowthRate: 0.8,
    ),
  ];

  @override
  Future<List<Business>> getWatchlist() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return List.unmodifiable(_watchlist);
  }

  @override
  Future<void> addToWatchlist(Business business) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _watchlist.add(business);
  }

  @override
  Future<void> removeFromWatchlist(String id) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _watchlist.removeWhere((b) => b.id == id);
  }
}

// In the future, this would be:
// class FirestoreBusinessRepository implements BusinessRepository { ... }
