import SwiftUI

struct SignupView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    let switchToLogin: () -> Void

    var body: some View {
        VStack(spacing: AppTheme.spacingLG) {
            Spacer()

            VStack(spacing: AppTheme.spacingSM) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(AppTheme.brand)

                Text("Create Account")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
            }

            Spacer()

            VStack(spacing: AppTheme.spacingMD) {
                if let error = authVM.error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(AppTheme.spacingSM)
                        .frame(maxWidth: .infinity)
                        .background(.red.opacity(0.1), in: RoundedRectangle(cornerRadius: AppTheme.radiusSM))
                }

                TextField("Name (optional)", text: $name)
                    .textFieldStyle(GlassTextFieldStyle())
                    .textContentType(.name)

                TextField("Email", text: $email)
                    .textFieldStyle(GlassTextFieldStyle())
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)

                SecureField("Password (min 8 characters)", text: $password)
                    .textFieldStyle(GlassTextFieldStyle())
                    .textContentType(.newPassword)

                Button {
                    Task {
                        await authVM.signup(
                            name: name.isEmpty ? nil : name,
                            email: email,
                            password: password
                        )
                    }
                } label: {
                    HStack {
                        if authVM.isLoading { ProgressView().tint(.white) }
                        Text(authVM.isLoading ? "Creating..." : "Create Account")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.spacingSM)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.brand)
                .disabled(email.isEmpty || password.count < 8 || authVM.isLoading)
            }

            Button {
                switchToLogin()
            } label: {
                HStack(spacing: 4) {
                    Text("Already have an account?")
                        .foregroundStyle(.secondary)
                    Text("Sign in")
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
