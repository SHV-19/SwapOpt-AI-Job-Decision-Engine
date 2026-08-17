const ERROR_CODE_PATTERN =
  /^[A-Z][A-Z0-9_]{1,99}$/;

export class AppError extends Error {
  constructor(
    message,
    {
      statusCode = 500,
      code = "INTERNAL_SERVER_ERROR",
      details = null,
      expose = statusCode < 500,
      cause
    } = {}
  ) {
    validateMessage(message);
    validateStatusCode(statusCode);
    validateCode(code);
    validateExpose(expose);

    super(
      message.trim(),
      cause === undefined
        ? undefined
        : { cause }
    );

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = expose;

    Error.captureStackTrace?.(
      this,
      AppError
    );
  }

  static badRequest(
    message,
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 400,
      code:
        options.code ??
        "BAD_REQUEST",
      expose:
        options.expose ??
        true
    });
  }

  static unauthenticated(
    message =
      "Authentication is required.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 401,
      code:
        options.code ??
        "UNAUTHENTICATED",
      expose:
        options.expose ??
        true
    });
  }

  static forbidden(
    message =
      "You are not authorised to perform this action.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 403,
      code:
        options.code ??
        "FORBIDDEN",
      expose:
        options.expose ??
        true
    });
  }

  static notFound(
    message =
      "The requested resource was not found.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 404,
      code:
        options.code ??
        "NOT_FOUND",
      expose:
        options.expose ??
        true
    });
  }

  static conflict(
    message,
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 409,
      code:
        options.code ??
        "CONFLICT",
      expose:
        options.expose ??
        true
    });
  }

  static validation(
    message =
      "The request failed validation.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 422,
      code:
        options.code ??
        "VALIDATION_FAILED",
      expose:
        options.expose ??
        true
    });
  }

  static rateLimited(
    message =
      "Too many requests. Please try again later.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 429,
      code:
        options.code ??
        "RATE_LIMITED",
      expose:
        options.expose ??
        true
    });
  }

  static upstream(
    message =
      "A required external service failed.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode:
        options.statusCode ??
        502,
      code:
        options.code ??
        "UPSTREAM_SERVICE_ERROR",
      expose:
        options.expose ??
        false
    });
  }

  static unavailable(
    message =
      "The service is temporarily unavailable.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 503,
      code:
        options.code ??
        "SERVICE_UNAVAILABLE",
      expose:
        options.expose ??
        false
    });
  }

  static timeout(
    message =
      "A required external service did not respond in time.",
    options = {}
  ) {
    return new AppError(message, {
      ...options,
      statusCode: 504,
      code:
        options.code ??
        "UPSTREAM_TIMEOUT",
      expose:
        options.expose ??
        false
    });
  }
}

export function isAppError(value) {
  return value instanceof AppError;
}

function validateMessage(message) {
  if (
    typeof message !== "string" ||
    message.trim() === ""
  ) {
    throw new TypeError(
      "AppError message must be a non-empty string."
    );
  }
}

function validateStatusCode(
  statusCode
) {
  if (
    !Number.isInteger(statusCode) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    throw new TypeError(
      "AppError statusCode must be an integer between 400 and 599."
    );
  }
}

function validateCode(code) {
  if (
    typeof code !== "string" ||
    !ERROR_CODE_PATTERN.test(code)
  ) {
    throw new TypeError(
      "AppError code must use uppercase letters, numbers, and underscores."
    );
  }
}

function validateExpose(expose) {
  if (typeof expose !== "boolean") {
    throw new TypeError(
      "AppError expose must be a boolean."
    );
  }
}