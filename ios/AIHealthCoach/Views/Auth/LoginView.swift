import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    let switchToSignup: () -> Void

    var body: some View {
        VStack(spacing: AppTheme.spacingLG) {
            Spacer()

            // Logo / Title
            VStack(spacing: AppTheme.spacingSM) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(AppTheme.brand)

                Text("AI Health Coach")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text("Your personal fitness & wellness AI")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Form
            VStack(spacing: AppTheme.spacingMD) {
                if let error = authVM.error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(AppTheme.spacingSM)
                        .frame(maxWidth: .infinity)
                        .background(.red.opacity(0.1), in: RoundedRectangle(cornerRadius: AppTheme.radiusSM))
                }

                TextField("Email", text: $email)
                    .textFieldStyle(GlassTextFieldStyle())
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)

                SecureField("Password", text: $password)
                    .textFieldStyle(GlassTextFieldStyle())
                    .textContentType(.password)

                Button {
                    Task { await authVM.login(email: email, password: password) }
                } label: {
                    HStack {
                        if authVM.isLoading { ProgressView().tint(.white) }
                        Text(authVM.isLoading ? "Signing in..." : "Sign In")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.spacingSM)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.brand)
                .disabled(email.isEmpty || password.isEmpty || authVM.isLoading)
            }

            Button {
                switchToSignup()
            } label: {
                HStack(spacing: 4) {
                    Text("Don't have an account?")
                        .foregroundStyle(.secondary)
                    Text("Sign up")
                        .foregroundStyle(AppTheme.brand)
                        .fontWeight(.medium)
                }
                .font(.subheadline)
            }

            Spacer().frame(height: AppTheme.spacingXL)
        }
        .padding(.horizontal, AppTheme.spacingLG)
        .background(Color.black)
    }
}
