export function readable(filename: string) {
  const [name, type] = filename.replace('.json', '').split('.')
  return `${name} (${type})`
}
