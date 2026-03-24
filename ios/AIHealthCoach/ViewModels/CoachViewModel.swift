import SwiftUI

@MainActor
class CoachViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var error: String?

    let suggestedPrompts = [
        "How can I improve my sleep?",
        "Suggest a workout for today",
        "Am I on track with my goals?",
        "What should I eat post-workout?",
        "Analyze my recent progress",
        "Help me build a workout plan",
    ]

    func sendMessage(_ text: String? = nil) async {
        let msg = (text ?? inputText).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !msg.isEmpty, !isLoading else { return }

        let userMsg = ChatMessage(role: "user", content: msg)
        messages.append(userMsg)
        inputText = ""
        isLoading = true
        error = nil

        do {
            let history = messages.dropLast().suffix(20).map {
                ChatHistoryItem(role: $0.role, content: $0.content)
            }

            let request = try await APIClient.shared.sendChatMessage(msg, history: Array(history))

            // Stream the response
            let (bytes, response) = try await URLSession.shared.bytes(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode == 429 {
                throw APIError.rateLimited
            }

            if httpResponse.statusCode != 200 {
                throw APIError.httpError(httpResponse.statusCode)
            }

            var assistantContent = ""
            let assistantMsg = ChatMessage(role: "assistant", content: "")
            messages.append(assistantMsg)
            let assistantIndex = messages.count - 1

            for try await line in bytes.lines {
                // Parse Vercel AI SDK streaming format: "0:\"text\""
                if line.hasPrefix("0:") {
                    let jsonStr = String(line.dropFirst(2))
                    if let data = jsonStr.data(using: .utf8),
                       let text = try? JSONDecoder().decode(String.self, from: data) {
                        assistantContent += text
                        messages[assistantIndex] = ChatMessage(
                            id: assistantMsg.id,
                            role: "assistant",
                            content: assistantContent
                        )
                    }
                }
            }
        } catch let err as APIError {
            error = err.localizedDescription
            messages.append(ChatMessage(
                role: "assistant",
                content: "Sorry, I couldn't process that. Please try again."
            ))
        } catch {
            messages.append(ChatMessage(
                role: "assistant",
                content: "Sorry, I couldn't process that. Please try again."
            ))
        }

        isLoading = false
    }
}
