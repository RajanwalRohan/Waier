import SwiftUI

struct LogView: View {
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("Log Type", selection: $selectedTab) {
                    Label("Workout", systemImage: "dumbbell.fill").tag(0)
                    Label("Meal", systemImage: "fork.knife").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, AppTheme.spacingMD)
                .padding(.top, AppTheme.spacingSM)

                ScrollView(showsIndicators: false) {
                    if selectedTab == 0 {
                        WorkoutLogView()
                    } else {
                        MealLogView()
                    }
                }
            }
            .background(Color.black)
            .navigationTitle("Log")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}
