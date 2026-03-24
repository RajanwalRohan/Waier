import SwiftUI

struct CoachView: View {
    @StateObject private var vm = CoachViewModel()
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: AppTheme.spacingSM) {
                            if vm.messages.isEmpty {
                                emptyState
                            }

                            ForEach(vm.messages) { msg in
                                messageBubble(msg)
                                    .id(msg.id)
                            }

                            if vm.isLoading && (vm.messages.last?.role != "assistant") {
                                typingIndicator
                            }
                        }
                        .padding(.horizontal, AppTheme.spacingMD)
                        .padding(.vertical, AppTheme.spacingSM)
                    }
                    .onChange(of: vm.messages.count) { _, _ in
                        if let last = vm.messages.last {
                            withAnimation {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                // Input Bar
                inputBar
            }
            .background(Color.black)
            .navigationTitle("AI Coach")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: AppTheme.spacingLG) {
            Spacer().frame(height: 40)

            Image(systemName: "brain.head.profile")
                .font(.system(size: 48))
                .foregroundStyle(AppTheme.brand)

            Text("Your AI Coach")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(.white)

            Text("Ask me anything about fitness, nutrition, recovery, or your health data.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            VStack(spacing: AppTheme.spacingSM) {
                ForEach(vm.suggestedPrompts, id: \.self) { prompt in
                    Button {
                        Task { await vm.sendMessage(prompt) }
                    } label: {
                        HStack {
                            Text(prompt)
                                .font(.subheadline)
                                .foregroundStyle(.white)
                            Spacer()
                            Image(systemName: "arrow.up.circle.fill")
                                .foregroundStyle(AppTheme.brand)
                        }
                        .padding(.horizontal, AppTheme.spacingMD)
                        .padding(.vertical, AppTheme.spacingSM)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AppTheme.radiusMD))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Message Bubble

    private func messageBubble(_ msg: ChatMessage) -> some View {
        HStack {
            if msg.role == "user" { Spacer(minLength: 60) }

            VStack(alignment: msg.role == "user" ? .trailing : .leading) {
                Text(msg.content)
                    .font(.subheadline)
                    .foregroundStyle(msg.role == "user" ? .white : .primary)
                    .padding(.horizontal, AppTheme.spacingMD)
                    .padding(.vertical, AppTheme.spacingSM)
                    .background {
                        if msg.role == "user" {
                            RoundedRectangle(cornerRadius: AppTheme.radiusLG)
                                .fill(AppTheme.brand)
                        } else {
                            RoundedRectangle(cornerRadius: AppTheme.radiusLG)
                                .fill(.ultraThinMaterial)
                        }
                    }
            }

            if msg.role == "assistant" { Spacer(minLength: 60) }
        }
    }

    // MARK: - Typing Indicator

    private var typingIndicator: some View {
        HStack {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(.secondary)
                        .frame(width: 6, height: 6)
                        .opacity(0.6)
                }
            }
            .padding(.horizontal, AppTheme.spacingMD)
            .padding(.vertical, AppTheme.spacingSM)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AppTheme.radiusLG))
            Spacer()
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: AppTheme.spacingSM) {
            TextField("Ask your coach...", text: $vm.inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .font(.subheadline)
                .padding(.horizontal, AppTheme.spacingSM)
                .padding(.vertical, AppTheme.spacingSM)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AppTheme.radiusMD))
                .focused($isInputFocused)
                .lineLimit(1...4)
                .submitLabel(.send)
                .onSubmit {
                    Task { await vm.sendMessage() }
                }

            Button {
                Task { await vm.sendMessage() }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundStyle(
                        vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty
                            ? .secondary
                            : AppTheme.brand
                    )
            }
            .disabled(vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty || vm.isLoading)
        }
        .padding(.horizontal, AppTheme.spacingMD)
        .padding(.vertical, AppTheme.spacingSM)
        .background(.bar)
    }
}
