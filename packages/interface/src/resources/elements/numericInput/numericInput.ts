import {
  autoinject,
  bindable,
  bindingMode,
  computedFrom,
} from "aurelia-framework";
import { BigNumber } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { NumberService } from "services/numberService";

@autoinject
export class NumericInput {

  @bindable({ defaultBindingMode: bindingMode.oneTime }) public decimal = true;
  @bindable({ defaultBindingMode: bindingMode.toView }) public css?: string;
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public id?: string;
  /**
   * set this to initialize the value to display in the input. you can
   * change the input value at any time by updating this.  (You can't do it
   * by updating the value directly)
   */
  @bindable({ defaultBindingMode: bindingMode.toView }) public defaultText = "";
  @bindable({ defaultBindingMode: bindingMode.toView }) public autocomplete = "off";
  /**
   * this value starts out as equal to defaultValue and is updated as the user types.
   * Assumed to be in Wei and will be converted to ETH for the user and back to Wei for parent component.
   * Else value us set to  whatever string the user types.
   * If nothing is entered, then value is set to `undefined`.
   */
  @bindable({ defaultBindingMode: bindingMode.twoWay }) public value: string | BigNumber;
  /**
   * if true then value is converted from wei to eth for editing
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public isWei?: boolean = true;
  @bindable public placeholder = "";

  private element: HTMLInputElement;

  private _innerValue: string;

  @computedFrom("_innerValue")
  private get innerValue() {
    return this._innerValue;
  }

  private set innerValue(newValue: string) {
    this._innerValue = newValue;
    /**
     * update value from input control
     */
    if ((newValue === null) || (typeof newValue === "undefined") || (newValue.trim() === "")) {
      this.value = undefined;
    } else {
      // assuming here that the input element will always give us a string
      try {
        this.value = this.isWei ? parseEther(newValue) : newValue;
      } catch {
        this.value = undefined;
      }
    }
  }

  private valueChanged(newValue: string | BigNumber, oldValue: string | BigNumber ) {
    if (!newValue) {
      this._innerValue = this.defaultText || "";
    } else if (newValue !== oldValue) {
      try {
        if (this.isWei) {
          this._innerValue = formatEther(newValue.toString());
        } else {
          this._innerValue = newValue.toString();
        }
      } catch {
        this.innerValue = "NaN";
      }
    }
  }

  constructor(private numberService: NumberService) {
  }

  public attached(): void {
    this.element.addEventListener("keydown", (e) => { this.keydown(e); });
    // this.hydrateFromDefaultValue();
  }

  public detached(): void {
    if (this.element) {
      this.element.removeEventListener("keydown", (e) => { this.keydown(e); });
    }
  }

  // http://stackoverflow.com/a/995193/725866
  private isNavigationOrSelectionKey(e): boolean {
    // Allow: backspace, delete, tab, escape, enter and .
    const currentValue = this.element.value as string;
    if (
      ([46, 8, 9, 27, 13, 110].indexOf(e.keyCode) !== -1) ||
      // Allow: Ctrl+A/X/C/V, Command+A/X/C/V
      (([65, 67, 86, 88].indexOf(e.keyCode) !== -1) && (e.ctrlKey === true || e.metaKey === true)) ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40)
    ) {
      // let it happen, don't do anything
      return true;
    } else {
      /**
       * decimals are allowed, is a decimal, and there is not already a decimal
       */
      if ((this.decimal && (e.keyCode === 190) &&
        (!currentValue || !currentValue.length || (currentValue.indexOf(".") === -1)))) {
        return true;
      }
    }
    return false;
  }

  // http://stackoverflow.com/a/995193/725866
  private keydown(e) {
    if (!this.isNavigationOrSelectionKey(e)) {
      // If it's not a number, prevent the keypress...
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    }
  }
}
