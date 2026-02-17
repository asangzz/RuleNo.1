import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.black,
      colorScheme: const ColorScheme.dark(
        primary: Colors.white,
        onPrimary: Colors.black,
        secondary: Color(0xFF8E8E93),
        surface: Color(0xFF1C1C1E),
        onSurface: Colors.white,
        error: Color(0xFFFF453A),
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.inter(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          letterSpacing: -1.5,
          fontSize: 32,
        ),
        headlineMedium: GoogleFonts.inter(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
          fontSize: 24,
        ),
        bodyLarge: GoogleFonts.inter(
          color: Colors.white70,
          fontSize: 16,
        ),
        bodyMedium: GoogleFonts.inter(
          color: Colors.white60,
          fontSize: 14,
        ),
        labelLarge: GoogleFonts.inter(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF1C1C1E),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF38383A),
        thickness: 1,
        space: 1,
      ),
    );
  }
}
