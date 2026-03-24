import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?
    @Published var currentUser: User?

    init() {
        // Check for existing session
        if KeychainService.load(key: "session-token") != nil {
            isAuthenticated = true
            Task { await loadProfile() }
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        error = nil

        do {
            try await APIClient.shared.login(email: email, password: password)
            isAuthenticated = true
            await loadProfile()
        } catch let err as APIError {
            error = err.localizedDescription
        } catch {
            self.error = "Something went wrong. Please try again."
        }

        isLoading = false
    }

    func signup(name: String?, email: String, password: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.signup(name: name, email: email, password: password)
            if response.success {
                // Auto-login after signup
                await login(email: email, password: password)
            } else {
                error = response.error ?? "Unable to create account"
            }
        } catch let err as APIError {
            error = err.localizedDescription
        } catch {
            self.error = "Something went wrong. Please try again."
        }

        isLoading = false
    }

    func signOut() {
        KeychainService.delete(key: "session-token")
        currentUser = nil
        isAuthenticated = false
    }

    private func loadProfile() async {
        do {
            let response = try await APIClient.shared.getProfile()
            currentUser = response.data?.user
        } catch {
            // Silently fail — profile will load on next screen access
        }
    }
}
