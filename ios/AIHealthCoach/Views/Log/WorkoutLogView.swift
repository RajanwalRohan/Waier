import SwiftUI

struct WorkoutLogView: View {
    @State private var name = ""
    @State private var duration = ""
    @State private var exercises: [ExerciseEntry] = [ExerciseEntry()]
    @State private var isLoading = false
    @State private var showSuccess = false
    @State private var error: String?

    struct ExerciseEntry: Identifiable {
        let id = UUID()
        var name = ""
        var sets = ""
        var reps = ""
        var weight = ""
    }

    var body: some View {
        VStack(spacing: AppTheme.spacingMD) {
            if showSuccess {
                successBanner
            }

            // Workout Name
            VStack(alignment: .leading, spacing: 4) {
                Text("Workout Name")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                TextField("e.g. Upper Body Push", text: $name)
                    .textFieldStyle(GlassTextFieldStyle())
            }

            // Duration
            VStack(alignment: .leading, spacing: 4) {
                Text("Duration (min)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                TextField("Optional", text: $duration)
                    .textFieldStyle(GlassTextFieldStyle())
                    .keyboardType(.numberPad)
            }

            // Exercises
            VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
                HStack {
                    Text("Exercises")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button {
                        withAnimation { exercises.append(ExerciseEntry()) }
                    } label: {
                        Label("Add", systemImage: "plus.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.brand)
                    }
                }

                ForEach($exercises) { $ex in
                    GlassCard(padding: AppTheme.spacingSM) {
                        VStack(spacing: AppTheme.spacingSM) {
                            TextField("Exercise name", text: $ex.name)
                                .textFieldStyle(GlassTextFieldStyle())

                            HStack(spacing: AppTheme.spacingSM) {
                                VStack(alignment: .leading) {
                                    Text("Sets").font(.caption2).foregroundStyle(.tertiary)
                                    TextField("0", text: $ex.sets)
                                        .textFieldStyle(GlassTextFieldStyle())
                                        .keyboardType(.numberPad)
                                }
                                VStack(alignment: .leading) {
                                    Text("Reps").font(.caption2).foregroundStyle(.tertiary)
                                    TextField("0", text: $ex.reps)
                                        .textFieldStyle(GlassTextFieldStyle())
                                        .keyboardType(.numberPad)
                                }
                                VStack(alignment: .leading) {
                                    Text("kg").font(.caption2).foregroundStyle(.tertiary)
                                    TextField("0", text: $ex.weight)
                                        .textFieldStyle(GlassTextFieldStyle())
                                        .keyboardType(.decimalPad)
                                }
                            }
                        }
                    }
                }
            }

            // Submit Button
            Button {
                Task { await logWorkout() }
            } label: {
                HStack {
                    if isLoading { ProgressView().tint(.white) }
                    Text(isLoading ? "Saving..." : "Log Workout")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.spacingSM)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.brand)
            .disabled(name.isEmpty || isLoading)

            Spacer()
        }
        .padding(AppTheme.spacingMD)
    }

    private var successBanner: some View {
        HStack {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("Workout logged!")
                .font(.subheadline)
                .foregroundStyle(.green)
            Spacer()
        }
        .padding(AppTheme.spacingSM)
        .background(.green.opacity(0.15), in: RoundedRectangle(cornerRadius: AppTheme.radiusSM))
    }

    private func logWorkout() async {
        isLoading = true
        error = nil
        showSuccess = false

        let exerciseInputs = exercises.filter { !$0.name.isEmpty }.enumerated().map { i, ex in
            ExerciseInput(
                name: ex.name,
                sets: Int(ex.sets),
                reps: Int(ex.reps),
                weightKg: Double(ex.weight),
                order: i
            )
        }

        let request = CreateWorkoutRequest(
            name: name,
            notes: nil,
            durationMin: Int(duration),
            date: ISO8601DateFormatter().string(from: Date()),
            exercises: exerciseInputs
        )

        do {
            let _ = try await APIClient.shared.createWorkout(request)
            showSuccess = true
            name = ""
            duration = ""
            exercises = [ExerciseEntry()]
        } catch {
            self.error = "Failed to log workout"
        }

        isLoading = false
    }
}
