import 'package:flutter/material.dart';
import '../models/business.dart';
import '../widgets/metric_heatmap.dart';

class BusinessDetailScreen extends StatelessWidget {
  final Business business;

  const BusinessDetailScreen({super.key, required this.business});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(business.symbol),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              business.name,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              business.isWonderful ? 'Wonderful Business' : 'Needs Improvement',
              style: TextStyle(
                color: business.isWonderful ? Colors.greenAccent : Colors.orangeAccent,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 40),
            _buildSectionTitle('Rule No. 1 Scorecard'),
            const SizedBox(height: 16),
            _buildScoreItem('Meaning', business.meaningScore),
            _buildScoreItem('Moat', business.moatScore),
            _buildScoreItem('Management', business.managementScore),
            const SizedBox(height: 32),
            _buildSectionTitle('The Big Five (10-Year Growth)'),
            const SizedBox(height: 16),
            MetricHeatmap(
              scores: [
                business.roic,
                business.equityGrowthRate,
                business.epsGrowthRate,
                business.salesGrowthRate,
                business.cashGrowthRate,
              ],
              labels: const ['ROIC', 'EQTY', 'EPS', 'SALE', 'CASH'],
            ),
            const SizedBox(height: 40),
            _buildSectionTitle('Valuation'),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildValuationItem('Sticker Price', '\$${business.stickerPrice.toStringAsFixed(2)}', Colors.white),
                _buildValuationItem('MOS Price', '\$${business.marginOfSafetyPrice.toStringAsFixed(2)}', Colors.greenAccent),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1C1C1E),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Current Price', style: TextStyle(color: Colors.grey)),
                  Text(
                    '\$${business.currentPrice.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (business.isOnSale)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.greenAccent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.greenAccent.withOpacity(0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.greenAccent),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'This business is currently on sale! Margin of Safety reached.',
                        style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        color: Colors.grey,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildScoreItem(String label, double score) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Expanded(flex: 2, child: Text(label)),
          Expanded(
            flex: 5,
            child: LinearProgressIndicator(
              value: score,
              backgroundColor: Colors.white10,
              color: score >= 0.8 ? Colors.greenAccent : (score >= 0.5 ? Colors.yellowAccent : Colors.redAccent),
              borderRadius: BorderRadius.circular(4),
              minHeight: 8,
            ),
          ),
          const SizedBox(width: 12),
          Text('${(score * 100).toInt()}%'),
        ],
      ),
    );
  }

  Widget _buildValuationItem(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }
}
