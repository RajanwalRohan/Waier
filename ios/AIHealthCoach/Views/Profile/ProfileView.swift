import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var name = ""
    @State private var age = ""
    @State private var heightCm = ""
    @State private var weightKg = ""
    @State private var sex = ""
    @State private var fitnessGoal = ""
    @State private var activityLevel = ""
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var showSuccess = false

    let sexOptions = ["", "male", "female", "other", "prefer_not_to_say"]
    let goalOptions = ["", "lose_weight", "gain_muscle", "maintain", "improve_endurance", "general_health"]
    let activityOptions = ["", "sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: AppTheme.spacingMD) {
                    if showSuccess {
                        HStack {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                            Text("Profile updated!").font(.subheadline).foregroundStyle(.green)
                            Spacer()
                        }
                        .padding(AppTheme.spacingSM)
                        .background(.green.opacity(0.15), in: RoundedRectangle(cornerRadius: AppTheme.radiusSM))
                    }

                    // Basic Info
                    profileSection("Basic Info") {
                        profileField("Name", text: $name)
                        profileField("Email", text: .constant(authVM.currentUser?.email ?? ""), disabled: true)
                    }

                    // Body Stats
                    profileSection("Body") {
                        HStack(spacing: AppTheme.spacingSM) {
                            profileField("Age", text: $age, keyboard: .numberPad)
                            profileField("Height (cm)", text: $heightCm, keyboard: .decimalPad)
                        }
                        HStack(spacing: AppTheme.spacingSM) {
                            profileField("Weight (kg)", text: $weightKg, keyboard: .decimalPad)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Sex").font(.caption).foregroundStyle(.secondary)
                                Picker("Sex", selection: $sex) {
                                    ForEach(sexOptions, id: \.self) { opt in
                                        Text(opt.isEmpty ? "Select" : opt.replacingOccurrences(of: "_", with: " ").capitalized)
                                            .tag(opt)
                                    }
                                }
                                .pickerStyle(.menu)
                                .tint(.white)
                            }
                        }
                    }

                    // Goals
                    profileSection("Goals & Activity") {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Fitness Goal").font(.caption).foregroundStyle(.secondary)
                            Picker("Goal", selection: $fitnessGoal) {
                                ForEach(goalOptions, id: \.self) { opt in
                                    Text(opt.isEmpty ? "Select" : opt.replacingOccurrences(of: "_", with: " ").capitalized)
                                        .tag(opt)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(.white)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Activity Level").font(.caption).foregroundStyle(.secondary)
                            Picker("Activity", selection: $activityLevel) {
                                ForEach(activityOptions, id: \.self) { opt in
                                    Text(opt.isEmpty ? "Select" : opt.replacingOccurrences(of: "_", with: " ").capitalized)
                                        .tag(opt)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(.white)
                        }
                    }

                    // Save Button
                    Button {
                        Task { await saveProfile() }
                    } label: {
                        HStack {
                            if isSaving { ProgressView().tint(.white) }
                            Text(isSaving ? "Saving..." : "Save Profile")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppTheme.spacingSM)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.brand)
                    .disabled(isSaving)

                    // Sign Out
                    Button(role: .destructive) {
                        authVM.signOut()
                    } label: {
                        Text("Sign Out")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AppTheme.spacingSM)
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                    .padding(.top, AppTheme.spacingMD)
                }
                .padding(AppTheme.spacingMD)
                .padding(.bottom, AppTheme.spacingXL)
            }
            .background(Color.black)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadProfile() }
        }
    }

    // MARK: - Helpers

    private func profileSection(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                content()
            }
        }
    }

    private func profileField(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default, disabled: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            TextField(label, text: text)
                .textFieldStyle(GlassTextFieldStyle())
                .keyboardType(keyboard)
                .disabled(disabled)
                .opacity(disabled ? 0.5 : 1)
        }
    }

    private func loadProfile() async {
        do {
            let response = try await APIClient.shared.getProfile()
            if let p = response.data?.profile {
                age = p.age.map(String.init) ?? ""
                heightCm = p.heightCm.map { String(format: "%.1f", $0) } ?? ""
                weightKg = p.weightKg.map { String(format: "%.1f", $0) } ?? ""
                sex = p.sex ?? ""
                fitnessGoal = p.fitnessGoal ?? ""
                activityLevel = p.activityLevel ?? ""
            }
            if let u = response.data?.user {
                name = u.name ?? ""
            }
        } catch {
            // Silently handle — empty form shown
        }
        isLoading = false
    }

    private func saveProfile() async {
        isSaving = true
        showSuccess = false

        var data: [String: Any] = [:]
        if !name.isEmpty { data["name"] = name }
        if let v = Int(age) { data["age"] = v }
        if let v = Double(heightCm) { data["heightCm"] = v }
        if let v = Double(weightKg) { data["weightKg"] = v }
        if !sex.isEmpty { data["sex"] = sex }
        if !fitnessGoal.isEmpty { data["fitnessGoal"] = fitnessGoal }
        if !activityLevel.isEmpty { data["activityLevel"] = activityLevel }

        do {
            let _ = try await APIClient.shared.updateProfile(data)
            showSuccess = true
        } catch {
            // Handle error
        }

        isSaving = false
    }
}
