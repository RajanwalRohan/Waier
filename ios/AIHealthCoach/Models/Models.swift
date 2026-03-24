import Foundation

// MARK: - Auth

struct AuthResponse: Codable {
    let success: Bool
    let data: AuthData?
    let error: String?
}

struct AuthData: Codable {
    let user: User?
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct SignupRequest: Codable {
    let name: String?
    let email: String
    let password: String
}

// MARK: - User & Profile

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let image: String?
    let createdAt: String?
}

struct Profile: Codable {
    let id: String?
    let age: Int?
    let heightCm: Double?
    let weightKg: Double?
    let sex: String?
    let fitnessGoal: String?
    let activityLevel: String?
    let dietaryPreferences: [String]?
}

struct ProfileResponse: Codable {
    let success: Bool
    let data: ProfileData?
}

struct ProfileData: Codable {
    let user: User?
    let profile: Profile?
}

// MARK: - Workout

struct Workout: Codable, Identifiable {
    let id: String
    let name: String
    let notes: String?
    let durationMin: Int?
    let date: String
    let exercises: [Exercise]?
    let createdAt: String?
}

struct Exercise: Codable, Identifiable {
    let id: String?
    let name: String
    let sets: Int?
    let reps: Int?
    let weightKg: Double?
    let durationSec: Int?
    let notes: String?
    let order: Int?
}

struct CreateWorkoutRequest: Codable {
    let name: String
    let notes: String?
    let durationMin: Int?
    let date: String
    let exercises: [ExerciseInput]
}

struct ExerciseInput: Codable {
    let name: String
    let sets: Int?
    let reps: Int?
    let weightKg: Double?
    let order: Int
}

// MARK: - Meal

struct Meal: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let calories: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let mealType: String?
    let date: String
    let createdAt: String?
}

struct CreateMealRequest: Codable {
    let name: String
    let description: String?
    let calories: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let mealType: String?
    let date: String
}

// MARK: - Health Metrics

struct HealthMetric: Codable, Identifiable {
    let id: String
    let type: String
    let value: Double
    let unit: String
    let source: String?
    let date: String
}

// MARK: - AI Chat

struct ChatMessage: Identifiable, Codable {
    let id: String
    let role: String  // "user" or "assistant"
    let content: String

    init(id: String = UUID().uuidString, role: String, content: String) {
        self.id = id
        self.role = role
        self.content = content
    }
}

struct AIChatRequest: Codable {
    let message: String
    let history: [ChatHistoryItem]?
    let conversationId: String?
}

struct ChatHistoryItem: Codable {
    let role: String
    let content: String
}

// MARK: - Generic API Response

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: String?
}

struct ListResponse<T: Codable>: Codable {
    let success: Bool
    let data: ListData<T>?
    let error: String?
}

struct ListData<T: Codable>: Codable {
    let total: Int?
    let page: Int?
    let limit: Int?

    // These have to be dynamic since different endpoints use different keys
    // We'll handle this in the API client
}
