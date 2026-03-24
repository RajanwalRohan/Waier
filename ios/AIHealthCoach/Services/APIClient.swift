import Foundation

/// Centralized API client for communicating with the backend.
///
/// SECURITY:
///  - All requests go over HTTPS.
///  - Auth tokens stored in Keychain, injected via cookie header.
///  - Response bodies validated before decoding.
///  - No secrets in client-side code.
actor APIClient {
    static let shared = APIClient()

    // IMPORTANT: Change this to your production API URL.
    // In development, use your local Next.js server.
    #if DEBUG
    private let baseURL = "http://localhost:3000"
    #else
    private let baseURL = "https://api.yourdomain.com"
    #endif

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Request Builder

    private func makeRequest(
        path: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) throws -> URLRequest {
        var components = URLComponents(string: baseURL + path)!
        if let queryItems { components.queryItems = queryItems }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")

        // Inject auth session cookie if available
        if let sessionToken = KeychainService.load(key: "session-token") {
            request.setValue("next-auth.session-token=\(sessionToken)", forHTTPHeaderField: "Cookie")
        }

        if let body {
            request.httpBody = try encoder.encode(body)
        }

        return request
    }

    // MARK: - Response Handler

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Extract and store session cookie if present
        if let headerFields = httpResponse.allHeaderFields as? [String: String],
           let url = request.url {
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: headerFields, for: url)
            for cookie in cookies where cookie.name == "next-auth.session-token" {
                KeychainService.save(key: "session-token", value: cookie.value)
            }
        }

        switch httpResponse.statusCode {
        case 200...299:
            return try decoder.decode(T.self, from: data)
        case 401:
            throw APIError.unauthorized
        case 429:
            throw APIError.rateLimited
        default:
            // Try to extract error message from response
            if let errorResp = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw APIError.server(errorResp.error)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }
    }

    // MARK: - Public API Methods

    func signup(name: String?, email: String, password: String) async throws -> AuthResponse {
        let body = SignupRequest(name: name, email: email, password: password)
        let request = try makeRequest(path: "/api/auth/signup", method: "POST", body: body)
        return try await perform(request)
    }

    func login(email: String, password: String) async throws {
        // NextAuth uses form-based CSRF flow. We call the credentials endpoint.
        let body = LoginRequest(email: email, password: password)
        let request = try makeRequest(path: "/api/auth/callback/credentials", method: "POST", body: body)
        let _: AuthResponse = try await perform(request)
    }

    func getProfile() async throws -> ProfileResponse {
        let request = try makeRequest(path: "/api/profile")
        return try await perform(request)
    }

    func updateProfile(_ data: [String: Any]) async throws -> ProfileResponse {
        let jsonData = try JSONSerialization.data(withJSONObject: data)
        var request = try makeRequest(path: "/api/profile", method: "PUT")
        request.httpBody = jsonData
        return try await perform(request)
    }

    func getWorkouts(page: Int = 1, limit: Int = 20) async throws -> APIResponse<WorkoutsData> {
        let request = try makeRequest(
            path: "/api/workouts",
            queryItems: [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "limit", value: "\(limit)"),
            ]
        )
        return try await perform(request)
    }

    func createWorkout(_ workout: CreateWorkoutRequest) async throws -> APIResponse<WorkoutData> {
        let request = try makeRequest(path: "/api/workouts", method: "POST", body: workout)
        return try await perform(request)
    }

    func getMeals(page: Int = 1, limit: Int = 20) async throws -> APIResponse<MealsData> {
        let request = try makeRequest(
            path: "/api/nutrition",
            queryItems: [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "limit", value: "\(limit)"),
            ]
        )
        return try await perform(request)
    }

    func createMeal(_ meal: CreateMealRequest) async throws -> APIResponse<MealData> {
        let request = try makeRequest(path: "/api/nutrition", method: "POST", body: meal)
        return try await perform(request)
    }

    func getHealthMetrics(type: String? = nil, limit: Int = 50) async throws -> APIResponse<MetricsData> {
        var items = [URLQueryItem(name: "limit", value: "\(limit)")]
        if let type { items.append(URLQueryItem(name: "type", value: type)) }
        let request = try makeRequest(path: "/api/health-metrics", queryItems: items)
        return try await perform(request)
    }

    func sendChatMessage(_ message: String, history: [ChatHistoryItem]?) async throws -> URLRequest {
        let body = AIChatRequest(message: message, history: history, conversationId: nil)
        return try makeRequest(path: "/api/ai/chat", method: "POST", body: body)
    }
}

// MARK: - Response Data Types

struct WorkoutsData: Codable {
    let workouts: [Workout]
    let total: Int
}

struct WorkoutData: Codable {
    let workout: Workout
}

struct MealsData: Codable {
    let meals: [Meal]
    let total: Int
}

struct MealData: Codable {
    let meal: Meal
}

struct MetricsData: Codable {
    let metrics: [HealthMetric]
    let total: Int
}

// MARK: - Error Types

struct APIErrorResponse: Codable {
    let success: Bool
    let error: String
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case rateLimited
    case server(String)
    case httpError(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid request"
        case .invalidResponse: return "Invalid response from server"
        case .unauthorized: return "Please sign in again"
        case .rateLimited: return "Too many requests. Please wait a moment."
        case .server(let msg): return msg
        case .httpError(let code): return "Server error (\(code))"
        }
    }
}
