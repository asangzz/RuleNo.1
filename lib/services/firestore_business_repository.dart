import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/business.dart';
import 'business_repository.dart';

class FirestoreBusinessRepository implements BusinessRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String userId;

  FirestoreBusinessRepository({required this.userId});

  CollectionReference get _watchlist => _firestore
      .collection('users')
      .doc(userId)
      .collection('watchlist');

  @override
  Future<List<Business>> getWatchlist() async {
    final snapshot = await _watchlist.get();
    return snapshot.docs
        .map((doc) => Business.fromJson(doc.data() as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> addBusiness(Business business) async {
    await _watchlist.doc(business.id).set(business.toJson());
  }

  @override
  Future<void> removeBusiness(String id) async {
    await _watchlist.doc(id).delete();
  }
}
