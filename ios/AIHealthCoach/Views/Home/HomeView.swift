import SwiftUI

struct HomeView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var vm = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: AppTheme.spacingMD) {
                    // Greeting Header
                    headerSection

                    // AI Insight Card
                    insightCard

                    // Quick Actions
                    quickActionsRow

                    // Metrics Grid
                    metricsGrid

                    // Recent Workouts
                    recentWorkoutsSection
                }
                .padding(.horizontal, AppTheme.spacingMD)
                .padding(.bottom, AppTheme.spacingXL)
            }
            .background(Color.black)
            .refreshable { await vm.loadDashboard() }
            .task { await vm.loadDashboard() }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(vm.greeting)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                Text(authVM.currentUser?.name ?? "Athlete")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            // Recovery Score Badge
            recoveryBadge
        }
        .padding(.top, AppTheme.spacingSM)
    }

    private var recoveryBadge: some View {
        VStack(spacing: 2) {
            Text("82")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.recovery)
            Text("Recovery")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(width: 64, height: 64)
        .background(.ultraThinMaterial, in: Circle())
        .overlay(
            Circle()
                .stroke(AppTheme.recovery.opacity(0.4), lineWidth: 2)
        )
    }

    // MARK: - AI Insight Card

    private var insightCard: some View {
        AccentGlassCard(accentColor: AppTheme.brand) {
            HStack(alignment: .top, spacing: AppTheme.spacingSM) {
                Image(systemName: "brain.head.profile")
                    .font(.title2)
                    .foregroundStyle(AppTheme.brand)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 4) {
                    Text("AI Insight")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                    Text(vm.insightText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
        }
    }

    // MARK: - Quick Actions

    private var quickActionsRow: some View {
        HStack(spacing: AppTheme.spacingSM) {
            QuickActionButton(icon: "dumbbell.fill", label: "Workout", color: AppTheme.steps) {}
            QuickActionButton(icon: "fork.knife", label: "Meal", color: AppTheme.calories) {}
            QuickActionButton(icon: "message.fill", label: "Coach", color: AppTheme.brand) {}
            QuickActionButton(icon: "bolt.fill", label: "Session", color: AppTheme.heartRate) {}
        }
    }

    // MARK: - Metrics Grid

    private var metricsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: AppTheme.spacingSM),
            GridItem(.flexible(), spacing: AppTheme.spacingSM),
        ], spacing: AppTheme.spacingSM) {
            MetricCard(
                icon: "figure.walk",
                label: "Steps",
                value: vm.latestSteps.map { "\(Int($0.value).formatted())" } ?? "—",
                unit: "steps",
                color: AppTheme.steps
            )
            MetricCard(
                icon: "heart.fill",
                label: "Heart Rate",
                value: vm.latestHeartRate.map { "\(Int($0.value))" } ?? "—",
                unit: "bpm",
                color: AppTheme.heartRate
            )
            MetricCard(
                icon: "moon.fill",
                label: "Sleep",
                value: vm.latestSleep.map { String(format: "%.1f", $0.value) } ?? "—",
                unit: "hours",
                color: AppTheme.sleep
            )
            MetricCard(
                icon: "flame.fill",
                label: "Calories",
                value: vm.todayCalories > 0 ? "\(Int(vm.todayCalories))" : "—",
                unit: "kcal",
                color: AppTheme.calories
            )
        }
    }

    // MARK: - Recent Workouts

    private var recentWorkoutsSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
            Text("Recent Workouts")
                .font(.headline)
                .foregroundStyle(.white)

            if vm.recentWorkouts.isEmpty {
                GlassCard {
                    HStack {
                        Image(systemName: "dumbbell")
                            .foregroundStyle(.secondary)
                        Text("No workouts yet. Start logging!")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }
            } else {
                ForEach(vm.recentWorkouts) { workout in
                    GlassCard(padding: AppTheme.spacingSM) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(workout.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)
                                HStack(spacing: AppTheme.spacingXS) {
                                    if let count = workout.exercises?.count {
                                        Label("\(count) exercises", systemImage: "figure.strengthtraining.traditional")
                                    }
                                    if let dur = workout.durationMin {
                                        Label("\(dur) min", systemImage: "clock")
                                    }
                                }
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(formatDate(workout.date))
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }
        }
    }

    private func formatDate(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr) ?? ISO8601DateFormatter().date(from: dateStr) else {
            return dateStr.prefix(10).description
        }
        let display = DateFormatter()
        display.dateStyle = .short
        return display.string(from: date)
    }
}
