import 'package:flutter/material.dart';
import '../models/business.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock data for demonstration
    final List<Business> mockBusinesses = [
      Business(
        id: '1',
        name: 'Apple Inc.',
        ticker: 'AAPL',
        hasMeaning: true,
        hasMoat: true,
        hasManagement: true,
        marginOfSafetyPrice: 150.0,
        stickerPrice: 300.0,
        roic10Year: 0.25,
        equity10Year: 0.15,
        eps10Year: 0.20,
        sales10Year: 0.10,
        cash10Year: 0.12,
      ),
      Business(
        id: '2',
        name: 'NVIDIA',
        ticker: 'NVDA',
        hasMeaning: true,
        hasMoat: true,
        hasManagement: true,
        marginOfSafetyPrice: 400.0,
        stickerPrice: 800.0,
        roic10Year: 0.30,
        equity10Year: 0.25,
        eps10Year: 0.35,
        sales10Year: 0.40,
        cash10Year: 0.30,
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              Text(
                'Wonderful\nBusinesses',
                style: Theme.of(context).textTheme.displayLarge,
              ),
              const SizedBox(height: 12),
              Text(
                'Tracking ${mockBusinesses.length} potential investments',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 40),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: mockBusinesses.length + 1,
                  itemBuilder: (context, index) {
                    if (index == mockBusinesses.length) {
                      return _buildAddButton(context);
                    }
                    return _buildBusinessCard(context, mockBusinesses[index]);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBusinessCard(BuildContext context, Business business) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.onSurface.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                business.ticker,
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  letterSpacing: -0.5,
                ),
              ),
              _buildMoatStatus(context, business.hasMoat),
            ],
          ),
          const Spacer(),
          Text(
            business.name,
            style: TextStyle(
              color: colorScheme.secondary,
              fontSize: 14,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          _buildHeatmapRow(context, business),
          const SizedBox(height: 12),
          Text(
            '\$${business.marginOfSafetyPrice.toStringAsFixed(0)}',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            'MOS Price',
            style: TextStyle(
              color: colorScheme.onSurface.withOpacity(0.3),
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMoatStatus(BuildContext context, bool hasMoat) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: hasMoat ? const Color(0xFF34C759) : Theme.of(context).colorScheme.error,
      ),
    );
  }

  Widget _buildHeatmapRow(BuildContext context, Business business) {
    final colorScheme = Theme.of(context).colorScheme;

    // Represents the "Big Five" metrics consistency
    final metrics = [
      business.roic10Year > 0.1,
      business.equity10Year > 0.1,
      business.eps10Year > 0.1,
      business.sales10Year > 0.1,
      business.cash10Year > 0.1,
    ];

    return Row(
      children: metrics.map((isGood) {
        return Container(
          width: 12,
          height: 12,
          margin: const EdgeInsets.only(right: 4),
          decoration: BoxDecoration(
            color: isGood
                ? const Color(0xFF34C759).withOpacity(0.8)
                : colorScheme.surface,
            borderRadius: BorderRadius.circular(2),
            border: Border.all(
              color: isGood ? Colors.transparent : colorScheme.onSurface.withOpacity(0.1),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAddButton(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: () {},
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: colorScheme.onSurface.withOpacity(0.1),
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Center(
          child: Icon(
            Icons.add_rounded,
            color: colorScheme.onSurface,
            size: 32,
          ),
        ),
      ),
    );
  }
}
