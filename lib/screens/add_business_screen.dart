import 'package:flutter/material.dart';
import '../models/business.dart';
import '../services/ai_service.dart';
import '../widgets/business_card.dart';

class AddBusinessScreen extends StatefulWidget {
  final AiService aiService;

  const AddBusinessScreen({super.key, required this.aiService});

  @override
  State<AddBusinessScreen> createState() => _AddBusinessScreenState();
}

class _AddBusinessScreenState extends State<AddBusinessScreen> {
  final TextEditingController _symbolController = TextEditingController();
  bool _isLoading = false;
  Business? _analyzedBusiness;
  String? _error;

  Future<void> _analyze() async {
    final symbol = _symbolController.text.trim().toUpperCase();
    if (symbol.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
      _analyzedBusiness = null;
    });

    try {
      final business = await widget.aiService.analyzeBusiness(symbol);
      setState(() {
        _analyzedBusiness = business;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to analyze business. Please check the symbol and try again.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Business'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _symbolController,
              decoration: InputDecoration(
                labelText: 'Ticker Symbol',
                hintText: 'e.g. AAPL, TSLA, MSFT',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: _analyze,
                ),
              ),
              textCapitalization: TextCapitalization.characters,
              onSubmitted: (_) => _analyze(),
            ),
            const SizedBox(height: 32),
            if (_isLoading)
              const Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('AI is analyzing the business...'),
                    Text('This may take 10-20 seconds.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ),
            if (_error != null)
              Text(
                _error!,
                style: const TextStyle(color: Colors.redAccent),
                textAlign: TextAlign.center,
              ),
            if (_analyzedBusiness != null) ...[
              const Text(
                'Analysis Result',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              BusinessCard(business: _analyzedBusiness!),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context, _analyzedBusiness);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Add to Watchlist'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
