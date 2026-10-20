import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { output as ZodOutput, ZodTypeAny } from 'zod';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function parseInput<Schema extends ZodTypeAny>(schema: Schema, value: unknown): ZodOutput<Schema> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;

  const fields: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fields[key] ??= issue.message;
  }
  throw new ApiError(400, 'VALIDATION_ERROR', 'Revise os dados informados.', fields);
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new ApiError(404, 'NOT_FOUND', 'Recurso não encontrado.'));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  const bodyError = error as SyntaxError & { status?: number; statusCode?: number; type?: string };
  if (error instanceof SyntaxError && (bodyError.type === 'entity.parse.failed' || bodyError.status === 400 || bodyError.statusCode === 400)) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'O corpo da requisição contém JSON inválido.' },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revise os dados informados.' } });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' },
  });
};
