import SwiftUI

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var recentWorkouts: [Workout] = []
    @Published var todayMeals: [Meal] = []
    @Published var metrics: [HealthMetric] = []
    @Published var isLoading = false
    @Published var error: String?

    // Computed metric accessors
    var latestSteps: HealthMetric? { metrics.first { $0.type == "steps" } }
    var latestHeartRate: HealthMetric? { metrics.first { $0.type == "heart_rate" } }
    var latestSleep: HealthMetric? { metrics.first { $0.type == "sleep_hours" } }
    var todayCalories: Double { todayMeals.reduce(0) { $0 + ($1.calories ?? 0) } }
    var latestBloodOxygen: HealthMetric? { metrics.first { $0.type == "blood_oxygen" } }
    var latestHRV: HealthMetric? { metrics.first { $0.type == "hrv" } }

    var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 17 { return "Good afternoon" }
        return "Good evening"
    }

    var insightText: String {
        if recentWorkouts.isEmpty && todayMeals.isEmpty {
            return "Start your journey! Log a workout or meal to get personalized insights from your AI coach."
        }

        var parts: [String] = []
        if !recentWorkouts.isEmpty {
            parts.append("You've completed \(recentWorkouts.count) recent workouts")
        }
        if todayCalories > 0 {
            parts.append("\(Int(todayCalories)) calories logged today")
        }
        if let sleep = latestSleep {
            parts.append(String(format: "%.1f hours of sleep recorded", sleep.value))
        }

        return parts.isEmpty
            ? "Ask your AI coach for personalized recommendations!"
            : parts.joined(separator: ". ") + "."
    }

    func loadDashboard() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        async let workoutsTask = APIClient.shared.getWorkouts(page: 1, limit: 3)
        async let mealsTask = APIClient.shared.getMeals(page: 1, limit: 10)
        async let metricsTask = APIClient.shared.getHealthMetrics(limit: 20)

        do {
            let (workoutsResp, mealsResp, metricsResp) = try await (workoutsTask, mealsTask, metricsTask)
            recentWorkouts = workoutsResp.data?.workouts ?? []
            todayMeals = mealsResp.data?.meals ?? []
            metrics = metricsResp.data?.metrics ?? []
        } catch {
            self.error = "Failed to load dashboard"
        }

        isLoading = false
    }
}
