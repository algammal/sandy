export interface SimulateOptions {
  delayMs?: number;
  failureRate?: number;
  errorMessage?: string;
}

export function simulateRequest<T>(factory: () => T, options: SimulateOptions = {}): Promise<T> {
  const { delayMs = 450, failureRate = 0, errorMessage = "Request failed. Please try again." } = options;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (failureRate > 0 && Math.random() < failureRate) {
        reject(new Error(errorMessage));
        return;
      }
      resolve(factory());
    }, delayMs);
  });
}
