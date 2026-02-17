import '../models/business.dart';
import 'business_repository.dart';

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
      eps: 6.13,
      peRatio: 30.0,
      estimatedGrowthRate: 0.12,
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
      eps: 5.8,
      peRatio: 25.0,
      estimatedGrowthRate: 0.15,
      roic: 0.8,
      equityGrowthRate: 0.75,
      epsGrowthRate: 0.85,
      salesGrowthRate: 0.9,
      cashGrowthRate: 0.8,
    ),
    const Business(
      id: '3',
      name: 'Chipotle Mexican Grill',
      symbol: 'CMG',
      meaningScore: 0.8,
      moatScore: 0.85,
      managementScore: 0.9,
      stickerPrice: 3200.0,
      marginOfSafetyPrice: 1600.0,
      currentPrice: 2800.0,
      eps: 45.0,
      peRatio: 40.0,
      estimatedGrowthRate: 0.20,
      roic: 0.9,
      equityGrowthRate: 0.8,
      epsGrowthRate: 0.95,
      salesGrowthRate: 0.85,
      cashGrowthRate: 0.7,
    ),
  ];

  @override
  Future<List<Business>> getWatchlist() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return List.from(_watchlist);
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

  @override
  Future<void> updateBusiness(Business business) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final index = _watchlist.indexWhere((b) => b.id == business.id);
    if (index != -1) {
      _watchlist[index] = business;
    }
  }
}
