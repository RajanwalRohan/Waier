import SwiftUI

@MainActor
class ProgressViewModel: ObservableObject {
    @Published var workoutCount = 0
    @Published var mealCount = 0
    @Published var metricsByType: [String: [HealthMetric]] = [:]
    @Published var isLoading = false

    func loadProgress() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            async let workoutsTask = APIClient.shared.getWorkouts(page: 1, limit: 100)
            async let mealsTask = APIClient.shared.getMeals(page: 1, limit: 100)
            async let metricsTask = APIClient.shared.getHealthMetrics(limit: 100)

            let (workoutsResp, mealsResp, metricsResp) = try await (workoutsTask, mealsTask, metricsTask)

            workoutCount = workoutsResp.data?.total ?? 0
            mealCount = mealsResp.data?.total ?? 0

            let allMetrics = metricsResp.data?.metrics ?? []
            metricsByType = Dictionary(grouping: allMetrics, by: { $0.type })
        } catch {
            // Handle silently — UI will show empty state
        }

        isLoading = false
    }

    func colorForMetric(_ type: String) -> Color {
        switch type {
        case "steps": return AppTheme.steps
        case "heart_rate": return AppTheme.heartRate
        case "sleep_hours": return AppTheme.sleep
        case "calories_burned": return AppTheme.calories
        case "blood_oxygen": return AppTheme.breathing
        case "respiratory_rate": return AppTheme.breathing
        case "hrv": return AppTheme.recovery
        case "weight": return AppTheme.weight
        default: return .secondary
        }
    }

    func iconForMetric(_ type: String) -> String {
        switch type {
        case "steps": return "figure.walk"
        case "heart_rate": return "heart.fill"
        case "sleep_hours": return "moon.fill"
        case "calories_burned": return "flame.fill"
        case "blood_oxygen": return "lungs.fill"
        case "respiratory_rate": return "wind"
        case "hrv": return "waveform.path.ecg"
        case "weight": return "scalemass.fill"
        default: return "chart.bar.fill"
        }
    }
}
