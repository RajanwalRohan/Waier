import SwiftUI

struct MealLogView: View {
    @State private var name = ""
    @State private var mealType = "lunch"
    @State private var calories = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var description = ""
    @State private var isLoading = false
    @State private var showSuccess = false

    let mealTypes = ["breakfast", "lunch", "dinner", "snack"]

    var body: some View {
        VStack(spacing: AppTheme.spacingMD) {
            if showSuccess {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("Meal logged!")
                        .font(.subheadline)
                        .foregroundStyle(.green)
                    Spacer()
                }
                .padding(AppTheme.spacingSM)
                .background(.green.opacity(0.15), in: RoundedRectangle(cornerRadius: AppTheme.radiusSM))
            }

            // Meal Name
            VStack(alignment: .leading, spacing: 4) {
                Text("Meal Name")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                TextField("e.g. Grilled Chicken Salad", text: $name)
                    .textFieldStyle(GlassTextFieldStyle())
            }

            // Meal Type
            VStack(alignment: .leading, spacing: 4) {
                Text("Meal Type")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Picker("Type", selection: $mealType) {
                    ForEach(mealTypes, id: \.self) { type in
                        Text(type.capitalized).tag(type)
                    }
                }
                .pickerStyle(.segmented)
            }

            // Macros Grid
            VStack(alignment: .leading, spacing: 4) {
                Text("Nutrition")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                ], spacing: AppTheme.spacingSM) {
                    macroField("Calories", text: $calories, unit: "kcal", color: AppTheme.calories)
                    macroField("Protein", text: $protein, unit: "g", color: AppTheme.brand)
                    macroField("Carbs", text: $carbs, unit: "g", color: AppTheme.steps)
                    macroField("Fat", text: $fat, unit: "g", color: AppTheme.heartRate)
                }
            }

            // Description
            VStack(alignment: .leading, spacing: 4) {
                Text("Description (optional)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                TextField("What did you eat?", text: $description, axis: .vertical)
                    .textFieldStyle(GlassTextFieldStyle())
                    .lineLimit(2...4)
            }

            // Submit
            Button {
                Task { await logMeal() }
            } label: {
                HStack {
                    if isLoading { ProgressView().tint(.white) }
                    Text(isLoading ? "Saving..." : "Log Meal")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.spacingSM)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.calories)
            .disabled(name.isEmpty || isLoading)

            Spacer()
        }
        .padding(AppTheme.spacingMD)
    }

    private func macroField(_ label: String, text: Binding<String>, unit: String, color: Color) -> some View {
        GlassCard(padding: AppTheme.spacingSM) {
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(label)
                        .font(.caption)
                        .foregroundStyle(color)
                    Spacer()
                    Text(unit)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                TextField("0", text: text)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .keyboardType(.decimalPad)
                    .foregroundStyle(.white)
            }
        }
    }

    private func logMeal() async {
        isLoading = true
        showSuccess = false

        let request = CreateMealRequest(
            name: name,
            description: description.isEmpty ? nil : description,
            calories: Double(calories),
            proteinG: Double(protein),
            carbsG: Double(carbs),
            fatG: Double(fat),
            mealType: mealType,
            date: ISO8601DateFormatter().string(from: Date())
        )

        do {
            let _ = try await APIClient.shared.createMeal(request)
            showSuccess = true
            name = ""
            calories = ""
            protein = ""
            carbs = ""
            fat = ""
            description = ""
        } catch {
            // Handle silently — user sees no success
        }

        isLoading = false
    }
}
