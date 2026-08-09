namespace EduAssignPro.Application.Exceptions;

public class AppException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }

    public AppException(string message, int statusCode = 400, string code = "APP_ERROR")
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message, 404, "NOT_FOUND") { }
}

public class ForbiddenException : AppException
{
    public ForbiddenException(string message) : base(message, 403, "FORBIDDEN") { }
}

public class ConflictException : AppException
{
    public ConflictException(string message) : base(message, 409, "CONFLICT") { }
}

public class ValidationException : AppException
{
    public ValidationException(string message) : base(message, 400, "VALIDATION_ERROR") { }
}

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Unauthorized") : base(message, 401, "UNAUTHORIZED") { }
}