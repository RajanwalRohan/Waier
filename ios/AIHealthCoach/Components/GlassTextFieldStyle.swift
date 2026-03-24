import SwiftUI

/// A translucent glass-morphism text field style.
/// Consistent across the entire app for all input fields.
struct GlassTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, AppTheme.spacingSM)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AppTheme.radiusSM))
            .foregroundStyle(.white)
    }
}
