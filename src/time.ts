export function getNow() {
  return Math.round(new Date().valueOf() / 1000)
}