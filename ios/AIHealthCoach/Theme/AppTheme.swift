import SwiftUI

/// Centralized design system for the AI Health Coach app.
/// Dark-mode-first, with translucent glass surfaces, accent colors
/// mapped to metric types, and consistent spacing/typography.
enum AppTheme {
    // MARK: - Brand Colors
    static let brand = Color("Brand", bundle: nil)
    static let brandGradient = LinearGradient(
        colors: [Color(hex: 0x22C55E), Color(hex: 0x16A34A)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Metric Accent Colors
    static let steps      = Color(hex: 0x3B82F6)  // Blue
    static let heartRate  = Color(hex: 0xEF4444)  // Red
    static let sleep      = Color(hex: 0x8B5CF6)  // Purple
    static let calories   = Color(hex: 0xF97316)  // Orange
    static let breathing  = Color(hex: 0x14B8A6)  // Teal
    static let recovery   = Color(hex: 0x22C55E)  // Green
    static let weight     = Color(hex: 0xEC4899)  // Pink

    // MARK: - Surfaces
    static let cardBackground = Color.white.opacity(0.08)
    static let cardBorder     = Color.white.opacity(0.12)
    static let elevatedSurface = Color.white.opacity(0.05)

    // MARK: - Spacing
    static let spacingXS: CGFloat = 4
    static let spacingSM: CGFloat = 8
    static let spacingMD: CGFloat = 16
    static let spacingLG: CGFloat = 24
    static let spacingXL: CGFloat = 32

    // MARK: - Corner Radius
    static let radiusSM: CGFloat = 8
    static let radiusMD: CGFloat = 12
    static let radiusLG: CGFloat = 16
    static let radiusXL: CGFloat = 24
}

// MARK: - Color Extension

extension Color {
    init(hex: UInt, opacity: Double = 1.0) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8)  & 0xFF) / 255,
            blue:  Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}
