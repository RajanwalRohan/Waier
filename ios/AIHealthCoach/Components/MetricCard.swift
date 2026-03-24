import SwiftUI

struct MetricCard: View {
    let icon: String
    let label: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: AppTheme.spacingXS) {
                HStack {
                    Image(systemName: icon)
                        .font(.caption)
                        .foregroundStyle(color)
                    Text(label)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Text(value)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                    .contentTransition(.numericText())

                Text(unit)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
