import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    message: string,
    public errorCode: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, error: errorCode }, status);
  }
}

export class ConflictException extends AppException {
  constructor(message: string, errorCode: string = "CONFLICT") {
    super(message, errorCode, HttpStatus.CONFLICT);
  }
}

export class NotFoundException extends AppException {
  constructor(message: string, errorCode: string = "NOT_FOUND") {
    super(message, errorCode, HttpStatus.NOT_FOUND);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message: string, errorCode: string = "UNAUTHORIZED") {
    super(message, errorCode, HttpStatus.UNAUTHORIZED);
  }
}
