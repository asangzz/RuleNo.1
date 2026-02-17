import 'package:flutter/material.dart';
import 'dart:math';
import '../models/business.dart';
import '../widgets/metric_heatmap.dart';

class BusinessDetailScreen extends StatefulWidget {
  final Business business;

  const BusinessDetailScreen({super.key, required this.business});

  @override
  State<BusinessDetailScreen> createState() => _BusinessDetailScreenState();
}

class _BusinessDetailScreenState extends State<BusinessDetailScreen> {
  late double _eps;
  late double _growthRate;
  late double _peRatio;
  late double _stickerPrice;
  late double _mosPrice;

  @override
  void initState() {
    super.initState();
    _eps = widget.business.eps;
    _growthRate = widget.business.estimatedGrowthRate;
    _peRatio = widget.business.peRatio;
    _calculatePrices();
  }

  void _calculatePrices() {
    // Rule No. 1 Sticker Price Calculation
    // 1. Future EPS = Current EPS * (1 + Growth Rate)^10
    final futureEps = _eps * pow(1 + _growthRate, 10);
    // 2. Future Market Price = Future EPS * Future PE
    final futurePrice = futureEps * _peRatio;
    // 3. Sticker Price = Future Price / (1 + Minimum Acceptable Return)^10
    // MAR is typically 15% for Rule No. 1
    _stickerPrice = futurePrice / pow(1 + 0.15, 10);
    _mosPrice = _stickerPrice / 2;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.business.symbol),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.business.name,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Current Price: \$${widget.business.currentPrice.toStringAsFixed(2)}',
              style: TextStyle(fontSize: 18, color: Colors.white.withOpacity(0.7)),
            ),
            const SizedBox(height: 32),
            _buildSectionTitle('The Big Five (10yr)'),
            const SizedBox(height: 16),
            MetricHeatmap(
              scores: [
                widget.business.roic,
                widget.business.equityGrowthRate,
                widget.business.epsGrowthRate,
                widget.business.salesGrowthRate,
                widget.business.cashGrowthRate,
              ],
              labels: const ['ROIC', 'EQTY', 'EPS', 'SALE', 'CASH'],
            ),
            const SizedBox(height: 40),
            _buildSectionTitle('Rule No. 1 Calculator'),
            const SizedBox(height: 24),
            _buildCalculatorInput(
              'Current EPS (\$)',
              _eps,
              (val) => setState(() {
                _eps = val;
                _calculatePrices();
              }),
            ),
            _buildCalculatorInput(
              'Est. Growth Rate (%)',
              _growthRate * 100,
              (val) => setState(() {
                _growthRate = val / 100;
                _calculatePrices();
              }),
            ),
            _buildCalculatorInput(
              'Future PE Ratio',
              _peRatio,
              (val) => setState(() {
                _peRatio = val;
                _calculatePrices();
              }),
            ),
            const SizedBox(height: 40),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1C1C1E),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildPriceRow('Sticker Price', _stickerPrice, Colors.white),
                  const Divider(height: 32, color: Colors.white10),
                  _buildPriceRow('Margin of Safety', _mosPrice, Colors.greenAccent),
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
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.grey,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildCalculatorInput(String label, double value, Function(double) onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: Colors.white70)),
              Text(
                value.toStringAsFixed(2),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          Slider(
            value: value,
            min: 0,
            max: label.contains('Rate') ? 50 : (label.contains('EPS') ? 200 : 100),
            onChanged: onChanged,
            activeColor: Colors.white,
            inactiveColor: Colors.white10,
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double price, Color priceColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 16, color: Colors.grey)),
        Text(
          '\$${price.toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: priceColor,
          ),
        ),
      ],
    );
  }
}
