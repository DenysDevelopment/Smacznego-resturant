export interface SelectedOption {
  groupId: string; groupName: string; optionId: string; optionName: string;
  /** Snapshot of option's price delta for display/audit only — already baked into the item's unitPrice. Do NOT re-add. */
  priceDelta: number
}
export interface CartItem {
  dishId: string; name: string;
  /** Fully-resolved per-unit price in grosze, already including all selected-option price deltas (computed via dishPriceGrosze at add-time). lineTotal must NOT re-add option deltas. */
  unitPrice: number; qty: number; selectedOptions: SelectedOption[]
}
export type Cart = CartItem[]
