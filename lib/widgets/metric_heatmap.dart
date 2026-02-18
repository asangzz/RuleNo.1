import 'package:flutter/material.dart';

class MetricHeatmap extends StatelessWidget {
  final List<double> scores; // 0.0 to 1.0
  final List<String> labels;

  const MetricHeatmap({
    super.key,
    required this.scores,
    required this.labels,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(scores.length, (index) {
        final score = scores[index];
        final label = labels[index];

        return Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: _getScoreColor(score),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        );
      }),
    );
  }

  Color _getScoreColor(double score) {
    if (score >= 0.9) return Colors.greenAccent.shade700;
    if (score >= 0.7) return Colors.greenAccent.shade400;
    if (score >= 0.5) return Colors.yellowAccent.shade700;
    if (score >= 0.3) return Colors.orangeAccent;
    return Colors.redAccent;
  }
}
