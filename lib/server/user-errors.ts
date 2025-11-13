export class DuplicateUserError extends Error {
  status = 409
  constructor(message = "An account with that email already exists.") {
    super(message)
    this.name = "DuplicateUserError"
  }
}

export class WeakPasswordError extends Error {
  status = 400
  constructor(message = "Password does not meet the security requirements.") {
    super(message)
    this.name = "WeakPasswordError"
  }
}

export class InvalidCredentialsError extends Error {
  status = 401
  constructor(message = "Invalid email or password.") {
    super(message)
    this.name = "InvalidCredentialsError"
  }
}

export class UserNotFoundError extends Error {
  status = 404
  constructor(message = "User not found.") {
    super(message)
    this.name = "UserNotFoundError"
  }
}
