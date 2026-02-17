import '../models/business.dart';

abstract class BusinessRepository {
  Future<List<Business>> getWatchlist();
  Future<void> addToWatchlist(Business business);
  Future<void> removeFromWatchlist(String id);
  Future<void> updateBusiness(Business business);
}
