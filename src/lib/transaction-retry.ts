const RETRYABLE_TRANSACTION_CODES = new Set(["40P01", "40001"]);

export async function retryTransaction<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const directCode = error && typeof error === "object" && "code" in error ? error.code : null;
    const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
    const causeCode = cause && typeof cause === "object" && "code" in cause ? cause.code : null;
    const code = directCode ?? causeCode;
    if (!code || !RETRYABLE_TRANSACTION_CODES.has(String(code))) throw error;
    return operation();
  }
}
