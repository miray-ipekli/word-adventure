// Rejects with an Error('timeout') when `promise` has not settled within `ms`.
// Firestore never gives up on a stuck connection by itself, it just keeps waiting, so anything the
// player is waiting on gets a limit.
export function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
