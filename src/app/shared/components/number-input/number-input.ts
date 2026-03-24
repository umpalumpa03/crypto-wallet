import { Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberInput),
      multi: true,
    },
  ],
  styleUrl: './number-input.scss',
})
export class NumberInput implements ControlValueAccessor {
  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;

  @Input() placeholder: string = '0.00';
  @Input() customClass: string = '';

  public onChange: any = () => {};
  public onTouched: any = () => {};

  public onKeyDown(event: KeyboardEvent) {
    if (['e', 'E', '-', '+'].includes(event.key)) {
      event.preventDefault();
    }
  }

  public onInput(event: Event) {
    let cleanValue = this.inputElement.nativeElement.value.replace(/[^0-9.]/g, '');

    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Force clean value back to the screen
    this.inputElement.nativeElement.value = cleanValue;

    const numericValue = parseFloat(cleanValue);
    this.onChange(isNaN(numericValue) ? null : numericValue);
  }

  // =========================================
  // 🔥 3. THE FIX: Write directly to the DOM!
  // =========================================
  writeValue(value: number | null): void {
    if (this.inputElement) {
      this.inputElement.nativeElement.value =
        value === null || value === undefined ? '' : value.toString();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.inputElement) {
      this.inputElement.nativeElement.disabled = isDisabled;
    }
  }
}
