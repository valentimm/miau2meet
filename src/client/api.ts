export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Sem conexão com o miau2meet.", 0);
  }

  const text = await response.text();
  let body: { error?: string; fields?: Record<string, string> } & T = {} as {
    error?: string;
    fields?: Record<string, string>;
  } & T;
  if (text) {
    try {
      body = JSON.parse(text) as { error?: string; fields?: Record<string, string> } & T;
    } catch {
      throw new ApiError("A API não respondeu JSON.", response.status);
    }
  }
  if (!response.ok) {
    throw new ApiError(body.error || "Não deu para completar.", response.status, body.fields);
  }
  return body;
}
