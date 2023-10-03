export const debounce = (func: (...args: any[]) => void, timeout: number = 500) => {
  let timer
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, timeout)
  }
}
