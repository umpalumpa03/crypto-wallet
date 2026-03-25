import { Component, ElementRef, forwardRef, input, viewChild } from '@angular/core';
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
  public readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');

  public readonly placeholder = input<string>('0.00');
  public readonly customClass = input<string>('');

  public onChange: any = () => {};
  public onTouched: any = () => {};

  public onKeyDown(event: KeyboardEvent): void {
    if (['e', 'E', '-', '+'].includes(event.key)) {
      event.preventDefault();
    }
  }

  public onInput(event: Event): void {
    const el = this.inputElement().nativeElement;
    let cleanValue = el.value.replace(/[^0-9.]/g, '');

    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }

    
    el.value = cleanValue;

    const numericValue = parseFloat(cleanValue);
    this.onChange(isNaN(numericValue) ? null : numericValue);
  }

  
  
  
  public writeValue(value: number | null): void {
    const el = this.inputElement();
    if (el) {
      el.nativeElement.value = value === null || value === undefined ? '' : value.toString();
    }
  }

  public registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    const el = this.inputElement();
    if (el) {
      el.nativeElement.disabled = isDisabled;
    }
  }
}
