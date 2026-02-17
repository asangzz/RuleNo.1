import 'package:flutter_test/flutter_test.dart';
import 'package:rule_one/main.dart';

void main() {
  testWidgets('Initial UI smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RuleOneApp());

    // Verify that the title is present.
    expect(find.text('Rule No. 1'), findsOneWidget);
    expect(find.text('Wonderful businesses at a margin of safety.'), findsOneWidget);
    expect(find.text('No businesses tracked yet.'), findsOneWidget);
  });
}
