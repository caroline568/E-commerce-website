const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function requestApi(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "We could not connect to the store. Please try again shortly.",
    );
  }

  let payload;
  try {
    payload = response.status === 204 ? null : await response.json();
  } catch {
    throw new ApiError("The store returned an unreadable response.", {
      status: response.status,
    });
  }
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || "The request could not be completed.",
      {
        status: response.status,
        code: payload?.error?.code,
        details: payload?.error?.details,
      },
    );
  }

  return payload;
}

export function formatMoney(amountMinor, currency, locale = "en") {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
  return formatter.format(amountMinor / 10 ** fractionDigits);
}
