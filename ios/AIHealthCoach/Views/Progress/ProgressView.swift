import SwiftUI

struct HealthProgressView: View {
    @StateObject private var vm = ProgressViewModel()

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: AppTheme.spacingMD) {
                    // Summary Cards
                    summarySection

                    // Metrics by Type
                    metricsSection
                }
                .padding(.horizontal, AppTheme.spacingMD)
                .padding(.bottom, AppTheme.spacingXL)
            }
            .background(Color.black)
            .navigationTitle("Progress")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await vm.loadProgress() }
            .task { await vm.loadProgress() }
        }
    }

    // MARK: - Summary

    private var summarySection: some View {
        AccentGlassCard(accentColor: AppTheme.brand) {
            VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
                Text("LAST 30 DAYS")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .tracking(1)

                HStack(spacing: AppTheme.spacingLG) {
                    VStack(alignment: .leading) {
                        Text("\(vm.workoutCount)")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(AppTheme.brand)
                        Text("Workouts")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading) {
                        Text("\(vm.mealCount)")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(AppTheme.calories)
                        Text("Meals")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()
                }
            }
        }
    }

    // MARK: - Metrics

    private var metricsSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
            Text("Health Metrics")
                .font(.headline)
                .foregroundStyle(.white)

            if vm.metricsByType.isEmpty {
                GlassCard {
                    HStack {
                        Image(systemName: "chart.bar")
                            .foregroundStyle(.secondary)
                        Text("No metrics recorded yet")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }
            } else {
                ForEach(Array(vm.metricsByType.keys.sorted()), id: \.self) { type in
                    if let items = vm.metricsByType[type], let latest = items.first {
                        let avg = items.reduce(0.0) { $0 + $1.value } / Double(items.count)
                        let color = vm.colorForMetric(type)
                        let icon = vm.iconForMetric(type)

                        GlassCard {
                            HStack {
                                Image(systemName: icon)
                                    .font(.title3)
                                    .foregroundStyle(color)
                                    .frame(width: 32)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(type.replacingOccurrences(of: "_", with: " ").capitalized)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundStyle(.white)
                                    Text("\(items.count) readings · avg \(String(format: "%.1f", avg)) \(latest.unit)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(String(format: "%.1f", latest.value))
                                        .font(.title3)
                                        .fontWeight(.bold)
                                        .foregroundStyle(color)
                                    Text(latest.unit)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
