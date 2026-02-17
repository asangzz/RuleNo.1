import 'package:flutter/material.dart';
import '../models/business.dart';
import '../services/business_repository.dart';
import '../services/mock_business_repository.dart';
import '../services/ai_service.dart';
import '../widgets/business_card.dart';
import 'add_business_screen.dart';
import 'business_detail_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  // Use Mock repository for now. In a real app, this would be FirestoreBusinessRepository
  final BusinessRepository _repository = MockBusinessRepository();
  final AiService _aiService = AiService(apiKey: 'YOUR_GEMINI_API_KEY');
  late Future<List<Business>> _watchlistFuture;

  @override
  void initState() {
    super.initState();
    _refreshWatchlist();
  }

  void _refreshWatchlist() {
    setState(() {
      _watchlistFuture = _repository.getWatchlist();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final Business? result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AddBusinessScreen(aiService: _aiService),
            ),
          );

          if (result != null) {
            await _repository.addBusiness(result);
            _refreshWatchlist();
          }
        },
        backgroundColor: Colors.white,
        child: const Icon(Icons.add, color: Colors.black),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              const Text(
                'Rule No. 1',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -1.0,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Wonderful businesses at a margin of safety.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 40),
              Expanded(
                child: FutureBuilder<List<Business>>(
                  future: _watchlistFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    if (snapshot.hasError) {
                      return Center(child: Text('Error: ${snapshot.error}'));
                    }

                    final watchlist = snapshot.data ?? [];

                    if (watchlist.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.auto_graph_rounded,
                              size: 80,
                              color: Colors.white.withOpacity(0.1),
                            ),
                            const SizedBox(height: 24),
                            Text(
                              'No businesses tracked yet.',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.3),
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () async {
                                final Business? result = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => AddBusinessScreen(aiService: _aiService),
                                  ),
                                );

                                if (result != null) {
                                  await _repository.addBusiness(result);
                                  _refreshWatchlist();
                                }
                              },
                              child: const Text('Add your first business'),
                            ),
                          ],
                        ),
                      );
                    }

                    return ListView.builder(
                      itemCount: watchlist.length,
                      padding: const EdgeInsets.only(bottom: 24),
                      itemBuilder: (context, index) {
                        final business = watchlist[index];
                        return GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => BusinessDetailScreen(business: business),
                              ),
                            );
                          },
                          child: BusinessCard(business: business),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
