import '../models/business.dart';

abstract class BusinessRepository {
  Future<List<Business>> getWatchlist();
  Future<void> addBusiness(Business business);
  Future<void> removeBusiness(String id);
}
