import SwiftUI

@main
struct AIHealthCoachApp: App {
    @StateObject private var authVM = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if authVM.isAuthenticated {
                    MainTabView()
                        .environmentObject(authVM)
                } else {
                    AuthGateView()
                        .environmentObject(authVM)
                }
            }
            .preferredColorScheme(.dark)
            .tint(AppTheme.brand)
        }
    }
}
