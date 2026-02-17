import 'package:flutter/material.dart';
import '../models/business.dart';
import '../widgets/metric_heatmap.dart';

class BusinessDetailsScreen extends StatelessWidget {
  final Business business;

  const BusinessDetailsScreen({super.key, required this.business});

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
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Rule No. 1 Analysis',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 40),
            _buildSectionTitle('The Big Five'),
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
            _buildPriceCard(),
            const SizedBox(height: 40),
            _buildSectionTitle('The Three M\'s'),
            const SizedBox(height: 16),
            _buildMetricTile('Meaning', business.meaningScore),
            _buildMetricTile('Moat', business.moatScore),
            _buildMetricTile('Management', business.managementScore),
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
        letterSpacing: 1.2,
        color: Colors.grey,
      ),
    );
  }

  Widget _buildPriceCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: business.isOnSale
              ? Colors.greenAccent.withOpacity(0.3)
              : Colors.white.withOpacity(0.05),
        ),
      ),
      child: Column(
        children: [
          _buildPriceRow('Current Price', business.currentPrice, isPrimary: true),
          const Divider(height: 32, color: Colors.white10),
          _buildPriceRow('Sticker Price', business.stickerPrice),
          const SizedBox(height: 16),
          _buildPriceRow(
            'Margin of Safety',
            business.marginOfSafetyPrice,
            highlight: true,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: business.isOnSale
                  ? Colors.greenAccent.withOpacity(0.1)
                  : Colors.redAccent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  business.isOnSale ? Icons.check_circle : Icons.warning_rounded,
                  color: business.isOnSale ? Colors.greenAccent : Colors.redAccent,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  business.isOnSale
                      ? 'Currently on sale'
                      : 'Wait for a better price',
                  style: TextStyle(
                    color: business.isOnSale ? Colors.greenAccent : Colors.redAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double price,
      {bool isPrimary = false, bool highlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isPrimary ? 18 : 14,
            color: isPrimary ? Colors.white : Colors.grey,
          ),
        ),
        Text(
          '\$${price.toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: isPrimary ? 24 : 18,
            fontWeight: FontWeight.bold,
            color: highlight ? Colors.greenAccent : Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricTile(String label, double score) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 16)),
          Row(
            children: [
              Text(
                '${(score * 100).toInt()}%',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: _getScoreColor(score),
                ),
              ),
              const SizedBox(width: 12),
              Icon(
                Icons.arrow_forward_ios,
                size: 14,
                color: Colors.white.withOpacity(0.2),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getScoreColor(double score) {
    if (score >= 0.8) return Colors.greenAccent;
    if (score >= 0.5) return Colors.yellowAccent;
    return Colors.redAccent;
  }
}
