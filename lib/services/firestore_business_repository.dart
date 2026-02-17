import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/business.dart';
import 'business_repository.dart';

class FirestoreBusinessRepository implements BusinessRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'watchlist';

  @override
  Future<List<Business>> getWatchlist() async {
    final snapshot = await _firestore.collection(_collection).get();
    return snapshot.docs.map((doc) {
      final data = doc.data();
      data['id'] = doc.id;
      return Business.fromJson(data);
    }).toList();
  }

  @override
  Future<void> addToWatchlist(Business business) async {
    await _firestore.collection(_collection).doc(business.id.isEmpty ? null : business.id).set(business.toJson());
  }

  @override
  Future<void> removeFromWatchlist(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  @override
  Future<void> updateBusiness(Business business) async {
    await _firestore.collection(_collection).doc(business.id).update(business.toJson());
  }
}
