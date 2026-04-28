class ApiResponse {
    constructor (statusCode, data, maessage = "SUCCESS") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}