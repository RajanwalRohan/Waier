import SwiftUI

/// A translucent glass-morphism card component.
/// Provides depth and hierarchy without feeling heavy.
struct GlassCard<Content: View>: View {
    var padding: CGFloat = AppTheme.spacingMD
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(padding)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AppTheme.radiusLG))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.radiusLG)
                    .stroke(AppTheme.cardBorder, lineWidth: 0.5)
            )
    }
}

/// A more prominent glass card with a gradient tint.
struct AccentGlassCard<Content: View>: View {
    let accentColor: Color
    var padding: CGFloat = AppTheme.spacingMD
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(padding)
            .background {
                RoundedRectangle(cornerRadius: AppTheme.radiusLG)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.radiusLG)
                            .fill(accentColor.opacity(0.1))
                    )
            }
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.radiusLG)
                    .stroke(accentColor.opacity(0.2), lineWidth: 0.5)
            )
    }
}
