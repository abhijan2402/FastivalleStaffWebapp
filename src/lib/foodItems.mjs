export function foodItemForForm(item) {
  return typeof item === 'string' ? { name: item, quantity: '', unit: '', price: '' } : {
    name: item.name, quantity: item.quantity == null ? '' : String(item.quantity), unit: item.unit ?? '', price: item.price == null ? '' : String(item.price),
  }
}

const numeric = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
export function validFoodItem(item, { allowMissing = false } = {}) {
  return item && typeof item.name === 'string' && item.name.trim() && ((allowMissing && item.unit == null) || (typeof item.unit === 'string' && item.unit.trim()))
    && ((allowMissing && item.quantity == null) || (numeric(item.quantity) && Number(item.quantity) > 0))
    && ((allowMissing && item.price == null) || (numeric(item.price) && Number(item.price) >= 0))
}

export function serializeFoodItems(items) {
  if (!items.length || items.some(item => !validFoodItem(item))) throw Error('Enter a name, quantity greater than zero, unit and price for every food item.')
  return items.map(item => ({ name: item.name.trim(), quantity: String(item.quantity).trim(), unit: item.unit.trim(), price: Number(item.price).toFixed(2) }))
}
