import SwiftUI

struct AuthGateView: View {
    @State private var showLogin = true

    var body: some View {
        NavigationStack {
            if showLogin {
                LoginView(switchToSignup: { showLogin = false })
            } else {
                SignupView(switchToLogin: { showLogin = true })
            }
        }
    }
}
