import { BetterAuthError } from "@better-auth/core/error";

export interface AuthErrorResult {
  code: string;
  message: string;
}

const AuthErrorMessages: Record<string, string> = {
  USER_NOT_FOUND: "The requested user account was not found",
  FAILED_TO_CREATE_USER: "Unable to create user account",
  FAILED_TO_CREATE_SESSION: "Unable to establish session",
  FAILED_TO_UPDATE_USER: "Unable to update user account",
  FAILED_TO_GET_SESSION: "Unable to verify session",
  INVALID_PASSWORD: "The password you entered is incorrect",
  INVALID_EMAIL: "The email address format is invalid",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
  SOCIAL_ACCOUNT_ALREADY_LINKED:
    "This social account is already linked to another user",
  PROVIDER_NOT_FOUND: "Authentication provider not found",
  INVALID_TOKEN: "The provided token is invalid or has expired",
  ID_TOKEN_NOT_SUPPORTED: "ID token authentication is not supported",
  FAILED_TO_GET_USER_INFO: "Unable to retrieve user information",
  USER_EMAIL_NOT_FOUND: "No email address associated with this account",
  EMAIL_NOT_VERIFIED: "Your email address has not been verified",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  PASSWORD_TOO_LONG: "Password must be less than 100 characters",
  USER_ALREADY_EXISTS: "An account with this email already exists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists. Please use a different email",
  EMAIL_CAN_NOT_BE_UPDATED: "Email address cannot be changed",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "No password set for this account",
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  FAILED_TO_UNLINK_LAST_ACCOUNT:
    "You must have at least one authentication method linked",
  ACCOUNT_NOT_FOUND: "The requested account was not found",
  USER_ALREADY_HAS_PASSWORD: "This account already has a password set",
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
    "Login blocked: This request appears to be a cross-site navigation attack",
  VERIFICATION_EMAIL_NOT_ENABLED: "Email verification is not enabled",
  EMAIL_ALREADY_VERIFIED: "This email has already been verified",
  EMAIL_MISMATCH: "Email address mismatch",
  SESSION_NOT_FRESH: "Please re-authenticate to continue",
  LINKED_ACCOUNT_ALREADY_EXISTS: "This account is already linked",
  INVALID_ORIGIN: "Request origin is not allowed",
  INVALID_CALLBACK_URL: "The callback URL is invalid",
  INVALID_REDIRECT_URL: "The redirect URL is invalid",
  INVALID_ERROR_CALLBACK_URL: "The error callback URL is invalid",
  INVALID_NEW_USER_CALLBACK_URL: "The new user callback URL is invalid",
  MISSING_OR_NULL_ORIGIN: "Request origin is required",
  CALLBACK_URL_REQUIRED: "Callback URL is required",
  FAILED_TO_CREATE_VERIFICATION: "Unable to create verification",
  FIELD_NOT_ALLOWED: "This field cannot be modified",
};

export function parseAuthError(error: unknown): AuthErrorResult {
  if (error instanceof BetterAuthError) {
    const code = error.message;
    if (code in AuthErrorMessages) {
      return {
        code,
        message: AuthErrorMessages[code] || error.message,
      };
    }
    return {
      code,
      message: code,
    };
  }

  return {
    code: "UNKNOWN",
    message: "An authentication error occurred",
  };
}
