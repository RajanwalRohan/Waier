import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            CoachView()
                .tabItem {
                    Label("Coach", systemImage: "bubble.left.and.text.bubble.right.fill")
                }
                .tag(1)

            HealthProgressView()
                .tabItem {
                    Label("Progress", systemImage: "chart.bar.fill")
                }
                .tag(2)

            LogView()
                .tabItem {
                    Label("Log", systemImage: "plus.circle.fill")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(4)
        }
    }
}
