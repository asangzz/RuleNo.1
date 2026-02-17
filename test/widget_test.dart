import 'package:flutter_test/flutter_test.dart';
import 'package:rule_one/main.dart';
import 'package:rule_one/services/mock_business_repository.dart';
import 'package:rule_one/services/ai_service.dart';

void main() {
  testWidgets('Initial UI smoke test', (WidgetTester tester) async {
    final repository = MockBusinessRepository();
    final aiService = AiService(apiKey: 'test');

    // Build our app and trigger a frame.
    await tester.pumpWidget(RuleOneApp(repository: repository, aiService: aiService));

    // Verify that the title is present.
    expect(find.text('Rule No. 1'), findsOneWidget);
    expect(find.text('Wonderful businesses at a margin of safety.'), findsOneWidget);

    // Wait for the mock data to load
    await tester.pumpAndSettle();

    // Verify that the mock businesses are displayed
    expect(find.text('AAPL'), findsOneWidget);
    expect(find.text('GOOGL'), findsOneWidget);
    expect(find.text('CMG'), findsOneWidget);
  });
}
