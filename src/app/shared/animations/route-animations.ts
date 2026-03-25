import {
  trigger,
  transition,
  style,
  query,
  animate,
  group,
} from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 0,
      })
    ], { optional: true }),
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(10px) scale(0.98)' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(-10px) scale(1.02)' }))
      ], { optional: true }),
      query(':enter', [
        animate('400ms 150ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ], { optional: true })
    ])
  ])
]);
