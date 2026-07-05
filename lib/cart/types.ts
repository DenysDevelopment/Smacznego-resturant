export interface SelectedOption {
  groupId: string; groupName: string; optionId: string; optionName: string; priceDelta: number
}
export interface CartItem {
  dishId: string; name: string; unitPrice: number; qty: number; selectedOptions: SelectedOption[]
}
export type Cart = CartItem[]
