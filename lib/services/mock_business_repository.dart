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
    return _watchlist;
  }

  @override
  Future<void> addBusiness(Business business) async {
    _watchlist.add(business);
  }

  @override
  Future<void> removeBusiness(String id) async {
    _watchlist.removeWhere((b) => b.id == id);
  }
}
