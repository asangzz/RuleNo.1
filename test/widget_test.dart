import 'package:flutter_test/flutter_test.dart';
import 'package:rule_one/main.dart';

void main() {
  testWidgets('Initial UI smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RuleOneApp());

    // Verify that the title is present.
    expect(find.text('Wonderful\nBusinesses'), findsOneWidget);
    expect(find.textContaining('Tracking'), findsOneWidget);

    // Verify that mock businesses are present
    expect(find.text('AAPL'), findsOneWidget);
    expect(find.text('NVDA'), findsOneWidget);
  });
}
